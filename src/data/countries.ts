import type { Confederation, Country } from '../engine/types'

/**
 * [code, ru им., ru род., ru вин., en, confederation, домашняя лига (или null —
 *  тогда старт за границей), сила сборной 0..5, шанс попасть на большой турнир 0..5]
 *
 * Два падежа нужны, потому что название страны подставляется в живые фразы:
 * «сборная Нигерии» (родительный), «играть за Нигерию» (винительный). Без них
 * получалось «играть за Нигерия». В английском формы совпадают с именительным.
 *
 * Сила сборной задаёт вероятность вызова и трофеев на уровне сборных.
 * Значения игровые, расставлены под баланс.
 */
type CountrySeed = [string, string, string, string, string, Confederation, string | null, number, number]

const SEEDS: CountrySeed[] = [
  ['ENG', 'Англия', 'Англии', 'Англию', 'England', 'UEFA', 'epl', 5, 5],
  ['ESP', 'Испания', 'Испании', 'Испанию', 'Spain', 'UEFA', 'laliga', 5, 5],
  ['FRA', 'Франция', 'Франции', 'Францию', 'France', 'UEFA', 'ligue1', 5, 5],
  ['GER', 'Германия', 'Германии', 'Германию', 'Germany', 'UEFA', 'bundesliga', 5, 5],
  ['ITA', 'Италия', 'Италии', 'Италию', 'Italy', 'UEFA', 'seriea', 4, 4],
  ['POR', 'Португалия', 'Португалии', 'Португалию', 'Portugal', 'UEFA', 'primeira', 5, 4],
  ['NED', 'Нидерланды', 'Нидерландов', 'Нидерланды', 'Netherlands', 'UEFA', 'eredivisie', 4, 4],
  ['BEL', 'Бельгия', 'Бельгии', 'Бельгию', 'Belgium', 'UEFA', 'propleague', 4, 3],
  ['CRO', 'Хорватия', 'Хорватии', 'Хорватию', 'Croatia', 'UEFA', null, 4, 3],
  ['RUS', 'Россия', 'России', 'Россию', 'Russia', 'UEFA', 'rpl', 2, 1],
  ['UKR', 'Украина', 'Украины', 'Украину', 'Ukraine', 'UEFA', null, 3, 2],
  ['TUR', 'Турция', 'Турции', 'Турцию', 'Türkiye', 'UEFA', 'superlig', 3, 2],
  ['POL', 'Польша', 'Польши', 'Польшу', 'Poland', 'UEFA', null, 3, 2],
  ['SRB', 'Сербия', 'Сербии', 'Сербию', 'Serbia', 'UEFA', null, 3, 2],
  ['DEN', 'Дания', 'Дании', 'Данию', 'Denmark', 'UEFA', null, 3, 3],
  ['SWE', 'Швеция', 'Швеции', 'Швецию', 'Sweden', 'UEFA', null, 3, 2],
  ['NOR', 'Норвегия', 'Норвегии', 'Норвегию', 'Norway', 'UEFA', null, 3, 2],
  ['SUI', 'Швейцария', 'Швейцарии', 'Швейцарию', 'Switzerland', 'UEFA', null, 3, 3],
  ['AUT', 'Австрия', 'Австрии', 'Австрию', 'Austria', 'UEFA', null, 3, 2],
  ['SCO', 'Шотландия', 'Шотландии', 'Шотландию', 'Scotland', 'UEFA', null, 2, 1],
  ['IRL', 'Ирландия', 'Ирландии', 'Ирландию', 'Ireland', 'UEFA', null, 2, 1],
  ['CZE', 'Чехия', 'Чехии', 'Чехию', 'Czechia', 'UEFA', null, 2, 2],
  ['GRE', 'Греция', 'Греции', 'Грецию', 'Greece', 'UEFA', null, 2, 1],
  ['GEO', 'Грузия', 'Грузии', 'Грузию', 'Georgia', 'UEFA', null, 2, 1],
  ['BRA', 'Бразилия', 'Бразилии', 'Бразилию', 'Brazil', 'CONMEBOL', 'brasileirao', 5, 5],
  ['ARG', 'Аргентина', 'Аргентины', 'Аргентину', 'Argentina', 'CONMEBOL', 'liga_profesional', 5, 5],
  ['URU', 'Уругвай', 'Уругвая', 'Уругвай', 'Uruguay', 'CONMEBOL', null, 4, 4],
  ['COL', 'Колумбия', 'Колумбии', 'Колумбию', 'Colombia', 'CONMEBOL', null, 4, 3],
  ['CHI', 'Чили', 'Чили', 'Чили', 'Chile', 'CONMEBOL', null, 3, 2],
  ['ECU', 'Эквадор', 'Эквадора', 'Эквадор', 'Ecuador', 'CONMEBOL', null, 3, 2],
  ['PAR', 'Парагвай', 'Парагвая', 'Парагвай', 'Paraguay', 'CONMEBOL', null, 3, 2],
  ['PER', 'Перу', 'Перу', 'Перу', 'Peru', 'CONMEBOL', null, 2, 1],
  ['USA', 'США', 'США', 'США', 'United States', 'CONCACAF', 'mls', 3, 3],
  ['MEX', 'Мексика', 'Мексики', 'Мексику', 'Mexico', 'CONCACAF', null, 3, 3],
  ['CAN', 'Канада', 'Канады', 'Канаду', 'Canada', 'CONCACAF', null, 2, 2],
  ['JPN', 'Япония', 'Японии', 'Японию', 'Japan', 'AFC', null, 3, 3],
  ['KOR', 'Южная Корея', 'Южной Кореи', 'Южную Корею', 'South Korea', 'AFC', null, 3, 3],
  ['KSA', 'Саудовская Аравия', 'Саудовской Аравии', 'Саудовскую Аравию', 'Saudi Arabia', 'AFC', 'saudi', 2, 2],
  ['AUS', 'Австралия', 'Австралии', 'Австралию', 'Australia', 'AFC', null, 2, 2],
  ['MAR', 'Марокко', 'Марокко', 'Марокко', 'Morocco', 'CAF', null, 4, 3],
  ['SEN', 'Сенегал', 'Сенегала', 'Сенегал', 'Senegal', 'CAF', null, 4, 3],
  ['NGA', 'Нигерия', 'Нигерии', 'Нигерию', 'Nigeria', 'CAF', null, 3, 2],
  ['EGY', 'Египет', 'Египта', 'Египет', 'Egypt', 'CAF', null, 3, 2],
  ['CIV', 'Кот-д’Ивуар', 'Кот-д’Ивуара', 'Кот-д’Ивуар', "Côte d'Ivoire", 'CAF', null, 3, 2],
  ['CMR', 'Камерун', 'Камеруна', 'Камерун', 'Cameroon', 'CAF', null, 3, 2],
  ['GHA', 'Гана', 'Ганы', 'Гану', 'Ghana', 'CAF', null, 3, 2],
  ['ALG', 'Алжир', 'Алжира', 'Алжир', 'Algeria', 'CAF', null, 3, 2],
  ['NZL', 'Новая Зеландия', 'Новой Зеландии', 'Новую Зеландию', 'New Zealand', 'OFC', null, 1, 1],
]

export const COUNTRIES: Country[] = SEEDS.map(
  ([code, ru, ruGen, ruAcc, en, confederation, homeLeagueId, strength, tournamentReach]) => ({
    code,
    name: { ru, en },
    nameGen: { ru: ruGen, en },
    nameAcc: { ru: ruAcc, en },
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
