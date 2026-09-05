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

/**
 * Как стиль меняет саму игру, а не только доверие. Множители намеренно
 * скромные: стиль уже влияет на игрока вторым путём — через доверие, роль и
 * минуты, — и щедрые числа складывались бы с ним в перекос, при котором
 * неподходящий тренер вычёркивал бы игрока из состава целиком.
 *
 * `fitnessDrain` — расход свежести за полусезон при полной занятости: столько
 * стоит игроку манера тренера сверх обычной нагрузки.
 */
export interface StyleEffects {
  /** Множитель шанса попасть в состав. */
  minutes: number
  goals: number
  assists: number
  /** Доля сухих матчей: касается вратаря. */
  cleanSheet: number
  fitnessDrain: number
}

const NEUTRAL_STYLE: StyleEffects = {
  minutes: 1, goals: 1, assists: 1, cleanSheet: 1, fitnessDrain: 0,
}

// Базовые минуты у всех стилей единица, и это не заготовка: манера не решает,
// сколько людей выходит на поле, — только кто именно. Минуты двигает
// совместимость позиции, ниже.
//
// Средние по столбцам держатся около единицы намеренно: тренер достаётся
// игроку случайно, и если бы средний стиль давал прибавку, вся выборка
// карьер тихо поехала бы вверх. Стиль обязан решать, кому повезло с
// тренером, а не поднимать всех разом.
const STYLE_EFFECTS: Record<ManagerStyle, StyleEffects> = {
  // Контроль мяча: пас важнее удара, темп ниже — и бегать приходится меньше.
  possession: { minutes: 1, goals: 0.96, assists: 1.16, cleanSheet: 1.02, fitnessDrain: -2 },
  // Прямой футбол: мяч быстро идёт вперёд, забивают чаще, но не с разыгрыша.
  direct: { minutes: 1, goals: 1.12, assists: 0.9, cleanSheet: 0.93, fitnessDrain: 1 },
  // Прессинг: главный расход — свежесть, всё остальное почти не меняется.
  pressing: { minutes: 1, goals: 1.06, assists: 1.04, cleanSheet: 0.95, fitnessDrain: 6 },
  // Игра от обороны: сзади сухо, впереди пусто.
  defensive: { minutes: 1, goals: 0.86, assists: 0.9, cleanSheet: 1.1, fitnessDrain: -5 },
}

/**
 * Стиль под конкретную позицию. Базовая таблица говорит, что тренер делает с
 * командой, совместимость — насколько игрок вписан в этот план: свой играет
 * больше и полезнее, чужой садится на скамейку и реже оказывается там, где
 * забивают.
 */
export function styleEffects(style: ManagerStyle | null | undefined, position: Position): StyleEffects {
  if (!style) return NEUTRAL_STYLE
  const base = STYLE_EFFECTS[style]
  const fit = styleFit(style, position)
  // Штраф вдвое весомее премии, и это не игровое кокетство, а арифметика:
  // подходящих позиций у стилей девятнадцать на девять неподходящих. При
  // равных премии и штрафе средний игрок в среднем выигрывал бы, и по всей
  // выборке карьер вылезала бы тихая инфляция матчей и голов.
  const swing = (like: number) => (fit > 0 ? like : fit < 0 ? -like * 2 : 0)
  return {
    minutes: base.minutes * (1 + swing(0.06)),
    goals: base.goals * (1 + swing(0.04)),
    assists: base.assists * (1 + swing(0.04)),
    cleanSheet: base.cleanSheet,
    fitnessDrain: base.fitnessDrain,
  }
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
  const expectation = (club.tier - 1) * 0.14
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
