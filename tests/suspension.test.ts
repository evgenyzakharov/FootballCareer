import { describe, expect, it } from 'vitest'
import { ack, applyEffects, choose, newCareer, setIdentity } from '../src/engine/career'
import type { CareerState } from '../src/engine/types'

function start(seed: string): CareerState {
  return setIdentity(newCareer(seed), {
    lastName: 'ТЕСТОВ',
    shirt: 4,
    foot: 'right',
    countryCode: 'ITA',
    position: 'CM',
  })
}

/** Крутит карьеру, выбирая первый вариант: он всегда оставляет игрока с клубом. */
function advanceUntil(state: CareerState, done: (s: CareerState) => boolean, limit = 800): CareerState {
  let current = state
  let guard = 0
  while (!done(current) && current.phase !== 'retired' && guard < limit) {
    guard++
    if (current.resolution) {
      current = ack(current)
      continue
    }
    if (!current.card) throw new Error(`stuck: stage=${current.stage} phase=${current.phase}`)
    current = choose(current, current.card.options.find((o) => !o.disabled)?.id ?? 'next')
  }
  return current
}

describe('дисквалификация', () => {
  it('считается отдельно от травмы', () => {
    let state = start('counters')
    state = advanceUntil(state, (s) => s.phase === 'season')

    const injured = applyEffects(state, [{ t: 'injury', kind: 'meniscus', severity: 2 }])
    // Срок берётся из вида повреждения, а не из тяжести: мениск — двенадцать матчей.
    expect(injured.player.matchesOut).toBe(12)
    expect(injured.player.banMatches).toBe(0)

    const banned = applyEffects(state, [{ t: 'suspend', matches: 104 }])
    expect(banned.player.banMatches).toBe(104)
    expect(banned.player.matchesOut).toBe(0)
  })

  it('переживает межсезонье: бан на два сезона столько и стоит', () => {
    let state = start('ban-carry')
    state = advanceUntil(state, (s) => s.phase === 'season')
    state = applyEffects(state, [{ t: 'suspend', matches: 104 }])

    // Первый сезон закрыт — до починки бан здесь обнулялся вместе с травмой.
    state = advanceUntil(state, (s) => s.history.length >= 1)
    expect(state.player.banMatches).toBeGreaterThan(0)

    state = advanceUntil(state, (s) => s.history.length >= 2)
    const [first, second] = state.history
    expect(first.tally.apps).toBe(0)
    expect(second.tally.apps).toBe(0)
  })

  it('заканчивается: бан не становится вечным', () => {
    let state = start('ban-ends')
    state = advanceUntil(state, (s) => s.phase === 'season')
    state = applyEffects(state, [{ t: 'suspend', matches: 104 }])
    state = advanceUntil(state, (s) => s.player.banMatches === 0 && s.history.length >= 2)

    expect(state.player.banMatches).toBe(0)
    expect(state.phase).not.toBe('retired')
  })

  it('после бана игрок снова получает матчи', () => {
    let state = start('ban-return')
    state = advanceUntil(state, (s) => s.phase === 'season')
    state = applyEffects(state, [{ t: 'suspend', matches: 52 }])
    state = advanceUntil(state, (s) => s.history.length >= 3)

    // Первый сезон выбит баном, дальше матчи обязаны появиться.
    expect(state.history[0].tally.apps).toBe(0)
    expect(state.history.slice(1).some((s) => s.tally.apps > 0)).toBe(true)
  })
})
