import type { CareerState } from '../engine/types'
import { isGoalkeeper } from '../engine/attributes'
import { careerTotals } from '../engine/career'
import { getCountry } from '../data/countries'
import { Chip, Empty, KeyValue, Panel, Stat } from './bits'
import { FormStrip, MatchList } from './Matches'
import { seasonShort } from './format'
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
  // Сборная считается за всю карьеру, а не по сезонам: в таблице карьеры её
  // нет вовсе, а в отчёте о сезоне видно только текущий год.
  const totals = careerTotals(state)
  const gk = isGoalkeeper(state.player.position)
  const played = state.season?.matches ?? []
  // Три последних матча, свежие сверху: весь тур и так лежит в его карточке,
  // а панель отвечает на «что было вчера» и «куда идёт сезон».
  const recent = [...played].reverse().slice(0, 3)

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

      {/* Отчёт о туре пролистывается и исчезает — здесь сезон остаётся на виду. */}
      <Panel titleKey="panel.matches">
        {played.length === 0 ? (
          <Empty textKey="panel.no_matches" />
        ) : (
          <>
            <FormStrip matches={played} />
            <MatchList matches={recent} gk={gk} />
          </>
        )}
      </Panel>

      <Panel titleKey="panel.national">
        {totals.caps === 0 ? (
          <Empty textKey="panel.no_caps" />
        ) : (
          <>
            <div className={gk ? 'stat-row' : 'stat-row stat-row--pair'}>
              <Stat labelKey="hud.caps" value={totals.caps} />
              {gk ? (
                <>
                  <Stat labelKey="hud.clean_sheets" value={totals.nationalCleanSheets} />
                  <Stat labelKey="hud.conceded" value={totals.nationalConceded} />
                </>
              ) : (
                <Stat labelKey="hud.goals" value={totals.nationalGoals} />
              )}
            </div>
            <KeyValue labelKey="national.country" value={getCountry(state.player.countryCode).name[locale]} />
            <KeyValue labelKey="national.tournaments" value={totals.nationalTournaments} />
            {totals.nationalTrophies > 0 && (
              <KeyValue labelKey="national.titles" tone="good" value={totals.nationalTrophies} />
            )}
          </>
        )}
      </Panel>

      <Panel titleKey="panel.trophies">
        {state.trophies.length === 0 && state.awards.length === 0 ? (
          <Empty textKey="panel.no_trophies" />
        ) : (
          <div className="chips">
            {/* Подписываем сезоном, а не возрастом: «'17» читалось как 2017 год. */}
            {state.trophies.map((trophy, i) => (
              <Chip key={`tr-${i}`} tone="good">
                {t({ key: `comp.${trophy.name}` })} {seasonShort(state.startYear, trophy.age)}
              </Chip>
            ))}
            {state.awards.map((award, i) => (
              <Chip key={`aw-${i}`} tone="risky">
                {t({ key: `award.${award.key}` })} {seasonShort(state.startYear, award.age)}
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
