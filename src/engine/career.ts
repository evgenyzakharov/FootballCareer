import type {
  Attributes, Beat, Card, CareerState, Effect, NationalTally, Pace, Player, Role, SeasonRecord,
  Stage, Text,
} from './types'
import { ATTR_KEYS, attrAgeBand, isGoalkeeper, marketValue, overall } from './attributes'
import { MAX_AGE, START_AGE, createPlayer, playerOvr, squadLevel } from './player'
import type { Identity } from './player'
import { BLOCK_MATCHES, MORALE_LEVEL, averageRating, determineRole, keeperRun, simulateBlock } from './performance'
import {
  NATIONAL_TOURNAMENT, callUpChance, leagueLift, nationalTrophyChance,
  rollClubTrophies, rollLeaguePosition, tournamentThisSeason,
} from './competitions'
import { rollAwards } from './awards'
import { Rng, clamp, round } from './rng'
import { findClub, getClub } from '../data/clubs'
import { getCountry } from '../data/countries'
import { getLeague } from '../data/leagues'
import { buildCard, getEvent, pickEvent, resolveCard } from './events'
import type { EventCtx } from './events'
import { SUMMER_RECOVERY, injuryMatches } from './injuries'
import { adjustObjective, makeObjective } from './events/structural'
import { academyOffers, clubWantsToRenew, generateOffers } from './offers'
import {
  createAgent, createJournalist, createManager, find, managerSackChance, relocate, styleFit,
} from './relationships'
import type { ManagerStyle } from './relationships'

/**
 * Версия формы состояния. Растёт при любом несовместимом изменении схемы;
 * подъём версии обязан сопровождаться миграцией в `save.ts`.
 */
export const STATE_VERSION = 7

const STAGES: Stage[] = ['preseason', 'autumn', 'winter', 'spring', 'run_in', 'review']

/**
 * Календарный год, на лето которого приходится конец сезона: карьера, начатая
 * в 2026-м, в 16 лет играет сезон 2026/27 и заканчивает его в 2027-м. По этому
 * году и разложены большие турниры сборных.
 */
export function seasonEndYear(state: CareerState): number {
  return state.startYear + (state.player.age - START_AGE) + 1
}

// ─── Инициализация ──────────────────────────────────────────────────────────

/**
 * Год первого сезона передаётся извне: движку нельзя знать сегодняшнюю дату,
 * иначе карьера перестанет быть воспроизводимой по одному сиду.
 */
export function newCareer(seed: string, startYear = 2026, pace: Pace = 'busy'): CareerState {
  return {
    version: STATE_VERSION,
    seed,
    startYear,
    step: 0,
    phase: 'identity',
    pace,
    player: {
      lastName: '', shirt: 10, foot: 'right', countryCode: 'ITA', position: 'CAM',
      age: START_AGE,
      attrs: { pace: 40, shooting: 40, passing: 40, dribbling: 40, defending: 40, physical: 40, mental: 40, goalkeeping: 40 },
      gauges: { form: 60, fitness: 88, morale: 70, coachTrust: 42, fanLove: 50, mediaRep: 0, lockerRoom: 18, fame: 3 },
      potential: 70, traits: [], injuries: [], matchesOut: 0, banMatches: 0, money: 0,
    },
    contract: null,
    season: null,
    stage: 'preseason',
    queue: [],
    card: null,
    resolution: null,
    seasonEvents: [],
    history: [],
    relationships: [],
    consequences: [],
    feed: [],
    trophies: [],
    awards: [],
    flags: {},
    usedEvents: [],
    clubsPlayed: [],
    retiredAt: null,
  }
}

export function setIdentity(state: CareerState, identity: Identity): CareerState {
  const rng = rngFor(state, 'identity')
  const player = createPlayer(identity, 1, rng)
  const offers = academyOffers({ ...state, player }, rng)
  const next: CareerState = {
    ...state,
    step: state.step + 1,
    phase: 'academy',
    player,
    relationships: [createAgent(identity.countryCode, START_AGE, rng), createJournalist(identity.countryCode, START_AGE, rng)],
    queue: [{ t: 'event', key: 'academy_choice', payload: { clubs: offers.map((o) => o.clubId).join(',') } }],
  }
  return pump(next)
}

// ─── RNG ────────────────────────────────────────────────────────────────────

function rngFor(state: CareerState, label: string): Rng {
  return new Rng(state.seed, label, state.step)
}

function ctxFor(state: CareerState, payload: Record<string, string | number> = {}): EventCtx {
  const club = findClub(state.season?.clubId ?? state.contract?.clubId ?? null)
  return {
    state,
    player: state.player,
    club,
    ovr: playerOvr(state.player),
    role: state.season?.role ?? 'reserve',
    rng: rngFor(state, 'event'),
    stage: state.stage,
    payload,
  }
}

// ─── Применение эффектов ────────────────────────────────────────────────────

export function applyEffects(state: CareerState, effects: Effect[]): CareerState {
  let next = state
  for (const effect of effects) {
    next = applyEffect(next, effect)
  }
  return next
}

function applyEffect(state: CareerState, effect: Effect): CareerState {
  const player = state.player
  switch (effect.t) {
    case 'attr':
      return {
        ...state,
        player: { ...player, attrs: { ...player.attrs, [effect.key]: clamp(player.attrs[effect.key] + effect.delta, 20, 99) } },
      }
    case 'gauge': {
      const bounds: [number, number] = effect.key === 'mediaRep' ? [-100, 100] : [0, 100]
      return {
        ...state,
        player: { ...player, gauges: { ...player.gauges, [effect.key]: clamp(player.gauges[effect.key] + effect.delta, bounds[0], bounds[1]) } },
      }
    }
    case 'money':
      return { ...state, player: { ...player, money: Math.max(0, player.money + effect.delta) } }
    case 'potential':
      return { ...state, player: { ...player, potential: clamp(player.potential + effect.delta, 40, 99) } }
    case 'injury': {
      const matches = injuryMatches(effect.kind, effect.severity)
      return {
        ...state,
        player: {
          ...player,
          matchesOut: player.matchesOut + matches,
          injuries: [...player.injuries, { age: player.age, kind: effect.kind, severity: effect.severity, matchesOut: matches }],
          gauges: { ...player.gauges, fitness: clamp(player.gauges.fitness - effect.severity * 8, 0, 100) },
        },
      }
    }
    case 'heal':
      // Лечение укорачивает уже назначенный срок, а не назначает новый: сама
      // травма случилась в матче, карточка решает только, как возвращаться.
      return { ...state, player: { ...player, matchesOut: Math.max(0, Math.round(player.matchesOut * effect.mult)) } }
    case 'suspend':
      return { ...state, player: { ...player, banMatches: player.banMatches + effect.matches } }
    case 'trait': {
      let traits = player.traits
      if (effect.add && !traits.includes(effect.add)) traits = [...traits, effect.add]
      if (effect.remove) traits = traits.filter((t) => t !== effect.remove)
      return { ...state, player: { ...player, traits } }
    }
    case 'flag':
      return { ...state, flags: { ...state.flags, [effect.key]: Math.max(0, (state.flags[effect.key] ?? 0) + effect.delta) } }
    case 'trophyOdds': {
      if (!state.season) return state
      const current = state.season.oddsMult[effect.comp] ?? 1
      return { ...state, season: { ...state.season, oddsMult: { ...state.season.oddsMult, [effect.comp]: current * effect.mult } } }
    }
    case 'minutes':
      return state.season ? { ...state, season: { ...state.season, minutesMult: clamp(state.season.minutesMult * effect.mult, 0.2, 1.6) } } : state
    case 'stat': {
      if (!state.season) return state
      return { ...state, season: { ...state.season, tally: { ...state.season.tally, [effect.key]: state.season.tally[effect.key] + effect.delta } } }
    }
    case 'relationship':
      return {
        ...state,
        relationships: state.relationships.map((r) =>
          r.role === effect.role ? { ...r, stance: clamp(r.stance + effect.delta, -100, 100) } : r,
        ),
      }
    case 'schedule':
      return {
        ...state,
        consequences: [...state.consequences, { ...effect.consequence, dueAge: player.age + effect.consequence.inSeasons }],
      }
    case 'nationality':
      return { ...state, player: { ...player, countryCode: effect.code } }
    case 'position':
      return { ...state, player: { ...player, position: effect.position } }
    case 'retire':
      return { ...state, phase: 'retired', retiredAt: player.age, card: null, queue: [] }
    case 'objective':
      // Задача меняется на месте: и в панели игрока, и в отчёте, и в проверке
      // теперь одно и то же число.
      return state.contract?.objective
        ? {
            ...state,
            contract: { ...state.contract, objective: adjustObjective(state.contract.objective, effect.direction) },
          }
        : state
    case 'wage':
      // Меняем сам контракт, а не разовую выплату: иначе урезанная зарплата
      // не видна ни в панели игрока, ни в следующих начислениях.
      return state.contract
        ? { ...state, contract: { ...state.contract, wage: Math.round(state.contract.wage * effect.mult) } }
        : state
    case 'release':
      // Контракт расторгнут: сезон здесь не трогаем — он уже закрыт и записан
      // в историю, а новый соберётся в startSeason уже без клуба.
      return { ...state, contract: null, flags: { ...state.flags, free_agent: 1 } }
    case 'transfer':
      return joinClub(state, effect)
  }
}

function joinClub(state: CareerState, effect: Extract<Effect, { t: 'transfer' }>): CareerState {
  const club = getClub(effect.clubId)
  const rng = rngFor(state, `join:${club.id}`)
  const isSameClub = state.contract?.clubId === club.id
  // Аренда из аренды: родительский клуб остаётся тем же. Брать клуб текущего
  // контракта нельзя — у арендованного игрока он сам арендный, и вторая аренда
  // «переподчиняла» игрока первому арендатору: по её итогам он возвращался не
  // туда, откуда уехал.
  const currentParent = state.contract?.isLoan ? state.contract.parentClubId : state.contract?.clubId
  const parentClubId = effect.loan
    ? currentParent ?? state.clubsPlayed[state.clubsPlayed.length - 1] ?? null
    : null

  let next: CareerState = {
    ...state,
    contract: {
      clubId: club.id,
      yearsLeft: effect.years ?? 3,
      wage: effect.wage ?? 0,
      isLoan: effect.loan,
      parentClubId,
      objective: null,
    },
    clubsPlayed: state.clubsPlayed.includes(club.id) ? state.clubsPlayed : [...state.clubsPlayed, club.id],
  }

  if (!isSameClub) {
    next = {
      ...next,
      relationships: relocate(next.relationships, club, next.player.position, playerOvr(next.player), next.player.age, rng),
    }
    const manager = find(next.relationships, 'manager')
    if (manager) {
      const fit = styleFit((manager.meta?.style as ManagerStyle) ?? 'possession', next.player.position)
      next = applyEffect(next, { t: 'gauge', key: 'coachTrust', delta: fit })
    }
    // Приход в новый клуб: авторитет в раздевалке начинается заново.
    next = applyEffect(next, { t: 'gauge', key: 'lockerRoom', delta: -Math.round(next.player.gauges.lockerRoom * 0.6) })
    if (next.season) {
      // Переход посреди сезона: роль в новом составе считаем сразу, иначе
      // подписавшийся в январе играл бы весну по старой роли.
      const role = determineRole({
        player: next.player,
        club,
        rivalPressure: rivalPressureFor(next),
      })
      next = { ...next, season: { ...next.season, clubId: club.id, loan: effect.loan, parentClubId, role } }
    }
  }
  return next
}

// ─── Сезон ──────────────────────────────────────────────────────────────────

function emptyTally() {
  return {
    apps: 0, goals: 0, assists: 0, cleanSheets: 0, goalsConceded: 0,
    ratingSum: 0, ratingCount: 0, yellow: 0, red: 0,
  }
}

function emptyNational(): NationalTally {
  return { caps: 0, goals: 0, cleanSheets: 0, goalsConceded: 0, tournament: null, trophy: null }
}

/**
 * Начинает сезон. Клуба может не быть: игрок остался свободным агентом —
 * тогда сезон всё равно идёт (возраст, спад формы), но без матчей и задач.
 */
function startSeason(state: CareerState): CareerState {
  const clubId = state.contract?.clubId ?? null
  const club = findClub(clubId)
  const rng = rngFor(state, 'season')
  const role: Role = club
    ? determineRole({ player: state.player, club, rivalPressure: rivalPressureFor(state) })
    : 'reserve'
  const objective = club
    ? makeObjective(state.player.position, role, club.tier, playerOvr(state.player))
    : null

  return {
    ...state,
    season: {
      age: state.player.age,
      clubId,
      loan: state.contract?.isLoan ?? false,
      parentClubId: state.contract?.parentClubId ?? null,
      ovrStart: playerOvr(state.player),
      role,
      tally: emptyTally(),
      national: emptyNational(),
      trophies: [],
      awards: [],
      oddsMult: {},
      blocksPlayed: 0,
      minutesMult: rng.around(1, 0.05),
    },
    contract: state.contract ? { ...state.contract, objective } : null,
    seasonEvents: [],
    stage: 'preseason',
    queue: [],
    flags: {
      ...state.flags,
      // Желание уйти живёт одно окно: новый сезон — новая расстановка.
      wants_out: 0,
      free_agent_soon: 0,
    },
  }
}

function rivalPressureFor(state: CareerState): number {
  const rival = find(state.relationships, 'rival')
  if (!rival) return 0
  const level = Number(rival.meta?.level ?? 0)
  if (!level) return 0
  return clamp(0.9 + (level - playerOvr(state.player)) * 0.09, 0, 2)
}

// ─── Наполнение этапов битами ───────────────────────────────────────────────

/** Этапы, на которых вообще бывают случайные ситуации. */
type PacedStage = Exclude<Stage, 'review'>

/**
 * Сколько случайных ситуаций даёт каждый этап при выбранной насыщенности:
 * пара «шанс — метка потока RNG». Шанс 1 означает «обязательно», и тогда
 * бросок не делается вовсе — метка у такого слота не используется.
 *
 * 'busy' повторяет баланс, который был до появления выбора: у его слотов те же
 * метки, что и у прежних бросков, поэтому старые карьеры по тому же сиду
 * разыгрываются ровно так же.
 */
const PACE: Record<Pace, Record<PacedStage, Array<[number, string]>>> = {
  calm: {
    preseason: [[0.5, 'pre_main']],
    autumn: [[0.7, 'aut_main']],
    winter: [[0.35, 'win_main']],
    spring: [[0.7, 'spr_main']],
    run_in: [[0.2, 'run_in_extra']],
  },
  normal: {
    preseason: [[1, '']],
    autumn: [[1, '']],
    winter: [[0.6, 'win_main']],
    spring: [[1, '']],
    run_in: [[0.35, 'run_in_extra']],
  },
  busy: {
    preseason: [[1, '']],
    autumn: [[1, ''], [0.3, 'aut_extra']],
    winter: [[1, ''], [0.3, 'win_extra']],
    spring: [[1, '']],
    run_in: [[0.6, 'run_in_extra']],
  },
}

function randomBeats(state: CareerState, stage: PacedStage): Beat[] {
  const beats: Beat[] = []
  for (const [chance, label] of PACE[state.pace][stage]) {
    if (chance >= 1 || rngFor(state, label).chance(chance)) beats.push({ t: 'random' })
  }
  return beats
}

function dueConsequences(state: CareerState, stage: Stage): Beat[] {
  return state.consequences
    .filter((c) => c.dueAge <= state.player.age && c.stage === stage)
    .map((c) => ({ t: 'event' as const, key: c.eventKey, payload: c.payload }))
}

function dropConsequences(state: CareerState, stage: Stage): CareerState {
  return {
    ...state,
    consequences: state.consequences.filter((c) => !(c.dueAge <= state.player.age && c.stage === stage)),
  }
}

function enterStage(state: CareerState, stage: Stage): CareerState {
  let next: CareerState = { ...state, stage }
  const beats: Beat[] = [...dueConsequences(next, stage)]
  next = dropConsequences(next, stage)

  // Год без клуба идёт по своему, короткому сценарию: почти все обычные
  // ситуации требуют клуба и без него читались бы бессмысленно.
  if (next.contract === null) return { ...next, queue: freeAgentBeats(beats, stage) }

  switch (stage) {
    case 'preseason': {
      // Разговор с тренером открывает сезон: сначала новый тренер, если он
      // сменился, потом задача — и только затем всё остальное, включая
      // отложенные последствия прошлых сезонов.
      const opening: Beat[] = []
      if ((next.flags.manager_changed ?? 0) > 0) {
        opening.push({ t: 'event', key: 'new_manager' })
        next = { ...next, flags: { ...next.flags, manager_changed: 0 } }
      }
      const objective = next.contract?.objective
      if (objective) {
        opening.push({ t: 'event', key: 'season_objective', payload: { kind: objective.kind, target: objective.target } })
      }
      beats.unshift(...opening)
      beats.push(...randomBeats(next, 'preseason'))
      break
    }
    case 'autumn': {
      if ((next.flags.national_established ?? 0) === 0 && shouldCallUp(next)) {
        beats.push({ t: 'event', key: 'first_call_up' })
      }
      beats.push(...randomBeats(next, 'autumn'))
      beats.push({ t: 'sim' })
      break
    }
    case 'winter': {
      beats.push(...randomBeats(next, 'winter'))
      break
    }
    case 'spring': {
      beats.push(...randomBeats(next, 'spring'))
      beats.push({ t: 'sim' })
      break
    }
    case 'run_in': {
      // Концовку сезона оставляем разреженной: на неё и так приходятся отчёт
      // о блоке и вся трансферная развязка.
      beats.push(...randomBeats(next, 'run_in'))
      break
    }
    case 'review': {
      const country = getCountry(next.player.countryCode)
      const tournament = tournamentThisSeason(seasonEndYear(next), country.confederation)
      if (tournament && (next.flags.national_established ?? 0) > 0 && (next.flags.national_retired ?? 0) === 0) {
        const id = tournament === 'world' ? 'world_cup' : NATIONAL_TOURNAMENT[country.confederation]
        // Решающий момент турнира вратарь переживает с другой стороны точки.
        const key = next.player.position === 'GK' ? 'tournament_moment_gk' : 'tournament_moment'
        beats.push({ t: 'event', key, payload: { tournament: id } })
      }
      beats.push({ t: 'season_end' })
      beats.push({ t: 'market' })
      break
    }
  }
  return { ...next, queue: beats }
}

function freeAgentBeats(beats: Beat[], stage: Stage): Beat[] {
  switch (stage) {
    case 'preseason': return [...beats, { t: 'event', key: 'free_agent_year' }]
    case 'autumn': return [...beats, { t: 'sim' }]
    case 'winter': return [...beats, { t: 'event', key: 'trial_offer' }]
    case 'spring': return [...beats, { t: 'sim' }]
    case 'run_in': return beats
    case 'review': return [...beats, { t: 'season_end' }, { t: 'market' }]
  }
}

function shouldCallUp(state: CareerState): boolean {
  if (state.contract === null) return false
  const country = getCountry(state.player.countryCode)
  const p = callUpChance({
    ovr: playerOvr(state.player),
    countryStrength: country.strength,
    age: state.player.age,
    form: state.player.gauges.form,
    established: false,
  })
  return rngFor(state, 'callup').chance(p)
}

// ─── Насос: превращаем биты в карточки ──────────────────────────────────────

export function pump(state: CareerState): CareerState {
  let next = state
  let guard = 0
  while (next.card === null && next.resolution === null && next.phase !== 'retired' && guard < 64) {
    guard++
    if (next.queue.length === 0) {
      next = nextStage(next)
      continue
    }
    const [beat, ...rest] = next.queue
    next = { ...next, queue: rest, step: next.step + 1 }
    next = openBeat(next, beat)
  }
  return next
}

function nextStage(state: CareerState): CareerState {
  if (state.phase === 'academy' || state.phase === 'identity') return state
  const index = STAGES.indexOf(state.stage)
  if (index < STAGES.length - 1) {
    return enterStage(state, STAGES[index + 1])
  }
  // Страховка: этапы кончились, а рынок так и не начал новый сезон. Стартуем
  // следующий только если предыдущий действительно закрыт — иначе зациклимся.
  const closed = !state.season || state.season.age < state.player.age
  return closed ? startNextSeason(state) : { ...state, phase: 'retired', retiredAt: state.player.age }
}

function openBeat(state: CareerState, beat: Beat): CareerState {
  switch (beat.t) {
    case 'event': {
      const def = getEvent(beat.key)
      const ctx = ctxFor(state, beat.payload ?? {})
      if (def.when && !def.when(ctx) && def.weight > 0) return state
      const card = buildCard(def, ctx)
      if (card.options.length === 0) return state
      return {
        ...state,
        card,
        seasonEvents: [...state.seasonEvents, def.key],
        usedEvents: def.once && !state.usedEvents.includes(def.key) ? [...state.usedEvents, def.key] : state.usedEvents,
      }
    }
    case 'random': {
      const ctx = ctxFor(state)
      const def = pickEvent(ctx, { stage: state.stage, exclude: state.seasonEvents })
      if (!def) return state
      return openBeat(state, { t: 'event', key: def.key })
    }
    case 'sim':
      return runBlock(state)
    case 'season_end':
      return finishSeason(state)
    case 'market':
      return openMarket(state)
  }
}

// ─── Игровой блок ───────────────────────────────────────────────────────────

function runBlock(state: CareerState): CareerState {
  const season = state.season
  if (!season) return state
  const club = findClub(season.clubId)
  if (!club) return runIdleBlock(state, season)

  const rng = rngFor(state, `block:${season.blocksPlayed}`)
  // Травма и дисквалификация теперь выбивают матчи, а не полусезон целиком:
  // сколько именно, решает сама симуляция, проходя по календарю.
  const injured = state.player.matchesOut > 0
  const banned = state.player.banMatches > 0
  const result = simulateBlock(
    {
      player: state.player,
      club,
      role: season.role,
      minutesMult: season.minutesMult,
      matchesOut: state.player.matchesOut,
      banMatches: state.player.banMatches,
    },
    rng,
  )

  const tally = {
    apps: season.tally.apps + result.apps,
    goals: season.tally.goals + result.goals,
    assists: season.tally.assists + result.assists,
    cleanSheets: season.tally.cleanSheets + result.cleanSheets,
    goalsConceded: season.tally.goalsConceded + result.goalsConceded,
    ratingSum: season.tally.ratingSum + result.ratingSum,
    ratingCount: season.tally.ratingCount + result.ratingCount,
    yellow: season.tally.yellow + result.yellow,
    red: season.tally.red + result.red,
  }

  let next: CareerState = {
    ...state,
    season: { ...season, tally, blocksPlayed: season.blocksPlayed + 1 },
    player: {
      ...state.player,
      matchesOut: result.matchesOutLeft,
      banMatches: result.banMatchesLeft,
      // Повреждение, полученное в матче, уже стоило игроку пропусков внутри
      // отрезка — в историю оно попадает здесь, а не через эффект карточки.
      injuries: result.injury
        ? [...state.player.injuries, {
          age: state.player.age,
          kind: result.injury.kind,
          severity: result.injury.severity,
          matchesOut: injuryMatches(result.injury.kind, result.injury.severity),
        }]
        : state.player.injuries,
    },
  }
  if (result.injury) {
    next = applyEffect(next, { t: 'gauge', key: 'fitness', delta: -result.injury.severity * 8 })
  }
  next = applyEffects(next, [
    { t: 'gauge', key: 'fitness', delta: result.fitnessDelta },
    { t: 'gauge', key: 'form', delta: result.formDelta },
    { t: 'gauge', key: 'coachTrust', delta: result.trustDelta },
    { t: 'gauge', key: 'fanLove', delta: result.fanDelta },
    { t: 'gauge', key: 'fame', delta: round((result.goals + result.assists) * 0.35 + (club.tier - 3) * 0.5, 1) },
  ])

  // Роль пересчитывается по ходу сезона: провалил блок — потерял место.
  const role = determineRole({ player: next.player, club, rivalPressure: rivalPressureFor(next) })
  next = { ...next, season: { ...next.season!, role } }

  const rating = averageRating(result.ratingSum, result.ratingCount)
  const card: Card = {
    id: `block@${state.player.age}:${season.blocksPlayed}`,
    kind: 'report',
    stage: state.stage,
    eventKey: 'block_report',
    channel: 'match',
    title: { key: 'report.block.title', params: { club: club.name } },
    // У вратаря голы и передачи всегда нули: отрезок описывают сухие матчи и
    // пропущенные — те же цифры, что и в отчёте о сезоне.
    body: isGoalkeeper(state.player.position)
      ? {
        key: 'report.block.body_gk',
        params: {
          apps: result.apps,
          clean: result.cleanSheets,
          conceded: result.goalsConceded,
          rating: rating || 0,
        },
      }
      : {
        key: 'report.block.body',
        params: { apps: result.apps, goals: result.goals, assists: result.assists, rating: rating || 0 },
      },
    options: [],
    details: blockDetails(result, injured, banned),
  }
  // Серьёзное повреждение — это ещё и решение, как возвращаться. Лёгкое
  // проходит строкой в отчёте: карточка на каждый ушиб только утомляла бы.
  const queue: Beat[] = result.injury && result.injury.severity >= 2
    ? [{ t: 'event', key: 'injury_hit', payload: { kind: result.injury.kind, severity: result.injury.severity } }, ...next.queue]
    : next.queue
  return { ...next, card, queue }
}

/** Отрезок без клуба: матчей нет, форма тает, о вас забывают. */
function runIdleBlock(state: CareerState, season: NonNullable<CareerState['season']>): CareerState {
  let next: CareerState = {
    ...state,
    season: { ...season, blocksPlayed: season.blocksPlayed + 1 },
    // Срок дисквалификации течёт и без клуба — иначе бан стал бы вечным.
    // Без клуба матчей нет, но сроки идут: лечиться и отбывать бан можно и
    // свободным агентом, иначе они стали бы вечными.
    player: {
      ...state.player,
      matchesOut: Math.max(0, state.player.matchesOut - BLOCK_MATCHES),
      banMatches: Math.max(0, state.player.banMatches - BLOCK_MATCHES),
    },
  }
  next = applyEffects(next, [
    { t: 'gauge', key: 'form', delta: -9 },
    { t: 'gauge', key: 'fitness', delta: 5 },
    { t: 'gauge', key: 'fame', delta: -3 },
    { t: 'gauge', key: 'morale', delta: -5 },
  ])
  const card: Card = {
    id: `idle@${state.player.age}:${season.blocksPlayed}`,
    kind: 'report',
    stage: state.stage,
    eventKey: 'idle_report',
    channel: 'life',
    title: { key: 'report.idle.title' },
    body: { key: 'report.idle.body' },
    options: [],
    details: [{ key: 'report.idle.detail' }],
  }
  return { ...next, card }
}

function blockDetails(result: ReturnType<typeof simulateBlock>, injured: boolean, banned: boolean): Text[] {
  const lines: Text[] = []
  if (banned) lines.push({ key: 'report.block.suspended' })
  else if (injured) lines.push({ key: 'report.block.missed' })
  if (result.injury) {
    lines.push({
      key: 'report.block.injury',
      params: {
        kind: { key: `injury.${result.injury.kind}` },
        matches: injuryMatches(result.injury.kind, result.injury.severity),
      },
    })
  }
  if (result.apps === 0) lines.push({ key: 'report.block.no_minutes' })
  if (result.red > 0) lines.push({ key: 'report.block.red', params: { n: result.red } })
  if (result.yellow >= 5) lines.push({ key: 'report.block.cards', params: { n: result.yellow } })
  if (result.formDelta <= -8) lines.push({ key: 'report.block.form_drop' })
  if (result.fitnessDelta <= -12) lines.push({ key: 'report.block.tired' })
  return lines
}

// ─── Конец сезона ───────────────────────────────────────────────────────────

function finishSeason(state: CareerState): CareerState {
  const season = state.season
  if (!season) return state
  const club = findClub(season.clubId)

  const rng = rngFor(state, 'season_end')
  // Год без клуба тоже надо закрыть: иначе игрок не стареет и карьера зависает.
  if (!club) return finishIdleSeason(state, season)
  const wonContinentalBefore = state.history.some(
    (h) => h.age === state.player.age - 1 && h.trophies.some((t) => t === 'ucl' || t === 'libertadores' || t === 'afc_elite' || t === 'caf_cl'),
  )
  const trophies = rollClubTrophies(club, season, season.role, wonContinentalBefore, rng)
  const national = simulateNational(state, rng)
  const withResults = { ...season, trophies, national }
  const awards = rollAwards(state.player, club, withResults, rng)
  const leaguePos = rollLeaguePosition(
    club,
    trophies.includes(club.leagueId),
    leagueLift(withResults, season.role),
    rng,
  )

  const objective = state.contract?.objective ?? null
  const objectiveMet = objective ? checkObjective(objective, withResults) : null

  let next: CareerState = { ...state, season: { ...withResults, awards } }

  if (objective && objectiveMet !== null) {
    const delta = objectiveMet ? objective.reward : -objective.penalty
    next = applyEffects(next, [{ t: 'gauge', key: 'coachTrust', delta }, { t: 'gauge', key: 'morale', delta: delta / 2 }])
    if (objectiveMet) next = applyEffects(next, [{ t: 'money', delta: Math.round((next.contract?.wage ?? 0) * 0.25) }])
  }

  // Зарплата и призовые.
  const prize = trophies.length * Math.round((next.contract?.wage ?? 0) * 0.15)
  next = applyEffects(next, [{ t: 'money', delta: (next.contract?.wage ?? 0) + prize }])
  next = applyEffects(next, awards.map((key) => ({ t: 'gauge' as const, key: 'fame' as const, delta: key === 'ballon_dor' ? 25 : 10 })))

  const record: SeasonRecord = {
    age: season.age,
    clubId: season.clubId,
    loan: season.loan,
    parentClubId: season.parentClubId,
    ovrStart: season.ovrStart,
    ovrEnd: 0, // заполняется после развития
    role: season.role,
    tally: withResults.tally,
    national,
    trophies,
    awards,
    objective,
    objectiveMet,
    leaguePos,
  }

  // Развитие, возраст и срок контракта.
  next = develop(next)
  if (next.contract) {
    next = { ...next, contract: { ...next.contract, yearsLeft: Math.max(0, next.contract.yearsLeft - 1) } }
  }
  const ovrEnd = playerOvr(next.player)

  next = {
    ...next,
    history: [...next.history, { ...record, ovrEnd }],
    trophies: [
      ...next.trophies,
      ...trophies.map((name) => ({ age: season.age, comp: 'league' as const, name })),
      ...(national.trophy ? [{ age: season.age, comp: 'national' as const, name: national.trophy }] : []),
    ],
    awards: [...next.awards, ...awards.map((key) => ({ age: season.age, key }))],
  }

  const card: Card = {
    id: `season@${season.age}`,
    kind: 'report',
    stage: 'review',
    eventKey: 'season_report',
    channel: 'board',
    title: { key: 'report.season.title', params: { age: season.age, club: club.name } },
    // У вратаря голы и передачи всегда нули: строка о них ничего не говорит,
    // а его собственные цифры уезжали в отдельную строку ниже.
    body: {
      key: state.player.position === 'GK' ? 'report.season.body_gk' : 'report.season.body',
      params: {
        apps: withResults.tally.apps,
        goals: withResults.tally.goals,
        assists: withResults.tally.assists,
        clean: withResults.tally.cleanSheets,
        conceded: withResults.tally.goalsConceded,
        rating: averageRating(withResults.tally.ratingSum, withResults.tally.ratingCount) || 0,
        ovr: ovrEnd,
        delta: ovrEnd - season.ovrStart,
      },
    },
    options: [],
    details: seasonDetails(
      trophies, awards, national, objective, objectiveMet, leaguePos, club.leagueId,
      state.player.position === 'GK',
    ),
  }
  return { ...next, card }
}

/** Закрывает сезон без клуба: ни трофеев, ни задач, только возраст и спад. */
function finishIdleSeason(state: CareerState, season: NonNullable<CareerState['season']>): CareerState {
  const record: SeasonRecord = {
    age: season.age,
    clubId: null,
    loan: false,
    parentClubId: null,
    ovrStart: season.ovrStart,
    ovrEnd: 0,
    role: 'reserve',
    tally: season.tally,
    national: emptyNational(),
    trophies: [],
    awards: [],
    objective: null,
    objectiveMet: null,
    leaguePos: null,
  }

  let next = develop(state)
  const ovrEnd = playerOvr(next.player)
  next = { ...next, history: [...next.history, { ...record, ovrEnd }] }

  const card: Card = {
    id: `season@${season.age}`,
    kind: 'report',
    stage: 'review',
    eventKey: 'season_report',
    channel: 'life',
    title: { key: 'report.idle_season.title', params: { age: season.age } },
    body: { key: 'report.idle_season.body', params: { ovr: ovrEnd, delta: ovrEnd - season.ovrStart } },
    options: [],
    details: [{ key: 'report.idle_season.detail' }],
  }
  return { ...next, card }
}

function seasonDetails(
  trophies: string[],
  awards: string[],
  national: NationalTally,
  objective: SeasonRecord['objective'],
  objectiveMet: boolean | null,
  leaguePos: number,
  leagueId: string,
  keeper: boolean,
): Text[] {
  const lines: Text[] = []
  lines.push({
    key: 'report.season.league_pos',
    params: { pos: leaguePos, league: getLeague(leagueId).name },
  })
  for (const t of trophies) lines.push({ key: 'report.season.trophy', params: { comp: { key: `comp.${t}` } } })
  for (const a of awards) lines.push({ key: 'report.season.award', params: { award: { key: `award.${a}` } } })
  if (national.caps > 0) {
    lines.push({
      key: keeper ? 'report.season.national_gk' : 'report.season.national',
      params: {
        caps: national.caps,
        goals: national.goals,
        clean: national.cleanSheets,
        conceded: national.goalsConceded,
      },
    })
  }
  if (national.trophy) {
    lines.push({ key: 'report.season.national_trophy', params: { comp: { key: `comp.${national.trophy}` } } })
  }
  if (objective && objectiveMet !== null) {
    lines.push({
      key: objectiveMet ? 'report.season.objective_met' : 'report.season.objective_failed',
      params: { kind: { key: `objective.${objective.kind}` }, target: objective.target },
    })
  }
  if (trophies.length === 0 && awards.length === 0) lines.push({ key: 'report.season.empty' })
  return lines
}

/**
 * Проверка задачи сравнивает с той же целью, которая записана в контракте и
 * показана игроку. Раньше цель домножалась здесь на скрытый коэффициент, и
 * отчёт печатал «провалена» при выполненной с виду задаче.
 */
export function checkObjective(
  objective: NonNullable<SeasonRecord['objective']>,
  season: CareerState['season'],
): boolean {
  if (!season) return false
  const target = objective.target
  switch (objective.kind) {
    case 'apps': return season.tally.apps >= target
    case 'goals': return season.tally.goals >= target
    case 'assists': return season.tally.assists >= target
    case 'rating': return averageRating(season.tally.ratingSum, season.tally.ratingCount) >= target
    case 'trophy': return season.trophies.length > 0
  }
}

function simulateNational(state: CareerState, rng: Rng): NationalTally {
  // Без клуба в сборную не вызывают.
  if (state.contract === null) return emptyNational()
  if ((state.flags.national_retired ?? 0) > 0 || (state.flags.national_blacklist ?? 0) > 0) return emptyNational()
  const country = getCountry(state.player.countryCode)
  const established = (state.flags.national_established ?? 0) > 0
  if (!established) return emptyNational()

  const p = callUpChance({
    ovr: playerOvr(state.player),
    countryStrength: country.strength,
    age: state.player.age,
    form: state.player.gauges.form,
    established: true,
  })
  if (!rng.chance(p)) return emptyNational()

  const caps = rng.int(4, 10)
  const goals = state.player.position === 'GK' ? 0 : Math.max(0, Math.round(caps * (playerOvr(state.player) - 60) * 0.008 * rng.around(1, 0.5)))
  const kind = tournamentThisSeason(seasonEndYear(state), country.confederation)

  // Вратарские матчи за сборную считаются той же связкой, что и клубные:
  // раньше их не считали вовсе, и у вратаря сборная всегда стояла без
  // пропущенных. Броски идут последними, чтобы не сдвигать остальную лотерею.
  const withKeeper = (tally: NationalTally): NationalTally =>
    state.player.position === 'GK'
      ? { ...tally, ...keeperRun(tally.caps, nationalCleanRate(country.strength, playerOvr(state.player)), rng) }
      : tally

  if (!kind) return withKeeper({ caps, goals, cleanSheets: 0, goalsConceded: 0, tournament: null, trophy: null })

  const id = kind === 'world' ? 'world_cup' : NATIONAL_TOURNAMENT[country.confederation]
  const reach = clamp(country.tournamentReach / 5, 0.2, 1)
  const won = rng.chance(nationalTrophyChance(country.strength, kind) * (0.6 + reach))
  return withKeeper({
    caps: caps + rng.int(3, 7),
    goals,
    cleanSheets: 0,
    goalsConceded: 0,
    tournament: id,
    trophy: won ? id : null,
  })
}

/**
 * Доля сухих матчей за сборную. У клуба её задаёт тир, здесь — сила сборной по
 * той же шкале влияния: разница между грандом и середняком примерно та же.
 */
function nationalCleanRate(strength: number, ovr: number): number {
  return clamp(0.14 + (strength - 2) * 0.05 + (ovr - 60) * 0.004, 0.02, 0.6)
}

// ─── Развитие ───────────────────────────────────────────────────────────────

function growthFactor(state: CareerState): number {
  const season = state.season
  const club = findClub(season?.clubId ?? null)
  // Без клуба навыки почти не растут: тренировок в одиночку недостаточно.
  if (!season || !club) {
    return 0.2 * clamp((state.player.potential - playerOvr(state.player)) / 12, 0.08, 1.3)
  }
  const league = getLeague(club.leagueId)
  const minutesRatio = clamp(season.tally.apps / (BLOCK_MATCHES * 2), 0, 1)
  const headroom = clamp((state.player.potential - playerOvr(state.player)) / 12, 0.08, 1.3)
  let factor = (0.35 + 0.65 * minutesRatio) * (0.85 + league.strength * 0.05) * headroom
  if (state.player.traits.includes('grinder')) factor *= 1.08
  if (state.player.traits.includes('educated')) factor *= 1.04
  if (state.player.gauges.morale < 35) factor *= 0.85
  return factor
}

function develop(state: CareerState): CareerState {
  const rng = rngFor(state, 'develop')
  const factor = growthFactor(state)
  const minutesRatio = clamp((state.season?.tally.apps ?? 0) / (BLOCK_MATCHES * 2), 0, 1)
  const attrs: Attributes = { ...state.player.attrs }
  const gk = isGoalkeeper(state.player.position)

  for (const key of ATTR_KEYS) {
    if (key === 'goalkeeping' && !gk) continue
    const [min, max] = attrAgeBand(key, state.player.age)
    const raw = rng.around((min + max) / 2, Math.max(0.5, (max - min) / 2))
    let delta = raw >= 0
      ? raw * factor
      // Спад не лечится игровым временем: играешь много — просто теряешь ровнее.
      : raw * (1.15 - minutesRatio * 0.3)
    if (key === 'mental' && state.player.traits.includes('veteran_brain') && delta < 0) delta *= 0.4
    attrs[key] = clamp(attrs[key] + delta, 20, 99)
  }

  const player: Player = {
    ...state.player,
    age: state.player.age + 1,
    attrs,
    // Межсезонье лечит, но лето короче полусезона: остаток тяжёлой травмы
    // честно переносится на следующий сезон, а не обнуляется.
    // Дисквалификация здесь не трогается — её отбывают матчами, а не летом.
    matchesOut: Math.max(0, state.player.matchesOut - SUMMER_RECOVERY),
    gauges: {
      ...state.player.gauges,
      fitness: clamp(state.player.gauges.fitness + 26 + (state.player.traits.includes('pro_diet') ? 6 : 0), 0, 100),
      form: clamp(state.player.gauges.form * 0.7 + 60 * 0.3, 0, 100),
      morale: clamp(state.player.gauges.morale * 0.8 + MORALE_LEVEL * 0.2, 0, 100),
    },
  }
  return { ...state, player }
}

// ─── Трансферное решение и выход на пенсию ──────────────────────────────────

function openMarket(state: CareerState): CareerState {
  if (state.player.age > MAX_AGE) {
    return { ...state, phase: 'retired', retiredAt: state.player.age, card: null, queue: [] }
  }
  const rng = rngFor(state, 'market')
  const wasLoan = state.contract?.isLoan ?? false
  const offers = generateOffers(state, rng, { count: 2, allowLoans: state.player.age <= 22 })

  // Истёкший контракт продлевают не всегда: не тянешь на основу, потерял
  // тренера или трибуны — клуб просто не предлагает новый.
  const expired = state.contract !== null && state.contract.yearsLeft <= 0
  const lastRole = state.history[state.history.length - 1]?.role ?? 'reserve'
  const dropped = expired && !wasLoan && !clubWantsToRenew(state, playerOvr(state.player), lastRole)

  let key: string | null = 'market_decision'
  if (wasLoan) key = 'loan_return'
  else if (dropped) key = 'contract_expired'
  else if (offers.length === 0) key = 'no_offers'
  else if (state.player.age >= 34 && rng.chance(0.5)) key = 'retirement_thoughts'
  else if (!marketIsOpen(state, rng)) key = null

  // Спокойное лето: контракт в силе, никто никуда не рвётся — просто новый сезон.
  if (key === null) return startNextSeason(state)

  const def = getEvent(key)
  const ctx = ctxFor(state)
  const card = buildCard(def, ctx)
  if (card.options.length === 0) {
    return { ...state, phase: 'retired', retiredAt: state.player.age }
  }
  return { ...state, card, stage: 'review' }
}

/**
 * Трансферное окно открывается не каждое лето. Иначе игрок меняет клуб
 * каждый сезон, и карьера превращается в список городов.
 */
function marketIsOpen(state: CareerState, rng: Rng): boolean {
  if ((state.contract?.yearsLeft ?? 0) <= 0) return true
  if ((state.flags.wants_out ?? 0) > 0) return true
  if ((state.flags.free_agent_soon ?? 0) > 0) return true
  const last = state.history[state.history.length - 1]
  if (last && last.ovrEnd - last.ovrStart >= 5) return true
  return rng.chance(0.18)
}

function startNextSeason(state: CareerState): CareerState {
  return enterStage(maybeSackManager(startSeason(state)), 'preseason')
}

// ─── Публичные переходы ─────────────────────────────────────────────────────

export function choose(state: CareerState, optionId: string): CareerState {
  const card = state.card
  if (!card) return state

  if (card.kind === 'report') {
    return pump(afterCard({ ...state, card: null }))
  }

  // Недоступный вариант интерфейс не даёт нажать, но состояние обязано быть
  // защищено и от чужого вызова: иначе игрок заплатил бы несуществующими
  // деньгами.
  if (card.options.some((o) => o.id === optionId && o.disabled)) return state

  const def = getEvent(card.eventKey)
  const payloadFromCard = payloadOf(card)
  const ctx = ctxFor({ ...state, step: state.step + 1 }, payloadFromCard)
  const resolution = resolveCard(def, ctx, optionId)

  let next: CareerState = { ...state, step: state.step + 1, card: null }
  next = applyEffects(next, resolution.effects)
  next = { ...next, resolution }

  if (resolution.headline) {
    next = {
      ...next,
      feed: [
        ...next.feed,
        { age: next.player.age, stage: card.stage, text: resolution.headline, channel: card.channel, tone: 'neutral' },
      ],
    }
  }
  return next
}

/** Карточка помнит свой контекст: травма, турнир, список академий. */
function payloadOf(card: Card): Record<string, string | number> {
  return card.payload ?? {}
}

export function ack(state: CareerState): CareerState {
  if (!state.resolution) return pump(state)
  return pump(afterCard({ ...state, resolution: null }))
}

/** После закрытия карточки: если мы вышли из академии — начинаем первый сезон. */
function afterCard(state: CareerState): CareerState {
  if (state.phase === 'academy' && state.contract) {
    const withPhase: CareerState = { ...state, phase: 'season' }
    return enterStage(startSeason(withPhase), 'preseason')
  }
  // Рынок закрыт — начинаем следующий сезон. Контракта может и не быть:
  // свободный агент тоже проживает год.
  if (state.phase === 'season' && state.stage === 'review' && state.queue.length === 0) {
    if (state.season && state.season.age === state.player.age - 1) {
      return startNextSeason(state)
    }
  }
  return state
}

function maybeSackManager(state: CareerState): CareerState {
  const club = findClub(state.contract?.clubId ?? null)
  const manager = find(state.relationships, 'manager')
  if (!club || !manager) return state
  const last = state.history[state.history.length - 1]
  const rating = last ? averageRating(last.tally.ratingSum, last.tally.ratingCount) : 6.5
  const rng = rngFor(state, 'sack')
  if (!rng.chance(managerSackChance(club, last?.trophies.length ?? 0, rating))) return state
  return {
    ...state,
    relationships: [
      ...state.relationships.filter((r) => r.role !== 'manager'),
      createManager(club, state.player.age, rng),
    ],
    flags: { ...state.flags, manager_changed: 1 },
  }
}

// ─── Производные величины для интерфейса ────────────────────────────────────

export function currentValue(state: CareerState): number {
  return marketValue(playerOvr(state.player), state.player.age)
}

export function currentOvr(state: CareerState): number {
  return overall(state.player.attrs, state.player.position)
}

export interface SquadStanding {
  /** Уровень состава, с которым игрок конкурирует за место. */
  level: number
  /** Насколько игрок выше или ниже этого уровня. */
  gap: number
}

/**
 * Положение игрока относительно состава. Именно эта разница управляет ролью,
 * а через неё — минутами и всей статистикой, поэтому её стоит показывать
 * игроку: иначе непонятно, почему при том же OVR он то лидер, то запасной.
 * null — клуба нет, сравнивать не с чем.
 */
export function squadStanding(state: CareerState): SquadStanding | null {
  const club = findClub(state.season?.clubId ?? state.contract?.clubId ?? null)
  if (!club) return null
  const level = squadLevel(club.tier)
  return { level, gap: playerOvr(state.player) - level }
}

export function careerTotals(state: CareerState) {
  return state.history.reduce(
    (acc, s) => ({
      apps: acc.apps + s.tally.apps,
      goals: acc.goals + s.tally.goals,
      assists: acc.assists + s.tally.assists,
      cleanSheets: acc.cleanSheets + s.tally.cleanSheets,
      goalsConceded: acc.goalsConceded + s.tally.goalsConceded,
      caps: acc.caps + s.national.caps,
      nationalGoals: acc.nationalGoals + s.national.goals,
      nationalCleanSheets: acc.nationalCleanSheets + s.national.cleanSheets,
      nationalConceded: acc.nationalConceded + s.national.goalsConceded,
      // Турниры считаем по сезонам: за одно лето их больше одного не бывает.
      nationalTournaments: acc.nationalTournaments + (s.national.tournament ? 1 : 0),
      nationalTrophies: acc.nationalTrophies + (s.national.trophy ? 1 : 0),
      trophies: acc.trophies + s.trophies.length + (s.national.trophy ? 1 : 0),
      awards: acc.awards + s.awards.length,
    }),
    {
      apps: 0, goals: 0, assists: 0, cleanSheets: 0, goalsConceded: 0,
      caps: 0, nationalGoals: 0, nationalCleanSheets: 0, nationalConceded: 0,
      nationalTournaments: 0, nationalTrophies: 0, trophies: 0, awards: 0,
    },
  )
}
