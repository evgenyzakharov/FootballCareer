import { useEffect, useReducer, useRef, useState } from 'react'
import type { Card, CareerState, Resolution, Text } from '../engine/types'
import { ack, choose } from '../engine/career'
import { CardView, ResolutionView } from './CardView'
import { MatchCard } from './Matches'
import { countMatches, ingestCard, restore, type Ingested, type StreamItem } from './stream'
import { useT } from './locale'

/** Шаг показа матчей. */
const STEP_MS = 700

/**
 * Сколько итог выбора стоит один, прежде чем лента поедет дальше. Из ленты он
 * никуда не денется и после — гаснет, но остаётся; пауза нужна лишь затем,
 * чтобы следующий матч не появился поверх него в ту же секунду.
 */
const PAUSE_MS = 700

/**
 * Лента сезона.
 *
 * Раньше на сцене жила одна карточка: тур приходил кучей из пяти-шести матчей,
 * потом его сменяло событие, и матч как отдельная вещь на экране не
 * существовал вовсе. Здесь матч и событие — соседние записи одного дневника, и
 * между ними ничего не исчезает.
 *
 * Движок остался прежним. Тур он по-прежнему считает целиком, до показа, — и
 * именно поэтому лента вольна нарезать его как угодно: по одному, с задержкой,
 * с остановкой на травме. Единственное правило, которое здесь держится
 * железно: пока лента показывает матчи, движок стоит. Иначе он ушёл бы на туры
 * вперёд, и всё, что считает по сезону разом, рассказало бы концовку раньше
 * самой ленты.
 */
interface View {
  items: StreamItem[]
  queue: StreamItem[]
  held: StreamItem[]
  /** На экране решение: лента ждёт игрока. */
  blocked: boolean
  /** Показанная карточка ждёт не клика, а нас: двигаем движок сами. */
  advance: boolean
}

type Act =
  | { t: 'ingest'; got: Ingested }
  | { t: 'resolution'; key: string; text: Text }
  | { t: 'reveal' }
  | { t: 'flush' }
  | { t: 'chose'; label: Text | null }
  | { t: 'advanced' }
  | { t: 'release' }

function reduce(view: View, act: Act): View {
  switch (act.t) {
    case 'ingest': {
      const { got } = act
      // Придержанный хвост тура доигрывается перед новой карточкой — но только
      // если она сама не ждёт ответа: тогда хвост ждёт вместе с ней.
      const queue = got.blocked ? view.queue : [...view.held, ...got.queue]
      const held = got.blocked ? view.held : got.held
      return { items: [...view.items, ...got.now], queue, held, blocked: got.blocked, advance: got.advance }
    }
    case 'resolution':
      return { ...view, items: [...view.items, { t: 'resolution', key: act.key, text: act.text }] }
    case 'reveal': {
      if (view.queue.length === 0) return view
      const [head, ...rest] = view.queue
      return { ...view, items: [...view.items, head], queue: rest }
    }
    case 'flush':
      return { ...view, items: [...view.items, ...view.queue], queue: [] }
    case 'chose': {
      // Прошедшая карточка теряет кнопки и запоминает выбор. Ищем её с конца:
      // решают всегда последнее, что появилось в ленте.
      const items = [...view.items]
      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i]
        if (item.t === 'card') {
          items[i] = { ...item, chosen: act.label }
          break
        }
        if (item.t === 'report') break
      }
      return { ...view, items, blocked: false }
    }
    case 'advanced':
      return { ...view, advance: false }
    case 'release':
      return { ...view, queue: [...view.queue, ...view.held], held: [] }
  }
}

/** Показывать всё разом просили настройками системы. */
function instantReveal(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function SeasonStream({
  state,
  onState,
  onPending,
}: {
  state: CareerState
  onState: (next: CareerState) => void
  /**
   * Сколько матчей сезона лента ещё не показала. Нужно шапке: она читает те же
   * `season.matches`, куда движок кладёт весь тур разом, и без этой поправки
   * отчитывалась бы о матчах раньше, чем они появятся в ленте.
   */
  onPending?: (count: number) => void
}) {
  const t = useT()
  const position = state.player.position
  const [instant] = useState(instantReveal)
  const [view, dispatch] = useReducer(reduce, state, (init): View => ({
    items: restore(init),
    queue: [],
    held: [],
    blocked: false,
    advance: false,
  }))

  // Что уже проглочено — помним по самому объекту, а не по его id: движок
  // собирает карточку заново на каждом показе, а пока она на экране, ссылка не
  // меняется. Id у событий складывается из ключа, возраста и этапа, и на нём
  // совпадение однажды случилось бы — а совпадение здесь означало бы
  // пропущенную карточку и вставшую ленту.
  const seenCard = useRef<Card | null>(null)
  const seenResolution = useRef<Resolution | null>(null)
  // Из одного и того же состояния движок двигается ровно один раз: в StrictMode
  // эффекты вызываются дважды, и без этого карьера прыгала бы через ход.
  const acted = useRef<CareerState | null>(null)
  const topRef = useRef<HTMLDivElement>(null)

  // Показ очереди: по элементу за такт.
  useEffect(() => {
    if (view.queue.length === 0) return
    if (instant) {
      dispatch({ t: 'flush' })
      return
    }
    const id = setTimeout(() => dispatch({ t: 'reveal' }), STEP_MS)
    return () => clearTimeout(id)
  }, [view.queue.length, instant])

  // Насос: пока показывать нечего, двигаем движок.
  useEffect(() => {
    if (view.queue.length > 0) return

    if (view.advance) {
      if (acted.current === state) return
      acted.current = state
      dispatch({ t: 'advanced' })
      onState(choose(state, 'next'))
      return
    }

    const resolution = state.resolution
    if (resolution) {
      if (seenResolution.current !== resolution) {
        seenResolution.current = resolution
        dispatch({ t: 'resolution', key: `res#${view.items.length}`, text: resolution.text })
        return
      }
      if (acted.current === state) return
      // Кнопки «дальше» у итога больше нет: он дочитывается на месте, а лента
      // едет сама. Хвост тура, придержанный из-за травмы, отпускается здесь —
      // после того, как игрок решил, что с ней делать.
      const id = setTimeout(() => {
        acted.current = state
        dispatch({ t: 'release' })
        onState(ack(state))
      }, instant ? 0 : PAUSE_MS)
      return () => clearTimeout(id)
    }

    if (state.card && seenCard.current !== state.card) {
      seenCard.current = state.card
      dispatch({ t: 'ingest', got: ingestCard(state.card, position) })
    }
  })

  const pending = countMatches(view.queue) + countMatches(view.held)
  useEffect(() => {
    onPending?.(pending)
  }, [pending, onPending])

  // Новое приходит наверх, и там же всегда стоит решение. Само по себе это не
  // держит его на виду: вставка сверху сдвигает всё вниз, и читающий остаётся
  // на прежнем месте — то есть на уже прожитом. Поэтому возвращаемся к началу.
  useEffect(() => {
    topRef.current?.scrollIntoView({ block: 'start', behavior: instant ? 'auto' : 'smooth' })
  }, [view.items.length, instant])

  function pick(card: Card, optionId: string) {
    const option = card.options.find((o) => o.id === optionId)
    dispatch({ t: 'chose', label: option?.label ?? null })
    onState(choose(state, optionId))
  }

  function render(item: StreamItem, live: boolean) {
    switch (item.t) {
      case 'match':
        return <MatchCard match={item.match} position={position} big={item.big} />
      case 'divider':
        return (
          <div className="stream__divider">
            <div className="stream__sum">
              <span className="stream__month">{t(item.title)}</span>
              <span className="stream__tally">{t(item.body)}</span>
            </div>
            {item.details.length > 0 && (
              <ul className="stream__notes">
                {item.details.map((line, i) => (
                  <li key={`${line.key}-${i}`}>{t(line)}</li>
                ))}
              </ul>
            )}
          </div>
        )
      case 'card':
        return (
          <CardView
            card={item.card}
            interactive={live && view.blocked}
            chosen={item.chosen}
            onChoose={(optionId) => pick(item.card, optionId)}
          />
        )
      case 'report':
        return (
          <CardView
            card={item.card}
            interactive={live && view.blocked}
            onChoose={() => pick(item.card, 'next')}
          />
        )
      case 'resolution':
        return <ResolutionView text={item.text} />
    }
  }

  // Лента читается сверху вниз, от свежего к прожитому: последнее случившееся
  // и есть то, ради чего на неё смотрят. Порядок в `items` остаётся
  // хронологическим — переворачивается только показ.
  const ordered = view.items.slice().reverse()
  return (
    <div className="stream">
      <div ref={topRef} />
      {view.queue.length > 0 && (
        <button type="button" className="ghost-btn stream__skip" onClick={() => dispatch({ t: 'flush' })}>
          {t({ key: 'stream.skip' })}
        </button>
      )}
      {ordered.map((item, i) => (
        <div className="stream__item" key={item.key} data-state={i === 0 ? 'live' : 'past'}>
          {render(item, i === 0)}
        </div>
      ))}
    </div>
  )
}
