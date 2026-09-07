import type { CareerState, CurrentSeason } from '../engine/types'
import { isDefender, isGoalkeeper } from '../engine/attributes'
import { SEASON_MATCHES, averageRating, tallyOf } from '../engine/performance'
import { findClub } from '../data/clubs'
import { getLeague } from '../data/leagues'
import { Empty, Fact } from './bits'
import { FormStrip } from './Matches'
import { seasonLabel } from './format'
import { useLocale, useT } from './locale'

/**
 * Сводка сезона с поправкой на непоказанные матчи.
 *
 * Движок кладёт в сезон весь тур разом, до показа, а лента идёт по матчу: без
 * поправки счётчик голов и полоса формы отрастали бы на весь тур, пока лента
 * показывает первый его матч, — то есть рассказывали бы про матчи раньше самих
 * матчей.
 *
 * Поправка вычитает непоказанное, а не пересчитывает сводку по матчам:
 * `season.tally` матчами не исчерпывается. Голы и передачи в неё приходят и от
 * событий — пенальти, гол в дерби, штрафные на сборе, — а в матчах их нет.
 * Пересчёт с нуля стёр бы их и обманул бы игрока в другую сторону.
 */
function shownTally(season: CurrentSeason, pending: number) {
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
  return { shown, tally, rating: averageRating(tally.ratingSum, tally.ratingCount) }
}

/**
 * Какой идёт сезон и где: «Сезон 2027/28 · Наполи · Серия А».
 *
 * Отдельно от полосы, потому что на телефоне заголовок и содержимое живут
 * порознь: строка сезона дописывается к строке клуба в шапке игрока, а счёт
 * матчей раскрывается под ней вместе с остальной справкой.
 *
 * `withClub` — для той самой дописки. Клуб там уже назван строкой выше, и
 * повторять его значило бы тратить на «Наполи» полстроки дважды подряд; без
 * клуба остаются лига и сезон, то есть ровно то, чего в шапке не было.
 */
export function SeasonHeading({ state, withClub = true }: { state: CareerState; withClub?: boolean }) {
  const t = useT()
  const locale = useLocale()
  const season = state.season
  if (!season) return null
  const club = findClub(season.clubId)
  const label = t({ key: 'season.now', params: { season: seasonLabel(state.startYear, season.age) } })
  const league = club && <span className="season__league">{getLeague(club.leagueId).name[locale]}</span>
  return withClub ? (
    <>
      {label}
      {club && <> · {club.name[locale]}</>}
      {league && <> · {league}</>}
    </>
  ) : (
    <>
      {league && <>{league} · </>}
      {label}
    </>
  )
}

/**
 * Как идёт сезон: счёт матчей и полоса формы. Заголовка нет — его ставит тот,
 * кто эти цифры показывает: полоса сезона на широком экране или шапка игрока
 * на телефоне.
 */
export function SeasonFacts({ state, pending = 0 }: { state: CareerState; pending?: number }) {
  const season = state.season
  if (!season) return null

  const player = state.player
  const gk = isGoalkeeper(player.position)
  const { shown, tally, rating } = shownTally(season, pending)

  return (
    <>
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
        {/* Средняя оценка живёт над полосой формы и только там: два числа
            рядом расходились — движок взвешивает оценку минутами, а полоса
            считала простое среднее, и игрок видел 7.46 и 7.29 про один и тот
            же сезон. Осталось то, по которому судят задачу на сезон. */}
        <Fact labelKey="timeline.yellow" value={tally.yellow} />
        <Fact labelKey="timeline.red" value={tally.red} />
      </div>

      <div className="season__graph">
        {shown.length === 0 ? (
          <Empty textKey="panel.no_matches" />
        ) : (
          <FormStrip matches={shown} position={player.position} total={SEASON_MATCHES} rating={rating} />
        )}
      </div>
    </>
  )
}

/**
 * Текущий сезон целиком: сводка слева, форма по матчам справа.
 *
 * Из всей карьеры перед решением нужны ровно эти две вещи — как идёт сезон и
 * как идут последние матчи. Раньше они лежали в колонках вместе с историей за
 * десять лет, и на таблицу с историей оставалось триста пикселей, в которых
 * столбцы слипались. История переехала в досье, а «сейчас» поднялось наверх.
 *
 * Полосы этой на телефоне нет вовсе: там она сложилась бы во второй свёрнутый
 * блок под первым, и оба говорили бы про один и тот же клуб. Сезон переехал в
 * шапку игрока — заголовок в её строку, цифры под общую кнопку.
 */
export function SeasonBar({ state, pending = 0 }: { state: CareerState; pending?: number }) {
  // В академии сезона ещё нет: показывать нечего, и полоса не рисуется вовсе.
  if (!state.season) return null

  return (
    <section className="season">
      <div className="season__title"><SeasonHeading state={state} /></div>
      <SeasonFacts state={state} pending={pending} />
    </section>
  )
}
