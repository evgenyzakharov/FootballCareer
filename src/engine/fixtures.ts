import type { Club, CompetitionKind } from './types'
import { CLUBS } from '../data/clubs'
import { getLeague } from '../data/leagues'
import { Rng } from './rng'

/**
 * Один матч в календаре: с кем, где и в каком турнире. Пока календарь нужен
 * только симуляции, но собирается он именно списком — из него потом вырастет
 * и показ прошедших игр.
 */
export interface Fixture {
  opponentId: string
  home: boolean
  competition: CompetitionKind
  /**
   * Порядковый номер тура чемпионата. Только у матчей лиги: у кубка и
   * еврокубка тура нет, там стадия. Проставляется по готовому календарю,
   * поэтому совпадает с порядком игр в сезоне.
   */
  round?: number
}

/** Соперники по чемпионату: все клубы лиги, кроме своего. */
function leaguePool(club: Club): Club[] {
  return CLUBS.filter((c) => c.leagueId === club.leagueId && c.id !== club.id)
}

/** Кубок страны сводит с клубами всех дивизионов, а не только своего. */
function cupPool(club: Club): Club[] {
  return CLUBS.filter((c) => c.country === club.country && c.id !== club.id)
}

/** В еврокубке играют с чужими странами и не с кем попало: тир от третьего. */
function continentalPool(club: Club): Club[] {
  const pool = CLUBS.filter(
    (c) => c.confederation === club.confederation && c.country !== club.country && c.tier >= 3,
  )
  // Конфедерация может оказаться почти пустой (ОФК, КОНКАКАФ): тогда берём
  // всех своих, лишь бы календарь вообще собрался.
  return pool.length >= 4 ? pool : CLUBS.filter((c) => c.confederation === club.confederation && c.id !== club.id)
}

/**
 * Играет ли клуб этой осенью в еврокубке. Условие то же, что и в
 * `competitionsFor`: высший дивизион и не низ таблицы.
 */
export function playsContinental(club: Club): boolean {
  return getLeague(club.leagueId).level === 1 && club.tier >= 3
}

/**
 * Из чего складывается календарь: доли турниров в общем числе матчей.
 * Еврокубок отбирает матчи у чемпионата, а не добавляет их сверху — общее
 * число игр за отрезок задаётся снаружи и не зависит от клуба.
 */
function competitionKinds(club: Club, count: number): CompetitionKind[] {
  const continental = playsContinental(club)
  const cup = Math.max(1, Math.round(count * (continental ? 0.1 : 0.14)))
  const euro = continental ? Math.round(count * 0.22) : 0
  const league = Math.max(0, count - cup - euro)
  return [
    ...Array<CompetitionKind>(league).fill('league'),
    ...Array<CompetitionKind>(cup).fill('cup'),
    ...Array<CompetitionKind>(euro).fill('continental'),
  ]
}

/**
 * Круг чемпионата: с каждым соперником по разу дома и по разу в гостях. Именно
 * это и делает календарь похожим на настоящий — раньше соперник выбирался
 * случайно на каждый матч, и за сезон один и тот же клуб попадался по восемь
 * раз, сколько бы команд в лиге ни было.
 */
function leagueSchedule(club: Club, rng: Rng): Fixture[] {
  const pool = leaguePool(club)
  const both = pool.flatMap((opponent) => [
    { opponentId: opponent.id, home: true, competition: 'league' as CompetitionKind },
    { opponentId: opponent.id, home: false, competition: 'league' as CompetitionKind },
  ])
  return rng.shuffle(both)
}

/** Кубок и еврокубок — это жеребьёвка, а не круг: соперник каждый раз новый. */
function drawFixtures(pool: Club[], count: number, competition: CompetitionKind, rng: Rng): Fixture[] {
  if (pool.length === 0 || count <= 0) return []
  return Array.from({ length: count }, () => {
    const opponent = rng.pick(pool)
    return { opponentId: opponent.id, home: rng.chance(0.5), competition }
  })
}

/**
 * Календарь на весь сезон. Собирается целиком и один раз, а не по матчу на
 * ходу: круг чемпионата иначе не построить. Туры потом берут из него свои
 * куски подряд.
 *
 * Матчей в сезоне столько, сколько задано снаружи. Круг чемпионата короче —
 * добираем вторым проходом по тому же кругу; длиннее — берём его начало.
 */
export function seasonFixtures(club: Club, count: number, rng: Rng): Fixture[] {
  if (count <= 0) return []
  const kinds = competitionKinds(club, count)
  const cups = kinds.filter((k) => k === 'cup').length
  const euro = kinds.filter((k) => k === 'continental').length
  const leagueCount = kinds.length - cups - euro

  const league: Fixture[] = []
  while (league.length < leagueCount) league.push(...leagueSchedule(club, rng))
  league.length = leagueCount

  const rest = [
    ...drawFixtures(cupPool(club), cups, 'cup', rng),
    ...drawFixtures(continentalPool(club), euro, 'continental', rng),
  ]

  // Перемешиваем всё вместе и разводим повторы подряд: одна и та же пара два
  // матча кряду выглядит как ошибка, даже когда это просто жеребьёвка.
  const mixed = rng.shuffle([...league, ...rest])
  for (let i = 1; i < mixed.length; i++) {
    if (mixed[i].opponentId !== mixed[i - 1].opponentId) continue
    const swap = mixed.findIndex(
      (f, j) => j > i && f.opponentId !== mixed[i - 1].opponentId && f.opponentId !== mixed[j - 1].opponentId,
    )
    if (swap > i) [mixed[i], mixed[swap]] = [mixed[swap], mixed[i]]
  }
  // Нумеруем туры чемпионата по готовому календарю: кубковые и еврокубковые
  // игры номера не получают и счёт не сдвигают.
  let round = 0
  return mixed.map((fixture) =>
    fixture.competition === 'league' ? { ...fixture, round: ++round } : fixture,
  )
}
