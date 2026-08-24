import { H, attr, flag, gauge, minutes, money, rel, trait } from './context'
import type { EventDef } from './context'
import { find } from '../relationships'

export const LOCKER_EVENTS: EventDef[] = [
  {
    key: 'rival_signing',
    channel: 'locker',
    stages: ['preseason', 'winter'],
    once: false,
    weight: 9,
    when: (c) => c.club !== null && c.player.age >= 18,
    build: (c) => ({
      bodyParams: { club: c.club?.name ?? '', position: { key: `pos.${c.player.position}` } },
      options: [
        { id: 'fight', hints: [H.growthUp, H.gamble] },
        { id: 'talk', hints: [H.trustUp, H.lockerDown] },
        { id: 'sulk', hints: [H.moraleDown, H.minutesDown] },
      ],
    }),
    resolve: (c, id) => {
      if (id === 'fight') {
        if (c.rng.chance(0.6)) {
          return {
            outcome: 'won_place',
            effects: [gauge('coachTrust', 12), gauge('form', 8), attr('mental', 2), trait('competitor')],
            headline: true,
            tone: 'good',
          }
        }
        return { outcome: 'lost_place', effects: [gauge('coachTrust', -10), gauge('morale', -10), minutes(0.7)], tone: 'bad' }
      }
      if (id === 'talk') {
        return { outcome: 'talk', effects: [gauge('coachTrust', 8), gauge('lockerRoom', -6), rel('manager', 6)], tone: 'neutral' }
      }
      return { outcome: 'sulk', effects: [gauge('morale', -12), gauge('coachTrust', -8), minutes(0.6)], tone: 'bad' }
    },
  },
  {
    key: 'young_prospect',
    channel: 'locker',
    stages: ['preseason', 'autumn'],
    once: false,
    weight: 7,
    when: (c) => c.player.age >= 27,
    build: () => ({ options: [
      { id: 'mentor', hints: [H.lockerUp, H.minutesDown] },
      { id: 'freeze', hints: [H.minutesUp, H.lockerDown] },
      { id: 'ask_exit', hints: [H.leaveClub] },
    ] }),
    resolve: (_c, id) => {
      if (id === 'mentor') {
        return {
          outcome: 'mentor',
          effects: [gauge('lockerRoom', 16), gauge('fanLove', 8), minutes(0.85), trait('mentor'), flag('mentored')],
          tone: 'good',
        }
      }
      if (id === 'freeze') {
        return { outcome: 'freeze', effects: [gauge('lockerRoom', -14), minutes(1.15), gauge('coachTrust', -4)], tone: 'neutral' }
      }
      return { outcome: 'ask_exit', effects: [flag('wants_out'), gauge('coachTrust', -6)], tone: 'neutral' }
    },
  },
  {
    key: 'captain_armband',
    channel: 'locker',
    stages: ['preseason'],
    once: true,
    weight: 8,
    when: (c) => c.player.gauges.lockerRoom >= 55 && c.player.age >= 25,
    build: (c) => ({ bodyParams: { club: c.club?.name ?? '' }, options: [
      { id: 'accept', hints: [H.lockerUp, H.trustUp] },
      { id: 'decline', hints: [H.safe, H.lockerDown] },
    ] }),
    resolve: (_c, id) =>
      id === 'accept'
        ? {
            outcome: 'accept',
            effects: [gauge('lockerRoom', 20), gauge('coachTrust', 10), gauge('fanLove', 10), attr('mental', 3), trait('captain')],
            headline: true,
            tone: 'good',
          }
        : { outcome: 'decline', effects: [gauge('lockerRoom', -8), gauge('morale', 4)], tone: 'neutral' },
  },
  {
    key: 'dressing_room_row',
    channel: 'locker',
    stages: ['autumn', 'spring'],
    once: false,
    weight: 7,
    build: (c) => ({
      bodyParams: { name: find(c.state.relationships, 'captain')?.name ?? { key: 'npc.teammate' } },
      options: [
        { id: 'apologise', hints: [H.lockerUp, H.moraleDown] },
        { id: 'stand_firm', hints: [H.gamble, H.lockerDown] },
        { id: 'go_public', hints: [H.mediaDown, H.fansUp] },
      ],
    }),
    resolve: (c, id) => {
      if (id === 'apologise') {
        return { outcome: 'apologise', effects: [gauge('lockerRoom', 10), gauge('morale', -6), rel('captain', 12)], tone: 'neutral' }
      }
      if (id === 'stand_firm') {
        return c.rng.chance(0.5)
          ? { outcome: 'respected', effects: [gauge('lockerRoom', 14), attr('mental', 2)], tone: 'good' }
          : { outcome: 'isolated', effects: [gauge('lockerRoom', -18), gauge('form', -8), rel('captain', -18)], tone: 'bad' }
      }
      return {
        outcome: 'go_public',
        effects: [gauge('mediaRep', -18), gauge('fanLove', 8), gauge('lockerRoom', -12), rel('journalist', 10)],
        headline: true,
        tone: 'bad',
      }
    },
  },
  {
    key: 'penalty_duty',
    channel: 'locker',
    stages: ['preseason', 'autumn'],
    once: false,
    weight: 6,
    when: (c) => c.player.position !== 'GK' && c.player.position !== 'CB' && c.ovr >= 68,
    build: () => ({ options: [
      { id: 'take', hints: [H.fameUp, H.gamble] },
      { id: 'pass', hints: [H.safe] },
    ] }),
    resolve: (c, id) => {
      if (id === 'pass') return { outcome: 'pass', effects: [gauge('lockerRoom', -4)], tone: 'neutral' }
      return c.rng.chance(0.7)
        ? {
            outcome: 'reliable',
            effects: [{ t: 'stat', key: 'goals', delta: c.rng.int(3, 7) }, gauge('fame', 8), trait('penalty_taker')],
            tone: 'good',
          }
        : { outcome: 'missed', effects: [gauge('fanLove', -12), gauge('form', -10), gauge('mediaRep', -8)], headline: true, tone: 'bad' }
    },
  },
  {
    key: 'teammate_partner',
    channel: 'life',
    stages: ['autumn', 'winter', 'spring'],
    once: true,
    weight: 4,
    when: (c) => c.player.age >= 20,
    build: () => ({ options: [
      { id: 'refuse', hints: [H.safe, H.lockerUp] },
      { id: 'accept', hints: [H.gamble, H.mediaDown] },
    ] }),
    resolve: (c, id) => {
      if (id === 'refuse') return { outcome: 'refuse', effects: [gauge('lockerRoom', 6), trait('loyal')], tone: 'neutral' }
      return c.rng.chance(0.45)
        ? {
            outcome: 'scandal',
            effects: [gauge('lockerRoom', -30), gauge('mediaRep', -30), gauge('form', -14), flag('scandal')],
            headline: true,
            tone: 'bad',
          }
        : { outcome: 'quiet', effects: [gauge('morale', 6), gauge('lockerRoom', -6)], tone: 'neutral' }
    },
  },
  {
    key: 'bonus_dispute',
    channel: 'locker',
    stages: ['winter'],
    once: false,
    weight: 5,
    when: (c) => (c.club?.tier ?? 1) <= 4 && c.player.age >= 22,
    build: () => ({ options: [
      { id: 'lead', hints: [H.lockerUp, H.trustDown] },
      { id: 'stay_out', hints: [H.safe, H.lockerDown] },
      { id: 'side_board', hints: [H.moneyUp, H.lockerDown] },
    ] }),
    resolve: (_c, id) => {
      if (id === 'lead') {
        return { outcome: 'lead', effects: [gauge('lockerRoom', 18), gauge('coachTrust', -8), gauge('mediaRep', -6), trait('union_man')], headline: true, tone: 'neutral' }
      }
      if (id === 'side_board') {
        return { outcome: 'side_board', effects: [money(400_000), gauge('lockerRoom', -20), gauge('coachTrust', 6)], tone: 'neutral' }
      }
      return { outcome: 'stay_out', effects: [gauge('lockerRoom', -6)], tone: 'neutral' }
    },
  },
  {
    key: 'new_manager',
    channel: 'board',
    stages: ['preseason'],
    once: false,
    weight: 0,
    build: (c) => ({
      bodyParams: {
        name: find(c.state.relationships, 'manager')?.name ?? { key: 'npc.manager' },
        style: { key: `style.${find(c.state.relationships, 'manager')?.meta?.style ?? 'possession'}` },
      },
      options: [
        { id: 'adapt', hints: [H.trustUp, H.growthUp] },
        { id: 'insist', hints: [H.gamble, H.minutesUp] },
        { id: 'seek_exit', hints: [H.leaveClub] },
      ],
    }),
    resolve: (c, id) => {
      if (id === 'adapt') {
        return { outcome: 'adapt', effects: [gauge('coachTrust', 12), attr('mental', 2), rel('manager', 14)], tone: 'good' }
      }
      if (id === 'insist') {
        return c.rng.chance(0.45)
          ? { outcome: 'insist_ok', effects: [gauge('coachTrust', 8), minutes(1.15), rel('manager', 6)], tone: 'good' }
          : { outcome: 'insist_bad', effects: [gauge('coachTrust', -14), minutes(0.65), rel('manager', -16)], tone: 'bad' }
      }
      return { outcome: 'seek_exit', effects: [flag('wants_out'), gauge('coachTrust', -10), rel('agent', 8)], tone: 'neutral' }
    },
  },
]
