/**
 * Сквозная проверка интерфейса в headless-браузере, пригодная для CI.
 *
 * Сама поднимает статику из dist, сама запускает браузер, сама проверяет отчёты
 * драйверов и падает с ненулевым кодом, если что-то не так. Ничего лишнего не
 * требует: ни Playwright, ни питона — только Node и любой Chromium.
 *
 * Запуск:  npm run build && node scripts/browser-check.mjs
 * Браузер: BROWSER_BIN=/path/to/chrome (по умолчанию ищется по платформе)
 */
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { tmpdir } from 'node:os'

const DIST = 'dist'
const PORT = Number(process.env.CHECK_PORT ?? 8951)
const DEBUG_PORT = Number(process.env.CHECK_DEBUG_PORT ?? 9333)

const CANDIDATES = process.platform === 'win32'
  ? [
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
    ]
  : ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/microsoft-edge']

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const failures = []

function findBrowser() {
  const fromEnv = process.env.BROWSER_BIN
  if (fromEnv) {
    if (!existsSync(fromEnv)) throw new Error(`BROWSER_BIN не найден: ${fromEnv}`)
    return fromEnv
  }
  const found = CANDIDATES.find((p) => existsSync(p))
  if (!found) throw new Error(`браузер не найден, пробовал: ${CANDIDATES.join(', ')}`)
  return found
}

/**
 * Статика из dist плюс две страницы с внедрёнными драйверами. Драйверы лежат в
 * scripts/, а не в dist, чтобы не попадать в сборку.
 */
function startServer() {
  const indexHtml = readFileSync(join(DIST, 'index.html'), 'utf8')
  const injected = (driver) =>
    indexHtml.replace('</body>', `<script src="/__driver/${driver}"></script></body>`)

  const server = createServer((req, res) => {
    const url = (req.url ?? '/').split('?')[0]
    if (url === '/dom.html') {
      res.writeHead(200, { 'content-type': MIME['.html'] }).end(injected('dom-check.js'))
      return
    }
    if (url === '/layout.html') {
      res.writeHead(200, { 'content-type': MIME['.html'] }).end(injected('layout-check.js'))
      return
    }
    if (url.startsWith('/__driver/')) {
      const name = url.slice('/__driver/'.length)
      if (name !== 'dom-check.js' && name !== 'layout-check.js') {
        res.writeHead(404).end()
        return
      }
      res.writeHead(200, { 'content-type': MIME['.js'] }).end(readFileSync(join('scripts', name)))
      return
    }
    const file = join(DIST, normalize(url === '/' ? 'index.html' : url).replace(/^(\.\.[/\\])+/, ''))
    if (!existsSync(file)) {
      res.writeHead(404).end()
      return
    }
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
    res.end(readFileSync(file))
  })
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)))
}

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl)
  const pending = new Map()
  let id = 0
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', () => reject(new Error('не удалось открыть WebSocket к браузеру')), { once: true })
  })
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data)
    const entry = pending.get(msg.id)
    if (!entry) return
    pending.delete(msg.id)
    if (msg.error) entry.reject(new Error(msg.error.message))
    else entry.resolve(msg.result)
  })
  return {
    send: (method, params = {}) =>
      new Promise((resolve, reject) => {
        const mid = ++id
        pending.set(mid, { resolve, reject })
        ws.send(JSON.stringify({ id: mid, method, params }))
      }),
    close: () => ws.close(),
  }
}

/** Прогоняет одну страницу в заданном вьюпорте и возвращает отчёт драйвера. */
async function run({ path, width, height, touch, waitMs }) {
  const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`, { method: 'PUT' })
  if (!res.ok) throw new Error(`/json/new: ${res.status}`)
  const target = await res.json()
  const cdp = await connect(target.webSocketDebuggerUrl)
  try {
    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')
    await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: touch })
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: touch, maxTouchPoints: touch ? 5 : 1 })
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}${path}` })

    // Опрашиваем, а не спим фиксированно: на медленном раннере отчёт приходит позже.
    const deadline = Date.now() + waitMs
    let report = null
    while (Date.now() < deadline) {
      await sleep(500)
      const probe = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const el = document.getElementById('LAYOUTOUT') || document.getElementById('TESTOUT')
          return el ? el.textContent : ''
        })()`,
        returnByValue: true,
      })
      if (probe.result.value) {
        report = JSON.parse(probe.result.value)
        break
      }
    }
    if (!report) throw new Error(`отчёт не появился за ${waitMs} мс`)
    return report
  } finally {
    cdp.close()
    await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/close/${target.id}`).catch(() => {})
  }
}

function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok   ${name}`)
  } else {
    console.log(`  FAIL ${name}: ${detail}`)
    failures.push(`${name}: ${detail}`)
  }
}

const server = await startServer()
const profile = mkdtempSync(join(tmpdir(), 'fc-browser-'))
const browser = spawn(findBrowser(), [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--no-first-run',
  '--disable-dev-shm-usage',
  `--remote-debugging-port=${DEBUG_PORT}`,
  `--user-data-dir=${profile}`,
  'about:blank',
], { stdio: 'ignore' })

try {
  // Ждём, пока браузер поднимет отладочный порт.
  let ready = false
  for (let i = 0; i < 40 && !ready; i++) {
    await sleep(500)
    ready = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`).then((r) => r.ok).catch(() => false)
  }
  if (!ready) throw new Error('браузер не открыл отладочный порт')

  console.log('Сквозной прогон карьеры (полевой игрок)')
  const field = await run({ path: '/dom.html', width: 1440, height: 900, touch: false, waitMs: 120_000 })
  check('карьера доходит до пенсии', field.reason === 'reached retirement', field.reason)
  check('карточек больше сотни', field.cards > 100, `${field.cards}`)
  check('нет ключей без перевода', field.missingKeys.length === 0, field.missingKeys.join(', '))
  check('нет ошибок консоли', field.errors.length === 0, field.errors.join(' | '))

  console.log('Сквозной прогон карьеры (вратарь)')
  const gk = await run({ path: '/dom.html?pos=GK', width: 1440, height: 900, touch: false, waitMs: 120_000 })
  check('карьера доходит до пенсии', gk.reason === 'reached retirement', gk.reason)
  check('нет ключей без перевода', gk.missingKeys.length === 0, gk.missingKeys.join(', '))
  check('нет ошибок консоли', gk.errors.length === 0, gk.errors.join(' | '))

  for (const [name, width, height, touch] of [['телефон', 375, 812, true], ['планшет', 768, 1024, true], ['десктоп', 1440, 900, false]]) {
    console.log(`Раскладка: ${name} ${width}×${height}`)
    const report = await run({ path: '/layout.html', width, height, touch, waitMs: 90_000 })
    for (const screen of ['identity', 'career']) {
      const sc = report.screens[screen]
      if (!sc) {
        check(`${screen}: замер получен`, false, 'экран не измерен')
        continue
      }
      check(`${screen}: нет переполнения по горизонтали`, !sc.horizontalOverflow, `scrollWidth ${sc.pageScrollWidth} > ${width}`)
      check(`${screen}: ничего не вылезает за край`, sc.overflowing.length === 0, sc.overflowing.join(', '))
      check(`${screen}: списки не переполнены`, sc.innerScrollers.length === 0, sc.innerScrollers.join(', '))
      // Размер под палец требуем только там, где ввод сенсорный.
      if (touch) check(`${screen}: кнопки не меньше 44px`, sc.tap.under44 === 0, `${sc.tap.under44} шт., минимум ${sc.tap.min}px`)
    }
    // На широком экране карьера помещается в окно целиком: прокручиваются
    // колонки, а не страница.
    if (width > 1200) {
      const career = report.screens.career
      check(
        'карьера помещается в один экран',
        career?.verticalOverflow === false,
        `scrollHeight ${career?.pageScrollHeight} > ${height}`,
      )
    }
    // Когда колонки складываются в одну, решение должно быть первым на экране.
    if (width <= 860) {
      check('карточка решения выше панели игрока', report.screens.career?.cardBeforeHud === true, `card@${report.screens.career?.cardTop} hud@${report.screens.career?.hudTop}`)
      check('карточка решения выше навыков', report.screens.career?.cardBeforeSkills === true, `card@${report.screens.career?.cardTop} skills@${report.screens.career?.skillsTop}`)
    }
  }
} finally {
  browser.kill()
  server.close()
  // Профиль убираем не сразу: на Windows браузер ещё держит папку, и падение
  // на уборке мусора не должно ронять сам прогон.
  await sleep(1000)
  try {
    rmSync(profile, { recursive: true, force: true })
  } catch {
    console.log(`(временный профиль остался: ${profile})`)
  }
}

if (failures.length > 0) {
  console.error(`\nПровалено проверок: ${failures.length}`)
  for (const f of failures) console.error(`  · ${f}`)
  process.exit(1)
}
console.log('\nВсе браузерные проверки прошли.')
