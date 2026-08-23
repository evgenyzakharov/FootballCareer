import type { AttrKey, Attributes, Position } from './types'
import { clamp } from './rng'

export const ATTR_KEYS: AttrKey[] = [
  'pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'mental', 'goalkeeping',
]

type Weights = Partial<Record<AttrKey, number>>

/** Веса позиций: сумма по каждой позиции = 1. OVR — взвешенное среднее. */
const POSITION_WEIGHTS: Record<Position, Weights> = {
  GK: { goalkeeping: 0.6, mental: 0.15, physical: 0.1, passing: 0.1, pace: 0.05 },
  CB: { defending: 0.35, physical: 0.25, mental: 0.15, passing: 0.13, pace: 0.12 },
  LB: { defending: 0.25, pace: 0.22, passing: 0.18, physical: 0.15, dribbling: 0.1, mental: 0.1 },
  RB: { defending: 0.25, pace: 0.22, passing: 0.18, physical: 0.15, dribbling: 0.1, mental: 0.1 },
  CDM: { defending: 0.28, passing: 0.24, mental: 0.18, physical: 0.18, dribbling: 0.07, pace: 0.05 },
  CM: { passing: 0.3, mental: 0.2, dribbling: 0.15, defending: 0.13, physical: 0.12, pace: 0.1 },
  CAM: { passing: 0.27, dribbling: 0.24, shooting: 0.18, mental: 0.16, pace: 0.1, physical: 0.05 },
  LM: { pace: 0.22, dribbling: 0.22, passing: 0.22, shooting: 0.12, physical: 0.12, mental: 0.1 },
  RM: { pace: 0.22, dribbling: 0.22, passing: 0.22, shooting: 0.12, physical: 0.12, mental: 0.1 },
  LW: { dribbling: 0.28, pace: 0.26, shooting: 0.2, passing: 0.14, mental: 0.07, physical: 0.05 },
  RW: { dribbling: 0.28, pace: 0.26, shooting: 0.2, passing: 0.14, mental: 0.07, physical: 0.05 },
  ST: { shooting: 0.38, pace: 0.18, physical: 0.16, dribbling: 0.14, mental: 0.09, passing: 0.05 },
}

/** Атрибуты, которые для позиции важны — туда идёт основной прирост от тренировок. */
export function keyAttrs(position: Position): AttrKey[] {
  return Object.entries(POSITION_WEIGHTS[position])
    .filter(([, w]) => (w ?? 0) >= 0.15)
    .map(([k]) => k as AttrKey)
}

export function positionWeights(position: Position): Weights {
  return POSITION_WEIGHTS[position]
}

export function overall(attrs: Attributes, position: Position): number {
  const weights = POSITION_WEIGHTS[position]
  let sum = 0
  for (const [key, weight] of Object.entries(weights)) {
    sum += attrs[key as AttrKey] * (weight ?? 0)
  }
  return Math.round(sum)
}

export function isGoalkeeper(position: Position): boolean {
  return position === 'GK'
}

/**
 * Сдвиг «возрастного пика» по атрибуту. Скорость садится рано, чтение игры
 * растёт почти до конца — из-за этого 33-летний плеймейкер ещё полезен,
 * а 33-летний винжер уже нет.
 */
const PEAK_OFFSET: Record<AttrKey, number> = {
  pace: 3,
  physical: 1,
  dribbling: 1,
  shooting: 0,
  defending: -2,
  passing: -3,
  goalkeeping: -4,
  mental: -6,
}

/** [до какого возраста, минимальный прирост, максимальный прирост] */
const AGE_BANDS: Array<[maxAge: number, min: number, max: number]> = [
  [18, 4, 9],
  [21, 3, 7],
  [24, 2, 5],
  [27, 1, 3],
  [29, 0, 1],
  [31, -1, 0],
  [33, -2, -1],
  [35, -3, -2],
  [99, -5, -3],
]

export function ageBand(age: number): [number, number] {
  for (const [maxAge, min, max] of AGE_BANDS) {
    if (age <= maxAge) return [min, max]
  }
  return [-5, -3]
}

/** Возрастной прирост для конкретного атрибута — с учётом сдвига пика. */
export function attrAgeBand(attr: AttrKey, age: number): [number, number] {
  return ageBand(age + PEAK_OFFSET[attr])
}

/** Пороговая цена: OVR → стоимость, € (интерполируется линейно). */
const VALUE_TABLE: Array<[ovr: number, value: number]> = [
  [45, 40_000],
  [50, 100_000],
  [55, 250_000],
  [60, 500_000],
  [65, 1_200_000],
  [70, 3_000_000],
  [75, 8_000_000],
  [80, 20_000_000],
  [85, 55_000_000],
  [90, 100_000_000],
  [95, 160_000_000],
  [99, 250_000_000],
]

/** Возрастной коэффициент к стоимости: 22-летний дороже 33-летнего при равном OVR. */
function ageValueFactor(age: number): number {
  if (age <= 19) return 1.15
  if (age <= 23) return 1.25
  if (age <= 26) return 1.1
  if (age <= 28) return 0.95
  if (age <= 30) return 0.75
  if (age <= 32) return 0.5
  if (age <= 34) return 0.28
  return 0.12
}

export function marketValue(ovr: number, age: number): number {
  const o = clamp(ovr, 40, 99)
  let base = VALUE_TABLE[0][1]
  for (let i = 0; i < VALUE_TABLE.length - 1; i++) {
    const [lo, loValue] = VALUE_TABLE[i]
    const [hi, hiValue] = VALUE_TABLE[i + 1]
    if (o >= lo && o <= hi) {
      const k = (o - lo) / (hi - lo)
      base = loValue + (hiValue - loValue) * k
      break
    }
    if (o > hi) base = hiValue
  }
  const raw = base * ageValueFactor(age)
  // Округляем до «человеческих» чисел, как в трансферных новостях.
  const mag = 10 ** Math.max(4, Math.floor(Math.log10(raw)) - 1)
  return Math.round(raw / mag) * mag
}

export function emptyAttrs(value = 40): Attributes {
  return {
    pace: value, shooting: value, passing: value, dribbling: value,
    defending: value, physical: value, mental: value, goalkeeping: value,
  }
}
