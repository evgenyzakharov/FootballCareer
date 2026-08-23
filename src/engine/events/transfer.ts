import { H, flag, gauge, later, money, rel, trait } from './context'
import type { EventDef, OptionDraft } from './context'
import type { Effect } from '../types'
import { getClub } from '../../data/clubs'
import { getCountry } from '../../data/countries'
import { contractYears, generateOffers, wageFor } from '../offers'

/** Опция «уйти в клуб X» кодирует клуб прямо в id, чтобы разбор не зависел от RNG. */
const TO = 'to:'

function moveEffect(clubId: string, ovr: number, age: number): Effect {
  const club = getClub(clubId)
  return {
    t: 'transfer',
    clubId,
    loan: false,
    wage: wageFor(ovr, age, club.tier),
    years: contractYears(age, club.tier, false),
  }
}

export const TRANSFER_EVENTS: EventDef[] = [
  {
    key: 'rival_offer',
    channel: 'transfer',
    stages: ['winter'],
    once: false,
    weight: 7,
    when: (c) => c.ovr >= 74 && c.club !== null && c.club.tier <= 4 && c.player.age >= 20,
    build: (c) => {
      const offers = generateOffers(c.state, c.rng, { count: 1, minTier: Math.min(5, (c.club?.tier ?? 0) + 1) })
      const target = offers[0]
      if (!target) return { options: [{ id: 'stay', hints: [H.stayClub] }] }
      const club = getClub(target.clubId)
      return {
        bodyParams: { rival: club.name, wage: target.wage },
        options: [
          { id: `${TO}${club.id}`, labelParams: { club: club.name }, hints: [H.moneyUp, H.leaveClub, H.titleOdds] },
          { id: 'stay', hints: [H.fansUp, H.stayClub] },
        ],
      }
    },
    resolve: (c, id) => {
      if (id.startsWith(TO)) {
        const clubId = id.slice(TO.length)
        return {
          outcome: 'moved',
          params: { club: getClub(clubId).name },
          effects: [moveEffect(clubId, c.ovr, c.player.age), gauge('fanLove', -18), gauge('fame', 14), gauge('morale', 8)],
          headline: true,
          tone: 'neutral',
        }
      }
      return {
        outcome: 'stayed',
        effects: [gauge('fanLove', 20), gauge('lockerRoom', 10), gauge('coachTrust', 8), trait('one_club_soul')],
        headline: true,
        tone: 'good',
      }
    },
  },
  {
    key: 'club_crisis',
    channel: 'board',
    stages: ['winter'],
    once: false,
    weight: 6,
    when: (c) => c.club !== null && c.player.age >= 20,
    build: (c) => {
      const offers = generateOffers(c.state, c.rng, { count: 1 })
      const target = offers[0]
      const options: OptionDraft[] = [
        { id: 'stay_fight', hints: [H.fansUp, H.titleOddsDown] },
        { id: 'wage_cut', hints: [H.moneyDown, H.lockerUp] },
      ]
      if (target) {
        options.unshift({
          id: `${TO}${target.clubId}`,
          labelParams: { club: getClub(target.clubId).name },
          hints: [H.leaveClub, H.moneyUp],
        })
      }
      return { bodyParams: { club: c.club?.name ?? '' }, options }
    },
    resolve: (c, id) => {
      if (id.startsWith(TO)) {
        const clubId = id.slice(TO.length)
        return {
          outcome: 'escaped',
          params: { club: getClub(clubId).name },
          effects: [moveEffect(clubId, c.ovr, c.player.age), gauge('fanLove', -12)],
          headline: true,
          tone: 'neutral',
        }
      }
      if (id === 'wage_cut') {
        return {
          outcome: 'wage_cut',
          effects: [money(-Math.round((c.state.contract?.wage ?? 0) * 0.3)), gauge('lockerRoom', 16), gauge('fanLove', 14), trait('club_man')],
          headline: true,
          tone: 'good',
        }
      }
      return { outcome: 'stay_fight', effects: [gauge('fanLove', 12), gauge('morale', -6), gauge('coachTrust', 6)], tone: 'neutral' }
    },
  },
  {
    key: 'contract_renewal',
    channel: 'board',
    stages: ['winter'],
    once: false,
    weight: 8,
    when: (c) => (c.state.contract?.yearsLeft ?? 9) <= 1 && c.club !== null,
    build: (c) => ({
      bodyParams: { club: c.club?.name ?? '', wage: wageFor(c.ovr, c.player.age, c.club?.tier ?? 0) },
      options: [
        { id: 'sign', hints: [H.moneyUp, H.stayClub] },
        { id: 'push_more', hints: [H.gamble, H.moneyUp] },
        { id: 'run_down', hints: [H.trustDown, H.leaveClub] },
      ],
    }),
    resolve: (c, id) => {
      const club = c.club
      if (!club) return { outcome: 'sign', effects: [] }
      const base = wageFor(c.ovr, c.player.age, club.tier)
      if (id === 'sign') {
        return {
          outcome: 'sign',
          effects: [
            { t: 'transfer', clubId: club.id, loan: false, wage: base, years: contractYears(c.player.age, club.tier, false) },
            gauge('morale', 8), gauge('lockerRoom', 4),
          ],
          tone: 'good',
        }
      }
      if (id === 'push_more') {
        return c.rng.chance(0.5)
          ? {
              outcome: 'got_more',
              effects: [
                { t: 'transfer', clubId: club.id, loan: false, wage: Math.round(base * 1.45), years: contractYears(c.player.age, club.tier, false) },
                rel('agent', 12), gauge('lockerRoom', -6),
              ],
              headline: true,
              tone: 'good',
            }
          : { outcome: 'refused', effects: [gauge('coachTrust', -10), gauge('morale', -8), flag('contract_row')], tone: 'bad' }
      }
      return { outcome: 'run_down', effects: [gauge('coachTrust', -14), flag('free_agent_soon'), rel('agent', 10)], tone: 'neutral' }
    },
  },
  {
    key: 'release_clause',
    channel: 'board',
    stages: ['preseason'],
    once: true,
    weight: 5,
    when: (c) => c.ovr >= 72 && c.player.age <= 28,
    build: () => ({ options: [
      { id: 'insert', hints: [H.moneyDown, H.consequenceLater] },
      { id: 'no_clause', hints: [H.moneyUp, H.stayClub] },
    ] }),
    resolve: (_c, id) =>
      id === 'insert'
        ? { outcome: 'insert', effects: [money(-200_000), flag('release_clause'), rel('agent', 12)], tone: 'neutral' }
        : { outcome: 'no_clause', effects: [money(500_000), gauge('coachTrust', 6)], tone: 'neutral' },
  },
  {
    key: 'triumphant_return',
    channel: 'transfer',
    stages: ['winter'],
    once: true,
    weight: 5,
    when: (c) => c.player.age >= 31 && c.state.clubsPlayed.length >= 3,
    build: (c) => {
      const first = c.state.clubsPlayed[0]
      return {
        bodyParams: { club: getClub(first).name },
        options: [
          { id: `${TO}${first}`, labelParams: { club: getClub(first).name }, hints: [H.fansUp, H.moneyDown, H.leaveClub] },
          { id: 'decline', hints: [H.stayClub] },
        ],
      }
    },
    resolve: (c, id) => {
      if (id.startsWith(TO)) {
        const clubId = id.slice(TO.length)
        const club = getClub(clubId)
        return {
          outcome: 'returned',
          params: { club: club.name },
          effects: [
            { t: 'transfer', clubId, loan: false, wage: Math.round(wageFor(c.ovr, c.player.age, club.tier) * 0.6), years: 2 },
            gauge('fanLove', 30), gauge('morale', 20), gauge('lockerRoom', 14), trait('homecoming'),
          ],
          headline: true,
          tone: 'good',
        }
      }
      return { outcome: 'decline', effects: [gauge('morale', -6)], tone: 'neutral' }
    },
  },
  {
    key: 'big_money_league',
    channel: 'transfer',
    stages: ['winter'],
    once: false,
    weight: 6,
    when: (c) => c.player.age >= 29 && c.ovr >= 74,
    build: (c) => {
      const offers = generateOffers(c.state, c.rng, { count: 1, country: c.rng.pick(['KSA', 'USA']) })
      const target = offers[0]
      if (!target) return { options: [{ id: 'decline', hints: [H.stayClub] }] }
      const club = getClub(target.clubId)
      return {
        bodyParams: { club: club.name, wage: Math.round(target.wage * 2.5) },
        options: [
          { id: `${TO}${club.id}`, labelParams: { club: club.name }, hints: [H.moneyUp, H.leaveClub, H.titleOddsDown] },
          { id: 'decline', hints: [H.stayClub, H.fansUp] },
        ],
      }
    },
    resolve: (c, id) => {
      if (id.startsWith(TO)) {
        const clubId = id.slice(TO.length)
        const club = getClub(clubId)
        return {
          outcome: 'took_money',
          params: { club: club.name },
          effects: [
            { t: 'transfer', clubId, loan: false, wage: Math.round(wageFor(c.ovr, c.player.age, club.tier) * 2.5), years: 2 },
            gauge('fame', 10), gauge('mediaRep', -10),
          ],
          headline: true,
          tone: 'neutral',
        }
      }
      return { outcome: 'declined', effects: [gauge('fanLove', 14), gauge('mediaRep', 12)], tone: 'good' }
    },
  },
  {
    key: 'agent_pressure',
    channel: 'transfer',
    stages: ['winter'],
    once: false,
    weight: 5,
    when: (c) => c.player.gauges.coachTrust < 45 && c.player.age >= 21,
    build: (c) => ({
      bodyParams: { agent: c.state.relationships.find((r) => r.role === 'agent')?.name ?? { key: 'npc.agent' } },
      options: [
        { id: 'listen', hints: [H.leaveClub, H.moneyUp] },
        { id: 'refuse', hints: [H.stayClub, H.trustUp] },
        { id: 'change_agent', hints: [H.gamble] },
      ],
    }),
    resolve: (_c, id) => {
      if (id === 'listen') return { outcome: 'listen', effects: [flag('wants_out'), rel('agent', 12), gauge('coachTrust', -6)], tone: 'neutral' }
      if (id === 'refuse') return { outcome: 'refuse', effects: [rel('agent', -14), gauge('coachTrust', 8), gauge('lockerRoom', 6)], tone: 'good' }
      return { outcome: 'change_agent', effects: [flag('new_agent'), rel('agent', -100), later('new_agent_arrives', 0, 'review')], tone: 'neutral' }
    },
  },
  {
    key: 'new_agent_arrives',
    channel: 'transfer',
    stages: ['review'],
    once: false,
    weight: 0,
    build: () => ({ options: [
      { id: 'aggressive', hints: [H.moneyUp, H.mediaDown] },
      { id: 'family_friend', hints: [H.moraleUp, H.gamble] },
    ] }),
    resolve: (_c, id) =>
      id === 'aggressive'
        ? { outcome: 'aggressive', effects: [rel('agent', 40), money(300_000), gauge('mediaRep', -8), trait('shark_agent')], tone: 'neutral' }
        : { outcome: 'family_friend', effects: [rel('agent', 60), gauge('morale', 10), flag('amateur_agent')], tone: 'neutral' },
  },
  {
    key: 'homesick_move',
    channel: 'transfer',
    stages: ['winter'],
    once: false,
    weight: 0,
    when: (c) => (c.state.flags.force_home_move ?? 0) > 0,
    build: (c) => {
      const offers = generateOffers(c.state, c.rng, { count: 2, country: c.player.countryCode })
      return {
        bodyParams: { home: getCountry(c.player.countryCode).name },
        options: [
          ...offers.map((o) => ({
            id: `${TO}${o.clubId}`,
            labelParams: { club: getClub(o.clubId).name, wage: o.wage },
            hints: [H.moraleUp, H.leaveClub],
          })),
          { id: 'stay', hints: [H.stayClub, H.moraleDown] },
        ],
      }
    },
    resolve: (c, id) => {
      if (id.startsWith(TO)) {
        const clubId = id.slice(TO.length)
        return {
          outcome: 'went_home',
          params: { club: getClub(clubId).name },
          effects: [moveEffect(clubId, c.ovr, c.player.age), gauge('morale', 22), flag('force_home_move', -1)],
          headline: true,
          tone: 'good',
        }
      }
      return { outcome: 'stayed', effects: [gauge('morale', -16), flag('force_home_move', -1), flag('broken_promise')], tone: 'bad' }
    },
  },
]
