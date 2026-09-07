import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import type { CareerState } from '../engine/types'
import { SkillsBody } from './Hud'
import { FeedBody, NationalBody, PeopleBody, TraitsBody, TrophiesBody } from './Sidebar'
import { Timeline } from './Timeline'
import { useT } from './locale'

interface Tab {
  id: string
  titleKey: string
  /**
   * `onState` нужен одной вкладке из семи — «Людям», где живут разговоры,
   * которые игрок заводит сам. Отдельного канала ради неё досье не заводит:
   * ход игрока идёт тем же путём, что и состояние.
   */
  body: (state: CareerState, onState?: (next: CareerState) => void) => ReactNode
}

/** Готовая вкладка со стороны: собирает её не досье, а тот, кто его рисует. */
export interface LeadTab {
  id: string
  titleKey: string
  body: ReactNode
}

/**
 * Вкладка на тему, а не на раздел. Сборные вкладки вроде «Игрок» прячут
 * половину содержимого под заголовком, который о нём не говорит: за словом
 * «Игрок» с равным правом лежат и навыки, и состояние, и черты, и угадывать,
 * что из этого внутри, игрок не должен.
 *
 * Порядок: сначала то, что про карьеру, потом то, что про самого игрока.
 */
const TABS: Tab[] = [
  { id: 'history', titleKey: 'tab.history', body: (state) => <Timeline state={state} bare /> },
  { id: 'national', titleKey: 'panel.national', body: (state) => <NationalBody state={state} /> },
  { id: 'trophies', titleKey: 'panel.trophies', body: (state) => <TrophiesBody state={state} /> },
  { id: 'feed', titleKey: 'panel.feed', body: (state) => <FeedBody state={state} /> },
  { id: 'attrs', titleKey: 'panel.attrs', body: (state) => <SkillsBody state={state} /> },
  { id: 'traits', titleKey: 'panel.traits', body: (state) => <TraitsBody state={state} /> },
  { id: 'people', titleKey: 'tab.people', body: (state, onState) => <PeopleBody state={state} onState={onState} /> },
]

/**
 * Досье: всё, что не про текущий ход, за одним набором вкладок.
 *
 * Раньше эти пять панелей стояли стопкой в колонке справа и не помещались в
 * экран никогда: до трофеев нужно было прокрутить историю за десять лет.
 * Видно одну вкладку — и она помещается целиком.
 *
 * `lead` — вкладка, которую досье не собирает само, а получает готовой и
 * ставит первой. Так на телефоне сюда въезжает лента сезона: на узком экране
 * она и досье — два длинных блока подряд, и держать их стопкой значит листать
 * ленту до конца ради истории. Вкладка вместо стопки решает это тем же
 * способом, каким досье решило его для своих пяти панелей.
 */
export function Dossier({
  state,
  onState,
  lead,
}: {
  state: CareerState
  /** Ход игрока: без него вкладка «Люди» остаётся списком, как на экране пенсии. */
  onState?: (next: CareerState) => void
  lead?: LeadTab
}) {
  const t = useT()
  const tabs: Tab[] = lead
    ? [{ id: lead.id, titleKey: lead.titleKey, body: () => lead.body }, ...TABS]
    : TABS
  const [active, setActive] = useState(tabs[0].id)
  // Идентификаторы у вкладок и панелей общие на компонент: экран завершения
  // рисует ту же разметку рядом, и совпадающие id связали бы чужие вкладки.
  const uid = useId()
  // Поворот телефона убирает ведущую вкладку вместе с раскладкой. Если игрок
  // стоял на ней, выбор указывает в никуда — и досье осталось бы пустым.
  const shown = tabs.some((tab) => tab.id === active) ? active : tabs[0].id

  return (
    <section className="dossier">
      <div className="tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${uid}-tab-${tab.id}`}
            className="tab"
            aria-selected={tab.id === shown}
            aria-controls={`${uid}-pane-${tab.id}`}
            onClick={() => setActive(tab.id)}
          >
            {t({ key: tab.titleKey })}
          </button>
        ))}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${uid}-pane-${tab.id}`}
          aria-labelledby={`${uid}-tab-${tab.id}`}
          className="dossier__body"
          hidden={tab.id !== shown}
        >
          {tab.body(state, onState)}
        </div>
      ))}
    </section>
  )
}
