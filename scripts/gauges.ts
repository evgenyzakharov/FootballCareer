/**
 * Диагностика показателей: гоняет карьеры со случайными выборами и печатает,
 * какими форма, свежесть, настрой и доверие видны игроку по ходу сезона —
 * в разбивке по роли в клубе.
 * Запуск: npx tsx scripts/gauges.ts [сколько карьер]
 *
 * Замер снимается в момент отчёта о туре, а не после межсезонья: межсезонье
 * стягивает форму и настрой к норме, и снятые после него числа говорят про
 * силу этого притяжения, а не про то, что стояло в шапке весь сезон.
 */
import { ack, choose, newCareer, setIdentity } from '../src/engine/career'
import type { CareerState, Position, Role } from '../src/engine/types'
import { Rng } from '../src/engine/rng'

const POSITIONS: Position[] = ['GK', 'CB', 'LB', 'CDM', 'CM', 'CAM', 'RW', 'ST']
const COUNTRIES = ['ITA', 'ENG', 'BRA', 'RUS', 'ARG', 'FRA', 'JPN', 'SEN']

interface Sample {
  role: Role
  apps: number
  rating: number
  /** Доля побед минус доля поражений в сыгранных матчах сезона: −1…1. */
  results: number
  form: number
  fitness: number
  morale: number
  trust: number
  fans: number
  locker: number
  /** Сдвиг настроя за этот тур; null — первый тур сезона. */
  moraleStep: number | null
}

const samples: Sample[] = []

function play(seed: string): CareerState {
  const rng = new Rng(seed, 'setup', 0)
  let state = setIdentity(newCareer(seed), {
    lastName: 'IGROK',
    shirt: rng.int(1, 30),
    foot: rng.chance(0.25) ? 'left' : 'right',
    countryCode: rng.pick(COUNTRIES),
    position: rng.pick(POSITIONS),
  })
  const choices = new Rng(seed, 'choices', 0)
  let guard = 0
  // Настрой на прошлом туре того же сезона: по нему считается шаг за тур.
  let prev: { age: number; morale: number } | null = null
  while (state.phase !== 'retired' && guard < 4000) {
    guard++
    if (state.card?.eventKey === 'block_report' && state.season) {
      const tally = state.season.tally
      const played = state.season.matches.filter((m) => m.minutes > 0)
      const won = played.filter((m) => (m.teamGoals ?? 0) > (m.teamConceded ?? 0)).length
      const lost = played.filter((m) => (m.teamGoals ?? 0) < (m.teamConceded ?? 0)).length
      samples.push({
        role: state.season.role,
        apps: tally.apps,
        rating: tally.ratingCount > 0 ? tally.ratingSum / tally.ratingCount : 0,
        results: played.length > 0 ? (won - lost) / played.length : 0,
        form: state.player.gauges.form,
        fitness: state.player.gauges.fitness,
        morale: state.player.gauges.morale,
        trust: state.player.gauges.coachTrust,
        fans: state.player.gauges.fanLove,
        locker: state.player.gauges.lockerRoom,
        moraleStep: prev && prev.age === state.season.age
          ? state.player.gauges.morale - prev.morale
          : null,
      })
      prev = { age: state.season.age, morale: state.player.gauges.morale }
    }
    if (state.resolution) {
      state = ack(state)
      continue
    }
    if (!state.card) throw new Error('stuck')
    const options = state.card.options.filter((o) => !o.disabled)
    state = choose(state, options.length > 0 ? choices.pick(options).id : 'next')
  }
  return state
}

const n = Number(process.argv[2] ?? 60)
for (let i = 0; i < n; i++) play(`gauge-${i}`)

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const col = (x: number) => x.toFixed(1).padStart(7)

const ROLES: Role[] = ['star', 'starter', 'rotation', 'bench', 'reserve']
console.log(`карьер: ${n}, замеров: ${samples.length}`)
console.log('роль          n   матчи  оценка   форма свежесть настрой доверие трибуны раздев.')
for (const role of ROLES) {
  const rows = samples.filter((s) => s.role === role)
  if (rows.length === 0) continue
  const played = rows.filter((r) => r.apps > 0)
  console.log(
    role.padEnd(9),
    String(rows.length).padStart(5),
    col(mean(rows.map((r) => r.apps))),
    col(mean(played.map((r) => r.rating))),
    col(mean(rows.map((r) => r.form))),
    col(mean(rows.map((r) => r.fitness))),
    col(mean(rows.map((r) => r.morale))),
    col(mean(rows.map((r) => r.trust))),
    col(mean(rows.map((r) => r.fans))),
    col(mean(rows.map((r) => r.locker))),
  )
}

/** Форма по тому, сколько игрок за сезон наиграл: главная проверка простоя. */
const bands: Array<[string, (s: Sample) => boolean]> = [
  ['почти не играл (<10)', (s) => s.apps < 10],
  ['играет через раз (10–24)', (s) => s.apps >= 10 && s.apps < 25],
  ['играет постоянно (25+)', (s) => s.apps >= 25],
]
console.log('')
for (const [label, fits] of bands) {
  const rows = samples.filter(fits)
  console.log(`${label.padEnd(26)} n=${String(rows.length).padStart(6)}  форма ${mean(rows.map((s) => s.form)).toFixed(1)}`)
}

/** Настрой по тому, как идут дела у команды: победы минус поражения на матч. */
const moods: Array<[string, (s: Sample) => boolean]> = [
  ['команда проигрывает', (s) => s.apps > 0 && s.results < -0.15],
  ['команда идёт ровно', (s) => s.apps > 0 && s.results >= -0.15 && s.results <= 0.15],
  ['команда выигрывает', (s) => s.apps > 0 && s.results > 0.15],
]
console.log('')
for (const [label, fits] of moods) {
  const rows = samples.filter(fits)
  const steps = rows.map((s) => s.moraleStep).filter((x): x is number => x !== null)
  // Уровень копится годами и меряет всю карьеру разом; шаг за тур показывает,
  // куда настрой едет прямо сейчас, — и именно он отвечает на вопрос
  // «падает ли настрой от поражений».
  console.log(
    `${label.padEnd(26)} n=${String(rows.length).padStart(6)}  настрой ${mean(rows.map((s) => s.morale)).toFixed(1)}` +
    `  шаг за тур ${mean(steps) >= 0 ? '+' : ''}${mean(steps).toFixed(2)}` +
    `  (оценка ${mean(rows.map((s) => s.rating)).toFixed(2)})`,
  )
}
