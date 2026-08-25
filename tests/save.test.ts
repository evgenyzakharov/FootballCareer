import { beforeEach, describe, expect, it } from 'vitest'
import { STATE_VERSION, newCareer, setIdentity } from '../src/engine/career'
import { clearState, loadState, migrate, saveState } from '../src/engine/save'
import type { CareerState } from '../src/engine/types'

/** Минимальный localStorage в памяти: тесты гоняются без jsdom. */
function installStorage(): Map<string, string> {
  const data = new Map<string, string>()
  const stub: Storage = {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  }
  Object.defineProperty(globalThis, 'localStorage', { value: stub, configurable: true, writable: true })
  return data
}

function sampleState(): CareerState {
  return setIdentity(newCareer('save-test'), {
    lastName: 'ТЕСТОВ',
    shirt: 7,
    foot: 'left',
    countryCode: 'ESP',
    position: 'ST',
  })
}

describe('сохранение', () => {
  let data: Map<string, string>

  beforeEach(() => {
    data = installStorage()
  })

  it('сохраняет и читает состояние без потерь', () => {
    const state = sampleState()
    saveState(state)
    expect(loadState()).toEqual(state)
  })

  it('clearState стирает карьеру', () => {
    saveState(sampleState())
    clearState()
    expect(loadState()).toBeNull()
  })

  it('пустое хранилище и мусор не ломают загрузку', () => {
    expect(loadState()).toBeNull()
    data.set('football-career:state', 'не json')
    expect(loadState()).toBeNull()
    data.set('football-career:state', '{"что-то":1}')
    expect(loadState()).toBeNull()
  })

  it('прогоняет сохранение v1 через всю цепочку миграций', () => {
    const state = sampleState()
    // В v1 «остаться без клуба» выставляло флаг, но контракт не расторгало,
    // а отдельного счётчика дисквалификации ещё не было.
    const player = { ...state.player } as Record<string, unknown>
    delete player.banBlocks
    const v1 = { ...state, player, version: 1, flags: { ...state.flags, free_agent: 1, doped: 1 } }
    data.set('football-career:state', JSON.stringify(v1))

    const loaded = loadState()
    expect(loaded).not.toBeNull()
    expect(loaded!.version).toBe(STATE_VERSION)
    // v1 → v2: залипший флаг снят, остальные на месте.
    expect(loaded!.flags.free_agent).toBeUndefined()
    expect(loaded!.flags.doped).toBe(1)
    // v2 → v3: появился счётчик дисквалификации.
    expect(loaded!.player.banBlocks).toBe(0)
    expect(loaded!.seed).toBe(state.seed)
    expect(loaded!.player.lastName).toBe('ТЕСТОВ')
  })

  it('поднимает сохранение v2, добавляя счётчик дисквалификации', () => {
    const state = sampleState()
    const player = { ...state.player } as Record<string, unknown>
    delete player.banBlocks
    player.blocksOut = 2
    data.set('football-career:state', JSON.stringify({ ...state, player, version: 2 }))

    const loaded = loadState()
    expect(loaded!.version).toBe(STATE_VERSION)
    expect(loaded!.player.banBlocks).toBe(0)
    // Накопленное в v2 остаётся травмой: отличить его от бана уже нельзя.
    expect(loaded!.player.blocksOut).toBe(2)
  })

  it('поднимает сохранение v3, добавляя год сезона и место в лиге', () => {
    const state = sampleState()
    const raw = { ...state, version: 3 } as unknown as Record<string, unknown>
    delete raw.startYear
    raw.history = [
      { age: 16, clubId: 'venezia', tally: { apps: 4, goals: 0, assists: 0, cleanSheets: 0 } },
    ]
    data.set('football-career:state', JSON.stringify(raw))

    const loaded = loadState()
    expect(loaded!.version).toBe(STATE_VERSION)
    expect(loaded!.startYear).toBe(2026)
    // Место в старых карьерах неизвестно — null, а не выдуманная цифра.
    expect(loaded!.history[0].leaguePos).toBeNull()
    expect(loaded!.history[0].tally.goalsConceded).toBe(0)
  })

  it('поднимает сохранение v4, проставляя прежнюю насыщенность сезона', () => {
    const state = sampleState()
    const raw = { ...state, version: 4 } as unknown as Record<string, unknown>
    delete raw.pace
    data.set('football-career:state', JSON.stringify(raw))

    const loaded = loadState()
    expect(loaded!.version).toBe(STATE_VERSION)
    // До выбора карьеры игрались по максимуму — его и сохраняем.
    expect(loaded!.pace).toBe('busy')
  })

  it('сохранение из будущего не принимается', () => {
    const state = sampleState()
    data.set('football-career:state', JSON.stringify({ ...state, version: STATE_VERSION + 5 }))
    expect(loadState()).toBeNull()
  })

  it('migrate возвращает null, если нужной миграции нет', () => {
    // Версия 0 не существовала — цепочку с неё начать нельзя.
    expect(migrate({ version: 0, phase: 'season', seed: 'x', player: {}, history: [] })).toBeNull()
  })

  it('текущая версия проходит миграции без изменений', () => {
    const state = sampleState() as unknown as Record<string, unknown>
    expect(migrate(state)).toEqual(state)
  })
})
