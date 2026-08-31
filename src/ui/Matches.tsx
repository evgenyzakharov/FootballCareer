import type { MatchResult } from '../engine/types'
import { findClub } from '../data/clubs'
import { useLocale, useT } from './locale'

/** Цвет чипа оценки: провал, ровно, хорошо, отлично. */
function ratingTier(rating: number): 'poor' | 'ok' | 'good' | 'great' {
  if (rating >= 7.6) return 'great'
  if (rating >= 7) return 'good'
  if (rating >= 6.5) return 'ok'
  return 'poor'
}

/**
 * Лента матчей: строка на игру, оценка крупным чипом слева, остальное словами.
 * Таблицей это читалось как выгрузка из базы — глаз пересчитывал столбцы вместо
 * того, чтобы цепляться за провал и за лучший матч.
 */
export function MatchList({ matches, gk }: { matches: MatchResult[]; gk: boolean }) {
  const t = useT()
  const locale = useLocale()
  if (matches.length === 0) return null

  return (
    <div className="feed-matches">
      {matches.map((match, i) => {
        const club = findClub(match.opponentId)
        const played = match.minutes > 0
        const where = t({ key: match.home ? 'match.home' : 'match.away' })
        // Лигу называем номером тура: слово «чемпионат» и так подразумевается,
        // а номер ставит матч на место в сезоне. Кубок и еврокубок — словом.
        const comp =
          match.competition === 'league'
            ? match.round
              ? t({ key: 'match.round', params: { n: match.round } })
              : null
            : t({ key: `match.${match.competition}` })
        const how = match.started
          ? `${match.minutes}′`
          : t({ key: 'match.came_on', params: { minutes: match.minutes } })

        return (
          <div className="fx" key={`${match.opponentId}-${i}`} data-played={played}>
            <span className="fx__mark" data-tier={played ? ratingTier(match.rating) : 'none'}>
              {played ? match.rating.toFixed(1) : '—'}
            </span>
            <span className="fx__body">
              <span className="fx__club">{club ? club.name[locale] : '—'}</span>
              <span className="fx__meta">
                {[comp, where, played ? how : null].filter(Boolean).join(' · ')}
              </span>
            </span>
            <span className="fx__tags">
              {/* Пропущенный матч объясняется словом, а не строкой прочерков. */}
              {!played && (
                <span className="tag" data-kind="out">
                  {t({ key: `match.absence.${match.absence ?? 'squad'}` })}
                </span>
              )}
              {played && gk && match.cleanSheet && (
                <span className="tag" data-kind="good">{t({ key: 'match.clean_sheet' })}</span>
              )}
              {played && gk && !match.cleanSheet && (
                <span className="tag">{t({ key: 'match.conceded', params: { n: match.goalsConceded } })}</span>
              )}
              {played && !gk && match.goals > 0 && (
                <span className="tag" data-kind="good">{t({ key: 'match.goals', params: { n: match.goals } })}</span>
              )}
              {played && !gk && match.assists > 0 && (
                <span className="tag" data-kind="good">{t({ key: 'match.assists', params: { n: match.assists } })}</span>
              )}
              {played && match.red && <span className="tag" data-kind="bad">{t({ key: 'match.red' })}</span>}
              {played && !match.red && match.yellow > 0 && (
                <span className="tag" data-kind="warn">{t({ key: 'match.yellow' })}</span>
              )}
              {match.injury && <span className="tag" data-kind="bad">{t({ key: 'match.injured' })}</span>}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Форма за сезон одной полосой: столбик на матч, высота и цвет — оценка,
 * штриховка — пропущенный. Карточка тура показывает свои пять-шесть матчей,
 * а это то, чего в ней нет: весь сезон разом и куда он идёт.
 */
export function FormStrip({ matches }: { matches: MatchResult[] }) {
  const t = useT()
  const played = matches.filter((m) => m.minutes > 0)
  if (played.length === 0) return null

  const average = played.reduce((sum, m) => sum + m.rating, 0) / played.length
  // Последние пять против всего остального: по ним и видно, идёт ли игрок вверх.
  const tail = played.slice(-5)
  const tailAverage = tail.reduce((sum, m) => sum + m.rating, 0) / tail.length
  const trend = tailAverage - average

  return (
    <div className="form">
      <div className="form__head">
        <span className="form__mean">{average.toFixed(2)}</span>
        <span className="form__label">
          {t({ key: 'form.played', params: { n: played.length } })}
        </span>
        <span className="form__trend" data-tone={trend >= 0.15 ? 'good' : trend <= -0.15 ? 'bad' : 'flat'}>
          {t({ key: trend >= 0.15 ? 'form.rising' : trend <= -0.15 ? 'form.falling' : 'form.steady' })}
        </span>
      </div>
      <div className="form__strip">
        {matches.map((match, i) => (
          <span
            className="form__pip"
            key={`${match.opponentId}-${i}`}
            data-tier={match.minutes > 0 ? ratingTier(match.rating) : 'none'}
            // Высота от оценки: 4.5 — дно шкалы движка, 9.6 — потолок.
            style={{ height: match.minutes > 0 ? `${10 + (match.rating - 5.5) * 9}px` : '10px' }}
          />
        ))}
      </div>
    </div>
  )
}
