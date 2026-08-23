import type { Confederation, League } from '../engine/types'

/**
 * Континентальные турниры, в которые клуб может попасть по итогам сезона.
 * Названия — идентификаторы внутри симуляции, см. дисклеймер в подвале.
 */
export const CONTINENTAL: Record<Confederation, { primary: string; secondary: string | null }> = {
  UEFA: { primary: 'ucl', secondary: 'uel' },
  CONMEBOL: { primary: 'libertadores', secondary: 'sudamericana' },
  CONCACAF: { primary: 'concacaf_cup', secondary: null },
  AFC: { primary: 'afc_elite', secondary: null },
  CAF: { primary: 'caf_cl', secondary: null },
  OFC: { primary: 'ofc_cl', secondary: null },
}

/** [id, ru, en, country, confederation, level (1 = высший дивизион), сила лиги 1..5] */
type LeagueSeed = [string, string, string, string, Confederation, number, number]

const SEEDS: LeagueSeed[] = [
  ['epl', 'Премьер-лига', 'Premier League', 'ENG', 'UEFA', 1, 5],
  ['championship', 'Чемпионшип', 'Championship', 'ENG', 'UEFA', 2, 3],
  ['laliga', 'Ла Лига', 'La Liga', 'ESP', 'UEFA', 1, 5],
  ['segunda', 'Сегунда', 'Segunda División', 'ESP', 'UEFA', 2, 2],
  ['seriea', 'Серия А', 'Serie A', 'ITA', 'UEFA', 1, 5],
  ['serieb', 'Серия B', 'Serie B', 'ITA', 'UEFA', 2, 2],
  ['bundesliga', 'Бундеслига', 'Bundesliga', 'GER', 'UEFA', 1, 5],
  ['bundesliga2', 'Вторая Бундеслига', '2. Bundesliga', 'GER', 'UEFA', 2, 2],
  ['ligue1', 'Лига 1', 'Ligue 1', 'FRA', 'UEFA', 1, 4],
  ['ligue2', 'Лига 2', 'Ligue 2', 'FRA', 'UEFA', 2, 2],
  ['rpl', 'РПЛ', 'Russian Premier League', 'RUS', 'UEFA', 1, 3],
  ['pfl', 'Первая лига', 'Russian First League', 'RUS', 'UEFA', 2, 1],
  ['eredivisie', 'Эредивизи', 'Eredivisie', 'NED', 'UEFA', 1, 3],
  ['primeira', 'Примейра', 'Primeira Liga', 'POR', 'UEFA', 1, 3],
  ['superlig', 'Суперлига', 'Süper Lig', 'TUR', 'UEFA', 1, 3],
  ['propleague', 'Про-лига', 'Pro League', 'BEL', 'UEFA', 1, 2],
  ['brasileirao', 'Серия А Бразилии', 'Brasileirão', 'BRA', 'CONMEBOL', 1, 4],
  ['liga_profesional', 'Профессиональная лига', 'Liga Profesional', 'ARG', 'CONMEBOL', 1, 3],
  ['saudi', 'Про-лига Саудовской Аравии', 'Saudi Pro League', 'KSA', 'AFC', 1, 3],
  ['mls', 'МЛС', 'MLS', 'USA', 'CONCACAF', 1, 2],
]

export const LEAGUES: League[] = SEEDS.map(([id, ru, en, country, confederation, level, strength]) => ({
  id,
  name: { ru, en },
  country,
  confederation,
  level,
  strength,
}))

const BY_ID = new Map(LEAGUES.map((l) => [l.id, l]))

export function getLeague(id: string): League {
  const league = BY_ID.get(id)
  if (!league) throw new Error(`Unknown league: ${id}`)
  return league
}
