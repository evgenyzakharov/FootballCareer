import { H, attr, flag, gauge, injury, later, minutes, money, odds, trait } from './context'
import type { EventDef } from './context'
import type { Severity } from '../types'
import { clamp } from '../rng'

/** Тип травмы → тяжесть. Тяжесть определяет, сколько блоков игрок вне игры. */
export const INJURY_TYPES: Array<{ kind: string; severity: Severity; weight: number }> = [
  { kind: 'muscle_strain', severity: 1, weight: 26 },
  { kind: 'hamstring', severity: 1, weight: 22 },
  { kind: 'ankle_knock', severity: 1, weight: 20 },
  { kind: 'bruised_rib', severity: 1, weight: 10 },
  { kind: 'torn_muscle', severity: 2, weight: 14 },
  { kind: 'meniscus', severity: 2, weight: 10 },
  { kind: 'broken_hand', severity: 2, weight: 6 },
  { kind: 'acl', severity: 3, weight: 4 },
  { kind: 'tibia_fracture', severity: 3, weight: 2 },
  { kind: 'achilles', severity: 3, weight: 2 },
]

export const BLOCKS_OUT: Record<Severity, number> = { 1: 0, 2: 1, 3: 2 }

/**
 * Риск травмы за блок. Растёт от нагрузки, падает от свежести;
 * после тяжёлой травмы остаётся выше — отсюда «хрустальные» карьеры.
 */
export function injuryRisk(fitness: number, age: number, priorSevere: number): number {
  const base = 0.16
  const fromFitness = (100 - fitness) * 0.0022
  const fromAge = age > 30 ? (age - 30) * 0.012 : age < 19 ? 0.02 : 0
  const fromHistory = priorSevere * 0.05
  return clamp(base + fromFitness + fromAge + fromHistory, 0.04, 0.6)
}

export const MEDICAL_EVENTS: EventDef[] = [
  {
    key: 'injury_hit',
    channel: 'medical',
    stages: ['autumn', 'spring'],
    once: false,
    weight: 0, // выдаётся движком по результату броска риска
    build: (c) => ({
      bodyParams: { kind: { key: `injury.${c.payload.kind ?? 'muscle_strain'}` } },
      options: [
        { id: 'rush', hints: [H.minutesUp, H.injuryRiskHigh] },
        { id: 'protocol', hints: [H.safe, H.minutesDown] },
        { id: 'specialist', hints: [H.moneyDown, H.fitnessUp] },
      ],
    }),
    resolve: (c, id) => {
      const severity = Number(c.payload.severity ?? 1) as Severity
      const kind = String(c.payload.kind ?? 'muscle_strain')
      if (id === 'rush') {
        if (c.rng.chance(0.42)) {
          return {
            outcome: 'relapse',
            effects: [injury(kind, Math.min(3, severity + 1) as Severity), gauge('fitness', -18), gauge('morale', -12), flag('relapse')],
            headline: true,
            tone: 'bad',
          }
        }
        return {
          outcome: 'rushed_ok',
          effects: [injury(kind, severity), gauge('coachTrust', 8), gauge('fanLove', 8), gauge('fitness', -10)],
          tone: 'good',
        }
      }
      if (id === 'specialist') {
        return {
          outcome: 'specialist',
          effects: [injury(kind, Math.max(1, severity - 1) as Severity), money(-250_000), gauge('fitness', 6)],
          tone: 'good',
        }
      }
      return { outcome: 'protocol', effects: [injury(kind, severity), gauge('fitness', 4)], tone: 'neutral' }
    },
  },
  {
    key: 'injury_at_peak',
    channel: 'medical',
    stages: ['run_in'],
    once: false,
    weight: 5,
    when: (c) => c.player.age >= 20 && (c.club?.tier ?? 1) >= 3,
    build: (c) => ({
      bodyParams: { club: c.club?.name ?? '' },
      options: [
        { id: 'play', hints: [H.fansUp, H.injuryRiskHigh, H.titleOdds] },
        { id: 'recover', hints: [H.safe, H.titleOddsDown, H.trustDown] },
      ],
    }),
    resolve: (c, id) => {
      if (id === 'play') {
        if (c.rng.chance(0.38)) {
          return {
            outcome: 'broke',
            effects: [injury('knee_ligament', 3), gauge('morale', -18), odds('league', 0.7)],
            headline: true,
            tone: 'bad',
          }
        }
        return {
          outcome: 'hero',
          effects: [gauge('fanLove', 18), gauge('coachTrust', 12), gauge('mediaRep', 14), odds('league', 1.4), odds('cup', 1.3), trait('warrior')],
          headline: true,
          tone: 'good',
        }
      }
      return {
        outcome: 'recover',
        effects: [gauge('fitness', 14), gauge('coachTrust', -10), gauge('fanLove', -8), odds('league', 0.8)],
        tone: 'neutral',
      }
    },
  },
  {
    key: 'surgery_choice',
    channel: 'medical',
    stages: ['winter', 'preseason'],
    once: false,
    weight: 0,
    build: () => ({ options: [
      { id: 'abroad', hints: [H.moneyDown, H.fitnessUp] },
      { id: 'club', hints: [H.safe] },
      { id: 'conservative', hints: [H.gamble, H.minutesUp] },
    ] }),
    resolve: (c, id) => {
      if (id === 'abroad') {
        return {
          outcome: 'abroad',
          effects: [money(-600_000), gauge('fitness', 22), attr('physical', 1), trait('rebuilt_knee')],
          tone: 'good',
        }
      }
      if (id === 'conservative') {
        if (c.rng.chance(0.45)) {
          return { outcome: 'failed', effects: [injury('chronic_knee', 3), attr('pace', -4), flag('chronic')], headline: true, tone: 'bad' }
        }
        return { outcome: 'lucky', effects: [gauge('fitness', 8), gauge('coachTrust', 6)], tone: 'good' }
      }
      return { outcome: 'club', effects: [gauge('fitness', 12)], tone: 'neutral' }
    },
  },
  {
    key: 'chronic_pain',
    channel: 'medical',
    stages: ['autumn', 'spring'],
    once: false,
    weight: 4,
    when: (c) => (c.state.flags.chronic ?? 0) > 0 || c.player.injuries.some((i) => i.severity === 3),
    build: () => ({ options: [
      { id: 'injections', hints: [H.minutesUp, H.consequenceLater] },
      { id: 'manage', hints: [H.minutesDown, H.safe] },
    ] }),
    resolve: (_c, id) =>
      id === 'injections'
        ? {
            outcome: 'injections',
            effects: [gauge('form', 8), gauge('coachTrust', 6), attr('physical', -1), later('early_decline', 2, 'preseason')],
            tone: 'neutral',
          }
        : { outcome: 'manage', effects: [gauge('fitness', 12), gauge('coachTrust', -5)], tone: 'neutral' },
  },
  {
    key: 'early_decline',
    channel: 'medical',
    stages: ['preseason'],
    once: true,
    weight: 0,
    build: () => ({ options: [
      { id: 'adapt', hints: [H.growthUp, H.minutesDown] },
      { id: 'deny', hints: [H.gamble] },
    ] }),
    resolve: (c, id) =>
      id === 'adapt'
        ? { outcome: 'adapt', effects: [attr('mental', 4), attr('pace', -3), trait('veteran_brain')], tone: 'neutral' }
        : c.rng.chance(0.5)
          ? { outcome: 'deny_bad', effects: [injury('achilles', 3), gauge('morale', -14)], headline: true, tone: 'bad' }
          : { outcome: 'deny_ok', effects: [gauge('form', 6), gauge('fanLove', 5)], tone: 'good' },
  },
  {
    key: 'fitness_warning',
    channel: 'medical',
    stages: ['winter'],
    once: false,
    weight: 6,
    when: (c) => c.player.gauges.fitness < 45,
    build: () => ({ options: [
      { id: 'break', hints: [H.fitnessUp, H.trustDown] },
      { id: 'push_on', hints: [H.injuryRiskHigh, H.trustUp] },
    ] }),
    resolve: (c, id) => {
      if (id === 'break') {
        return { outcome: 'break', effects: [gauge('fitness', 26), gauge('coachTrust', -8), minutes(0.7)], tone: 'neutral' }
      }
      if (c.rng.chance(0.45)) {
        return { outcome: 'collapsed', effects: [injury('torn_muscle', 2), gauge('morale', -10)], headline: true, tone: 'bad' }
      }
      return { outcome: 'survived', effects: [gauge('coachTrust', 8), gauge('fitness', -6)], tone: 'good' }
    },
  },
]
