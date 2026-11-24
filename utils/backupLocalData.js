// Library data that lives in localStorage rather than IndexedDB, and so has to
// be carried by backups explicitly.
//
// Included: things the reader built up or chose (their streak, per-book
// reading analytics, reader display preferences, saved library filters, scan
// folders, server address, one migration flag).
// Left out on purpose: sign-in, backup preferences, update/launch flags, the
// device-import registry (a restore re-matches files by path, see
// useCloudBackup.js), and caches that are tied to one screen (page maps).

export const STREAK_KEY = 'bookish:usage-streak'

const EXACT_KEYS = Object.freeze([
  STREAK_KEY,
  'bookish:mobile-reader-prefs',
  'bookish:scan-folders',
  'bookish:api-base-url',
  'bookish:migration:v3-series-status',
])

const PREFIX_KEYS = Object.freeze([
  'bookish:book-analytics:',
  'bookish:filters:',
])

export function isBackedUpLocalKey(key) {
  return EXACT_KEYS.includes(key) || PREFIX_KEYS.some((prefix) => String(key).startsWith(prefix))
}

export function collectLocalData(storage = globalThis.localStorage) {
  const out = {}
  if (!storage) return out
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key && isBackedUpLocalKey(key)) out[key] = storage.getItem(key)
  }
  return out
}

// ── Streak ───────────────────────────────────────────────────────────────────

const DATE = /^\d{4}-\d{2}-\d{2}$/
const cleanDates = (dates) => [...new Set((Array.isArray(dates) ? dates : []).filter((value) => DATE.test(String(value))))].sort()

function shiftDateKey(dateKey, delta) {
  const [year, month, day] = String(dateKey || '').split('-').map(Number)
  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day + delta, 12)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Streaks saved before per-day history only stored a count and an end date.
function activeDatesOf(state) {
  if (Array.isArray(state?.activeDates) && state.activeDates.length) return cleanDates(state.activeDates)
  const count = Math.max(0, Number(state?.count) || 0)
  if (!state?.lastUsedDate || !count) return []
  return cleanDates(Array.from({ length: count }, (_, index) => shiftDateKey(state.lastUsedDate, index - count + 1)))
}

const uniqueBy = (items) => {
  const seen = new Set()
  return items.filter((item) => {
    const key = JSON.stringify(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Combines two streak records so that no day, shield or milestone from either
 * is lost. The app recomputes the running count from the dates on next open.
 */
export function mergeStreakStates(local, incoming) {
  if (!incoming || typeof incoming !== 'object') return local || null
  if (!local || typeof local !== 'object') return incoming
  const activeDates = cleanDates([...activeDatesOf(local), ...activeDatesOf(incoming)])
  const shieldedDates = cleanDates([...(local.shieldedDates || []), ...(incoming.shieldedDates || [])])
  const lastUsedDate = [local.lastUsedDate, incoming.lastUsedDate].filter((value) => DATE.test(String(value))).sort().at(-1)
    || activeDates.at(-1)
    || null
  return {
    ...incoming,
    ...local,
    count: Math.max(Number(local.count) || 0, Number(incoming.count) || 0, 1),
    lastUsedDate,
    activeDates,
    shieldedDates,
    shields: Math.max(Number(local.shields) || 0, Number(incoming.shields) || 0),
    shieldGrants: uniqueBy([...(incoming.shieldGrants || []), ...(local.shieldGrants || [])]).slice(-40),
    celebrated: [...new Set([...(incoming.celebrated || []), ...(local.celebrated || [])])].slice(-60),
    lastShieldUsed: local.lastShieldUsed || incoming.lastShieldUsed || null,
  }
}

function parse(value) {
  try { return JSON.parse(value) } catch { return null }
}

/**
 * Writes backed-up local data back. The streak is merged with whatever this
 * device already has instead of replacing it, so a restore never erases days.
 */
export function restoreLocalData(data, storage = globalThis.localStorage) {
  if (!storage || !data || typeof data !== 'object') return
  for (const [key, value] of Object.entries(data)) {
    if (!isBackedUpLocalKey(key) || value === null || value === undefined) continue
    try {
      if (key === STREAK_KEY) {
        const merged = mergeStreakStates(parse(storage.getItem(key)), parse(value))
        if (merged) storage.setItem(key, JSON.stringify(merged))
      } else {
        storage.setItem(key, value)
      }
    } catch {}
  }
}
