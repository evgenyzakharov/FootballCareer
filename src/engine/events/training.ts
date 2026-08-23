import { H, attr, flag, gauge, injury, later, money, potential, rel, suspend, trait } from './context'
import type { EventDef } from './context'
import { keyAttrs } from '../attributes'
import { clamp } from '../rng'

export const TRAINING_EVENTS: EventDef[] = [
  {
    key: 'extra_training',
    channel: 'training',
    stages: ['preseason', 'autumn', 'spring'],
    once: false,
    weight: 10,
    when: (c) => c.player.age <= 32,
    build: () => ({
      options: [
        { id: 'push', hints: [H.growthUp, H.injuryRisk] },
        { id: 'balanced', hints: [H.growthUp, H.fitnessDown] },
        { id: 'rest', hints: [H.fitnessUp, H.noEffect] },
      ],
    }),
    resolve: (c, id) => {
      const key = c.rng.pick(keyAttrs(c.player.position))
      if (id === 'push') {
        if (c.rng.chance(clamp(0.26 - c.player.gauges.fitness / 500, 0.1, 0.35))) {
          return {
            outcome: 'hurt',
            effects: [injury('muscle_strain', 1), gauge('fitness', -12), gauge('morale', -6)],
            headline: true,
            tone: 'bad',
          }
        }
        return {
          outcome: 'gain',
          effects: [attr(key, 3), gauge('fitness', -8), gauge('form', 5), gauge('coachTrust', 3)],
          tone: 'good',
        }
      }
      if (id === 'balanced') {
        return { outcome: 'ok', effects: [attr(key, 1), gauge('fitness', -3), gauge('form', 2)], tone: 'good' }
      }
      return { outcome: 'rest', effects: [gauge('fitness', 10), gauge('coachTrust', -2)], tone: 'neutral' }
    },
  },
  {
    key: 'preseason_camp',
    channel: 'training',
    stages: ['preseason'],
    once: false,
    weight: 7,
    build: () => ({
      options: [
        { id: 'altitude', hints: [H.fitnessUp, H.injuryRisk] },
        { id: 'tactical', hints: [H.trustUp, H.growthUp] },
        { id: 'skip', hints: [H.fitnessUp, H.trustDown] },
      ],
    }),
    resolve: (c, id) => {
      if (id === 'altitude') {
        if (c.rng.chance(0.18)) {
          return { outcome: 'overtrained', effects: [gauge('fitness', -14), gauge('form', -10)], tone: 'bad' }
        }
        return {
          outcome: 'strong',
          effects: [attr('physical', 3), gauge('fitness', 12), gauge('form', 4)],
          tone: 'good',
        }
      }
      if (id === 'tactical') {
        return {
          outcome: 'tactical',
          effects: [attr('mental', 2), gauge('coachTrust', 7), rel('manager', 8)],
          tone: 'good',
        }
      }
      return { outcome: 'skip', effects: [gauge('fitness', 6), gauge('coachTrust', -8), rel('manager', -10)], tone: 'bad' }
    },
  },
  {
    key: 'personal_coach',
    channel: 'training',
    stages: ['preseason', 'winter'],
    once: false,
    weight: 6,
    when: (c) => c.player.money > 40_000,
    build: () => ({ bodyParams: { cost: 60_000 }, options: [
      { id: 'hire', hints: [H.growthBig, H.moneyDown, H.gamble] },
      { id: 'decline', hints: [H.noEffect] },
    ] }),
    resolve: (c, id) => {
      if (id === 'decline') return { outcome: 'decline', effects: [] }
      const key = c.rng.pick(keyAttrs(c.player.position))
      if (c.rng.chance(0.72)) {
        return { outcome: 'worked', effects: [attr(key, 4), money(-60_000), gauge('form', 4)], tone: 'good' }
      }
      return {
        outcome: 'failed',
        effects: [attr(key, -2), money(-60_000), gauge('form', -8), gauge('morale', -5)],
        tone: 'bad',
      }
    },
  },
  {
    key: 'nutritionist',
    channel: 'training',
    stages: ['preseason', 'winter'],
    once: false,
    weight: 6,
    build: () => ({ options: [
      { id: 'strict', hints: [H.fitnessUp, H.moraleDown] },
      { id: 'moderate', hints: [H.fitnessUp, H.safe] },
      { id: 'ignore', hints: [H.noEffect] },
    ] }),
    resolve: (_c, id) => {
      if (id === 'strict') {
        return {
          outcome: 'strict',
          effects: [gauge('fitness', 14), attr('physical', 2), gauge('morale', -6), trait('pro_diet')],
          tone: 'good',
        }
      }
      if (id === 'moderate') return { outcome: 'moderate', effects: [gauge('fitness', 7)], tone: 'good' }
      return { outcome: 'ignore', effects: [gauge('fitness', -4)], tone: 'neutral' }
    },
  },
  {
    key: 'gym_bulk',
    channel: 'training',
    stages: ['preseason'],
    once: false,
    weight: 5,
    when: (c) => c.player.age >= 18 && c.player.age <= 30,
    build: () => ({ options: [
      { id: 'bulk', hints: [H.growthUp, H.fitnessDown] },
      { id: 'sprint', hints: [H.growthUp, H.injuryRisk] },
      { id: 'skip', hints: [H.noEffect] },
    ] }),
    resolve: (c, id) => {
      if (id === 'bulk') {
        return { outcome: 'bulk', effects: [attr('physical', 4), attr('pace', -2)], tone: 'neutral' }
      }
      if (id === 'sprint') {
        if (c.rng.chance(0.2)) {
          return { outcome: 'pulled', effects: [injury('hamstring', 1), attr('pace', 1)], tone: 'bad' }
        }
        return { outcome: 'faster', effects: [attr('pace', 3), gauge('fitness', -5)], tone: 'good' }
      }
      return { outcome: 'skip', effects: [] }
    },
  },
  {
    key: 'sports_science',
    channel: 'training',
    stages: ['autumn', 'spring'],
    once: false,
    weight: 5,
    when: (c) => (c.club?.tier ?? 0) >= 3,
    build: () => ({ options: [
      { id: 'follow', hints: [H.fitnessUp, H.minutesDown] },
      { id: 'override', hints: [H.minutesUp, H.injuryRisk] },
    ] }),
    resolve: (c, id) => {
      if (id === 'follow') {
        return {
          outcome: 'follow',
          effects: [gauge('fitness', 16), gauge('coachTrust', -3), trait('managed_load')],
          tone: 'neutral',
        }
      }
      if (c.rng.chance(clamp(0.3 - c.player.gauges.fitness / 400, 0.1, 0.4))) {
        return { outcome: 'broke_down', effects: [injury('overload', 2), gauge('morale', -8)], headline: true, tone: 'bad' }
      }
      return { outcome: 'held', effects: [gauge('coachTrust', 5), gauge('fanLove', 4), gauge('fitness', -10)], tone: 'good' }
    },
  },
  {
    key: 'video_study',
    channel: 'training',
    stages: ['autumn', 'winter', 'spring'],
    once: false,
    weight: 5,
    build: () => ({ options: [
      { id: 'study', hints: [H.growthUp, H.trustUp] },
      { id: 'rest', hints: [H.moraleUp] },
    ] }),
    resolve: (_c, id) =>
      id === 'study'
        ? { outcome: 'study', effects: [attr('mental', 3), gauge('coachTrust', 4)], tone: 'good' }
        : { outcome: 'rest', effects: [gauge('morale', 6)], tone: 'neutral' },
  },
  {
    key: 'mysterious_substance',
    channel: 'medical',
    stages: ['preseason', 'autumn', 'spring'],
    once: true,
    weight: 4,
    when: (c) => c.player.age >= 19,
    build: () => ({ options: [
      { id: 'take', hints: [H.growthBig, H.banRisk] },
      { id: 'refuse', hints: [H.safe, H.mediaUp] },
      { id: 'report', hints: [H.mediaUp, H.lockerDown] },
    ] }),
    resolve: (c, id) => {
      if (id === 'take') {
        if (c.rng.chance(0.28)) {
          return {
            outcome: 'caught',
            effects: [suspend(2), gauge('mediaRep', -45), gauge('fanLove', -25), flag('doping_ban'), gauge('morale', -20)],
            headline: true,
            tone: 'bad',
          }
        }
        return {
          outcome: 'boost',
          effects: [attr('physical', 5), attr('pace', 3), gauge('form', 12), flag('doped'), later('doping_shadow', 2, 'autumn')],
          headline: true,
          tone: 'good',
        }
      }
      if (id === 'refuse') return { outcome: 'refuse', effects: [gauge('mediaRep', 5), trait('clean')], tone: 'neutral' }
      return {
        outcome: 'report',
        effects: [gauge('mediaRep', 22), gauge('lockerRoom', -18), rel('captain', -20), trait('whistleblower')],
        headline: true,
        tone: 'neutral',
      }
    },
  },
  {
    key: 'doping_shadow',
    channel: 'media',
    stages: ['autumn'],
    once: true,
    weight: 0,
    build: () => ({ options: [
      { id: 'deny', hints: [H.mediaDown, H.gamble] },
      { id: 'admit', hints: [H.mediaUp, H.fansDown] },
    ] }),
    resolve: (c, id) => {
      if (id === 'deny') {
        if (c.rng.chance(0.4)) {
          return { outcome: 'exposed', effects: [suspend(1), gauge('mediaRep', -35), gauge('fanLove', -20)], headline: true, tone: 'bad' }
        }
        return { outcome: 'buried', effects: [gauge('mediaRep', -8)], tone: 'neutral' }
      }
      return {
        outcome: 'admit',
        effects: [gauge('mediaRep', 12), gauge('fanLove', -14), gauge('lockerRoom', 6)],
        headline: true,
        tone: 'neutral',
      }
    },
  },
  {
    key: 'academy_finishing_school',
    channel: 'training',
    stages: ['preseason'],
    once: true,
    weight: 8,
    when: (c) => c.player.age <= 19,
    build: () => ({ options: [
      { id: 'stay_late', hints: [H.growthBig, H.moraleDown] },
      { id: 'balance', hints: [H.growthUp, H.moraleUp] },
    ] }),
    resolve: (c, id) => {
      const key = c.rng.pick(keyAttrs(c.player.position))
      return id === 'stay_late'
        ? { outcome: 'stay_late', effects: [attr(key, 3), potential(2), gauge('morale', -8), trait('grinder')], tone: 'good' }
        : { outcome: 'balance', effects: [attr(key, 1), gauge('morale', 8)], tone: 'good' }
    },
  },
]
