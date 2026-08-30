import type { Club, CompetitionKind, Confederation, CurrentSeason, Role } from './types'
import { CONTINENTAL } from '../data/leagues'
import { getLeague } from '../data/leagues'
import { Rng, clamp } from './rng'
import { averageRating, roleRank } from './performance'

/** Базовые шансы на трофей по тиру клуба (0..6). */
const ODDS: Record<'league' | 'cup' | 'continental' | 'continental2', number[]> = {
  league: [0.002, 0.005, 0.02, 0.06, 0.16, 0.32, 0.55],
  cup: [0.01, 0.02, 0.05, 0.09, 0.16, 0.24, 0.34],
  continental: [0, 0, 0.004, 0.018, 0.055, 0.13, 0.25],
  continental2: [0, 0, 0.02, 0.06, 0.09, 0.05, 0.02],
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
  if (league.level === 1 && club.tier >= 3) {
    const cont = CONTINENTAL[club.confederation]
    if (club.tier >= 5 || !cont.secondary) {
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

/**
 * Насколько игрок вытянул или утопил команду за сезон: −1 — провалил, 0 —
 * отыграл ровно на свой уровень, +1 — вытащил. Отдельно от playerImpact:
 * тот лишь домножает шанс на трофей, а место в таблице до этого от игры
 * почти не зависело — оценка 7.3 и 6.6 давали одну и ту же позицию.
 */
export function leagueLift(season: CurrentSeason, role: Role): number {
  const rating = averageRating(season.tally.ratingSum, season.tally.ratingCount)
  if (rating <= 0 || season.tally.apps === 0) return 0
  // Сыгранная доля сезона: четыре матча команду не тащат.
  const played = clamp(season.tally.apps / 30, 0, 1)
  // 6.8 — «отыграл на свой уровень», шаг 0.55 — заметная разница в оценке.
  const quality = clamp((rating - 6.8) / 0.55, -2, 2)
  // Запасной даже с высокой оценкой влияет на таблицу слабо.
  const weight = 0.35 + roleRank(role) * 0.16
  return quality * played * weight
}

export function rollClubTrophies(
  club: Club,
  season: CurrentSeason,
  role: Role,
  wonContinentalLastSeason: boolean,
  rng: Rng,
): string[] {
  const impact = playerImpact(season, role)
  const tier = clamp(Math.round(club.tier), 0, 6)
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
 * Ожидаемое место в таблице как доля сверху вниз: тир 6 — борьба за титул,
 * тир 0 — борьба за выживание. Отдельной таблицы лиги мы не считаем, но место
 * должно быть согласовано с трофеем: выиграл лигу — значит первый.
 */
const TIER_SHARE = [0.92, 0.85, 0.7, 0.5, 0.32, 0.16, 0.06]

export function rollLeaguePosition(
  club: Club,
  wonLeague: boolean,
  lift: number,
  rng: Rng,
): number {
  if (wonLeague) return 1
  const teams = getLeague(club.leagueId).teams
  const share = TIER_SHARE[clamp(Math.round(club.tier), 0, 6)]
  const expected = clamp(Math.round(teams * share), 2, teams)
  // Сильный сезон игрока подтягивает клуб вверх, провальный — вниз. Разброс
  // ниже вклада: иначе шум съедает разницу между отличным и слабым сезоном.
  const shifted = expected - lift * teams * 0.32
  return clamp(Math.round(rng.around(shifted, teams * 0.10)), 2, teams)
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
 * Сетка континентальных турниров по конфедерациям — по реальному календарю.
 * Год здесь тот, на лето которого приходится турнир, то есть год окончания
 * сезона: сезон 2027/28 отдаёт 2028.
 */
const CONTINENTAL_YEARS: Record<Confederation, (year: number) => boolean> = {
  // Евро и Кубок Америки с 2024-го идут в одни и те же годы: 2028, 2032…
  UEFA: (y) => y % 4 === 0,
  CONMEBOL: (y) => y % 4 === 0,
  // Золотой кубок — раз в два года по нечётным: 2025, 2027, 2029…
  CONCACAF: (y) => y % 2 === 1,
  // Кубок Азии: 2027, 2031…
  AFC: (y) => y % 4 === 3,
  // КАН тоже нечётный: 2025, 2027, 2029…
  CAF: (y) => y % 2 === 1,
  // Кубок наций ОФК подстраивают под отбор к мундиалю; берём годы Евро.
  OFC: (y) => y % 4 === 0,
}

/** Годы чемпионата мира: 2026, 2030, 2034… */
export function isWorldCupYear(year: number): boolean {
  return year % 4 === 2
}

/**
 * Годы летней Олимпиады: 2028, 2032… Те же, что у Евро и Кубка Америки, — так
 * и в жизни: 2024-й собрал и Евро, и Игры.
 */
export function isOlympicYear(year: number): boolean {
  return year % 4 === 0
}

/**
 * Какой большой турнир игрок застаёт этим летом. Календарь привязан к реальным
 * годам, а не к возрасту: мундиаль идёт в 2026, 2030, 2034, континентальный —
 * по сетке своей конфедерации. Чемпионат мира старше: если бы годы совпали,
 * едут на него.
 */
export function tournamentThisSeason(
  seasonEndYear: number,
  confederation: Confederation,
): 'world' | 'continental' | null {
  if (isWorldCupYear(seasonEndYear)) return 'world'
  if (CONTINENTAL_YEARS[confederation](seasonEndYear)) return 'continental'
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
