import type { CareerState, Club, Role } from './types'
import { CLUBS, findClub, getClub } from '../data/clubs'
import { getCountry } from '../data/countries'
import { getLeague } from '../data/leagues'
import { marketValue } from './attributes'
import { playerOvr, squadLevel } from './player'
import { roleRank } from './performance'
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

/**
 * Зарплата за сезон, €. Считается от стоимости игрока, но не как постоянная её
 * доля: в футболе она резко падает с классом. Игрок со дна получает за год почти
 * столько же, сколько стоит, звезда — десятую часть своей цены. Прежняя формула
 * брала фиксированные четырнадцать процентов и упиралась в нижнюю границу в
 * тридцать тысяч, поэтому вся нижняя половина пирамиды — от третьей лиги России
 * до Чемпионшипа — получала одно и то же.
 *
 * Лига важна не меньше тира: за один и тот же уровень в Англии платят в разы
 * больше, чем во второй лиге России, и без этого множителя парень из академии
 * зарабатывал три миллиона рублей в год.
 */
function askingWage(ovr: number, age: number, club: Club | null): number {
  const value = marketValue(ovr, age)
  const share = clamp(0.3 - (ovr - 45) * 0.0035, 0.1, 0.3)
  const tierFactor = 0.65 + ((club?.tier ?? 1) - 1) * 0.11
  const strength = club ? getLeague(club.leagueId).strength : 2
  const leagueFactor = 0.45 + (strength - 1) * 0.24
  return value * share * tierFactor * leagueFactor
}

/**
 * Во сколько раз лучший в составе получает больше игрока своего уровня. В
 * футболе разрыв между звездой и рядовым в команде — в несколько раз, а не в
 * десятки: платёжка клуба не растягивается бесконечно.
 */
const TOP_EARNER_MULT = 4

/**
 * Потолок клуба: больше этого он не заплатит никому. Без него зарплата считалась
 * от одной только стоимости игрока, и клуб второй лиги России предлагал
 * восьмидесятому OVR восемьсот тысяч евро — в семьдесят раз больше, чем платил
 * игроку своего уровня. Клуб, который игрок перерос, теперь предлагает не
 * запретительно много, а всё, что может, — и разница с чужим предложением
 * становится видна прямо в трансферном окне.
 */
export function clubWageCeiling(club: Club): number {
  return askingWage(squadLevel(club.tier), 26, club) * TOP_EARNER_MULT
}

export function wageFor(ovr: number, age: number, club: Club | null): number {
  const asking = askingWage(ovr, age, club)
  const capped = club ? Math.min(asking, clubWageCeiling(club)) : asking
  const wage = clamp(capped, 1_500, 45_000_000)
  const mag = 10 ** Math.max(2, Math.floor(Math.log10(wage)) - 1)
  return Math.round(wage / mag) * mag
}

/**
 * Насколько игрок может быть сильнее состава, чтобы клуб всё-таки его взял.
 * Кто перерос клуб сильнее — уходит выше. Порог общий для рынка и для
 * продления: иначе продление становится лазейкой мимо этой проверки.
 */
export const MAX_SQUAD_GAP = 16

/** Насколько клуб «хочет» игрока: вес в лотерее предложений. */
function interest(club: Club, state: CareerState, ovr: number): number {
  const player = state.player
  const current = findClub(state.contract?.clubId ?? null)
  const league = getLeague(club.leagueId)
  const gap = ovr - squadLevel(club.tier)

  // Клуб не смотрит на тех, кто заметно слабее его состава, и не берёт
  // тех, кто заметно сильнее — они уйдут выше.
  if (gap < -12) return 0
  if (gap > MAX_SQUAD_GAP) return 0

  // Дисквалифицированного игрока клубы не подписывают: именно так карьера и
  // попадает в состояние «без клуба», а не только через пустой рынок. Смотрим
  // на остаток срока в матчах: пропуск пары туров за красную никого не пугает,
  // полсезона сбивает цену, а допинговый бан закрывает рынок целиком.
  if (player.banMatches >= 26) return 0
  let w = 10 - Math.abs(gap + 2) * 0.55
  if (player.banMatches >= 6) w *= 0.45
  w += player.gauges.fame * 0.06
  w += (league.strength - 3) * 0.6
  // Родная страна тянет сильнее в начале карьеры: молодого чаще замечают дома,
  // и лестница снизу должна вести через свои дивизионы, а не сразу за рубеж.
  // С возрастом и именем вес возвращается к прежнему.
  if (club.country === player.countryCode) {
    w += 2.2
    // Множитель, а не прибавка: зарубежных клубов в разы больше, и слагаемое
    // тонет в их количестве при взвешенном выборе.
    if (player.age <= 21) w *= 6
    else if (player.age <= 24) w *= 2.6
  }
  if (current && club.country === current.country) w += 1.2
  if (current && club.id === current.id) return 0
  if (state.clubsPlayed.includes(club.id)) w *= 0.55
  if (player.age > 31 && club.confederation !== 'UEFA') w += 2.5
  if (player.age > 33 && club.tier >= 5) w *= 0.4
  if (player.age < 21 && club.tier >= 6) w *= 0.5
  if (player.gauges.mediaRep < -30) w *= 0.7
  return Math.max(0, w)
}

/** Длина контракта считается детерминированно: карточку выбора и её разбор
 *  строят разные вызовы, и условия не должны разъезжаться между ними. */
/**
 * Продлит ли клуб истекающий контракт. Решение детерминированное, а не
 * бросок кубика: игрок должен видеть по своим показателям, к чему идёт дело.
 * Считаем то же, на что смотрел бы спортивный директор: тянет ли игрок на
 * основу этого состава, что о нём думает тренер, как относятся трибуны,
 * какую роль он играл и не пора ли ему на пенсию.
 */
export function clubWantsToRenew(state: CareerState, ovr: number, role: Role): boolean {
  const club = findClub(state.contract?.clubId ?? null)
  if (!club) return false
  // Переросшему клуб всё равно предложит продление — просто на свои деньги, а
  // не на рыночные: потолок в `clubWageCeiling` не даст ему выписать столько,
  // сколько игрок стоит. Решает игрок, видя обе цифры рядом.
  let score = (ovr - squadLevel(club.tier)) * 0.9
  score += (state.player.gauges.coachTrust - 45) * 0.35
  score += (state.player.gauges.fanLove - 40) * 0.15
  score += (roleRank(role) - 1) * 6
  if (state.player.age > 33) score -= 12
  return score > 0
}

export function contractYears(age: number, tier: number, loan: boolean): number {
  if (loan) return 1
  return clamp(3 + (tier >= 5 ? 1 : 0) - (age > 31 ? 1 : 0) - (age > 34 ? 1 : 0), 1, 5)
}

function toOffer(club: Club, state: CareerState, ovr: number, kind: OfferKind, rng: Rng): Offer {
  const age = state.player.age
  const loan = kind === 'loan'
  return {
    clubId: club.id,
    kind,
    wage: loan ? Math.round(wageFor(ovr, age, club) * 0.6) : wageFor(ovr, age, club),
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
  const wide = homePool.length >= 6 ? homePool : CLUBS
  // Чем глубже смоделирована пирамида страны, тем ниже начинают. Если у страны
  // есть третий дивизион, из академии зовут только туда: путь наверх должен
  // начинаться снизу, а не с предложения от чемпиона. Сегодня три уровня
  // только у России, для остальных стран ничего не меняется.
  const deepest = Math.max(...wide.map((c) => getLeague(c.leagueId).level))
  const pool = deepest >= 3 ? wide.filter((c) => getLeague(c.leagueId).level === deepest) : wide

  const bands: Array<[min: number, max: number]> = [[5, 6], [3, 4], [0, 2]]
  const picked: Club[] = []
  for (const [min, max] of bands) {
    const candidates = pool.filter((c) => c.tier >= min && c.tier <= max && !picked.includes(c))
    const fallback = pool.filter((c) => !picked.includes(c))
    const list = candidates.length > 0 ? candidates : fallback
    if (list.length > 0) picked.push(rng.pick(list))
  }
  // Первый контракт — по рынку своего клуба, а не по общей ставке: во второй
  // лиге России это несколько сотен тысяч рублей в год, а не три миллиона.
  return picked.map((club) => ({
    clubId: club.id,
    kind: 'academy' as OfferKind,
    wage: wageFor(playerOvr(state.player), state.player.age, club),
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
  const ceiling = Math.max(0, Math.floor((ovr - 52) / 8)) + 1
  const pool = CLUBS.filter((c) => c.tier <= ceiling && c.id !== state.contract?.clubId)
  const list = pool.length > 0 ? pool : CLUBS.filter((c) => c.tier <= 1)
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
  const list = pool.length > 0 ? pool : CLUBS.filter((c) => c.tier <= 2)
  return rng.sample(list, count).map((club) => toOffer(club, state, ovr, 'loan', rng))
}
