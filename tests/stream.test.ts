import { describe, expect, it } from 'vitest'
import type { Card, CareerState, MatchResult } from '../src/engine/types'
import { ack, choose, newCareer, setIdentity } from '../src/engine/career'
import { tallyOf } from '../src/engine/performance'
import { Rng } from '../src/engine/rng'
import { countMatches, ingestCard, isBig, restore, stopAtInjury } from '../src/ui/stream'

/**
 * Лента сезона разбирает карточки движка на элементы. Движок при этом не
 * меняется вовсе, поэтому проверять надо ровно одно: что разбор ставит вещи в
 * том же порядке, в каком их выдаёт движок, и останавливается там же, где он
 * задаёт вопрос.
 */

const MATCH: MatchResult = {
  opponentId: 'milan',
  home: true,
  competition: 'league',
  round: 12,
  minutes: 90,
  started: true,
  goals: 0,
  assists: 0,
  cleanSheet: false,
  goalsConceded: 1,
  yellow: 0,
  red: false,
  rating: 6.8,
  teamGoals: 1,
  teamConceded: 1,
  injury: null,
  absence: null,
}

function match(over: Partial<MatchResult> = {}): MatchResult {
  return { ...MATCH, ...over }
}

function report(matches: MatchResult[]): Card {
  return {
    id: 'block@19:2',
    kind: 'report',
    stage: 'autumn',
    eventKey: 'block_report',
    channel: 'match',
    title: { key: 'report.block.title' },
    body: { key: 'report.block.body' },
    options: [],
    details: [{ key: 'report.block.tired' }],
    matches,
  }
}

describe('остановка на травме', () => {
  it('находит худшее повреждение тура, а не первое', () => {
    const matches = [match(), match({ injury: { kind: 'knock', severity: 1 } }), match({ injury: { kind: 'hamstring', severity: 3 } }), match()]
    expect(stopAtInjury(matches)).toBe(2)
  })

  it('при равной тяжести останавливается на первом — как свёртка движка', () => {
    const matches = [match(), match({ injury: { kind: 'a', severity: 2 } }), match({ injury: { kind: 'b', severity: 2 } })]
    expect(stopAtInjury(matches)).toBe(1)
  })

  it('лёгкий ушиб ленту не останавливает: движок про него не спрашивает', () => {
    expect(stopAtInjury([match(), match({ injury: { kind: 'knock', severity: 1 } })])).toBe(-1)
  })

  it('тура без повреждений это не касается', () => {
    expect(stopAtInjury([match(), match()])).toBe(-1)
  })
})

describe('разбор карточки тура', () => {
  it('матчи идут по одному, сводка — после них', () => {
    const got = ingestCard(report([match(), match(), match()]), 'ST')
    expect(got.now).toEqual([])
    expect(got.queue.map((i) => i.t)).toEqual(['match', 'match', 'match', 'divider'])
    expect(got.held).toEqual([])
    // Карточки тура на экране больше нет: движок двигаем сами.
    expect(got.advance).toBe(true)
    expect(got.blocked).toBe(false)
  })

  it('тяжёлая травма делит тур: хвост ждёт карточку лечения', () => {
    const matches = [
      match(),
      match({ injury: { kind: 'hamstring', severity: 3 } }),
      match({ minutes: 0, absence: 'injury' }),
      match({ minutes: 0, absence: 'injury' }),
    ]
    const got = ingestCard(report(matches), 'ST')
    expect(got.queue).toHaveLength(2)
    // Сводка тура уходит в хвост вместе с пропущенными матчами: показать её
    // раньше карточки значило бы отчитаться о туре, который ещё не досмотрен.
    expect(got.held.map((i) => i.t)).toEqual(['match', 'match', 'divider'])
  })

  it('травма в последнем матче тура ленту не делит', () => {
    const got = ingestCard(report([match(), match({ injury: { kind: 'knee', severity: 3 } })]), 'ST')
    expect(got.held).toEqual([])
    expect(got.queue).toHaveLength(3)
  })

  it('отчёт без матчей остаётся карточкой с кликом', () => {
    const card = { ...report([]), matches: undefined }
    const got = ingestCard(card, 'ST')
    expect(got.now.map((i) => i.t)).toEqual(['report'])
    expect(got.blocked).toBe(true)
    expect(got.advance).toBe(false)
  })

  it('событие с вариантами останавливает ленту', () => {
    const card: Card = {
      ...report([]),
      id: 'talk@19:autumn',
      kind: 'decision',
      matches: undefined,
      options: [{ id: 'yes', label: { key: 'x' }, hints: [], disabled: false }],
    }
    const got = ingestCard(card, 'ST')
    expect(got.now.map((i) => i.t)).toEqual(['card'])
    expect(got.blocked).toBe(true)
  })

  it('ключи элементов не повторяются', () => {
    const got = ingestCard(report([match(), match(), match()]), 'ST')
    const keys = got.queue.map((i) => i.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('какой матч разворачивать', () => {
  it('гол, удаление и травма — всегда', () => {
    expect(isBig(match({ goals: 1 }), 'ST')).toBe(true)
    expect(isBig(match({ red: true }), 'ST')).toBe(true)
    expect(isBig(match({ injury: { kind: 'knock', severity: 1 } }), 'ST')).toBe(true)
  })

  it('рядовой матч остаётся строкой', () => {
    expect(isBig(match(), 'ST')).toBe(false)
  })

  it('пропущенный матч не разворачивается', () => {
    expect(isBig(match({ minutes: 0, absence: 'injury', rating: 0 }), 'ST')).toBe(false)
  })

  it('вратарю сухой матч — событие, полевому игроку — нет', () => {
    expect(isBig(match({ cleanSheet: true, goalsConceded: 0 }), 'GK')).toBe(true)
    expect(isBig(match({ cleanSheet: true, goalsConceded: 0 }), 'CB')).toBe(false)
  })

  it('свои лучшие и худшие девяносто минут игрок запоминает', () => {
    expect(isBig(match({ rating: 8.4 }), 'CM')).toBe(true)
    expect(isBig(match({ rating: 5.2 }), 'CM')).toBe(true)
    expect(isBig(match({ rating: 6.9 }), 'CM')).toBe(false)
  })
})

describe('из чего складывается сводка сезона', () => {
  it('матчи дают её целиком, кроме голов и передач — их добавляют события', () => {
    // На этом стоит поправка на спойлер в шапке: она вычитает из готовой
    // `season.tally` то, что лента ещё не показала, а вычитать можно только
    // те величины, которые матчами и создаются.
    //
    // Голы, передачи и появления так вычитать нельзя было бы вслепую: события
    // раздают их напрямую эффектом `stat` — пенальти, гол в дерби, штрафные на
    // сборе. Они приходят в сводку без матча, и пересчёт сводки по матчам их
    // стёр бы. Вычитание же их не трогает: непоказанный матч уносит ровно свои.
    //
    // Тест сторожит именно эту границу. Если однажды событие начнёт раздавать
    // карточки или сухие матчи, равенства ниже сломаются — и поправку надо
    // будет чинить, а не молча показывать игроку не то число.
    let state = setIdentity(newCareer('tally-check'), {
      lastName: 'ТЕСТОВ', shirt: 10, foot: 'right', countryCode: 'ITA', position: 'CAM',
    })
    const rng = new Rng('tally-check', 'choices', 0)
    let checked = 0
    let topUps = 0
    for (let guard = 0; guard < 4000 && state.phase !== 'retired'; guard++) {
      const season = state.season
      if (season && season.matches.length > 0) {
        const own = tallyOf(season.matches)
        // Приходят только из матчей — совпадают в точности.
        expect(own.cleanSheets).toBe(season.tally.cleanSheets)
        expect(own.goalsConceded).toBe(season.tally.goalsConceded)
        expect(own.yellow).toBe(season.tally.yellow)
        expect(own.red).toBe(season.tally.red)
        expect(own.ratingCount).toBe(season.tally.ratingCount)
        // Сумма оценок складывается движком по турам, а здесь — по всем матчам
        // разом: сложение с плавающей точкой не ассоциативно, и требовать
        // побитового совпадения было бы придиркой к последнему знаку.
        expect(own.ratingSum).toBeCloseTo(season.tally.ratingSum, 6)
        // Событие может только добавить сверх сыгранного, но не отнять.
        expect(season.tally.goals).toBeGreaterThanOrEqual(own.goals)
        expect(season.tally.assists).toBeGreaterThanOrEqual(own.assists)
        expect(season.tally.apps).toBeGreaterThanOrEqual(own.apps)
        if (season.tally.goals > own.goals || season.tally.assists > own.assists) topUps++
        checked++
      }
      if (state.resolution) { state = ack(state); continue }
      const card = state.card
      if (!card) break
      const options = card.options.filter((o) => !o.disabled)
      state = choose(state, options.length > 0 ? options[rng.int(0, options.length - 1)].id : 'next')
    }
    // Проверка молчала бы и на пустой карьере — убеждаемся, что она отработала
    // и что случай с добавкой от события в ней действительно встретился.
    expect(checked).toBeGreaterThan(200)
    expect(topUps).toBeGreaterThan(0)
  })
})

describe('сколько лента ещё должна', () => {
  it('считает только матчи, разделители и карточки не в счёт', () => {
    const got = ingestCard(report([match(), match(), match()]), 'ST')
    expect(got.queue).toHaveLength(4)
    expect(countMatches(got.queue)).toBe(3)
  })

  it('придержанный хвост тоже ещё не показан', () => {
    const matches = [
      match(),
      match({ injury: { kind: 'hamstring', severity: 3 } }),
      match({ minutes: 0, absence: 'injury' }),
    ]
    const got = ingestCard(report(matches), 'ST')
    expect(countMatches(got.queue) + countMatches(got.held)).toBe(3)
  })
})

describe('восстановление после перезагрузки', () => {
  function state(matches: MatchResult[], card: Card | null): CareerState {
    return {
      season: { matches },
      card,
    } as unknown as CareerState
  }

  it('без сезона лента пуста', () => {
    expect(restore({ season: null, card: null } as unknown as CareerState)).toEqual([])
  })

  it('матчи карточки, которая ещё не показана, в историю не попадают', () => {
    const played = [match(), match(), match()]
    const pending = [match(), match()]
    const got = restore(state([...played, ...pending], report(pending)))
    expect(got).toHaveLength(3)
  })

  it('хвост ограничен: весь сезон заново не проигрывается', () => {
    const many = Array.from({ length: 30 }, () => match())
    expect(restore(state(many, null))).toHaveLength(10)
  })
})
