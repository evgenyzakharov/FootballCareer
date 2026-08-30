import { describe, expect, it } from 'vitest'
import { ack, applyEffects, choose, currentOvr, newCareer, setIdentity, squadStanding } from '../src/engine/career'
import type { CareerState, Confederation, Objective, Pace, Position, Role } from '../src/engine/types'
import { averageRating } from '../src/engine/performance'
import { adjustObjective, makeObjective } from '../src/engine/events/structural'
import { Rng } from '../src/engine/rng'
import { playerOvr, squadLevel } from '../src/engine/player'
import { formatMoney, missingKeys, t } from '../src/i18n'
import { ALL_EVENTS, buildCard, getEvent, resolveCard } from '../src/engine/events'
import { findClub, getClub } from '../src/data/clubs'
import { getLeague } from '../src/data/leagues'
import { NATIONAL_TOURNAMENT, leagueLift, rollLeaguePosition, tournamentThisSeason } from '../src/engine/competitions'
import { academyOffers, clubWantsToRenew, generateOffers } from '../src/engine/offers'

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
