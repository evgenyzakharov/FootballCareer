import type { Club, InjuryHit, MatchResult, Pace, Player, Position, Role } from './types'
import type { Fixture } from './fixtures'
import { buildFixtures } from './fixtures'
import { INJURY_TYPES, injuryMatches, injuryRisk } from './injuries'
import { getLeague } from '../data/leagues'
import { playerOvr, squadLevel } from './player'
import { Rng, clamp, round } from './rng'

/** Матчей в полусезоне со всеми турнирами. Мерка, от которой считаются сдвиги
 *  показателей: она же была размером одного хода до появления туров. */
export const BLOCK_MATCHES = 26

/** Матчей за сезон: лига, кубок и еврокубок вместе. */
export const SEASON_MATCHES = BLOCK_MATCHES * 2

/**
 * На сколько туров режется сезон. Насыщенность уже управляет тем, сколько
 * ситуаций выпадает игроку, — пусть она же управляет и тем, насколько мелко
 * идёт время. Матчей за сезон при этом поровну: спокойный сезон не короче
 * насыщенного, просто отчёты в нём крупнее.
 */
export const ROUNDS_PER_SEASON: Record<Pace, number> = { calm: 6, normal: 8, busy: 10 }

/** Сколько матчей приходится на тур с этим номером. Остаток раздаётся первым. */
export function matchesInRound(pace: Pace, index: number): number {
  const rounds = ROUNDS_PER_SEASON[pace]
  const base = Math.floor(SEASON_MATCHES / rounds)
  return clamp(index, 0, rounds - 1) < SEASON_MATCHES % rounds ? base + 1 : base
}

/** Сколько матчей сезона прошло до тура с этим номером. */
export function matchesBefore(pace: Pace, index: number): number {
  let sum = 0
  for (let i = 0; i < index; i++) sum += matchesInRound(pace, i)
  return sum
}

const ROLE_ORDER: Role[] = ['reserve', 'bench', 'rotation', 'starter', 'star']

/**
 * «Нормальный» настрой: столько держится у игрока, которого не носит из провала
 * в триумф. К нему межсезонье стягивает настрой, от него же считается вклад
 * настроя в оценку — одно значение на обе механики, иначе они разъедутся.
 */
export const MORALE_LEVEL = 65

export interface RoleContext {
  player: Player
  club: Club
  /** Насколько силён прямой конкурент за позицию: 0 — никого, 1 — равный, 2 — сильнее. */
  rivalPressure: number
}

/**
 * Роль в клубе — центральная величина: от неё зависят минуты, а от минут —
 * статистика, рост и вообще всё остальное.
 */
export function determineRole({ player, club, rivalPressure }: RoleContext): Role {
  const gap = playerOvr(player) - squadLevel(club.tier)
  const score =
    gap * 1.4 +
    (player.gauges.coachTrust - 50) * 0.35 +
    (player.gauges.form - 60) * 0.1 +
    player.gauges.lockerRoom * 0.05 -
    rivalPressure * 5
  if (score >= 14) return 'star'
  if (score >= 4) return 'starter'
  if (score >= -6) return 'rotation'
  if (score >= -16) return 'bench'
  return 'reserve'
}

export function roleShare(role: Role): number {
  switch (role) {
    case 'star': return 0.92
    case 'starter': return 0.8
    case 'rotation': return 0.52
    case 'bench': return 0.24
    case 'reserve': return 0.07
  }
}

/**
 * Как роль делится на выход в старте и выход со скамейки. Сумма каждой пары —
 * ровно `roleShare`: общее число появлений осталось прежним, изменилось лишь
 * то, что теперь видно, вышел игрок с первых минут или на двадцать в концовке.
 * Ротация и скамейка выходят на замену чаще, чем начинают, — в этом и разница
 * между ними и основой.
 */
const INVOLVEMENT: Record<Role, { start: number; sub: number }> = {
  star: { start: 0.86, sub: 0.06 },
  starter: { start: 0.66, sub: 0.14 },
  rotation: { start: 0.26, sub: 0.26 },
  bench: { start: 0.06, sub: 0.18 },
  reserve: { start: 0.01, sub: 0.06 },
}

export function shiftRole(role: Role, delta: number): Role {
  const idx = clamp(ROLE_ORDER.indexOf(role) + delta, 0, ROLE_ORDER.length - 1)
  return ROLE_ORDER[idx]
}

export function roleRank(role: Role): number {
  return ROLE_ORDER.indexOf(role)
}

/**
 * Голы за полный матч по позиции: калибровано так, чтобы топ-форвард на 90 OVR
 * давал ~30 за сезон. Ставка идёт на девяносто минут, а не на появление,
 * поэтому в симуляции она домножается на сыгранную долю матча.
 */
function goalRate(position: Position, ovr: number): number {
  const o = ovr - 55
  switch (position) {
    case 'ST': return 0.1 + o * 0.02
    case 'LW': case 'RW': return 0.06 + o * 0.013
    case 'CAM': return 0.05 + o * 0.011
    case 'LM': case 'RM': return 0.04 + o * 0.008
    case 'CM': return 0.03 + o * 0.006
    case 'CDM': return 0.015 + o * 0.003
    case 'LB': case 'RB': return 0.01 + o * 0.003
    case 'CB': return 0.02 + o * 0.002
    case 'GK': return 0
  }
}

function assistRate(position: Position, ovr: number): number {
  const o = ovr - 55
  switch (position) {
    case 'ST': return 0.04 + o * 0.006
    case 'LW': case 'RW': return 0.06 + o * 0.011
    case 'CAM': return 0.08 + o * 0.014
    case 'LM': case 'RM': return 0.07 + o * 0.012
    case 'CM': return 0.05 + o * 0.009
    case 'CDM': return 0.02 + o * 0.004
    case 'LB': case 'RB': return 0.04 + o * 0.007
    case 'CB': return 0.01 + o * 0.002
    case 'GK': return 0.002
  }
}

export interface BlockResult {
  /** Все матчи отрезка, включая пропущенные: из них собран весь остальной итог. */
  matches: MatchResult[]
  /** Повреждения, полученные по ходу тура: за пять матчей их бывает и два. */
  injuries: InjuryHit[]
  /** Остаток срока травмы и дисквалификации после отрезка. */
  matchesOutLeft: number
  banMatchesLeft: number
  apps: number
  goals: number
  assists: number
  cleanSheets: number
  goalsConceded: number
  ratingSum: number
  ratingCount: number
  yellow: number
  red: number
  /** Изменения показателей после блока. */
  fitnessDelta: number
  formDelta: number
  trustDelta: number
  fanDelta: number
}

export interface BlockContext {
  player: Player
  club: Club
  role: Role
  /** Множитель минут: решения игрока и накопленная усталость. */
  minutesMult: number
  /** Матчей вне игры на входе в тур: сначала травма, потом дисквалификация. */
  matchesOut: number
  banMatches: number
  /** Матчей в туре. */
  size: number
  /** Сыграно и запланировано в сезоне до этого тура: по ним считается практика. */
  playedBefore: number
  scheduledBefore: number
}

/**
 * Сухие матчи и пропущенные считаются связанно: в каждом «не сухом» матче
 * минимум один мяч. Иначе цифры противоречат друг другу, а показываются они
 * рядом. Формула одна на клуб и сборную — меняется только доля сухих.
 */
export function keeperRun(apps: number, cleanRate: number, rng: Rng): { cleanSheets: number; goalsConceded: number } {
  const cleanSheets = Math.min(apps, poisson(apps * cleanRate, rng))
  const goalsConceded = apps > 0 ? (apps - cleanSheets) + poisson((apps - cleanSheets) * 0.55, rng) : 0
  return { cleanSheets, goalsConceded }
}

/**
 * Появление считается по полному матчу, а средняя длина выхода меньше
 * девяноста минут: у основы это примерно три четверти матча, у скамейки — куда
 * меньше. Множитель возвращает суммы сезона на прежний уровень, чтобы таблицы
 * `goalRate` и `assistRate`, подобранные под «тридцать голов у топ-форварда»,
 * остались теми же.
 */
const PER_MATCH_SCALE = 1.24

/**
 * Разброс оценки за один матч против разброса за полусезон. Отдельный матч
 * качает куда сильнее, но за сезон это усредняется: множитель подобран так,
 * чтобы средняя за сезон осталась примерно такой же по разбросу, какой была
 * при двух бросках на весь год.
 */
const MATCH_SPREAD = 4.5

/**
 * Оценка, к которой стягивается короткий выход на замену. Это уровень «отыграл
 * ровно на свой уровень»: именно от него не двигается форма после отрезка.
 */
const CAMEO_ANCHOR = 6.8

/**
 * Сколько свежести возвращает один матч, пропущенный по травме или бану. Просто
 * не попасть в заявку — ещё не отдых: игрок тренируется в общей группе. А вот
 * выбывший из обоймы восстанавливается, и из лазарета возвращаются физически
 * свежими. Форму это не чинит: она падает отдельно, от нехватки игровой
 * практики, — иначе травма превратилась бы в способ отдохнуть.
 */
const REST_RECOVERY = 0.9

/**
 * Оценка «как игрок выглядит»: всё, что он приносит в матч сам, без учёта
 * результативных действий и случая. Из неё считается и оценка за матч, и то,
 * во что обошёлся отрезок, просиженный на скамейке.
 */
function baseRating(player: Player, club: Club): number {
  // База 6.6 — это «нормальный игрок основы»; ниже неё показатели начинают падать.
  return (
    6.6 +
    (playerOvr(player) - squadLevel(club.tier)) * 0.028 +
    (player.gauges.form - 60) * 0.006 +
    // Настрой весит в оценке ровно столько же, сколько форма. Форма при этом
    // остаётся сильнее: она вдобавок умножает голы и передачи.
    (player.gauges.morale - MORALE_LEVEL) * 0.006 +
    // Раздевалка считается без середины, как и в `determineRole`: авторитет
    // зарабатывается с нуля и после каждого перехода срезается.
    player.gauges.lockerRoom * 0.0025 +
    // У прессы середина есть по самой шкале: ноль — это когда о вас не пишут.
    player.gauges.mediaRep * 0.0012
  )
}

function missedMatch(fixture: Fixture): MatchResult {
  return {
    ...fixture,
    minutes: 0,
    started: false,
    goals: 0,
    assists: 0,
    cleanSheet: false,
    goalsConceded: 0,
    yellow: 0,
    red: false,
    rating: 0,
    injury: null,
  }
}

/**
 * Один матч. Сначала решается, вышел ли игрок вообще и на сколько, и уже от
 * минут считается всё остальное: короткий выход и голов приносит меньше, и на
 * оценку влияет слабее.
 */
export function simulateMatch(ctx: BlockContext, fixture: Fixture, rng: Rng): MatchResult {
  const { player, club, role } = ctx
  const ovr = playerOvr(player)
  const league = getLeague(club.leagueId)

  // Свежесть и решения игрока двигают не длину матча, а шанс в него попасть:
  // уставшего чаще оставляют на скамейке, а не снимают на сороковой минуте.
  const availability = clamp((0.65 + (player.gauges.fitness / 100) * 0.35) * ctx.minutesMult, 0, 1.4)
  const gk = player.position === 'GK'
  // Вратаря не выпускают на двадцать минут: он либо стоит весь матч, либо не
  // играет вовсе. Поэтому его выходы со скамейки — это просто попадания в
  // старт, а не короткие камео.
  const base = INVOLVEMENT[role]
  const involvement = gk ? { start: base.start + base.sub, sub: 0 } : base
  const roll = rng.float()
  const started = roll < involvement.start * availability
  const cameOn = !started && roll < (involvement.start + involvement.sub) * availability
  if (!started && !cameOn) return missedMatch(fixture)

  // Чем выше роль, тем реже снимают до финального свистка.
  const full = gk || rng.chance(0.4 + roleRank(role) * 0.09)
  const planned = started ? (full ? 90 : rng.int(55, 85)) : rng.int(6, 34)

  // Повреждение выпадает в конкретном матче, а не броском на весь полусезон.
  // Сломавшийся не доигрывает, и дальше весь матч считается по тем минутам,
  // которые он реально провёл на поле.
  const severe = player.injuries.filter((i) => i.severity === 3).length
  const hurt = rng.chance(injuryRisk(player.gauges.fitness, player.age, severe) * (planned / 90))
  const injury: InjuryHit | null = hurt
    ? (({ kind, severity }) => ({ kind, severity }))(
      rng.weighted(INJURY_TYPES.map((item) => ({ item, weight: item.weight }))),
    )
    : null
  const minutes = injury ? Math.max(5, Math.round(planned * rng.around(0.6, 0.35))) : planned
  const share = minutes / 90

  // Сильная команда создаёт больше момента, слабая — меньше.
  const teamFactor = 0.82 + (club.tier - 1) * 0.055
  // Сильная лига — плотнее защита.
  const leagueFactor = 1.12 - league.strength * 0.03
  const formFactor = 0.72 + (player.gauges.form / 100) * 0.56
  const volume = share * PER_MATCH_SCALE * teamFactor * leagueFactor * formFactor

  const goals = poisson(goalRate(player.position, ovr) * volume, rng)
  const assists = poisson(assistRate(player.position, ovr) * volume, rng)

  const cleanRate = clamp(0.14 + (club.tier - 1) * 0.038 + (ovr - 60) * 0.004, 0.02, 0.6)
  // Сухой матч засчитывается только тому, кто отстоял почти весь: вышедший на
  // двадцать минут при 0:0 сухого матча себе не пишет.
  const cleanSheet = gk && minutes >= 80 && rng.chance(cleanRate)
  const goalsConceded = gk && !cleanSheet ? 1 + poisson(0.55, rng) : 0

  const aggression = player.position === 'CB' || player.position === 'CDM' ? 1.7 : 1
  const yellow = rng.chance(clamp(0.09 * aggression * share, 0, 0.5)) ? 1 : 0
  const red = rng.chance(clamp(0.004 * aggression * share, 0, 0.05))

  // Короткий выход и вытянуть матч не успевает, и провалить: своё влияние на
  // оценку игрок приносит вместе с минутами. Стягиваем камео не к базовым 6.6,
  // а к «ровно отыграл» — от 6.6 форма и доверие уже падают, и стягивание к
  // ней превращалось бы в тихий штраф всем, кто выходит на замену.
  const weight = 0.55 + 0.45 * share
  const core = CAMEO_ANCHOR + (baseRating(player, club) + (cleanSheet ? 1.1 : 0) - CAMEO_ANCHOR) * weight
  // Просевший настрой бьёт и по стабильности: матчи разваливаются на провалы
  // и всплески вместо ровной линии.
  const spread = (0.22 + Math.max(0, MORALE_LEVEL - player.gauges.morale) * 0.006) * MATCH_SPREAD
  const rating = clamp(round(rng.around(core + (goals + assists * 0.7) * 1.4, spread), 2), 4.5, 9.6)

  return {
    ...fixture,
    minutes,
    started,
    goals,
    assists,
    cleanSheet,
    goalsConceded,
    yellow,
    red,
    rating,
    injury,
  }
}

/**
 * Отрезок сезона — это календарь матчей и проход по нему. Раньше здесь был
 * один бросок на все двадцать шесть игр; матчи нужны затем, чтобы травма
 * случалась в конкретной игре, а игрок видел, с кем и сколько он сыграл.
 */
export function simulateBlock(ctx: BlockContext, rng: Rng): BlockResult {
  const { player } = ctx
  const available = ctx.size
  let out = ctx.matchesOut
  let ban = ctx.banMatches
  const injuries: InjuryHit[] = []

  const matches: MatchResult[] = []
  let sidelined = 0
  for (const fixture of buildFixtures(ctx.club, available, rng)) {
    // Сначала отбывается травма, потом дисквалификация: лечиться и сидеть в
    // бане одновременно нельзя, иначе оба срока текли бы вдвое быстрее.
    if (out > 0) {
      out--
      sidelined++
      matches.push(missedMatch(fixture))
      continue
    }
    if (ban > 0) {
      ban--
      sidelined++
      matches.push(missedMatch(fixture))
      continue
    }
    const match = simulateMatch(ctx, fixture, rng)
    matches.push(match)
    // Удаление — это пропуск ближайших матчей, а не просто цифра в графе.
    if (match.red) ban += rng.int(1, 2)
    if (match.injury) {
      // Тяжесть повреждения ещё может измениться от того, как игрок будет
      // лечиться, но выбывает он с этого матча — а не с конца полусезона.
      injuries.push(match.injury)
      out = injuryMatches(match.injury.kind, match.injury.severity)
    }
  }
  const played = matches.filter((m) => m.minutes > 0)

  const apps = played.length
  const goals = played.reduce((sum, m) => sum + m.goals, 0)
  const assists = played.reduce((sum, m) => sum + m.assists, 0)
  const cleanSheets = played.reduce((sum, m) => sum + (m.cleanSheet ? 1 : 0), 0)
  const goalsConceded = played.reduce((sum, m) => sum + m.goalsConceded, 0)
  const yellow = played.reduce((sum, m) => sum + m.yellow, 0)
  const red = played.reduce((sum, m) => sum + (m.red ? 1 : 0), 0)
  // Средняя оценка взвешивается минутами, а не появлениями: иначе выход на
  // двадцать минут весил бы столько же, сколько полный матч, и у любого, кто
  // регулярно доигрывает со скамейки, средняя тихо ползла бы вниз.
  const minutes = played.reduce((sum, m) => sum + m.minutes, 0)
  const ratingSum = played.reduce((sum, m) => sum + m.rating * m.minutes, 0)
  const rating = averageRating(ratingSum, minutes)
  // Не сыграв ни минуты, оценку не заработать — но и провалить нечего. Ноль
  // здесь означал бы худший тур в истории футбола: форма и доверие ушли бы в
  // пол, и запасной уже никогда не выбрался бы из запасных. Берём «отыграл
  // ровно на свой уровень» — от него ни форма, ни доверие не двигаются вовсе,
  // а за скамейку игрок расплачивается отдельно, штрафом за нехватку практики.
  // Собственный уровень игрока сюда не годится: у слабого он ниже нейтрального,
  // и каждый тур на скамейке тихо утаскивал бы его ещё ниже.
  const scored = apps > 0 ? rating : CAMEO_ANCHOR

  // Усталость копится от нагрузки самого тура: сыграл много — сел без сил.
  const load = available > 0 ? apps / available : 0
  // А вот «мало практики» считается по сезону целиком, а не по одному туру.
  // Пороги подбирались на полусезон, где доля сыгранного почти не гуляет; в
  // туре из пяти матчей она скачет так, что игрок ротации случайно проваливал
  // порог в каждом пятом туре и получал штраф, которого раньше не видел.
  const seasonLoad = ctx.scheduledBefore + available > 0
    ? (ctx.playedBefore + apps) / (ctx.scheduledBefore + available)
    : 0
  // Сдвиги подобраны на полусезон, поэтому тур двигает показатели ровно на
  // свою долю — иначе за сезон из десяти туров форма ходила бы впятеро резче,
  // чем из двух. Голы и передачи не масштабируются: они считаются поштучно и
  // складываются за сезон сами.
  const part = available / BLOCK_MATCHES
  const fitnessDelta = round(
    (6 - load * 22 + (player.age < 24 ? 3 : player.age > 31 ? -3 : 0)) * part + sidelined * REST_RECOVERY,
    1,
  )
  const formDelta = round(((scored - 6.8) * 9 + (seasonLoad < 0.25 ? -8 : 0)) * part, 1)
  const trustDelta = round(((scored - 6.75) * 7 + (seasonLoad > 0.55 ? 3 : -3)) * part, 1)
  const fanDelta = round((scored - 6.85) * 6 * part + goals * 0.9 + assists * 0.5 - red * 4, 1)

  return {
    matches,
    injuries,
    matchesOutLeft: out,
    banMatchesLeft: ban,
    apps, goals, assists, cleanSheets, goalsConceded,
    ratingSum,
    ratingCount: minutes,
    yellow, red,
    fitnessDelta, formDelta, trustDelta, fanDelta,
  }
}

/** Пуассон через произведение равномерных — достаточно для наших значений λ. */
export function poisson(lambda: number, rng: Rng): number {
  if (lambda <= 0) return 0
  // При больших λ разбиваем на части, чтобы не упереться в точность экспоненты.
  if (lambda > 30) return poisson(lambda / 2, rng) + poisson(lambda / 2, rng)
  const limit = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= rng.float()
  } while (p > limit)
  return k - 1
}

export function averageRating(sum: number, count: number): number {
  return count > 0 ? round(sum / count, 2) : 0
}
