import type { Confederation, Country } from '../engine/types'

/**
 * [code, ru, en, confederation, домашняя лига (или null — тогда старт за границей),
 *  сила сборной 0..5, шанс попасть на большой турнир 0..5]
 *
 * Сила сборной задаёт вероятность вызова и трофеев на уровне сборных.
 * Значения игровые, расставлены под баланс.
 */
type CountrySeed = [string, string, string, Confederation, string | null, number, number]

const SEEDS: CountrySeed[] = [
  ['ENG', 'Англия', 'England', 'UEFA', 'epl', 5, 5],
  ['ESP', 'Испания', 'Spain', 'UEFA', 'laliga', 5, 5],
  ['FRA', 'Франция', 'France', 'UEFA', 'ligue1', 5, 5],
  ['GER', 'Германия', 'Germany', 'UEFA', 'bundesliga', 5, 5],
  ['ITA', 'Италия', 'Italy', 'UEFA', 'seriea', 4, 4],
  ['POR', 'Португалия', 'Portugal', 'UEFA', 'primeira', 5, 4],
  ['NED', 'Нидерланды', 'Netherlands', 'UEFA', 'eredivisie', 4, 4],
  ['BEL', 'Бельгия', 'Belgium', 'UEFA', 'propleague', 4, 3],
  ['CRO', 'Хорватия', 'Croatia', 'UEFA', null, 4, 3],
  ['RUS', 'Россия', 'Russia', 'UEFA', 'rpl', 2, 1],
  ['UKR', 'Украина', 'Ukraine', 'UEFA', null, 3, 2],
  ['TUR', 'Турция', 'Türkiye', 'UEFA', 'superlig', 3, 2],
  ['POL', 'Польша', 'Poland', 'UEFA', null, 3, 2],
  ['SRB', 'Сербия', 'Serbia', 'UEFA', null, 3, 2],
  ['DEN', 'Дания', 'Denmark', 'UEFA', null, 3, 3],
  ['SWE', 'Швеция', 'Sweden', 'UEFA', null, 3, 2],
  ['NOR', 'Норвегия', 'Norway', 'UEFA', null, 3, 2],
  ['SUI', 'Швейцария', 'Switzerland', 'UEFA', null, 3, 3],
  ['AUT', 'Австрия', 'Austria', 'UEFA', null, 3, 2],
  ['SCO', 'Шотландия', 'Scotland', 'UEFA', null, 2, 1],
  ['IRL', 'Ирландия', 'Ireland', 'UEFA', null, 2, 1],
  ['CZE', 'Чехия', 'Czechia', 'UEFA', null, 2, 2],
  ['GRE', 'Греция', 'Greece', 'UEFA', null, 2, 1],
  ['GEO', 'Грузия', 'Georgia', 'UEFA', null, 2, 1],
  ['BRA', 'Бразилия', 'Brazil', 'CONMEBOL', 'brasileirao', 5, 5],
  ['ARG', 'Аргентина', 'Argentina', 'CONMEBOL', 'liga_profesional', 5, 5],
  ['URU', 'Уругвай', 'Uruguay', 'CONMEBOL', null, 4, 4],
  ['COL', 'Колумбия', 'Colombia', 'CONMEBOL', null, 4, 3],
  ['CHI', 'Чили', 'Chile', 'CONMEBOL', null, 3, 2],
  ['ECU', 'Эквадор', 'Ecuador', 'CONMEBOL', null, 3, 2],
  ['PAR', 'Парагвай', 'Paraguay', 'CONMEBOL', null, 3, 2],
  ['PER', 'Перу', 'Peru', 'CONMEBOL', null, 2, 1],
  ['USA', 'США', 'United States', 'CONCACAF', 'mls', 3, 3],
  ['MEX', 'Мексика', 'Mexico', 'CONCACAF', null, 3, 3],
  ['CAN', 'Канада', 'Canada', 'CONCACAF', null, 2, 2],
  ['JPN', 'Япония', 'Japan', 'AFC', null, 3, 3],
  ['KOR', 'Южная Корея', 'South Korea', 'AFC', null, 3, 3],
  ['KSA', 'Саудовская Аравия', 'Saudi Arabia', 'AFC', 'saudi', 2, 2],
  ['AUS', 'Австралия', 'Australia', 'AFC', null, 2, 2],
  ['MAR', 'Марокко', 'Morocco', 'CAF', null, 4, 3],
  ['SEN', 'Сенегал', 'Senegal', 'CAF', null, 4, 3],
  ['NGA', 'Нигерия', 'Nigeria', 'CAF', null, 3, 2],
  ['EGY', 'Египет', 'Egypt', 'CAF', null, 3, 2],
  ['CIV', 'Кот-д’Ивуар', "Côte d'Ivoire", 'CAF', null, 3, 2],
  ['CMR', 'Камерун', 'Cameroon', 'CAF', null, 3, 2],
  ['GHA', 'Гана', 'Ghana', 'CAF', null, 3, 2],
  ['ALG', 'Алжир', 'Algeria', 'CAF', null, 3, 2],
  ['NZL', 'Новая Зеландия', 'New Zealand', 'OFC', null, 1, 1],
]

export const COUNTRIES: Country[] = SEEDS.map(
  ([code, ru, en, confederation, homeLeagueId, strength, tournamentReach]) => ({
    code,
    name: { ru, en },
    confederation,
    homeLeagueId,
    strength,
    tournamentReach,
  }),
)

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]))

export function getCountry(code: string): Country {
  const country = BY_CODE.get(code)
  if (!country) throw new Error(`Unknown country: ${code}`)
  return country
}
