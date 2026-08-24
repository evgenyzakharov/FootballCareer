import type { Currency, Locale, Localized, Text, TextParam } from '../engine/types'
import { CONTENT } from './content'




/** Ключи-подстановки, которые всегда показываются как деньги. */
const MONEY_PARAMS = new Set(['wage', 'amount', 'fair', 'current', 'cost', 'fee', 'money', 'value', 'prize'])

/** Собираем ненайденные ключи — на них есть тест, который гоняет целые карьеры. */
export const missingKeys = new Set<string>()

/**
 * Курс — игровая константа, а не реальный курс валют: движок держит все суммы
 * в евро, рубли получаются пересчётом по фиксированному числу. Цифры в рублях
 * поэтому условны и не годятся ни для каких выводов о настоящих зарплатах.
 */
const RUB_PER_EUR = 100

export function formatMoney(value: number, locale: Locale, currency: Currency = 'EUR'): string {
  const rub = currency === 'RUB'
  const sign = value < 0 ? '−' : ''
  const abs = Math.abs(value) * (rub ? RUB_PER_EUR : 1)
  // Евро принято ставить перед суммой, рубль — после: «€15 млн» и «15 млн ₽».
  const wrap = (body: string) => (rub ? `${sign}${body} ₽` : `${sign}€${body}`)
  if (abs >= 1_000_000_000) return wrap(`${round(abs / 1_000_000_000)}${locale === 'ru' ? ' млрд' : 'B'}`)
  if (abs >= 1_000_000) return wrap(`${round(abs / 1_000_000)}${locale === 'ru' ? ' млн' : 'M'}`)
  if (abs >= 1_000) return wrap(`${round(abs / 1_000)}${locale === 'ru' ? ' тыс' : 'K'}`)
  return wrap(String(Math.round(abs)))
}

function round(value: number): string {
  const r = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10
  return String(r)
}

function isLocalized(value: TextParam): value is Localized {
  return typeof value === 'object' && value !== null && 'ru' in value && 'en' in value
}

function isText(value: TextParam): value is { key: string } {
  return typeof value === 'object' && value !== null && 'key' in value
}

function renderParam(name: string, value: TextParam, locale: Locale, currency: Currency): string {
  if (isLocalized(value)) return value[locale]
  if (isText(value)) return t({ key: value.key }, locale, currency)
  if (typeof value === 'number') {
    if (MONEY_PARAMS.has(name)) return formatMoney(value, locale, currency)
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100)
  }
  return value
}

export function lookup(key: string, locale: Locale): string | null {
  const entry = CONTENT[key]
  return entry ? entry[locale] : null
}

export function t(text: Text | null | undefined, locale: Locale, currency: Currency = 'EUR'): string {
  if (!text) return ''
  const template = lookup(text.key, locale)
  if (template === null) {
    missingKeys.add(text.key)
    return `⟨${text.key}⟩`
  }
  if (!text.params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = text.params?.[name]
    return value === undefined ? match : renderParam(name, value, locale, currency)
  })
}

export function has(key: string): boolean {
  return key in CONTENT
}

export { CONTENT }
