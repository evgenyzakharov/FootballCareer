import type { CareerState } from '../engine/types'
import { currentOvr } from '../engine/career'
import { averageRating } from '../engine/performance'
import { findClub } from '../data/clubs'
import { getLeague } from '../data/leagues'
import { Panel } from './bits'
import { ovrTier, seasonLabel } from './format'
import { useLocale, useT } from './locale'

interface Row {
  key: string
  season: string
  age: number
  clubName: string
  leagueName: string
  leaguePos: number | null
  loan: boolean
  ovr: number
  rating: number
  apps: number
  goals: number
  assists: number
  cleanSheets: number
  goalsConceded: number
  yellow: number
  red: number
  marks: string
  current: boolean
}

/**
 * Порядок сезонов. По ходу карьеры сверху нужен последний: панель отвечает на
 * «как я иду сейчас», а список длиннее экрана, и начало карьеры занимало его
 * целиком. На экране завершения — наоборот, там читают историю с начала.
 */
type Order = 'recent' | 'chronological'

export function Timeline({
  state,
  order = 'recent',
  bare = false,
}: {
  state: CareerState
  order?: Order
  /** Во вкладке досье рамка и заголовок уже есть — второй набор здесь лишний. */
  bare?: boolean
}) {
  const t = useT()
  const locale = useLocale()
  const gk = state.player.position === 'GK'

  const rows: Row[] = state.history.map((season, i) => {
    const club = findClub(season.clubId)
    return {
      key: `h${i}`,
      season: seasonLabel(state.startYear, season.age),
      age: season.age,
      clubName: club ? club.name[locale] : '—',
      leagueName: club ? getLeague(club.leagueId).name[locale] : '',
      leaguePos: season.leaguePos,
      loan: season.loan,
      ovr: season.ovrEnd,
      rating: averageRating(season.tally.ratingSum, season.tally.ratingCount),
      apps: season.tally.apps,
      goals: season.tally.goals,
      assists: season.tally.assists,
      cleanSheets: season.tally.cleanSheets,
      goalsConceded: season.tally.goalsConceded,
      yellow: season.tally.yellow,
      red: season.tally.red,
      // Компактная отметка: сколько трофеев и наград взято за сезон.
      marks: '★'.repeat(Math.min(4, season.trophies.length)) + '✦'.repeat(Math.min(3, season.awards.length)),
      current: false,
    }
  })

  // Закрытый сезон уже лежит в истории, но `state.season` держит его до начала
  // следующего — от отчёта об итогах до трансферного окна. Без этой проверки
  // он в это время показывался в таблице дважды.
  const closed = new Set(state.history.map((season) => season.age))
  if (state.season && state.phase === 'season' && !closed.has(state.season.age)) {
    const club = findClub(state.season.clubId)
    rows.push({
      key: 'current',
      season: seasonLabel(state.startYear, state.season.age),
      age: state.season.age,
      clubName: club ? club.name[locale] : '—',
      leagueName: club ? getLeague(club.leagueId).name[locale] : '',
      leaguePos: null,
      loan: state.season.loan,
      ovr: currentOvr(state),
      rating: averageRating(state.season.tally.ratingSum, state.season.tally.ratingCount),
      apps: state.season.tally.apps,
      goals: state.season.tally.goals,
      assists: state.season.tally.assists,
      cleanSheets: state.season.tally.cleanSheets,
      goalsConceded: state.season.tally.goalsConceded,
      yellow: state.season.tally.yellow,
      red: state.season.tally.red,
      marks: '★'.repeat(Math.min(4, state.season.trophies.length)),
      current: true,
    })
  }

  // Строки собираются от первого сезона к последнему: текущий дописывается в
  // конец. Разворачиваем готовый список, а не собираем в другом порядке.
  const ordered = order === 'recent' ? [...rows].reverse() : rows

  return (
    <Panel titleKey={bare ? undefined : 'panel.timeline'}>
      <div className="timeline">
        <table>
          <thead>
            <tr>
              <th>{t({ key: 'timeline.season' })}</th>
              <th>{t({ key: 'timeline.club' })}</th>
              <th>{t({ key: 'timeline.ovr' })}</th>
              <th className="num">{t({ key: 'timeline.rating' })}</th>
              <th className="num">{t({ key: 'timeline.apps' })}</th>
              {/* У вратаря голы и передачи всегда нули — столбцы другие. */}
              <th className="num">{t({ key: gk ? 'timeline.clean' : 'timeline.goals' })}</th>
              <th className="num">{t({ key: gk ? 'timeline.conceded' : 'timeline.assists' })}</th>
              {/* Карточки отделены линией: это дисциплина, а не продуктивность,
                  и без неё шесть чисел подряд читались одной строкой цифр. */}
              <th className="num timeline__sep" title={t({ key: 'timeline.yellow_hint' })}>
                {t({ key: 'timeline.yellow' })}
              </th>
              <th className="num" title={t({ key: 'timeline.red_hint' })}>{t({ key: 'timeline.red' })}</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((row) => (
              <tr key={row.key} data-current={row.current}>
                <td className="timeline__season">
                  {row.season}
                  <span className="timeline__age">{row.age}</span>
                </td>
                <td className="timeline__club">
                  {row.clubName}
                  {row.loan && <span className="timeline__loan"> ↳</span>}
                  {row.marks && <span className="timeline__marks"> {row.marks}</span>}
                  {row.leagueName && (
                    <span className="timeline__league">
                      {row.leagueName}
                      {/* Место известно только по итогам сезона. */}
                      {row.leaguePos !== null && ` · ${row.leaguePos}`}
                    </span>
                  )}
                </td>
                <td>
                  <span className="timeline__ovr" data-tier={ovrTier(row.ovr)}>{row.ovr}</span>
                </td>
                <td className="num">{row.rating > 0 ? row.rating.toFixed(2) : '—'}</td>
                <td className="num">{row.apps}</td>
                <td className="num">{gk ? row.cleanSheets : row.goals}</td>
                <td className="num">{gk ? row.goalsConceded : row.assists}</td>
                <td className="num timeline__sep" data-zero={row.yellow === 0}>{row.yellow}</td>
                <td className="num" data-zero={row.red === 0} data-kind={row.red > 0 ? 'red' : undefined}>
                  {row.red}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
