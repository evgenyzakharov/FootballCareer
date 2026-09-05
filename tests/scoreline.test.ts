import { describe, expect, it } from 'vitest'
import type { MatchResult } from '../src/engine/types'
import { simulateBlock } from '../src/engine/performance'
import { seasonFixtures } from '../src/engine/fixtures'
import { createPlayer } from '../src/engine/player'
import { Rng } from '../src/engine/rng'
import { CLUBS, getClub } from '../src/data/clubs'

/**
 * Счёт матча движок начал считать позже остальной статистики, и главное про
 * него — что он не спорит с личной графой игрока. Забить больше команды нельзя,
 * а сухой матч — это и есть ноль пропущенных.
 */

/** Матчи полусезона за клуб: столько, сколько нужно, чтобы редкие случаи выпали. */
function blockMatches(clubId: string, position: 'ST' | 'GK', blocks: number): MatchResult[] {
  const club = getClub(clubId)
  const base = createPlayer(
    { lastName: 'ТЕСТОВ', shirt: 9, foot: 'right', countryCode: 'ITA', position },
    5,
    new Rng('score', 'player', 0),
  )
  const player = { ...base, age: 26 }
  const out: MatchResult[] = []
  for (let i = 0; i < blocks; i++) {
    const result = simulateBlock(
      {
        player, club, role: 'starter', minutesMult: 1, matchesOut: 0, banMatches: 0,
        size: 26, playedBefore: 0, scheduledBefore: 0,
        fixtures: seasonFixtures(club, 26, new Rng('score', 'fixtures', i)),
      },
      new Rng('score', 'block', i),
    )
    out.push(...result.matches)
  }
  return out
}

describe('счёт матча', () => {
  it('есть у каждого матча, включая пропущенный', () => {
    const matches = blockMatches('inter', 'ST', 12)
    const missed = matches.filter((m) => m.minutes === 0)

    // Пропуск без табло читается как «ничего не было»: именно ради него счёт
    // и заводился.
    expect(missed.length).toBeGreaterThan(0)
    for (const match of matches) {
      expect(typeof match.teamGoals).toBe('number')
      expect(typeof match.teamConceded).toBe('number')
      expect(match.teamGoals).toBeGreaterThanOrEqual(0)
      expect(match.teamConceded).toBeGreaterThanOrEqual(0)
    }
  })

  it('не спорит с личной статистикой полевого игрока', () => {
    const played = blockMatches('inter', 'ST', 12).filter((m) => m.minutes > 0)
    const scored = played.filter((m) => m.goals > 0)

    expect(scored.length).toBeGreaterThan(0)
    for (const match of played) {
      expect(match.teamGoals).toBeGreaterThanOrEqual(match.goals)
      if (match.cleanSheet) expect(match.teamConceded).toBe(0)
    }
  })

  it('у вратаря пропущенные командой и его собственные — одно число', () => {
    const played = blockMatches('inter', 'GK', 12).filter((m) => m.minutes > 0)
    const conceded = played.filter((m) => !m.cleanSheet)

    expect(conceded.length).toBeGreaterThan(0)
    for (const match of played) {
      expect(match.teamConceded).toBe(match.goalsConceded)
      if (match.cleanSheet) expect(match.goalsConceded).toBe(0)
    }
  })

  it('сильный состав в той же лиге забивает больше и пропускает меньше', () => {
    // Клубы одной лиги: соперники у них из одного пула, и разницу даёт только
    // ступень состава, а не турнир.
    const seriea = CLUBS.filter((c) => c.leagueId === 'seriea')
    const strong = seriea.reduce((a, b) => (b.tier > a.tier ? b : a))
    const weak = seriea.reduce((a, b) => (b.tier < a.tier ? b : a))
    expect(strong.tier).toBeGreaterThan(weak.tier)

    const mean = (matches: MatchResult[], pick: (m: MatchResult) => number) =>
      matches.reduce((sum, m) => sum + pick(m), 0) / matches.length

    const top = blockMatches(strong.id, 'ST', 10)
    const bottom = blockMatches(weak.id, 'ST', 10)

    expect(mean(top, (m) => m.teamGoals ?? 0)).toBeGreaterThan(mean(bottom, (m) => m.teamGoals ?? 0))
    expect(mean(top, (m) => m.teamConceded ?? 0)).toBeLessThan(mean(bottom, (m) => m.teamConceded ?? 0))
  })
})
