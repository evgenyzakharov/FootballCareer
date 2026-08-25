import { describe, expect, it } from 'vitest'
import { ack, applyEffects, choose, newCareer, setIdentity } from '../src/engine/career'
import type { CareerState } from '../src/engine/types'
import { missingKeys, t } from '../src/i18n'

function start(seed: string): CareerState {
  return setIdentity(newCareer(seed), {
    lastName: 'ТЕСТОВ',
    shirt: 9,
    foot: 'right',
    countryCode: 'ITA',
    position: 'ST',
  })
}

/**
 * В год без клуба первый вариант карточки — подписать клуб. Чтобы проверить
 * сам год простоя, эти варианты пропускаем: подписаться игрок всегда успеет
 * в трансферное окно.
 */
function stayClubless(state: CareerState): string {
  const card = state.card!
  // Недоступные варианты игрок нажать не может — значит, и здесь их не берём.
  const available = card.options.filter((o) => !o.disabled)
  const idle = card.eventKey === 'free_agent_year' || card.eventKey === 'trial_offer'
  const options = idle ? available.filter((o) => !o.id.startsWith('to:')) : available
  const list = options.length > 0 ? options : available
  return list.length > 0 ? list[0].id : 'next'
}

/** Крутит карьеру, пока не выполнится условие. */
function advanceUntil(
  state: CareerState,
  done: (s: CareerState) => boolean,
  limit = 400,
  pick: (s: CareerState) => string = (s) => (s.card!.options.find((o) => !o.disabled)?.id ?? 'next'),
): CareerState {
  let current = state
  let guard = 0
  while (!done(current) && current.phase !== 'retired' && guard < limit) {
    guard++
    for (const locale of ['ru', 'en'] as const) {
      if (current.resolution) t(current.resolution.text, locale)
      if (current.card) {
        t(current.card.title, locale)
        t(current.card.body, locale)
        for (const line of current.card.details ?? []) t(line, locale)
        for (const option of current.card.options) t(option.label, locale)
      }
    }
    if (current.resolution) {
      current = ack(current)
      continue
    }
    if (!current.card) throw new Error(`stuck: stage=${current.stage} phase=${current.phase}`)
    current = choose(current, pick(current))
  }
  return current
}

describe('игрок без клуба', () => {
  it('длинная дисквалификация высушивает рынок предложений', () => {
    let state = start('ban')
    state = advanceUntil(state, (s) => s.phase === 'season')
    state = applyEffects(state, [{ t: 'suspend', blocks: 4 }])
    state = advanceUntil(state, (s) => s.card?.eventKey === 'no_offers')
    expect(state.card?.eventKey).toBe('no_offers')
  })

  it('вариант «остаться без клуба» действительно расторгает контракт', () => {
    let state = start('release')
    state = advanceUntil(state, (s) => s.phase === 'season')
    state = applyEffects(state, [{ t: 'suspend', blocks: 4 }])
    state = advanceUntil(state, (s) => s.card?.eventKey === 'no_offers')

    const trainAlone = state.card!.options.find((o) => o.id === 'train_alone')
    expect(trainAlone).toBeDefined()
    state = ack(choose(state, trainAlone!.id))

    expect(state.contract).toBeNull()
    expect(state.season?.clubId).toBeNull()
  })

  it('год без клуба проходит целиком: возраст растёт, матчей нет, карьера не зависает', () => {
    let state = start('idle-year')
    state = advanceUntil(state, (s) => s.phase === 'season')
    state = applyEffects(state, [{ t: 'suspend', blocks: 4 }])
    state = advanceUntil(state, (s) => s.card?.eventKey === 'no_offers')

    const ageBefore = state.player.age
    const seasonsBefore = state.history.length
    state = ack(choose(state, 'train_alone'))

    // Проживаем сезон без клуба до следующего трансферного окна.
    state = advanceUntil(state, (s) => s.history.length > seasonsBefore, 400, stayClubless)

    const idle = state.history[state.history.length - 1]
    expect(idle.clubId).toBeNull()
    expect(idle.tally.apps).toBe(0)
    expect(idle.trophies).toEqual([])
    expect(idle.national.caps).toBe(0)
    expect(state.player.age).toBe(ageBefore + 1)
  })

  it('из состояния без клуба карьера доходит до конца, а не обрывается', () => {
    let state = start('idle-finish')
    state = advanceUntil(state, (s) => s.phase === 'season')
    state = applyEffects(state, [{ t: 'suspend', blocks: 4 }])
    state = advanceUntil(state, (s) => s.card?.eventKey === 'no_offers')
    state = ack(choose(state, 'train_alone'))

    missingKeys.clear()
    state = advanceUntil(state, (s) => s.phase === 'retired', 2000, stayClubless)

    expect(state.phase).toBe('retired')
    expect(state.history.some((s) => s.clubId === null)).toBe(true)
    // Возрасты в истории строго возрастают — значит ни один сезон не проигран дважды.
    const ages = state.history.map((s) => s.age)
    expect([...ages].sort((a, b) => a - b)).toEqual(ages)
    expect(new Set(ages).size).toBe(ages.length)
    expect([...missingKeys]).toEqual([])
  })
})
