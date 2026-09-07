import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { CareerState, Stage } from '../src/engine/types'
import { ack, act, choose, newCareer, setIdentity } from '../src/engine/career'
import { ACTIONS, actionForRole, listActions, queueAction, resetActionUses } from '../src/engine/actions'
import { buildCard, getEvent, resolveCard } from '../src/engine/events'
import { PeopleBody } from '../src/ui/Sidebar'
import { playerOvr } from '../src/engine/player'
import { findClub } from '../src/data/clubs'
import { Rng } from '../src/engine/rng'
import { missingKeys, t } from '../src/i18n'

/**
 * Инициатива — единственное место, где карточка появляется не потому, что так
 * решил движок. Отсюда и то, что здесь проверяется: что кнопка действительно
 * открывает разговор, что она не открывает его дважды за сезон и что она не
 * стирает вопрос, на который игрок ещё не ответил.
 */

/** Карьера, доведённая до клуба: без клуба разговаривать не с кем. */
function inClub(seed: string): CareerState {
  let state = setIdentity(newCareer(seed), {
    lastName: 'ТЕСТОВ', shirt: 8, foot: 'right', countryCode: 'ITA', position: 'CM',
  })
  let guard = 0
  while (guard < 2000) {
    guard++
    if (state.resolution) { state = ack(state); continue }
    if (!state.card) break
    if (state.season?.clubId && state.player.age >= 19) break
    const available = state.card.options.filter((o) => !o.disabled)
    state = choose(state, available.length > 0 ? available[0].id : 'next')
  }
  if (!state.season?.clubId) throw new Error('до клуба дойти не удалось')
  return state
}

/**
 * Момент, когда игрок волен что-то предпринять: клуб есть, идёт осень, место в
 * составе не гарантировано и на экране ничего не ждёт ответа.
 */
function ready(seed: string, stage: Stage = 'autumn'): CareerState {
  const state = inClub(seed)
  return {
    ...state,
    stage,
    card: null,
    resolution: null,
    season: { ...state.season!, role: 'bench' },
  }
}

describe('инициатива игрока', () => {
  it('открывает разговор следующей карточкой', () => {
    const after = act(ready('act-open'), 'talk_manager')
    expect(after.card?.eventKey).toBe('squad_place_talk')
    // Событие знает, что пришло по инициативе, а не по лотерее.
    expect(after.card?.payload?.initiative).toBe(1)
  })

  it('разговор с агентом доходит до его ответа', () => {
    const asked = act(ready('act-agent'), 'ask_transfer')
    expect(asked.card?.eventKey).toBe('agent_transfer_request')

    const answered = choose(asked, 'any')
    expect(answered.resolution).not.toBeNull()
    const reply = ack(answered)
    expect(reply.card?.eventKey).toBe('agent_transfer_reply')
    expect(['warm', 'cool', 'cold']).toContain(String(reply.card?.payload?.mood))
  })

  it('«пусть работает» открывает рынок летом', () => {
    const state = ready('act-wants-out')
    const reply = ack(choose(act(state, 'ask_transfer'), 'any'))
    const pushed = choose(reply, 'push')
    expect(pushed.flags.wants_out).toBeGreaterThan(0)
    // И это не бесплатно: тренер узнаёт в тот же день.
    expect(pushed.player.gauges.coachTrust).toBeLessThan(state.player.gauges.coachTrust)
  })

  it('тратится на сезон и второй раз не даётся', () => {
    // Карточку убираем: пока она на экране, причина у всех действий одна —
    // «сначала ответьте», и потраченного за ней не видно.
    const once = { ...act(ready('act-once'), 'talk_manager'), card: null }
    const offer = listActions(once).find((o) => o.key === 'talk_manager')
    expect(offer?.left).toBe(0)
    expect(offer?.reason).toBe('used')

    // Прямой вызов мимо интерфейса тоже не проходит: проверки живут в движке.
    expect(queueAction(once, 'talk_manager')).toBe(once)
  })

  it('счётчики живут один сезон', () => {
    const spent = { 'act.talk_manager': 1, wants_out: 1 }
    expect(resetActionUses(spent)).toEqual({ wants_out: 1 })
  })

  it('в новом сезоне действие снова доступно', () => {
    let state = act(ready('act-next-season'), 'talk_manager')
    const from = state.season!.age
    let guard = 0
    while (guard < 4000 && state.phase === 'season' && state.season!.age === from) {
      guard++
      if (state.resolution) { state = ack(state); continue }
      if (!state.card) break
      const available = state.card.options.filter((o) => !o.disabled)
      state = choose(state, available.length > 0 ? available[0].id : 'next')
    }
    expect(state.season!.age).toBeGreaterThan(from)
    expect(state.flags['act.talk_manager'] ?? 0).toBe(0)
  })

  it('пока на экране решение, инициатива ждёт', () => {
    const state = act(ready('act-busy'), 'talk_manager')
    expect(state.card?.kind).toBe('decision')
    // Своё действие уже потрачено — берём другое, доступное само по себе.
    const offer = listActions(state).find((o) => o.key === 'ask_transfer')
    expect(offer?.reason).toBe('busy')
    expect(act(state, 'ask_transfer')).toBe(state)
  })

  it('в межсезонье о месте в составе не говорят', () => {
    const offer = listActions(ready('act-stage', 'preseason')).find((o) => o.key === 'talk_manager')
    expect(offer?.reason).toBe('stage')
  })

  it('игроку основы объясняют, что говорить не о чем', () => {
    const state = ready('act-role')
    const starter: CareerState = { ...state, season: { ...state.season!, role: 'starter' } }
    expect(listActions(starter).find((o) => o.key === 'talk_manager')?.reason).toBe('role')
  })

  it('каждый разговор привязан к своему собеседнику', () => {
    const state = ready('act-role-map')
    expect(actionForRole(state, 'manager')?.key).toBe('talk_manager')
    expect(actionForRole(state, 'agent')?.key).toBe('ask_transfer')
    // С остальными игра разговоров не заводит: кнопки у них не будет.
    expect(actionForRole(state, 'captain')).toBeNull()
    expect(actionForRole(state, 'journalist')).toBeNull()
  })

  it('доступное действие всегда доходит до карточки', () => {
    // Гейт действия обязан быть не слабее гейта самого события: иначе бит
    // теряется в насосе и кнопка не делает ничего.
    const stages: Stage[] = ['preseason', 'autumn', 'winter', 'spring', 'run_in']
    let checked = 0
    for (const stage of stages) {
      const base = ready(`act-gate-${stage}`, stage)
      for (const def of ACTIONS) {
        const offer = listActions(base).find((o) => o.key === def.key)
        if (offer?.reason !== null) continue
        checked++
        expect({ action: def.key, opened: act(base, def.key).card?.eventKey })
          .toEqual({ action: def.key, opened: def.eventKey })
      }
    }
    expect(checked).toBeGreaterThanOrEqual(ACTIONS.length)
  })

  it('зимой у тёплого ответа агента есть срок', () => {
    const state = ready('act-winter-move', 'winter')
    const ctx = {
      state,
      player: state.player,
      club: findClub(state.season!.clubId),
      ovr: playerOvr(state.player),
      role: 'bench' as const,
      rng: new Rng('act-winter-move', 'reply', 0),
      stage: 'winter' as Stage,
      payload: { mood: 'warm', club: 'inter' } as Record<string, string | number>,
    }
    const def = getEvent('agent_transfer_reply')
    const card = buildCard(def, ctx)
    const move = card.options.find((o) => o.id.startsWith('to:'))
    expect(move?.id).toBe('to:inter')

    const resolution = resolveCard(def, ctx, move!.id)
    expect(resolution.effects).toContainEqual(
      expect.objectContaining({ t: 'transfer', clubId: 'inter', loan: false }),
    )

    // Осенью окно закрыто: тот же тёплый ответ уйти прямо сейчас не даёт.
    const autumn = buildCard(def, { ...ctx, stage: 'autumn' })
    expect(autumn.options.some((o) => o.id.startsWith('to:'))).toBe(false)

    missingKeys.clear()
    for (const locale of ['ru', 'en'] as const) {
      t(card.title, locale)
      t(card.body, locale)
      for (const option of card.options) t(option.label, locale)
      t(resolution.text, locale)
      if (resolution.headline) t(resolution.headline, locale)
    }
    expect([...missingKeys]).toEqual([])
  })

  it('кнопка стоит у человека, с которым разговаривают', () => {
    const state = ready('act-render')
    const html = renderToStaticMarkup(createElement(PeopleBody, { state, onState: () => {} }))
    expect(html).toContain(t({ key: 'action.talk_manager' }, 'ru'))
    expect(html).toContain(t({ key: 'action.ask_transfer' }, 'ru'))

    // В межсезонье о месте в составе не говорят — и кнопка объясняет это на
    // себе, а не подсказкой по наведению, которой на телефоне нет.
    const preseason = renderToStaticMarkup(
      createElement(PeopleBody, { state: ready('act-render-pre', 'preseason'), onState: () => {} }),
    )
    expect(preseason).toContain(t({ key: 'action.reason.stage' }, 'ru'))
    expect(preseason).toContain('disabled=""')

    // Без хода игрока панель остаётся списком: так её рисует боковая колонка.
    const plain = renderToStaticMarkup(createElement(PeopleBody, { state }))
    expect(plain).not.toContain(t({ key: 'action.talk_manager' }, 'ru'))
  })

  it('у каждого действия переведены подпись, подсказка и причины отказа', () => {
    missingKeys.clear()
    const reasons = ['busy', 'club', 'stage', 'used', 'role', 'age']
    for (const locale of ['ru', 'en'] as const) {
      for (const def of ACTIONS) {
        t({ key: `action.${def.key}` }, locale)
        t({ key: `action.${def.key}.about` }, locale)
      }
      for (const reason of reasons) t({ key: `action.reason.${reason}` }, locale)
    }
    expect([...missingKeys]).toEqual([])
  })
})
