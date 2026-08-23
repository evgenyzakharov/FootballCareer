import { H, flag, gauge, minutes, money, odds, rel, trait } from './context'
import type { EventDef, OptionDraft } from './context'
import type { Effect, Objective } from '../types'
import { getClub } from '../../data/clubs'
import { getLeague } from '../../data/leagues'
import { contractYears, generateOffers, loanOffers, wageFor } from '../offers'
import { roleRank } from '../performance'

const TO = 'to:'
const LOAN = 'loan:'

function move(clubId: string, ovr: number, age: number, loan: boolean, wageMult = 1): Effect {
  const club = getClub(clubId)
  return {
    t: 'transfer',
    clubId,
    loan,
    wage: Math.round(wageFor(ovr, age, club.tier) * (loan ? 0.6 : 1) * wageMult),
    years: contractYears(age, club.tier, loan),
  }
}

/**
 * Цель на сезон от тренера. Считается от роли и позиции: вратарю не поставят
 * задачу по голам, а резервисту — по матчам основы.
 */
export function makeObjective(
  position: string,
  role: string,
  tier: number,
  ovr: number,
): Objective {
  const rank = roleRank(role as never)
  if (rank <= 1) {
    return { kind: 'apps', target: 10 + rank * 6, reward: 10, penalty: 8 }
  }
  if (position === 'GK' || position === 'CB' || position === 'CDM' || position === 'LB' || position === 'RB') {
    return { kind: 'rating', target: 6.6 + tier * 0.06, reward: 12, penalty: 10 }
  }
  if (position === 'ST' || position === 'LW' || position === 'RW') {
    const target = Math.max(6, Math.round((ovr - 50) * 0.42 + tier))
    return { kind: 'goals', target, reward: 14, penalty: 12 }
  }
  const target = Math.max(4, Math.round((ovr - 52) * 0.28 + tier))
  return { kind: 'assists', target, reward: 12, penalty: 10 }
}

export const STRUCTURAL_EVENTS: EventDef[] = [
  {
    key: 'season_objective',
    channel: 'board',
    stages: ['preseason'],
    once: false,
    weight: 0,
    build: (c) => ({
      bodyParams: {
        club: c.club?.name ?? '',
        kind: { key: `objective.${c.payload.kind ?? 'apps'}` },
        target: c.payload.target ?? 0,
      },
      options: [
        { id: 'accept', hints: [H.safe] },
        { id: 'negotiate', hints: [H.trustDown, H.safe] },
        { id: 'raise', hints: [H.trustUp, H.gamble] },
      ],
    }),
    resolve: (_c, id) => {
      if (id === 'negotiate') return { outcome: 'negotiate', effects: [flag('objective_lowered'), gauge('coachTrust', -6)], tone: 'neutral' }
      if (id === 'raise') return { outcome: 'raise', effects: [flag('objective_raised'), gauge('coachTrust', 8), rel('manager', 8)], tone: 'neutral' }
      return { outcome: 'accept', effects: [], tone: 'neutral' }
    },
  },
  {
    key: 'academy_choice',
    channel: 'transfer',
    stages: ['preseason'],
    once: true,
    weight: 0,
    build: (c) => {
      const ids = String(c.payload.clubs ?? '').split(',').filter(Boolean)
      return {
        options: ids.map((clubId) => {
          const club = getClub(clubId)
          return {
            id: `${TO}${clubId}`,
            labelParams: { club: club.name, league: getLeague(club.leagueId).name },
            hints: club.tier >= 4 ? [H.growthBig, H.minutesDown] : club.tier >= 2 ? [H.growthUp, H.safe] : [H.minutesUp, H.growthUp],
          }
        }),
      }
    },
    resolve: (c, id) => {
      const clubId = id.slice(TO.length)
      return {
        outcome: 'signed',
        params: { club: getClub(clubId).name },
        effects: [move(clubId, c.ovr, c.player.age, false), gauge('morale', 10)],
        headline: true,
        tone: 'good',
      }
    },
  },
  {
    key: 'market_decision',
    channel: 'transfer',
    stages: ['review'],
    once: false,
    weight: 0,
    build: (c) => {
      const wantsOut = (c.state.flags.wants_out ?? 0) > 0
      const offers = generateOffers(c.state, c.rng, { count: wantsOut ? 3 : 2, allowLoans: c.player.age <= 22 })
      const options: OptionDraft[] = offers.map((o) => {
        const club = getClub(o.clubId)
        return {
          id: `${o.kind === 'loan' ? LOAN : TO}${o.clubId}`,
          labelParams: {
            club: club.name,
            league: getLeague(club.leagueId).name,
            wage: o.wage,
            role: { key: `role.${o.expectedRole}` },
          },
          hints: o.kind === 'loan' ? [H.minutesUp, H.growthUp] : club.tier > (c.club?.tier ?? 0) ? [H.titleOdds, H.minutesDown] : [H.minutesUp],
        }
      })
      if (c.club) {
        options.push({
          id: 'stay',
          labelParams: { club: c.club.name, league: getLeague(c.club.leagueId).name, wage: 0, role: { key: 'role.starter' } },
          hints: [H.stayClub, H.fansUp],
        })
      }
      if (c.player.age >= 34) {
        options.push({ id: 'retire', labelParams: { club: '', league: '', wage: 0, role: { key: 'role.starter' } }, hints: [H.safe] })
      }
      return { options }
    },
    resolve: (c, id) => {
      if (id === 'retire') return { outcome: 'retire', effects: [{ t: 'retire' }], headline: true, tone: 'neutral' }
      if (id === 'stay') {
        return { outcome: 'stay', effects: [gauge('fanLove', 8), gauge('lockerRoom', 6)], tone: 'good' }
      }
      const loan = id.startsWith(LOAN)
      const clubId = id.slice((loan ? LOAN : TO).length)
      return {
        outcome: loan ? 'loaned' : 'transferred',
        params: { club: getClub(clubId).name },
        effects: [move(clubId, c.ovr, c.player.age, loan), gauge('morale', 6), gauge('form', -4)],
        headline: true,
        tone: 'neutral',
      }
    },
  },
  {
    key: 'loan_return',
    channel: 'transfer',
    stages: ['review'],
    once: false,
    weight: 0,
    build: (c) => {
      const parentId = c.state.contract?.parentClubId ?? c.state.clubsPlayed[0]
      const parent = getClub(parentId)
      const loans = loanOffers(c.state, c.rng, 2)
      return {
        bodyParams: { club: parent.name },
        options: [
          { id: `${TO}${parent.id}`, labelParams: { club: parent.name }, hints: [H.growthUp, H.minutesDown] },
          ...loans.map((o) => ({
            id: `${LOAN}${o.clubId}`,
            labelParams: { club: getClub(o.clubId).name, league: getLeague(getClub(o.clubId).leagueId).name },
            hints: [H.minutesUp, H.growthUp],
          })),
        ],
      }
    },
    resolve: (c, id) => {
      const loan = id.startsWith(LOAN)
      const clubId = id.slice((loan ? LOAN : TO).length)
      return {
        outcome: loan ? 'loaned_again' : 'returned',
        params: { club: getClub(clubId).name },
        effects: [move(clubId, c.ovr, c.player.age, loan), gauge('morale', loan ? 6 : 2)],
        tone: 'neutral',
      }
    },
  },
  {
    key: 'no_offers',
    channel: 'transfer',
    stages: ['review'],
    once: false,
    weight: 0,
    build: (c) => ({
      options: [
        { id: 'drop_down', hints: [H.minutesUp, H.moneyDown] },
        ...(c.player.age >= 30 ? [{ id: 'retire', hints: [H.safe] }] : []),
        { id: 'train_alone', hints: [H.gamble, H.formDown] },
      ],
    }),
    resolve: (c, id) => {
      if (id === 'retire') return { outcome: 'retire', effects: [{ t: 'retire' }], headline: true, tone: 'neutral' }
      if (id === 'drop_down') {
        const offers = generateOffers(c.state, c.rng, { count: 1 })
        const target = offers[0]
        if (!target) return { outcome: 'retire', effects: [{ t: 'retire' }], headline: true, tone: 'bad' }
        return {
          outcome: 'drop_down',
          params: { club: getClub(target.clubId).name },
          effects: [move(target.clubId, c.ovr, c.player.age, false, 0.6), gauge('morale', -8)],
          tone: 'neutral',
        }
      }
      return { outcome: 'train_alone', effects: [gauge('form', -14), gauge('fitness', 8), flag('free_agent')], tone: 'bad' }
    },
  },
  {
    key: 'retirement_thoughts',
    channel: 'life',
    stages: ['review'],
    once: false,
    weight: 0,
    build: () => ({ options: [
      { id: 'one_more', hints: [H.gamble, H.stayClub] },
      { id: 'retire', hints: [H.safe] },
    ] }),
    resolve: (_c, id) =>
      id === 'retire'
        ? { outcome: 'retire', effects: [{ t: 'retire' }], headline: true, tone: 'neutral' }
        : { outcome: 'one_more', effects: [gauge('morale', 8), trait('last_dance')], tone: 'neutral' },
  },
  {
    key: 'title_run_focus',
    channel: 'board',
    stages: ['winter'],
    once: false,
    weight: 7,
    when: (c) => (c.club?.tier ?? 0) >= 3,
    build: (c) => ({ bodyParams: { club: c.club?.name ?? '' }, options: [
      { id: 'league', hints: [H.titleOdds, H.titleOddsDown] },
      { id: 'cup', hints: [H.titleOdds, H.titleOddsDown] },
      { id: 'both', hints: [H.gamble, H.fitnessDown] },
    ] }),
    resolve: (_c, id) => {
      if (id === 'league') return { outcome: 'league', effects: [odds('league', 1.8), odds('continental', 0.5), odds('cup', 0.6)], tone: 'neutral' }
      if (id === 'cup') return { outcome: 'cup', effects: [odds('cup', 2), odds('continental', 1.6), odds('league', 0.55)], tone: 'neutral' }
      return { outcome: 'both', effects: [gauge('fitness', -16), minutes(1.15), odds('league', 1.2), odds('cup', 1.2)], tone: 'neutral' }
    },
  },
  {
    key: 'wage_dispute',
    channel: 'board',
    stages: ['winter'],
    once: false,
    weight: 5,
    when: (c) => c.ovr >= 70 && (c.state.contract?.wage ?? 0) < wageFor(c.ovr, c.player.age, c.club?.tier ?? 0) * 0.7,
    build: (c) => ({
      bodyParams: { fair: wageFor(c.ovr, c.player.age, c.club?.tier ?? 0), current: c.state.contract?.wage ?? 0 },
      options: [
        { id: 'demand', hints: [H.moneyUp, H.trustDown] },
        { id: 'wait', hints: [H.trustUp] },
        { id: 'strike', hints: [H.gamble, H.moneyUp] },
      ],
    }),
    resolve: (c, id) => {
      const club = c.club
      if (!club) return { outcome: 'wait', effects: [] }
      const fair = wageFor(c.ovr, c.player.age, club.tier)
      if (id === 'demand') {
        return c.rng.chance(0.6)
          ? {
              outcome: 'granted',
              effects: [{ t: 'transfer', clubId: club.id, loan: false, wage: fair, years: contractYears(c.player.age, club.tier, false) }, gauge('morale', 10)],
              tone: 'good',
            }
          : { outcome: 'denied', effects: [gauge('morale', -10), gauge('coachTrust', -6), flag('wants_out')], tone: 'bad' }
      }
      if (id === 'strike') {
        return c.rng.chance(0.4)
          ? {
              outcome: 'strike_won',
              effects: [{ t: 'transfer', clubId: club.id, loan: false, wage: Math.round(fair * 1.3), years: contractYears(c.player.age, club.tier, false) }, gauge('lockerRoom', -10), gauge('mediaRep', -12)],
              headline: true,
              tone: 'neutral',
            }
          : { outcome: 'strike_lost', effects: [money(-Math.round((c.state.contract?.wage ?? 0) * 0.2)), gauge('coachTrust', -20), gauge('fanLove', -14), minutes(0.6)], headline: true, tone: 'bad' }
      }
      return { outcome: 'wait', effects: [gauge('coachTrust', 6), gauge('lockerRoom', 4)], tone: 'neutral' }
    },
  },
]
