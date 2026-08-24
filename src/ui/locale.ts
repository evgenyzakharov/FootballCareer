import { createContext, useContext } from 'react'
import type { Currency, Locale, Text } from '../engine/types'
import { formatMoney, t } from '../i18n'

export const LocaleContext = createContext<Locale>('ru')
export const CurrencyContext = createContext<Currency>('EUR')

export function useLocale(): Locale {
  return useContext(LocaleContext)
}

export function useCurrency(): Currency {
  return useContext(CurrencyContext)
}

/** Хук перевода: компоненты не знают о словаре, только о ключах. */
export function useT(): (text: Text | null | undefined) => string {
  const locale = useLocale()
  const currency = useCurrency()
  return (text) => t(text, locale, currency)
}

/** Деньги в валюте текущей карьеры — чтобы компоненты не тянули её сами. */
export function useMoney(): (value: number) => string {
  const locale = useLocale()
  const currency = useCurrency()
  return (value) => formatMoney(value, locale, currency)
}
