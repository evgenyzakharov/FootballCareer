import type { Localized } from '../engine/types'

export type Entry = Localized

/** Плоский словарь: ключ → обе локали рядом, чтобы они не расходились. */
export type Content = Record<string, Entry>
