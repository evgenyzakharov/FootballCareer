import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SeasonBar } from '../src/ui/Season'
import { ack, choose, newCareer, setIdentity } from '../src/engine/career'
import type { CurrentSeason, Position, SeasonTally } from '../src/engine/types'
import { AWARD_KEYS, rollAwards, seasonScore } from '../src/engine/awards'
import { createPlayer } from '../src/engine/player'
import { getClub } from '../src/data/clubs'
import { Rng } from '../src/engine/rng'
import { CONTENT } from '../src/i18n/content'

/**
 * Награды выпадают броском, поэтому один сезон ничего не доказывает: считаем
 * долю сезонов с наградой на многих бросках одного и того же сезона.
 */
function tally(over: Partial<SeasonTally> = {}): SeasonTally {
  return {
    apps: 30, goals: 0, assists: 0, cleanSheets: 0, goalsConceded: 0,
    ratingSum: 30 * 90 * 7.2, ratingCount: 30 * 90, yellow: 0, red: 0,
    ...over,
  }
}

function season(over: Partial<SeasonTally> = {}): CurrentSeason {
  return {
    age: 26,
    clubId: 'inter',
    loan: false,
    parentClubId: null,
    ovrStart: 76,
    role: 'starter',
    tally: tally(over),
    national: { caps: 0, goals: 0, cleanSheets: 0, goalsConceded: 0, tournament: null, trophy: null },
    trophies: [],
    awards: [],
    oddsMult: {},
    roundsPlayed: 10,
    matches: [],
    minutesMult: 1,
  }
}

/** Доля из 400 сезонов, в которых выпала награда. */
function rate(position: Position, key: string, over: Partial<SeasonTally> = {}): number {
  const club = getClub('inter')
  const player = {
    ...createPlayer(
      { lastName: 'ТЕСТОВ', shirt: 4, foot: 'right', countryCode: 'ITA', position },
      5,
      new Rng('awards', 'player', 0),
    ),
    age: 26,
  }
  let won = 0
  for (let i = 0; i < 400; i++) {
    if (rollAwards(player, club, season(over), new Rng('awards', 'roll', i)).includes(key as never)) won++
  }
  return won / 400
}

describe('защитник года', () => {
  it('у награды есть ключ и название в обеих локалях', () => {
    expect(AWARD_KEYS).toContain('best_defender')
    expect(CONTENT['award.best_defender'].ru).toBeTruthy()
    expect(CONTENT['award.best_defender'].en).toBeTruthy()
  })

  it('достаётся защите и опорнику, но не полузащите и не нападению', () => {
    const strong = { cleanSheets: 14 }
    for (const position of ['CB', 'LB', 'RB', 'CDM'] as Position[]) {
      expect({ position, wins: rate(position, 'best_defender', strong) > 0.2 })
        .toEqual({ position, wins: true })
    }
    for (const position of ['CM', 'CAM', 'RW', 'ST', 'GK'] as Position[]) {
      expect({ position, wins: rate(position, 'best_defender', strong) })
        .toEqual({ position, wins: 0 })
    }
  })

  it('растёт с сухими матчами, а без них не выпадает вовсе', () => {
    expect(rate('CB', 'best_defender', { cleanSheets: 4 })).toBe(0)
    const few = rate('CB', 'best_defender', { cleanSheets: 9 })
    const many = rate('CB', 'best_defender', { cleanSheets: 16 })
    expect(few).toBeGreaterThan(0)
    expect(many).toBeGreaterThan(few)
  })

  it('за неполный сезон награды нет', () => {
    // Двадцать матчей — тот же порог, что и у вратаря: награду дают за сезон,
    // а не за десять удачных игр.
    expect(rate('CB', 'best_defender', { cleanSheets: 16, apps: 12 })).toBe(0)
  })

  it('считается по той же формуле, что и вратарь года', () => {
    // Один и тот же ноль на табло: расходиться в требованиях этим наградам не
    // с чего. Сравниваем частоты при одинаковых сухих и оценке.
    const over = { cleanSheets: 12 }
    const keeper = rate('GK', 'best_gk', over)
    const defender = rate('CB', 'best_defender', over)
    expect(Math.abs(keeper - defender)).toBeLessThan(0.06)
  })

  it('сухие матчи защитника входят в величину сезона', () => {
    const club = getClub('inter')
    const withClean = seasonScore(season({ cleanSheets: 10 }), club)
    const without = seasonScore(season({ cleanSheets: 0 }), club)
    expect(withClean - without).toBeCloseTo(5, 5)
  })
})

describe('сухие матчи в панели защитника', () => {
  it('защитник видит сухие матчи команды, нападающий — нет', () => {
    // Награда не должна приходить из ниоткуда: цифра, за которую её дают,
    // обязана быть на экране.
    const label = CONTENT['hud.team_clean_sheets'].ru
    expect(render('CB')).toContain(label)
    expect(render('ST')).not.toContain(label)
  })
})

/** Панель игрока в середине первого сезона за клуб. */
function render(position: Position): string {
  let state = setIdentity(newCareer(`hud-${position}`), {
    lastName: 'ТЕСТОВ', shirt: 4, foot: 'right', countryCode: 'ITA', position,
  })
  let guard = 0
  while (guard < 2000) {
    guard++
    if (state.resolution) { state = ack(state); continue }
    if (!state.card) break
    if (state.season?.clubId && state.season.roundsPlayed > 0) break
    const available = state.card.options.filter((o) => !o.disabled)
    state = choose(state, available.length > 0 ? available[0].id : 'next')
  }
  return renderToStaticMarkup(createElement(SeasonBar, { state }))
}
