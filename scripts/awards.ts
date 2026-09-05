/**
 * Замер наград по амплуа: сколько и каких наград набирает карьера на каждой
 * позиции и из чего складывается величина сезона, от которой они считаются.
 * Запуск: npx tsx scripts/awards.ts [сколько карьер на позицию]
 *
 * Нужен затем, чтобы разговор про перекос наград опирался на свежие числа:
 * прошлые снимались до перехода на туры и симуляцию по матчам.
 */
import { ack, choose, newCareer, setIdentity } from '../src/engine/career'
import type { CareerState, CurrentSeason, Position, SeasonRecord } from '../src/engine/types'
import { AWARD_KEYS, seasonScore } from '../src/engine/awards'
import { averageRating } from '../src/engine/performance'
import { findClub } from '../src/data/clubs'
import { Rng } from '../src/engine/rng'

const POSITIONS: Position[] = ['GK', 'CB', 'LB', 'CDM', 'CM', 'CAM', 'RW', 'ST']
const COUNTRIES = ['ITA', 'ENG', 'BRA', 'RUS', 'ARG', 'FRA', 'JPN', 'SEN']

function play(seed: string, position: Position): CareerState {
  const rng = new Rng(seed, 'setup', 0)
  let state = setIdentity(newCareer(seed), {
    lastName: 'IGROK',
    shirt: rng.int(1, 30),
    foot: rng.chance(0.25) ? 'left' : 'right',
    countryCode: rng.pick(COUNTRIES),
    position,
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
    const options = state.card.options.filter((o) => !o.disabled)
    state = choose(state, options.length > 0 ? choices.pick(options).id : 'next')
  }
  return state
}

/** Сезон из истории в том виде, в каком его читает `seasonScore`. */
function asSeason(h: SeasonRecord): CurrentSeason {
  return {
    age: h.age,
    clubId: h.clubId,
    loan: h.loan,
    parentClubId: h.parentClubId,
    ovrStart: h.ovrStart,
    role: h.role,
    tally: h.tally,
    national: h.national,
    trophies: h.trophies,
    awards: h.awards,
    oddsMult: {},
    roundsPlayed: 0,
    matches: [],
    minutesMult: 1,
  }
}

const n = Number(process.argv[2] ?? 120)
const header = [
  'амплуа', 'наград', ...AWARD_KEYS, 'сезонов', 'с наградой', 'величина', 'оценка', 'г+п', 'сухие', 'пик',
]
const rows: string[][] = []

for (const position of POSITIONS) {
  const byKey: Record<string, number> = {}
  let awards = 0
  let seasons = 0
  let seasonsWithAward = 0
  let score = 0
  let ratingSum = 0
  let ratingCount = 0
  let contributions = 0
  let cleanSheets = 0
  let peak = 0

  for (let i = 0; i < n; i++) {
    const state = play(`aw-${i}`, position)
    awards += state.awards.length
    for (const a of state.awards) byKey[a.key] = (byKey[a.key] ?? 0) + 1
    peak += Math.max(...state.history.map((h) => h.ovrEnd), 0)
    for (const h of state.history) {
      const club = findClub(h.clubId)
      // Сезон без клуба в величине не участвует: там нечего оценивать.
      if (!club) continue
      seasons++
      if (h.awards.length > 0) seasonsWithAward++
      score += seasonScore(asSeason(h), club)
      ratingSum += h.tally.ratingSum
      ratingCount += h.tally.ratingCount
      contributions += h.tally.goals + h.tally.assists
      cleanSheets += h.tally.cleanSheets
    }
  }

  rows.push([
    position,
    (awards / n).toFixed(2),
    ...AWARD_KEYS.map((key) => ((byKey[key] ?? 0) / n).toFixed(2)),
    (seasons / n).toFixed(1),
    `${Math.round((seasonsWithAward / seasons) * 100)}%`,
    (score / seasons).toFixed(1),
    averageRating(ratingSum, ratingCount).toFixed(2),
    (contributions / seasons).toFixed(1),
    (cleanSheets / seasons).toFixed(1),
    (peak / n).toFixed(1),
  ])
}

const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)))
const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i])).join('  ')

console.log(`\n=== Награды по амплуа, ${n} карьер на позицию ===`)
console.log(line(header))
for (const row of rows) console.log(line(row))
console.log('\nСтолбцы наград — среднее за карьеру. «величина» — seasonScore за сезон с клубом.')
