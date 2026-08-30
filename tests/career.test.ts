import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Timeline } from '../src/ui/Timeline'
import { seasonLabel } from '../src/ui/format'
import { ack, applyEffects, choose, currentOvr, newCareer, setIdentity, squadStanding } from '../src/engine/career'
import type { CareerState, Confederation, Gauges, Objective, Pace, Position, Role } from '../src/engine/types'
import {
  DOGHOUSE, FROZEN_OUT, ROUNDS_PER_SEASON, SEASON_MATCHES,
  averageRating, determineRole, matchesBefore, matchesInRound, roleRank, simulateBlock,
} from '../src/engine/performance'
import { seasonFixtures } from '../src/engine/fixtures'
import { INJURY_TYPES, injuryMatches } from '../src/engine/injuries'
import { adjustObjective, makeObjective } from '../src/engine/events/structural'
import { Rng } from '../src/engine/rng'
import { createPlayer, playerOvr, squadLevel } from '../src/engine/player'
import { formatMoney, missingKeys, t } from '../src/i18n'
import { ALL_EVENTS, buildCard, getEvent, resolveCard } from '../src/engine/events'
import { CLUBS, findClub, getClub } from '../src/data/clubs'
import { LEAGUES, getLeague } from '../src/data/leagues'
import {
  NATIONAL_TOURNAMENT, isOlympicYear, leagueLift, rollLeaguePosition, tournamentThisSeason,
} from '../src/engine/competitions'
import { academyOffers, clubWageCeiling, clubWantsToRenew, generateOffers, wageFor } from '../src/engine/offers'

/** Прогоняет карьеру до конца, выбирая варианты по сиду. Возвращает финальное состояние. */
function playCareer(
  seed: string,
  options: { renderAll?: boolean; position?: Position; country?: string } = {},
): CareerState {
  let state = setIdentity(newCareer(seed), {
    lastName: 'ТЕСТОВ',
    shirt: 10,
    foot: 'right',
    countryCode: options.country ?? 'ITA',
    position: options.position ?? 'CAM',
  })
  const rng = new Rng(seed, 'player-choices', 0)
  let guard = 0
  while (state.phase !== 'retired' && guard < 4000) {
    guard++
    if (options.renderAll) renderCurrent(state)
    if (state.resolution) {
      state = ack(state)
      continue
    }
    if (!state.card) {
      // Насос должен всегда выдавать карточку, пока карьера не закончена.
      throw new Error(`stuck: phase=${state.phase} stage=${state.stage} queue=${state.queue.length}`)
    }
    const card = state.card
    // Недоступные варианты нажать нельзя — прогон обязан вести себя как игрок.
    const available = card.options.filter((o) => !o.disabled)
    // Карточка, у которой нечего выбрать, заперла бы карьеру наглухо.
    if (card.options.length > 0) expect(available.length).toBeGreaterThan(0)
    const optionId = available.length > 0 ? rng.pick(available).id : 'next'
    state = choose(state, optionId)
  }
  expect(guard).toBeLessThan(4000)
  return state
}

function renderCurrent(state: CareerState): void {
  for (const locale of ['ru', 'en'] as const) {
    if (state.resolution) t(state.resolution.text, locale)
    if (state.card) {
      t(state.card.title, locale)
      t(state.card.body, locale)
      for (const line of state.card.details ?? []) t(line, locale)
      for (const option of state.card.options) {
        t(option.label, locale)
        for (const hint of option.hints) t(hint.text, locale)
      }
    }
    for (const item of state.feed) t(item.text, locale)
  }
}

describe('движок карьеры', () => {
  it('доводит карьеру до конца и накапливает историю', () => {
    const state = playCareer('seed-1')
    expect(state.phase).toBe('retired')
    expect(state.history.length).toBeGreaterThan(3)
    expect(state.clubsPlayed.length).toBeGreaterThan(0)
    expect(state.retiredAt).not.toBeNull()
  })

  it('детерминирован: один сид и те же выборы дают ту же карьеру', () => {
    const a = playCareer('same-seed')
    const b = playCareer('same-seed')
    expect(b.history.map((h) => `${h.age}:${h.clubId}:${h.tally.goals}`)).toEqual(
      a.history.map((h) => `${h.age}:${h.clubId}:${h.tally.goals}`),
    )
    expect(b.retiredAt).toBe(a.retiredAt)
  })

  it('разные сиды дают разные карьеры', () => {
    const a = playCareer('seed-A')
    const b = playCareer('seed-B')
    const key = (s: typeof a) => s.history.map((h) => `${h.clubId}:${h.tally.goals}`).join('|')
    expect(key(a)).not.toEqual(key(b))
  })

  it('игрок старше и не молодеет, OVR остаётся в границах', () => {
    const state = playCareer('aging')
    let previousAge = -1
    for (const season of state.history) {
      expect(season.age).toBeGreaterThan(previousAge)
      previousAge = season.age
      expect(season.ovrEnd).toBeGreaterThanOrEqual(20)
      expect(season.ovrEnd).toBeLessThanOrEqual(99)
    }
    expect(playerOvr(state.player)).toBeLessThanOrEqual(99)
  })

  it('статистика сезона не выходит за физически возможное', () => {
    const state = playCareer('stats')
    for (const season of state.history) {
      expect(season.tally.apps).toBeLessThanOrEqual(52)
      expect(season.tally.goals).toBeLessThanOrEqual(season.tally.apps * 3 + 5)
      expect(season.tally.apps).toBeGreaterThanOrEqual(0)
    }
  })

  it('все тексты, встреченные за карьеры всех амплуа, есть в обеих локалях', () => {
    missingKeys.clear()
    // Амплуа перебираем намеренно: у вратаря свои ситуации, и на одном CAM
    // опечатка в их ключах не всплыла бы.
    const positions: Position[] = ['GK', 'CB', 'LB', 'CDM', 'CM', 'CAM', 'RW', 'ST']
    for (const [i, position] of positions.entries()) {
      playCareer(`i18n-${position}`, { renderAll: true, position })
      playCareer(`i18n-alt-${position}`, { renderAll: true, position, country: i % 2 ? 'BRA' : 'ENG' })
    }
    expect([...missingKeys]).toEqual([])
  })

  it('вратарь получает свои ситуации, а не чужие', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 6; i++) {
      const state = playCareer(`gk-${i}`, { position: 'GK', renderAll: true })
      for (const item of state.feed) seen.add(item.text.key)
    }
    // Хотя бы одна вратарская карточка должна была выпасть за шесть карьер.
    const gkKeys = [...seen].filter((key) => key.startsWith('ev.gk_') || key.startsWith('ev.tournament_moment_gk'))
    expect(gkKeys.length).toBeGreaterThan(0)
  })

  it('полевые эпизоды не выпадают вратарю', () => {
    for (let i = 0; i < 6; i++) {
      const state = playCareer(`gk-excl-${i}`, { position: 'GK' })
      const keys = state.feed.map((item) => item.text.key)
      // Эти карточки описывают игрока с мячом в чужой штрафной.
      expect(keys.some((k) => k.startsWith('ev.title_decider.'))).toBe(false)
      expect(keys.some((k) => k.startsWith('ev.cup_final_penalties.'))).toBe(false)
      expect(keys.some((k) => k.startsWith('ev.last_minute_chance.'))).toBe(false)
      expect(keys.some((k) => k.startsWith('ev.tournament_moment.'))).toBe(false)
    }
  })

  it('у каждого события уникальный ключ', () => {
    const keys = ALL_EVENTS.map((e) => e.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('вердикт по задаче сезона сходится с целью, которая показана игроку', () => {
    // Именно это и разъезжалось: проверка домножала цель на скрытый
    // коэффициент, а в отчёт печаталась исходная.
    for (const seed of ['obj-1', 'obj-2', 'obj-3', 'obj-4', 'obj-5']) {
      const state = playCareer(seed)
      for (const season of state.history) {
        const objective = season.objective
        if (!objective || season.objectiveMet === null) continue
        const achieved =
          objective.kind === 'apps' ? season.tally.apps
            : objective.kind === 'goals' ? season.tally.goals
              : objective.kind === 'assists' ? season.tally.assists
                : objective.kind === 'rating' ? averageRating(season.tally.ratingSum, season.tally.ratingCount)
                  : season.trophies.length
        const expected = objective.kind === 'trophy'
          ? season.trophies.length > 0
          : achieved >= objective.target
        expect(
          season.objectiveMet,
          `сид ${seed}, сезон ${season.age}, ${objective.kind}: достигнуто ${achieved}, цель ${objective.target}`,
        ).toBe(expected)
      }
    }
  })

  it('пересмотр задачи меняет саму цель и остаётся в реальном коридоре', () => {
    const byRating: Objective = { kind: 'rating', target: 6.72, reward: 12, penalty: 10 }
    const up = adjustObjective(byRating, 'up')
    const down = adjustObjective(byRating, 'down')
    // Оценка живёт в коридоре 6–8: домножить 6.72 на 1.25 значило бы 8.4.
    expect(up.target).toBeCloseTo(6.97, 2)
    expect(down.target).toBeCloseTo(6.52, 2)
    // Пообещал больше — выше и награда, и штраф.
    expect(up.reward).toBeGreaterThan(byRating.reward)
    expect(up.penalty).toBeGreaterThan(byRating.penalty)
    expect(down.reward).toBeLessThan(byRating.reward)

    const byGoals: Objective = { kind: 'goals', target: 12, reward: 14, penalty: 12 }
    expect(adjustObjective(byGoals, 'up').target).toBe(15)
    expect(adjustObjective(byGoals, 'down').target).toBe(10)
  })

  it('вторая аренда не переподчиняет игрока первому арендодателю', () => {
    // Баг: родительский клуб брался из текущего контракта, а он у арендованного
    // игрока — сам арендный. По итогам второй аренды предлагали вернуться
    // в первый клуб-арендатор вместо того, откуда игрок уехал.
    let state = setIdentity(newCareer('loan-chain'), {
      lastName: 'ТЕСТОВ',
      shirt: 10,
      foot: 'right',
      countryCode: 'ENG',
      position: 'CAM',
    })
    state = ack(choose(state, state.card!.options[0].id))
    const home = state.contract!.clubId
    expect(home).toBeTruthy()

    state = applyEffects(state, [{ t: 'transfer', clubId: 'brighton', loan: true, wage: 1000, years: 1 }])
    expect(state.contract!.isLoan).toBe(true)
    expect(state.contract!.parentClubId).toBe(home)

    state = applyEffects(state, [{ t: 'transfer', clubId: 'west-ham', loan: true, wage: 1000, years: 1 }])
    expect(state.contract!.clubId).toBe('west-ham')
    expect(state.contract!.parentClubId).toBe(home)
    expect(state.season?.parentClubId ?? home).toBe(home)

    // Возврат из аренды обнуляет родителя: контракт снова свой.
    state = applyEffects(state, [{ t: 'transfer', clubId: home, loan: false, wage: 2000, years: 3 }])
    expect(state.contract!.isLoan).toBe(false)
    expect(state.contract!.parentClubId).toBeNull()
  })

  it('урезание зарплаты меняет сам контракт, а не только кошелёк', () => {
    // Раньше вариант «урезать себе зарплату» списывал разовую сумму, а в
    // контракте и в панели игрока зарплата оставалась прежней.
    let state = setIdentity(newCareer('wage-cut'), {
      lastName: 'ТЕСТОВ',
      shirt: 10,
      foot: 'right',
      countryCode: 'ENG',
      position: 'CAM',
    })
    state = ack(choose(state, state.card!.options[0].id))
    const before = state.contract!.wage
    expect(before).toBeGreaterThan(0)

    state = applyEffects(state, [{ t: 'wage', mult: 0.5 }])
    expect(state.contract!.wage).toBe(Math.round(before * 0.5))

    // Без контракта эффект ничего не ломает.
    const free = applyEffects({ ...state, contract: null }, [{ t: 'wage', mult: 0.5 }])
    expect(free.contract).toBeNull()
  })

  it('в кризисе клуба вариант «урезать зарплату» режет контракт вдвое', () => {
    let state = setIdentity(newCareer('crisis'), {
      lastName: 'ТЕСТОВ',
      shirt: 10,
      foot: 'right',
      countryCode: 'ENG',
      position: 'CAM',
    })
    state = ack(choose(state, state.card!.options[0].id))

    const def = ALL_EVENTS.find((e) => e.key === 'club_crisis')!
    const ctx = {
      state,
      player: state.player,
      club: findClub(state.contract!.clubId),
      ovr: currentOvr(state),
      role: 'starter',
      rng: new Rng('crisis', 'ev', 0),
      stage: 'winter',
      payload: {},
    }
    const result = def.resolve(ctx as never, 'wage_cut')
    expect(result.effects).toContainEqual({ t: 'wage', mult: 0.5 })
  })

  it('место клуба в таблице зависит от того, как игрок отыграл сезон', () => {
    // Баг: место считалось от величины, которая почти не менялась, и сезон
    // со средней оценкой 7.3 давал ту же позицию, что сезон на 6.6.
    const club = getClub('spezia')
    const season = (rating: number, apps: number) => ({
      tally: { apps, goals: 0, assists: 0, cleanSheets: 0, goalsConceded: 0,
        ratingSum: rating * apps, ratingCount: apps, yellow: 0, red: 0 },
    })

    const mean = (rating: number, apps: number) => {
      let sum = 0
      const runs = 400
      for (let i = 0; i < runs; i++) {
        const lift = leagueLift(season(rating, apps) as never, 'starter')
        sum += rollLeaguePosition(club, false, lift, new Rng(`pos-${i}`, 'league', 0))
      }
      return sum / runs
    }

    const good = mean(7.4, 34)
    const weak = mean(6.4, 34)
    // Отличный сезон должен поднимать клуб заметно, а не на пол-места.
    expect(good).toBeLessThan(weak - 3)

    // Тот же уровень игры, но четыре матча за сезон — команду это не тащит.
    const cameo = mean(7.4, 4)
    expect(cameo).toBeGreaterThan(good + 2)
  })

  it('клуб не продлевает контракт тем, кто не тянет на основу или потерял тренера', () => {
    let state = setIdentity(newCareer('renew'), {
      lastName: 'ТЕСТОВ',
      shirt: 10,
      foot: 'right',
      countryCode: 'ENG',
      position: 'CAM',
    })
    state = ack(choose(state, state.card!.options[0].id))
    // Считаем от уровня состава конкретного клуба: академия могла оказаться
    // и слабой, и сильной, и «OVR + 6» в ней значит разное.
    const level = squadLevel(findClub(state.contract!.clubId)!.tier)

    const withGauges = (patch: Partial<CareerState['player']['gauges']>): CareerState => ({
      ...state,
      player: { ...state.player, gauges: { ...state.player.gauges, ...patch } },
    })

    // Основной игрок своего уровня, тренер и трибуны нормально — продлевают.
    expect(clubWantsToRenew(withGauges({ coachTrust: 60, fanLove: 55 }), level + 2, 'starter')).toBe(true)

    // Не проходит в состав и растерял доверие — не продлевают.
    expect(clubWantsToRenew(withGauges({ coachTrust: 15, fanLove: 20 }), level - 12, 'reserve')).toBe(false)

    // Тот же игрок основы, но тренер и трибуны против — тоже не продлевают.
    expect(clubWantsToRenew(withGauges({ coachTrust: 0, fanLove: 0 }), level - 4, 'rotation')).toBe(false)

    // Без контракта продлевать нечего.
    expect(clubWantsToRenew({ ...state, contract: null }, 90, 'star')).toBe(false)
  })

  it('клуб платит по своим возможностям, а не по стоимости игрока', () => {
    const small = getClub('alania')
    const big = getClub('inter')

    // Раньше зарплата считалась от одной только стоимости игрока: клуб второй
    // лиги России предлагал восьмидесятому OVR почти миллион евро — в семьдесят
    // раз больше, чем платил игроку своего уровня.
    const ownLevel = wageFor(squadLevel(small.tier), 26, small)
    const star = wageFor(80, 27, small)
    expect(star).toBeGreaterThan(ownLevel)
    expect(star).toBeLessThanOrEqual(Math.ceil(clubWageCeiling(small)))
    // Разрыв между звездой и рядовым в команде — в разы, а не в десятки раз.
    expect(star / ownLevel).toBeLessThan(6)

    // Большому клубу потолок не мешает: он и так платит больше.
    expect(wageFor(80, 27, big)).toBeLessThan(clubWageCeiling(big))
    expect(clubWageCeiling(big)).toBeGreaterThan(clubWageCeiling(small) * 100)

    // Переросшему клуб всё равно предлагает продлить — просто на свои деньги.
    // Решение остаётся за игроком, и обе цифры он видит рядом.
    let state = setIdentity(newCareer('outgrown'), {
      lastName: 'ТЕСТОВ', shirt: 10, foot: 'right', countryCode: 'RUS', position: 'CAM',
    })
    state = ack(choose(state, state.card!.options[0].id))
    const club = findClub(state.contract!.clubId)!
    const loved: CareerState = {
      ...state,
      player: { ...state.player, gauges: { ...state.player.gauges, coachTrust: 95, fanLove: 95 } },
    }
    expect(clubWantsToRenew(loved, squadLevel(club.tier) + 30, 'star')).toBe(true)
  })

  it('деньги показываются в рублях, когда игрок из России', () => {
    // Курс — игровая константа, не настоящий: суммы движка всегда в евро.
    expect(formatMoney(1_000_000, 'ru')).toBe('€1 млн')
    expect(formatMoney(1_000_000, 'ru', 'RUB')).toBe('100 млн ₽')
    expect(formatMoney(1_000_000, 'en', 'RUB')).toBe('100M ₽')
    expect(formatMoney(-5_000, 'ru', 'RUB')).toBe('−500 тыс ₽')
    expect(formatMoney(30, 'ru', 'RUB')).toBe('3 тыс ₽')
  })

  it('тренер не ставит задачу на число матчей и за провал спрашивает строже, чем награждает', () => {
    // Состав выбирает тренер, поэтому обещать выход на поле игрок не может.
    const roles: Role[] = ['reserve', 'bench', 'rotation', 'starter', 'star']
    const positions = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST']
    for (const role of roles) {
      for (const position of positions) {
        for (let tier = 0; tier <= 6; tier++) {
          const objective = makeObjective(position, role, tier, 70)
          expect(objective.kind, `${position}/${role}/тир ${tier}`).not.toBe('apps')
          expect(objective.penalty).toBeGreaterThan(objective.reward)
        }
      }
    }
  })

  it('задача от тренера приходит в начале каждого сезона с клубом', () => {
    for (const seed of ['obj-a', 'obj-b', 'obj-c']) {
      let state = setIdentity(newCareer(seed), {
        lastName: 'ТЕСТОВ',
        shirt: 10,
        foot: 'right',
        countryCode: 'ITA',
        position: 'CAM',
      })
      const picker = new Rng(seed, 'choices', 0)
      let guard = 0
      let armed = false
      let seen = true
      let age = state.player.age
      let stage = state.stage

      while (state.phase !== 'retired' && guard < 4000) {
        guard++
        const entered = state.stage === 'preseason' && (stage !== 'preseason' || state.player.age !== age)
        if (entered) {
          // Прошлую предсезонку закрываем: если контракт был, задача обязана была прийти.
          expect(seen, `сид ${seed}, сезон ${age}: задачи не было`).toBe(true)
          armed = state.contract !== null
          seen = !armed
        }
        stage = state.stage
        age = state.player.age

        if (state.resolution) { state = ack(state); continue }
        if (!state.card) break
        if (state.card.title.key === 'ev.season_objective.title') seen = true
        const available = state.card.options.filter((o) => !o.disabled)
        state = choose(state, available.length > 0 ? picker.pick(available).id : 'next')
      }
      expect(armed || seen).toBe(true)
    }
  })

  it('россиянина из академии зовут только во второй дивизион, остальных — как раньше', () => {
    const offersFor = (code: string, seed: string) => {
      const state = setIdentity(newCareer(seed), {
        lastName: 'ТЕСТОВ', shirt: 10, foot: 'right', countryCode: code, position: 'CAM',
      })
      return academyOffers(state, new Rng(seed, 'academy', 0))
    }

    for (let i = 0; i < 40; i++) {
      const rus = offersFor('RUS', `ac-rus-${i}`)
      expect(rus.length).toBeGreaterThan(0)
      for (const offer of rus) {
        const league = getLeague(getClub(offer.clubId).leagueId)
        expect(league.id, `сид ${i}: позвали в ${league.id}`).toBe('vtoraya-a')
      }
    }

    // У страны без третьего дивизиона правило не срабатывает: там по-прежнему
    // могут позвать и в высшую лигу.
    const seenTop = new Set<string>()
    for (let i = 0; i < 40; i++) {
      for (const offer of offersFor('ENG', `ac-eng-${i}`)) {
        const league = getLeague(getClub(offer.clubId).leagueId)
        if (league.level === 1) seenTop.add(league.id)
      }
    }
    expect(seenTop.size).toBeGreaterThan(0)
  })

  it('в ранние годы чаще зовут клубы родной страны, чем позже', () => {
    let state = setIdentity(newCareer('home-pull'), {
      lastName: 'ТЕСТОВ',
      shirt: 10,
      foot: 'right',
      countryCode: 'RUS',
      position: 'CAM',
    })
    state = ack(choose(state, state.card!.options[0].id))

    const homeShare = (age: number): number => {
      let home = 0
      let total = 0
      for (let i = 0; i < 200; i++) {
        const aged: CareerState = { ...state, player: { ...state.player, age } }
        for (const offer of generateOffers(aged, new Rng(`pull-${i}`, 'market', 0), { count: 2 })) {
          total++
          if (findClub(offer.clubId)!.country === 'RUS') home++
        }
      }
      return total === 0 ? 0 : home / total
    }

    const young = homeShare(19)
    const older = homeShare(28)
    // Молодого чаще замечают дома: лестница снизу должна вести через свои
    // дивизионы, а не сразу за рубеж.
    expect(young).toBeGreaterThan(older + 0.15)
  })

  it('выбор насыщенности меняет число карточек за сезон', () => {
    const density = (pace: Pace): number => {
      let cards = 0
      let seasons = 0
      for (let i = 0; i < 12; i++) {
        const seed = `pace-${i}`
        let state = setIdentity(newCareer(seed, 2026, pace), {
          lastName: 'ТЕСТОВ',
          shirt: 10,
          foot: 'right',
          countryCode: 'ITA',
          position: 'CAM',
        })
        const rng = new Rng(seed, 'player-choices', 0)
        let guard = 0
        while (state.phase !== 'retired' && guard < 4000) {
          guard++
          if (state.resolution) { state = ack(state); continue }
          if (!state.card) break
          cards++
          const options = state.card.options.filter((o) => !o.disabled)
          state = choose(state, options.length > 0 ? rng.pick(options).id : 'next')
        }
        seasons += state.history.length
      }
      return cards / seasons
    }

    const calm = density('calm')
    const normal = density('normal')
    const busy = density('busy')
    // Ступени обязаны быть различимы: иначе выбор на старте ничего не значит.
    expect(normal).toBeGreaterThan(calm + 0.6)
    expect(busy).toBeGreaterThan(normal + 0.6)
  })

  it('вариант дороже заработанного показывается недоступным и не выбирается', () => {
    let state = setIdentity(newCareer('cost-gate'), {
      lastName: 'ТЕСТОВ',
      shirt: 10,
      foot: 'right',
      countryCode: 'ITA',
      position: 'CAM',
    })
    state = ack(choose(state, state.card!.options[0].id))

    const cardWith = (money: number) =>
      buildCard(getEvent('charity_visit'), {
        state,
        player: { ...state.player, money },
        club: findClub(state.contract?.clubId ?? null),
        ovr: playerOvr(state.player),
        role: 'starter',
        rng: new Rng('cost-gate', 'event', 0),
        stage: 'winter',
        payload: {},
      })

    // Поездка стоит 80 тысяч, перевод — 250: при пустом счёте недоступны обе.
    const poor = cardWith(0)
    expect(poor.options.find((o) => o.id === 'go')!.disabled).toBe(true)
    expect(poor.options.find((o) => o.id === 'send_money')!.disabled).toBe(true)
    expect(poor.options.find((o) => o.id === 'skip')!.disabled).toBe(false)

    const middling = cardWith(100_000)
    expect(middling.options.find((o) => o.id === 'go')!.disabled).toBe(false)
    expect(middling.options.find((o) => o.id === 'send_money')!.disabled).toBe(true)

    expect(cardWith(1_000_000).options.every((o) => !o.disabled)).toBe(true)

    // Даже прямой вызов не должен пропускать оплату несуществующими деньгами.
    const broke: CareerState = { ...state, player: { ...state.player, money: 0 }, card: poor }
    expect(choose(broke, 'send_money')).toBe(broke)
  })

  it('у каждого события переведены заголовок, варианты и все исходы', () => {
    // Прогон карьеры трогает только те события, которые ему выпали. Редкие так
    // и остались бы без проверки текстов, поэтому здесь разыгрывается каждое.
    let state = playCareer('all-events-state')
    // Берём момент из середины карьеры: клубов уже несколько, контракт есть.
    state = {
      ...state,
      phase: 'season',
      player: { ...state.player, age: 33, money: 20_000_000, gauges: { ...state.player.gauges, fame: 60 } },
      contract: state.contract ?? {
        clubId: 'inter', wage: 4_000_000, yearsLeft: 2, isLoan: false, parentClubId: null, objective: null,
      },
      clubsPlayed: state.clubsPlayed.length >= 2 ? state.clubsPlayed : ['venezia', 'inter'],
      flags: { ...state.flags, national_established: 1 },
    }

    missingKeys.clear()
    const failures: string[] = []
    for (const def of ALL_EVENTS) {
      for (let attempt = 0; attempt < 8; attempt++) {
        const ctx = {
          state,
          player: state.player,
          club: findClub(state.contract?.clubId ?? null),
          ovr: playerOvr(state.player),
          role: 'starter' as Role,
          rng: new Rng('all-events', `${def.key}-${attempt}`, attempt),
          stage: def.stages[0],
          // Задача сезона читает kind как вид задачи, медицина — как вид травмы.
          payload: (def.key === 'season_objective'
            ? { kind: 'goals', target: 12 }
            : { kind: 'muscle_strain', severity: 2, tournament: 'world_cup' }) as Record<string, string | number>,
        }
        let card
        try {
          card = buildCard(def, ctx)
        } catch (e) {
          failures.push(`${def.key}: build упал — ${String(e)}`)
          break
        }
        for (const locale of ['ru', 'en'] as const) {
          t(card.title, locale)
          t(card.body, locale)
          for (const option of card.options) t(option.label, locale)
        }
        for (const option of card.options) {
          try {
            const resolution = resolveCard(def, ctx, option.id)
            for (const locale of ['ru', 'en'] as const) {
              t(resolution.text, locale)
              if (resolution.headline) t(resolution.headline, locale)
            }
          } catch (e) {
            failures.push(`${def.key}/${option.id}: resolve упал — ${String(e)}`)
          }
        }
      }
    }

    expect(failures).toEqual([])
    expect([...missingKeys]).toEqual([])
  })

  it('вратарю считают сухие и пропущенные и в клубе, и в сборной', () => {
    let capSeasons = 0
    let concededSeasons = 0
    for (const seed of ['gk-nat-1', 'gk-nat-2', 'gk-nat-3']) {
      const state = playCareer(seed, { position: 'GK' })
      for (const season of state.history) {
        // Связка одна на клуб и сборную: в каждом «не сухом» матче минимум мяч.
        expect(season.tally.cleanSheets).toBeLessThanOrEqual(season.tally.apps)
        expect(season.tally.goalsConceded).toBeGreaterThanOrEqual(season.tally.apps - season.tally.cleanSheets)
        if (season.national.caps === 0) continue
        capSeasons++
        expect(season.national.cleanSheets).toBeLessThanOrEqual(season.national.caps)
        expect(season.national.goalsConceded).toBeGreaterThanOrEqual(season.national.caps - season.national.cleanSheets)
        if (season.national.goalsConceded > 0) concededSeasons++
      }
    }
    expect(capSeasons).toBeGreaterThan(0)
    // Раньше сборная у вратаря всегда стояла без пропущенных.
    expect(concededSeasons).toBeGreaterThan(capSeasons * 0.8)
  })

  it('полевому игроку вратарскую статистику не приписывают', () => {
    for (const seed of ['fp-nat-1', 'fp-nat-2']) {
      const state = playCareer(seed, { position: 'ST' })
      for (const season of state.history) {
        expect(season.tally.cleanSheets).toBe(0)
        expect(season.tally.goalsConceded).toBe(0)
        expect(season.national.cleanSheets).toBe(0)
        expect(season.national.goalsConceded).toBe(0)
      }
    }
  })

  it('в отчёте о сезоне вратарь видит свои цифры, а не нули по голам', () => {
    let gkReports = 0
    let state = setIdentity(newCareer('gk-report'), {
      lastName: 'ТЕСТОВ',
      shirt: 1,
      foot: 'right',
      countryCode: 'ITA',
      position: 'GK',
    })
    const rng = new Rng('gk-report', 'player-choices', 0)
    let guard = 0
    while (state.phase !== 'retired' && guard < 4000) {
      guard++
      if (state.resolution) { state = ack(state); continue }
      if (!state.card) break
      if (state.card.eventKey === 'season_report' && state.card.title.key === 'report.season.title') {
        // Голы и передачи у вратаря всегда нули: строка о них бессмысленна.
        expect(state.card.body.key).toBe('report.season.body_gk')
        gkReports++
      }
      const available = state.card.options.filter((o) => !o.disabled)
      state = choose(state, available.length > 0 ? rng.pick(available).id : 'next')
    }
    expect(gkReports).toBeGreaterThan(3)
  })

  it('большие турниры идут по реальному календарю, а не по возрасту игрока', () => {
    // Мундиаль: 2026, 2030, 2034…
    for (const year of [2026, 2030, 2034, 2038]) {
      expect(tournamentThisSeason(year, 'UEFA')).toBe('world')
      expect(tournamentThisSeason(year, 'CAF')).toBe('world')
    }
    // Евро и Кубок Америки идут в одни и те же годы: 2028, 2032…
    for (const year of [2028, 2032]) {
      expect(tournamentThisSeason(year, 'UEFA')).toBe('continental')
      expect(tournamentThisSeason(year, 'CONMEBOL')).toBe('continental')
    }
    // Кубок Азии: 2027, 2031…
    expect(tournamentThisSeason(2027, 'AFC')).toBe('continental')
    expect(tournamentThisSeason(2028, 'AFC')).toBeNull()
    // КАН и Золотой кубок — раз в два года по нечётным.
    expect(tournamentThisSeason(2025, 'CAF')).toBe('continental')
    expect(tournamentThisSeason(2029, 'CONCACAF')).toBe('continental')
    expect(tournamentThisSeason(2028, 'CAF')).toBeNull()
    // Год без единого турнира существует у каждой конфедерации.
    expect(tournamentThisSeason(2029, 'UEFA')).toBeNull()
  })

  it('в карьере турнир сборной выпадает только в свой год', () => {
    let tournaments = 0
    for (const seed of ['cal-1', 'cal-2', 'cal-3']) {
      for (const country of ['ITA', 'BRA', 'NGA']) {
        const state = playCareer(`${seed}-${country}`, { country })
        for (const season of state.history) {
          const id = season.national.tournament
          if (!id) continue
          tournaments++
          // Сезон 2026/27 заканчивается летом 2027-го — турнир идёт в нём.
          const year = state.startYear + (season.age - 16) + 1
          if (id === 'world_cup') {
            expect(year % 4).toBe(2)
            continue
          }
          const conf = (Object.keys(NATIONAL_TOURNAMENT) as Confederation[])
            .find((c) => NATIONAL_TOURNAMENT[c] === id)
          expect(conf).toBeDefined()
          expect(tournamentThisSeason(year, conf!)).toBe('continental')
        }
      }
    }
    expect(tournaments).toBeGreaterThan(0)
  })

  it('в отчёте об отрезке вратарь видит сухие и пропущенные', () => {
    let gkBlocks = 0
    let state = setIdentity(newCareer('gk-block'), {
      lastName: 'ТЕСТОВ',
      shirt: 1,
      foot: 'right',
      countryCode: 'ITA',
      position: 'GK',
    })
    const rng = new Rng('gk-block', 'player-choices', 0)
    let guard = 0
    while (state.phase !== 'retired' && guard < 4000) {
      guard++
      if (state.resolution) { state = ack(state); continue }
      if (!state.card) break
      if (state.card.eventKey === 'block_report') {
        // Раньше отрезок отчитывался голами и передачами — у вратаря это нули.
        expect(state.card.body.key).toBe('report.block.body_gk')
        expect(state.card.body.params).toHaveProperty('conceded')
        gkBlocks++
      }
      const available = state.card.options.filter((o) => !o.disabled)
      state = choose(state, available.length > 0 ? rng.pick(available).id : 'next')
    }
    expect(gkBlocks).toBeGreaterThan(3)
  })

  /**
   * Средняя оценка и её разброс на многих отрезках с одними и теми же
   * показателями. Через неё проверяются вклады показателей в симуляцию: одна
   * прогонка ничего не скажет, потому что оценка бросается со случайностью.
   */
  function blockRatings(gauges: Partial<Gauges>): { mean: number; spread: number } {
    const club = getClub('inter')
    const base = createPlayer(
      { lastName: 'ТЕСТОВ', shirt: 9, foot: 'right', countryCode: 'ITA', position: 'ST' },
      5,
      new Rng('sens', 'player', 0),
    )
    const player = {
      ...base,
      age: 26,
      gauges: {
        form: 60, fitness: 85, morale: 65, coachTrust: 60,
        fanLove: 55, mediaRep: 0, lockerRoom: 20, fame: 30,
        ...gauges,
      },
    }
    const ratings: number[] = []
    for (let i = 0; i < 600; i++) {
      const result = simulateBlock(
        { player, club, role: 'starter', minutesMult: 1, matchesOut: 0, banMatches: 0, size: 26, playedBefore: 0, scheduledBefore: 0,
        fixtures: seasonFixtures(club, 26, new Rng('sens', 'fixtures', 0)) },
        new Rng('sens', 'block', i),
      )
      if (result.ratingCount > 0) ratings.push(result.ratingSum / result.ratingCount)
    }
    const mean = ratings.reduce((sum, x) => sum + x, 0) / ratings.length
    const variance = ratings.reduce((sum, x) => sum + (x - mean) ** 2, 0) / ratings.length
    return { mean, spread: Math.sqrt(variance) }
  }

  it('настрой двигает оценку за отрезок и её стабильность', () => {
    const low = blockRatings({ morale: 0 })
    const normal = blockRatings({})
    const high = blockRatings({ morale: 100 })

    // Раньше настрой не влиял на симуляцию вообще, и уронить его было бесплатно.
    expect(low.mean).toBeLessThan(normal.mean)
    expect(high.mean).toBeGreaterThan(normal.mean)
    // Просевший настрой ещё и раскачивает результат: провалы вперемешку со
    // всплесками. Выше нормального разброс не меняется.
    expect(low.spread).toBeGreaterThan(normal.spread)
    expect(high.spread).toBeCloseTo(normal.spread, 1)
  })

  it('раздевалка и пресса двигают оценку, но слабее настроя', () => {
    const normal = blockRatings({})
    const moraleSwing = blockRatings({ morale: 100 }).mean - blockRatings({ morale: 0 }).mean

    // Авторитет считается без середины: он зарабатывается с нуля, поэтому
    // нулевая раздевалка — не штраф, а просто отсутствие прибавки.
    expect(blockRatings({ lockerRoom: 100 }).mean).toBeGreaterThan(normal.mean)
    expect(blockRatings({ lockerRoom: 0 }).mean).toBeLessThan(normal.mean)
    // У прессы середина есть по самой шкале: ноль — это когда о вас не пишут.
    expect(blockRatings({ mediaRep: 100 }).mean).toBeGreaterThan(normal.mean)
    expect(blockRatings({ mediaRep: -100 }).mean).toBeLessThan(normal.mean)

    // «Немного» — это половина размаха настроя на всю шкалу, не больше.
    const lockerSwing = blockRatings({ lockerRoom: 100 }).mean - blockRatings({ lockerRoom: 0 }).mean
    const mediaSwing = blockRatings({ mediaRep: 100 }).mean - blockRatings({ mediaRep: -100 }).mean
    expect(lockerSwing).toBeLessThan(moraleSwing * 0.6)
    expect(mediaSwing).toBeLessThan(moraleSwing * 0.6)
  })

  /** Отрезок за одного и того же игрока: нужен нескольким проверкам подряд. */
  function blockFor(position: Position, role: Role, seed: string, gauges: Partial<Gauges> = {}) {
    const club = getClub('inter')
    const base = createPlayer(
      { lastName: 'ТЕСТОВ', shirt: 9, foot: 'right', countryCode: 'ITA', position },
      5,
      new Rng(seed, 'player', 0),
    )
    const player = {
      ...base,
      age: 26,
      gauges: {
        form: 60, fitness: 85, morale: 65, coachTrust: 60,
        fanLove: 55, mediaRep: 0, lockerRoom: 20, fame: 30,
        ...gauges,
      },
    }
    return simulateBlock({ player, club, role, minutesMult: 1, matchesOut: 0, banMatches: 0, size: 26, playedBefore: 0, scheduledBefore: 0,
        fixtures: seasonFixtures(club, 26, new Rng(seed, 'fixtures', 0)) }, new Rng(seed, 'block', 0))
  }

  it('отрезок складывается из отдельных матчей, а не из одного броска', () => {
    for (const seed of ['m-1', 'm-2', 'm-3', 'm-4']) {
      const result = blockFor('ST', 'starter', seed)
      const played = result.matches.filter((m) => m.minutes > 0)

      // Появление — это матч с ненулевыми минутами, и ничто другое.
      expect(result.apps).toBe(played.length)
      expect(result.goals).toBe(played.reduce((sum, m) => sum + m.goals, 0))
      expect(result.assists).toBe(played.reduce((sum, m) => sum + m.assists, 0))

      for (const match of result.matches) {
        expect(match.minutes).toBeGreaterThanOrEqual(0)
        expect(match.minutes).toBeLessThanOrEqual(90)
        // Не вышел — нет ни оценки, ни статистики.
        if (match.minutes === 0) {
          expect(match.rating).toBe(0)
          expect(match.goals + match.assists + match.yellow).toBe(0)
        } else {
          expect(match.rating).toBeGreaterThan(0)
        }
      }
      // Выход со скамейки короче стартового: иначе «вышел на замену» ничего не значит.
      const subs = played.filter((m) => !m.started)
      for (const match of subs) expect(match.minutes).toBeLessThan(55)
    }
  })

  it('средняя оценка за отрезок взвешена минутами', () => {
    const result = blockFor('CAM', 'rotation', 'weighted')
    const played = result.matches.filter((m) => m.minutes > 0)
    const minutes = played.reduce((sum, m) => sum + m.minutes, 0)
    expect(result.ratingCount).toBe(minutes)
    expect(result.ratingSum).toBeCloseTo(played.reduce((sum, m) => sum + m.rating * m.minutes, 0), 6)
  })

  it('вратарь либо стоит весь матч, либо не выходит', () => {
    for (const seed of ['gk-m-1', 'gk-m-2', 'gk-m-3']) {
      const result = blockFor('GK', 'starter', seed)
      for (const match of result.matches) {
        // Вратаря не выпускают на двадцать минут — замена стоит весь матч.
        // Раньше срока он уходит только с повреждением.
        if (match.injury) expect(match.minutes).toBeLessThanOrEqual(90)
        else expect([0, 90]).toContain(match.minutes)
        // Сухой матч засчитывается только сыгранному, а в несухом есть мяч.
        if (match.minutes === 0) expect(match.cleanSheet).toBe(false)
        else expect(match.cleanSheet || match.goalsConceded > 0).toBe(true)
        if (match.cleanSheet) expect(match.goalsConceded).toBe(0)
      }
    }
  })

  it('полевому игроку сухие матчи и пропущенные не пишут', () => {
    const result = blockFor('CB', 'starter', 'field-keeper')
    expect(result.cleanSheets).toBe(0)
    expect(result.goalsConceded).toBe(0)
  })

  it('отрезок без единого матча не обнуляет форму и доверие', () => {
    // Пока запасной не сыграл ни минуты, оценки у него нет. Если считать её
    // нулём, форма и доверие проваливаются так, что выбраться уже нельзя.
    const idle = blockFor('ST', 'reserve', 'idle', { fitness: 20 })
    if (idle.apps === 0) {
      expect(idle.formDelta).toBeGreaterThan(-20)
      expect(idle.trustDelta).toBeGreaterThan(-15)
    }
    // Штраф за простой всё равно есть: без практики форма падает.
    expect(idle.formDelta).toBeLessThan(0)
  })

  it('календарь сезона — это круг чемпионата, а не случайные соперники', () => {
    for (const clubId of ['inter', 'ipswich', 'alania', 'la-galaxy']) {
      const club = getClub(clubId)
      const fixtures = seasonFixtures(club, SEASON_MATCHES, new Rng('cal', clubId, 0))
      expect(fixtures).toHaveLength(SEASON_MATCHES)

      for (const [i, fixture] of fixtures.entries()) {
        // Сам с собой клуб не играет, и один соперник не идёт два матча подряд.
        expect(fixture.opponentId).not.toBe(club.id)
        if (i > 0) expect(fixture.opponentId).not.toBe(fixtures[i - 1].opponentId)
        expect(findClub(fixture.opponentId)).not.toBeNull()
      }

      // Раньше соперник выбирался заново на каждый матч, и за сезон один и тот
      // же клуб попадался по восемь-десять раз. Теперь чемпионат идёт кругом:
      // дома и в гостях, и лишние встречи бывают только по кубкам.
      const league = fixtures.filter((f) => f.competition === 'league')
      const met = new Map<string, number>()
      for (const f of league) met.set(f.opponentId, (met.get(f.opponentId) ?? 0) + 1)
      expect(Math.max(...met.values())).toBeLessThanOrEqual(4)
      // Дома и в гостях примерно поровну.
      const home = league.filter((f) => f.home).length
      expect(Math.abs(home - league.length / 2)).toBeLessThan(league.length * 0.25)
    }

    // Клуб высшего дивизиона играет и в лиге, и в кубке, и в еврокубке.
    const kinds = new Set(seasonFixtures(getClub('inter'), SEASON_MATCHES, new Rng('cal', 'k', 0)).map((f) => f.competition))
    expect(kinds).toEqual(new Set(['league', 'cup', 'continental']))
  })

  it('травма меряется матчами, и лёгкая тоже чего-то стоит', () => {
    // Раньше срок считался полусезонами, и лёгкое повреждение округлялось до
    // нуля: ушиб не стоил игроку вообще ничего.
    for (const type of INJURY_TYPES) {
      expect(injuryMatches(type.kind, type.severity)).toBeGreaterThan(0)
    }
    expect(injuryMatches('muscle_strain', 1)).toBeLessThan(6)
    expect(injuryMatches('meniscus', 2)).toBeGreaterThan(injuryMatches('muscle_strain', 1))
    // Кресты — это по-прежнему полсезона и больше.
    expect(injuryMatches('acl', 3)).toBeGreaterThan(26)
    // Незнакомый движку вид повреждения всё равно чего-то стоит.
    expect(injuryMatches('space_madness', 2)).toBeGreaterThan(0)
  })

  it('травма и дисквалификация съедают матчи, а не отрезок целиком', () => {
    const club = getClub('inter')
    const base = createPlayer(
      { lastName: 'ТЕСТОВ', shirt: 9, foot: 'right', countryCode: 'ITA', position: 'CM' },
      5,
      new Rng('out', 'player', 0),
    )
    const player = { ...base, age: 26, gauges: { ...base.gauges, fitness: 90, form: 60 } }
    const result = simulateBlock(
      { player, club, role: 'starter', minutesMult: 1, matchesOut: 5, banMatches: 3, size: 26, playedBefore: 0, scheduledBefore: 0,
        fixtures: seasonFixtures(club, 26, new Rng('out', 'fixtures', 0)) },
      new Rng('out', 'block', 0),
    )

    // Первые восемь матчей выбиты, а дальше игрок выходит на поле — раньше
    // любой срок сжигал весь полусезон целиком.
    for (const match of result.matches.slice(0, 8)) expect(match.minutes).toBe(0)
    expect(result.matches.slice(8).some((m) => m.minutes > 0)).toBe(true)
    expect(result.apps).toBeGreaterThan(0)
    // Срок закончился внутри отрезка — на следующий он не переносится.
    expect(result.banMatchesLeft).toBe(0)
  })

  it('повреждение в матче обрывает его и выбивает игрока на срок', () => {
    const club = getClub('inter')
    const base = createPlayer(
      { lastName: 'ТЕСТОВ', shirt: 9, foot: 'right', countryCode: 'ITA', position: 'CM' },
      5,
      new Rng('hurt', 'player', 0),
    )
    // Изношенный ветеран ломается часто: нужен отрезок, где травма точно есть.
    const player = { ...base, age: 34, gauges: { ...base.gauges, fitness: 10 } }
    let checked = 0
    for (let i = 0; i < 40 && checked < 5; i++) {
      const result = simulateBlock(
        { player, club, role: 'starter', minutesMult: 1, matchesOut: 0, banMatches: 0, size: 26, playedBefore: 0, scheduledBefore: 0,
        fixtures: seasonFixtures(club, 26, new Rng('hurt', 'fixtures', i)) },
        new Rng('hurt', 'block', i),
      )
      const hurtAt = result.matches.findIndex((m) => m.injury !== null)
      if (hurtAt === -1) continue
      checked++
      // Сломавшийся матч не доигран, а следующие пропущены.
      expect(result.matches[hurtAt].minutes).toBeLessThan(90)
      expect(result.injuries.length).toBeGreaterThan(0)
      const after = result.matches.slice(hurtAt + 1)
      const cost = injuryMatches(result.matches[hurtAt].injury!.kind, result.matches[hurtAt].injury!.severity)
      const missedAfter = after.filter((m) => m.minutes === 0).length
      expect(missedAfter + result.matchesOutLeft).toBeGreaterThanOrEqual(Math.min(cost, after.length))
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('лечение укорачивает назначенный срок, а не назначает новый', () => {
    let state = setIdentity(newCareer('heal'), {
      lastName: 'ТЕСТОВ', shirt: 4, foot: 'right', countryCode: 'ITA', position: 'CM',
    })
    state = ack(choose(state, state.card!.options[0].id))

    const injured = applyEffects(state, [{ t: 'injury', kind: 'meniscus', severity: 2 }])
    expect(injured.player.matchesOut).toBe(injuryMatches('meniscus', 2))

    // Карточка лечения решает, как возвращаться, — травму она уже не наносит.
    const rushed = applyEffects(injured, [{ t: 'heal', mult: 0.5 }])
    expect(rushed.player.matchesOut).toBe(Math.round(injuryMatches('meniscus', 2) * 0.5))
    expect(rushed.player.injuries).toHaveLength(injured.player.injuries.length)
  })

  it('сезон режется на туры, но матчей в нём столько же', () => {
    for (const pace of ['calm', 'normal', 'busy'] as Pace[]) {
      const rounds = ROUNDS_PER_SEASON[pace]
      const sizes = Array.from({ length: rounds }, (_, i) => matchesInRound(pace, i))
      // Спокойный сезон не короче насыщенного: в нём просто крупнее отчёты.
      expect(sizes.reduce((sum, n) => sum + n, 0)).toBe(SEASON_MATCHES)
      for (const size of sizes) expect(size).toBeGreaterThan(0)
      // Матчи до тура и есть сумма предыдущих туров.
      expect(matchesBefore(pace, 0)).toBe(0)
      expect(matchesBefore(pace, rounds)).toBe(SEASON_MATCHES)
    }
  })

  it('за сезон приходит столько отчётов о туре, сколько туров в насыщенности', () => {
    for (const pace of ['calm', 'normal', 'busy'] as Pace[]) {
      let state = setIdentity(newCareer(`rounds-${pace}`, 2026, pace), {
        lastName: 'ТЕСТОВ', shirt: 9, foot: 'right', countryCode: 'ITA', position: 'CAM',
      })
      const rng = new Rng(`rounds-${pace}`, 'choices', 0)
      let reports = 0
      let guard = 0
      // Считаем отчёты за первый полный сезон с клубом.
      while (state.history.length === 0 && guard < 400) {
        guard++
        if (state.resolution) { state = ack(state); continue }
        if (!state.card) break
        if (state.card.eventKey === 'block_report') reports++
        const available = state.card.options.filter((o) => !o.disabled)
        state = choose(state, available.length > 0 ? rng.pick(available).id : 'next')
      }
      // Туры разложены по этапам методом наибольших остатков: сумма обязана
      // сойтись, иначе часть матчей сезона просто не сыграется.
      expect(reports).toBe(ROUNDS_PER_SEASON[pace])
    }
  })

  it('тур двигает показатели на свою долю, а не как целый полусезон', () => {
    const club = getClub('inter')
    const base = createPlayer(
      { lastName: 'ТЕСТОВ', shirt: 9, foot: 'right', countryCode: 'ITA', position: 'CM' },
      5,
      new Rng('part', 'player', 0),
    )
    const player = { ...base, age: 26 }
    const ctx = {
      player, club, role: 'starter' as Role, minutesMult: 1, matchesOut: 0, banMatches: 0,
      fixtures: seasonFixtures(club, 26, new Rng('part', 'fixtures', 0)),
    }
    const small = simulateBlock({ ...ctx, size: 5, playedBefore: 0, scheduledBefore: 0 }, new Rng('part', 'b', 1))
    const half = simulateBlock({ ...ctx, size: 26, playedBefore: 0, scheduledBefore: 0 }, new Rng('part', 'b', 1))

    // Иначе за сезон из десяти туров свежесть ходила бы впятеро резче.
    expect(Math.abs(small.fitnessDelta)).toBeLessThan(Math.abs(half.fitnessDelta))
    expect(small.matches).toHaveLength(5)
    expect(half.matches).toHaveLength(26)
  })

  it('матчи сезона копятся и попадают в отчёт о туре', () => {
    let state = setIdentity(newCareer('shown'), {
      lastName: 'ТЕСТОВ', shirt: 9, foot: 'right', countryCode: 'ITA', position: 'CAM',
    })
    const rng = new Rng('shown', 'choices', 0)
    let guard = 0
    let reports = 0
    let seen = 0
    while (state.history.length === 0 && guard < 400) {
      guard++
      if (state.resolution) { state = ack(state); continue }
      if (!state.card) break
      if (state.card.eventKey === 'block_report') {
        reports++
        // Карточка тура несёт свои матчи: из них она и собрана.
        const matches = state.card.matches ?? []
        expect(matches.length).toBeGreaterThan(0)
        seen += matches.length
        for (const match of matches) {
          expect(findClub(match.opponentId)).not.toBeNull()
          expect(match.opponentId).not.toBe(state.season?.clubId)
        }
        // Сезон помнит всё сыгранное до сих пор, а не только последний тур.
        expect(state.season!.matches).toHaveLength(seen)
      }
      const available = state.card.options.filter((o) => !o.disabled)
      state = choose(state, available.length > 0 ? rng.pick(available).id : 'next')
    }
    expect(reports).toBeGreaterThan(1)
    // За сезон разыгрывается ровно календарь сезона, не больше и не меньше.
    expect(seen).toBe(SEASON_MATCHES)
  })

  it('матчи не утекают в историю: в сохранении остаётся только текущий сезон', () => {
    const state = playCareer('no-leak')
    // Тысяча записей о матчах за карьеру раздула бы сохранение на пустом месте.
    for (const season of state.history) {
      expect(Object.prototype.hasOwnProperty.call(season, 'matches')).toBe(false)
    }
  })

  it('травмированному не предлагают ни поле, ни сборную', () => {
    const seen = new Set<string>()
    let hurtCards = 0
    for (const seed of ['hurt-ev-1', 'hurt-ev-2', 'hurt-ev-3']) {
      let state = setIdentity(newCareer(seed), {
        lastName: 'ТЕСТОВ', shirt: 9, foot: 'right', countryCode: 'ITA', position: 'ST',
      })
      const rng = new Rng(seed, 'choices', 0)
      let guard = 0
      while (state.phase !== 'retired' && guard < 4000) {
        guard++
        if (state.resolution) { state = ack(state); continue }
        if (!state.card) break
        const out = state.player.matchesOut > 0 || state.player.banMatches > 0
        if (out && state.card.kind === 'decision') {
          hurtCards++
          seen.add(state.card.channel)
          // Лечится — значит не бьёт пенальти в финале и не едет на турнир.
          expect(state.card.channel).not.toBe('match')
          expect(state.card.channel).not.toBe('national')
        }
        const available = state.card.options.filter((o) => !o.disabled)
        state = choose(state, available.length > 0 ? rng.pick(available).id : 'next')
      }
    }
    // Проверка бессмысленна, если травмированному вообще ничего не выпадало.
    expect(hurtCards).toBeGreaterThan(0)
    expect(seen.size).toBeGreaterThan(0)
  })

  it('травмированного не вызывают в сборную', () => {
    /** Доигрывает сезон до записи в историю и возвращает его итог. */
    function finishSeasonWith(seed: string, patch: (s: CareerState) => CareerState) {
      let state = setIdentity(newCareer(seed), {
        lastName: 'ТЕСТОВ', shirt: 9, foot: 'right', countryCode: 'ITA', position: 'CAM',
      })
      state = ack(choose(state, state.card!.options[0].id))
      state = patch({ ...state, flags: { ...state.flags, national_established: 1 } })
      const rng = new Rng(seed, 'choices', 0)
      const target = state.history.length + 1
      let guard = 0
      while (state.history.length < target && guard < 600) {
        guard++
        if (state.resolution) { state = ack(state); continue }
        if (!state.card) break
        const available = state.card.options.filter((o) => !o.disabled)
        state = choose(state, available.length > 0 ? rng.pick(available).id : 'next')
      }
      return state.history[state.history.length - 1]
    }

    // Сезон, который игрок доигрывает в лазарете, вызовов не приносит: летние
    // сборы и турнир проходят мимо травмированного.
    for (const seed of ['hurt-nat-1', 'hurt-nat-2', 'hurt-nat-3']) {
      const hurt = finishSeasonWith(seed, (s) => ({
        ...s,
        player: { ...s.player, matchesOut: 90 },
      }))
      expect(hurt.national.caps).toBe(0)
      expect(hurt.national.tournament).toBeNull()
    }

    // Контроль: здоровому вызовы приходят — иначе проверка выше ничего не стоит.
    const healthy = ['ok-nat-1', 'ok-nat-2', 'ok-nat-3', 'ok-nat-4']
      .map((seed) => finishSeasonWith(seed, (s) => s))
    expect(healthy.some((season) => season.national.caps > 0)).toBe(true)
  })

  it('олимпиада идёт летом и только в свой год', () => {
    // Игры и Евро делят одни и те же годы — так и в жизни.
    for (const year of [2028, 2032, 2036]) expect(isOlympicYear(year)).toBe(true)
    for (const year of [2026, 2027, 2029, 2030]) expect(isOlympicYear(year)).toBe(false)

    // Само событие живёт на этапе итогов сезона, то есть между сезонами.
    expect(getEvent('olympics').stages).toEqual(['review'])
    // И выдаётся движком, а не лотереей ситуаций посреди мая.
    expect(getEvent('olympics').weight).toBe(0)
  })

  it('первый контракт во второй лиге России — не больше шестисот тысяч рублей в год', () => {
    // Движок считает в евро, интерфейс показывает рубли по сто за евро.
    const RUB_PER_EUR = 100
    for (const clubId of ['dynamo-bryansk', 'rodina-2', 'sibir']) {
      const club = getClub(clubId)
      const wage = wageFor(45, 16, club)
      expect(wage * RUB_PER_EUR).toBeLessThanOrEqual(600_000)
      expect(wage).toBeGreaterThan(0)
    }
    // При этом за тот же уровень в сильной лиге платят заметно больше:
    // раньше нижняя граница в тридцать тысяч равняла всех подряд.
    expect(wageFor(45, 16, getClub('oxford-utd'))).toBeGreaterThan(wageFor(45, 16, getClub('dynamo-bryansk')))
    expect(wageFor(80, 27, getClub('inter'))).toBeGreaterThan(1_000_000)
  })

  it('пропуск по травме возвращает свежесть, но не форму', () => {
    const club = getClub('inter')
    const base = createPlayer(
      { lastName: 'ТЕСТОВ', shirt: 9, foot: 'right', countryCode: 'ITA', position: 'CM' },
      5,
      new Rng('rest', 'player', 0),
    )
    const player = { ...base, age: 26, gauges: { ...base.gauges, fitness: 50, form: 60 } }
    const ctx = {
      player, club, role: 'starter' as Role, size: 26, playedBefore: 0, scheduledBefore: 0,
      fixtures: seasonFixtures(club, 26, new Rng('rest', 'fixtures', 0)),
    }

    const injured = simulateBlock({ ...ctx, minutesMult: 1, matchesOut: 26, banMatches: 0 }, new Rng('rest', 'b', 0))
    expect(injured.apps).toBe(0)
    // Игрок не играет — значит отдыхает: раньше свежесть за такой отрезок почти
    // не двигалась, и из лазарета возвращались такими же уставшими.
    expect(injured.fitnessDelta).toBeGreaterThan(10)
    // Форму простой при этом не чинит, иначе травма стала бы способом отдохнуть.
    expect(injured.formDelta).toBeLessThan(0)

    // Просто не попасть в заявку — ещё не отдых: там игрок тренируется со всеми.
    const benched = simulateBlock({ ...ctx, role: 'reserve', minutesMult: 1, matchesOut: 0, banMatches: 0 }, new Rng('rest', 'b', 0))
    expect(injured.fitnessDelta).toBeGreaterThan(benched.fitnessDelta)

    // Дисквалификация — такой же отдых, как травма.
    const banned = simulateBlock({ ...ctx, minutesMult: 1, matchesOut: 0, banMatches: 26 }, new Rng('rest', 'b', 0))
    expect(banned.fitnessDelta).toBeCloseTo(injured.fitnessDelta, 1)
  })

  it('вариант «остаться» показывает условия, на которых игрок останется', () => {
    // Раньше подпись была просто «Остаться в клубе»: сколько платят и на
    // сколько лет — выяснялось уже после нажатия.
    const seen = new Map<string, string>()
    for (let i = 0; i < 40 && seen.size < 2; i++) {
      let state = setIdentity(newCareer(`terms-${i}`), {
        lastName: 'ТЕСТОВ', shirt: 9, foot: 'right', countryCode: 'ITA', position: 'CM',
      })
      const rng = new Rng(`terms-${i}`, 'choices', 0)
      let guard = 0
      while (state.phase !== 'retired' && guard < 3000) {
        guard++
        if (state.resolution) { state = ack(state); continue }
        if (!state.card) break
        if (state.card.eventKey === 'market_decision') {
          const stay = state.card.options.find((o) => o.id === 'stay' || o.id === 'stay_new')
          if (stay) {
            const label = t(stay.label, 'ru')
            seen.set(stay.id, label)
            // И зарплата, и срок обязаны стоять в подписи.
            expect(label).toMatch(/€|₽/)
            expect(label).toMatch(/сез\./)
            expect(stay.label.params?.wage).toBeGreaterThan(0)
          }
        }
        const available = state.card.options.filter((o) => !o.disabled)
        state = choose(state, available.length > 0 ? rng.pick(available).id : 'next')
      }
    }
    // Обе ветки: и продление истёкшего контракта, и остаток действующего.
    expect(seen.has('stay')).toBe(true)
    expect(seen.has('stay_new')).toBe(true)
  })

  it('продление показывает ровно тот контракт, который будет подписан', () => {
    // Подпись под кнопкой и сам контракт считаются одним кодом — иначе в
    // карточке одна зарплата, а в контракте другая.
    for (let i = 0; i < 40; i++) {
      let state = setIdentity(newCareer(`deal-${i}`), {
        lastName: 'ТЕСТОВ', shirt: 9, foot: 'right', countryCode: 'ITA', position: 'CM',
      })
      const rng = new Rng(`deal-${i}`, 'choices', 0)
      let guard = 0
      while (state.phase !== 'retired' && guard < 3000) {
        guard++
        if (state.resolution) { state = ack(state); continue }
        if (!state.card) break
        const renew = state.card.eventKey === 'market_decision'
          ? state.card.options.find((o) => o.id === 'stay_new')
          : undefined
        if (renew) {
          const promised = renew.label.params as { wage: number; years: number }
          state = ack(choose(state, renew.id))
          expect(state.contract?.wage).toBe(promised.wage)
          expect(state.contract?.yearsLeft).toBe(promised.years)
          return
        }
        const available = state.card.options.filter((o) => !o.disabled)
        state = choose(state, available.length > 0 ? rng.pick(available).id : 'next')
      }
    }
    throw new Error('продление истёкшего контракта ни разу не выпало')
  })

  it('в каждой лиге столько клубов, сколько в ней команд', () => {
    // Пока составы были неполными, за сезон один и тот же соперник попадался
    // по три-четыре раза: календарь собирался из восьми названных клубов.
    for (const league of LEAGUES) {
      const clubs = CLUBS.filter((c) => c.leagueId === league.id)
      expect({ league: league.id, clubs: clubs.length }).toEqual({ league: league.id, clubs: league.teams })
    }
    // Дубль идентификатора — это молча съеденный клуб: карта по id оставит один.
    expect(new Set(CLUBS.map((c) => c.id)).size).toBe(CLUBS.length)
    for (const club of CLUBS) {
      expect(club.name.ru).not.toHaveLength(0)
      expect(club.name.en).not.toHaveLength(0)
      expect(club.tier).toBeGreaterThanOrEqual(0)
      expect(club.tier).toBeLessThanOrEqual(6)
    }
  })

  it('закрытый сезон не показывается в таблице карьеры дважды', () => {
    // Закрытый сезон уезжает в историю, но `state.season` держит его до начала
    // следующего — всё время от отчёта об итогах до трансферного окна. В этом
    // окне таблица карьеры показывала его двумя строками подряд.
    let state = setIdentity(newCareer('twice'), {
      lastName: 'ТЕСТОВ', shirt: 9, foot: 'right', countryCode: 'RUS', position: 'CAM',
    })
    const rng = new Rng('twice', 'choices', 0)
    let guard = 0
    let checked = 0
    while (state.history.length < 3 && guard < 900) {
      guard++
      if (state.resolution) { state = ack(state); continue }
      if (!state.card) break
      // Проверяем ровно тот момент, когда сезон уже закрыт, а новый не начат.
      if (state.season && state.history.some((h) => h.age === state.season!.age)) {
        const html = renderToStaticMarkup(createElement(Timeline, { state }))
        const label = seasonLabel(state.startYear, state.season.age)
        const shown = html.split(label).length - 1
        expect({ label, shown }).toEqual({ label, shown: 1 })
        checked++
      }
      const available = state.card.options.filter((o) => !o.disabled)
      state = choose(state, available.length > 0 ? rng.pick(available).id : 'next')
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('тренер, который не доверяет, не ставит — каким бы сильным игрок ни был', () => {
    const club = getClub('baltika')
    const base = createPlayer(
      { lastName: 'ТЕСТОВ', shirt: 1, foot: 'right', countryCode: 'RUS', position: 'GK' },
      3,
      new Rng('trust', 'player', 0),
    )
    /** Игрок ровно заданного класса: разрыв с составом считается от него. */
    const at = (ovr: number, coachTrust: number) => {
      const attrs = { ...base.attrs }
      for (const key of Object.keys(attrs) as (keyof typeof attrs)[]) attrs[key] = ovr
      return { ...base, age: 29, attrs, gauges: { ...base.gauges, coachTrust, form: 60, lockerRoom: 20 } }
    }

    // Раньше класс перебивал всё: при нулевом доверии игрок, на пятнадцать
    // пунктов сильнее состава, всё равно выходил в основе, и поссориться с
    // тренером насмерть было нельзя.
    for (const ovr of [70, 81, 90]) {
      expect(determineRole({ player: at(ovr, 0), club, rivalPressure: 0 })).toBe('reserve')
      expect(determineRole({ player: at(ovr, FROZEN_OUT), club, rivalPressure: 0 })).toBe('reserve')
      expect(determineRole({ player: at(ovr, DOGHOUSE), club, rivalPressure: 0 })).toBe('bench')
    }
    // Выше порога всё как было: решает класс.
    expect(determineRole({ player: at(90, 60), club, rivalPressure: 0 })).toBe('star')
    // Потолок работает только вниз: доверие по-прежнему помогает, а не мешает.
    expect(roleRank(determineRole({ player: at(50, 100), club, rivalPressure: 0 })))
      .toBeGreaterThan(roleRank(determineRole({ player: at(50, 0), club, rivalPressure: 0 })))
  })

  it('оказавшийся вне обоймы может уйти, не досиживая контракт', () => {
    let state = setIdentity(newCareer('frozen'), {
      lastName: 'ТЕСТОВ', shirt: 9, foot: 'right', countryCode: 'ITA', position: 'CAM',
    })
    state = ack(choose(state, state.card!.options[0].id))
    // Контракт свежий: без конфликта рынок летом почти наверняка не откроется.
    expect(state.contract!.yearsLeft).toBeGreaterThan(1)

    const frozen: CareerState = {
      ...state,
      player: { ...state.player, gauges: { ...state.player.gauges, coachTrust: 0 } },
    }
    // Тренер вычеркнул — клуб не продлевает и рынок открыт.
    expect(clubWantsToRenew(frozen, playerOvr(frozen.player), 'starter')).toBe(false)

    const rng = new Rng('frozen', 'choices', 0)
    let current = frozen
    let guard = 0
    let sawMarket = false
    while (current.history.length < 1 && guard < 600) {
      guard++
      if (current.resolution) { current = ack(current); continue }
      if (!current.card) break
      const available = current.card.options.filter((o) => !o.disabled)
      current = choose(current, available.length > 0 ? rng.pick(available).id : 'next')
    }
    // Первое же лето даёт выбор клуба, а не «спокойное межсезонье».
    guard = 0
    while (!sawMarket && guard < 200) {
      guard++
      if (current.resolution) { current = ack(current); continue }
      if (!current.card) break
      if (['market_decision', 'contract_expired', 'no_offers'].includes(current.card.eventKey)) sawMarket = true
      const available = current.card.options.filter((o) => !o.disabled)
      if (!sawMarket) current = choose(current, available.length > 0 ? rng.pick(available).id : 'next')
    }
    expect(sawMarket).toBe(true)
  })

  it('положение относительно состава считается от текущего клуба', () => {
    // Без клуба сравнивать не с чем.
    expect(squadStanding(newCareer('standing'))).toBeNull()

    let state = setIdentity(newCareer('standing'), {
      lastName: 'ТЕСТОВ',
      shirt: 10,
      foot: 'right',
      countryCode: 'ITA',
      position: 'CAM',
    })
    // Выбираем академию — после этого клуб есть.
    state = ack(choose(state, state.card!.options[0].id))

    const standing = squadStanding(state)
    expect(standing).not.toBeNull()
    // Уровень состава — из таблицы по тиру клуба, разрыв считается от OVR.
    expect([58, 66, 72, 78, 83, 88]).toContain(standing!.level)
    expect(standing!.gap).toBe(currentOvr(state) - standing!.level)
  })
})
