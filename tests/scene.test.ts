import { describe, expect, it } from 'vitest'
import type { Beat, CareerState } from '../src/engine/types'
import { ack, choose, newCareer, pump, setIdentity } from '../src/engine/career'
import { ALL_EVENTS, getEvent, hasEvent, resolveCard } from '../src/engine/events'
import type { EventCtx } from '../src/engine/events/context'
import { playerOvr } from '../src/engine/player'
import { findClub } from '../src/data/clubs'
import { Rng } from '../src/engine/rng'
import { loadState, saveState } from '../src/engine/save'

/**
 * Сцена — это событие, которое возвращает следующий шаг: ход разговора должен
 * приходить сразу следующей карточкой, а не через расписание последствий, как
 * это делалось раньше через `later(..., 0, стадия)`.
 */

/** Карьера, доведённая до клуба: сцене нужен и клуб, и тренер, и роль. */
function inClub(seed: string): CareerState {
  let state = setIdentity(newCareer(seed), {
    lastName: 'ТЕСТОВ', shirt: 8, foot: 'right', countryCode: 'ITA', position: 'CM',
  })
  let guard = 0
  while (guard < 2000) {
    guard++
    if (state.resolution) { state = ack(state); continue }
    if (!state.card) break
    if (state.season?.clubId && state.player.age >= 18) break
    const available = state.card.options.filter((o) => !o.disabled)
    state = choose(state, available.length > 0 ? available[0].id : 'next')
  }
  if (!state.season?.clubId) throw new Error('до клуба дойти не удалось')
  // Разговор о месте в составе заводит тот, кто в составе не держится.
  return { ...state, season: { ...state.season, role: 'bench' } }
}

/**
 * Ставит событие первым в очередь и прокручивает насос до карточки. Вторым
 * битом идёт случайная ситуация: по ней видно, что продолжение сцены встаёт
 * впереди очереди, а не в её хвост.
 */
function open(state: CareerState, key: string, payload?: Record<string, string | number>): CareerState {
  const queue: Beat[] = [{ t: 'event', key, payload }, { t: 'random' }]
  return pump({ ...state, card: null, resolution: null, queue })
}

describe('сцена в несколько ходов', () => {
  it('продолжение приходит следующей карточкой, обгоняя очередь', () => {
    const at = open(inClub('scene-next'), 'squad_place_talk')
    expect(at.card?.eventKey).toBe('squad_place_talk')

    const answered = choose(at, 'ask')
    expect(answered.resolution).not.toBeNull()

    const next = ack(answered)
    expect(next.card?.eventKey).toBe('squad_place_answer')
  })

  it('выбор первого хода доезжает до второго', () => {
    const next = ack(choose(open(inClub('scene-payload'), 'squad_place_talk'), 'demand'))
    expect(next.card?.payload?.from).toBe('demand')
    expect(['promise', 'blunt', 'door']).toContain(next.card?.payload?.reply)
    expect(next.card?.payload?.chain).toBe(1)
  })

  it('вариант без продолжения сцену заканчивает', () => {
    // «Уйти, ничего не сказав» — тоже ответ: продолжение возвращают не все
    // варианты, и очередь после этого идёт своим чередом.
    const next = ack(choose(open(inClub('scene-end'), 'squad_place_talk'), 'silent'))
    expect(next.card?.eventKey).not.toBe('squad_place_answer')
  })

  it('цепочка обрывается на потолке глубины', () => {
    // Страховка насоса от кольца A → B → A: шаг с исчерпанной глубиной просто
    // не ставится, игра при этом не застревает.
    const deep = open(inClub('scene-depth'), 'squad_place_talk', { chain: 2 })
    const next = ack(choose(deep, 'ask'))
    expect(next.card?.eventKey).not.toBe('squad_place_answer')
    expect(next.card).not.toBeNull()
  })

  it('сцена переживает сохранение посреди разговора', () => {
    const data = new Map<string, string>()
    const stub: Storage = {
      get length() { return data.size },
      clear: () => data.clear(),
      getItem: (key) => data.get(key) ?? null,
      key: (index) => [...data.keys()][index] ?? null,
      removeItem: (key) => void data.delete(key),
      setItem: (key, value) => void data.set(key, value),
    }
    Object.defineProperty(globalThis, 'localStorage', { value: stub, configurable: true, writable: true })

    const answered = choose(open(inClub('scene-save'), 'squad_place_talk'), 'ask')
    saveState(answered)
    const loaded = loadState()
    expect(loaded).not.toBeNull()
    expect(ack(loaded as CareerState).card?.eventKey).toBe('squad_place_answer')
  })

  it('второй ход не выпадает сам по себе', () => {
    // В лотерее шага быть не должно: он приходит только продолжением.
    expect(getEvent('squad_place_answer').weight).toBe(0)
    expect(getEvent('new_agent_arrives').weight).toBe(0)
  })

  it('травма не обрывает начатую сцену', () => {
    // Полевую ситуацию травмированному не показывают — и правильно. Но шаг
    // сцены этот гейт пропускает, иначе разговор оборвался бы на полуслове.
    const base = inClub('scene-injury')
    const injured: CareerState = { ...base, player: { ...base.player, matchesOut: 3 } }

    const dropped = pump({
      ...injured, card: null, resolution: null,
      queue: [{ t: 'event', key: 'derby_provocation' }, { t: 'event', key: 'squad_place_talk' }],
    })
    expect(dropped.card?.eventKey).toBe('squad_place_talk')

    const kept = pump({
      ...injured, card: null, resolution: null,
      queue: [{ t: 'event', key: 'derby_provocation', payload: { chain: 1 } }],
    })
    expect(kept.card?.eventKey).toBe('derby_provocation')
  })

  it('каждый шаг сцены ссылается на существующее событие', () => {
    // Ключ шага — строка, и опечатка в ней уронила бы игру только у того,
    // кто дошёл до этой ветки. Разыгрываем все варианты всех событий и
    // проверяем каждое продолжение, которое они вернут.
    const state = inClub('scene-scan')
    const found: string[] = []
    for (const def of ALL_EVENTS) {
      for (let attempt = 0; attempt < 8; attempt++) {
        const ctx: EventCtx = {
          state,
          player: state.player,
          club: findClub(state.season?.clubId ?? null),
          ovr: playerOvr(state.player),
          role: 'bench',
          rng: new Rng('scene-scan', `${def.key}-${attempt}`, attempt),
          stage: def.stages[0],
          payload: { kind: 'muscle_strain', severity: 2, tournament: 'world_cup' },
        }
        for (const option of def.build(ctx).options) {
          let next
          try {
            next = resolveCard(def, ctx, option.id).next
          } catch {
            // Событие не собралось с чужим контекстом — это забота теста на
            // переводы, а не этого.
            continue
          }
          if (!next) continue
          found.push(next.key)
          expect({ from: def.key, to: next.key, exists: hasEvent(next.key) })
            .toEqual({ from: def.key, to: next.key, exists: true })
        }
      }
    }
    expect(new Set(found)).toContain('squad_place_answer')
    expect(new Set(found)).toContain('new_agent_arrives')
  })
})
