import { useCallback, useEffect, useState } from 'react'
import type { CareerState, Currency, Locale } from './engine/types'
import type { Identity } from './engine/player'
import { ack, choose, newCareer, setIdentity } from './engine/career'
import { clearState, loadCurrency, loadLocale, loadState, saveCurrency, saveLocale, saveState } from './engine/save'
import { t } from './i18n'
import { CurrencyContext, LocaleContext } from './ui/locale'
import { IdentityScreen } from './ui/Identity'
import { Hud, HudSkills } from './ui/Hud'
import { CardView, ResolutionView } from './ui/CardView'
import { Timeline } from './ui/Timeline'
import { Sidebar } from './ui/Sidebar'
import { Retired } from './ui/Retired'

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10)
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(loadLocale)
  const [state, setState] = useState<CareerState | null>(loadState)
  const [seed, setSeed] = useState(randomSeed)
  const [currencyPref, setCurrencyPref] = useState<Currency | null>(loadCurrency)

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

  return (
    <LocaleContext value={locale}>
      <CurrencyContext value={currency}>
      <div className="app">
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
            onConfirm={(identity: Identity, chosenSeed: string) =>
              setState(setIdentity({ ...state, seed: chosenSeed }, identity))
            }
          />
        )}

        {state && (state.phase === 'academy' || state.phase === 'season') && (
          <main className="career">
            <div className="career__left">
              <Hud state={state} />
            </div>
            <div className="career__center">
              <div className="career__skills">
                <HudSkills state={state} />
              </div>
              {state.resolution ? (
                <ResolutionView resolution={state.resolution} onNext={() => setState(ack(state))} />
              ) : state.card ? (
                <CardView card={state.card} onChoose={(optionId) => setState(choose(state, optionId))} />
              ) : null}
            </div>
            <div className="career__right">
              <Timeline state={state} />
              <Sidebar state={state} />
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
