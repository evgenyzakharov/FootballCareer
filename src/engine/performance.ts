import type { Absence, Club, InjuryHit, MatchResult, Pace, Player, Position, Role, SeasonTally } from './types'
import type { Fixture } from './fixtures'
import { isDefender } from './attributes'
import { INJURY_TYPES, injuryMatches, injuryRisk } from './injuries'
import { findClub } from '../data/clubs'
import { getLeague } from '../data/leagues'
import { playerOvr, squadLevel } from './player'
import type { ManagerStyle } from './relationships'
import { styleEffects } from './relationships'
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

/**
 * Во сколько очков настроя обходится очко личной оценки за полусезон. Заметно
 * слабее, чем у формы: форма — это про то, как идёт лично у тебя, а настрой
 * больше про то, как идёт у команды, и главный его канал ниже.
 */
export const MORALE_BY_RATING = 3

/**
 * Во сколько очков настроя обходится полусезон, в котором команда выиграла всё
 * или проиграла всё. Крупнее личного канала намеренно: хорошо отыграть в
 * команде, проигрывающей через раз, — это всё равно тяжёлый сезон, и без
 * табло настрой у игрока команды, летящей в стыки, ничем не отличался от
 * настроя у чемпиона.
 */
export const MORALE_BY_RESULT = 22

/**
 * Во сколько раз победа весит меньше поражения. Асимметрия здесь не украшение:
 * карьера в среднем идёт вверх по клубам, и при равном весе настрой у всех,
 * кто закрепился в приличной команде, упирался в потолок и переставал что-либо
 * значить. Заодно это правда про футбол — серия поражений разъедает команду
 * быстрее, чем её поднимает серия побед.
 */
export const WIN_WEIGHT = 0.5

/**
 * «Нормальная» форма: к ней межсезонье стягивает игрока за лето, от неё же
 * считается вклад формы в оценку и в роль — одно значение на все три
 * механики, иначе они разъезжаются. Ниже нейтральной середины шкалы
 * намеренно: форму зарабатывают игрой, и начинать август в хорошей форме,
 * ничего для этого не сделав, игрок не должен.
 */
export const FORM_LEVEL = 50

/**
 * Доля матчей сезона, при которой форма держится сама. Играешь две пятых и
 * больше — форму двигают только оценки; играешь меньше — тянет вниз тем
 * сильнее, чем больше матчей прошло мимо. Порог стоит между ротацией и
 * скамейкой не случайно: игрок основы иногда выпадает из состава на пару
 * матчей, и наказывать за это его не за что.
 */
export const FORM_PRACTICE = 0.4

/**
 * Сколько формы стоит полусезон, целиком просиженный вне игры. Раньше простой
 * стоил восьми очков за полгода, и запасной ходил в хорошей форме весь сезон.
 */
export const FORM_RUST = 20

/**
 * Оценка, при которой форма и настрой стоят на месте: «отыграл как нормальный
 * игрок основы» — та же точка, от которой считается сама оценка в
 * `baseRating`. Не 6.8: там стоит якорь короткого выхода на замену, и при нём
 * средний игрок ротации, отыгравший сезон ровно на свой уровень, всё равно
 * сползал в плохую форму. А межсезонье — это вообще ни одного матча, и оно
 * стягивает к пятидесяти: играть средне обязано быть лучше, чем не играть.
 */
export const FORM_NEUTRAL = 6.5

/**
 * Во сколько очков формы обходится очко оценки за полусезон. Больше прежнего,
 * потому что межсезонье теперь забывает половину формы, а не треть: при старом
 * размахе вся шкала сползлась бы к пятидесяти, и блестящий сезон с провальным
 * читались бы одним словом.
 */
export const FORM_BY_RATING = 14

export interface RoleContext {
  player: Player
  club: Club
  /** Насколько силён прямой конкурент за позицию: 0 — никого, 1 — равный, 2 — сильнее. */
  rivalPressure: number
}

/**
 * Доверие тренера, ниже которого разговор окончен: игрок не в обойме, каким бы
 * сильным он ни был. Ниже второго порога он ещё попадает в заявку, но выходит
 * редко — это «в запасе после конфликта», а не «не тянет состав».
 */
export const FROZEN_OUT = 5
export const DOGHOUSE = 15

/**
 * Роль в клубе — центральная величина: от неё зависят минуты, а от минут —
 * статистика, рост и вообще всё остальное.
 *
 * Разрыв в классе решает почти всё, но не всё: тренер, который игроку не
 * доверяет, его не ставит. Раньше класс перебивал и это — при нулевом доверии
 * игрок на 90 OVR всё равно выходил в основе клуба уровня 66, и поссориться с
 * тренером насмерть было попросту нельзя.
 */
export function determineRole({ player, club, rivalPressure }: RoleContext): Role {
  const gap = playerOvr(player) - squadLevel(club.tier)
  const score =
    gap * 1.4 +
    (player.gauges.coachTrust - 50) * 0.35 +
    (player.gauges.form - FORM_LEVEL) * 0.1 +
    player.gauges.lockerRoom * 0.05 -
    rivalPressure * 5
  const byScore: Role =
    score >= 14 ? 'star'
      : score >= 4 ? 'starter'
        : score >= -6 ? 'rotation'
          : score >= -16 ? 'bench'
            : 'reserve'
  const trust = player.gauges.coachTrust
  const ceiling: Role = trust <= FROZEN_OUT ? 'reserve' : trust <= DOGHOUSE ? 'bench' : 'star'
  return roleRank(byScore) <= roleRank(ceiling) ? byScore : ceiling
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
  moraleDelta: number
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
  /**
   * Манера тренера: она двигает и минуты, и продуктивность, и свежесть.
   * `null` — законное состояние: академия, свободный агент, клуб без
   * назначенного тренера. Тогда стиль не меняет ничего.
   */
  style?: ManagerStyle | null
  /**
   * Календарь всего сезона. Тур берёт из него свой кусок подряд: круг
   * чемпионата иначе не построить — соперников надо развести по сезону целиком,
   * а не выбирать заново на каждые пять матчей.
   */
  fixtures: Fixture[]
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
 * Сколько свежести возвращает один пропущенный матч — всё равно почему.
 * Тренировочная неделя без игры восстанавливает и травмированного, и
 * отбывающего дисквалификацию, и того, кого просто не взяли в заявку: устаёт
 * игрок на поле, а не в общей группе. Раньше отдыхом считались только травма и
 * бан, и человек, отыгравший десять матчей и севший на три, возвращался в
 * состав таким же уставшим. Форму это не чинит: она падает отдельно, от
 * нехватки игровой практики, — иначе травма стала бы способом отдохнуть.
 *
 * Меньше, чем матч отнимает (0.85): иначе пропуск был бы выгоднее игры, и
 * свежесть у всех стояла бы в потолке.
 */
const REST_RECOVERY = 0.5

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
    (player.gauges.form - FORM_LEVEL) * 0.006 +
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

/**
 * Счёт матча. Ожидаемые голы идут от разницы в силе составов: своя команда без
 * игрока играет ровно так же, как с ним, — здесь считается матч, а не его
 * вклад. Дома забивается чуть охотнее, в гостях — чуть реже.
 */
function scoreline(club: Club, fixture: Fixture, rng: Rng): { teamGoals: number; teamConceded: number } {
  const opponent = findClub(fixture.opponentId)
  const edge = (club.tier - (opponent?.tier ?? club.tier)) * 0.17 + (fixture.home ? 0.12 : -0.1)
  return {
    teamGoals: poisson(clamp(1.35 + edge, 0.35, 3.4), rng),
    teamConceded: poisson(clamp(1.35 - edge, 0.35, 3.4), rng),
  }
}

function missedMatch(fixture: Fixture, absence: Absence, club: Club, rng: Rng): MatchResult {
  return {
    ...fixture,
    ...scoreline(club, fixture, rng),
    absence,
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
  const style = styleEffects(ctx.style, player.position)
  // Своего под стиль тренер ставит чаще, чужого — реже: это тот же
  // канал, что и решения игрока, только рычаг не в его руках.
  const availability = clamp(
    (0.65 + (player.gauges.fitness / 100) * 0.35) * ctx.minutesMult * style.minutes,
    0,
    1.4,
  )
  const gk = player.position === 'GK'
  // Вратаря не выпускают на двадцать минут: он либо стоит весь матч, либо не
  // играет вовсе. Поэтому его выходы со скамейки — это просто попадания в
  // старт, а не короткие камео.
  const base = INVOLVEMENT[role]
  const involvement = gk ? { start: base.start + base.sub, sub: 0 } : base
  const roll = rng.float()
  const started = roll < involvement.start * availability
  const cameOn = !started && roll < (involvement.start + involvement.sub) * availability
  if (!started && !cameOn) return missedMatch(fixture, 'squad', club, rng)

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

  const goals = poisson(goalRate(player.position, ovr) * volume * style.goals, rng)
  const assists = poisson(assistRate(player.position, ovr) * volume * style.assists, rng)

  const cleanRate = clamp((0.14 + (club.tier - 1) * 0.038 + (ovr - 60) * 0.004) * style.cleanSheet, 0.02, 0.6)
  // Сухой матч засчитывается только тому, кто отстоял почти весь: вышедший на
  // двадцать минут при 0:0 сухого матча себе не пишет. Вратарю нужен почти
  // полный матч, защитнику — большая его часть: ноль на табло держит линия,
  // а не один человек.
  const earnsClean = gk ? minutes >= 80 : isDefender(player.position) && minutes >= 60
  const cleanSheet = earnsClean && rng.chance(cleanRate)
  // Пропущенные остаются вратарской цифрой: полевому игроку их не вешают.
  const goalsConceded = gk && !cleanSheet ? 1 + poisson(0.55, rng) : 0

  const aggression = player.position === 'CB' || player.position === 'CDM' ? 1.7 : 1
  const yellow = rng.chance(clamp(0.09 * aggression * share, 0, 0.5)) ? 1 : 0
  const red = rng.chance(clamp(0.004 * aggression * share, 0, 0.05))

  // Короткий выход и вытянуть матч не успевает, и провалить: своё влияние на
  // оценку игрок приносит вместе с минутами. Стягиваем камео не к базовым 6.6,
  // а к «ровно отыграл» — от 6.6 форма и доверие уже падают, и стягивание к
  // ней превращалось бы в тихий штраф всем, кто выходит на замену.
  const weight = 0.55 + 0.45 * share
  // Прибавку к оценке за сухой матч получает только вратарь: у него это
  // личная работа. Защитнику тот же ноль на табло уже записан в актив, и
  // если поднимать им ещё и оценку, одно событие потянет и величину сезона,
  // и награды, и доверие — замер показал плюс 0.28 к средней оценке и
  // втрое больше наград, чем нужно.
  const core = CAMEO_ANCHOR + (baseRating(player, club) + (gk && cleanSheet ? 1.1 : 0) - CAMEO_ANCHOR) * weight
  // Просевший настрой бьёт и по стабильности: матчи разваливаются на провалы
  // и всплески вместо ровной линии.
  const spread = (0.22 + Math.max(0, MORALE_LEVEL - player.gauges.morale) * 0.006) * MATCH_SPREAD
  const rating = clamp(round(rng.around(core + (goals + assists * 0.7) * 1.4, spread), 2), 4.5, 9.6)

  // Табло не может спорить с личной графой: больше команды игрок не забьёт, а
  // сухой матч — это и есть ноль пропущенных. У вратаря пропущенные уже
  // посчитаны выше, и второй бросок сделал бы из них два разных числа.
  const board = scoreline(club, fixture, rng)
  const teamGoals = Math.max(board.teamGoals, goals)
  const teamConceded = cleanSheet ? 0 : gk ? goalsConceded : board.teamConceded

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
    absence: null,
    teamGoals,
    teamConceded,
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
  for (const fixture of ctx.fixtures.slice(ctx.scheduledBefore, ctx.scheduledBefore + available)) {
    // Сначала отбывается травма, потом дисквалификация: лечиться и сидеть в
    // бане одновременно нельзя, иначе оба срока текли бы вдвое быстрее.
    if (out > 0) {
      out--
      matches.push(missedMatch(fixture, 'injury', ctx.club, rng))
      continue
    }
    if (ban > 0) {
      ban--
      matches.push(missedMatch(fixture, 'ban', ctx.club, rng))
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
  // Пропущенный матч — это отдых, какой бы ни была причина.
  const rested = matches.length - apps
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
  // Манера тренера стоит свежести ровно в той мере, в какой игрок на поле:
  // сидящий на скамейке от прессинга не устаёт.
  const drain = styleEffects(ctx.style, player.position).fitnessDrain * load
  const fitnessDelta = round(
    (6 - load * 22 - drain + (player.age < 24 ? 3 : player.age > 31 ? -3 : 0)) * part + rested * REST_RECOVERY,
    1,
  )
  // Форму двигают два разных канала: оценки и сам факт игры. Второй нужен
  // затем, что раньше отрезок без единого матча стоил восьми очков формы,
  // размазанных по туру, — и запасной с формой «хорошая» был обычным делом.
  // Практика считается по сезону, а не по туру, по той же причине, что и
  // прибавка к доверию: в туре из пяти матчей доля сыгранного скачет так, что
  // игрок ротации проваливал бы порог через тур и терял форму за чужую
  // случайность. Ниже порога штраф растёт линейно, без обрыва.
  const practice = clamp(seasonLoad / FORM_PRACTICE, 0, 1)
  // Не игравшему первый канал не даёт ничего: он не показал ни хорошего, ни
  // плохого. Его форму двигает только простой — иначе нейтральная оценка
  // сама по себе гасила бы часть штрафа за скамейку.
  const byRating = apps > 0 ? rating - FORM_NEUTRAL : 0
  const formDelta = round((byRating * FORM_BY_RATING - FORM_RUST * (1 - practice)) * part, 1)
  const trustDelta = round(((scored - 6.75) * 7 + (seasonLoad > 0.55 ? 3 : -3)) * part, 1)
  const fanDelta = round((scored - 6.85) * 6 * part + goals * 0.9 + assists * 0.5 - red * 4, 1)
  // Настрой — единственный показатель, который смотрит на табло, а не только
  // на свою графу. Хорошо отыграть в команде, проигрывающей каждый второй
  // матч, — это всё равно тяжёлый сезон, и наоборот: победы вытягивают даже
  // того, у кого лично не идёт. Считается только по матчам, в которых игрок
  // был на поле: чужие победы с трибуны настроения не делают.
  const wins = played.reduce((n, m) => n + ((m.teamGoals ?? 0) > (m.teamConceded ?? 0) ? 1 : 0), 0)
  const losses = played.reduce((n, m) => n + ((m.teamGoals ?? 0) < (m.teamConceded ?? 0) ? 1 : 0), 0)
  // Ничья ровно посередине: −1 у всех поражений, +1 у всех побед.
  const results = apps > 0 ? (wins - losses) / apps : 0
  // Поражения весят вдвое против побед. Это и правда про футбол — серия
  // поражений разъедает команду быстрее, чем её поднимает серия побед, — и
  // единственное, что удерживает шкалу от потолка: карьера в среднем идёт
  // вверх по клубам, и при симметричном счёте настрой у всех, кто закрепился
  // в приличной команде, упирался в «на подъёме» и переставал что-то значить.
  const swing = results < 0 ? results : results * WIN_WEIGHT
  // Оценки настрой тоже слышит — от той же нейтральной точки, что и форма, но
  // медленнее её: он держится дольше и стягивается к норме межсезоньем.
  const moraleDelta = round((byRating * MORALE_BY_RATING + swing * MORALE_BY_RESULT) * part, 1)

  return {
    matches,
    injuries,
    matchesOutLeft: out,
    banMatchesLeft: ban,
    apps, goals, assists, cleanSheets, goalsConceded,
    ratingSum,
    ratingCount: minutes,
    yellow, red,
    fitnessDelta, formDelta, trustDelta, fanDelta, moraleDelta,
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

/**
 * Сводка по списку матчей — та же свёртка, что и внутри `simulateBlock`, но
 * поверх готовых матчей.
 *
 * Нужна интерфейсу: движок копит `season.tally` турами и кладёт туда весь тур
 * до показа, а лента показывает его по одному матчу. Сводка сезона поэтому
 * считается не по накопленному, а по той части матчей, которую игрок уже
 * увидел, — иначе шапка сообщала бы про голы, до которых лента ещё не доехала.
 *
 * Живёт здесь, а не в разметке, потому что средняя оценка взвешивается
 * минутами: второе место, где записано это правило, рано или поздно разошлось
 * бы с первым. Что они не разошлись, проверяет тест на равенство
 * `tallyOf(season.matches)` и накопленной движком `season.tally`.
 */
export function tallyOf(matches: MatchResult[]): SeasonTally {
  const played = matches.filter((m) => m.minutes > 0)
  return {
    apps: played.length,
    goals: played.reduce((sum, m) => sum + m.goals, 0),
    assists: played.reduce((sum, m) => sum + m.assists, 0),
    cleanSheets: played.reduce((sum, m) => sum + (m.cleanSheet ? 1 : 0), 0),
    goalsConceded: played.reduce((sum, m) => sum + m.goalsConceded, 0),
    ratingSum: played.reduce((sum, m) => sum + m.rating * m.minutes, 0),
    ratingCount: played.reduce((sum, m) => sum + m.minutes, 0),
    yellow: played.reduce((sum, m) => sum + m.yellow, 0),
    red: played.reduce((sum, m) => sum + (m.red ? 1 : 0), 0),
  }
}
