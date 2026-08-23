import type { CareerState, Club, Role } from './types'
import { CLUBS, findClub, getClub } from '../data/clubs'
import { getCountry } from '../data/countries'
import { getLeague } from '../data/leagues'
import { marketValue } from './attributes'
import { playerOvr, squadLevel } from './player'
import { Rng, clamp } from './rng'

export type OfferKind = 'transfer' | 'loan' | 'stay' | 'academy' | 'free'

export interface Offer {
  clubId: string
  kind: OfferKind
  wage: number
  years: number
  expectedRole: Role
  /** Отступные/сумма трансфера — только для показа в тексте. */
  fee: number
}

export function expectedRole(ovr: number, tier: number): Role {
  const gap = ovr - squadLevel(tier)
  if (gap >= 7) return 'star'
  if (gap >= 0) return 'starter'
  if (gap >= -7) return 'rotation'
  if (gap >= -14) return 'bench'
  return 'reserve'
}

export function wageFor(ovr: number, age: number, tier: number): number {
  const value = marketValue(ovr, age)
  const raw = value * 0.14 * (0.65 + tier * 0.11)
  const wage = clamp(raw, 30_000, 45_000_000)
  const mag = 10 ** Math.max(3, Math.floor(Math.log10(wage)) - 1)
  return Math.round(wage / mag) * mag
}

/** Насколько клуб «хочет» игрока: вес в лотерее предложений. */
function interest(club: Club, state: CareerState, ovr: number): number {
  const player = state.player
  const current = findClub(state.contract?.clubId ?? null)
  const league = getLeague(club.leagueId)
  const gap = ovr - squadLevel(club.tier)

  // Клуб не смотрит на тех, кто заметно слабее его состава, и не берёт
  // тех, кто заметно сильнее — они уйдут выше.
  if (gap < -12) return 0
  if (gap > 16) return 0

  // Дисквалифицированного игрока клубы не подписывают: именно так карьера и
  // попадает в состояние «без клуба», а не только через пустой рынок. Смотрим
  // на реальный остаток срока, а не на флаг события — длинный бан отпугивает
  // всех, короткий только сбивает цену.
  if (player.banBlocks >= 2) return 0
  let w = 10 - Math.abs(gap + 2) * 0.55
  if (player.banBlocks > 0) w *= 0.35
  w += player.gauges.fame * 0.06
  w += (league.strength - 3) * 0.6
  if (club.country === player.countryCode) w += 2.2
  if (current && club.country === current.country) w += 1.2
  if (current && club.id === current.id) return 0
  if (state.clubsPlayed.includes(club.id)) w *= 0.55
  if (player.age > 31 && club.confederation !== 'UEFA') w += 2.5
  if (player.age > 33 && club.tier >= 4) w *= 0.4
  if (player.age < 21 && club.tier >= 5) w *= 0.5
  if (player.gauges.mediaRep < -30) w *= 0.7
  return Math.max(0, w)
}

/** Длина контракта считается детерминированно: карточку выбора и её разбор
 *  строят разные вызовы, и условия не должны разъезжаться между ними. */
export function contractYears(age: number, tier: number, loan: boolean): number {
  if (loan) return 1
  return clamp(3 + (tier >= 4 ? 1 : 0) - (age > 31 ? 1 : 0) - (age > 34 ? 1 : 0), 1, 5)
}

function toOffer(club: Club, state: CareerState, ovr: number, kind: OfferKind, rng: Rng): Offer {
  const age = state.player.age
  const loan = kind === 'loan'
  return {
    clubId: club.id,
    kind,
    wage: loan ? Math.round(wageFor(ovr, age, club.tier) * 0.6) : wageFor(ovr, age, club.tier),
    years: contractYears(age, club.tier, loan),
    expectedRole: expectedRole(ovr, club.tier),
    fee: loan ? 0 : Math.round(marketValue(ovr, age) * rng.around(1, 0.25)),
  }
}

/** Три клуба на старте: сильный, средний и «свой», чтобы выбор был настоящим. */
export function academyOffers(state: CareerState, rng: Rng): Offer[] {
  const country = getCountry(state.player.countryCode)
  const homeLeague = country.homeLeagueId
  const homePool = homeLeague
    ? CLUBS.filter((c) => c.leagueId === homeLeague || getLeague(c.leagueId).country === country.code)
    : CLUBS.filter((c) => c.confederation === country.confederation)
  const pool = homePool.length >= 6 ? homePool : CLUBS

  const bands: Array<[min: number, max: number]> = [[4, 5], [2, 3], [0, 1]]
  const picked: Club[] = []
  for (const [min, max] of bands) {
    const candidates = pool.filter((c) => c.tier >= min && c.tier <= max && !picked.includes(c))
    const fallback = pool.filter((c) => !picked.includes(c))
    const list = candidates.length > 0 ? candidates : fallback
    if (list.length > 0) picked.push(rng.pick(list))
  }
  return picked.map((club) => ({
    clubId: club.id,
    kind: 'academy' as OfferKind,
    wage: 30_000 + club.tier * 8_000,
    years: 3,
    expectedRole: 'reserve' as Role,
    fee: 0,
  }))
}

export interface OfferRequest {
  count?: number
  /** Разрешить аренды (для молодых игроков резерва). */
  allowLoans?: boolean
  /** Ограничить страной — для событий «вернуться домой». */
  country?: string
  /** Минимальный тир — для событий вида «топ-клуб зовёт». */
  minTier?: number
}

export function generateOffers(state: CareerState, rng: Rng, req: OfferRequest = {}): Offer[] {
  const ovr = playerOvr(state.player)
  const { count = 2, allowLoans = false, country, minTier } = req

  let pool = CLUBS
  if (country) pool = pool.filter((c) => c.country === country)
  if (minTier !== undefined) pool = pool.filter((c) => c.tier >= minTier)

  const weighted = pool
    .map((club) => ({ item: club, weight: interest(club, state, ovr) }))
    .filter((e) => e.weight > 0)

  const offers: Offer[] = []
  const seen = new Set<string>()
  let guard = 0
  while (offers.length < count && weighted.length > 0 && guard < 40) {
    guard++
    const club = rng.weighted(weighted)
    if (seen.has(club.id)) continue
    seen.add(club.id)
    const role = expectedRole(ovr, club.tier)
    const loan = allowLoans && (role === 'bench' || role === 'reserve') && state.player.age <= 23
    offers.push(toOffer(club, state, ovr, loan ? 'loan' : 'transfer', rng))
  }
  return offers
}

/**
 * Клубы «на самый край»: без учёта интереса, только по уровню. Нужны, чтобы
 * «уйти дивизионом ниже» всегда срабатывало — иначе игрок без предложений
 * упирался в тупик и карьера обрывалась на ровном месте.
 */
export function fallbackOffers(state: CareerState, rng: Rng, count = 2): Offer[] {
  const ovr = playerOvr(state.player)
  const ceiling = Math.max(0, Math.floor((ovr - 52) / 8))
  const pool = CLUBS.filter((c) => c.tier <= ceiling && c.id !== state.contract?.clubId)
  const list = pool.length > 0 ? pool : CLUBS.filter((c) => c.tier === 0)
  // Своя страна и уже знакомые клубы охотнее берут игрока без вариантов.
  const weighted = list.map((club) => ({
    item: club,
    weight: 1 + (club.country === state.player.countryCode ? 2 : 0) + (state.clubsPlayed.includes(club.id) ? 1 : 0),
  }))
  const picked: Club[] = []
  let guard = 0
  while (picked.length < count && guard < 40) {
    guard++
    const club = rng.weighted(weighted)
    if (!picked.includes(club)) picked.push(club)
  }
  return picked.map((club) => toOffer(club, state, ovr, 'transfer', rng))
}

/** Клубы, куда молодого игрока отдают в аренду: ниже уровнем, но с игровым временем. */
export function loanOffers(state: CareerState, rng: Rng, count = 2): Offer[] {
  const ovr = playerOvr(state.player)
  const parent = getClub(state.contract?.clubId ?? state.clubsPlayed[state.clubsPlayed.length - 1])
  const pool = CLUBS.filter((c) => {
    if (c.id === parent.id) return false
    const gap = ovr - squadLevel(c.tier)
    return gap >= -2 && gap <= 18 && c.tier <= Math.max(0, parent.tier - 1)
  })
  const list = pool.length > 0 ? pool : CLUBS.filter((c) => c.tier <= 1)
  return rng.sample(list, count).map((club) => toOffer(club, state, ovr, 'loan', rng))
}
