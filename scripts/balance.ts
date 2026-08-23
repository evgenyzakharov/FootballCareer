/**
 * Диагностика баланса: гоняет карьеры со случайными выборами и печатает разброс.
 * Запуск: npx tsx scripts/balance.ts [сколько карьер]
 */
import { ack, careerTotals, choose, newCareer, setIdentity } from '../src/engine/career'
import type { CareerState, Position } from '../src/engine/types'
import { Rng } from '../src/engine/rng'
import { playerOvr } from '../src/engine/player'
import { getClub } from '../src/data/clubs'
import { t } from '../src/i18n'

const POSITIONS: Position[] = ['GK', 'CB', 'LB', 'CDM', 'CM', 'CAM', 'RW', 'ST']
const COUNTRIES = ['ITA', 'ENG', 'BRA', 'RUS', 'ARG', 'FRA', 'JPN', 'SEN']

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
  while (state.phase !== 'retired' && guard < 4000) {
    guard++
    if (state.resolution) {
      state = ack(state)
      continue
    }
    if (!state.card) throw new Error('stuck')
    const options = state.card.options
    state = choose(state, options.length > 0 ? choices.pick(options).id : 'next')
  }
  return state
}

const n = Number(process.argv[2] ?? 60)
const rows: Array<Record<string, number>> = []
let sampleShown = false

for (let i = 0; i < n; i++) {
  const state = play(`bal-${i}`)
  const peak = Math.max(...state.history.map((h) => h.ovrEnd), 0)
  const totals = careerTotals(state)
  rows.push({
    seasons: state.history.length,
    retiredAt: state.retiredAt ?? 0,
    peak,
    clubs: state.clubsPlayed.length,
    apps: totals.apps,
    goals: totals.goals,
    trophies: totals.trophies,
    awards: totals.awards,
    caps: totals.caps,
    money: Math.round(state.player.money / 1_000_000),
    feed: state.feed.length,
  })

  if (!sampleShown && state.history.length >= 12) {
    sampleShown = true
    console.log(`\n=== Пример карьеры (${state.player.lastName}, ${state.player.position}, ${state.player.countryCode}) ===`)
    for (const h of state.history) {
      const club = getClub(h.clubId)
      const trophies = h.trophies.map((x) => t({ key: `comp.${x}` }, 'ru')).join(', ')
      const awards = h.awards.map((x) => t({ key: `award.${x}` }, 'ru')).join(', ')
      console.log(
        `${h.age}  ${club.name.ru.padEnd(24)} OVR ${String(h.ovrEnd).padStart(2)}  ` +
        `${String(h.tally.apps).padStart(2)}и ${String(h.tally.goals).padStart(2)}г ${String(h.tally.assists).padStart(2)}п  ` +
        `${h.loan ? '(аренда) ' : ''}${trophies}${awards ? ' | ' + awards : ''}`,
      )
    }
    console.log('Заголовки:')
    for (const item of state.feed.slice(0, 12)) console.log(`  ${item.age}: ${t(item.text, 'ru')}`)
    console.log(`Черты: ${state.player.traits.map((x) => t({ key: `trait.${x}` }, 'ru')).join(', ') || '—'}`)
  }
}

function stats(key: string) {
  const values = rows.map((r) => r[key]).sort((a, b) => a - b)
  const at = (p: number) => values[Math.min(values.length - 1, Math.floor(values.length * p))]
  const avg = values.reduce((s, v) => s + v, 0) / values.length
  return `min ${values[0]}  p25 ${at(0.25)}  сред ${avg.toFixed(1)}  p75 ${at(0.75)}  max ${values[values.length - 1]}`
}

console.log(`\n=== Разброс по ${n} карьерам ===`)
for (const key of ['seasons', 'retiredAt', 'peak', 'clubs', 'apps', 'goals', 'trophies', 'awards', 'caps', 'money', 'feed']) {
  console.log(`${key.padEnd(10)} ${stats(key)}`)
}
console.log(`\nOVR итоговый у последнего игрока: ${playerOvr(play('bal-0').player)}`)
