import type { Card, Resolution } from '../engine/types'
import { Chip } from './bits'
import { useT } from './locale'

export function ResolutionView({ resolution, onNext }: { resolution: Resolution; onNext: () => void }) {
  const t = useT()
  return (
    <div className="card resolution">
      <div className="resolution__label">{t({ key: 'card.result' })}</div>
      <p className="resolution__text">{t(resolution.text)}</p>
      <button type="button" className="primary-btn" onClick={onNext}>
        {t({ key: 'card.next' })}
      </button>
    </div>
  )
}

export function CardView({ card, onChoose }: { card: Card; onChoose: (optionId: string) => void }) {
  const t = useT()
  return (
    <div className="card">
      <div className="card__head">
        <span className="card__tag">{t({ key: `stage.${card.stage}` })}</span>
        <span className="card__tag">{t({ key: `channel.${card.channel}` })}</span>
      </div>
      <h2 className="card__title">{t(card.title)}</h2>
      <p className="card__body">{t(card.body)}</p>

      {card.details && card.details.length > 0 && (
        <ul className="card__details">
          {card.details.map((line, i) => (
            <li key={`${line.key}-${i}`}>{t(line)}</li>
          ))}
        </ul>
      )}

      {card.kind === 'report' ? (
        <button type="button" className="primary-btn" onClick={() => onChoose('next')}>
          {t({ key: 'card.next' })}
        </button>
      ) : (
        <div className="options">
          {card.options.map((option) => (
            <button key={option.id} type="button" className="option" onClick={() => onChoose(option.id)}>
              <div className="option__label">{t(option.label)}</div>
              {option.hints.length > 0 && (
                <div className="option__hints">
                  {option.hints.map((hint, i) => (
                    <Chip key={`${hint.text.key}-${i}`} tone={hint.tone}>{t(hint.text)}</Chip>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
