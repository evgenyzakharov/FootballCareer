import { H, attr, flag, gauge, minutes, money, objective, odds, rel, release, trait } from './context'
import type { EventDef, OptionDraft } from './context'
import type { Effect, Objective } from '../types'
import { getClub } from '../../data/clubs'
import { getLeague } from '../../data/leagues'
import { contractYears, fallbackOffers, generateOffers, loanOffers, wageFor } from '../offers'
import { roleRank } from '../performance'

const TO = 'to:'
const LOAN = 'loan:'

function move(clubId: string, ovr: number, age: number, loan: boolean, wageMult = 1): Effect {
  const club = getClub(clubId)
  return {
    t: 'transfer',
    clubId,
    loan,
    wage: Math.round(wageFor(ovr, age, club) * (loan ? 0.6 : 1) * wageMult),
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
  // Задачу на число матчей не ставим: состав выбирает сам тренер, и обещать
  // выход на поле игрок не может. С запасного спрашивают за то, как он играет,
  // когда всё-таки выходит. Вид 'apps' в типе остаётся — он есть в старых
  // сохранениях, и проверка обязана уметь его считать.
  if (rank <= 1) {
    return { kind: 'rating', target: 6.5 + (tier - 1) * 0.05, reward: 10, penalty: 16 }
  }
  if (position === 'GK' || position === 'CB' || position === 'CDM' || position === 'LB' || position === 'RB') {
    return { kind: 'rating', target: 6.6 + (tier - 1) * 0.06, reward: 12, penalty: 20 }
  }
  if (position === 'ST' || position === 'LW' || position === 'RW') {
    const target = Math.max(6, Math.round((ovr - 50) * 0.42 + tier - 1))
    return { kind: 'goals', target, reward: 14, penalty: 24 }
  }
  const target = Math.max(4, Math.round((ovr - 52) * 0.28 + tier - 1))
  return { kind: 'assists', target, reward: 12, penalty: 20 }
}

/**
 * Пересмотр задачи. Меняем саму цель, а не множитель на проверку: иначе игроку
 * показывается одно число, а сверяется другое.
 *
 * Для счётных целей (матчи, голы, передачи) сдвиг пропорциональный. Для средней
 * оценки — абсолютный: она живёт в узком коридоре 6–8, и умножить 6.7 на 1.25
 * значит потребовать 8.4, чего не бывает.
 */
export function adjustObjective(target: Objective, direction: 'up' | 'down'): Objective {
  const up = direction === 'up'
  const rewardScale = up ? 1.5 : 0.6
  const next: Objective = {
    ...target,
    reward: Math.round(target.reward * rewardScale),
    penalty: Math.round(target.penalty * rewardScale),
    target: target.target,
  }
  if (target.kind === 'rating') {
    next.target = Math.round((target.target + (up ? 0.25 : -0.2)) * 100) / 100
  } else {
    next.target = Math.max(1, Math.round(target.target * (up ? 1.25 : 0.8)))
  }
  return next
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
      if (id === 'negotiate') return { outcome: 'negotiate', effects: [objective('down'), gauge('coachTrust', -6)], tone: 'neutral' }
      if (id === 'raise') return { outcome: 'raise', effects: [objective('up'), gauge('coachTrust', 8), rel('manager', 8)], tone: 'neutral' }
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
            hints: club.tier >= 5 ? [H.growthBig, H.minutesDown] : club.tier >= 3 ? [H.growthUp, H.safe] : [H.minutesUp, H.growthUp],
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
            years: o.years,
          },
          hints: o.kind === 'loan' ? [H.minutesUp, H.growthUp] : club.tier > (c.club?.tier ?? 1) ? [H.titleOdds, H.minutesDown] : [H.minutesUp],
        }
      })
      if (c.club) {
        options.push({
          id: 'stay',
          labelParams: { club: c.club.name, league: getLeague(c.club.leagueId).name, wage: 0, role: { key: 'role.starter' }, years: 0 },
          hints: [H.stayClub, H.fansUp],
        })
      }
      if (c.player.age >= 34) {
        options.push({ id: 'retire', labelParams: { club: '', league: '', wage: 0, role: { key: 'role.starter' }, years: 0 }, hints: [H.safe] })
      }
      return { options }
    },
    resolve: (c, id) => {
      if (id === 'retire') return { outcome: 'retire', effects: [{ t: 'retire' }], headline: true, tone: 'neutral' }
      if (id === 'stay') {
        // Контракт истёк — «остаться» значит подписать новый, иначе игрок
        // годами доигрывал бы на нулевом сроке и рынок открывался каждый год.
        const expired = (c.state.contract?.yearsLeft ?? 0) <= 0
        const effects = [gauge('fanLove', 8), gauge('lockerRoom', 6)]
        if (expired && c.club) effects.unshift(move(c.club.id, c.ovr, c.player.age, false))
        return { outcome: 'stay', effects, tone: 'good' }
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
    key: 'contract_expired',
    channel: 'transfer',
    stages: ['review'],
    once: false,
    weight: 0,
    build: (c) => {
      const offers = generateOffers(c.state, c.rng, { count: 2 })
      const list = offers.length > 0 ? offers : fallbackOffers(c.state, c.rng, 2)
      const options: OptionDraft[] = list.map((o) => {
        const club = getClub(o.clubId)
        return {
          id: `${TO}${o.clubId}`,
          labelParams: {
            club: club.name,
            league: getLeague(club.leagueId).name,
            wage: o.wage,
            years: o.years,
          },
          hints: [H.leaveClub],
        }
      })
      if (c.player.age >= 32) options.push({ id: 'retire', hints: [H.safe] })
      options.push({ id: 'wait', hints: [H.gamble, H.formDown] })
      return { bodyParams: { club: c.club?.name ?? '' }, options }
    },
    resolve: (c, id) => {
      if (id === 'retire') {
        return { outcome: 'retire', effects: [{ t: 'retire' }], headline: true, tone: 'neutral' }
      }
      if (id === 'wait') {
        return {
          outcome: 'wait',
          effects: [release(), gauge('morale', -10)],
          headline: true,
          tone: 'bad',
        }
      }
      const clubId = id.slice(TO.length)
      return {
        outcome: 'signed',
        params: { club: getClub(clubId).name },
        effects: [move(clubId, c.ovr, c.player.age, false), gauge('morale', 4)],
        headline: true,
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
    build: (c) => {
      // Клуб «дивизионом ниже» показываем сразу: иначе игрок выбирает вслепую.
      const fallback = fallbackOffers(c.state, c.rng, 1)[0]
      const options: OptionDraft[] = []
      if (fallback) {
        const club = getClub(fallback.clubId)
        options.push({
          id: `${TO}${fallback.clubId}`,
          labelParams: { club: club.name, league: getLeague(club.leagueId).name },
          hints: [H.minutesUp, H.moneyDown],
        })
      }
      if (c.player.age >= 30) options.push({ id: 'retire', hints: [H.safe] })
      options.push({ id: 'train_alone', hints: [H.gamble, H.formDown, H.leaveClub] })
      return { options }
    },
    resolve: (c, id) => {
      if (id === 'retire') return { outcome: 'retire', effects: [{ t: 'retire' }], headline: true, tone: 'neutral' }
      if (id.startsWith(TO)) {
        const clubId = id.slice(TO.length)
        return {
          outcome: 'drop_down',
          params: { club: getClub(clubId).name },
          effects: [move(clubId, c.ovr, c.player.age, false, 0.6), gauge('morale', -8)],
          tone: 'neutral',
        }
      }
      // Контракт расторгается: иначе игрок «без клуба» продолжал играть за старый.
      return {
        outcome: 'train_alone',
        effects: [release(), gauge('form', -14), gauge('fitness', 8), gauge('morale', -10)],
        headline: true,
        tone: 'bad',
      }
    },
  },
  {
    key: 'free_agent_year',
    channel: 'life',
    stages: ['preseason'],
    once: false,
    weight: 0,
    build: (c) => {
      const fallback = fallbackOffers(c.state, c.rng, 1)[0]
      const options: OptionDraft[] = []
      if (fallback) {
        const club = getClub(fallback.clubId)
        options.push({
          id: `${TO}${fallback.clubId}`,
          labelParams: { club: club.name, league: getLeague(club.leagueId).name },
          hints: [H.minutesUp, H.moneyDown],
        })
      }
      options.push({ id: 'keep_fit', cost: 35_000, hints: [H.fitnessUp, H.moneyDown] })
      options.push({ id: 'badges', hints: [H.growthUp, H.formDown] })
      return { options }
    },
    resolve: (c, id) => {
      if (id.startsWith(TO)) {
        const clubId = id.slice(TO.length)
        return {
          outcome: 'signed_low',
          params: { club: getClub(clubId).name },
          effects: [move(clubId, c.ovr, c.player.age, false, 0.55), gauge('morale', 12), gauge('form', 6)],
          headline: true,
          tone: 'good',
        }
      }
      if (id === 'keep_fit') {
        return {
          outcome: 'keep_fit',
          effects: [money(-35_000), gauge('fitness', 18), gauge('form', 6), trait('self_made')],
          tone: 'neutral',
        }
      }
      return {
        outcome: 'badges',
        effects: [attr('mental', 4), gauge('form', -8), trait('future_coach')],
        tone: 'neutral',
      }
    },
  },
  {
    key: 'trial_offer',
    channel: 'transfer',
    stages: ['winter'],
    once: false,
    weight: 0,
    build: (c) => {
      const offers = fallbackOffers(c.state, c.rng, 2)
      return {
        options: [
          ...offers.map((o) => {
            const club = getClub(o.clubId)
            return {
              id: `${TO}${o.clubId}`,
              labelParams: { club: club.name, league: getLeague(club.leagueId).name, wage: o.wage },
              hints: [H.minutesUp, H.moraleUp],
            }
          }),
          { id: 'wait', hints: [H.gamble, H.formDown] },
        ],
      }
    },
    resolve: (c, id) => {
      if (id.startsWith(TO)) {
        const clubId = id.slice(TO.length)
        return {
          outcome: 'signed',
          params: { club: getClub(clubId).name },
          effects: [move(clubId, c.ovr, c.player.age, false, 0.6), gauge('morale', 14), gauge('form', 8)],
          headline: true,
          tone: 'good',
        }
      }
      return { outcome: 'wait', effects: [gauge('form', -6), gauge('morale', -8)], tone: 'bad' }
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
    when: (c) => (c.club?.tier ?? 1) >= 4,
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
    when: (c) => c.ovr >= 70 && (c.state.contract?.wage ?? 0) < wageFor(c.ovr, c.player.age, c.club) * 0.7,
    build: (c) => ({
      bodyParams: { fair: wageFor(c.ovr, c.player.age, c.club), current: c.state.contract?.wage ?? 0 },
      options: [
        { id: 'demand', hints: [H.moneyUp, H.trustDown] },
        { id: 'wait', hints: [H.trustUp] },
        { id: 'strike', hints: [H.gamble, H.moneyUp] },
      ],
    }),
    resolve: (c, id) => {
      const club = c.club
      if (!club) return { outcome: 'wait', effects: [] }
      const fair = wageFor(c.ovr, c.player.age, club)
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
