import type { Locale } from '../engine/types'
import { Rng } from '../engine/rng'

/**
 * Пулы фамилий для NPC. Разбиты по языковым регионам, а не по странам —
 * этого достаточно, чтобы тренер в Испании звался иначе, чем в Норвегии.
 */
type Region =
  | 'english' | 'spanish' | 'italian' | 'german' | 'french' | 'slavic'
  | 'portuguese' | 'dutch' | 'turkish' | 'african' | 'asian' | 'nordic'

const POOLS: Record<Region, Array<[ru: string, en: string]>> = {
  english: [
    ['Уокер', 'Walker'], ['Хейл', 'Hale'], ['Бёрнс', 'Burns'], ['Мерсер', 'Mercer'],
    ['Уитлок', 'Whitlock'], ['Данн', 'Dunn'], ['Гатри', 'Guthrie'], ['Флетчер', 'Fletcher'],
  ],
  spanish: [
    ['Оливарес', 'Olivares'], ['Кальво', 'Calvo'], ['Мендес', 'Méndez'], ['Ирасабаль', 'Irazabal'],
    ['Сепеда', 'Zepeda'], ['Ровира', 'Rovira'], ['Пеньяльвер', 'Peñalver'], ['Аранда', 'Aranda'],
  ],
  italian: [
    ['Бранкале', 'Brancale'], ['Верани', 'Verani'], ['Читтадини', 'Cittadini'], ['Мазокко', 'Mazzocco'],
    ['Тревизан', 'Trevisan'], ['Форнари', 'Fornari'], ['Ла Роза', 'La Rosa'], ['Дзаннини', 'Zannini'],
  ],
  german: [
    ['Хеллер', 'Heller'], ['Брандт', 'Brandt'], ['Кёстер', 'Köster'], ['Зайферт', 'Seifert'],
    ['Виттман', 'Wittmann'], ['Ланге', 'Lange'], ['Рупп', 'Rupp'], ['Штайнбах', 'Steinbach'],
  ],
  french: [
    ['Дюфур', 'Dufour'], ['Ланглуа', 'Langlois'], ['Марешаль', 'Maréchal'], ['Ру', 'Roux'],
    ['Тибо', 'Thibault'], ['Кайе', 'Cailler'], ['Восс', 'Vosse'], ['Дельмас', 'Delmas'],
  ],
  slavic: [
    ['Кравцов', 'Kravtsov'], ['Дементьев', 'Dementyev'], ['Загорский', 'Zagorsky'], ['Юрченко', 'Yurchenko'],
    ['Балашов', 'Balashov'], ['Тихий', 'Tikhy'], ['Раич', 'Raić'], ['Новак', 'Novák'],
  ],
  portuguese: [
    ['Афонсу', 'Afonso'], ['Каэтану', 'Caetano'], ['Ребелу', 'Rebelo'], ['Гимарайнш', 'Guimarães'],
    ['Мадурейра', 'Madureira'], ['Тейшейра', 'Teixeira'], ['Бранкиньу', 'Branquinho'], ['Салгаду', 'Salgado'],
  ],
  dutch: [
    ['ван Хоорн', 'van Hoorn'], ['Дриссен', 'Driessen'], ['Куманс', 'Coumans'], ['Бринкман', 'Brinkman'],
    ['де Ваал', 'de Waal'], ['Хейманс', 'Heijmans'], ['Веенстра', 'Veenstra'], ['Смолдерс', 'Smolders'],
  ],
  turkish: [
    ['Кайхан', 'Kayhan'], ['Демирель', 'Demirel'], ['Озтюрк', 'Öztürk'], ['Ялчин', 'Yalçın'],
    ['Тунджер', 'Tunçer'], ['Айдын', 'Aydın'], ['Коркмаз', 'Korkmaz'], ['Эрдоган', 'Erdogan'],
  ],
  african: [
    ['Дьоп', 'Diop'], ['Мбенг', 'Mbeng'], ['Овусу', 'Owusu'], ['Тураби', 'Turabi'],
    ['Кулибали', 'Coulibaly'], ['Аджей', 'Adjei'], ['Нкемелу', 'Nkemelu'], ['Хамди', 'Hamdi'],
  ],
  asian: [
    ['Ямасита', 'Yamashita'], ['Ким', 'Kim'], ['Тэдзука', 'Tezuka'], ['Пак', 'Park'],
    ['Аль-Харби', 'Al-Harbi'], ['Судзуки', 'Suzuki'], ['Чон', 'Jeong'], ['Ватанабэ', 'Watanabe'],
  ],
  nordic: [
    ['Хёйберг', 'Højberg'], ['Линдквист', 'Lindqvist'], ['Оксен', 'Oxen'], ['Бергстрём', 'Bergström'],
    ['Хауген', 'Haugen'], ['Сивертсен', 'Sivertsen'], ['Кристофферсен', 'Kristoffersen'], ['Мяки', 'Mäki'],
  ],
}

const COUNTRY_REGION: Record<string, Region> = {
  ENG: 'english', SCO: 'english', IRL: 'english', USA: 'english', CAN: 'english', AUS: 'english', NZL: 'english',
  ESP: 'spanish', ARG: 'spanish', URU: 'spanish', COL: 'spanish', CHI: 'spanish', ECU: 'spanish',
  PAR: 'spanish', PER: 'spanish', MEX: 'spanish',
  ITA: 'italian',
  GER: 'german', AUT: 'german', SUI: 'german',
  FRA: 'french', BEL: 'french',
  RUS: 'slavic', UKR: 'slavic', POL: 'slavic', SRB: 'slavic', CRO: 'slavic', CZE: 'slavic', GEO: 'slavic',
  POR: 'portuguese', BRA: 'portuguese',
  NED: 'dutch',
  TUR: 'turkish', GRE: 'turkish',
  MAR: 'african', SEN: 'african', NGA: 'african', EGY: 'african', CIV: 'african',
  CMR: 'african', GHA: 'african', ALG: 'african',
  JPN: 'asian', KOR: 'asian', KSA: 'asian',
  DEN: 'nordic', SWE: 'nordic', NOR: 'nordic',
}

export function regionFor(country: string): Region {
  return COUNTRY_REGION[country] ?? 'english'
}

export function randomSurname(country: string, rng: Rng): Record<Locale, string> {
  const [ru, en] = rng.pick(POOLS[regionFor(country)])
  return { ru, en }
}
