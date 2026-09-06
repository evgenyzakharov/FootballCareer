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

/**
 * Режим проверки: величины показываются числами вместо слов.
 *
 * Живёт рядом с локалью и валютой не случайно — это такой же сквозной способ
 * показа, который знать умеет каждый компонент и не должен тащить через
 * пропсы. Компонент, заменивший число словом или спрятавший его, обязан
 * спросить `useRaw()` и показать исходное значение: иначе проверять
 * калибровку будет нечем.
 */
export const RawContext = createContext(false)

export function useRaw(): boolean {
  return useContext(RawContext)
}
