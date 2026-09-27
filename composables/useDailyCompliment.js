import { ref } from 'vue'

export const DAILY_COMPLIMENT_STORAGE_KEY = 'bookish:daily-compliment'
export const DAILY_COMPLIMENT_POOL_VERSION = 1
export const DAILY_COMPLIMENT_RECENCY_DAYS = 60

const COMPLIMENT_OPENINGS = Object.freeze([
  'You are {quality}.',
  'You seem especially {quality} today.',
  'The way you move through the world is {quality}.',
  'Your presence feels {quality}.',
  'Your energy is {quality}.',
  'Your spirit is {quality}.',
  'Your outlook is {quality}.',
  'Your kindness is {quality}.',
  'Your imagination is {quality}.',
  'Your authenticity is {quality}.',
  'Your determination is {quality}.',
  'Your perspective is {quality}.',
  'Your confidence is {quality}.',
  'Your warmth is {quality}.',
  'Your curiosity is {quality}.',
  'Your resilience is {quality}.',
  'Your creativity is {quality}.',
  'Your thoughtfulness is {quality}.',
  'Your courage is {quality}.',
  'Your glow is {quality}.',
  'Something about you is wonderfully {quality}.',
  'Today, your whole vibe is {quality}.',
  'The care you bring is {quality}.',
  'The person you are becoming is {quality}.',
  'The way you keep growing is {quality}.',
])

const COMPLIMENT_QUALITIES = Object.freeze([
  'amazing', 'admirable', 'awesome', 'beautiful', 'breathtaking',
  'brilliant', 'captivating', 'compelling', 'dazzling', 'delightful',
  'encouraging', 'energizing', 'exceptional', 'extraordinary', 'fantastic',
  'genuine', 'graceful', 'heartening', 'impressive', 'inspiring',
  'lovely', 'luminous', 'magnetic', 'magnificent', 'marvelous',
  'meaningful', 'phenomenal', 'powerful', 'radiant', 'refreshing',
  'remarkable', 'reassuring', 'splendid', 'stellar', 'striking',
  'stunning', 'superb', 'uplifting', 'unforgettable', 'vibrant',
])

// Twenty-five gender-neutral sentence shapes × forty qualities = exactly one
// thousand unique compliments. Generating the pool keeps it auditable and much
// smaller than a hand-maintained thousand-line data file.
export const DAILY_COMPLIMENTS = Object.freeze(
  COMPLIMENT_OPENINGS.flatMap((opening) => (
    COMPLIMENT_QUALITIES.map((quality) => opening.replace('{quality}', quality))
  )),
)

const dateKeyFor = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const daysBetween = (newer, older) => {
  const newerTime = Date.parse(`${newer}T00:00:00Z`)
  const olderTime = Date.parse(`${older}T00:00:00Z`)
  if (!Number.isFinite(newerTime) || !Number.isFinite(olderTime)) return Number.POSITIVE_INFINITY
  return Math.floor((newerTime - olderTime) / 86_400_000)
}

const shuffled = (values, random = Math.random) => {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

const allIds = () => DAILY_COMPLIMENTS.map((_, index) => index)

const isValidOrder = (order) => (
  Array.isArray(order)
  && order.length === DAILY_COMPLIMENTS.length
  && new Set(order).size === DAILY_COMPLIMENTS.length
  && order.every((id) => Number.isInteger(id) && id >= 0 && id < DAILY_COMPLIMENTS.length)
)

const cycleOrder = (history, today, random) => {
  const recent = new Set(
    (history || [])
      .filter((entry) => daysBetween(today, entry.date) >= 0 && daysBetween(today, entry.date) < DAILY_COMPLIMENT_RECENCY_DAYS)
      .map((entry) => entry.id),
  )
  const eligible = allIds().filter((id) => !recent.has(id))
  const deferred = allIds().filter((id) => recent.has(id))
  // Recently seen messages are still part of the new 1,000-day cycle, but they
  // sit at its tail, guaranteeing far more than a two-month gap.
  return [...shuffled(eligible, random), ...shuffled(deferred, random)]
}

const readState = (storage) => {
  try {
    return JSON.parse(storage?.getItem(DAILY_COMPLIMENT_STORAGE_KEY) || 'null')
  } catch {
    return null
  }
}

const writeState = (storage, state) => {
  try {
    storage?.setItem(DAILY_COMPLIMENT_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // A compliment should never make the Profile page fail when storage is full
    // or unavailable; the in-memory result remains usable for this visit.
  }
}

export function getDailyCompliment({ storage, now = new Date(), random = Math.random } = {}) {
  const today = dateKeyFor(now)
  const saved = readState(storage)
  const state = saved?.version === DAILY_COMPLIMENT_POOL_VERSION ? saved : null

  if (
    state?.lastDate
    && state.lastDate >= today
    && Number.isInteger(state.currentId)
    && DAILY_COMPLIMENTS[state.currentId]
  ) {
    return { compliment: DAILY_COMPLIMENTS[state.currentId], state }
  }

  const history = Array.isArray(state?.history) ? state.history.slice(-DAILY_COMPLIMENTS.length) : []
  let order = isValidOrder(state?.order) ? state.order : cycleOrder(history, today, random)
  let position = Number.isInteger(state?.position) ? state.position : 0
  let cycle = Number.isInteger(state?.cycle) ? state.cycle : 0

  if (position >= DAILY_COMPLIMENTS.length) {
    cycle += 1
    order = cycleOrder(history, today, random)
    position = 0
  }

  const currentId = order[position]
  position += 1
  const nextState = {
    version: DAILY_COMPLIMENT_POOL_VERSION,
    cycle,
    order,
    position,
    currentId,
    lastDate: today,
    seenIds: order.slice(0, position),
    history: [...history, { id: currentId, date: today }].slice(-DAILY_COMPLIMENTS.length),
  }
  writeState(storage, nextState)
  return { compliment: DAILY_COMPLIMENTS[currentId], state: nextState }
}

export function useDailyCompliment() {
  const compliment = ref(DAILY_COMPLIMENTS[0])

  const loadDailyCompliment = () => {
    const storage = typeof localStorage === 'undefined' ? null : localStorage
    compliment.value = getDailyCompliment({ storage }).compliment
    return compliment.value
  }

  return { compliment, loadDailyCompliment }
}
