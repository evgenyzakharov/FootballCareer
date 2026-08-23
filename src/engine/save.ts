import type { CareerState, Locale } from './types'
import { STATE_VERSION } from './career'

const STATE_KEY = 'football-career:state'
const LOCALE_KEY = 'football-career:locale'

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    // Приватный режим и заблокированные куки — играем без сохранения.
    return null
  }
}

/** Сырое сохранение: до миграций у него нет гарантий по форме. */
type RawState = Record<string, unknown>

/**
 * Миграции по одному шагу версии: ключ N превращает сохранение версии N в N+1.
 * Пропуск версии недопустим — цепочка идёт последовательно, чтобы каждая
 * миграция знала ровно одну форму на входе.
 */
const MIGRATIONS: Record<number, (state: RawState) => RawState> = {
  // v1 → v2. В v1 вариант «остаться без клуба» выставлял флаг free_agent, но
  // контракт не расторгал: игрок числился свободным агентом и одновременно
  // играл за старый клуб. В v2 свободный агент — реальное состояние с
  // contract: null, поэтому залипший флаг из v1 надо снять, иначе новый код
  // прочитает такое сохранение как «без клуба, но с клубом».
  1: (state) => {
    const flags = { ...(state.flags as Record<string, number> | undefined) }
    delete flags.free_agent
    return { ...state, flags, version: 2 }
  },
}

/** Минимальная проверка формы: битый или чужой JSON не должен ронять игру. */
function looksLikeState(value: unknown): value is RawState {
  if (typeof value !== 'object' || value === null) return false
  const state = value as RawState
  return (
    typeof state.version === 'number' &&
    typeof state.phase === 'string' &&
    typeof state.seed === 'string' &&
    typeof state.player === 'object' &&
    state.player !== null &&
    Array.isArray(state.history)
  )
}

/**
 * Прогоняет сохранение по цепочке миграций до текущей версии.
 * Возвращает null, если версия из будущего или нужной миграции нет.
 */
export function migrate(state: RawState): RawState | null {
  let current = state
  let guard = 0
  while ((current.version as number) < STATE_VERSION) {
    if (guard++ > 32) return null
    const from = current.version as number
    const step = MIGRATIONS[from]
    if (!step) return null
    current = step(current)
    // Миграция обязана поднять версию, иначе цикл не сойдётся.
    if ((current.version as number) <= from) return null
  }
  // Сохранение новее кода: откатывать не умеем.
  return (current.version as number) === STATE_VERSION ? current : null
}

export function saveState(state: CareerState): void {
  const store = storage()
  if (!store) return
  try {
    store.setItem(STATE_KEY, JSON.stringify(state))
  } catch {
    // Квота кончилась — молча продолжаем без сохранения.
  }
}

export function loadState(): CareerState | null {
  const store = storage()
  if (!store) return null
  const raw = store.getItem(STATE_KEY)
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!looksLikeState(parsed)) return null
    const migrated = migrate(parsed)
    return migrated as CareerState | null
  } catch {
    return null
  }
}

export function clearState(): void {
  storage()?.removeItem(STATE_KEY)
}

export function saveLocale(locale: Locale): void {
  storage()?.setItem(LOCALE_KEY, locale)
}

export function loadLocale(): Locale {
  const value = storage()?.getItem(LOCALE_KEY)
  return value === 'en' ? 'en' : 'ru'
}
