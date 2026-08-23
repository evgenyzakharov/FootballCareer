import type { Club, Position, RelationRole, Relationship } from './types'
import { randomSurname } from '../data/names'
import { Rng, clamp } from './rng'

export const MANAGER_STYLES = ['possession', 'direct', 'pressing', 'defensive'] as const
export type ManagerStyle = (typeof MANAGER_STYLES)[number]

/** Какие позиции выигрывают от стиля тренера, а какие теряют в минутах. */
const STYLE_FIT: Record<ManagerStyle, { likes: Position[]; dislikes: Position[] }> = {
  possession: { likes: ['CM', 'CAM', 'CDM', 'LB', 'RB'], dislikes: ['ST', 'CB'] },
  direct: { likes: ['ST', 'LW', 'RW', 'CB'], dislikes: ['CDM', 'CAM'] },
  pressing: { likes: ['CDM', 'CM', 'LW', 'RW', 'ST'], dislikes: ['CAM', 'GK'] },
  defensive: { likes: ['CB', 'CDM', 'GK', 'LB', 'RB'], dislikes: ['LW', 'RW', 'CAM'] },
}

/**
 * Совместимость игрока со стилем: ±8 очков доверия при приходе тренера.
 * Из-за неё смена тренера — реальное событие, а не строчка в новостях.
 */
export function styleFit(style: ManagerStyle, position: Position): number {
  const fit = STYLE_FIT[style]
  if (fit.likes.includes(position)) return 8
  if (fit.dislikes.includes(position)) return -8
  return 0
}

function make(
  role: RelationRole,
  clubId: string | null,
  country: string,
  age: number,
  stance: number,
  rng: Rng,
  meta?: Record<string, string | number>,
): Relationship {
  return { role, name: randomSurname(country, rng), clubId, stance, sinceAge: age, meta }
}

export function createManager(club: Club, age: number, rng: Rng): Relationship {
  const style = rng.pick(MANAGER_STYLES)
  return make('manager', club.id, club.country, age, rng.int(-10, 25), rng, { style })
}

export function createRival(club: Club, position: Position, ovr: number, age: number, rng: Rng): Relationship {
  // Конкурент бывает и сильнее, и слабее — от этого зависит давление на место.
  const level = clamp(Math.round(rng.around(ovr, 7)), 40, 95)
  return make('rival', club.id, club.country, age, rng.int(-30, 10), rng, { position, level })
}

export function createAgent(country: string, age: number, rng: Rng): Relationship {
  return make('agent', null, country, age, rng.int(10, 40), rng)
}

export function createJournalist(country: string, age: number, rng: Rng): Relationship {
  return make('journalist', null, country, age, rng.int(-20, 20), rng)
}

export function createCaptain(club: Club, age: number, rng: Rng): Relationship {
  return make('captain', club.id, club.country, age, rng.int(-5, 30), rng)
}

export function createMentor(club: Club, age: number, rng: Rng): Relationship {
  return make('mentor', club.id, club.country, age, rng.int(20, 50), rng)
}

export function find(relationships: Relationship[], role: RelationRole): Relationship | null {
  return relationships.find((r) => r.role === role) ?? null
}

export function adjust(relationships: Relationship[], role: RelationRole, delta: number): Relationship[] {
  return relationships.map((r) =>
    r.role === role ? { ...r, stance: clamp(r.stance + delta, -100, 100) } : r,
  )
}

/** Насколько сильно конкурент давит на место: 0 — никак, 2 — вытесняет. */
export function rivalPressure(relationships: Relationship[], ovr: number): number {
  const rival = find(relationships, 'rival')
  if (!rival) return 0
  const level = Number(rival.meta?.level ?? 0)
  if (!level) return 0
  return clamp(0.9 + (level - ovr) * 0.09, 0, 2)
}

/**
 * Тренера увольняют, если клуб не оправдывает свой тир. Отдельно учитываем
 * отношение к игроку: при своём тренере игрок теряет меньше.
 */
export function managerSackChance(club: Club, trophiesWon: number, playerRating: number): number {
  const expectation = club.tier * 0.14
  let p = 0.2 + expectation - trophiesWon * 0.22
  if (playerRating > 7.1) p -= 0.04
  return clamp(p, 0.05, 0.6)
}

/** Уходя из клуба, теряем клубные связи и заводим новые. */
export function relocate(
  relationships: Relationship[],
  club: Club,
  position: Position,
  ovr: number,
  age: number,
  rng: Rng,
): Relationship[] {
  const kept = relationships.filter((r) => r.clubId === null)
  const next = [...kept, createManager(club, age, rng), createCaptain(club, age, rng)]
  if (rng.chance(0.55)) next.push(createRival(club, position, ovr, age, rng))
  if (age <= 22 && rng.chance(0.5)) next.push(createMentor(club, age, rng))
  return next
}
