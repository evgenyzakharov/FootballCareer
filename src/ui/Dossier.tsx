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
  body: (state: CareerState) => ReactNode
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
  { id: 'people', titleKey: 'tab.people', body: (state) => <PeopleBody state={state} /> },
]

/**
 * Досье: всё, что не про текущий ход, за одним набором вкладок.
 *
 * Раньше эти пять панелей стояли стопкой в колонке справа и не помещались в
 * экран никогда: до трофеев нужно было прокрутить историю за десять лет.
 * Видно одну вкладку — и она помещается целиком.
 */
export function Dossier({ state }: { state: CareerState }) {
  const t = useT()
  const [active, setActive] = useState(TABS[0].id)
  // Идентификаторы у вкладок и панелей общие на компонент: экран завершения
  // рисует ту же разметку рядом, и совпадающие id связали бы чужие вкладки.
  const uid = useId()

  return (
    <section className="dossier">
      <div className="tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${uid}-tab-${tab.id}`}
            className="tab"
            aria-selected={tab.id === active}
            aria-controls={`${uid}-pane-${tab.id}`}
            onClick={() => setActive(tab.id)}
          >
            {t({ key: tab.titleKey })}
          </button>
        ))}
      </div>

      {TABS.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${uid}-pane-${tab.id}`}
          aria-labelledby={`${uid}-tab-${tab.id}`}
          className="dossier__body"
          hidden={tab.id !== active}
        >
          {tab.body(state)}
        </div>
      ))}
    </section>
  )
}
