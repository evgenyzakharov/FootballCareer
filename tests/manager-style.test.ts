import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Hud } from '../src/ui/Hud'
import { t } from '../src/i18n'
import type { CareerState, Gauges, Position, Role } from '../src/engine/types'
import { ack, choose, managerStyle, newCareer, setIdentity } from '../src/engine/career'
import { MANAGER_STYLES, styleEffects } from '../src/engine/relationships'
import type { ManagerStyle } from '../src/engine/relationships'
import { simulateBlock } from '../src/engine/performance'
import { seasonFixtures } from '../src/engine/fixtures'
import { createPlayer } from '../src/engine/player'
import { getClub } from '../src/data/clubs'
import { Rng } from '../src/engine/rng'

/**
 * Стиль тренера двигает минуты, продуктивность и свежесть — величины
 * случайные, поэтому один отрезок не докажет ничего. Считаем итог многих
 * отрезков с одним и тем же игроком и разными манерами тренера: различие
 * должно быть систематическим, а не разовым.
 */
function blocksUnder(
  style: ManagerStyle | null,
  position: Position,
  options: { role?: Role; runs?: number; gauges?: Partial<Gauges> } = {},
) {
  const club = getClub('inter')
  const base = createPlayer(
    { lastName: 'ТЕСТОВ', shirt: 9, foot: 'right', countryCode: 'ITA', position },
    5,
    new Rng('style', 'player', 0),
  )
  const player = {
    ...base,
    age: 26,
    gauges: {
      form: 60, fitness: 85, morale: 65, coachTrust: 60,
      fanLove: 55, mediaRep: 0, lockerRoom: 20, fame: 30,
      ...options.gauges,
    },
  }
  const runs = options.runs ?? 240
  const total = { minutes: 0, goals: 0, assists: 0, cleanSheets: 0, fitness: 0 }
  for (let i = 0; i < runs; i++) {
    const result = simulateBlock(
      {
        player,
        club,
        role: options.role ?? 'starter',
        minutesMult: 1,
        style,
        matchesOut: 0,
        banMatches: 0,
        size: 26,
        playedBefore: 0,
        scheduledBefore: 0,
        fixtures: seasonFixtures(club, 26, new Rng('style', 'fixtures', 0)),
      },
      // Один и тот же поток случайности на все стили: разница в итогах может
      // прийти только от манеры тренера.
      new Rng('style', 'block', i),
    )
    total.minutes += result.matches.reduce((sum, m) => sum + m.minutes, 0)
    total.goals += result.goals
    total.assists += result.assists
    total.cleanSheets += result.cleanSheets
    total.fitness += result.fitnessDelta
  }
  return total
}

describe('стиль тренера в игре', () => {
  it('под своего тренера игрок играет больше, чем под чужого', () => {
    // Контроль мяча любит десятку, прессинг её не терпит.
    const liked = blocksUnder('possession', 'CAM')
    const disliked = blocksUnder('pressing', 'CAM')
    expect(liked.minutes).toBeGreaterThan(disliked.minutes)
    // Разница должна быть заметной, но не решающей: место в составе игрок всё
    // равно зарабатывает уровнем, а не совместимостью.
    const ratio = liked.minutes / disliked.minutes
    expect(ratio).toBeGreaterThan(1.05)
    expect(ratio).toBeLessThan(1.35)
  })

  it('прессинг съедает свежесть, а контроль мяча её бережёт', () => {
    const pressing = blocksUnder('pressing', 'CM')
    const possession = blocksUnder('possession', 'CM')
    expect(pressing.fitness).toBeLessThan(possession.fitness)
  })

  it('на скамейке манера тренера свежести не стоит', () => {
    // Расход считается по сыгранному: не выходя на поле, от прессинга не
    // устают. Иначе запасной садился бы без сил, ничего не сделав.
    const pressing = blocksUnder('pressing', 'CM', { role: 'reserve' })
    const possession = blocksUnder('possession', 'CM', { role: 'reserve' })
    expect(Math.abs(pressing.fitness - possession.fitness)).toBeLessThan(
      Math.abs(pressing.fitness) * 0.15 + 1,
    )
  })

  it('игра от обороны режет голы вингера', () => {
    const defensive = blocksUnder('defensive', 'RW')
    const direct = blocksUnder('direct', 'RW')
    expect(defensive.goals).toBeLessThan(direct.goals * 0.85)
  })

  it('игра от обороны прибавляет вратарю сухих матчей', () => {
    const defensive = blocksUnder('defensive', 'GK')
    const direct = blocksUnder('direct', 'GK')
    expect(defensive.cleanSheets).toBeGreaterThan(direct.cleanSheets)
  })

  it('без тренера стиль не меняет ничего', () => {
    // Академия, свободный агент, клуб без назначенного тренера — законные
    // состояния, и в них симуляция обязана работать как раньше.
    const none = blocksUnder(null, 'ST', { runs: 60 })
    expect(none.minutes).toBeGreaterThan(0)
    for (const position of ['GK', 'CB', 'CAM', 'ST'] as Position[]) {
      expect(styleEffects(null, position)).toEqual({
        minutes: 1, goals: 1, assists: 1, cleanSheet: 1, fitnessDrain: 0,
      })
    }
  })

  it('совместимость двигает множители в обе стороны', () => {
    for (const style of MANAGER_STYLES) {
      const liked = styleEffects(style, 'CB')
      const disliked = styleEffects(style, 'LW')
      // Сравниваем только внутри одного стиля: база у стилей своя, а
      // совместимость обязана двигать одну и ту же базу вверх и вниз.
      if (liked.minutes !== disliked.minutes) {
        expect(Math.abs(liked.minutes - disliked.minutes)).toBeLessThan(0.3)
      }
      expect(liked.minutes).toBeGreaterThan(0.7)
      expect(disliked.minutes).toBeGreaterThan(0.7)
    }
  })
})

/**
 * Прогоняет карьеру до момента, когда следующим в очереди стоит игровой тур,
 * а игрок в нём выйдет на поле. Запасной для этой проверки не годится:
 * манера тренера стоит свежести ровно по сыгранному, и у не игравшего оба
 * стиля дадут один и тот же результат.
 */
function stateBeforeRound(seed: string): CareerState {
  let state = setIdentity(newCareer(seed), {
    lastName: 'ТЕСТОВ', shirt: 8, foot: 'right', countryCode: 'ITA', position: 'CM',
  })
  let guard = 0
  while (guard < 2000) {
    guard++
    if (state.resolution) { state = ack(state); continue }
    if (!state.card) break
    const role = state.season?.role
    const ready = state.season && state.season.clubId
      && (role === 'star' || role === 'starter' || role === 'rotation')
      && state.relationships.some((r) => r.role === 'manager')
      && state.queue.some((b) => b.t === 'sim')
    if (ready) return state
    const available = state.card.options.filter((o) => !o.disabled)
    state = choose(state, available.length > 0 ? available[0].id : 'next')
  }
  throw new Error('до игрового тура дойти не удалось')
}

/** Тот же момент карьеры, но с заданной манерой тренера и ровной свежестью. */
function withStyle(state: CareerState, style: ManagerStyle): CareerState {
  return {
    ...state,
    player: { ...state.player, gauges: { ...state.player.gauges, fitness: 70 } },
    relationships: state.relationships.map((r) =>
      r.role === 'manager' ? { ...r, meta: { ...r.meta, style } } : r),
  }
}

/** Доигрывает до конца ближайшего тура и возвращает состояние после него. */
function playRound(start: CareerState): CareerState {
  const before = start.season?.roundsPlayed ?? 0
  let state = start
  let guard = 0
  while (guard < 200 && (state.season?.roundsPlayed ?? 0) === before) {
    guard++
    if (state.resolution) { state = ack(state); continue }
    if (!state.card) break
    const available = state.card.options.filter((o) => !o.disabled)
    state = choose(state, available.length > 0 ? available[0].id : 'next')
  }
  expect(state.season?.roundsPlayed ?? 0).toBeGreaterThan(before)
  return state
}

describe('стиль тренера в карьере', () => {
  it('манера тренера доезжает из состояния до симуляции тура', () => {
    // Состояния различаются ровно одним полем — стилем в `meta` тренера.
    // Поток случайности у тура общий, значит и разница в свежести после тура
    // может прийти только оттуда.
    const at = stateBeforeRound('style-wire')
    const pressing = playRound(withStyle(at, 'pressing'))
    const possession = playRound(withStyle(at, 'possession'))
    expect(pressing.player.gauges.fitness).toBeLessThan(possession.player.gauges.fitness)
  })

  it('у клубного игрока стиль тренера всегда известен', () => {
    const at = stateBeforeRound('style-known')
    const style = managerStyle(at)
    expect(style).not.toBeNull()
    expect(MANAGER_STYLES).toContain(style)
  })

  it('без тренера стиль пуст, а не подставлен по умолчанию', () => {
    // Новая карьера начинается в академии: тренера клуба ещё нет.
    const fresh = newCareer('style-empty')
    expect(managerStyle(fresh)).toBeNull()
  })
})

describe('стиль тренера в панели игрока', () => {
  it('панель называет тренера и его манеру', () => {
    // Стиль меняет минуты и голы. Если игрок его не видит, просевшие минуты
    // выглядят как случайность — поэтому строка в панели входит в механику,
    // а не в оформление.
    const state = stateBeforeRound('style-hud')
    const style = managerStyle(state)
    const manager = state.relationships.find((r) => r.role === 'manager')
    expect(style).not.toBeNull()
    expect(manager).toBeDefined()

    const html = renderToStaticMarkup(createElement(Hud, { state }))
    expect(html).toContain(t({ key: 'hud.manager' }, 'ru'))
    expect(html).toContain(manager!.name.ru)
    expect(html).toContain(t({ key: `style.${style}` }, 'ru'))
  })

  it('панель молчит о тренере, пока его нет', () => {
    const fresh = newCareer('style-hud-empty')
    const html = renderToStaticMarkup(createElement(Hud, { state: fresh }))
    expect(html).not.toContain(t({ key: 'hud.manager' }, 'ru'))
  })
})
