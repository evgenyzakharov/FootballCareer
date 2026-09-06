import type { ReactNode } from 'react'
import { bipolarBand, gaugeBand } from './format'
import { useT } from './locale'

/**
 * Заголовок необязателен: во вкладке досье он повторял бы имя самой вкладки,
 * а два одинаковых слова подряд читаются как ошибка вёрстки.
 */
export function Panel({ titleKey, children }: { titleKey?: string; children: ReactNode }) {
  const t = useT()
  return (
    <section className="panel">
      {titleKey && <h2 className="panel__title">{t({ key: titleKey })}</h2>}
      {children}
    </section>
  )
}

/**
 * Факт в верхней полосе: подпись сверху, значение под ней. От `Stat` отличается
 * тем, что стоит в строке, а не в сетке, — полоса собирает десяток фактов о
 * контракте и положении в клубе, и в колонке они переносились по два слова.
 */
export function Fact({ labelKey, value, tone }: { labelKey: string; value: ReactNode; tone?: 'good' | 'bad' }) {
  const t = useT()
  return (
    <div className="fact">
      <span className="fact__k">{t({ key: labelKey })}</span>
      <span className="fact__v" data-tone={tone}>{value}</span>
    </div>
  )
}

export function Empty({ textKey }: { textKey: string }) {
  const t = useT()
  return <p className="panel__empty">{t({ key: textKey })}</p>
}

/**
 * Показатель состояния: название, слово и полоса.
 *
 * Слово вместо числа — сознательно. «Доверие тренера 63» обещает точность,
 * которой у игры нет: за этой цифрой стоит бросок и десяток слагаемых, и
 * читать её как «шестьдесят три из ста» — значит читать шум. Ступень говорит
 * ровно то, что игра действительно знает, и заодно не превращает состояние в
 * счётчик, который хочется оптимизировать. Полоса при этом остаётся: движение
 * внутри ступени видно по ней.
 */
export function Gauge({ labelKey, value }: { labelKey: string; value: number }) {
  const t = useT()
  const level = value < 30 ? 'low' : value < 55 ? 'mid' : 'high'
  return (
    <div className="gauge">
      <div className="gauge__head">
        <span className="gauge__name">{t({ key: labelKey })}</span>
        <span className="gauge__band">{t({ key: `${labelKey}.b${gaugeBand(value)}` })}</span>
      </div>
      <div className="gauge__track">
        <div className="gauge__fill" data-level={level} style={{ width: `${Math.max(2, value)}%` }} />
      </div>
    </div>
  )
}

/**
 * Двусторонний показатель (пресса от −100 до 100) растёт от середины, а не
 * слева: ноль здесь — это «о вас не пишут», а не дно шкалы. Полоса, залитая
 * слева направо, читалась как «мало» и врала про знак.
 */
export function BipolarGauge({ labelKey, value }: { labelKey: string; value: number }) {
  const t = useT()
  const half = Math.min(50, Math.abs(value) / 2)
  const level = value < -25 ? 'low' : value < 10 ? 'mid' : 'high'
  return (
    <div className="gauge">
      <div className="gauge__head">
        <span className="gauge__name">{t({ key: labelKey })}</span>
        <span className="gauge__band">{t({ key: `${labelKey}.b${bipolarBand(value)}` })}</span>
      </div>
      <div className="gauge__track" data-bipolar="true">
        <div
          className="gauge__fill"
          data-level={level}
          style={{ width: `${Math.max(1.5, half)}%`, left: value < 0 ? `${50 - half}%` : '50%' }}
        />
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
