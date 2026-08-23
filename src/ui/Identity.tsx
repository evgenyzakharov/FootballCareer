import { useMemo, useState } from 'react'
import type { Foot, Position } from '../engine/types'
import type { Identity } from '../engine/player'
import { COUNTRIES } from '../data/countries'
import { useLocale, useT } from './locale'

/** Раскладка позиций на схеме поля: сверху атака, снизу вратарь. */
const ROWS: Position[][] = [
  ['LW', 'ST', 'RW'],
  ['CAM'],
  ['LM', 'CM', 'RM'],
  ['CDM'],
  ['LB', 'CB', 'RB'],
  ['GK'],
]

interface Props {
  onConfirm: (identity: Identity, seed: string) => void
  onBack: () => void
  initialSeed: string
}

export function IdentityScreen({ onConfirm, onBack, initialSeed }: Props) {
  const t = useT()
  const locale = useLocale()
  const [lastName, setLastName] = useState('')
  const [shirt, setShirt] = useState('10')
  const [foot, setFoot] = useState<Foot>('right')
  const [country, setCountry] = useState('ITA')
  const [position, setPosition] = useState<Position>('CAM')
  const [query, setQuery] = useState('')
  const [seed, setSeed] = useState(initialSeed)

  const countries = useMemo(() => {
    const sorted = [...COUNTRIES].sort((a, b) => a.name[locale].localeCompare(b.name[locale], locale))
    const needle = query.trim().toLowerCase()
    if (!needle) return sorted
    return sorted.filter((c) => c.name[locale].toLowerCase().includes(needle) || c.code.toLowerCase().includes(needle))
  }, [locale, query])

  const shirtNumber = Math.min(99, Math.max(1, Number(shirt) || 10))
  const trimmed = lastName.trim()

  return (
    <div className="identity">
      <div className="identity__head">
        <h1>{t({ key: 'identity.title' })}</h1>
        <p>{t({ key: 'identity.subtitle' })}</p>
      </div>

      <div className="identity__grid">
        <div>
          <div className="shirt">
            <div className="shirt__name">{trimmed || t({ key: 'identity.lastName_placeholder' })}</div>
            <div className="shirt__number">{shirtNumber}</div>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="lastName">{t({ key: 'identity.lastName' })}</label>
            <input
              id="lastName"
              className="text-input"
              value={lastName}
              maxLength={16}
              placeholder={t({ key: 'identity.lastName_placeholder' })}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="shirt">{t({ key: 'identity.number' })}</label>
            <input
              id="shirt"
              className="text-input"
              value={shirt}
              inputMode="numeric"
              onChange={(e) => setShirt(e.target.value.replace(/\D/g, '').slice(0, 2))}
            />
          </div>

          <div className="field">
            <span className="field__label">{t({ key: 'identity.foot' })}</span>
            <div className="seg">
              <button type="button" data-on={foot === 'left'} onClick={() => setFoot('left')}>
                {t({ key: 'identity.foot_left' })}
              </button>
              <button type="button" data-on={foot === 'right'} onClick={() => setFoot('right')}>
                {t({ key: 'identity.foot_right' })}
              </button>
            </div>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="seed">{t({ key: 'identity.seed' })}</label>
            <input id="seed" className="text-input" value={seed} onChange={(e) => setSeed(e.target.value)} />
            <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: '6px 0 0' }}>
              {t({ key: 'identity.seed_hint' })}
            </p>
          </div>
        </div>

        <div>
          <div className="field">
            <label className="field__label" htmlFor="country">{t({ key: 'identity.nationality' })}</label>
            <input
              id="country"
              className="text-input"
              value={query}
              placeholder={t({ key: 'identity.search' })}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="country-list">
            {countries.map((c) => (
              <button key={c.code} type="button" data-on={country === c.code} onClick={() => setCountry(c.code)}>
                {c.name[locale]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="field__label">{t({ key: 'identity.position' })}</span>
          <div className="pitch">
            {ROWS.map((row, i) => (
              <div className="pitch__row" key={i}>
                {row.map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    className="pos-btn"
                    data-on={position === pos}
                    title={t({ key: `pos.${pos}` })}
                    onClick={() => setPosition(pos)}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="identity__actions">
        <button type="button" className="ghost-btn" onClick={onBack}>
          {t({ key: 'app.reset' })}
        </button>
        <button
          type="button"
          className="primary-btn"
          disabled={trimmed.length === 0 || seed.trim().length === 0}
          onClick={() =>
            onConfirm(
              { lastName: trimmed, shirt: shirtNumber, foot, countryCode: country, position },
              seed.trim(),
            )
          }
        >
          {t({ key: 'identity.confirm' })}
        </button>
      </div>
    </div>
  )
}
