import type { Club, CurrentSeason, Player } from './types'
import { getLeague } from '../data/leagues'
import { averageRating } from './performance'
import { Rng, clamp } from './rng'
import { playerOvr } from './player'

export const AWARD_KEYS = [
  'ballon_dor',
  'golden_boot',
  'best_gk',
  'league_mvp',
  'young_player',
  'puskas',
] as const

export type AwardKey = (typeof AWARD_KEYS)[number]

/** Единая «величина сезона»: от неё считаются почти все награды. */
export function seasonScore(season: CurrentSeason, club: Club): number {
  const rating = averageRating(season.tally.ratingSum, season.tally.ratingCount)
  const league = getLeague(club.leagueId)
  const continental = season.trophies.filter(
    (t) => t === 'ucl' || t === 'libertadores' || t === 'afc_elite' || t === 'caf_cl',
  ).length
  return (
    (rating > 0 ? (rating - 6.7) * 22 : -10) +
    season.tally.goals * 0.6 +
    season.tally.assists * 0.4 +
    // Сухие матчи — это продуктивность вратаря. Без них величина сезона
    // считалась только по голам, и голкипер не мог претендовать ни на что.
    season.tally.cleanSheets * 0.5 +
    season.trophies.length * 6 +
    continental * 10 +
    (season.national.trophy ? 12 : 0) +
    (league.strength - 3) * 3
  )
}

export function rollAwards(player: Player, club: Club, season: CurrentSeason, rng: Rng): AwardKey[] {
  const ovr = playerOvr(player)
  const score = seasonScore(season, club)
  const rating = averageRating(season.tally.ratingSum, season.tally.ratingCount)
  const won: AwardKey[] = []

  if (player.position !== 'GK' && ovr >= 82) {
    const p = clamp((score - 46) / 70, 0, 0.5) * (1 + player.gauges.fame / 250)
    if (rng.chance(p)) won.push('ballon_dor')
  }

  const attacker = ['ST', 'LW', 'RW', 'CAM'].includes(player.position)
  if (attacker && season.tally.goals >= 14) {
    const league = getLeague(club.leagueId)
    const p = clamp((season.tally.goals - 16) / 22, 0, 0.7) * (1.25 - league.strength * 0.05)
    if (rng.chance(p)) won.push('golden_boot')
  }

  if (player.position === 'GK' && season.tally.apps >= 20) {
    // Множитель по оценке был слишком жёстким: при 6.9 он резал шанс вдвое.
    const p = clamp((season.tally.cleanSheets - 10) / 16, 0, 0.55) * clamp(0.5 + (rating - 6.6), 0.2, 1.6)
    if (rng.chance(p)) won.push('best_gk')
  }

  if (season.tally.apps >= 18) {
    const p = clamp((score - 12) / 48, 0, 0.45)
    if (rng.chance(p)) won.push('league_mvp')
  }

  if (player.age <= 21 && season.tally.apps >= 14) {
    const p = clamp((score - 8) / 45, 0, 0.6)
    if (rng.chance(p)) won.push('young_player')
  }

  if (season.tally.goals >= 6) {
    if (rng.chance(clamp(season.tally.goals * 0.0035, 0, 0.09))) won.push('puskas')
  }

  return won
}
