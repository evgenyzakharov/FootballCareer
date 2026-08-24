import type { CareerState } from '../engine/types'
import { ATTR_KEYS, isGoalkeeper } from '../engine/attributes'
import { currentOvr, currentValue, squadStanding } from '../engine/career'
import { averageRating } from '../engine/performance'
import { findClub } from '../data/clubs'
import { getCountry } from '../data/countries'
import { BipolarGauge, Chip, Empty, Gauge, KeyValue, Panel, Stat } from './bits'
import { ovrTier } from './format'
import { useLocale, useMoney, useT } from './locale'

export function Hud({ state }: { state: CareerState }) {
  const t = useT()
  const locale = useLocale()
  const money = useMoney()
  const player = state.player
  const ovr = currentOvr(state)
  const club = findClub(state.season?.clubId ?? state.contract?.clubId ?? null)
  const standing = squadStanding(state)
  const tally = state.season?.tally
  const rating = tally ? averageRating(tally.ratingSum, tally.ratingCount) : 0
  const gk = isGoalkeeper(player.position)

  return (
    <>
      <section className="panel">
        <div className="hud__top">
          <div className="ovr" data-tier={ovrTier(ovr)}>
            <div className="ovr__label">OVR</div>
            <div className="ovr__value">{ovr}</div>
          </div>
          <div className="hud__ident">
            <div className="hud__name">
              {player.lastName} <span style={{ color: 'var(--text-faint)' }}>#{player.shirt}</span>
            </div>
            <div className="hud__meta">
              {getCountry(player.countryCode).name[locale]} · {t({ key: `pos.${player.position}` })}
            </div>
            <div className="hud__meta">
              {club ? club.name[locale] : t({ key: 'hud.free_agent' })}
              {state.season?.loan ? ` (${t({ key: 'hud.on_loan' })})` : ''}
            </div>
          </div>
        </div>

        <div className="stat-row">
          <Stat labelKey="hud.age" value={player.age} />
          <Stat labelKey="hud.value" value={money(currentValue(state))} />
          <Stat labelKey="hud.money" value={money(player.money)} />
        </div>

        {/* У вратаря продуктивность — это сухие матчи и пропущенные, а не голы. */}
        <div className="stat-row">
          <Stat labelKey="hud.apps" value={tally?.apps ?? 0} />
          {gk ? (
            <>
              <Stat labelKey="hud.clean_sheets" value={tally?.cleanSheets ?? 0} />
              <Stat labelKey="hud.conceded" value={tally?.goalsConceded ?? 0} />
            </>
          ) : (
            <>
              <Stat labelKey="hud.goals" value={tally?.goals ?? 0} />
              <Stat labelKey="hud.assists" value={tally?.assists ?? 0} />
            </>
          )}
        </div>

        {rating > 0 && (
          <KeyValue
            labelKey="hud.rating"
            tone={rating >= 7.1 ? 'good' : rating < 6.5 ? 'bad' : 'neutral'}
            value={rating.toFixed(2)}
          />
        )}

        {state.season && (
          <KeyValue labelKey="hud.role" value={t({ key: `role.${state.season.role}` })} />
        )}
        {standing && (
          <KeyValue
            labelKey="hud.squad_bar"
            tone={standing.gap >= 2 ? 'good' : standing.gap <= -2 ? 'bad' : 'neutral'}
            value={t({
              key: 'hud.squad_bar_value',
              params: {
                level: standing.level,
                gap: standing.gap > 0 ? `+${standing.gap}` : `−${Math.abs(standing.gap)}`,
              },
            })}
          />
        )}
        {(player.banBlocks > 0 || player.blocksOut > 0) && (
          <KeyValue
            labelKey="hud.status"
            value={t({
              key: player.banBlocks > 0 ? 'hud.status_suspended' : 'hud.status_injured',
              params: { blocks: player.banBlocks > 0 ? player.banBlocks : player.blocksOut },
            })}
          />
        )}
        {state.contract && (
          <>
            <KeyValue labelKey="hud.wage" value={money(state.contract.wage)} />
            <KeyValue
              labelKey="hud.contract"
              value={t({ key: 'hud.contract_years', params: { years: state.contract.yearsLeft } })}
            />
          </>
        )}
        {state.contract?.objective && (
          <KeyValue
            labelKey="hud.objective"
            value={t({
              key: 'hud.objective_value',
              params: {
                kind: { key: `objective.${state.contract.objective.kind}` },
                target: state.contract.objective.target,
              },
            })}
          />
        )}
      </section>

      <Panel titleKey="panel.gauges">
        {/* Обёртка нужна для мобильной раскладки: восемь полос в один столбец
            занимают полэкрана, в два — вдвое меньше. */}
        <div className="gauge-grid">
          <Gauge labelKey="gauge.form" value={player.gauges.form} />
          <Gauge labelKey="gauge.fitness" value={player.gauges.fitness} />
          <Gauge labelKey="gauge.morale" value={player.gauges.morale} />
          <Gauge labelKey="gauge.coachTrust" value={player.gauges.coachTrust} />
          <Gauge labelKey="gauge.fanLove" value={player.gauges.fanLove} />
          <BipolarGauge labelKey="gauge.mediaRep" value={player.gauges.mediaRep} />
          <Gauge labelKey="gauge.lockerRoom" value={player.gauges.lockerRoom} />
          <Gauge labelKey="gauge.fame" value={player.gauges.fame} />
        </div>
      </Panel>

    </>
  )
}

/**
 * Навыки и черты живут отдельно от остальной панели игрока: в широкой
 * раскладке они уходят в верхнюю строку центральной колонки. Левая колонка
 * иначе не влезала в экран — состояние уезжало под сгиб.
 */
export function HudSkills({ state }: { state: CareerState }) {
  const t = useT()
  const player = state.player
  const gk = isGoalkeeper(player.position)

  return (
    <>
      <Panel titleKey="panel.attrs">
        <div className="attr-grid">
          {ATTR_KEYS.filter((key) => (key === 'goalkeeping' ? gk : true)).map((key) => (
            <div className="attr" key={key}>
              <span className="attr__name">{t({ key: `attr.${key}` })}</span>
              <span className="attr__value">{Math.round(player.attrs[key])}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel titleKey="panel.traits">
        {player.traits.length === 0 ? (
          <Empty textKey="panel.no_traits" />
        ) : (
          <div className="chips">
            {player.traits.map((trait) => (
              <Chip key={trait} tone="good">{t({ key: `trait.${trait}` })}</Chip>
            ))}
          </div>
        )}
      </Panel>
    </>
  )
}
