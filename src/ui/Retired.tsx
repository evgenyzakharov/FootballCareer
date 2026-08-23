import type { CareerState } from '../engine/types'
import { careerTotals } from '../engine/career'
import { formatMoney } from '../i18n'
import { Sidebar } from './Sidebar'
import { Timeline } from './Timeline'
import { useLocale, useT } from './locale'

function verdictKey(peak: number, trophies: number, awards: number): string {
  if (peak >= 86 && (trophies >= 8 || awards >= 2)) return 'retired.verdict_legend'
  if (peak >= 78 && trophies >= 3) return 'retired.verdict_star'
  if (peak >= 70) return 'retired.verdict_pro'
  return 'retired.verdict_journeyman'
}

export function Retired({ state, onRestart }: { state: CareerState; onRestart: () => void }) {
  const t = useT()
  const locale = useLocale()
  const totals = careerTotals(state)
  const peak = Math.max(0, ...state.history.map((h) => h.ovrEnd))

  return (
    <div className="retired">
      <h1 className="retired__title">{t({ key: 'retired.title' })}</h1>
      <p className="retired__sub">
        {t({ key: 'retired.subtitle', params: { age: state.retiredAt ?? state.player.age } })}
      </p>

      <div className="retired__verdict">{t({ key: verdictKey(peak, totals.trophies, totals.awards) })}</div>

      <div className="retired__grid">
        <BigStat labelKey="retired.seasons" value={state.history.length} />
        <BigStat labelKey="retired.clubs" value={state.clubsPlayed.length} />
        <BigStat labelKey="retired.peak" value={peak} />
        <BigStat labelKey="hud.apps" value={totals.apps} />
        <BigStat labelKey="hud.goals" value={totals.goals} />
        <BigStat labelKey="hud.assists" value={totals.assists} />
        <BigStat labelKey="hud.caps" value={totals.caps} />
        <BigStat labelKey="panel.trophies" value={totals.trophies} />
        <BigStat labelKey="hud.money" value={formatMoney(state.player.money, locale)} />
      </div>

      <div className="retired__cols">
        <div><Timeline state={state} /></div>
        <div><Sidebar state={state} /></div>
      </div>

      <div style={{ marginTop: 20 }}>
        <button type="button" className="primary-btn" onClick={onRestart}>
          {t({ key: 'retired.restart' })}
        </button>
      </div>
    </div>
  )
}

function BigStat({ labelKey, value }: { labelKey: string; value: string | number }) {
  const t = useT()
  return (
    <div className="big-stat">
      <div className="big-stat__value">{value}</div>
      <div className="big-stat__label">{t({ key: labelKey })}</div>
    </div>
  )
}
