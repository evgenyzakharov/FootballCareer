import type { CareerState } from '../engine/types'
import { isDefender, isGoalkeeper } from '../engine/attributes'
import { averageRating, tallyOf } from '../engine/performance'
import { findClub } from '../data/clubs'
import { getLeague } from '../data/leagues'
import { Empty, Fact } from './bits'
import { FormStrip } from './Matches'
import { seasonLabel } from './format'
import { useLocale, useT } from './locale'

/**
 * Текущий сезон целиком: сводка слева, форма по матчам справа.
 *
 * Из всей карьеры перед решением нужны ровно эти две вещи — как идёт сезон и
 * как идут последние матчи. Раньше они лежали в колонках вместе с историей за
 * десять лет, и на таблицу с историей оставалось триста пикселей, в которых
 * столбцы слипались. История переехала в досье, а «сейчас» поднялось наверх.
 */
export function SeasonBar({ state, pending = 0 }: { state: CareerState; pending?: number }) {
  const t = useT()
  const locale = useLocale()
  const season = state.season
  // В академии сезона ещё нет: показывать нечего, и полоса не рисуется вовсе.
  if (!season) return null

  const player = state.player
  const gk = isGoalkeeper(player.position)
  const club = findClub(season.clubId)
  // Движок кладёт в сезон весь тур разом, до показа, а лента идёт по матчу:
  // без поправки счётчик голов и полоса формы отрастали бы на весь тур, пока
  // лента показывает первый его матч, — то есть рассказывали бы про матчи
  // раньше самих матчей.
  //
  // Поправка вычитает непоказанное, а не пересчитывает сводку по матчам:
  // `season.tally` матчами не исчерпывается. Голы и передачи в неё приходят и
  // от событий — пенальти, гол в дерби, штрафные на сборе, — а в матчах их
  // нет. Пересчёт с нуля стёр бы их и обманул бы игрока в другую сторону.
  const shown = pending > 0
    ? season.matches.slice(0, Math.max(0, season.matches.length - pending))
    : season.matches
  const hidden = tallyOf(season.matches.slice(shown.length))
  const t0 = season.tally
  const tally = {
    apps: t0.apps - hidden.apps,
    goals: t0.goals - hidden.goals,
    assists: t0.assists - hidden.assists,
    cleanSheets: t0.cleanSheets - hidden.cleanSheets,
    goalsConceded: t0.goalsConceded - hidden.goalsConceded,
    ratingSum: t0.ratingSum - hidden.ratingSum,
    ratingCount: t0.ratingCount - hidden.ratingCount,
    yellow: t0.yellow - hidden.yellow,
    red: t0.red - hidden.red,
  }
  const rating = averageRating(tally.ratingSum, tally.ratingCount)

  return (
    <section className="season">
      <div className="season__head">
        <div className="season__title">
          {t({ key: 'season.now', params: { season: seasonLabel(state.startYear, season.age) } })}
          {club && <> · {club.name[locale]}</>}
          {club && <span className="season__league"> · {getLeague(club.leagueId).name[locale]}</span>}
        </div>
        <div className="season__stats">
          <Fact labelKey="hud.apps" value={tally.apps} />
          {gk ? (
            <>
              <Fact labelKey="hud.clean_sheets" value={tally.cleanSheets} />
              <Fact labelKey="hud.conceded" value={tally.goalsConceded} />
            </>
          ) : (
            <>
              <Fact labelKey="hud.goals" value={tally.goals} />
              <Fact labelKey="hud.assists" value={tally.assists} />
              {/* Защитника сезон мерит не голами: сухие матчи — его цифра. */}
              {isDefender(player.position) && (
                <Fact labelKey="hud.team_clean_sheets" value={tally.cleanSheets} />
              )}
            </>
          )}
          {rating > 0 && (
            <Fact
              labelKey="hud.rating"
              tone={rating >= 7.1 ? 'good' : rating < 6.5 ? 'bad' : undefined}
              value={rating.toFixed(2)}
            />
          )}
          <Fact labelKey="timeline.yellow" value={tally.yellow} />
          <Fact labelKey="timeline.red" value={tally.red} />
        </div>
      </div>

      <div className="season__graph">
        {shown.length === 0 ? (
          <Empty textKey="panel.no_matches" />
        ) : (
          <FormStrip matches={shown} position={player.position} />
        )}
      </div>
    </section>
  )
}
