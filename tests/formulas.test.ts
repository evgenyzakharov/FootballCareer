import { describe, expect, it } from 'vitest'
import { ATTR_KEYS, ageBand, attrAgeBand, marketValue } from '../src/engine/attributes'
import type { AttrKey } from '../src/engine/types'

/**
 * Точечные тесты на формулы, которые сквозной прогон карьеры не ловит: он
 * проверяет границы («OVR не ушёл за 99», «стоимость не отрицательная»), а
 * сдвиг самой кривой на 15% проходит мимо него незамеченным. Здесь у кривых
 * закреплены и форма, и опорные точки.
 */

const AGES = Array.from({ length: 25 }, (_, i) => 16 + i)

/** Порядок округления: цена в трансферных новостях — это две значащие цифры. */
function magnitude(value: number): number {
  return 10 ** Math.max(3, Math.floor(Math.log10(value)) - 1)
}

describe('стоимость игрока', () => {
  it('растёт по OVR быстрее, чем линейно', () => {
    const age = 22
    // Каждый шаг по таблице дороже предыдущего: разница между 75 и 70 должна
    // быть больше, чем между 70 и 65, иначе топовый игрок ничем не выделяется.
    const steps = [55, 60, 65, 70, 75, 80, 85, 90].map((ovr) => marketValue(ovr, age))
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]).toBeGreaterThan(steps[i - 1])
      if (i >= 2) {
        expect(steps[i] - steps[i - 1]).toBeGreaterThan(steps[i - 1] - steps[i - 2])
      }
    }
    // Десять пунктов OVR на пике кривой — это порядок величины, а не проценты.
    expect(marketValue(80, age) / marketValue(70, age)).toBeGreaterThan(5)
  })

  it('дороже всего игрок стоит в 20–23, а не на пике формы', () => {
    const byAge = AGES.map((age) => ({ age, value: marketValue(75, age) }))
    const best = byAge.reduce((a, b) => (b.value > a.value ? b : a))
    expect(best.age).toBeGreaterThanOrEqual(20)
    expect(best.age).toBeLessThanOrEqual(23)
    // После 23 цена только падает: возраст не может вернуть игроку стоимость.
    const after = byAge.filter((x) => x.age >= 24).map((x) => x.value)
    for (let i = 1; i < after.length; i++) expect(after[i]).toBeLessThanOrEqual(after[i - 1])
    // Ровесник по силе, но на десять лет старше, стоит кратно дешевле.
    expect(marketValue(75, 22) / marketValue(75, 33)).toBeGreaterThan(4)
  })

  it('между узлами таблицы цена интерполируется, а не прыгает ступенькой', () => {
    const low = marketValue(70, 27)
    const mid = marketValue(72, 27)
    const high = marketValue(75, 27)
    expect(mid).toBeGreaterThan(low)
    expect(mid).toBeLessThan(high)
  })

  it('цена округлена до двух значащих цифр', () => {
    for (const ovr of [47, 58, 63, 71, 78, 84, 91, 97]) {
      for (const age of [18, 22, 27, 31, 36]) {
        const value = marketValue(ovr, age)
        expect(value % magnitude(value)).toBe(0)
      }
    }
  })

  it('значения за границами таблицы не ломают цену', () => {
    expect(marketValue(20, 25)).toBe(marketValue(40, 25))
    expect(marketValue(120, 25)).toBe(marketValue(99, 25))
    // На дне кривой цена остаётся деньгами: 40 000 базы на 0.12 за возраст —
    // это 4800, и при нижнем порядке округления в 10 000 такой игрок стоил
    // ровно ноль. Теперь порядок — тысяча.
    expect(marketValue(40, 36)).toBe(5_000)
    expect(marketValue(50, 36)).toBe(12_000)
    for (const age of AGES) expect(marketValue(40, age)).toBeGreaterThan(0)
    // Ни одно сочетание уровня и возраста не оставляет игрока без цены.
    for (let ovr = 40; ovr <= 99; ovr++) {
      for (const age of AGES) expect({ ovr, age, free: marketValue(ovr, age) === 0 })
        .toEqual({ ovr, age, free: false })
    }
  })

  it('опорные точки кривой стоимости', () => {
    // Снимок кривой: тест падает, если её сдвинули, — это и есть цель.
    expect(marketValue(60, 22)).toBe(630_000)
    expect(marketValue(70, 22)).toBe(3_800_000)
    expect(marketValue(75, 22)).toBe(10_000_000)
    expect(marketValue(85, 22)).toBe(69_000_000)
    expect(marketValue(70, 27)).toBe(2_900_000)
    expect(marketValue(75, 30)).toBe(6_000_000)
    expect(marketValue(75, 34)).toBe(2_200_000)
    expect(marketValue(99, 25)).toBe(280_000_000)
  })
})

/** Первый возраст, в котором атрибут уже не растёт даже при удачном броске. */
function firstDeclineAge(attr: AttrKey): number {
  return AGES.find((age) => attrAgeBand(attr, age)[1] <= 0) ?? 99
}

describe('возрастной коридор атрибутов', () => {
  it('коридор задан от меньшего к большему и с возрастом только опускается', () => {
    for (const attr of ATTR_KEYS) {
      let previous: [number, number] | null = null
      for (const age of AGES) {
        const [min, max] = attrAgeBand(attr, age)
        expect(min).toBeLessThanOrEqual(max)
        if (previous) {
          expect(min).toBeLessThanOrEqual(previous[0])
          expect(max).toBeLessThanOrEqual(previous[1])
        }
        previous = [min, max]
      }
    }
  })

  it('в семнадцать растёт всё, в сорок падает всё', () => {
    for (const attr of ATTR_KEYS) {
      expect(attrAgeBand(attr, 17)[0]).toBeGreaterThan(0)
      // К тридцати пяти чтение игры ещё может подрасти на единицу — это и
      // есть сдвиг пика; к сорока не растёт уже ничто.
      expect(attrAgeBand(attr, 40)[1]).toBeLessThan(0)
    }
  })

  it('атрибуты садятся в свой черёд: скорость первой, чтение игры последним', () => {
    // Ради этого порядка и заведён сдвиг пика: 33-летний плеймейкер ещё
    // полезен, а 33-летний вингер уже нет.
    expect(firstDeclineAge('pace')).toBeLessThan(firstDeclineAge('shooting'))
    expect(firstDeclineAge('shooting')).toBeLessThan(firstDeclineAge('defending'))
    expect(firstDeclineAge('defending')).toBeLessThan(firstDeclineAge('passing'))
    expect(firstDeclineAge('passing')).toBeLessThan(firstDeclineAge('mental'))
    // Разброс между крайними атрибутами — годы, а не один сезон.
    expect(firstDeclineAge('mental') - firstDeclineAge('pace')).toBeGreaterThanOrEqual(6)
  })

  it('коридор атрибута — это общий коридор, сдвинутый по возрасту', () => {
    // pace стареет на три года раньше срока, mental — на шесть позже.
    expect(attrAgeBand('pace', 25)).toEqual(ageBand(28))
    expect(attrAgeBand('mental', 30)).toEqual(ageBand(24))
    expect(attrAgeBand('shooting', 26)).toEqual(ageBand(26))
  })

  it('опорные точки коридоров', () => {
    // Снимок в двух возрастах: до пика и после него.
    expect(attrAgeBand('pace', 24)).toEqual([1, 3])
    expect(attrAgeBand('mental', 24)).toEqual([4, 9])
    expect(attrAgeBand('goalkeeping', 24)).toEqual([3, 7])
    expect(attrAgeBand('pace', 30)).toEqual([-2, -1])
    expect(attrAgeBand('mental', 30)).toEqual([2, 5])
    expect(attrAgeBand('passing', 30)).toEqual([1, 3])
  })

  it('общий коридор держит границы таблицы', () => {
    expect(ageBand(10)).toEqual([4, 9])
    expect(ageBand(18)).toEqual([4, 9])
    expect(ageBand(19)).toEqual([3, 7])
    expect(ageBand(99)).toEqual([-5, -3])
    expect(ageBand(120)).toEqual([-5, -3])
  })
})
