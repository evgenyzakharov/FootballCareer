import { describe, expect, it } from 'vitest'
import { ack, choose, currentOvr, newCareer, setIdentity, squadStanding } from '../src/engine/career'
import type { CareerState, Objective, Position } from '../src/engine/types'
import { averageRating } from '../src/engine/performance'
import { adjustObjective } from '../src/engine/events/structural'
import { Rng } from '../src/engine/rng'
import { playerOvr } from '../src/engine/player'
import { missingKeys, t } from '../src/i18n'
import { ALL_EVENTS } from '../src/engine/events'

/** Прогоняет карьеру до конца, выбирая варианты по сиду. Возвращает финальное состояние. */
function playCareer(
  seed: string,
  options: { renderAll?: boolean; position?: Position; country?: string } = {},
): CareerState {
  let state = setIdentity(newCareer(seed), {
    lastName: 'ТЕСТОВ',
    shirt: 10,
    foot: 'right',
    countryCode: options.country ?? 'ITA',
    position: options.position ?? 'CAM',
  })
  const rng = new Rng(seed, 'player-choices', 0)
  let guard = 0
  while (state.phase !== 'retired' && guard < 4000) {
    guard++
    if (options.renderAll) renderCurrent(state)
    if (state.resolution) {
      state = ack(state)
      continue
    }
    if (!state.card) {
      // Насос должен всегда выдавать карточку, пока карьера не закончена.
      throw new Error(`stuck: phase=${state.phase} stage=${state.stage} queue=${state.queue.length}`)
    }
    const card = state.card
    const optionId = card.options.length > 0 ? rng.pick(card.options).id : 'next'
    state = choose(state, optionId)
  }
  expect(guard).toBeLessThan(4000)
  return state
}

function renderCurrent(state: CareerState): void {
  for (const locale of ['ru', 'en'] as const) {
    if (state.resolution) t(state.resolution.text, locale)
    if (state.card) {
      t(state.card.title, locale)
      t(state.card.body, locale)
      for (const line of state.card.details ?? []) t(line, locale)
      for (const option of state.card.options) {
        t(option.label, locale)
        for (const hint of option.hints) t(hint.text, locale)
      }
    }
    for (const item of state.feed) t(item.text, locale)
  }
}

describe('движок карьеры', () => {
  it('доводит карьеру до конца и накапливает историю', () => {
    const state = playCareer('seed-1')
    expect(state.phase).toBe('retired')
    expect(state.history.length).toBeGreaterThan(3)
    expect(state.clubsPlayed.length).toBeGreaterThan(0)
    expect(state.retiredAt).not.toBeNull()
  })

  it('детерминирован: один сид и те же выборы дают ту же карьеру', () => {
    const a = playCareer('same-seed')
    const b = playCareer('same-seed')
    expect(b.history.map((h) => `${h.age}:${h.clubId}:${h.tally.goals}`)).toEqual(
      a.history.map((h) => `${h.age}:${h.clubId}:${h.tally.goals}`),
    )
    expect(b.retiredAt).toBe(a.retiredAt)
  })

  it('разные сиды дают разные карьеры', () => {
    const a = playCareer('seed-A')
    const b = playCareer('seed-B')
    const key = (s: typeof a) => s.history.map((h) => `${h.clubId}:${h.tally.goals}`).join('|')
    expect(key(a)).not.toEqual(key(b))
  })

  it('игрок старше и не молодеет, OVR остаётся в границах', () => {
    const state = playCareer('aging')
    let previousAge = -1
    for (const season of state.history) {
      expect(season.age).toBeGreaterThan(previousAge)
      previousAge = season.age
      expect(season.ovrEnd).toBeGreaterThanOrEqual(20)
      expect(season.ovrEnd).toBeLessThanOrEqual(99)
    }
    expect(playerOvr(state.player)).toBeLessThanOrEqual(99)
  })

  it('статистика сезона не выходит за физически возможное', () => {
    const state = playCareer('stats')
    for (const season of state.history) {
      expect(season.tally.apps).toBeLessThanOrEqual(52)
      expect(season.tally.goals).toBeLessThanOrEqual(season.tally.apps * 3 + 5)
      expect(season.tally.apps).toBeGreaterThanOrEqual(0)
    }
  })

  it('все тексты, встреченные за карьеры всех амплуа, есть в обеих локалях', () => {
    missingKeys.clear()
    // Амплуа перебираем намеренно: у вратаря свои ситуации, и на одном CAM
    // опечатка в их ключах не всплыла бы.
    const positions: Position[] = ['GK', 'CB', 'LB', 'CDM', 'CM', 'CAM', 'RW', 'ST']
    for (const [i, position] of positions.entries()) {
      playCareer(`i18n-${position}`, { renderAll: true, position })
      playCareer(`i18n-alt-${position}`, { renderAll: true, position, country: i % 2 ? 'BRA' : 'ENG' })
    }
    expect([...missingKeys]).toEqual([])
  })

  it('вратарь получает свои ситуации, а не чужие', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 6; i++) {
      const state = playCareer(`gk-${i}`, { position: 'GK', renderAll: true })
      for (const item of state.feed) seen.add(item.text.key)
    }
    // Хотя бы одна вратарская карточка должна была выпасть за шесть карьер.
    const gkKeys = [...seen].filter((key) => key.startsWith('ev.gk_') || key.startsWith('ev.tournament_moment_gk'))
    expect(gkKeys.length).toBeGreaterThan(0)
  })

  it('полевые эпизоды не выпадают вратарю', () => {
    for (let i = 0; i < 6; i++) {
      const state = playCareer(`gk-excl-${i}`, { position: 'GK' })
      const keys = state.feed.map((item) => item.text.key)
      // Эти карточки описывают игрока с мячом в чужой штрафной.
      expect(keys.some((k) => k.startsWith('ev.title_decider.'))).toBe(false)
      expect(keys.some((k) => k.startsWith('ev.cup_final_penalties.'))).toBe(false)
      expect(keys.some((k) => k.startsWith('ev.last_minute_chance.'))).toBe(false)
      expect(keys.some((k) => k.startsWith('ev.tournament_moment.'))).toBe(false)
    }
  })

  it('у каждого события уникальный ключ', () => {
    const keys = ALL_EVENTS.map((e) => e.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('вердикт по задаче сезона сходится с целью, которая показана игроку', () => {
    // Именно это и разъезжалось: проверка домножала цель на скрытый
    // коэффициент, а в отчёт печаталась исходная.
    for (const seed of ['obj-1', 'obj-2', 'obj-3', 'obj-4', 'obj-5']) {
      const state = playCareer(seed)
      for (const season of state.history) {
        const objective = season.objective
        if (!objective || season.objectiveMet === null) continue
        const achieved =
          objective.kind === 'apps' ? season.tally.apps
            : objective.kind === 'goals' ? season.tally.goals
              : objective.kind === 'assists' ? season.tally.assists
                : objective.kind === 'rating' ? averageRating(season.tally.ratingSum, season.tally.ratingCount)
                  : season.trophies.length
        const expected = objective.kind === 'trophy'
          ? season.trophies.length > 0
          : achieved >= objective.target
        expect(
          season.objectiveMet,
          `сид ${seed}, сезон ${season.age}, ${objective.kind}: достигнуто ${achieved}, цель ${objective.target}`,
        ).toBe(expected)
      }
    }
  })

  it('пересмотр задачи меняет саму цель и остаётся в реальном коридоре', () => {
    const byRating: Objective = { kind: 'rating', target: 6.72, reward: 12, penalty: 10 }
    const up = adjustObjective(byRating, 'up')
    const down = adjustObjective(byRating, 'down')
    // Оценка живёт в коридоре 6–8: домножить 6.72 на 1.25 значило бы 8.4.
    expect(up.target).toBeCloseTo(6.97, 2)
    expect(down.target).toBeCloseTo(6.52, 2)
    // Пообещал больше — выше и награда, и штраф.
    expect(up.reward).toBeGreaterThan(byRating.reward)
    expect(up.penalty).toBeGreaterThan(byRating.penalty)
    expect(down.reward).toBeLessThan(byRating.reward)

    const byGoals: Objective = { kind: 'goals', target: 12, reward: 14, penalty: 12 }
    expect(adjustObjective(byGoals, 'up').target).toBe(15)
    expect(adjustObjective(byGoals, 'down').target).toBe(10)
  })

  it('положение относительно состава считается от текущего клуба', () => {
    // Без клуба сравнивать не с чем.
    expect(squadStanding(newCareer('standing'))).toBeNull()

    let state = setIdentity(newCareer('standing'), {
      lastName: 'ТЕСТОВ',
      shirt: 10,
      foot: 'right',
      countryCode: 'ITA',
      position: 'CAM',
    })
    // Выбираем академию — после этого клуб есть.
    state = ack(choose(state, state.card!.options[0].id))

    const standing = squadStanding(state)
    expect(standing).not.toBeNull()
    // Уровень состава — из таблицы по тиру клуба, разрыв считается от OVR.
    expect([58, 66, 72, 78, 83, 88]).toContain(standing!.level)
    expect(standing!.gap).toBe(currentOvr(state) - standing!.level)
  })
})
