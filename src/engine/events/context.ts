import type {
  AttrKey, CareerState, Club, CompetitionKind, Effect, EventChannel, Gauges, OptionEffectHint,
  Player, RelationRole, Role, Severity, Stage, TextParam,
} from '../types'
import type { Rng } from '../rng'

export interface EventCtx {
  state: CareerState
  player: Player
  club: Club | null
  ovr: number
  role: Role
  rng: Rng
  stage: Stage
  /** Данные из отложенного последствия, если событие пришло по расписанию. */
  payload: Record<string, string | number>
}

export interface OptionDraft {
  id: string
  hints?: OptionEffectHint[]
  labelParams?: Record<string, TextParam>
}

export interface EventDraft {
  titleParams?: Record<string, TextParam>
  bodyParams?: Record<string, TextParam>
  options: OptionDraft[]
}

export interface EventResult {
  /** Суффикс ключа текста результата: ev.<event>.res.<outcome>. */
  outcome: string
  effects: Effect[]
  params?: Record<string, TextParam>
  /** Добавить строку в ленту новостей (ключ ev.<event>.hl.<outcome>). */
  headline?: boolean
  tone?: 'good' | 'bad' | 'neutral'
}

export interface EventDef {
  key: string
  channel: EventChannel
  stages: Stage[]
  /** Одноразовое за карьеру. */
  once: boolean
  /** Базовый вес в лотерее. 0 — выдаётся только по расписанию последствий. */
  weight: number
  when?: (ctx: EventCtx) => boolean
  build: (ctx: EventCtx) => EventDraft
  resolve: (ctx: EventCtx, optionId: string) => EventResult
}

// ─── Словарь подсказок на кнопках ───────────────────────────────────────────
// Общий на все события: игрок учится читать риск, а i18n не разрастается.

function hint(key: string, tone: OptionEffectHint['tone']): OptionEffectHint {
  return { text: { key: `hint.${key}` }, tone }
}

export const H = {
  growthUp: hint('growth_up', 'good'),
  growthBig: hint('growth_big', 'good'),
  injuryRisk: hint('injury_risk', 'risky'),
  injuryRiskHigh: hint('injury_risk_high', 'risky'),
  formUp: hint('form_up', 'good'),
  formDown: hint('form_down', 'bad'),
  fitnessUp: hint('fitness_up', 'good'),
  fitnessDown: hint('fitness_down', 'bad'),
  moraleUp: hint('morale_up', 'good'),
  moraleDown: hint('morale_down', 'bad'),
  trustUp: hint('trust_up', 'good'),
  trustDown: hint('trust_down', 'bad'),
  fansUp: hint('fans_up', 'good'),
  fansDown: hint('fans_down', 'bad'),
  mediaUp: hint('media_up', 'good'),
  mediaDown: hint('media_down', 'bad'),
  lockerUp: hint('locker_up', 'good'),
  lockerDown: hint('locker_down', 'bad'),
  fameUp: hint('fame_up', 'good'),
  fameDown: hint('fame_down', 'bad'),
  moneyUp: hint('money_up', 'good'),
  moneyDown: hint('money_down', 'bad'),
  minutesUp: hint('minutes_up', 'good'),
  minutesDown: hint('minutes_down', 'bad'),
  banRisk: hint('ban_risk', 'risky'),
  gamble: hint('gamble', 'risky'),
  safe: hint('safe', 'neutral'),
  noEffect: hint('no_effect', 'neutral'),
  consequenceLater: hint('consequence_later', 'risky'),
  leaveClub: hint('leave_club', 'neutral'),
  stayClub: hint('stay_club', 'neutral'),
  titleOdds: hint('title_odds', 'good'),
  titleOddsDown: hint('title_odds_down', 'bad'),
} satisfies Record<string, OptionEffectHint>

// ─── Короткие конструкторы эффектов ─────────────────────────────────────────

export const gauge = (key: keyof Gauges, delta: number): Effect => ({ t: 'gauge', key, delta })
export const attr = (key: AttrKey, delta: number): Effect => ({ t: 'attr', key, delta })
export const money = (delta: number): Effect => ({ t: 'money', delta })
export const flag = (key: string, delta = 1): Effect => ({ t: 'flag', key, delta })
export const trait = (add: string): Effect => ({ t: 'trait', add })
export const rel = (role: RelationRole, delta: number): Effect => ({ t: 'relationship', role, delta })
export const injury = (kind: string, severity: Severity): Effect => ({ t: 'injury', kind, severity })
export const suspend = (blocks: number): Effect => ({ t: 'suspend', blocks })
export const odds = (comp: CompetitionKind, mult: number): Effect => ({ t: 'trophyOdds', comp, mult })
export const potential = (delta: number): Effect => ({ t: 'potential', delta })
export const minutes = (mult: number): Effect => ({ t: 'minutes', mult })
export const release = (): Effect => ({ t: 'release' })
export const objective = (direction: 'up' | 'down'): Effect => ({ t: 'objective', direction })

export function later(
  eventKey: string,
  inSeasons: number,
  stage: Stage,
  payload?: Record<string, string | number>,
): Effect {
  return {
    t: 'schedule',
    consequence: { id: `${eventKey}@${inSeasons}`, inSeasons, stage, eventKey, payload },
  }
}
