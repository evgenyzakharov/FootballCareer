import type { Club, CompetitionKind, Confederation, CurrentSeason, Role } from './types'
import { CONTINENTAL } from '../data/leagues'
import { getLeague } from '../data/leagues'
import { Rng, clamp } from './rng'
import { averageRating, roleRank } from './performance'

/** Базовые шансы на трофей по тиру клуба (0..5). */
const ODDS: Record<'league' | 'cup' | 'continental' | 'continental2', number[]> = {
  league: [0.005, 0.02, 0.06, 0.16, 0.32, 0.55],
  cup: [0.02, 0.05, 0.09, 0.16, 0.24, 0.34],
  continental: [0, 0.004, 0.018, 0.055, 0.13, 0.25],
  continental2: [0, 0.02, 0.06, 0.09, 0.05, 0.02],
}

export interface CompetitionEntry {
  id: string
  kind: CompetitionKind
}

/** Какие турниры клуб играет в этом сезоне. */
export function competitionsFor(club: Club, wonContinentalLastSeason: boolean): CompetitionEntry[] {
  const league = getLeague(club.leagueId)
  const entries: CompetitionEntry[] = [
    { id: club.leagueId, kind: 'league' },
    { id: `cup_${club.country}`, kind: 'cup' },
  ]
  if (league.level === 1 && club.tier >= 2) {
    const cont = CONTINENTAL[club.confederation]
    if (club.tier >= 4 || !cont.secondary) {
      entries.push({ id: cont.primary, kind: 'continental' })
    } else {
      entries.push({ id: cont.secondary, kind: 'continental2' })
    }
  }
  if (wonContinentalLastSeason) {
    entries.push({ id: 'club_world_cup', kind: 'club_world_cup' })
  }
  return entries
}

/**
 * Вклад игрока в шансы клуба. Именно из-за него «вытащить середняка к титулу»
 * — реальная задача, а не декорация.
 */
export function playerImpact(season: CurrentSeason, role: Role): number {
  const rating = averageRating(season.tally.ratingSum, season.tally.ratingCount)
  const ratingBonus = rating > 0 ? (rating - 6.85) * 0.14 : 0
  const roleBonus = (roleRank(role) - 2) * 0.05
  return clamp(1 + ratingBonus + roleBonus, 0.7, 1.7)
}

export function rollClubTrophies(
  club: Club,
  season: CurrentSeason,
  role: Role,
  wonContinentalLastSeason: boolean,
  rng: Rng,
): string[] {
  const impact = playerImpact(season, role)
  const tier = clamp(Math.round(club.tier), 0, 5)
  const won: string[] = []
  for (const entry of competitionsFor(club, wonContinentalLastSeason)) {
    let p: number
    if (entry.kind === 'club_world_cup') {
      p = 0.32
    } else {
      p = ODDS[entry.kind][tier]
    }
    p *= impact
    p *= season.oddsMult[entry.kind] ?? 1
    if (rng.chance(clamp(p, 0, 0.95))) won.push(entry.id)
  }
  return won
}

/**
 * Ожидаемое место в таблице как доля сверху вниз: тир 5 — борьба за титул,
 * тир 0 — борьба за выживание. Отдельной таблицы лиги мы не считаем, но место
 * должно быть согласовано с трофеем: выиграл лигу — значит первый.
 */
const TIER_SHARE = [0.85, 0.7, 0.5, 0.32, 0.16, 0.06]

export function rollLeaguePosition(
  club: Club,
  wonLeague: boolean,
  impact: number,
  rng: Rng,
): number {
  if (wonLeague) return 1
  const teams = getLeague(club.leagueId).teams
  const share = TIER_SHARE[clamp(Math.round(club.tier), 0, 5)]
  const expected = clamp(Math.round(teams * share), 2, teams)
  // Сильный сезон игрока подтягивает клуб вверх, провальный — вниз.
  const shifted = expected - (impact - 1) * teams * 0.18
  return clamp(Math.round(rng.around(shifted, teams * 0.14)), 2, teams)
}

// ─── Сборная ────────────────────────────────────────────────────────────────

export const NATIONAL_TOURNAMENT: Record<Confederation, string> = {
  UEFA: 'euro',
  CONMEBOL: 'copa_america',
  CONCACAF: 'gold_cup',
  AFC: 'asian_cup',
  CAF: 'afcon',
  OFC: 'ofc_nations',
}

/**
 * Календарь больших турниров привязан к возрасту игрока через год рождения,
 * поэтому у каждой карьеры своя сетка — как в жизни.
 */
export function tournamentThisSeason(seasonIndex: number): 'world' | 'continental' | null {
  const mod = seasonIndex % 4
  if (mod === 0) return 'world'
  if (mod === 2) return 'continental'
  return null
}

export interface CallUpContext {
  ovr: number
  countryStrength: number
  age: number
  form: number
  /** Уже вызывался раньше — попасть повторно легче. */
  established: boolean
}

export function callUpChance(ctx: CallUpContext): number {
  // Чем сильнее сборная, тем выше планка попадания.
  const bar = 60 + ctx.countryStrength * 3.6
  const gap = ctx.ovr - bar
  let p = clamp(0.5 + gap * 0.06, 0, 0.97)
  if (ctx.age < 19) p *= 0.35
  if (ctx.age > 34) p *= 0.6
  p *= 0.8 + (ctx.form / 100) * 0.4
  if (ctx.established) p = clamp(p + 0.18, 0, 0.98)
  return p
}

export function nationalTrophyChance(countryStrength: number, kind: 'world' | 'continental'): number {
  const world = [0.001, 0.004, 0.012, 0.03, 0.07, 0.14]
  const continental = [0.004, 0.02, 0.05, 0.1, 0.18, 0.28]
  const table = kind === 'world' ? world : continental
  return table[clamp(Math.round(countryStrength), 0, 5)]
}
