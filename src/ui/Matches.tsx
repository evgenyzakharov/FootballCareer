import type { ReactNode } from 'react'
import type { Absence, MatchResult, Position } from '../engine/types'
import { isDefender, isGoalkeeper } from '../engine/attributes'
import { findClub } from '../data/clubs'
import { useLocale, useT } from './locale'

/** Цвет чипа оценки: провал, ровно, хорошо, отлично. */
function ratingTier(rating: number): 'poor' | 'ok' | 'good' | 'great' {
  if (rating >= 7.6) return 'great'
  if (rating >= 7) return 'good'
  if (rating >= 6.5) return 'ok'
  return 'poor'
}

type Translate = ReturnType<typeof useT>

/**
 * Турнир и место игры словами. Лигу называем номером тура: слово «чемпионат» и
 * так подразумевается, а номер ставит матч на место в сезоне. Кубок и
 * еврокубок — словом.
 */
function circumstances(match: MatchResult, t: Translate): string {
  const comp =
    match.competition === 'league'
      ? match.round
        ? t({ key: 'match.round', params: { n: match.round } })
        : null
      : t({ key: `match.${match.competition}` })
  const where = t({ key: match.home ? 'match.home' : 'match.away' })
  return [comp, where].filter(Boolean).join(' · ')
}

/** Как игрок провёл матч. У пропущенного минут нет — и строки тоже. */
function minutesOf(match: MatchResult, t: Translate): string | null {
  if (match.minutes === 0) return null
  return match.started ? `${match.minutes}′` : t({ key: 'match.came_on', params: { minutes: match.minutes } })
}

/** Что случилось в матче: голы, карточки, травма — метками. */
function MatchTags({ match, position }: { match: MatchResult; position: Position }) {
  const t = useT()
  const gk = isGoalkeeper(position)
  // Сухой матч отмечается и защитнику: он его тоже заработал. Пропущенные
  // при этом остаются вратарской строкой.
  const clean = gk || isDefender(position)
  const played = match.minutes > 0

  return (
    <span className="fx__tags">
      {/* Пропущенный матч объясняется словом, а не строкой прочерков. */}
      {!played && (
        <span className="tag" data-kind="out">
          {t({ key: `match.absence.${match.absence ?? 'squad'}` })}
        </span>
      )}
      {played && clean && match.cleanSheet && (
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
  )
}

/**
 * Матч строкой: оценка крупным чипом слева, обстоятельства словами, события —
 * метками справа. Таблицей это читалось как выгрузка из базы — глаз
 * пересчитывал столбцы вместо того, чтобы цепляться за провал и за лучший матч.
 */
export function MatchRow({ match, position }: { match: MatchResult; position: Position }) {
  const t = useT()
  const locale = useLocale()
  const club = findClub(match.opponentId)
  const played = match.minutes > 0

  return (
    <div className="fx" data-played={played}>
      <span className="fx__mark" data-tier={played ? ratingTier(match.rating) : 'none'}>
        {played ? match.rating.toFixed(1) : '—'}
      </span>
      <span className="fx__body">
        <span className="fx__club">{club ? club.name[locale] : '—'}</span>
        <span className="fx__meta">
          {[circumstances(match, t), minutesOf(match, t)].filter(Boolean).join(' · ')}
        </span>
      </span>
      <MatchTags match={match} position={position} />
    </div>
  )
}

/**
 * Матч в ленте сезона. Рядовой остаётся строкой, матч с историей —
 * разворачивается: соперник, табло и оценка получают место, потому что именно
 * такие матчи игрок и вспоминает. Кому разворачиваться, решает `isBig`.
 */
export function MatchCard({
  match,
  position,
  big,
}: {
  match: MatchResult
  position: Position
  big: boolean
}) {
  const t = useT()
  const locale = useLocale()
  if (!big) return <MatchRow match={match} position={position} />

  const club = findClub(match.opponentId)
  // У матчей из старых сохранений табло нет: строку со счётом просто не рисуем.
  const score =
    match.teamGoals === undefined || match.teamConceded === undefined
      ? null
      : `${match.teamGoals}:${match.teamConceded}`
  const tone =
    match.teamGoals === undefined || match.teamConceded === undefined
      ? 'flat'
      : match.teamGoals > match.teamConceded
        ? 'good'
        : match.teamGoals === match.teamConceded
          ? 'flat'
          : 'bad'

  return (
    <article className="mcard">
      <span className="mcard__meta">{circumstances(match, t)}</span>
      <div className="mcard__head">
        <span className="mcard__club">{club ? club.name[locale] : '—'}</span>
        {score && <span className="mcard__score" data-tone={tone}>{score}</span>}
      </div>
      <div className="mcard__foot">
        <span className="fx__mark" data-tier={ratingTier(match.rating)}>{match.rating.toFixed(1)}</span>
        {minutesOf(match, t) && <span className="mcard__how">{minutesOf(match, t)}</span>}
        <MatchTags match={match} position={position} />
      </div>
    </article>
  )
}

/**
 * Почему матча не было. Прочерк одинаково выглядел и для сломанного, и для
 * того, кого тренер не выпустил, — а это разные новости: одна про здоровье,
 * другая про место в составе.
 */
function AbsenceIcon({ absence }: { absence: Absence }) {
  if (absence === 'injury') {
    return (
      <svg className="form__icon" viewBox="0 0 12 12" aria-hidden="true">
        <rect x="4.6" y="0.6" width="2.8" height="10.8" rx="1" fill="var(--bad)" />
        <rect x="0.6" y="4.6" width="10.8" height="2.8" rx="1" fill="var(--bad)" />
      </svg>
    )
  }
  if (absence === 'ban') {
    return (
      <svg className="form__icon" viewBox="0 0 12 12" aria-hidden="true">
        <rect x="2.4" y="0.8" width="7.2" height="10.4" rx="1.4" fill="var(--bad)" />
      </svg>
    )
  }
  return (
    <svg className="form__icon" viewBox="0 0 14 12" aria-hidden="true">
      <rect x="0.8" y="4.8" width="12.4" height="2.2" rx="1" fill="var(--text-faint)" />
      <rect x="0.8" y="1.2" width="12.4" height="2" rx="1" fill="var(--line)" />
      <rect x="2" y="7" width="1.8" height="4.2" rx=".8" fill="var(--text-faint)" />
      <rect x="10.2" y="7" width="1.8" height="4.2" rx=".8" fill="var(--text-faint)" />
    </svg>
  )
}

function TipRow({ labelKey, value }: { labelKey: string; value: ReactNode }) {
  const t = useT()
  return (
    <span className="tip__row">
      <span>{t({ key: labelKey })}</span>
      <b>{value}</b>
    </span>
  )
}

/**
 * Что было в матче, который показывает столбик. Раньше под полосой лежал
 * список последних игр, но он отвечал только про три из полусотни и занимал
 * половину панели: остальные матчи в нём было не посмотреть вовсе.
 */
function MatchTip({ match, position }: { match: MatchResult; position: Position }) {
  const t = useT()
  const locale = useLocale()
  const club = findClub(match.opponentId)
  const gk = isGoalkeeper(position)
  const played = match.minutes > 0
  const where = t({ key: match.home ? 'match.home' : 'match.away' })
  const comp =
    match.competition === 'league'
      ? match.round
        ? t({ key: 'match.round', params: { n: match.round } })
        : null
      : t({ key: `match.${match.competition}` })
  const how = !played
    ? null
    : match.started
      ? `${match.minutes}′`
      : t({ key: 'match.came_on', params: { minutes: match.minutes } })
  // У матчей из старых сохранений табло нет: строку со счётом просто не рисуем.
  const score =
    match.teamGoals === undefined || match.teamConceded === undefined
      ? null
      : `${match.teamGoals}:${match.teamConceded}`

  return (
    <span className="tip" role="tooltip">
      <span className="tip__club">{club ? club.name[locale] : '—'}</span>
      <span className="tip__meta">{[comp, where, how].filter(Boolean).join(' · ')}</span>
      {score && <TipRow labelKey="form.score" value={score} />}
      {played ? (
        <>
          <TipRow labelKey="hud.rating" value={match.rating.toFixed(1)} />
          {gk ? (
            <TipRow labelKey="hud.conceded" value={match.goalsConceded} />
          ) : (
            <>
              <TipRow labelKey="hud.goals" value={match.goals} />
              <TipRow labelKey="hud.assists" value={match.assists} />
            </>
          )}
          {match.red && <span className="tip__note" data-tone="bad">{t({ key: 'match.red' })}</span>}
          {!match.red && match.yellow > 0 && (
            <span className="tip__note" data-tone="warn">{t({ key: 'match.yellow' })}</span>
          )}
          {match.injury && <span className="tip__note" data-tone="bad">{t({ key: 'match.injured' })}</span>}
        </>
      ) : (
        // Пропущенный матч — это соперник, счёт и причина. Личной статистики у
        // него нет, и показывать нули вместо неё было бы враньём.
        <span className="tip__note" data-tone={match.absence === 'squad' ? 'flat' : 'bad'}>
          {t({ key: `match.absence.${match.absence ?? 'squad'}` })}
        </span>
      )}
    </span>
  )
}

/**
 * Форма за сезон одной полосой: столбик на матч, высота и цвет — оценка,
 * пропущенный — значком причины. Карточка тура показывает свои пять-шесть
 * матчей, а это то, чего в ней нет: весь сезон разом и куда он идёт. Подробности
 * матча приходят подсказкой по наведению, чтобы полоса оставалась полосой.
 */
export function FormStrip({ matches, position }: { matches: MatchResult[]; position: Position }) {
  const t = useT()
  const played = matches.filter((m) => m.minutes > 0)
  // Полоса нужна и тому, кто не сыграл ни одного матча: сезон, проведённый в
  // лазарете или на скамейке, — это тоже история сезона, и раньше вместо неё
  // была пустота. Средней и тренда у такого сезона нет, и врать их нельзя.
  if (matches.length === 0) return null

  const average = played.length > 0 ? played.reduce((sum, m) => sum + m.rating, 0) / played.length : 0
  // Последние пять против всего остального: по ним и видно, идёт ли игрок вверх.
  const tail = played.slice(-5)
  const tailAverage = tail.length > 0 ? tail.reduce((sum, m) => sum + m.rating, 0) / tail.length : 0
  const trend = tailAverage - average

  return (
    <div className="form">
      <div className="form__head">
        {played.length > 0 && <span className="form__mean">{average.toFixed(2)}</span>}
        <span className="form__label">
          {played.length > 0
            ? t({ key: 'form.played', params: { n: played.length } })
            : t({ key: 'form.none' })}
        </span>
        {played.length > 0 && (
          <span className="form__trend" data-tone={trend >= 0.15 ? 'good' : trend <= -0.15 ? 'bad' : 'flat'}>
            {t({ key: trend >= 0.15 ? 'form.rising' : trend <= -0.15 ? 'form.falling' : 'form.steady' })}
          </span>
        )}
      </div>
      <div className="form__strip">
        {matches.map((match, i) => {
          const wasOn = match.minutes > 0
          return (
            // Наводиться нужно на всю высоту столбца, а не на сам столбик:
            // у провального матча он в пять пикселей, и попасть в него мышью
            // было бы отдельным упражнением.
            <span className="form__slot" key={`${match.opponentId}-${i}`} tabIndex={0}>
              <span
                className="form__pip"
                data-tier={wasOn ? ratingTier(match.rating) : 'none'}
                // Высота от оценки: 4.5 — дно шкалы движка, 9.6 — потолок.
                style={wasOn ? { height: `${10 + (match.rating - 5.5) * 9}px` } : undefined}
              >
                {!wasOn && <AbsenceIcon absence={match.absence ?? 'squad'} />}
              </span>
              <MatchTip match={match} position={position} />
            </span>
          )
        })}
      </div>
    </div>
  )
}
