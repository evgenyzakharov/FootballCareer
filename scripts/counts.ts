import { ALL_EVENTS } from '../src/engine/events'
import { CONTENT } from '../src/i18n/content'
import { CLUBS } from '../src/data/clubs'
import { LEAGUES } from '../src/data/leagues'
import { COUNTRIES } from '../src/data/countries'

const byChannel: Record<string, number> = {}
let random = 0
for (const e of ALL_EVENTS) {
  byChannel[e.channel] = (byChannel[e.channel] ?? 0) + 1
  if (e.weight > 0) random++
}
console.log('событий всего:', ALL_EVENTS.length)
console.log('в лотерее:', random, '| по сценарию:', ALL_EVENTS.length - random)
console.log('одноразовых:', ALL_EVENTS.filter((e) => e.once).length)
console.log('по каналам:', JSON.stringify(byChannel, null, 0))
console.log('ключей i18n:', Object.keys(CONTENT).length)
console.log('клубов:', CLUBS.length, '| лиг:', LEAGUES.length, '| стран:', COUNTRIES.length)
