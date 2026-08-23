/**
 * Детерминированный RNG. Генератор не хранит состояние в замыкании: он
 * восстанавливается из (seed, label, step), поэтому карьеру можно
 * переиграть один в один и написать на неё тесты.
 */

export function hashString(input: string): number {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h2 >>> 0) * 4294967296 + (h1 >>> 0)
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface Weighted<T> {
  item: T
  weight: number
}

export class Rng {
  private next: () => number

  constructor(seed: string, label: string, step: number) {
    this.next = mulberry32(hashString(`${seed}:${label}:${step}`) % 4294967296)
    // Прогреваем: первые значения mulberry32 слабо разбегаются на близких сидах.
    this.next()
    this.next()
  }

  float(): number {
    return this.next()
  }

  /** Целое в [min, max] включительно. */
  int(min: number, max: number): number {
    if (max < min) return min
    return min + Math.floor(this.next() * (max - min + 1))
  }

  chance(p: number): boolean {
    return this.next() < p
  }

  /** Нормальное-ish распределение вокруг mid: сумма трёх бросков. */
  around(mid: number, spread: number): number {
    const r = (this.next() + this.next() + this.next()) / 3
    return mid + (r - 0.5) * 2 * spread
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick: empty list')
    return items[Math.floor(this.next() * items.length)]
  }

  weighted<T>(entries: ReadonlyArray<Weighted<T>>): T {
    const total = entries.reduce((sum, e) => sum + Math.max(0, e.weight), 0)
    if (total <= 0) throw new Error('Rng.weighted: zero total weight')
    let roll = this.next() * total
    for (const entry of entries) {
      roll -= Math.max(0, entry.weight)
      if (roll <= 0) return entry.item
    }
    return entries[entries.length - 1].item
  }

  shuffle<T>(items: readonly T[]): T[] {
    const out = items.slice()
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }

  /** Взять n различных элементов. Если просят больше, чем есть — вернёт всё. */
  sample<T>(items: readonly T[], n: number): T[] {
    return this.shuffle(items).slice(0, n)
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function round(value: number, digits = 0): number {
  const f = 10 ** digits
  return Math.round(value * f) / f
}
