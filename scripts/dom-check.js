/**
 * Драйвер для headless-проверки: щёлкает интерфейс от интро до пенсии и
 * складывает отчёт в <pre id="TESTOUT">. Инструменты браузерной панели на этой
 * машине не используются, поэтому проверяем по DOM.
 */
;(function () {
  // Сохранённая карьера из прошлого прогона подняла бы приложение сразу на
  // экран карьеры, и драйвер ждал бы интро, которого нет. Классический скрипт
  // выполняется до отложенного модуля React, поэтому чистим здесь.
  try { localStorage.removeItem('football-career:state') } catch (e) { /* приватный режим */ }

  const errors = []
  window.addEventListener('error', (e) => errors.push('ERROR ' + e.message))
  window.addEventListener('unhandledrejection', (e) => errors.push('REJECTION ' + e.reason))
  const origError = console.error
  console.error = function () {
    errors.push('CONSOLE ' + Array.prototype.join.call(arguments, ' '))
    origError.apply(console, arguments)
  }

  const seenStages = {}
  const seenChannels = {}
  const seenEvents = {}
  let cards = 0
  let clicks = 0
  let phase = 0
  let maxTimelineRows = 0
  let missing = []
  let finalScreen = 'none'
  let mid = null

  function setInput(el, value) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }

  function collectMissing() {
    const text = document.body.innerText || ''
    const found = text.match(/⟨[^⟩]+⟩/g)
    if (found) {
      for (const key of found) if (missing.indexOf(key) === -1) missing.push(key)
    }
  }

  function finish(reason) {
    collectMissing()
    const pre = document.createElement('pre')
    pre.id = 'TESTOUT'
    pre.textContent = JSON.stringify(
      {
        reason,
        finalScreen,
        cards,
        clicks,
        stages: Object.keys(seenStages).sort(),
        channels: Object.keys(seenChannels).sort(),
        distinctEvents: Object.keys(seenEvents).length,
        allTitles: Object.keys(seenEvents),
        maxTimelineRows,
        midSnapshot: mid,
        feedItems: document.querySelectorAll('.feed__item').length,
        trophyChips: document.querySelectorAll('.panel .chip').length,
        bigStats: document.querySelectorAll('.big-stat').length,
        missingKeys: missing,
        errors: errors.slice(0, 10),
      },
      null,
      1,
    )
    document.body.appendChild(pre)
  }

  function tick() {
    collectMissing()
    const timelineRows = document.querySelectorAll('.timeline tbody tr').length
    if (timelineRows > maxTimelineRows) maxTimelineRows = timelineRows

    if (document.querySelector('.retired')) {
      finalScreen = 'retired'
      return finish('reached retirement')
    }
    if (clicks > 1400) return finish('click cap')

    if (phase === 0) {
      const btn = document.querySelector('.intro .primary-btn')
      if (btn) {
        btn.click()
        clicks++
        phase = 1
      }
      return setTimeout(tick, 25)
    }

    if (phase === 1) {
      const name = document.getElementById('lastName')
      if (name) {
        setInput(name, 'ТЕСТОВ')
        // ?pos=GK — прогон за вратаря: у него своя ветка ситуаций.
        var wanted = (location.search.match(/pos=([A-Z]+)/) || [])[1]
        if (wanted) {
          var btns = document.querySelectorAll('.pos-btn')
          for (var i = 0; i < btns.length; i++) {
            if (btns[i].textContent.trim() === wanted) { btns[i].click(); clicks++; break }
          }
        }
        phase = 2
      }
      return setTimeout(tick, 25)
    }

    if (phase === 2) {
      const confirm = document.querySelector('.identity__actions .primary-btn')
      if (confirm && !confirm.disabled) {
        confirm.click()
        clicks++
        phase = 3
      }
      return setTimeout(tick, 25)
    }

    // Основной цикл: карточка → выбор → результат → дальше.
    const card = document.querySelector('.career__center .card')
    if (card) {
      const tags = card.querySelectorAll('.card__tag')
      if (tags.length >= 2) {
        seenStages[tags[0].textContent.trim()] = 1
        seenChannels[tags[1].textContent.trim()] = 1
      }
      const title = card.querySelector('.card__title')
      if (title) seenEvents[title.textContent.trim()] = 1

      if (!mid && cards >= 12) {
        mid = {
          gauges: document.querySelectorAll('.gauge').length,
          attrs: document.querySelectorAll('.attr').length,
          ovr: (document.querySelector('.ovr__value') || {}).textContent,
          club: (document.querySelector('.hud__meta:last-of-type') || {}).textContent,
          kvRows: Array.prototype.map.call(document.querySelectorAll('.career__left .kv'), function (n) { return n.textContent }),
          timelineRows: document.querySelectorAll('.timeline tbody tr').length,
          sampleTitles: Object.keys(seenEvents).slice(0, 6),
          sampleOptions: Array.prototype.map.call(card.querySelectorAll('.option__label'), function (n) { return n.textContent }),
          sampleHints: Array.prototype.map.call(card.querySelectorAll('.option .chip'), function (n) { return n.textContent }),
        }
      }

      const option = card.querySelector('.options .option')
      const next = card.querySelector('.primary-btn')
      if (option) {
        cards++
        option.click()
        clicks++
      } else if (next) {
        next.click()
        clicks++
      }
      return setTimeout(tick, 20)
    }

    return setTimeout(tick, 25)
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(tick, 60)
  else window.addEventListener('DOMContentLoaded', () => setTimeout(tick, 60))
})()
