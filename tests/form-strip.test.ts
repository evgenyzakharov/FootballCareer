import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { MatchResult } from '../src/engine/types'
import { FormStrip } from '../src/ui/Matches'
import { getClub } from '../src/data/clubs'

/**
 * Под полосой формы раньше лежал список последних матчей: он отвечал про три
 * игры из полусотни, а про остальные не отвечал вовсе. Теперь про каждый матч
 * рассказывает подсказка, и проверять надо именно её содержимое.
 */

const BASE: MatchResult = {
  opponentId: 'milan',
  home: false,
  competition: 'league',
  round: 22,
  minutes: 90,
  started: true,
  goals: 1,
  assists: 0,
  cleanSheet: false,
  goalsConceded: 0,
  yellow: 0,
  red: false,
  rating: 7.4,
  injury: null,
  absence: null,
  teamGoals: 2,
  teamConceded: 2,
}

function strip(matches: MatchResult[]): string {
  return renderToStaticMarkup(createElement(FormStrip, { matches, position: 'CAM' }))
}

describe('полоса формы', () => {
  it('в подсказке к сыгранному матчу есть соперник, счёт, оценка и продуктивность', () => {
    const html = strip([BASE])

    expect(html).toContain(getClub('milan').name.ru)
    expect(html).toContain('тур 22')
    expect(html).toContain('в гостях')
    expect(html).toContain('2:2')
    expect(html).toContain('7.4')
    expect(html).toContain('Голы')
    expect(html).toContain('Передачи')
  })

  it('в подсказке к пропущенному матчу — соперник, счёт и причина, без личной статистики', () => {
    const html = strip([{ ...BASE, minutes: 0, started: false, goals: 0, rating: 0, absence: 'injury' }])

    expect(html).toContain('2:2')
    expect(html).toContain('травма')
    // Оценки у несыгранного матча нет, и нули вместо неё были бы враньём.
    expect(html).not.toContain('Оценка')
    expect(html).not.toContain('Голы')
  })

  it('причина пропуска видна и на самой полосе, а не только в подсказке', () => {
    const injured = strip([{ ...BASE, minutes: 0, rating: 0, absence: 'injury' }])
    const benched = strip([{ ...BASE, minutes: 0, rating: 0, absence: 'squad' }])

    // Значки разные: травма и «не выпустили» — разные новости.
    expect(injured).toContain('form__icon')
    expect(benched).toContain('form__icon')
    expect(injured).not.toEqual(benched)
  })

  it('матч из старого сохранения показывается без счёта, а не ломает подсказку', () => {
    const old = { ...BASE }
    delete old.teamGoals
    delete old.teamConceded
    const html = strip([old])

    expect(html).toContain(getClub('milan').name.ru)
    expect(html).toContain('Оценка')
    expect(html).not.toContain('Счёт')
  })

  it('списка матчей под полосой больше нет', () => {
    const html = strip([BASE, { ...BASE, opponentId: 'inter', minutes: 0, rating: 0, absence: 'squad' }])

    expect(html).not.toContain('feed-matches')
    expect(html).not.toContain('fx__club')
  })
})
