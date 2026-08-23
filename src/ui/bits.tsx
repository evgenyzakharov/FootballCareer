import type { ReactNode } from 'react'
import { useT } from './locale'

export function Panel({ titleKey, children }: { titleKey: string; children: ReactNode }) {
  const t = useT()
  return (
    <section className="panel">
      <h2 className="panel__title">{t({ key: titleKey })}</h2>
      {children}
    </section>
  )
}

export function Empty({ textKey }: { textKey: string }) {
  const t = useT()
  return <p className="panel__empty">{t({ key: textKey })}</p>
}

export function Gauge({ labelKey, value }: { labelKey: string; value: number }) {
  const t = useT()
  const level = value < 30 ? 'low' : value < 55 ? 'mid' : 'high'
  return (
    <div className="gauge">
      <div className="gauge__head">
        <span>{t({ key: labelKey })}</span>
        <span>{Math.round(value)}</span>
      </div>
      <div className="gauge__track">
        <div className="gauge__fill" data-level={level} style={{ width: `${Math.max(2, value)}%` }} />
      </div>
    </div>
  )
}

/** Двусторонний показатель (пресса от −100 до 100) рисуем от середины. */
export function BipolarGauge({ labelKey, value }: { labelKey: string; value: number }) {
  const t = useT()
  const normalized = (value + 100) / 2
  const level = value < -25 ? 'low' : value < 10 ? 'mid' : 'high'
  return (
    <div className="gauge">
      <div className="gauge__head">
        <span>{t({ key: labelKey })}</span>
        <span>{value > 0 ? `+${Math.round(value)}` : Math.round(value)}</span>
      </div>
      <div className="gauge__track">
        <div className="gauge__fill" data-level={level} style={{ width: `${Math.max(2, normalized)}%` }} />
      </div>
    </div>
  )
}

export function Chip({ children, tone }: { children: ReactNode; tone?: 'good' | 'bad' | 'risky' | 'neutral' }) {
  return <span className="chip" data-tone={tone ?? 'neutral'}>{children}</span>
}

export function Stat({ labelKey, value }: { labelKey: string; value: ReactNode }) {
  const t = useT()
  return (
    <div className="stat">
      <div className="stat__label">{t({ key: labelKey })}</div>
      <div className="stat__value">{value}</div>
    </div>
  )
}

export function KeyValue({
  labelKey,
  value,
  tone,
}: {
  labelKey: string
  value: ReactNode
  tone?: 'good' | 'bad' | 'neutral'
}) {
  const t = useT()
  return (
    <div className="kv">
      <span className="kv__k">{t({ key: labelKey })}</span>
      <span className="kv__v" data-tone={tone}>{value}</span>
    </div>
  )
}
