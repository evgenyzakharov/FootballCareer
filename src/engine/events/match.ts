import { H, attr, flag, gauge, injury, money, odds, rel, suspend, trait } from './context'
import type { EventDef } from './context'
import type { Effect } from '../types'
import { clamp } from '../rng'
import { getClub } from '../../data/clubs'

/**
 * Ключевые матчи. Здесь единственное место, где бросок зависит от атрибутов
 * напрямую: выбор «пробить» проверяется по удару и характеру, а не по OVR.
 */
export function skillCheck(value: number, mental: number, pressure: number): number {
  return clamp(0.2 + (value - 55) * 0.011 + (mental - 55) * 0.005 - pressure * 0.12, 0.05, 0.92)
}

export const MATCH_EVENTS: EventDef[] = [
  {
    key: 'title_decider',
    channel: 'match',
    stages: ['run_in'],
    once: false,
    weight: 10,
    // Вратарю этот эпизод читался бы бессмыслицей — у него свой, gk_last_line.
    when: (c) => c.club !== null && c.role !== 'reserve' && c.player.position !== 'GK',
    build: (c) => ({
      bodyParams: { club: c.club?.name ?? '' },
      options: [
        { id: 'shoot', hints: [H.gamble, H.fansUp] },
        { id: 'square', hints: [H.safe, H.titleOdds] },
        { id: 'win_foul', hints: [H.safe, H.fansDown] },
      ],
    }),
    resolve: (c, id) => {
      const a = c.player.attrs
      if (id === 'shoot') {
        return c.rng.chance(skillCheck(a.shooting, a.mental, 1))
          ? {
              outcome: 'scored',
              effects: [
                { t: 'stat', key: 'goals', delta: 1 },
                gauge('fanLove', 22), gauge('fame', 16), gauge('form', 12),
                odds('league', 1.6), trait('clutch'),
              ],
              headline: true,
              tone: 'good',
            }
          : {
              outcome: 'wasted',
              effects: [gauge('fanLove', -14), gauge('form', -10), gauge('mediaRep', -10), odds('league', 0.75)],
              headline: true,
              tone: 'bad',
            }
      }
      if (id === 'square') {
        return c.rng.chance(skillCheck(a.passing, a.mental, 0.4))
          ? {
              outcome: 'assisted',
              effects: [{ t: 'stat', key: 'assists', delta: 1 }, gauge('lockerRoom', 12), odds('league', 1.45), gauge('form', 8)],
              headline: true,
              tone: 'good',
            }
          : { outcome: 'intercepted', effects: [gauge('form', -6), odds('league', 0.9)], tone: 'bad' }
      }
      return {
        outcome: 'win_foul',
        effects: [gauge('fanLove', -6), gauge('coachTrust', 8), odds('league', 1.15), attr('mental', 1)],
        tone: 'neutral',
      }
    },
  },
  {
    key: 'cup_final_penalties',
    channel: 'match',
    stages: ['run_in'],
    once: false,
    weight: 8,
    when: (c) => c.player.position !== 'GK' && c.role !== 'reserve' && c.role !== 'bench',
    build: () => ({ options: [
      { id: 'first', hints: [H.gamble, H.fameUp] },
      { id: 'fifth', hints: [H.gamble, H.fansUp] },
      { id: 'skip', hints: [H.safe, H.lockerDown] },
    ] }),
    resolve: (c, id) => {
      const a = c.player.attrs
      if (id === 'skip') {
        return { outcome: 'skip', effects: [gauge('lockerRoom', -12), gauge('mediaRep', -8)], tone: 'neutral' }
      }
      const pressure = id === 'fifth' ? 1.2 : 0.5
      const scored = c.rng.chance(skillCheck(a.shooting, a.mental, pressure))
      if (scored) {
        const decisive = id === 'fifth'
        return {
          outcome: decisive ? 'won_it' : 'scored',
          effects: [
            gauge('fanLove', decisive ? 30 : 14),
            gauge('fame', decisive ? 24 : 10),
            attr('mental', decisive ? 4 : 1),
            odds('cup', decisive ? 2.2 : 1.5),
            ...(decisive ? [trait('ice_veins')] : []),
          ],
          headline: true,
          tone: 'good',
        }
      }
      return {
        outcome: 'missed',
        effects: [gauge('fanLove', -20), gauge('morale', -18), gauge('form', -12), odds('cup', 0.5), flag('final_miss')],
        headline: true,
        tone: 'bad',
      }
    },
  },
  {
    key: 'derby_provocation',
    channel: 'match',
    stages: ['autumn', 'spring', 'run_in'],
    once: false,
    weight: 8,
    build: () => ({ options: [
      { id: 'retaliate', hints: [H.fansUp, H.banRisk] },
      { id: 'ignore', hints: [H.safe, H.trustUp] },
      { id: 'wind_up', hints: [H.gamble, H.fansUp] },
    ] }),
    resolve: (c, id) => {
      if (id === 'retaliate') {
        return c.rng.chance(0.6)
          ? { outcome: 'sent_off', effects: [suspend(1), gauge('fanLove', 8), gauge('coachTrust', -14), gauge('mediaRep', -12)], headline: true, tone: 'bad' }
          : { outcome: 'got_away', effects: [gauge('fanLove', 14), gauge('lockerRoom', 8), attr('physical', 1)], tone: 'neutral' }
      }
      if (id === 'wind_up') {
        return c.rng.chance(0.55)
          ? { outcome: 'rival_off', effects: [gauge('fanLove', 18), gauge('mediaRep', 6), odds('league', 1.2), trait('agitator')], headline: true, tone: 'good' }
          : { outcome: 'backfired', effects: [gauge('form', -8), gauge('mediaRep', -14), gauge('coachTrust', -6)], tone: 'bad' }
      }
      return { outcome: 'ignore', effects: [gauge('coachTrust', 8), attr('mental', 2), gauge('fanLove', -4)], tone: 'good' }
    },
  },
  {
    key: 'honesty_test',
    channel: 'match',
    stages: ['autumn', 'spring'],
    once: true,
    weight: 4,
    when: (c) => c.player.age >= 19,
    build: (c) => ({
      bodyParams: { amount: Math.max(300_000, Math.round((c.state.contract?.wage ?? 200_000) * 1.5)) },
      options: [
        { id: 'take', hints: [H.moneyUp, H.banRisk] },
        { id: 'refuse', hints: [H.safe] },
        { id: 'report', hints: [H.mediaUp, H.gamble] },
      ],
    }),
    resolve: (c, id) => {
      const amount = Math.max(300_000, Math.round((c.state.contract?.wage ?? 200_000) * 1.5))
      if (id === 'take') {
        return c.rng.chance(0.3)
          ? {
              outcome: 'caught',
              effects: [suspend(4), money(amount), gauge('mediaRep', -60), gauge('fanLove', -50), flag('match_fixing_ban')],
              headline: true,
              tone: 'bad',
            }
          : { outcome: 'took_it', effects: [money(amount), gauge('form', -10), gauge('morale', -8), flag('took_bribe')], tone: 'neutral' }
      }
      if (id === 'report') {
        return {
          outcome: 'report',
          effects: [gauge('mediaRep', 26), gauge('fanLove', 14), gauge('fame', 12), trait('incorruptible')],
          headline: true,
          tone: 'good',
        }
      }
      return { outcome: 'refuse', effects: [attr('mental', 2)], tone: 'neutral' }
    },
  },
  {
    key: 'out_of_position',
    channel: 'match',
    stages: ['autumn', 'run_in'],
    once: false,
    weight: 6,
    when: (c) => c.player.position !== 'GK' && c.role !== 'reserve',
    build: (c) => ({
      bodyParams: { position: { key: `pos.${c.player.position}` } },
      options: [
        { id: 'accept', hints: [H.trustUp, H.formDown] },
        { id: 'refuse', hints: [H.trustDown, H.stayClub] },
        { id: 'switch_for_good', hints: [H.gamble, H.minutesUp] },
      ],
    }),
    resolve: (c, id) => {
      if (id === 'accept') {
        return { outcome: 'accept', effects: [gauge('coachTrust', 12), gauge('form', -6), attr('mental', 2), rel('manager', 10)], tone: 'good' }
      }
      if (id === 'switch_for_good') {
        const map: Record<string, string> = {
          ST: 'CAM', CAM: 'CM', CM: 'CDM', CDM: 'CB', LW: 'LM', RW: 'RM',
          LM: 'LB', RM: 'RB', LB: 'CB', RB: 'CB', CB: 'CDM',
        }
        const next = map[c.player.position] ?? 'CM'
        return {
          outcome: 'switched',
          params: { position: { key: `pos.${next}` } },
          effects: [{ t: 'position', position: next as never }, gauge('coachTrust', 16), gauge('form', -10), flag('position_switch')],
          headline: true,
          tone: 'neutral',
        }
      }
      return { outcome: 'refuse', effects: [gauge('coachTrust', -14), rel('manager', -14), gauge('lockerRoom', -4)], tone: 'bad' }
    },
  },
  {
    key: 'last_minute_chance',
    channel: 'match',
    stages: ['autumn', 'spring'],
    once: false,
    weight: 7,
    when: (c) => c.role !== 'reserve' && c.player.position !== 'GK',
    build: () => ({ options: [
      { id: 'shoot', hints: [H.gamble] },
      { id: 'dribble', hints: [H.gamble, H.fansUp] },
      { id: 'hold', hints: [H.safe] },
    ] }),
    resolve: (c, id) => {
      const a = c.player.attrs
      if (id === 'shoot') {
        return c.rng.chance(skillCheck(a.shooting, a.mental, 0.7))
          ? { outcome: 'scored', effects: [{ t: 'stat', key: 'goals', delta: 1 }, gauge('form', 10), gauge('fanLove', 10)], tone: 'good' }
          : { outcome: 'over', effects: [gauge('form', -5), gauge('fanLove', -5)], tone: 'bad' }
      }
      if (id === 'dribble') {
        return c.rng.chance(skillCheck(a.dribbling, a.mental, 0.9))
          ? { outcome: 'beat_them', effects: [{ t: 'stat', key: 'goals', delta: 1 }, gauge('fanLove', 16), gauge('fame', 8), attr('dribbling', 1)], headline: true, tone: 'good' }
          : c.rng.chance(0.25)
            ? { outcome: 'hurt', effects: [injury('ankle_knock', 1), gauge('form', -6)], tone: 'bad' }
            : { outcome: 'dispossessed', effects: [gauge('form', -8), gauge('coachTrust', -6)], tone: 'bad' }
      }
      return { outcome: 'hold', effects: [gauge('coachTrust', 4)], tone: 'neutral' }
    },
  },
  {
    key: 'former_club_goal',
    channel: 'match',
    stages: ['autumn', 'spring'],
    once: false,
    weight: 6,
    when: (c) => c.state.clubsPlayed.length >= 2 && c.club !== null && c.role !== 'reserve' && c.player.position !== 'GK',
    build: (c) => ({
      bodyParams: { club: getClub(c.state.clubsPlayed[c.state.clubsPlayed.length - 2]).name },
      options: [
        { id: 'celebrate', hints: [H.fansUp, H.mediaDown] },
        { id: 'apologise', hints: [H.mediaUp] },
        { id: 'stay_calm', hints: [H.safe] },
      ],
    }),
    resolve: (_c, id) => {
      const scored: Effect = { t: 'stat', key: 'goals', delta: 1 }
      if (id === 'celebrate') {
        return { outcome: 'celebrate', effects: [scored, gauge('fanLove', 13), gauge('fame', 8), gauge('mediaRep', -6)], headline: true, tone: 'neutral' }
      }
      if (id === 'apologise') {
        return { outcome: 'apologise', effects: [scored, gauge('mediaRep', 11), gauge('lockerRoom', 4), gauge('fanLove', -4)], tone: 'good' }
      }
      return { outcome: 'stay_calm', effects: [scored, attr('mental', 2), gauge('morale', 5)], tone: 'neutral' }
    },
  },
  {
    key: 'rough_tackle',
    channel: 'match',
    stages: ['autumn', 'winter', 'spring'],
    once: false,
    weight: 6,
    when: (c) => c.player.position !== 'GK' && c.role !== 'reserve',
    build: () => ({ options: [
      { id: 'retaliate', hints: [H.banRisk, H.lockerUp] },
      { id: 'answer_with_goal', hints: [H.gamble, H.fansUp] },
      { id: 'walk_away', hints: [H.growthUp, H.lockerDown] },
    ] }),
    resolve: (c, id) => {
      if (id === 'retaliate') {
        return c.rng.chance(0.45)
          ? { outcome: 'sent_off', effects: [suspend(2), gauge('coachTrust', -12), gauge('fanLove', -8)], headline: true, tone: 'bad' }
          : { outcome: 'evened', effects: [gauge('lockerRoom', 8), attr('physical', 1), gauge('mediaRep', -4)], tone: 'neutral' }
      }
      if (id === 'answer_with_goal') {
        return c.rng.chance(0.5)
          ? { outcome: 'answered', effects: [{ t: 'stat', key: 'goals', delta: 1 }, gauge('form', 10), gauge('fanLove', 10)], headline: true, tone: 'good' }
          : { outcome: 'silent', effects: [gauge('form', -5), gauge('morale', -4)], tone: 'bad' }
      }
      return { outcome: 'walk_away', effects: [attr('mental', 2), gauge('mediaRep', 6), gauge('lockerRoom', -5)], tone: 'neutral' }
    },
  }
]
