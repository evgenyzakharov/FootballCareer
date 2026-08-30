import type { MatchResult } from '../engine/types'
import { findClub } from '../data/clubs'
import { useLocale, useT } from './locale'

/**
 * Список сыгранных матчей: соперник, поле, минуты и то, что игрок в матче
 * сделал. Одна и та же таблица идёт и в отчёт о туре, и в панель последних
 * матчей — иначе отчёт пролистывается и от сезона ничего не остаётся.
 */
export function MatchList({ matches, gk }: { matches: MatchResult[]; gk: boolean }) {
  const t = useT()
  const locale = useLocale()
  if (matches.length === 0) return null

  return (
    <div className="matches">
      <table>
        <thead>
          <tr>
            <th>{t({ key: 'match.opponent' })}</th>
            <th className="num">{t({ key: 'match.minutes' })}</th>
            <th className="num">{t({ key: gk ? 'timeline.clean' : 'timeline.goals' })}</th>
            <th className="num">{t({ key: gk ? 'timeline.conceded' : 'timeline.assists' })}</th>
            <th className="num">{t({ key: 'timeline.rating' })}</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match, i) => {
            const club = findClub(match.opponentId)
            const played = match.minutes > 0
            return (
              <tr key={`${match.opponentId}-${i}`} data-played={played}>
                <td className="matches__club">
                  {club ? club.name[locale] : '—'}
                  <span className="matches__where">{t({ key: match.home ? 'match.home' : 'match.away' })}</span>
                  {/* Лигу не подписываем: она и так подразумевается. */}
                  {match.competition !== 'league' && (
                    <span className="matches__comp">{t({ key: `match.${match.competition}` })}</span>
                  )}
                </td>
                <td className="num">
                  {played ? match.minutes : '—'}
                  {/* Вышел со скамейки — это видно по минутам, но пусть будет явно. */}
                  {played && !match.started && <span className="matches__sub">{t({ key: 'match.sub' })}</span>}
                </td>
                <td className="num">{!played ? '—' : gk ? (match.cleanSheet ? '✓' : '—') : match.goals}</td>
                <td className="num">{!played ? '—' : gk ? match.goalsConceded : match.assists}</td>
                <td className="num">
                  {played ? match.rating.toFixed(1) : '—'}
                  {match.injury && <span className="matches__hurt">{t({ key: 'match.injured' })}</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
