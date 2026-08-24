import { H, attr, flag, gauge, later, minutes, odds, rel, trait } from './context'
import type { EventDef, OptionDraft } from './context'
import { getClub } from '../../data/clubs'
import { getLeague } from '../../data/leagues'
import { contractYears, generateOffers, wageFor } from '../offers'
import { skillCheck } from './match'

const TO = 'to:'

/** Вратарь — единственная позиция без ротации: место либо твоё, либо нет. */
const isGk = (position: string) => position === 'GK'

export const GOALKEEPER_EVENTS: EventDef[] = [
  {
    key: 'gk_last_line',
    channel: 'match',
    stages: ['run_in'],
    once: false,
    weight: 10,
    when: (c) => isGk(c.player.position) && c.club !== null && c.role !== 'reserve',
    build: (c) => ({
      bodyParams: { club: c.club?.name ?? '' },
      options: [
        { id: 'rush', hints: [H.gamble, H.fansUp] },
        { id: 'hold_line', hints: [H.safe] },
        { id: 'narrow', hints: [H.gamble, H.titleOdds] },
      ],
    }),
    resolve: (c, id) => {
      const a = c.player.attrs
      if (id === 'rush') {
        return c.rng.chance(skillCheck(a.goalkeeping, a.mental, 1.1))
          ? {
              outcome: 'smothered',
              effects: [
                gauge('fanLove', 22), gauge('fame', 14), gauge('form', 12),
                odds('league', 1.5), trait('shot_stopper'),
              ],
              headline: true,
              tone: 'good',
            }
          : {
              outcome: 'beaten',
              effects: [gauge('fanLove', -16), gauge('form', -12), gauge('coachTrust', -10), odds('league', 0.7)],
              headline: true,
              tone: 'bad',
            }
      }
      if (id === 'narrow') {
        return c.rng.chance(skillCheck(a.goalkeeping, a.mental, 0.5))
          ? {
              outcome: 'saved',
              effects: [gauge('fanLove', 14), gauge('coachTrust', 10), odds('league', 1.4), gauge('form', 8)],
              headline: true,
              tone: 'good',
            }
          : { outcome: 'conceded', effects: [gauge('form', -8), odds('league', 0.85)], tone: 'bad' }
      }
      return {
        outcome: 'hold_line',
        effects: [gauge('coachTrust', 6), attr('mental', 1), odds('league', 1.1)],
        tone: 'neutral',
      }
    },
  },
  {
    key: 'gk_shootout_save',
    channel: 'match',
    stages: ['run_in'],
    once: false,
    weight: 8,
    when: (c) => isGk(c.player.position) && c.role !== 'reserve' && c.role !== 'bench',
    build: () => ({
      options: [
        { id: 'read', hints: [H.safe, H.fansUp] },
        { id: 'guess', hints: [H.gamble, H.fameUp] },
        { id: 'mind_games', hints: [H.gamble, H.fansDown] },
      ],
    }),
    resolve: (c, id) => {
      const a = c.player.attrs
      if (id === 'guess') {
        // Прыгать заранее: угадал — герой, не угадал — смотришь мяч в сетке.
        return c.rng.chance(skillCheck(a.goalkeeping, a.mental, 1.4))
          ? {
              outcome: 'guessed_right',
              effects: [gauge('fame', 26), gauge('fanLove', 26), attr('mental', 3), odds('cup', 2.2), trait('ice_gloves')],
              headline: true,
              tone: 'good',
            }
          : { outcome: 'guessed_wrong', effects: [gauge('fanLove', -12), gauge('morale', -14), odds('cup', 0.5)], headline: true, tone: 'bad' }
      }
      if (id === 'mind_games') {
        return c.rng.chance(0.55)
          ? {
              outcome: 'rattled_them',
              effects: [gauge('fame', 18), gauge('mediaRep', -10), odds('cup', 1.9), trait('commanding')],
              headline: true,
              tone: 'good',
            }
          : { outcome: 'booked', effects: [gauge('mediaRep', -14), gauge('fanLove', -8), odds('cup', 0.7)], tone: 'bad' }
      }
      return c.rng.chance(skillCheck(a.goalkeeping, a.mental, 0.7))
        ? {
            outcome: 'read_it',
            effects: [gauge('fanLove', 18), gauge('coachTrust', 12), odds('cup', 1.7), trait('shot_stopper')],
            headline: true,
            tone: 'good',
          }
        : { outcome: 'no_luck', effects: [gauge('form', -8), odds('cup', 0.8)], tone: 'bad' }
    },
  },
  {
    key: 'gk_howler',
    channel: 'match',
    stages: ['autumn', 'spring'],
    once: false,
    weight: 8,
    when: (c) => isGk(c.player.position) && c.role !== 'reserve',
    build: () => ({
      options: [
        { id: 'own_it', hints: [H.mediaUp, H.lockerUp, H.moraleDown] },
        { id: 'blame_defence', hints: [H.gamble, H.lockerDown] },
        { id: 'silent', hints: [H.safe, H.mediaDown] },
      ],
    }),
    resolve: (c, id) => {
      if (id === 'own_it') {
        return {
          outcome: 'own_it',
          effects: [gauge('mediaRep', 16), gauge('lockerRoom', 12), gauge('morale', -10), gauge('coachTrust', 6)],
          tone: 'neutral',
        }
      }
      if (id === 'blame_defence') {
        return c.rng.chance(0.4)
          ? { outcome: 'blame_stuck', effects: [gauge('mediaRep', 6), gauge('lockerRoom', -10)], tone: 'neutral' }
          : {
              outcome: 'blame_backfired',
              effects: [gauge('lockerRoom', -24), gauge('mediaRep', -18), rel('captain', -20), gauge('form', -10)],
              headline: true,
              tone: 'bad',
            }
      }
      return { outcome: 'silent', effects: [gauge('mediaRep', -10), gauge('form', -6), attr('mental', 2)], tone: 'neutral' }
    },
  },
  {
    key: 'gk_number_one',
    channel: 'locker',
    stages: ['preseason', 'winter'],
    once: false,
    weight: 9,
    when: (c) => isGk(c.player.position) && c.club !== null && c.player.age >= 18,
    build: (c) => ({
      bodyParams: { club: c.club?.name ?? '' },
      options: [
        { id: 'duel', hints: [H.growthUp, H.gamble] },
        { id: 'guarantee', hints: [H.minutesUp, H.trustDown] },
        { id: 'ask_loan', hints: [H.minutesUp, H.leaveClub] },
      ],
    }),
    resolve: (c, id) => {
      if (id === 'duel') {
        // У вратаря нет ротации: проигравший садится на весь сезон.
        return c.rng.chance(0.55)
          ? {
              outcome: 'won_gloves',
              effects: [gauge('coachTrust', 16), attr('goalkeeping', 2), gauge('form', 8), trait('shot_stopper')],
              headline: true,
              tone: 'good',
            }
          : {
              outcome: 'lost_gloves',
              effects: [gauge('coachTrust', -16), minutes(0.25), gauge('morale', -14), flag('lost_gloves')],
              headline: true,
              tone: 'bad',
            }
      }
      if (id === 'guarantee') {
        return { outcome: 'guarantee', effects: [minutes(1.2), gauge('coachTrust', -8), gauge('lockerRoom', -6)], tone: 'neutral' }
      }
      return { outcome: 'ask_loan', effects: [flag('wants_out'), gauge('coachTrust', -4), rel('agent', 10)], tone: 'neutral' }
    },
  },
  {
    key: 'gk_sweeper_style',
    channel: 'board',
    stages: ['preseason', 'autumn'],
    once: false,
    weight: 7,
    when: (c) => isGk(c.player.position) && c.club !== null,
    build: () => ({
      options: [
        { id: 'learn', hints: [H.growthUp, H.gamble] },
        { id: 'hybrid', hints: [H.safe, H.trustUp] },
        { id: 'refuse', hints: [H.trustDown, H.safe] },
      ],
    }),
    resolve: (c, id) => {
      if (id === 'learn') {
        return c.rng.chance(0.65)
          ? {
              outcome: 'learned',
              effects: [attr('passing', 5), gauge('coachTrust', 12), trait('sweeper_keeper')],
              tone: 'good',
            }
          : {
              outcome: 'cost_a_goal',
              effects: [attr('passing', 2), gauge('form', -12), gauge('fanLove', -14), gauge('coachTrust', -8)],
              headline: true,
              tone: 'bad',
            }
      }
      if (id === 'hybrid') {
        return { outcome: 'hybrid', effects: [attr('passing', 2), gauge('coachTrust', 5)], tone: 'good' }
      }
      return { outcome: 'refuse', effects: [gauge('coachTrust', -12), rel('manager', -12), attr('goalkeeping', 1)], tone: 'bad' }
    },
  },
  {
    key: 'gk_clean_sheet_run',
    channel: 'media',
    stages: ['spring'],
    once: false,
    weight: 6,
    when: (c) => isGk(c.player.position) && (c.state.season?.tally.cleanSheets ?? 0) >= 6,
    build: (c) => ({
      bodyParams: { count: c.state.season?.tally.cleanSheets ?? 0 },
      options: [
        { id: 'chase', hints: [H.fameUp, H.gamble] },
        { id: 'ignore', hints: [H.safe] },
      ],
    }),
    resolve: (c, id) => {
      if (id === 'ignore') {
        return { outcome: 'ignore', effects: [attr('mental', 2), gauge('form', 4)], tone: 'good' }
      }
      return c.rng.chance(0.5)
        ? {
            outcome: 'record',
            effects: [gauge('fame', 22), gauge('fanLove', 18), gauge('mediaRep', 16), trait('commanding')],
            headline: true,
            tone: 'good',
          }
        : { outcome: 'streak_broke', effects: [gauge('form', -10), gauge('morale', -8), gauge('mediaRep', -6)], tone: 'bad' }
    },
  },
  {
    key: 'gk_veteran_backup',
    channel: 'transfer',
    stages: ['winter'],
    once: false,
    weight: 7,
    when: (c) => isGk(c.player.position) && c.player.age >= 32 && (c.club?.tier ?? 1) <= 4,
    build: (c) => {
      const target = generateOffers(c.state, c.rng, { count: 1, minTier: 5 })[0]
      const options: OptionDraft[] = []
      if (target) {
        const club = getClub(target.clubId)
        options.push({
          id: `${TO}${target.clubId}`,
          labelParams: { club: club.name, league: getLeague(club.leagueId).name, wage: target.wage },
          hints: [H.moneyUp, H.titleOdds, H.minutesDown],
        })
      }
      options.push({ id: 'keep_playing', hints: [H.minutesUp, H.stayClub] })
      return { options }
    },
    resolve: (c, id) => {
      if (id.startsWith(TO)) {
        const clubId = id.slice(TO.length)
        const club = getClub(clubId)
        return {
          outcome: 'took_bench',
          params: { club: club.name },
          effects: [
            { t: 'transfer', clubId, loan: false, wage: wageFor(c.ovr, c.player.age, club.tier), years: contractYears(c.player.age, club.tier, false) },
            minutes(0.3), gauge('fame', 8), gauge('morale', -6), trait('veteran_backup'),
          ],
          headline: true,
          tone: 'neutral',
        }
      }
      return {
        outcome: 'keep_playing',
        effects: [gauge('coachTrust', 8), gauge('fanLove', 10), gauge('morale', 8)],
        tone: 'good',
      }
    },
  },
  {
    key: 'tournament_moment_gk',
    channel: 'national',
    stages: ['review'],
    once: false,
    weight: 0,
    build: (c) => ({
      bodyParams: { tournament: { key: `comp.${c.payload.tournament ?? 'world_cup'}` } },
      options: [
        { id: 'dive_early', hints: [H.gamble, H.fameUp] },
        { id: 'stand_tall', hints: [H.safe, H.fansUp] },
      ],
    }),
    resolve: (c, id) => {
      const a = c.player.attrs
      const pressure = id === 'dive_early' ? 1.3 : 0.8
      return c.rng.chance(skillCheck(a.goalkeeping, a.mental, pressure))
        ? {
            outcome: 'saved',
            effects: [gauge('fame', 28), gauge('fanLove', 20), gauge('mediaRep', 22), attr('mental', 3), trait('ice_gloves')],
            headline: true,
            tone: 'good',
          }
        : {
            outcome: 'beaten',
            effects: [gauge('fame', 8), gauge('mediaRep', -18), gauge('morale', -18), gauge('form', -12), later('redemption_arc', 1, 'preseason')],
            headline: true,
            tone: 'bad',
          }
    },
  },
]