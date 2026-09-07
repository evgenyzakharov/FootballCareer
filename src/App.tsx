import { useCallback, useEffect, useState } from 'react'
import type { CareerState, Currency, Locale, Pace } from './engine/types'
import type { Identity } from './engine/player'
import { newCareer, setIdentity } from './engine/career'
import { clearState, loadCurrency, loadLocale, loadRaw, loadState, saveCurrency, saveLocale, saveRaw, saveState } from './engine/save'
import { t } from './i18n'
import { CurrencyContext, LocaleContext, RawContext } from './ui/locale'
import { IdentityScreen } from './ui/Identity'
import { HudFacts } from './ui/Hud'
import { SeasonBar } from './ui/Season'
import { SeasonStream } from './ui/SeasonStream'
import { Dossier } from './ui/Dossier'
import { Retired } from './ui/Retired'
import { useCompactWhenScrolled, useIsPhone, usePinnedStack } from './ui/media'

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
  // Режим проверки: величины показываются числами вместо слов. Включается
  // через `?raw=1` и переключается с клавиатуры — кнопки для включения нет,
  // игроку он не нужен и попадаться на глаза не должен.
  const [raw, setRaw] = useState(loadRaw)
  // На телефоне лента едет во вкладку досье, а шапка и полоса сезона
  // сворачиваются: три длинных блока подряд в один столбец не помещаются.
  const phone = useIsPhone()

  useEffect(() => {
    saveRaw(raw)
  }, [raw])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !e.altKey || e.key.toLowerCase() !== 'r') return
      // В поле ввода сочетание не перехватываем: имя игрока набирают там же.
      const el = document.activeElement
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return
      e.preventDefault()
      setRaw((on) => !on)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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

  // Шапка и ряд вкладок закрепляются у верхнего края, а высоты для их
  // раскладки CSS вывести не может — их меряют здесь. Уйдя вниз по ленте,
  // шапка ужимается: закреплённой ей столько места не положено.
  usePinnedStack(phone && careerScreen)
  useCompactWhenScrolled(phone && careerScreen)

  const stream = state && (
    <SeasonStream
      key={state.season ? state.season.age : 'academy'}
      state={state}
      onState={setState}
      onPending={setPending}
    />
  )

  return (
    <LocaleContext value={locale}>
      <CurrencyContext value={currency}>
      <RawContext value={raw}>
      <div className={careerScreen ? 'app app--fixed' : 'app'}>
        <header className="topbar">
          <span className="topbar__brand">{tr('app.title')}</span>
          {/* Признак режима проверки. Он же кнопка выключения: перепутать
              такой экран с настоящей игрой нельзя, и выйти из него надо уметь
              не вспоминая сочетание клавиш. */}
          {raw && (
            <button type="button" className="raw-flag" onClick={() => setRaw(false)}>
              {tr('app.raw')}
            </button>
          )}
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
            <HudFacts state={state} pending={pending} />
            {/* На телефоне полоса сезона свернулась в строку этой же шапки:
                двумя блоками подряд она повторяла бы её клуб. */}
            {!phone && <SeasonBar state={state} pending={pending} />}
            {/* Лента живёт один сезон: история за десять лет — забота досье,
                а держать её всю в разметке значило бы возить с собой тысячу
                элементов ради последних пяти. Смену сезона отмечаем ключом —
                React пересобирает ленту сам.

                На широком экране лента — колонка рядом с досье. На телефоне
                колонок нет, и два длинных блока подряд означали бы, что до
                истории карьеры надо пролистать весь сезон; там лента въезжает
                в досье первой вкладкой. Обёртка `career__stage` едет с ней:
                по ней ленту находят и стили, и проверки раскладки. */}
            {!phone && <div className="career__stage">{stream}</div>}
            <div className="career__dossier">
              <Dossier
                state={state}
                onState={setState}
                lead={
                  phone
                    ? { id: 'now', titleKey: 'tab.now', body: <div className="career__stage">{stream}</div> }
                    : undefined
                }
              />
            </div>
          </main>
        )}

        {state?.phase === 'retired' && <Retired state={state} onRestart={reset} />}

        <p className="footer-note">{tr('app.disclaimer')}</p>
      </div>
      </RawContext>
      </CurrencyContext>
    </LocaleContext>
  )
}
