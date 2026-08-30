import { H, attr, flag, gauge, heal, injury, later, minutes, money, odds, rel, trait } from './context'
import type { EventDef } from './context'
import type { Severity } from '../types'

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
        { id: 'specialist', cost: 250_000, hints: [H.moneyDown, H.fitnessUp] },
      ],
    }),
    // Повреждение уже случилось в матче и срок уже назначен: карточка решает
    // не «сломался ли», а как возвращаться. Поэтому здесь лечение, а не травма.
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
          effects: [heal(0.5), gauge('coachTrust', 8), gauge('fanLove', 8), gauge('fitness', -10)],
          tone: 'good',
        }
      }
      if (id === 'specialist') {
        return {
          outcome: 'specialist',
          effects: [heal(0.7), money(-250_000), gauge('fitness', 6)],
          tone: 'good',
        }
      }
      return { outcome: 'protocol', effects: [gauge('fitness', 4)], tone: 'neutral' }
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
      { id: 'abroad', cost: 600_000, hints: [H.moneyDown, H.fitnessUp] },
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
  {
    key: 'painkiller_match',
    channel: 'medical',
    stages: ['spring', 'run_in'],
    once: false,
    weight: 5,
    when: (c) => c.club !== null && (c.player.gauges.fitness < 62 || c.player.injuries.length > 0),
    build: () => ({ options: [
      { id: 'play', hints: [H.trustUp, H.injuryRiskHigh] },
      { id: 'refuse', hints: [H.fitnessUp, H.trustDown] },
      { id: 'own_doctor', cost: 150_000, hints: [H.moneyDown, H.safe] },
    ] }),
    resolve: (c, id) => {
      if (id === 'play') {
        return c.rng.chance(0.5)
          ? { outcome: 'held', effects: [gauge('coachTrust', 12), gauge('fanLove', 9), gauge('form', 6), attr('mental', 1)], tone: 'good' }
          : {
              outcome: 'broke_down',
              effects: [injury('muscle_strain', 2), gauge('morale', -12), gauge('fitness', -10)],
              headline: true,
              tone: 'bad',
            }
      }
      if (id === 'own_doctor') {
        return { outcome: 'own_doctor', effects: [money(-150_000), gauge('fitness', 12), gauge('coachTrust', 3)], tone: 'good' }
      }
      return { outcome: 'refuse', effects: [gauge('coachTrust', -13), rel('manager', -8), gauge('fitness', 10)], tone: 'neutral' }
    },
  },
  {
    key: 'sleep_trouble',
    channel: 'medical',
    stages: ['autumn', 'winter'],
    once: false,
    weight: 5,
    when: (c) => c.player.age >= 19 && (c.player.gauges.form < 55 || c.player.gauges.morale < 50),
    build: () => ({ options: [
      { id: 'psychologist', cost: 80_000, hints: [H.moneyDown, H.moraleUp] },
      { id: 'endure', hints: [H.formDown] },
      { id: 'pills', hints: [H.formUp, H.consequenceLater] },
    ] }),
    resolve: (_c, id) => {
      if (id === 'psychologist') {
        return { outcome: 'psychologist', effects: [money(-80_000), attr('mental', 3), gauge('morale', 12), gauge('form', 6)], tone: 'good' }
      }
      if (id === 'pills') {
        return {
          outcome: 'pills',
          effects: [gauge('form', 8), gauge('fitness', -5), flag('sleeping_pills'), later('sleep_trouble', 1, 'autumn')],
          tone: 'neutral',
        }
      }
      return { outcome: 'endure', effects: [gauge('form', -7), gauge('morale', -8), attr('mental', 1)], tone: 'bad' }
    },
  }
]
