import type { Severity } from './types'
import { clamp } from './rng'

/**
 * Травмы меряются матчами, а не полусезонами. Полусезон был слишком крупной
 * меркой: лёгкое повреждение в ней округлялось до нуля и не стоило ничего, а
 * растяжение выбивало игрока на полгода наравне с крестами.
 *
 * `matches` — сколько матчей игрок пропустит. Числа игровые, но порядок взят
 * с реальных сроков: ушиб — пара туров, мениск — месяца три, кресты — до года.
 */
export interface InjuryType {
  kind: string
  severity: Severity
  matches: number
  weight: number
}

export const INJURY_TYPES: InjuryType[] = [
  { kind: 'muscle_strain', severity: 1, matches: 2, weight: 30 },
  { kind: 'hamstring', severity: 1, matches: 3, weight: 26 },
  { kind: 'ankle_knock', severity: 1, matches: 2, weight: 24 },
  { kind: 'bruised_rib', severity: 1, matches: 3, weight: 14 },
  { kind: 'torn_muscle', severity: 2, matches: 8, weight: 10 },
  { kind: 'meniscus', severity: 2, matches: 12, weight: 6 },
  { kind: 'broken_hand', severity: 2, matches: 5, weight: 4 },
  { kind: 'acl', severity: 3, matches: 34, weight: 2 },
  { kind: 'tibia_fracture', severity: 3, matches: 26, weight: 1 },
  { kind: 'achilles', severity: 3, matches: 30, weight: 1 },
]

const BY_KIND = new Map(INJURY_TYPES.map((t) => [t.kind, t]))

/** Запасной срок, если событие придумало свой вид повреждения. */
const DEFAULT_MATCHES: Record<Severity, number> = { 1: 2, 2: 8, 3: 30 }

/**
 * Сколько матчей стоит повреждение. Срок берётся из вида, а не из тяжести:
 * мениск и сломанная кисть оба «средние», но лечатся по-разному.
 */
export function injuryMatches(kind: string, severity: Severity): number {
  return BY_KIND.get(kind)?.matches ?? DEFAULT_MATCHES[severity]
}

/**
 * Риск повреждения **в одном матче**. Растёт от нагрузки, падает от свежести;
 * после тяжёлой травмы остаётся выше — отсюда «хрустальные» карьеры.
 *
 * Раньше бросок был один на полсезона и почти всегда давал либо ничего, либо
 * полгода вне игры. Теперь он делается в каждом сыгранном матче, поэтому за
 * сезон набирается около полутора повреждений — почти всегда лёгких.
 */
export function injuryRisk(fitness: number, age: number, priorSevere: number): number {
  const base = 0.062
  const fromFitness = (100 - fitness) * 0.0008
  const fromAge = age > 30 ? (age - 30) * 0.0045 : age < 19 ? 0.008 : 0
  const fromHistory = priorSevere * 0.018
  return clamp(base + fromFitness + fromAge + fromHistory, 0.02, 0.2)
}

/**
 * Сколько матчей пропускается за одно межсезонье. Меньше полусезона: лето
 * короче, и тяжёлая травма честно перетекает в следующий сезон.
 */
export const SUMMER_RECOVERY = 18
