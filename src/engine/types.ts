export type Locale = 'ru' | 'en'
/** Валюта отображения. Движок всё считает в евро, это только показ. */
export type Currency = 'EUR' | 'RUB'
export type Localized = Record<Locale, string>

/**
 * Значение подстановки. Кроме строк и чисел принимает локализованные имена
 * (клубы, NPC) и вложенные Text — например название травмы или турнира.
 */
export type TextParam = string | number | Localized | { key: string }

/** Ссылка на строку в локали + подстановки. Ни одна строка не хардкодится в движке. */
export interface Text {
  key: string
  params?: Record<string, TextParam>
}

export type Confederation = 'UEFA' | 'CONMEBOL' | 'CONCACAF' | 'AFC' | 'CAF' | 'OFC'

export interface League {
  id: string
  name: Localized
  country: string
  confederation: Confederation
  /** 1 — высший дивизион страны, 2 — второй. */
  level: number
  /** Сила лиги 1..5: влияет на рост игрока и внимание скаутов. */
  strength: number
  /** Клубов в лиге: от этого зависит шкала мест в таблице. */
  teams: number
}

export interface Club {
  id: string
  name: Localized
  leagueId: string
  country: string
  confederation: Confederation
  tier: number
}

export interface Country {
  code: string
  name: Localized
  /** Родительный падеж: «сборная Нигерии», «клубы из Нигерии». */
  nameGen: Localized
  /** Винительный: «играть за Нигерию», «вернуться в Нигерию». */
  nameAcc: Localized
  confederation: Confederation
  homeLeagueId: string | null
  strength: number
  tournamentReach: number
}

export type Position =
  | 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LM' | 'RM' | 'LW' | 'RW' | 'ST'

export type Foot = 'left' | 'right'

export type AttrKey =
  | 'pace' | 'shooting' | 'passing' | 'dribbling' | 'defending' | 'physical' | 'mental' | 'goalkeeping'

export type Attributes = Record<AttrKey, number>

/** Мягкие показатели: они и делают сезон живым, потому что меняются внутри сезона. */
export interface Gauges {
  /** Форма 0..100 — краткосрочная, тает без игровой практики. */
  form: number
  /** Физическая свежесть 0..100 — главный драйвер риска травмы. */
  fitness: number
  /** Настрой 0..100. */
  morale: number
  /** Доверие тренера 0..100 — определяет роль и минуты. */
  coachTrust: number
  /** Любовь трибун 0..100. */
  fanLove: number
  /** Репутация в медиа −100..100. */
  mediaRep: number
  /** Вес в раздевалке 0..100. */
  lockerRoom: number
  /** Известность 0..100 — спонсорские деньги и внимание топ-клубов. */
  fame: number
}

export type Severity = 1 | 2 | 3

export interface InjuryRecord {
  age: number
  kind: string
  severity: Severity
  /** Сколько игровых блоков пропущено. */
  blocksOut: number
}

export interface Player {
  lastName: string
  shirt: number
  foot: Foot
  countryCode: string
  position: Position
  age: number
  attrs: Attributes
  gauges: Gauges
  /** Скрытый потолок OVR. Игрок его не видит, но чувствует по темпу роста. */
  potential: number
  traits: string[]
  injuries: InjuryRecord[]
  /** Блоков пропуска из-за травмы. Лечится в межсезонье. */
  blocksOut: number
  /**
   * Блоков дисквалификации. В отличие от травмы межсезонье её не снимает:
   * бан на два блока — это реально пропущенный сезон.
   */
  banBlocks: number
  money: number
}

export type Role = 'star' | 'starter' | 'rotation' | 'bench' | 'reserve'

export interface Contract {
  clubId: string
  yearsLeft: number
  /** Зарплата за сезон, €. */
  wage: number
  isLoan: boolean
  parentClubId: string | null
  objective: Objective | null
}

/** Цель, которую тренер ставит на сезон. Выполнил — доверие и деньги, провалил — наоборот. */
export interface Objective {
  kind: 'apps' | 'goals' | 'assists' | 'rating' | 'trophy'
  target: number
  /** Награда за выполнение и штраф за провал — в очках доверия. */
  reward: number
  penalty: number
}

export type RelationRole =
  | 'manager' | 'agent' | 'rival' | 'mentor' | 'journalist' | 'captain' | 'nationalCoach'

export interface Relationship {
  role: RelationRole
  name: Localized
  /** Привязка к клубу: тренер и конкурент уходят вместе со сменой клуба. */
  clubId: string | null
  /** Отношение −100..100. */
  stance: number
  sinceAge: number
  /** Дополнительные поля роли: стиль тренера, позиция конкурента и т.п. */
  meta?: Record<string, string | number>
}

export type Stage = 'preseason' | 'autumn' | 'winter' | 'spring' | 'run_in' | 'review'
/**
 * Насыщенность сезона: сколько случайных ситуаций выпадает на этапы.
 * Выбирается один раз при создании карьеры и дальше не меняется — иначе
 * карьера перестала бы воспроизводиться по сиду.
 */
export type Pace = 'calm' | 'normal' | 'busy'

export type CompetitionKind = 'league' | 'cup' | 'continental' | 'continental2' | 'club_world_cup'

export interface Effect_Attr { t: 'attr'; key: AttrKey; delta: number }
export interface Effect_Gauge { t: 'gauge'; key: keyof Gauges; delta: number }
export interface Effect_Money { t: 'money'; delta: number }
export interface Effect_Injury { t: 'injury'; kind: string; severity: Severity }
export interface Effect_Suspend { t: 'suspend'; blocks: number }
export interface Effect_Trait { t: 'trait'; add?: string; remove?: string }
export interface Effect_Flag { t: 'flag'; key: string; delta: number }
export interface Effect_TrophyOdds { t: 'trophyOdds'; comp: CompetitionKind; mult: number }
export interface Effect_Transfer { t: 'transfer'; clubId: string; loan: boolean; wage?: number; years?: number }
export interface Effect_Relationship { t: 'relationship'; role: RelationRole; delta: number }
export interface Effect_Schedule { t: 'schedule'; consequence: Consequence }
export interface Effect_Retire { t: 'retire' }
/** Расторгнуть контракт: игрок остаётся без клуба. */
/** Множитель к зарплате по текущему контракту: 0.5 — урезать вдвое. */
export interface Effect_Wage { t: 'wage'; mult: number }
export interface Effect_Release { t: 'release' }
export interface Effect_Nationality { t: 'nationality'; code: string }
export interface Effect_Position { t: 'position'; position: Position }
export interface Effect_Stat { t: 'stat'; key: 'goals' | 'assists' | 'apps'; delta: number }
export interface Effect_Potential { t: 'potential'; delta: number }
/** Множитель игрового времени до конца сезона. */
export interface Effect_Minutes { t: 'minutes'; mult: number }
/** Пересмотр задачи на сезон: вверх или вниз. Меняет саму цель, а не проверку. */
export interface Effect_Objective { t: 'objective'; direction: 'up' | 'down' }

export type Effect =
  | Effect_Attr | Effect_Gauge | Effect_Money | Effect_Injury | Effect_Suspend
  | Effect_Trait | Effect_Flag | Effect_TrophyOdds | Effect_Transfer
  | Effect_Relationship | Effect_Schedule | Effect_Retire | Effect_Nationality
  | Effect_Position | Effect_Stat | Effect_Potential | Effect_Minutes | Effect_Release
  | Effect_Objective | Effect_Wage

/**
 * Отложенное последствие. Именно оно превращает набор случайных событий
 * в связную историю: выбор отзывается через сезон-два.
 */
export interface Consequence {
  id: string
  /** Через сколько сезонов сработает (0 — в этом же сезоне). */
  inSeasons: number
  stage: Stage
  /** Ключ события, которое надо выдать. */
  eventKey: string
  /** Контекст, который событие получит при срабатывании. */
  payload?: Record<string, string | number>
}

export interface ScheduledConsequence extends Consequence {
  dueAge: number
}

export interface OptionEffectHint {
  /** Что показать на кнопке заранее: подсказка о риске/выгоде. */
  text: Text
  tone: 'good' | 'bad' | 'risky' | 'neutral'
}

export interface CardOption {
  id: string
  label: Text
  hints: OptionEffectHint[]
}

export type CardKind = 'decision' | 'report'

export interface Card {
  id: string
  kind: CardKind
  stage: Stage
  /** Ключ события — для тестов, ачивок и отладки. */
  eventKey: string
  title: Text
  body: Text
  /** Пустой у report-карточек: там одна кнопка «дальше». */
  options: CardOption[]
  /** Иллюстративный ярлык: тренировка, медиа, трансфер, матч… */
  channel: EventChannel
  /** Строки-детали для отчётов: трофеи, награды, итоги блока. */
  details?: Text[]
  /** Контекст, с которым карточка была собрана: нужен при разборе выбора. */
  payload?: Record<string, string | number>
}

/**
 * Бит сезона. В очереди лежат именно биты, а не готовые карточки: карточка
 * собирается в момент показа, поэтому видит все эффекты предыдущих решений.
 */
export type Beat =
  | { t: 'event'; key: string; payload?: Record<string, string | number> }
  | { t: 'random' }
  | { t: 'sim' }
  | { t: 'season_end' }
  | { t: 'market' }

export type EventChannel =
  | 'training' | 'media' | 'locker' | 'transfer' | 'match' | 'life' | 'national' | 'medical' | 'board'

export interface Resolution {
  text: Text
  effects: Effect[]
  headline?: Text
}

export interface FeedItem {
  age: number
  stage: Stage
  text: Text
  channel: EventChannel
  tone: 'good' | 'bad' | 'neutral'
}

export interface SeasonTally {
  apps: number
  goals: number
  assists: number
  cleanSheets: number
  /** Пропущено мячей: считается только для вратаря. */
  goalsConceded: number
  ratingSum: number
  ratingCount: number
  yellow: number
  red: number
}

export interface NationalTally {
  caps: number
  goals: number
  tournament: string | null
  trophy: string | null
}

export interface SeasonRecord {
  age: number
  /** null — сезон без клуба: игрок был свободным агентом. */
  clubId: string | null
  loan: boolean
  parentClubId: string | null
  ovrStart: number
  ovrEnd: number
  role: Role
  tally: SeasonTally
  national: NationalTally
  trophies: string[]
  awards: string[]
  objective: Objective | null
  objectiveMet: boolean | null
  /** Место клуба в лиге по итогам сезона. null — сезон без клуба. */
  leaguePos: number | null
}

export interface CurrentSeason {
  age: number
  /** null — сезон без клуба: игрок был свободным агентом. */
  clubId: string | null
  loan: boolean
  parentClubId: string | null
  ovrStart: number
  role: Role
  tally: SeasonTally
  national: NationalTally
  trophies: string[]
  awards: string[]
  /** Множители шансов на трофеи, накопленные решениями этого сезона. */
  oddsMult: Partial<Record<CompetitionKind, number>>
  /** Сколько блоков сезона уже отыграно (0..2). */
  blocksPlayed: number
  /** Множитель минут на остаток сезона, накопленный решениями. */
  minutesMult: number
}

export type Phase = 'intro' | 'identity' | 'academy' | 'season' | 'retired'

export interface CareerState {
  version: number
  seed: string
  /** Календарный год первого сезона: из него собираются подписи «2026/27». */
  startYear: number
  /** Счётчик обращений к RNG: делает карьеру воспроизводимой по (seed, step). */
  step: number
  phase: Phase
  /** Насыщенность сезона: выбор игрока на старте карьеры. */
  pace: Pace
  player: Player
  contract: Contract | null
  season: CurrentSeason | null
  stage: Stage
  /** Очередь битов текущего этапа. Пустая — идём на следующий этап. */
  queue: Beat[]
  /** Карточка, которую видит игрок сейчас. */
  card: Card | null
  /** Результат последнего выбора: показывается перед следующей карточкой. */
  resolution: Resolution | null
  /** Ключи событий, уже выданных в этом сезоне — не повторяем внутри года. */
  seasonEvents: string[]
  history: SeasonRecord[]
  relationships: Relationship[]
  consequences: ScheduledConsequence[]
  feed: FeedItem[]
  trophies: Array<{ age: number; comp: CompetitionKind | 'national'; name: string }>
  awards: Array<{ age: number; key: string }>
  flags: Record<string, number>
  /** Ключи событий, которые уже отыграны: не повторяем one-shot ситуации. */
  usedEvents: string[]
  /** Клубы, за которые игрок играл, по порядку. */
  clubsPlayed: string[]
  retiredAt: number | null
}
