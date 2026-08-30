import type { Card, EventChannel, Resolution, Stage } from '../types'
import type { EventCtx, EventDef } from './context'
import { TRAINING_EVENTS } from './training'
import { MEDICAL_EVENTS } from './medical'
import { LOCKER_EVENTS } from './locker'
import { MEDIA_EVENTS } from './media'
import { LIFE_EVENTS } from './life'
import { TRANSFER_EVENTS } from './transfer'
import { NATIONAL_EVENTS } from './national'
import { MATCH_EVENTS } from './match'
import { GOALKEEPER_EVENTS } from './goalkeeper'
import { STRUCTURAL_EVENTS } from './structural'

export const ALL_EVENTS: EventDef[] = [
  ...TRAINING_EVENTS,
  ...MEDICAL_EVENTS,
  ...LOCKER_EVENTS,
  ...MEDIA_EVENTS,
  ...LIFE_EVENTS,
  ...TRANSFER_EVENTS,
  ...NATIONAL_EVENTS,
  ...MATCH_EVENTS,
  ...GOALKEEPER_EVENTS,
  ...STRUCTURAL_EVENTS,
]

const BY_KEY = new Map(ALL_EVENTS.map((e) => [e.key, e]))

export function getEvent(key: string): EventDef {
  const def = BY_KEY.get(key)
  if (!def) throw new Error(`Unknown event: ${key}`)
  return def
}

export function hasEvent(key: string): boolean {
  return BY_KEY.has(key)
}

/** Динамические id опций (`to:man-city`) сводятся к общему ключу перевода. */
function optionTextKey(optionId: string): string {
  const colon = optionId.indexOf(':')
  return colon === -1 ? optionId : optionId.slice(0, colon)
}

export function buildCard(def: EventDef, ctx: EventCtx): Card {
  const draft = def.build(ctx)
  const affordable = (cost: number | undefined) => cost === undefined || cost <= ctx.player.money
  // Если по карману нет ни одного варианта, карточка стала бы тупиком — тогда
  // не запираем ничего. У событий так быть не должно (это проверяет тест), но
  // насос обязан выжить и при ошибке в описании.
  const anyAffordable = draft.options.some((o) => affordable(o.cost))
  return {
    id: `${def.key}@${ctx.player.age}:${ctx.stage}`,
    kind: 'decision',
    stage: ctx.stage,
    eventKey: def.key,
    channel: def.channel,
    title: { key: `ev.${def.key}.title`, params: draft.titleParams },
    body: { key: `ev.${def.key}.body`, params: draft.bodyParams },
    options: draft.options.map((o) => ({
      id: o.id,
      label: { key: `ev.${def.key}.opt.${optionTextKey(o.id)}`, params: o.labelParams },
      hints: o.hints ?? [],
      disabled: anyAffordable && !affordable(o.cost),
    })),
    payload: ctx.payload,
  }
}

export function resolveCard(def: EventDef, ctx: EventCtx, optionId: string): Resolution {
  const result = def.resolve(ctx, optionId)
  return {
    text: { key: `ev.${def.key}.res.${result.outcome}`, params: result.params },
    effects: result.effects,
    headline: result.headline
      ? { key: `ev.${def.key}.hl.${result.outcome}`, params: result.params }
      : undefined,
  }
}

export interface PickOptions {
  stage: Stage
  /** Ключи, которые уже выданы в этом сезоне — чтобы не дублировать. */
  exclude: string[]
}

/**
 * Каналы, которые требуют, чтобы игрок вообще выходил на поле. Травмированному
 * не предлагают бить пенальти в финале и не зовут на турнир со сборной: он
 * лечится. Гейт стоит здесь, а не в каждом событии по отдельности, — иначе его
 * рано или поздно забудут поставить в новом.
 */
const NEEDS_PITCH: EventChannel[] = ['match', 'national']

/** Требует ли ситуация, чтобы игрок был в строю. */
export function needsPitch(channel: EventChannel): boolean {
  return NEEDS_PITCH.includes(channel)
}

function unavailable(ctx: EventCtx): boolean {
  return ctx.player.matchesOut > 0 || ctx.player.banMatches > 0
}

export function pickEvent(ctx: EventCtx, { stage, exclude }: PickOptions): EventDef | null {
  const out = unavailable(ctx)
  const candidates = ALL_EVENTS.filter((def) => {
    if (def.weight <= 0) return false
    if (!def.stages.includes(stage)) return false
    if (exclude.includes(def.key)) return false
    if (def.once && ctx.state.usedEvents.includes(def.key)) return false
    if (out && NEEDS_PITCH.includes(def.channel)) return false
    if (def.when && !def.when(ctx)) return false
    return true
  })
  if (candidates.length === 0) return null
  return ctx.rng.weighted(candidates.map((item) => ({ item, weight: item.weight })))
}

export type { EventCtx, EventDef } from './context'
