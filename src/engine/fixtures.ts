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
}

/**
 * Соперники по чемпионату. В `clubs.ts` названы не все клубы лиги (от восьми
 * до двадцати при номинальном размере до двадцати девяти), поэтому за сезон
 * один и тот же соперник попадается чаще, чем в жизни — особенно в маленьких
 * лигах. Это цена имеющихся данных, а не замысел.
 */
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
 * Календарь отрезка. Соперник не повторяется два матча подряд: подряд одна и
 * та же пара выглядит как ошибка, даже когда это просто маленький пул.
 */
export function buildFixtures(club: Club, count: number, rng: Rng): Fixture[] {
  if (count <= 0) return []
  const pools: Record<string, Club[]> = {
    league: leaguePool(club),
    cup: cupPool(club),
    continental: continentalPool(club),
  }
  const kinds = rng.shuffle(competitionKinds(club, count))
  const fixtures: Fixture[] = []
  let previous: string | null = null
  for (const competition of kinds) {
    const pool = pools[competition] ?? pools.league
    if (pool.length === 0) continue
    let opponent = rng.pick(pool)
    if (opponent.id === previous && pool.length > 1) opponent = rng.pick(pool.filter((c) => c.id !== previous))
    previous = opponent.id
    fixtures.push({ opponentId: opponent.id, home: rng.chance(0.5), competition })
  }
  return fixtures
}
