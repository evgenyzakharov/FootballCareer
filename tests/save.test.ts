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

  it('поднимает сохранение v1 до текущей версии, а не выбрасывает его', () => {
    const state = sampleState()
    // В v1 «остаться без клуба» выставляло флаг, но контракт не расторгало.
    const v1 = { ...state, version: 1, flags: { ...state.flags, free_agent: 1, doped: 1 } }
    data.set('football-career:state', JSON.stringify(v1))

    const loaded = loadState()
    expect(loaded).not.toBeNull()
    expect(loaded!.version).toBe(STATE_VERSION)
    // Залипший флаг снят, остальные флаги на месте, карьера цела.
    expect(loaded!.flags.free_agent).toBeUndefined()
    expect(loaded!.flags.doped).toBe(1)
    expect(loaded!.seed).toBe(state.seed)
    expect(loaded!.player.lastName).toBe('ТЕСТОВ')
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
