import { H, attr, flag, gauge, later, money, rel, trait } from './context'
import type { EventDef } from './context'
import { find } from '../relationships'

export const MEDIA_EVENTS: EventDef[] = [
  {
    key: 'press_criticism',
    channel: 'media',
    stages: ['autumn', 'spring'],
    once: false,
    weight: 8,
    when: (c) => c.player.gauges.coachTrust < 55 && c.player.age >= 19,
    build: (c) => ({
      bodyParams: { manager: find(c.state.relationships, 'manager')?.name ?? { key: 'npc.manager' } },
      options: [
        { id: 'diplomatic', hints: [H.safe, H.mediaUp] },
        { id: 'blunt', hints: [H.fansUp, H.trustDown] },
        { id: 'silent', hints: [H.mediaDown, H.trustUp] },
      ],
    }),
    resolve: (c, id) => {
      if (id === 'diplomatic') {
        return { outcome: 'diplomatic', effects: [gauge('mediaRep', 10), gauge('coachTrust', 4), rel('journalist', 6)], tone: 'good' }
      }
      if (id === 'blunt') {
        return c.rng.chance(0.5)
          ? { outcome: 'blunt_hero', effects: [gauge('fanLove', 16), gauge('mediaRep', 8), gauge('coachTrust', -12)], headline: true, tone: 'neutral' }
          : { outcome: 'blunt_exiled', effects: [gauge('coachTrust', -22), gauge('mediaRep', -14), rel('manager', -25), flag('coach_feud')], headline: true, tone: 'bad' }
      }
      return { outcome: 'silent', effects: [gauge('mediaRep', -8), gauge('coachTrust', 6), rel('journalist', -8)], tone: 'neutral' }
    },
  },
  {
    key: 'relative_post',
    channel: 'media',
    stages: ['autumn', 'winter', 'spring'],
    once: false,
    weight: 6,
    build: (c) => ({
      bodyParams: { relative: { key: `relative.${c.rng.pick(['uncle', 'aunt', 'cousin', 'brother', 'sister'])}` } },
      options: [
        { id: 'support', hints: [H.fansDown, H.moraleUp] },
        { id: 'disown', hints: [H.fansUp, H.moraleDown] },
        { id: 'stay_out', hints: [H.safe] },
      ],
    }),
    resolve: (_c, id) => {
      if (id === 'support') return { outcome: 'support', effects: [gauge('fanLove', -14), gauge('morale', 8), gauge('mediaRep', -8)], tone: 'neutral' }
      if (id === 'disown') return { outcome: 'disown', effects: [gauge('fanLove', 10), gauge('morale', -12)], tone: 'neutral' }
      return { outcome: 'stay_out', effects: [gauge('mediaRep', -4)], tone: 'neutral' }
    },
  },
  {
    key: 'giant_tattoo',
    channel: 'media',
    stages: ['winter'],
    once: true,
    weight: 5,
    when: (c) => c.player.age >= 20,
    build: () => ({ options: [
      { id: 'do_it', hints: [H.fameUp, H.moneyUp, H.mediaDown] },
      { id: 'refuse', hints: [H.safe] },
    ] }),
    resolve: (c, id) => {
      if (id === 'refuse') return { outcome: 'refuse', effects: [] }
      return c.rng.chance(0.55)
        ? { outcome: 'iconic', effects: [gauge('fame', 14), money(150_000), gauge('fanLove', 8), trait('icon_look')], headline: true, tone: 'good' }
        : { outcome: 'mocked', effects: [gauge('fame', 8), money(150_000), gauge('mediaRep', -14), gauge('morale', -6)], headline: true, tone: 'bad' }
    },
  },
  {
    key: 'documentary',
    channel: 'media',
    stages: ['preseason'],
    once: true,
    weight: 5,
    when: (c) => c.player.gauges.fame >= 40,
    build: () => ({ options: [
      { id: 'full_access', hints: [H.fameUp, H.moneyUp, H.lockerDown] },
      { id: 'limited', hints: [H.fameUp, H.safe] },
      { id: 'refuse', hints: [H.noEffect] },
    ] }),
    resolve: (c, id) => {
      if (id === 'full_access') {
        return c.rng.chance(0.55)
          ? { outcome: 'hit', effects: [gauge('fame', 22), money(1_200_000), gauge('lockerRoom', -8)], headline: true, tone: 'good' }
          : { outcome: 'leak', effects: [gauge('fame', 14), money(1_200_000), gauge('lockerRoom', -22), gauge('coachTrust', -12), flag('locker_leak')], headline: true, tone: 'bad' }
      }
      if (id === 'limited') return { outcome: 'limited', effects: [gauge('fame', 10), money(400_000)], tone: 'good' }
      return { outcome: 'refuse', effects: [gauge('mediaRep', -4)], tone: 'neutral' }
    },
  },
  {
    key: 'fan_backlash',
    channel: 'media',
    stages: ['autumn', 'spring'],
    once: false,
    weight: 7,
    when: (c) => c.player.gauges.fanLove < 38,
    build: (c) => ({ bodyParams: { club: c.club?.name ?? '' }, options: [
      { id: 'meet_ultras', hints: [H.fansUp, H.gamble] },
      { id: 'answer_pitch', hints: [H.formDown, H.fansUp] },
      { id: 'ignore', hints: [H.moraleDown] },
    ] }),
    resolve: (c, id) => {
      if (id === 'meet_ultras') {
        return c.rng.chance(0.6)
          ? { outcome: 'peace', effects: [gauge('fanLove', 22), gauge('morale', 8)], headline: true, tone: 'good' }
          : { outcome: 'ambush', effects: [gauge('fanLove', -10), gauge('morale', -16), gauge('mediaRep', -10)], headline: true, tone: 'bad' }
      }
      if (id === 'answer_pitch') {
        return { outcome: 'answer_pitch', effects: [gauge('form', -6), gauge('fanLove', 12), attr('mental', 2)], tone: 'neutral' }
      }
      return { outcome: 'ignore', effects: [gauge('morale', -10), gauge('fanLove', -6)], tone: 'bad' }
    },
  },
  {
    key: 'boot_sponsor',
    channel: 'media',
    stages: ['preseason', 'winter'],
    once: false,
    weight: 6,
    when: (c) => c.player.gauges.fame >= 20,
    build: (c) => ({
      bodyParams: { amount: Math.round(c.player.gauges.fame * 30_000) },
      options: [
        { id: 'sign', hints: [H.moneyUp, H.fameUp] },
        { id: 'hold_out', hints: [H.gamble, H.moneyUp] },
      ],
    }),
    resolve: (c, id) => {
      const base = Math.round(c.player.gauges.fame * 30_000)
      if (id === 'sign') return { outcome: 'sign', effects: [money(base), gauge('fame', 6)], tone: 'good' }
      return c.rng.chance(0.5)
        ? { outcome: 'bigger', effects: [money(Math.round(base * 2.2)), gauge('fame', 10)], headline: true, tone: 'good' }
        : { outcome: 'nothing', effects: [gauge('fame', -4), gauge('morale', -4)], tone: 'bad' }
    },
  },
  {
    key: 'paparazzi',
    channel: 'media',
    stages: ['autumn', 'winter', 'spring'],
    once: false,
    weight: 5,
    when: (c) => c.player.gauges.fame >= 25,
    build: () => ({ options: [
      { id: 'apologise', hints: [H.mediaUp, H.moraleDown] },
      { id: 'joke', hints: [H.fansUp, H.trustDown] },
      { id: 'lawyers', cost: 200_000, hints: [H.moneyDown, H.mediaUp] },
    ] }),
    resolve: (_c, id) => {
      if (id === 'apologise') return { outcome: 'apologise', effects: [gauge('mediaRep', 10), gauge('morale', -6), gauge('coachTrust', 4)], tone: 'neutral' }
      if (id === 'joke') return { outcome: 'joke', effects: [gauge('fanLove', 12), gauge('fame', 8), gauge('coachTrust', -8)], tone: 'neutral' }
      return { outcome: 'lawyers', effects: [money(-200_000), gauge('mediaRep', 14), rel('journalist', -12)], tone: 'neutral' }
    },
  },
  {
    key: 'hot_take_podcast',
    channel: 'media',
    stages: ['winter'],
    once: false,
    weight: 5,
    build: () => ({ options: [
      { id: 'go_on', hints: [H.fameUp, H.gamble] },
      { id: 'decline', hints: [H.safe] },
    ] }),
    resolve: (c, id) => {
      if (id === 'decline') return { outcome: 'decline', effects: [] }
      return c.rng.chance(0.6)
        ? { outcome: 'charming', effects: [gauge('fame', 12), gauge('mediaRep', 12), rel('journalist', 10)], tone: 'good' }
        : { outcome: 'clip', effects: [gauge('fame', 16), gauge('mediaRep', -20), gauge('lockerRoom', -10), later('press_boycott', 1, 'autumn')], headline: true, tone: 'bad' }
    },
  },
  {
    key: 'press_boycott',
    channel: 'media',
    stages: ['autumn'],
    once: false,
    weight: 0,
    build: () => ({ options: [
      { id: 'own_channel', hints: [H.fameUp, H.mediaDown] },
      { id: 'make_peace', cost: 100_000, hints: [H.mediaUp, H.moneyDown] },
    ] }),
    resolve: (_c, id) =>
      id === 'own_channel'
        ? { outcome: 'own_channel', effects: [gauge('fame', 16), gauge('mediaRep', -10), money(300_000), trait('own_media')], tone: 'neutral' }
        : { outcome: 'make_peace', effects: [gauge('mediaRep', 18), money(-100_000), rel('journalist', 16)], tone: 'good' },
  },
  {
    key: 'charity_visit',
    channel: 'life',
    stages: ['winter'],
    once: false,
    weight: 5,
    build: () => ({ options: [
      { id: 'go', cost: 80_000, hints: [H.fansUp, H.mediaUp, H.moneyDown] },
      { id: 'send_money', cost: 250_000, hints: [H.moneyDown, H.safe] },
      { id: 'skip', hints: [H.noEffect] },
    ] }),
    resolve: (_c, id) => {
      if (id === 'go') return { outcome: 'go', effects: [gauge('fanLove', 12), gauge('mediaRep', 14), money(-80_000), gauge('morale', 6)], tone: 'good' }
      if (id === 'send_money') return { outcome: 'send_money', effects: [money(-250_000), gauge('mediaRep', 6)], tone: 'neutral' }
      return { outcome: 'skip', effects: [gauge('mediaRep', -6)], tone: 'neutral' }
    },
  },
  {
    key: 'hostile_stands',
    channel: 'media',
    stages: ['autumn', 'spring'],
    once: false,
    weight: 4,
    when: (c) => c.club !== null && c.role !== 'reserve' && c.player.age >= 18,
    build: () => ({ options: [
      { id: 'leave_pitch', hints: [H.mediaUp, H.trustDown] },
      { id: 'speak_after', hints: [H.mediaUp, H.fameUp] },
      { id: 'play_on', hints: [H.moraleDown, H.growthUp] },
    ] }),
    resolve: (_c, id) => {
      if (id === 'leave_pitch') {
        return {
          outcome: 'leave_pitch',
          effects: [gauge('mediaRep', 14), gauge('fanLove', 6), gauge('coachTrust', -6), gauge('morale', -8)],
          headline: true,
          tone: 'neutral',
        }
      }
      if (id === 'speak_after') {
        return { outcome: 'speak_after', effects: [gauge('mediaRep', 18), gauge('fame', 8), gauge('morale', 4)], headline: true, tone: 'good' }
      }
      return { outcome: 'play_on', effects: [gauge('morale', -12), gauge('form', -6), attr('mental', 3)], tone: 'bad' }
    },
  },
  {
    key: 'betting_ad',
    channel: 'media',
    stages: ['winter'],
    once: false,
    weight: 5,
    when: (c) => c.player.gauges.fame >= 30,
    build: (c) => ({
      bodyParams: { amount: Math.round(c.player.gauges.fame * 40_000) },
      options: [
        { id: 'sign', hints: [H.moneyUp, H.mediaDown] },
        { id: 'refuse', hints: [H.mediaUp] },
      ],
    }),
    resolve: (c, id) =>
      id === 'sign'
        ? {
            outcome: 'sign',
            effects: [money(Math.round(c.player.gauges.fame * 40_000)), gauge('mediaRep', -14), gauge('fanLove', -8)],
            tone: 'neutral',
          }
        : { outcome: 'refuse', effects: [gauge('mediaRep', 10), gauge('morale', 5)], tone: 'good' },
  },
  {
    key: 'tv_show',
    channel: 'media',
    stages: ['preseason', 'winter'],
    once: false,
    weight: 5,
    when: (c) => c.player.gauges.fame >= 25,
    build: () => ({ options: [
      { id: 'go', hints: [H.fameUp, H.trustDown] },
      { id: 'decline', hints: [H.trustUp] },
    ] }),
    resolve: (_c, id) =>
      id === 'go'
        ? { outcome: 'go', effects: [gauge('fame', 14), money(150_000), gauge('coachTrust', -8), gauge('fitness', -6)], tone: 'neutral' }
        : { outcome: 'decline', effects: [gauge('coachTrust', 6), gauge('fame', -2), gauge('form', 3)], tone: 'neutral' },
  }
]
