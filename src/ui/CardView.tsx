import type { Card, Text } from '../engine/types'
import { useT } from './locale'

/**
 * Итог выбора. В ленте он остаётся под своей карточкой навсегда, поэтому
 * кнопки у него нет: лента едет дальше сама, а прочитать «что вышло» можно и
 * потом — текст никуда не денется.
 */
export function ResolutionView({ text }: { text: Text }) {
  const t = useT()
  return (
    <div className="card resolution">
      <div className="resolution__label">{t({ key: 'card.result' })}</div>
      <p className="resolution__text">{t(text)}</p>
    </div>
  )
}

/**
 * Карточка события.
 *
 * В ленте карточка живёт дважды: сначала как решение, потом как прошедшее.
 * Прошедшая теряет кнопки и вместо них показывает, что игрок тогда выбрал, —
 * иначе лента превратилась бы в поле из мёртвых кнопок, по которым непонятно,
 * нажимал ты их или нет.
 */
export function CardView({
  card,
  interactive,
  chosen,
  onChoose,
}: {
  card: Card
  interactive: boolean
  chosen?: Text | null
  onChoose: (optionId: string) => void
}) {
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

      {!interactive ? (
        chosen ? (
          <div className="card__chosen">
            <span className="card__chosen-label">{t({ key: 'card.chosen' })}</span>
            <span className="card__chosen-text">{t(chosen)}</span>
          </div>
        ) : null
      ) : card.kind === 'report' ? (
        <button type="button" className="primary-btn" onClick={() => onChoose('next')}>
          {t({ key: 'card.next' })}
        </button>
      ) : (
        <div className="options">
          {card.options.map((option) => (
            // Подсказки об эффектах игроку не показываем: выбор должен
            // делаться по ситуации, а не по подписи под кнопкой.
            <button
              key={option.id}
              type="button"
              className="option"
              disabled={option.disabled}
              onClick={() => onChoose(option.id)}
            >
              <div className="option__label">{t(option.label)}</div>
              {option.disabled && <div className="option__note">{t({ key: 'card.no_money' })}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
