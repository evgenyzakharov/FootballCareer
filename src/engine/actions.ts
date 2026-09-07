import type { Beat, CareerState, Club, EventChannel, RelationRole, Role, Stage } from './types'
import { findClub } from '../data/clubs'

/**
 * Инициатива игрока: разговоры, которые он заводит сам.
 *
 * Вся остальная игра приходит к игроку сама — тренер вызывает, агент звонит,
 * журналист ловит в коридоре. Из-за этого карьера читалась как поток, в
 * котором игрок только отвечает: сидеть в запасе можно было три сезона подряд
 * и ни разу не получить повода спросить, почему. Действие переворачивает ход —
 * игрок сам решает, когда начать разговор, и сам платит за то, что начал его
 * не вовремя.
 *
 * Действий ровно два, и оба — про людей: тренер решает, играете ли вы, агент
 * решает, где вы будете играть дальше. Поэтому и живут они не отдельной
 * полосой, а во вкладке «Люди», рядом с теми, с кем разговаривают: у каждого
 * действия есть роль собеседника (`role`), и интерфейс ставит кнопку к нему.
 *
 * Механически действие — тот же бит события, что и всё остальное, только
 * поставленный в начало очереди рукой игрока. Отдельного пути в движке у него
 * нет: карточка собирается, разыгрывается и ложится в ленту ровно так же, как
 * выпавшая по лотерее.
 *
 * Границы держат три вещи: этап (о месте в составе говорят по ходу сезона, а
 * не в межсезонье), счётчик за сезон (ходить к тренеру каждый тур нельзя) и
 * гейт самого действия (спрашивать, почему не играешь, имеет смысл тому, кто
 * не играет). Всё остальное — цена внутри самой ситуации.
 */

export interface ActionCtx {
  state: CareerState
  club: Club | null
  role: Role
}

export interface ActionDef {
  key: string
  /** Событие, которое действие открывает. */
  eventKey: string
  /** С кем разговор: по этой роли интерфейс ставит кнопку к нужному человеку. */
  role: RelationRole
  channel: EventChannel
  /** Этапы, на которых к действию вообще можно прибегнуть. */
  stages: Stage[]
  /** Сколько раз за сезон. */
  perSeason: number
  /**
   * Почему нельзя именно сейчас: ключ причины или null. Гейт обязан быть не
   * слабее гейта самого события — иначе бит потерялся бы в насосе (событие с
   * весом больше нуля он проверяет своим `when`), и кнопка не делала бы
   * ничего.
   */
  gate?: (c: ActionCtx) => string | null
}

/** Причина, по которой действие сейчас недоступно. Ключ текста: `action.reason.<...>`. */
export type ActionBlock = 'busy' | 'club' | 'stage' | 'used' | 'role' | 'age'

export interface ActionOffer {
  key: string
  /** С кем этот разговор. */
  role: RelationRole
  channel: EventChannel
  /** Сколько раз действие ещё доступно в этом сезоне. */
  left: number
  /** null — можно прямо сейчас. */
  reason: ActionBlock | null
}

/**
 * Префикс счётчиков использования. Счётчики живут в тех же `flags`, что и всё
 * остальное состояние, — отдельного поля им не нужно, а сохранения старых
 * карьер читаются без миграции: ненайденный флаг это ноль.
 */
const USE = 'act.'

const IN_SEASON: Stage[] = ['preseason', 'autumn', 'winter', 'spring', 'run_in']
const PLAYING: Stage[] = ['autumn', 'winter', 'spring', 'run_in']

export const ACTIONS: ActionDef[] = [
  {
    // Разговор с тренером о месте в составе. Ситуация уже была в лотерее —
    // действие даёт к ней доступ по своей воле, а не по броску.
    key: 'talk_manager',
    eventKey: 'squad_place_talk',
    role: 'manager',
    channel: 'locker',
    stages: PLAYING,
    perSeason: 1,
    gate: (c) => {
      if (c.state.player.age < 18) return 'age'
      // Спрашивать «почему я не играю» имеет смысл тому, кто не играет. Тот же
      // гейт стоит и у самой ситуации.
      if (c.role === 'star' || c.role === 'starter') return 'role'
      return null
    },
  },
  {
    key: 'ask_transfer',
    eventKey: 'agent_transfer_request',
    role: 'agent',
    channel: 'transfer',
    stages: IN_SEASON,
    perSeason: 1,
    gate: (c) => (c.state.player.age < 18 ? 'age' : null),
  },
]

const BY_KEY = new Map(ACTIONS.map((a) => [a.key, a]))
const BY_ROLE = new Map(ACTIONS.map((a) => [a.role, a]))

function ctxFor(state: CareerState): ActionCtx {
  return {
    state,
    club: findClub(state.season?.clubId ?? state.contract?.clubId ?? null),
    role: state.season?.role ?? 'reserve',
  }
}

function uses(state: CareerState, key: string): number {
  return state.flags[USE + key] ?? 0
}

function blockFor(state: CareerState, def: ActionDef): ActionBlock | null {
  // В академии собеседников ещё нет, а пока на экране висит решение,
  // инициатива подождёт: карточка, поставленная поверх неотвеченной, стёрла бы
  // вопрос, на который игрок ещё не ответил.
  if (state.phase !== 'season') return 'club'
  if (state.card?.kind === 'decision') return 'busy'
  const ctx = ctxFor(state)
  if (ctx.club === null) return 'club'
  if (!def.stages.includes(state.stage)) return 'stage'
  if (uses(state, def.key) >= def.perSeason) return 'used'
  return (def.gate?.(ctx) ?? null) as ActionBlock | null
}

function offerFor(state: CareerState, def: ActionDef): ActionOffer {
  return {
    key: def.key,
    role: def.role,
    channel: def.channel,
    left: Math.max(0, def.perSeason - uses(state, def.key)),
    reason: blockFor(state, def),
  }
}

/** Что игрок может начать сам прямо сейчас — и почему не может остального. */
export function listActions(state: CareerState): ActionOffer[] {
  return ACTIONS.map((def) => offerFor(state, def))
}

/** Разговор, который заводят с этим человеком. null — с ним говорить не о чем. */
export function actionForRole(state: CareerState, role: RelationRole): ActionOffer | null {
  const def = BY_ROLE.get(role)
  return def ? offerFor(state, def) : null
}

/** Доступно ли действие прямо сейчас. */
export function canAct(state: CareerState, key: string): boolean {
  const def = BY_KEY.get(key)
  return def ? blockFor(state, def) === null : false
}

/**
 * Ставит ситуацию действия в очередь. Чистая функция: насос её не крутит —
 * этим занимается `act` в career.ts. Недоступное действие возвращает состояние
 * как есть, чтобы вызов из интерфейса нельзя было обойти мимо проверок.
 */
export function queueAction(state: CareerState, key: string): CareerState {
  const def = BY_KEY.get(key)
  if (!def || blockFor(state, def) !== null) return state
  // В начало очереди, а не в хвост: игрок нажал кнопку сейчас, и разговор
  // должен идти следующей карточкой, а не через тур.
  const beat: Beat = { t: 'event', key: def.eventKey, payload: { initiative: 1 } }
  return {
    ...state,
    flags: { ...state.flags, [USE + def.key]: uses(state, def.key) + 1 },
    queue: [beat, ...state.queue],
  }
}

/**
 * Снимает счётчики действий: они живут один сезон. Вызывается там же, где
 * обнуляется желание уйти, — в начале сезона.
 */
export function resetActionUses(flags: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(flags).filter(([key]) => !key.startsWith(USE)))
}
