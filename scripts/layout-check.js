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
      if (r.height === 0) continue
      min = Math.min(min, Math.round(r.height))
      if (r.height < 44) {
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
      overflowing: overflowing(),
      tap: tapTargets(),
      innerScrollers: scrollers(),
    }
    if (name === 'career') {
      const cols = ['.career__left', '.career__center', '.career__right']
      snapshot.order = cols
        .map(function (sel) {
          const el = document.querySelector(sel)
          if (!el) return null
          const r = el.getBoundingClientRect()
          return { sel: sel, top: Math.round(r.top + window.scrollY), height: Math.round(r.height) }
        })
        .filter(Boolean)
        .sort(function (a, b) { return a.top - b.top })
        .map(function (x) { return x.sel + '@' + x.top })
      const card = document.querySelector('.career__center .card')
      snapshot.cardTop = card ? Math.round(card.getBoundingClientRect().top + window.scrollY) : null
      const hud = document.querySelector('.career__left .panel')
      snapshot.hudTop = hud ? Math.round(hud.getBoundingClientRect().top + window.scrollY) : null
      snapshot.cardBeforeHud = snapshot.cardTop !== null && snapshot.hudTop !== null
        ? snapshot.cardTop < snapshot.hudTop
        : null
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
      hasCenter: !!document.querySelector('.career__center'),
      hasCard: !!document.querySelector('.career__center .card'),
      hasIntro: !!document.querySelector('.intro .primary-btn'),
      hasName: !!document.getElementById('lastName'),
      done: !!document.getElementById('LAYOUTOUT'),
    }
    if (++ticks > 900) {
      if (document.querySelector('.career__center')) measure('career')
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

    const card = document.querySelector('.career__center .card')
    if (card) {
      // Ждём, пока накопится история: пустой таймлайн ничего не проверяет.
      if (cards >= 16) {
        measure('career')
        return finish()
      }
      const option = card.querySelector('.options .option')
      const next = card.querySelector('.primary-btn')
      if (option) { cards++; option.click() } else if (next) { next.click() }
      return setTimeout(tick, 20)
    }
    return setTimeout(tick, 25)
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(tick, 60)
  else window.addEventListener('DOMContentLoaded', function () { setTimeout(tick, 60) })
})()
