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
    const parsed = JSON.parse(raw) as CareerState
    // Схема поменялась — старую карьеру не мигрируем, а честно выбрасываем.
    if (parsed.version !== STATE_VERSION) return null
    return parsed
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
