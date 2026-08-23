import type { Content } from './types'
import { VOCAB } from './content/vocab'
import { UI } from './content/ui'
import { EVENTS_A } from './content/events-a'
import { EVENTS_B } from './content/events-b'
import { EVENTS_C } from './content/events-c'
import { EVENTS_GK } from './content/events-gk'

export const CONTENT: Content = {
  ...VOCAB,
  ...UI,
  ...EVENTS_A,
  ...EVENTS_B,
  ...EVENTS_C,
  ...EVENTS_GK,
}
