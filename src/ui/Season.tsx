import type { CareerState } from '../engine/types'
import { isDefender, isGoalkeeper } from '../engine/attributes'
import { averageRating } from '../engine/performance'
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
export function SeasonBar({ state }: { state: CareerState }) {
  const t = useT()
  const locale = useLocale()
  const season = state.season
  // В академии сезона ещё нет: показывать нечего, и полоса не рисуется вовсе.
  if (!season) return null

  const player = state.player
  const gk = isGoalkeeper(player.position)
  const club = findClub(season.clubId)
  const tally = season.tally
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
        {season.matches.length === 0 ? (
          <Empty textKey="panel.no_matches" />
        ) : (
          <FormStrip matches={season.matches} position={player.position} />
        )}
      </div>
    </section>
  )
}
