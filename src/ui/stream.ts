import type { Card, CareerState, MatchResult, Position, Text } from '../engine/types'
import { isGoalkeeper } from '../engine/attributes'

/**
 * Лента сезона: матчи и события одним списком, сверху вниз.
 *
 * Движок про ленту не знает и знать не должен. Он по-прежнему считает тур
 * целиком — пять-шесть матчей разом — и отдаёт их одной карточкой-отчётом.
 * Раз тур посчитан заранее, показывать его можно как угодно: по одному, с
 * задержкой, с остановкой посередине. Всё это — здесь, и ничего из этого не
 * трогает ни RNG, ни баланс.
 */
export type StreamItem =
  | { t: 'match'; key: string; match: MatchResult; big: boolean }
  | { t: 'divider'; key: string; title: Text; body: Text; details: Text[] }
  | { t: 'card'; key: string; card: Card; chosen: Text | null }
  | { t: 'resolution'; key: string; text: Text }
  | { t: 'report'; key: string; card: Card }

/** Разбор карточки движка на элементы ленты. */
export interface Ingested {
  /** В ленту сразу. */
  now: StreamItem[]
  /** Показывать по одному, с шагом. */
  queue: StreamItem[]
  /**
   * Придержать до следующей карточки: хвост тура после тяжёлой травмы. Игрок
   * должен сначала решить, как лечиться, и только потом увидеть матчи, которые
   * он из-за этой травмы пропустил.
   */
  held: StreamItem[]
  /** На экране решение: лента стоит, пока игрок не ответил. */
  blocked: boolean
  /** Карточку показывать нечем — движок двигаем сами, без клика. */
  advance: boolean
}

/** С какой тяжести повреждение получает собственную карточку. */
const SEVERE = 2

/** Сколько уже сыгранных матчей возвращается в ленту после перезагрузки. */
const RESTORED = 10

/**
 * Матч, на котором лента должна остановиться. Движок спрашивает про худшее
 * повреждение тура и только начиная со второй степени тяжести — здесь тот же
 * отбор, что и в `runBlock`, иначе лента встанет не на том матче, о котором
 * придёт карточка.
 *
 * Строгое сравнение важно: при равной тяжести побеждает первое повреждение —
 * так же, как в свёртке движка.
 */
export function stopAtInjury(matches: MatchResult[]): number {
  let index = -1
  let worst = 0
  matches.forEach((match, i) => {
    if (match.injury && match.injury.severity > worst) {
      worst = match.injury.severity
      index = i
    }
  })
  return worst >= SEVERE ? index : -1
}

/**
 * Матчу есть что рассказать?
 *
 * Равенство матча и события — по весу в ленте, а не по площади на экране:
 * пятьдесят полноразмерных карточек за сезон читались бы как километр скролла,
 * в котором рядовая ничья выглядит ровно так же, как дебютный гол. Поэтому
 * рядовой матч остаётся строкой, а матч с историей разворачивается.
 */
export function isBig(match: MatchResult, position: Position): boolean {
  if (match.minutes === 0) return false
  if (match.red || match.injury) return true
  if (isGoalkeeper(position)) {
    if (match.cleanSheet || match.goalsConceded >= 4) return true
  } else if (match.goals > 0 || match.assists > 0) {
    return true
  }
  // Сухой матч полевому игроку — обычное дело, а вот свои лучшие и худшие
  // девяносто минут он запоминает независимо от того, забил или нет.
  return match.rating >= 8 || match.rating <= 5.5
}

/**
 * Карточка движка → элементы ленты.
 *
 * Отчёт о туре перестаёт быть карточкой: матчи из него идут по одному, а сам
 * отчёт сжимается в разделитель и встаёт после них. Стоять он должен именно
 * после: сводка «5 матчей, 2 гола, средняя 7.1», показанная заранее,
 * пересказала бы тур раньше, чем игрок его увидит.
 */
export function ingestCard(card: Card, position: Position): Ingested {
  const matches = card.matches ?? []

  if (card.kind === 'report' && matches.length > 0) {
    const items: StreamItem[] = matches.map((match, i) => ({
      t: 'match',
      key: `${card.id}#m${i}`,
      match,
      big: isBig(match, position),
    }))
    const divider: StreamItem = {
      t: 'divider',
      key: `${card.id}#sum`,
      title: card.title,
      body: card.body,
      details: card.details ?? [],
    }
    const stop = stopAtInjury(matches)
    // Останавливаемся только если после травмы что-то осталось: сломаться в
    // последнем матче тура — это просто конец тура.
    if (stop >= 0 && stop < items.length - 1) {
      return {
        now: [],
        queue: items.slice(0, stop + 1),
        held: [...items.slice(stop + 1), divider],
        blocked: false,
        advance: true,
      }
    }
    return { now: [], queue: [...items, divider], held: [], blocked: false, advance: true }
  }

  // Отчёты без матчей — итоги сезона, рынок, год без клуба — остаются
  // карточками во всю ширину: им есть что сказать, и клик «дальше» там уместен.
  if (card.kind === 'report') {
    return { now: [{ t: 'report', key: card.id, card }], queue: [], held: [], blocked: true, advance: false }
  }

  return {
    now: [{ t: 'card', key: card.id, card, chosen: null }],
    queue: [],
    held: [],
    blocked: true,
    advance: false,
  }
}

/** Сколько матчей в списке элементов. Ими считается, что лента ещё должна. */
export function countMatches(items: StreamItem[]): number {
  return items.reduce((n, item) => n + (item.t === 'match' ? 1 : 0), 0)
}

/**
 * Чем лента заполняется на старте. Сама она живёт только в сессии: после
 * перезагрузки страницы событий сезона уже не собрать — их текстов в
 * сохранении нет. А матчи есть, и пустой экран вместо прожитого сезона был бы
 * хуже, чем короткий хвост из последних игр.
 *
 * Матчи карточки, которая сейчас на очереди, из хвоста вычитаются: движок
 * дописывает тур в сезон до показа, и без этой поправки они попали бы в ленту
 * дважды — сначала как история, потом как новый тур.
 */
export function restore(state: CareerState): StreamItem[] {
  const season = state.season
  if (!season) return []
  const pending = state.card?.matches?.length ?? 0
  const shown = pending > 0 ? season.matches.slice(0, season.matches.length - pending) : season.matches
  return shown.slice(-RESTORED).map((match, i) => ({
    t: 'match',
    key: `back#${i}`,
    match,
    // Восстановленное — это фон, а не событие: разворачивать его незачем.
    big: false,
  }))
}
