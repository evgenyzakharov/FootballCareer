import { H, attr, flag, gauge, later, minutes, potential, rel, trait } from './context'
import type { EventDef } from './context'
import { COUNTRIES, getCountry } from '../../data/countries'
import { NATIONAL_TOURNAMENT } from '../competitions'

export const NATIONAL_EVENTS: EventDef[] = [
  {
    key: 'first_call_up',
    channel: 'national',
    stages: ['autumn'],
    once: true,
    weight: 0,
    build: (c) => ({
      bodyParams: { country: getCountry(c.player.countryCode).nameGen },
      options: [
        { id: 'accept', hints: [H.fameUp, H.fitnessDown] },
        { id: 'wait', hints: [H.fitnessUp, H.mediaDown] },
      ],
    }),
    resolve: (_c, id) =>
      id === 'accept'
        ? {
            outcome: 'accept',
            effects: [gauge('fame', 18), gauge('morale', 16), gauge('fitness', -8), attr('mental', 2), flag('national_established')],
            headline: true,
            tone: 'good',
          }
        : { outcome: 'wait', effects: [gauge('fitness', 10), gauge('mediaRep', -12), gauge('fame', -4)], tone: 'neutral' },
  },
  {
    key: 'foreign_grandfather',
    channel: 'national',
    stages: ['winter'],
    once: true,
    weight: 4,
    // Сменить сборную можно только до дебюта: сыграл за первую — дороги назад нет.
    when: (c) =>
      c.player.age >= 19 &&
      c.player.age <= 28 &&
      getCountry(c.player.countryCode).strength <= 3 &&
      (c.state.flags.national_established ?? 0) === 0 &&
      c.state.history.every((h) => h.national.caps === 0),
    build: (c) => {
      const options = COUNTRIES.filter(
        (x) => x.code !== c.player.countryCode && x.strength >= getCountry(c.player.countryCode).strength + 1,
      )
      const target = options.length > 0 ? c.rng.pick(options) : null
      return {
        bodyParams: { country: target?.nameAcc ?? { key: 'npc.country' } },
        options: [
          { id: target ? `switch:${target.code}` : 'stay', labelParams: { country: target?.nameAcc ?? '' }, hints: [H.gamble, H.fameUp] },
          { id: 'stay', hints: [H.fansUp, H.safe] },
        ],
      }
    },
    resolve: (_c, id) => {
      if (id.startsWith('switch:')) {
        const code = id.slice('switch:'.length)
        return {
          outcome: 'switched',
          params: { country: getCountry(code).nameAcc },
          effects: [{ t: 'nationality', code }, gauge('fame', 12), gauge('fanLove', -10), flag('switched_nation')],
          headline: true,
          tone: 'neutral',
        }
      }
      return { outcome: 'stayed', effects: [gauge('fanLove', 12), gauge('morale', 6), trait('patriot')], tone: 'good' }
    },
  },
  {
    key: 'club_vs_national',
    channel: 'national',
    stages: ['autumn', 'spring'],
    once: false,
    weight: 6,
    when: (c) => (c.state.flags.national_established ?? 0) > 0,
    build: (c) => ({
      bodyParams: { country: getCountry(c.player.countryCode).name, club: c.club?.name ?? '' },
      options: [
        { id: 'go_national', hints: [H.fameUp, H.trustDown] },
        { id: 'stay_club', hints: [H.trustUp, H.mediaDown] },
      ],
    }),
    resolve: (_c, id) =>
      id === 'go_national'
        ? {
            outcome: 'go_national',
            effects: [gauge('fame', 10), gauge('coachTrust', -12), rel('nationalCoach', 16), gauge('fitness', -8)],
            tone: 'neutral',
          }
        : {
            outcome: 'stay_club',
            effects: [gauge('coachTrust', 10), rel('nationalCoach', -20), gauge('mediaRep', -10), flag('national_risk')],
            tone: 'neutral',
          },
  },
  {
    key: 'national_captain',
    channel: 'national',
    stages: ['preseason'],
    once: true,
    weight: 5,
    when: (c) => (c.state.flags.national_established ?? 0) > 0 && c.player.age >= 26 && c.ovr >= 78,
    build: (c) => ({ bodyParams: { country: getCountry(c.player.countryCode).nameGen }, options: [
      { id: 'accept', hints: [H.fameUp, H.lockerUp] },
      { id: 'decline', hints: [H.safe] },
    ] }),
    resolve: (_c, id) =>
      id === 'accept'
        ? {
            outcome: 'accept',
            effects: [gauge('fame', 20), gauge('lockerRoom', 12), attr('mental', 4), trait('national_captain')],
            headline: true,
            tone: 'good',
          }
        : { outcome: 'decline', effects: [rel('nationalCoach', -12)], tone: 'neutral' },
  },
  {
    key: 'national_snub',
    channel: 'national',
    stages: ['winter'],
    once: false,
    weight: 5,
    when: (c) => (c.state.flags.national_established ?? 0) > 0 && c.player.gauges.form < 55,
    build: (c) => ({
      bodyParams: { tournament: { key: `comp.${NATIONAL_TOURNAMENT[getCountry(c.player.countryCode).confederation]}` } },
      options: [
        { id: 'answer_pitch', hints: [H.formUp, H.fitnessDown] },
        { id: 'complain', hints: [H.mediaDown, H.gamble] },
        { id: 'retire_national', hints: [H.fitnessUp, H.fameDown] },
      ],
    }),
    resolve: (c, id) => {
      if (id === 'answer_pitch') return { outcome: 'answer_pitch', effects: [gauge('form', 12), gauge('fitness', -8), attr('mental', 2)], tone: 'good' }
      if (id === 'complain') {
        return c.rng.chance(0.4)
          ? { outcome: 'recalled', effects: [rel('nationalCoach', 10), gauge('fame', 8)], headline: true, tone: 'good' }
          : { outcome: 'blacklisted', effects: [rel('nationalCoach', -40), flag('national_blacklist'), gauge('mediaRep', -14)], headline: true, tone: 'bad' }
      }
      return {
        outcome: 'retire_national',
        effects: [flag('national_retired'), gauge('fitness', 18), gauge('fame', -10), gauge('mediaRep', -6)],
        headline: true,
        tone: 'neutral',
      }
    },
  },
  {
    key: 'tournament_moment',
    channel: 'national',
    stages: ['review'],
    once: false,
    weight: 0,
    build: (c) => ({
      bodyParams: { tournament: { key: `comp.${c.payload.tournament ?? 'world_cup'}` } },
      options: [
        { id: 'step_up', hints: [H.fameUp, H.gamble] },
        { id: 'let_other', hints: [H.safe, H.mediaDown] },
      ],
    }),
    resolve: (c, id) => {
      if (id === 'let_other') {
        return { outcome: 'let_other', effects: [gauge('mediaRep', -10), gauge('lockerRoom', -6)], tone: 'neutral' }
      }
      return c.rng.chance(0.55)
        ? {
            outcome: 'scored',
            effects: [gauge('fame', 26), gauge('fanLove', 18), gauge('mediaRep', 20), attr('mental', 3), trait('big_game_player')],
            headline: true,
            tone: 'good',
          }
        : {
            outcome: 'missed',
            effects: [gauge('fame', 10), gauge('mediaRep', -22), gauge('morale', -20), gauge('form', -14), flag('missed_big_penalty'), later('redemption_arc', 1, 'preseason')],
            headline: true,
            tone: 'bad',
          }
    },
  },
  {
    key: 'redemption_arc',
    channel: 'media',
    stages: ['preseason'],
    once: false,
    weight: 0,
    build: () => ({ options: [
      { id: 'work', hints: [H.growthUp, H.moraleUp] },
      { id: 'hide', hints: [H.moraleDown, H.minutesDown] },
    ] }),
    resolve: (_c, id) =>
      id === 'work'
        ? { outcome: 'work', effects: [attr('mental', 5), gauge('morale', 16), gauge('form', 10), trait('redeemed')], tone: 'good' }
        : { outcome: 'hide', effects: [gauge('morale', -12), minutes(0.75), gauge('mediaRep', -8)], tone: 'bad' },
  },
  {
    key: 'youth_tournament',
    channel: 'national',
    stages: ['run_in'],
    once: true,
    weight: 6,
    when: (c) => c.player.age <= 21 && c.club !== null,
    build: () => ({ options: [
      { id: 'go', hints: [H.fameUp, H.fitnessDown] },
      { id: 'stay', hints: [H.trustUp, H.minutesUp] },
    ] }),
    resolve: (_c, id) =>
      id === 'go'
        ? { outcome: 'go', effects: [gauge('fame', 10), attr('mental', 2), gauge('fitness', -12), potential(1)], tone: 'good' }
        : { outcome: 'stay', effects: [gauge('coachTrust', 10), minutes(1.15), gauge('fitness', 5)], tone: 'good' },
  },
  {
    key: 'olympics',
    channel: 'national',
    // Игры идут летом, между сезонами, и выдаёт их движок в свои годы — не
    // лотерея ситуаций посреди мая.
    stages: ['review'],
    // Не once: на две Олимпиады подряд игрок вполне успевает.
    once: false,
    weight: 0,
    when: (c) => c.player.age <= 23 && (c.state.flags.national_established ?? 0) > 0,
    build: () => ({ options: [
      { id: 'go', hints: [H.fameUp, H.fitnessDown] },
      { id: 'club_first', hints: [H.trustUp, H.consequenceLater] },
      { id: 'let_club_decide', hints: [H.gamble] },
    ] }),
    resolve: (c, id) => {
      if (id === 'go' || (id === 'let_club_decide' && c.player.gauges.coachTrust >= 55)) {
        return c.rng.chance(0.35)
          ? {
              outcome: 'medal',
              effects: [gauge('fame', 20), gauge('morale', 14), gauge('fitness', -14), rel('nationalCoach', 12)],
              headline: true,
              tone: 'good',
            }
          : { outcome: 'no_medal', effects: [gauge('fame', 8), gauge('fitness', -14), attr('mental', 2)], tone: 'neutral' }
      }
      if (id === 'club_first') {
        return {
          outcome: 'club_first',
          // Федерация помнит отказы: вызов следующей зимой придётся заслужить.
          effects: [gauge('coachTrust', 12), rel('manager', 10), rel('nationalCoach', -14), later('national_snub', 1, 'winter')],
          tone: 'neutral',
        }
      }
      return { outcome: 'club_said_no', effects: [gauge('coachTrust', 6), gauge('morale', -6), rel('nationalCoach', -8)], tone: 'neutral' }
    },
  }
]
