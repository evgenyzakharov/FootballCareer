import type { CareerState, League } from '../engine/types'
import { isGoalkeeper } from '../engine/attributes'
import { careerTotals } from '../engine/career'
import { findClub } from '../data/clubs'
import { getCountry } from '../data/countries'
import { getLeague } from '../data/leagues'
import { Chip, Empty, KeyValue, Panel, Stat } from './bits'
import { seasonEndYear, seasonShort } from './format'
import { useLocale, useT } from './locale'

/**
 * Награды, которые разыгрываются внутри лиги, а не в мире: их название без
 * лиги ничего не говорит. Золотой мяч и гол года мировые — им лига не нужна.
 */
const LEAGUE_AWARDS = new Set(['golden_boot', 'best_gk', 'best_defender', 'league_mvp', 'young_player'])

/** В какой лиге игрок провёл сезон этого возраста. null — сезона нет в истории. */
function leagueAt(state: CareerState, age: number): League | null {
  const season = state.history.find((s) => s.age === age)
  const club = findClub(season?.clubId ?? null)
  return club ? getLeague(club.leagueId) : null
}

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
  // Свежие турниры сверху: последний чемпионат помнят, а первый уже история.
  const tournaments = [...state.history]
    .reverse()
    .filter((season): season is typeof season & { national: { tournament: string } } =>
      season.national.tournament !== null)
    .map((season) => ({
      age: season.age,
      tournament: season.national.tournament,
      trophy: season.national.trophy,
    }))

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

      {/* Черты меняются раз в несколько сезонов — им хватает места в сайдбаре. */}
      <Panel titleKey="panel.traits">
        {state.player.traits.length === 0 ? (
          <Empty textKey="panel.no_traits" />
        ) : (
          <div className="chips">
            {state.player.traits.map((trait) => (
              <Chip key={trait} tone="good">{t({ key: `trait.${trait}` })}</Chip>
            ))}
          </div>
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
            {/*
              Счётчик «Больших турниров: 1» не отвечал ни на один вопрос: какой
              это был турнир, когда и чем кончился. Турниры мы ведём по сезонам,
              поэтому здесь список, а отдельная строка с числом титулов больше
              не нужна — победа отмечена в самой строке турнира.
            */}
            {tournaments.length > 0 && (
              <>
                <div className="gauge-group">{t({ key: 'national.tournaments' })}</div>
                {tournaments.map((item) => (
                  <div className="kv" key={`${item.age}-${item.tournament}`}>
                    <span className="kv__k">
                      {t({ key: `comp.${item.tournament}` })} {seasonEndYear(state.startYear, item.age)}
                    </span>
                    <span className="kv__v" data-tone={item.trophy ? 'good' : undefined}>
                      {item.trophy ? t({ key: 'national.won' }) : t({ key: 'national.played' })}
                    </span>
                  </div>
                ))}
              </>
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
            {/*
              Награду лиги без названия лиги прочитать нельзя: «Лучший игрок
              лиги» одинаково выглядит и во Второй лиге А, и в Серии А, а это
              разные истории. В самой награде лиги нет, только возраст, — она
              берётся из сезона, в котором награда получена.
            */}
            {state.awards.map((award, i) => {
              const league = LEAGUE_AWARDS.has(award.key) ? leagueAt(state, award.age) : null
              return (
                <Chip key={`aw-${i}`} tone="risky">
                  {t({ key: `award.${award.key}` })}
                  {league ? ` · ${league.name[locale]}` : ''} {seasonShort(state.startYear, award.age)}
                </Chip>
              )
            })}
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
