/**
 * Аудит раскладки в headless-браузере. Скриншоты в этой сборке Edge не
 * создаются, поэтому раскладку проверяем числами: переполнение по горизонтали,
 * порядок блоков сверху вниз, размеры кнопок под палец.
 *
 * Отчёт складывается в <pre id="LAYOUTOUT">.
 */
;(function () {
  // Сохранённая карьера из прошлого прогона подняла бы приложение сразу на
  // экран карьеры, и драйвер ждал бы интро, которого нет. Классический скрипт
  // выполняется до отложенного модуля React, поэтому чистим здесь.
  try { localStorage.removeItem('football-career:state') } catch (e) { /* приватный режим */ }

  const errors = []
  window.addEventListener('error', (e) => errors.push('ERROR ' + e.message))

  let phase = 0
  let cards = 0
  let ticks = 0
  const report = { width: 0, cards: 0, ticks: 0, screens: {}, errors }

  function setInput(el, value) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }

  /** Элементы, вылезшие за правый край окна: главный симптом сломанной раскладки. */
  function overflowing() {
    const out = []
    const all = document.querySelectorAll('body *')
    for (let i = 0; i < all.length; i++) {
      const el = all[i]
      const r = el.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) continue
      if (r.right > window.innerWidth + 1 || r.left < -1) {
        out.push((el.className || el.tagName) + ' → ' + Math.round(r.left) + '..' + Math.round(r.right))
      }
    }
    return out.slice(0, 8)
  }

  /** Интерактивные элементы меньше 44px по высоте неудобно нажимать пальцем. */
  function tapTargets() {
    const small = []
    let min = 999
    const all = document.querySelectorAll('button, input')
    for (let i = 0; i < all.length; i++) {
      const r = all[i].getBoundingClientRect()
      if (r.height === 0 || r.width === 0) continue
      // Меряем меньшую сторону: кнопка 36x44 под палец не годится, а проверка
      // по одной высоте такую пропускала.
      const side = Math.min(r.width, r.height)
      min = Math.min(min, Math.round(side))
      if (side < 44) {
        small.push((all[i].className || all[i].tagName) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height))
      }
    }
    return { min: min === 999 ? null : min, under44: small.length, examples: small.slice(0, 6) }
  }

  function scrollers() {
    const out = []
    const names = ['.timeline', '.feed', '.country-list', '.card__details', '.attr-grid', '.stat-row']
    for (const sel of names) {
      const el = document.querySelector(sel)
      if (!el) continue
      if (el.scrollWidth > el.clientWidth + 1) {
        out.push(sel + ' scrollWidth ' + el.scrollWidth + ' > clientWidth ' + el.clientWidth)
      }
    }
    return out
  }

  function measure(name) {
    const doc = document.documentElement
    const snapshot = {
      pageScrollWidth: doc.scrollWidth,
      horizontalOverflow: doc.scrollWidth > window.innerWidth + 1,
      pageScrollHeight: doc.scrollHeight,
      // На широком экране карьера обязана помещаться в окно целиком: длинное
      // прокручивают колонки, а не страница.
      verticalOverflow: doc.scrollHeight > window.innerHeight + 1,
      overflowing: overflowing(),
      tap: tapTargets(),
      innerScrollers: scrollers(),
    }
    if (name === 'career') {
      const blocks = ['.facts', '.season', '.career__stage', '.career__dossier']
      const top = function (sel) {
        const el = document.querySelector(sel)
        return el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : null
      }
      snapshot.order = blocks
        .map(function (sel) { return { sel: sel, top: top(sel) } })
        .filter(function (x) { return x.top !== null })
        .sort(function (a, b) { return a.top - b.top })
        .map(function (x) { return x.sel + '@' + x.top })
      const card = document.querySelector('.career__stage .card')
      snapshot.cardTop = card ? Math.round(card.getBoundingClientRect().top + window.scrollY) : null
      // На узком экране блоки складываются в один столбец, и первым должно
      // быть то, что игрок сейчас выбирает, а не его рост и зарплата.
      snapshot.factsTop = top('.facts')
      snapshot.seasonTop = top('.season')
      snapshot.dossierTop = top('.career__dossier')
      snapshot.cardBeforeFacts = snapshot.cardTop !== null && snapshot.factsTop !== null
        ? snapshot.cardTop < snapshot.factsTop
        : null
      snapshot.cardBeforeSeason = snapshot.cardTop !== null && snapshot.seasonTop !== null
        ? snapshot.cardTop < snapshot.seasonTop
        : null
      // Вкладка досье показывается одна: если видно сразу несколько панелей,
      // значит переключение сломалось и вернулась стопка на весь экран.
      snapshot.visiblePanes = document.querySelectorAll('.dossier__body:not([hidden])').length
      snapshot.tabs = document.querySelectorAll('.dossier .tab').length
    }
    report.screens[name] = snapshot
  }

  function finish() {
    report.width = window.innerWidth
    report.cards = cards
    report.ticks = ticks
    const pre = document.createElement('pre')
    pre.id = 'LAYOUTOUT'
    pre.textContent = JSON.stringify(report, null, 1)
    document.body.appendChild(pre)
  }

  function tick() {
    // Дедлайн по числу тиков, а не по фазе: на экране карьеры фаза не растёт.
    window.__layoutDebug = {
      phase: phase,
      cards: cards,
      ticks: ticks,
      hasStage: !!document.querySelector('.career__stage'),
      hasCard: !!document.querySelector('.career__stage .card'),
      hasIntro: !!document.querySelector('.intro .primary-btn'),
      hasName: !!document.getElementById('lastName'),
      done: !!document.getElementById('LAYOUTOUT'),
    }
    if (++ticks > 900) {
      if (document.querySelector('.career__stage')) measure('career')
      return finish()
    }
    if (phase === 0) {
      const btn = document.querySelector('.intro .primary-btn')
      if (btn) { btn.click(); phase = 1 }
      return setTimeout(tick, 25)
    }
    if (phase === 1) {
      const name = document.getElementById('lastName')
      if (name) { setInput(name, 'ТЕСТОВСКИЙ'); phase = 2 }
      return setTimeout(tick, 25)
    }
    if (phase === 2) {
      // Замеряем экран идентичности: на телефоне он открывается первым.
      measure('identity')
      const confirm = document.querySelector('.identity__actions .primary-btn')
      if (confirm && !confirm.disabled) { confirm.click(); phase = 3 }
      return setTimeout(tick, 25)
    }

    const card = document.querySelector('.career__stage .stream__item[data-state="live"] .card:not(.resolution)')
    if (card) {
      // Ждём, пока накопится история: пустой таймлайн ничего не проверяет.
      if (cards >= 16) {
        measure('career')
        return finish()
      }
      const option = card.querySelector('.options .option:not([disabled])')
      const next = card.querySelector('.primary-btn')
      if (option) { cards++; option.click() } else if (next) { next.click() }
      return setTimeout(tick, 20)
    }
    return setTimeout(tick, 25)
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(tick, 60)
  else window.addEventListener('DOMContentLoaded', function () { setTimeout(tick, 60) })
})()
