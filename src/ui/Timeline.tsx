import type { CareerState } from '../engine/types'
import { currentOvr } from '../engine/career'
import { findClub } from '../data/clubs'
import { Panel } from './bits'
import { ovrTier } from './format'
import { useLocale, useT } from './locale'

interface Row {
  age: number
  clubName: string
  loan: boolean
  ovr: number
  apps: number
  goals: number
  assists: number
  marks: string
  current: boolean
}

export function Timeline({ state }: { state: CareerState }) {
  const t = useT()
  const locale = useLocale()

  const rows: Row[] = state.history.map((season) => {
    const club = findClub(season.clubId)
    return {
      age: season.age,
      clubName: club ? club.name[locale] : '—',
      loan: season.loan,
      ovr: season.ovrEnd,
      apps: season.tally.apps,
      goals: season.tally.goals,
      assists: season.tally.assists,
      // Компактная отметка: сколько трофеев и наград взято за сезон.
      marks: '★'.repeat(Math.min(4, season.trophies.length)) + '✦'.repeat(Math.min(3, season.awards.length)),
      current: false,
    }
  })

  if (state.season && state.phase === 'season') {
    const club = findClub(state.season.clubId)
    rows.push({
      age: state.season.age,
      clubName: club ? club.name[locale] : '—',
      loan: state.season.loan,
      ovr: currentOvr(state),
      apps: state.season.tally.apps,
      goals: state.season.tally.goals,
      assists: state.season.tally.assists,
      marks: '★'.repeat(Math.min(4, state.season.trophies.length)),
      current: true,
    })
  }

  return (
    <Panel titleKey="panel.timeline">
      <div className="timeline">
        <table>
          <thead>
            <tr>
              <th>{t({ key: 'timeline.age' })}</th>
              <th>{t({ key: 'timeline.club' })}</th>
              <th>{t({ key: 'timeline.ovr' })}</th>
              <th className="num">{t({ key: 'timeline.apps' })}</th>
              <th className="num">{t({ key: 'timeline.goals' })}</th>
              <th className="num">{t({ key: 'timeline.assists' })}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.age}-${row.clubName}`} data-current={row.current}>
                <td>{row.age}</td>
                <td className="timeline__club">
                  {row.clubName}
                  {row.loan && <span className="timeline__loan"> ↳</span>}
                  {row.marks && <span className="timeline__marks"> {row.marks}</span>}
                </td>
                <td>
                  <span className="timeline__ovr" data-tier={ovrTier(row.ovr)}>{row.ovr}</span>
                </td>
                <td className="num">{row.apps}</td>
                <td className="num">{row.goals}</td>
                <td className="num">{row.assists}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
