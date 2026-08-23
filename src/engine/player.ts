import type { AttrKey, Attributes, Foot, Player, Position } from './types'
import { ATTR_KEYS, emptyAttrs, isGoalkeeper, keyAttrs, overall } from './attributes'
import { Rng, clamp } from './rng'

export const START_AGE = 16
export const MAX_AGE = 40

export interface Identity {
  lastName: string
  shirt: number
  foot: Foot
  countryCode: string
  position: Position
}

/** Уровень состава, с которым игрок конкурирует за место. Игровая шкала. */
export function squadLevel(tier: number): number {
  const table = [58, 66, 72, 78, 83, 88]
  return table[clamp(Math.round(tier), 0, 5)]
}

export function createPlayer(identity: Identity, clubTier: number, rng: Rng): Player {
  const base = 42 + clubTier
  const attrs = emptyAttrs(base)
  const key = keyAttrs(identity.position)
  for (const attr of ATTR_KEYS) {
    const bonus = key.includes(attr) ? 5 : 0
    const gk = attr === 'goalkeeping'
    const relevant = gk === isGoalkeeper(identity.position)
    attrs[attr] = clamp(
      Math.round(rng.around(base + bonus, 4) + (relevant ? 2 : -8)),
      20,
      70,
    )
  }
  if (!isGoalkeeper(identity.position)) attrs.goalkeeping = clamp(attrs.goalkeeping, 15, 30)

  const startOvr = overall(attrs, identity.position)
  const potential = clamp(Math.round(rng.around(78, 10) + clubTier * 1.8), startOvr + 8, 99)

  return {
    lastName: identity.lastName,
    shirt: identity.shirt,
    foot: identity.foot,
    countryCode: identity.countryCode,
    position: identity.position,
    age: START_AGE,
    attrs,
    gauges: {
      form: 60,
      fitness: 88,
      morale: 72,
      coachTrust: 42,
      fanLove: 50,
      mediaRep: 0,
      lockerRoom: 18,
      fame: 3,
    },
    potential,
    traits: [],
    injuries: [],
    blocksOut: 0,
    banBlocks: 0,
    money: 0,
  }
}

export function playerOvr(player: Player): number {
  return overall(player.attrs, player.position)
}

/**
 * Распределяет очки развития по атрибутам с уклоном в важные для позиции.
 * Возвращает новый объект — движок остаётся чистым.
 */
export function distributeGrowth(
  attrs: Attributes,
  position: Position,
  points: number,
  rng: Rng,
  focus: AttrKey[] = [],
): Attributes {
  const next = { ...attrs }
  const key = keyAttrs(position)
  const pool: AttrKey[] = []
  for (const attr of ATTR_KEYS) {
    if (attr === 'goalkeeping' && !isGoalkeeper(position)) continue
    if (attr !== 'goalkeeping' && isGoalkeeper(position) && attr !== 'mental' && attr !== 'physical' && attr !== 'passing') continue
    let weight = 1
    if (key.includes(attr)) weight += 2
    if (focus.includes(attr)) weight += 3
    for (let i = 0; i < weight; i++) pool.push(attr)
  }
  if (pool.length === 0) return next

  const steps = Math.abs(Math.round(points))
  const sign = points >= 0 ? 1 : -1
  for (let i = 0; i < steps; i++) {
    const attr = rng.pick(pool)
    next[attr] = clamp(next[attr] + sign, 20, 99)
  }
  return next
}

export function hasTrait(player: Player, trait: string): boolean {
  return player.traits.includes(trait)
}
