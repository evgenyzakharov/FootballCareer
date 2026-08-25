import { H, attr, flag, gauge, later, minutes, money, potential, rel, trait } from './context'
import type { EventDef } from './context'
import { getCountry } from '../../data/countries'

export const LIFE_EVENTS: EventDef[] = [
  {
    key: 'finish_school',
    channel: 'life',
    stages: ['preseason'],
    once: true,
    weight: 7,
    when: (c) => c.player.age <= 21,
    build: () => ({ options: [
      { id: 'study', hints: [H.growthUp, H.fitnessDown] },
      { id: 'football_only', hints: [H.growthUp, H.consequenceLater] },
    ] }),
    resolve: (_c, id) =>
      id === 'study'
        ? { outcome: 'study', effects: [attr('mental', 4), gauge('fitness', -6), trait('educated'), potential(1)], tone: 'good' }
        : { outcome: 'football_only', effects: [attr('mental', -1), gauge('form', 5), later('after_football_worry', 8, 'winter')], tone: 'neutral' },
  },
  {
    key: 'after_football_worry',
    channel: 'life',
    stages: ['winter'],
    once: true,
    weight: 0,
    build: () => ({ options: [
      { id: 'coaching_badges', hints: [H.growthUp, H.minutesDown] },
      { id: 'business_course', hints: [H.moneyUp, H.formDown] },
      { id: 'later', hints: [H.noEffect] },
    ] }),
    resolve: (_c, id) => {
      if (id === 'coaching_badges') return { outcome: 'coaching_badges', effects: [attr('mental', 5), trait('future_coach')], tone: 'good' }
      if (id === 'business_course') return { outcome: 'business_course', effects: [money(500_000), gauge('form', -6), trait('businessman')], tone: 'neutral' }
      return { outcome: 'later', effects: [gauge('morale', -4)], tone: 'neutral' }
    },
  },
  {
    key: 'tax_trouble',
    channel: 'life',
    stages: ['winter'],
    once: true,
    weight: 5,
    when: (c) => c.player.money > 3_000_000 && c.club !== null && c.club.country !== c.player.countryCode,
    build: (c) => ({ bodyParams: { country: getCountry(c.club?.country ?? c.player.countryCode).nameGen }, options: [
      { id: 'settle', hints: [H.moneyDown, H.safe] },
      { id: 'fight', hints: [H.gamble, H.mediaDown] },
      { id: 'leave_country', hints: [H.leaveClub] },
    ] }),
    resolve: (c, id) => {
      if (id === 'settle') {
        return { outcome: 'settle', effects: [money(-Math.round(c.player.money * 0.25)), gauge('mediaRep', -6)], tone: 'neutral' }
      }
      if (id === 'fight') {
        return c.rng.chance(0.45)
          ? { outcome: 'cleared', effects: [gauge('mediaRep', 10), gauge('morale', 8)], headline: true, tone: 'good' }
          : { outcome: 'convicted', effects: [money(-Math.round(c.player.money * 0.5)), gauge('mediaRep', -30), gauge('form', -10), flag('tax_case')], headline: true, tone: 'bad' }
      }
      return { outcome: 'leave_country', effects: [flag('wants_out'), gauge('mediaRep', -10)], tone: 'neutral' }
    },
  },
  {
    key: 'family_pressure',
    channel: 'life',
    stages: ['winter'],
    once: false,
    weight: 6,
    when: (c) => c.club !== null && c.club.country !== c.player.countryCode && c.player.age >= 22,
    build: (c) => ({ bodyParams: { home: getCountry(c.player.countryCode).nameAcc }, options: [
      { id: 'bring_them', cost: 400_000, hints: [H.moraleUp, H.moneyDown] },
      { id: 'promise_return', hints: [H.moraleUp, H.consequenceLater] },
      { id: 'refuse', hints: [H.moraleDown, H.formUp] },
    ] }),
    resolve: (_c, id) => {
      if (id === 'bring_them') return { outcome: 'bring_them', effects: [gauge('morale', 16), money(-400_000), gauge('form', 6)], tone: 'good' }
      if (id === 'promise_return') return { outcome: 'promise_return', effects: [gauge('morale', 10), later('return_home_promise', 3, 'winter')], tone: 'neutral' }
      return { outcome: 'refuse', effects: [gauge('morale', -14), gauge('form', 6), attr('mental', 1)], tone: 'neutral' }
    },
  },
  {
    key: 'return_home_promise',
    channel: 'transfer',
    stages: ['winter'],
    once: true,
    weight: 0,
    build: (c) => ({ bodyParams: { home: getCountry(c.player.countryCode).nameAcc }, options: [
      { id: 'keep_promise', hints: [H.moraleUp, H.leaveClub] },
      { id: 'break_promise', hints: [H.moraleDown, H.stayClub] },
    ] }),
    resolve: (_c, id) =>
      id === 'keep_promise'
        ? { outcome: 'keep_promise', effects: [flag('force_home_move'), gauge('morale', 14)], tone: 'neutral' }
        : { outcome: 'break_promise', effects: [gauge('morale', -18), gauge('form', -8), flag('broken_promise')], tone: 'bad' },
  },
  {
    key: 'gambling',
    channel: 'life',
    stages: ['autumn', 'winter', 'spring'],
    once: false,
    weight: 4,
    when: (c) => c.player.money > 1_000_000 && c.player.age >= 20,
    build: () => ({ options: [
      { id: 'in', hints: [H.gamble, H.moneyUp] },
      { id: 'out', hints: [H.safe] },
    ] }),
    resolve: (c, id) => {
      if (id === 'out') return { outcome: 'out', effects: [gauge('morale', -2)], tone: 'neutral' }
      if (c.rng.chance(0.4)) {
        return { outcome: 'won', effects: [money(Math.round(c.player.money * 0.3)), gauge('morale', 8), flag('gambler')], tone: 'good' }
      }
      return {
        outcome: 'lost',
        effects: [money(-Math.round(c.player.money * 0.45)), gauge('morale', -14), gauge('form', -10), flag('gambler'), later('debt_pressure', 1, 'autumn')],
        headline: true,
        tone: 'bad',
      }
    },
  },
  {
    key: 'debt_pressure',
    channel: 'life',
    stages: ['autumn'],
    once: false,
    weight: 0,
    build: () => ({ options: [
      { id: 'sell_assets', cost: 600_000, hints: [H.moneyDown, H.safe] },
      { id: 'borrow', hints: [H.consequenceLater] },
      { id: 'go_public', hints: [H.mediaDown, H.fansUp] },
    ] }),
    resolve: (_c, id) => {
      if (id === 'sell_assets') return { outcome: 'sell_assets', effects: [money(-600_000), gauge('morale', 6)], tone: 'neutral' }
      if (id === 'borrow') return { outcome: 'borrow', effects: [money(400_000), later('honesty_test', 1, 'spring')], tone: 'bad' }
      return { outcome: 'go_public', effects: [gauge('mediaRep', -12), gauge('fanLove', 10), gauge('morale', 10), trait('open_book')], headline: true, tone: 'neutral' }
    },
  },
  {
    key: 'property_investment',
    channel: 'life',
    stages: ['winter'],
    once: false,
    weight: 5,
    when: (c) => c.player.money > 2_000_000,
    build: () => ({ options: [
      { id: 'invest', hints: [H.moneyDown, H.consequenceLater] },
      { id: 'keep_cash', hints: [H.safe] },
    ] }),
    resolve: (c, id) =>
      id === 'invest'
        ? { outcome: 'invest', effects: [money(-Math.round(c.player.money * 0.4)), later('investment_matures', 3, 'winter')], tone: 'neutral' }
        : { outcome: 'keep_cash', effects: [], tone: 'neutral' },
  },
  {
    key: 'investment_matures',
    channel: 'life',
    stages: ['winter'],
    once: false,
    weight: 0,
    build: () => ({ options: [{ id: 'ok', hints: [H.noEffect] }] }),
    resolve: (c) =>
      c.rng.chance(0.68)
        ? { outcome: 'profit', effects: [money(Math.round(c.player.money * 0.9 + 1_500_000)), gauge('morale', 8)], tone: 'good' }
        : { outcome: 'loss', effects: [gauge('morale', -10), flag('bad_investment')], tone: 'bad' },
  },
  {
    key: 'child_born',
    channel: 'life',
    stages: ['preseason', 'winter'],
    once: true,
    weight: 5,
    when: (c) => c.player.age >= 24,
    build: () => ({ options: [
      { id: 'full_time', hints: [H.moraleUp, H.fitnessDown] },
      { id: 'balance', hints: [H.moraleUp, H.safe] },
    ] }),
    resolve: (_c, id) =>
      id === 'full_time'
        ? { outcome: 'full_time', effects: [gauge('morale', 20), gauge('fitness', -10), attr('mental', 3), trait('family_man')], headline: true, tone: 'good' }
        : { outcome: 'balance', effects: [gauge('morale', 12), attr('mental', 1)], tone: 'good' },
  },
  {
    key: 'foundation',
    channel: 'life',
    stages: ['winter'],
    once: true,
    weight: 4,
    when: (c) => c.player.money > 8_000_000 && c.player.gauges.fame >= 45,
    build: () => ({ options: [
      { id: 'found', cost: 3_000_000, hints: [H.moneyDown, H.fansUp, H.mediaUp] },
      { id: 'skip', hints: [H.noEffect] },
    ] }),
    resolve: (_c, id) =>
      id === 'found'
        ? { outcome: 'found', effects: [money(-3_000_000), gauge('fanLove', 20), gauge('mediaRep', 24), gauge('morale', 10), trait('philanthropist')], headline: true, tone: 'good' }
        : { outcome: 'skip', effects: [], tone: 'neutral' },
  },
  {
    key: 'agent_scam',
    channel: 'life',
    stages: ['winter'],
    once: true,
    weight: 4,
    when: (c) => c.player.money > 4_000_000,
    build: () => ({ options: [
      { id: 'trust', hints: [H.gamble, H.moneyUp] },
      { id: 'audit', cost: 50_000, hints: [H.safe] },
    ] }),
    resolve: (c, id) => {
      if (id === 'audit') return { outcome: 'audit', effects: [money(-50_000), rel('agent', -10), gauge('morale', 4)], tone: 'neutral' }
      return c.rng.chance(0.5)
        ? { outcome: 'fine', effects: [money(Math.round(c.player.money * 0.2)), rel('agent', 14)], tone: 'good' }
        : { outcome: 'robbed', effects: [money(-Math.round(c.player.money * 0.55)), rel('agent', -60), gauge('morale', -16), flag('agent_betrayal')], headline: true, tone: 'bad' }
    },
  },
  {
    key: 'language_barrier',
    channel: 'life',
    stages: ['winter'],
    once: true,
    weight: 6,
    when: (c) => c.club !== null && c.club.country !== c.player.countryCode && c.player.age <= 30,
    build: (c) => ({
      bodyParams: { country: getCountry(c.club?.country ?? c.player.countryCode).nameGen },
      options: [
        { id: 'learn', hints: [H.lockerUp, H.formDown] },
        { id: 'interpreter', cost: 60_000, hints: [H.moneyDown, H.lockerDown] },
        { id: 'football_only', hints: [H.formUp, H.lockerDown] },
      ],
    }),
    resolve: (_c, id) => {
      if (id === 'learn') {
        return { outcome: 'learn', effects: [attr('mental', 3), gauge('lockerRoom', 12), gauge('form', -4)], tone: 'good' }
      }
      if (id === 'interpreter') {
        return { outcome: 'interpreter', effects: [money(-60_000), gauge('lockerRoom', -6), gauge('form', 3)], tone: 'neutral' }
      }
      return { outcome: 'football_only', effects: [gauge('lockerRoom', -12), gauge('form', 6), flag('outsider')], tone: 'neutral' }
    },
  },
  {
    key: 'parent_illness',
    channel: 'life',
    stages: ['winter'],
    once: true,
    weight: 4,
    when: (c) => c.player.age >= 20,
    build: () => ({ options: [
      { id: 'go_home', hints: [H.moraleUp, H.minutesDown] },
      { id: 'pay_treatment', cost: 500_000, hints: [H.moneyDown] },
      { id: 'bring_family', cost: 1_200_000, hints: [H.moneyDown, H.moraleUp] },
    ] }),
    resolve: (_c, id) => {
      if (id === 'pay_treatment') {
        return { outcome: 'pay_treatment', effects: [money(-500_000), gauge('morale', -6), gauge('form', -4)], tone: 'neutral' }
      }
      if (id === 'bring_family') {
        return { outcome: 'bring_family', effects: [money(-1_200_000), gauge('morale', 20), gauge('form', 6), trait('family_man')], tone: 'good' }
      }
      return { outcome: 'go_home', effects: [minutes(0.7), gauge('coachTrust', -10), gauge('morale', 14)], tone: 'neutral' }
    },
  },
  {
    key: 'driving_ban',
    channel: 'life',
    stages: ['autumn', 'winter'],
    once: false,
    weight: 4,
    when: (c) => c.player.money > 1_000_000 && c.player.age >= 19,
    build: () => ({ options: [
      { id: 'admit', cost: 80_000, hints: [H.moneyDown, H.safe] },
      { id: 'lawyers', cost: 250_000, hints: [H.moneyDown, H.gamble] },
      { id: 'silence', hints: [H.mediaDown, H.fameUp] },
    ] }),
    resolve: (c, id) => {
      if (id === 'admit') {
        return { outcome: 'admit', effects: [money(-80_000), gauge('mediaRep', -4), gauge('morale', -3)], tone: 'neutral' }
      }
      if (id === 'lawyers') {
        return c.rng.chance(0.5)
          ? { outcome: 'cleared', effects: [money(-250_000), gauge('mediaRep', 5)], tone: 'good' }
          : { outcome: 'convicted', effects: [money(-250_000), gauge('mediaRep', -16), gauge('morale', -8)], headline: true, tone: 'bad' }
      }
      return { outcome: 'silence', effects: [gauge('mediaRep', -14), gauge('fanLove', -6), gauge('fame', 5)], headline: true, tone: 'bad' }
    },
  }
]
