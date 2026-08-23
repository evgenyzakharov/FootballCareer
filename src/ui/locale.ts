import { createContext, useContext } from 'react'
import type { Locale, Text } from '../engine/types'
import { t } from '../i18n'

export const LocaleContext = createContext<Locale>('ru')

export function useLocale(): Locale {
  return useContext(LocaleContext)
}

/** Хук перевода: компоненты не знают о словаре, только о ключах. */
export function useT(): (text: Text | null | undefined) => string {
  const locale = useLocale()
  return (text) => t(text, locale)
}
