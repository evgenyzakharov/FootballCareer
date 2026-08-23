/**
 * Управление headless-браузером по DevTools-протоколу без сторонних библиотек.
 *
 * Нужен потому, что --window-size у местной сборки Edge не соблюдается (просили
 * 375, получили 492), а мобильную раскладку без точного вьюпорта не проверить.
 * CDP задаёт вьюпорт ровно и умеет скриншот, которого нет у --screenshot.
 *
 * Запуск (браузер уже поднят с --remote-debugging-port=9222):
 *   node scripts/cdp.mjs <url> <width> <height> [out.png] [waitMs] [mobile]
 *
 * Печатает содержимое <pre id="LAYOUTOUT"> или <pre id="TESTOUT">, если он есть.
 */
import { writeFileSync } from 'node:fs'

const [url, widthArg, heightArg, outPng, waitArg, mobileArg] = process.argv.slice(2)
if (!url) {
  console.error('usage: node scripts/cdp.mjs <url> <width> <height> [out.png] [waitMs] [mobile]')
  process.exit(1)
}
const width = Number(widthArg ?? 375)
const height = Number(heightArg ?? 812)
const waitMs = Number(waitArg ?? 12000)
const PORT = process.env.CDP_PORT ?? '9222'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function openTarget() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })
  if (!res.ok) throw new Error(`/json/new: ${res.status} ${await res.text()}`)
  return res.json()
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    const pending = new Map()
    let id = 0
    ws.addEventListener('open', () => resolve({ send, close: () => ws.close() }))
    ws.addEventListener('error', (e) => reject(new Error(`ws error: ${e.message ?? e.type}`)))
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data)
      const entry = pending.get(msg.id)
      if (!entry) return
      pending.delete(msg.id)
      if (msg.error) entry.reject(new Error(`${msg.error.message} (${JSON.stringify(msg.error.data ?? '')})`))
      else entry.resolve(msg.result)
    })
    function send(method, params = {}) {
      const messageId = ++id
      return new Promise((res, rej) => {
        pending.set(messageId, { resolve: res, reject: rej })
        ws.send(JSON.stringify({ id: messageId, method, params }))
      })
    }
  })
}

const target = await openTarget()
const cdp = await connect(target.webSocketDebuggerUrl)

try {
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  // Точный вьюпорт: mobile:true включает мобильные метрики, как на телефоне.
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 2,
    mobile: mobileArg ? mobileArg === 'true' : width < 768,
  })
  // Без этого media (pointer: coarse) не срабатывает: метрики вьюпорта сами
  // по себе не делают устройство сенсорным.
  const touch = mobileArg ? mobileArg === 'true' : width < 768
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: touch, maxTouchPoints: touch ? 5 : 1 })
  await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: touch, configuration: 'mobile' }).catch(() => {})
  await cdp.send('Page.navigate', { url })
  await sleep(waitMs)

  const probe = `(() => {
    const el = document.getElementById('LAYOUTOUT') || document.getElementById('TESTOUT')
    return JSON.stringify({ found: !!el, innerWidth: window.innerWidth, text: el ? el.textContent : null })
  })()`
  const evaluated = await cdp.send('Runtime.evaluate', { expression: probe, returnByValue: true })
  const parsed = JSON.parse(evaluated.result.value)

  if (outPng) {
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    writeFileSync(outPng, Buffer.from(shot.data, 'base64'))
    console.error(`screenshot → ${outPng}`)
  }

  if (!parsed.found) {
    console.error(`отчёт не найден, innerWidth=${parsed.innerWidth}`)
    process.exitCode = 2
  } else {
    console.log(parsed.text)
  }
} finally {
  cdp.close()
  await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`).catch(() => {})
}
