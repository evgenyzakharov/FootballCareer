import type { Club, Player, Position, Role } from './types'
import { getLeague } from '../data/leagues'
import { playerOvr, squadLevel } from './player'
import { Rng, clamp, round } from './rng'

/** Матчей в одном игровом блоке (полсезона со всеми турнирами). */
export const BLOCK_MATCHES = 26

const ROLE_ORDER: Role[] = ['reserve', 'bench', 'rotation', 'starter', 'star']

export interface RoleContext {
  player: Player
  club: Club
  /** Насколько силён прямой конкурент за позицию: 0 — никого, 1 — равный, 2 — сильнее. */
  rivalPressure: number
}

/**
 * Роль в клубе — центральная величина: от неё зависят минуты, а от минут —
 * статистика, рост и вообще всё остальное.
 */
export function determineRole({ player, club, rivalPressure }: RoleContext): Role {
  const gap = playerOvr(player) - squadLevel(club.tier)
  const score =
    gap * 1.4 +
    (player.gauges.coachTrust - 50) * 0.35 +
    (player.gauges.form - 60) * 0.1 +
    player.gauges.lockerRoom * 0.05 -
    rivalPressure * 5
  if (score >= 14) return 'star'
  if (score >= 4) return 'starter'
  if (score >= -6) return 'rotation'
  if (score >= -16) return 'bench'
  return 'reserve'
}

export function roleShare(role: Role): number {
  switch (role) {
    case 'star': return 0.92
    case 'starter': return 0.8
    case 'rotation': return 0.52
    case 'bench': return 0.24
    case 'reserve': return 0.07
  }
}

export function shiftRole(role: Role, delta: number): Role {
  const idx = clamp(ROLE_ORDER.indexOf(role) + delta, 0, ROLE_ORDER.length - 1)
  return ROLE_ORDER[idx]
}

export function roleRank(role: Role): number {
  return ROLE_ORDER.indexOf(role)
}

/** Голы за матч по позиции: калибровано так, чтобы топ-форвард на 90 OVR давал ~30 за сезон. */
function goalRate(position: Position, ovr: number): number {
  const o = ovr - 55
  switch (position) {
    case 'ST': return 0.1 + o * 0.02
    case 'LW': case 'RW': return 0.06 + o * 0.013
    case 'CAM': return 0.05 + o * 0.011
    case 'LM': case 'RM': return 0.04 + o * 0.008
    case 'CM': return 0.03 + o * 0.006
    case 'CDM': return 0.015 + o * 0.003
    case 'LB': case 'RB': return 0.01 + o * 0.003
    case 'CB': return 0.02 + o * 0.002
    case 'GK': return 0
  }
}

function assistRate(position: Position, ovr: number): number {
  const o = ovr - 55
  switch (position) {
    case 'ST': return 0.04 + o * 0.006
    case 'LW': case 'RW': return 0.06 + o * 0.011
    case 'CAM': return 0.08 + o * 0.014
    case 'LM': case 'RM': return 0.07 + o * 0.012
    case 'CM': return 0.05 + o * 0.009
    case 'CDM': return 0.02 + o * 0.004
    case 'LB': case 'RB': return 0.04 + o * 0.007
    case 'CB': return 0.01 + o * 0.002
    case 'GK': return 0.002
  }
}

export interface BlockResult {
  apps: number
  goals: number
  assists: number
  cleanSheets: number
  goalsConceded: number
  ratingSum: number
  ratingCount: number
  yellow: number
  red: number
  /** Изменения показателей после блока. */
  fitnessDelta: number
  formDelta: number
  trustDelta: number
  fanDelta: number
}

export interface BlockContext {
  player: Player
  club: Club
  role: Role
  /** Множитель минут: травмы, дисквалификации, решения игрока. */
  minutesMult: number
  blocksOut: number
}

export function simulateBlock(ctx: BlockContext, rng: Rng): BlockResult {
  const { player, club, role } = ctx
  const ovr = playerOvr(player)
  const league = getLeague(club.leagueId)

  const available = clamp(BLOCK_MATCHES - ctx.blocksOut * BLOCK_MATCHES, 0, BLOCK_MATCHES)
  const fitnessFactor = 0.65 + (player.gauges.fitness / 100) * 0.35
  const apps = clamp(
    Math.round(available * roleShare(role) * ctx.minutesMult * fitnessFactor * rng.around(1, 0.12)),
    0,
    available,
  )

  // Сильная команда создаёт больше момента, слабая — меньше.
  const teamFactor = 0.82 + club.tier * 0.055
  // Сильная лига — плотнее защита.
  const leagueFactor = 1.12 - league.strength * 0.03
  const formFactor = 0.72 + (player.gauges.form / 100) * 0.56

  const gExp = apps * goalRate(player.position, ovr) * teamFactor * leagueFactor * formFactor
  const aExp = apps * assistRate(player.position, ovr) * teamFactor * leagueFactor * formFactor

  const goals = poisson(gExp, rng)
  const assists = poisson(aExp, rng)

  // Сухие матчи и пропущенные считаем связанно: в каждом «не сухом» матче
  // минимум один мяч. Иначе цифры противоречат друг другу.
  const cleanRate = clamp(0.14 + club.tier * 0.038 + (ovr - 60) * 0.004, 0.02, 0.6)
  const cleanSheets = player.position === 'GK' ? Math.min(apps, poisson(apps * cleanRate, rng)) : 0
  const conceded = player.position === 'GK' && apps > 0
    ? (apps - cleanSheets) + poisson((apps - cleanSheets) * 0.55, rng)
    : 0

  // Оценка: база от разницы с уровнем состава, плюс вклад результативных действий.
  // База 6.6 — это «нормальный игрок основы»; ниже неё показатели начинают падать.
  const contribution = apps > 0 ? (goals + assists * 0.7) / apps : 0
  const baseRating =
    6.6 +
    (ovr - squadLevel(club.tier)) * 0.028 +
    contribution * 1.4 +
    (player.gauges.form - 60) * 0.006 +
    (player.position === 'GK' && apps > 0 ? (cleanSheets / apps) * 1.1 : 0)
  const rating = clamp(round(rng.around(baseRating, 0.22), 2), 4.5, 9.6)

  const aggression = player.position === 'CB' || player.position === 'CDM' ? 1.7 : 1
  const yellow = poisson(apps * 0.09 * aggression, rng)
  const red = rng.chance(clamp(apps * 0.004 * aggression, 0, 0.2)) ? 1 : 0

  // Много игр — падает свежесть; мало игр — падает форма и доверие.
  // Пороги ровно на «нормальном» уровне: середняк держится, слабый теряет место.
  const load = available > 0 ? apps / available : 0
  const fitnessDelta = round(6 - load * 22 + (player.age < 24 ? 3 : player.age > 31 ? -3 : 0), 1)
  const formDelta = round((rating - 6.8) * 9 + (load < 0.25 ? -8 : 0), 1)
  const trustDelta = round((rating - 6.75) * 7 + (load > 0.55 ? 3 : -3), 1)
  const fanDelta = round((rating - 6.85) * 6 + goals * 0.9 + assists * 0.5 - red * 4, 1)

  return {
    apps, goals, assists, cleanSheets, goalsConceded: conceded,
    ratingSum: apps > 0 ? rating * apps : 0,
    ratingCount: apps,
    yellow, red,
    fitnessDelta, formDelta, trustDelta, fanDelta,
  }
}

/** Пуассон через произведение равномерных — достаточно для наших значений λ. */
export function poisson(lambda: number, rng: Rng): number {
  if (lambda <= 0) return 0
  // При больших λ разбиваем на части, чтобы не упереться в точность экспоненты.
  if (lambda > 30) return poisson(lambda / 2, rng) + poisson(lambda / 2, rng)
  const limit = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= rng.float()
  } while (p > limit)
  return k - 1
}

export function averageRating(sum: number, count: number): number {
  return count > 0 ? round(sum / count, 2) : 0
}
