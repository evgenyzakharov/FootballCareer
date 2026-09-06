import { describe, expect, it } from 'vitest'
import type { Locale } from '../src/engine/types'
import { missingKeys, t } from '../src/i18n'
import { GAUGE_BANDS, bipolarBand, gaugeBand } from '../src/ui/format'

/**
 * Показатели состояния показываются словом, а не числом, и слово выбирается
 * ступенью. Ключи ступеней собираются на лету — `gauge.coachTrust.b6`, — а
 * значит ни один поиск по коду их не найдёт и обычная проверка полноты локалей
 * увидит только те, до которых карьера в прогоне дотянулась. Ступени вроде
 * «ненавидит» встречаются редко, и опечатка в такой строке всплыла бы у игрока,
 * а не в тестах. Поэтому перебираем все восемь у всех восьми показателей.
 */

const GAUGES = [
  'form', 'fitness', 'morale', 'coachTrust',
  'fanLove', 'mediaRep', 'lockerRoom', 'fame',
]

const LOCALES: Locale[] = ['ru', 'en']

describe('ступени показателей', () => {
  it('все восемь есть у каждого показателя в обеих локалях', () => {
    missingKeys.clear()
    const empty: string[] = []
    for (const gauge of GAUGES) {
      for (let band = 0; band < GAUGE_BANDS; band++) {
        for (const locale of LOCALES) {
          const text = t({ key: `gauge.${gauge}.b${band}` }, locale)
          if (text.trim() === '') empty.push(`gauge.${gauge}.b${band} (${locale})`)
        }
      }
    }
    expect([...missingKeys]).toEqual([])
    expect(empty).toEqual([])
  })

  it('название показателя тоже на месте', () => {
    missingKeys.clear()
    for (const gauge of GAUGES) {
      for (const locale of LOCALES) t({ key: `gauge.${gauge}` }, locale)
    }
    expect([...missingKeys]).toEqual([])
  })

  it('соседние ступени не повторяются словами', () => {
    // Две одинаковые подписи подряд означали бы, что одна ступень ничего не
    // добавляет: игрок видел бы «крепкое» и на шестидесяти, и на семидесяти,
    // и движение показателя стало бы невидимым.
    const repeats: string[] = []
    for (const gauge of GAUGES) {
      for (const locale of LOCALES) {
        for (let band = 1; band < GAUGE_BANDS; band++) {
          const prev = t({ key: `gauge.${gauge}.b${band - 1}` }, locale)
          const now = t({ key: `gauge.${gauge}.b${band}` }, locale)
          if (prev === now) repeats.push(`gauge.${gauge}.b${band} (${locale}): ${now}`)
        }
      }
    }
    expect(repeats).toEqual([])
  })
})

describe('раскладка значения по ступеням', () => {
  it('шкала 0..100 делится на восемь равных полос', () => {
    expect(gaugeBand(0)).toBe(0)
    expect(gaugeBand(12.4)).toBe(0)
    expect(gaugeBand(12.5)).toBe(1)
    expect(gaugeBand(50)).toBe(4)
    expect(gaugeBand(87.5)).toBe(7)
    expect(gaugeBand(100)).toBe(7)
  })

  it('за края шкалы не выходит', () => {
    // Значения зажимаются движком, но показывать «⟨gauge.form.b8⟩» из-за
    // случайного перелёта на сотую было бы худшим способом об этом узнать.
    expect(gaugeBand(-40)).toBe(0)
    expect(gaugeBand(160)).toBe(GAUGE_BANDS - 1)
  })

  it('у двусторонней шкалы ноль приходится на стык середины', () => {
    expect(bipolarBand(-100)).toBe(0)
    expect(bipolarBand(-0.1)).toBe(3)
    expect(bipolarBand(0)).toBe(4)
    expect(bipolarBand(100)).toBe(7)
    expect(bipolarBand(-250)).toBe(0)
    expect(bipolarBand(250)).toBe(GAUGE_BANDS - 1)
  })

  it('каждая ступень достижима', () => {
    // Пустая ступень — это подпись, которую не увидит никто: полосу поделили
    // не так, как считает функция.
    const seen = new Set<number>()
    for (let v = 0; v <= 100; v += 0.5) seen.add(gaugeBand(v))
    expect(seen.size).toBe(GAUGE_BANDS)
    const bipolar = new Set<number>()
    for (let v = -100; v <= 100; v += 0.5) bipolar.add(bipolarBand(v))
    expect(bipolar.size).toBe(GAUGE_BANDS)
  })
})
