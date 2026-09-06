import { useCallback, useEffect, useState } from 'react'
import type { CareerState, Currency, Locale, Pace } from './engine/types'
import type { Identity } from './engine/player'
import { newCareer, setIdentity } from './engine/career'
import { clearState, loadCurrency, loadLocale, loadState, saveCurrency, saveLocale, saveState } from './engine/save'
import { t } from './i18n'
import { CurrencyContext, LocaleContext } from './ui/locale'
import { IdentityScreen } from './ui/Identity'
import { HudFacts } from './ui/Hud'
import { SeasonBar } from './ui/Season'
import { SeasonStream } from './ui/SeasonStream'
import { Dossier } from './ui/Dossier'
import { Retired } from './ui/Retired'

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10)
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(loadLocale)
  const [state, setState] = useState<CareerState | null>(loadState)
  const [seed, setSeed] = useState(randomSeed)
  const [currencyPref, setCurrencyPref] = useState<Currency | null>(loadCurrency)
  // Сколько матчей сезона лента ещё держит при себе: шапка считает свою сводку
  // без них, иначе она рассказывала бы про тур раньше самой ленты.
  const [pending, setPending] = useState(0)

  useEffect(() => {
    if (state) saveState(state)
  }, [state])

  useEffect(() => {
    saveLocale(locale)
  }, [locale])

  useEffect(() => {
    saveCurrency(currencyPref)
  }, [currencyPref])

  // По умолчанию россиянин считает деньги в рублях, остальные — в евро; выбор
  // в шапке перекрывает это. Суммы внутри всё те же, меняется только показ.
  const autoCurrency: Currency = state?.player.countryCode === 'RUS' ? 'RUB' : 'EUR'
  const currency: Currency = currencyPref ?? autoCurrency

  const tr = useCallback((key: string) => t({ key }, locale, currency), [locale, currency])

  const reset = useCallback(() => {
    clearState()
    setState(null)
    setSeed(randomSeed())
  }, [])

  const onReset = useCallback(() => {
    if (state && !window.confirm(t({ key: 'app.reset_confirm' }, locale))) return
    reset()
  }, [state, locale, reset])

  // Экран карьеры на десктопе живёт в одном экране и прокручивается колонками,
  // а не страницей. Остальные экраны — обычная лента: интро, выбор игрока и
  // итоги карьеры читаются сверху вниз.
  const careerScreen = state?.phase === 'academy' || state?.phase === 'season'

  return (
    <LocaleContext value={locale}>
      <CurrencyContext value={currency}>
      <div className={careerScreen ? 'app app--fixed' : 'app'}>
        <header className="topbar">
          <span className="topbar__brand">{tr('app.title')}</span>
          <span className="topbar__spacer" />
          {state && (
            <button type="button" className="ghost-btn" onClick={onReset}>
              {tr('app.reset')}
            </button>
          )}
          <button
            type="button"
            className="ghost-btn"
            title={tr('app.currency_hint')}
            onClick={() => setCurrencyPref(currency === 'RUB' ? 'EUR' : 'RUB')}
          >
            {currency === 'RUB' ? '\u20BD' : '\u20AC'}
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => setLocale(locale === 'ru' ? 'en' : 'ru')}
          >
            {tr('app.locale')}
          </button>
        </header>

        {state === null && (
          <div className="intro">
            <div className="intro__inner">
              <h1 className="intro__title">{tr('app.title')}</h1>
              <p className="intro__text">{tr('app.tagline')}</p>
              <div className="intro__actions">
                <button
                  type="button"
                  className="primary-btn"
                  // Год первого сезона приходит из календаря: движку про дату знать нельзя.
                  onClick={() => setState(newCareer(seed, new Date().getFullYear()))}
                >
                  {tr('app.start')}
                </button>
              </div>
            </div>
          </div>
        )}

        {state?.phase === 'identity' && (
          <IdentityScreen
            initialSeed={state.seed}
            onBack={reset}
            onConfirm={(identity: Identity, chosenSeed: string, pace: Pace) =>
              setState(setIdentity({ ...state, seed: chosenSeed, pace }, identity))
            }
          />
        )}

        {state && (state.phase === 'academy' || state.phase === 'season') && (
          <main className="career">
            {/* Всё про «сейчас» — наверху во всю ширину: кто игрок, на каких
                условиях он в клубе и как идёт сезон. Ниже только выбор и
                досье, и обоим достаётся вся высота экрана. */}
            <HudFacts state={state} />
            <SeasonBar state={state} pending={pending} />
            <div className="career__stage">
              {/* Лента живёт один сезон: история за десять лет — забота досье,
                  а держать её всю в разметке значило бы возить с собой тысячу
                  элементов ради последних пяти. Смену сезона отмечаем ключом —
                  React пересобирает ленту сам. */}
              <SeasonStream
                key={state.season ? state.season.age : 'academy'}
                state={state}
                onState={setState}
                onPending={setPending}
              />
            </div>
            <div className="career__dossier">
              <Dossier state={state} />
            </div>
          </main>
        )}

        {state?.phase === 'retired' && <Retired state={state} onRestart={reset} />}

        <p className="footer-note">{tr('app.disclaimer')}</p>
      </div>
      </CurrencyContext>
    </LocaleContext>
  )
}
