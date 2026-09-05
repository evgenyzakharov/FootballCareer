import type { CareerState } from '../engine/types'
import { ATTR_KEYS, isGoalkeeper } from '../engine/attributes'
import { currentOvr, currentValue, managerStyle, squadStanding } from '../engine/career'
import { find, styleFit } from '../engine/relationships'
import { findClub } from '../data/clubs'
import { getCountry } from '../data/countries'
import { BipolarGauge, Fact, Gauge } from './bits'
import { ovrTier } from './format'
import { useLocale, useMoney, useT } from './locale'

/**
 * Кто игрок и на каких условиях он в клубе — одной полосой над всем экраном.
 *
 * Раньше это была колонка в триста пикселей, и «Читтадини · контроль мяча ·
 * вам на руку» переносилось в ней тремя строками. В строке те же факты стоят
 * рядом и читаются слева направо, а высвободившаяся колонка ушла под событие.
 */
export function HudFacts({ state }: { state: CareerState }) {
  const t = useT()
  const locale = useLocale()
  const money = useMoney()
  const player = state.player
  const ovr = currentOvr(state)
  const club = findClub(state.season?.clubId ?? state.contract?.clubId ?? null)
  const standing = squadStanding(state)
  const manager = find(state.relationships, 'manager')
  const style = managerStyle(state)
  // Манера тренера двигает минуты и продуктивность, поэтому игрок должен
  // видеть и её, и то, как он в неё вписан: иначе просевшие минуты выглядят
  // как случайность.
  const fit = style ? styleFit(style, player.position) : 0

  return (
    <section className="facts">
      <div className="facts__ident">
        <div className="ovr" data-tier={ovrTier(ovr)}>
          <div className="ovr__label">OVR</div>
          <div className="ovr__value">{ovr}</div>
        </div>
        <div className="hud__ident">
          <div className="hud__name">
            {player.lastName} <span className="hud__shirt">#{player.shirt}</span>
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

      <div className="facts__list">
        <Fact labelKey="hud.age" value={player.age} />
        <Fact labelKey="hud.value" value={money(currentValue(state))} />
        <Fact labelKey="hud.money" value={money(player.money)} />
        {state.season && <Fact labelKey="hud.role" value={t({ key: `role.${state.season.role}` })} />}
        {standing && (
          <Fact
            labelKey="hud.squad_bar"
            tone={standing.gap >= 2 ? 'good' : standing.gap <= -2 ? 'bad' : undefined}
            value={t({
              key: 'hud.squad_bar_value',
              params: {
                level: standing.level,
                gap: standing.gap > 0 ? `+${standing.gap}` : `−${Math.abs(standing.gap)}`,
              },
            })}
          />
        )}
        {manager && style && (
          <Fact
            labelKey="hud.manager"
            tone={fit > 0 ? 'good' : fit < 0 ? 'bad' : undefined}
            value={t({
              key: 'hud.manager_value',
              params: {
                name: manager.name,
                style: { key: `style.${style}` },
                fit: fit === 0 ? '' : { key: fit > 0 ? 'hud.style_suits' : 'hud.style_against' },
              },
            })}
          />
        )}
        {state.contract && (
          <>
            <Fact labelKey="hud.wage" value={money(state.contract.wage)} />
            <Fact
              labelKey="hud.contract"
              value={t({ key: 'hud.contract_years', params: { years: state.contract.yearsLeft } })}
            />
          </>
        )}
        {state.contract?.objective && (
          <Fact
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
        {/* Травма и дисквалификация — новость дня: она стоит последней, потому
            что появляется редко, и в этом месте её видно как что-то новое. */}
        {(player.banMatches > 0 || player.matchesOut > 0) && (
          <Fact
            labelKey="hud.status"
            tone="bad"
            value={t({
              key: player.matchesOut > 0 ? 'hud.status_injured' : 'hud.status_suspended',
              params: { matches: player.matchesOut > 0 ? player.matchesOut : player.banMatches },
            })}
          />
        )}
      </div>
    </section>
  )
}

/**
 * Восемь одинаковых полос подряд не давали понять, на что смотреть. Первая
 * четвёрка решает, выйдет ли игрок на поле в ближайшем туре, вторая — что с
 * ним будет летом.
 */
export function GaugesBody({ state }: { state: CareerState }) {
  const t = useT()
  const { gauges } = state.player
  return (
    <>
      <div className="gauge-group">{t({ key: 'panel.state_pitch' })}</div>
      <div className="gauge-grid">
        <Gauge labelKey="gauge.form" value={gauges.form} />
        <Gauge labelKey="gauge.fitness" value={gauges.fitness} />
        <Gauge labelKey="gauge.morale" value={gauges.morale} />
        <Gauge labelKey="gauge.coachTrust" value={gauges.coachTrust} />
      </div>
      <div className="gauge-group">{t({ key: 'panel.state_around' })}</div>
      <div className="gauge-grid">
        <Gauge labelKey="gauge.fanLove" value={gauges.fanLove} />
        <Gauge labelKey="gauge.lockerRoom" value={gauges.lockerRoom} />
        <BipolarGauge labelKey="gauge.mediaRep" value={gauges.mediaRep} />
        <Gauge labelKey="gauge.fame" value={gauges.fame} />
      </div>
    </>
  )
}

export function SkillsBody({ state }: { state: CareerState }) {
  const t = useT()
  const player = state.player
  const gk = isGoalkeeper(player.position)
  return (
    <div className="attr-grid">
      {ATTR_KEYS.filter((key) => (key === 'goalkeeping' ? gk : true)).map((key) => (
        <div className="attr" key={key}>
          <span className="attr__name">{t({ key: `attr.${key}` })}</span>
          <span className="attr__value">{Math.round(player.attrs[key])}</span>
        </div>
      ))}
    </div>
  )
}
