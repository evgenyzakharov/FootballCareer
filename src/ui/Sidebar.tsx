import type { CareerState } from '../engine/types'
import { Chip, Empty, Panel } from './bits'
import { useLocale, useT } from './locale'

function stanceTone(stance: number): 'good' | 'bad' | 'neutral' {
  if (stance >= 25) return 'good'
  if (stance <= -25) return 'bad'
  return 'neutral'
}

function stanceKey(stance: number): string {
  if (stance >= 25) return 'stance.ally'
  if (stance <= -25) return 'stance.hostile'
  return 'stance.neutral'
}

export function Sidebar({ state }: { state: CareerState }) {
  const t = useT()
  const locale = useLocale()
  const feed = [...state.feed].reverse().slice(0, 40)

  return (
    <>
      <Panel titleKey="panel.people">
        {state.relationships.length === 0 ? (
          <Empty textKey="panel.no_traits" />
        ) : (
          <div className="people">
            {state.relationships.map((person) => (
              <div className="person" key={`${person.role}-${person.name.en}-${person.sinceAge}`}>
                <span>
                  <span className="person__role">{t({ key: `rel.${person.role}` })}: </span>
                  <span className="person__name">{person.name[locale]}</span>
                </span>
                <span className="person__stance" data-tone={stanceTone(person.stance)}>
                  {t({ key: stanceKey(person.stance) })}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel titleKey="panel.trophies">
        {state.trophies.length === 0 && state.awards.length === 0 ? (
          <Empty textKey="panel.no_trophies" />
        ) : (
          <div className="chips">
            {state.trophies.map((trophy, i) => (
              <Chip key={`tr-${i}`} tone="good">
                {t({ key: `comp.${trophy.name}` })} ’{String(trophy.age).padStart(2, '0')}
              </Chip>
            ))}
            {state.awards.map((award, i) => (
              <Chip key={`aw-${i}`} tone="risky">
                {t({ key: `award.${award.key}` })} ’{String(award.age).padStart(2, '0')}
              </Chip>
            ))}
          </div>
        )}
      </Panel>

      <Panel titleKey="panel.feed">
        {feed.length === 0 ? (
          <Empty textKey="panel.no_feed" />
        ) : (
          <div className="feed">
            {feed.map((item, i) => (
              <div className="feed__item" key={`${item.age}-${i}`}>
                <span className="feed__age">{item.age}</span>
                <span className="feed__text">{t(item.text)}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  )
}
