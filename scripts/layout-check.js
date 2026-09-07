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
  // Уводили ли экран вниз перед последним замером: проверка возврата к началу
  // имеет смысл только оттуда, куда лента сама игрока не возвращает.
  let scrolledAway = false
  // Сняли ли замер «страницу листают»: он делается один раз, между уходом вниз
  // и вызовом следующего решения.
  let probed = false
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
      // На узком экране блоки складываются в один столбец, и первой должна
      // быть лента, а не рост и зарплата игрока.
      snapshot.stageTop = top('.career__stage')
      snapshot.factsTop = top('.facts')
      snapshot.seasonTop = top('.season')
      snapshot.dossierTop = top('.career__dossier')
      // На узком экране лента уезжает в досье первой вкладкой, а сверху
      // остаётся одна шапка: сезон свёрнут в неё же.
      snapshot.streamInDossier = !!document.querySelector('.career__dossier .career__stage')
      snapshot.seasonMerged = snapshot.seasonTop === null
      snapshot.factsBeforeDossier = snapshot.factsTop !== null && snapshot.dossierTop !== null
        ? snapshot.factsTop < snapshot.dossierTop
        : null
      // Свёрнутая шапка — две строки, а не десяток фактов в столбик: полосу
      // сезона она обязана оставить в первом экране.
      snapshot.factsHeight = (function () {
        const el = document.querySelector('.facts')
        return el ? Math.round(el.getBoundingClientRect().height) : null
      })()
      // Главное требование к ленте: она растёт, и решение живёт в её начале.
      // Порядком блоков это не проверяется — лента может быть первой на
      // странице, а активная запись при этом уехать за край прокрутки. Мерим
      // то, что действительно нужно: видно ли её на самом деле. Координаты
      // здесь от окна, а не от документа, поэтому годятся одинаково и для
      // страницы на телефоне, и для прокрутки колонки на десктопе.
      const live = document.querySelector('.career__stage .stream__item[data-state="live"]')
      const box = live ? live.getBoundingClientRect() : null
      snapshot.liveTop = box ? Math.round(box.top) : null
      snapshot.liveHeight = box ? Math.round(box.height) : null
      // Низ закреплённой стопки: под ним и начинается видимая часть окна.
      // Закреплённое считается по факту, а не по ширине окна: на десктопе
      // ничего не закреплено, и порог там нулевой.
      const tabs = document.querySelector('.dossier .tabs')
      const pinned = tabs && getComputedStyle(tabs).position === 'sticky'
      snapshot.pinBottom = pinned ? Math.round(tabs.getBoundingClientRect().bottom) : 0
      // Начало записи в окне, и видно её не на просвет: строку в сорок
      // пикселей у самого края читать всё равно нельзя. Закреплённая шапка
      // тоже край: приехать ей за спину — это и значит остаться невидимым.
      snapshot.liveVisible = box
        ? box.top >= snapshot.pinBottom - 1 && box.top < window.innerHeight - 40
        : null
      // Вкладка досье показывается одна: если видно сразу несколько панелей,
      // значит переключение сломалось и вернулась стопка на весь экран.
      snapshot.visiblePanes = document.querySelectorAll('.dossier__body:not([hidden])').length
      snapshot.tabs = document.querySelectorAll('.dossier .tab').length
      // Закреплённое остаётся на месте после ухода вниз: замер идёт оттуда,
      // куда драйвер сам увёл экран, — то есть ровно там, где закрепление и
      // проверяется. Верх шапки должен стоять под верхней панелью, а не
      // уехать в минус вместе со страницей.
      const factsBox = document.querySelector('.facts')?.getBoundingClientRect()
      const topbarBox = document.querySelector('.topbar')?.getBoundingClientRect()
      snapshot.factsWindowTop = factsBox ? Math.round(factsBox.top) : null
      snapshot.factsUnderTopbar = factsBox && topbarBox
        ? Math.abs(factsBox.top - topbarBox.bottom) <= 2
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
      // Уходить вниз можно только там, где есть куда: лента живёт один сезон и
      // на его первом ходу состоит из одной карточки. Дождаться шестнадцати
      // ответов мало — они копятся через смены сезонов, а лента после каждой
      // начинается заново, и замер мог попасть ровно на такое начало. Тогда
      // прокрутка не двигалась, шкалы не прятались, и проверка падала не на
      // раскладке, а на том, что её нечем было проверить.
      //
      // Спрашивать запас страницы имеет смысл только там, где прокручивается
      // страница. На широком экране карьера держится в одном окне, и лента
      // листается сама в себе: запаса там нет никогда, и ждать его значило бы
      // не дождаться замера вообще.
      const tabs = document.querySelector('.dossier .tabs')
      const pinned = tabs && getComputedStyle(tabs).position === 'sticky'
      const room = document.documentElement.scrollHeight - window.innerHeight
      // Ждём, пока накопится история: пустой таймлайн ничего не проверяет.
      if (cards >= 16 && (!pinned || room > 600)) {
        // Замерять решение там, где мы его и оставили, бессмысленно: лента
        // растёт вверх, и активная запись видна у начала прокрутки сама по
        // себе — такая проверка проходила бы и со сломанным возвратом к
        // началу. Поэтому сначала уходим вниз, как ушёл бы игрок, севший
        // перечитывать прошлые матчи, и только потом вызываем следующее
        // решение: увидеть его — уже работа ленты, а не случайность.
        if (!scrolledAway) {
          const stage = document.querySelector('.career__stage')
          if (stage) stage.scrollTop = stage.scrollHeight
          window.scrollTo(0, document.body.scrollHeight)
          scrolledAway = true
          // Решение вызываем не здесь, а следующим тиком: обработчик прокрутки
          // срабатывает после самой прокрутки, и шкалы, которые в этот момент
          // должны спрятаться, замерялись бы ещё видимыми.
          return setTimeout(tick, 80)
        }
        if (!probed) {
          probed = true
          // Ушли вниз — шкалы уступили место ленте. Мерить их надо ровно тут:
          // лента, показав решение, вернёт экран наверх, и там они снова все.
          const gauges = document.querySelector('.facts .facts__state')
          report.gaugesWhenScrolled = gauges ? Math.round(gauges.getBoundingClientRect().height) : null
          report.scrollWhenProbed = Math.round(window.scrollY)
          report.roomWhenProbed = Math.round(room)
          const option = card.querySelector('.options .option:not([disabled])')
          const next = card.querySelector('.primary-btn')
          if (option) { option.click() } else if (next) { next.click() }
          return setTimeout(tick, 25)
        }
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
