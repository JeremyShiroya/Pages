import { describe, expect, it } from 'vitest'
import { collectLocalData, mergeStreakStates, restoreLocalData, STREAK_KEY } from './backupLocalData'

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    get length() { return map.size },
    key: (index) => [...map.keys()][index] ?? null,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    dump: () => Object.fromEntries(map),
  }
}

const streak = {
  count: 12,
  lastUsedDate: '2026-11-20',
  activeDates: ['2026-11-09', '2026-11-10', '2026-11-20'],
  shieldedDates: ['2026-11-15'],
  shields: 2,
  shieldGrants: ['2026-11-09:7'],
  celebrated: ['2026-11-09:7'],
  lastShieldUsed: '2026-11-15',
}

describe('backupLocalData', () => {
  it('collects the streak, per-book analytics and reader prefs, not caches or sign-in', () => {
    const storage = memoryStorage({
      [STREAK_KEY]: JSON.stringify(streak),
      'bookish:book-analytics:v1:book-1': '{"seconds":3600}',
      'bookish:mobile-reader-prefs': '{"fontSize":18}',
      'bookish:filters:books': '{"status":"reading"}',
      'bookish:auth': 'secret-session',
      'bookish:cloud-backup': '{}',
      'bookish:page-map:abc': 'cache',
      'bookish:device-imports': '{}',
    })
    const data = collectLocalData(storage)
    expect(Object.keys(data).sort()).toEqual([
      'bookish:book-analytics:v1:book-1',
      'bookish:filters:books',
      'bookish:mobile-reader-prefs',
      STREAK_KEY,
    ])
  })

  it('restores the streak exactly onto a fresh install', () => {
    const storage = memoryStorage()
    restoreLocalData({ [STREAK_KEY]: JSON.stringify(streak) }, storage)
    const restored = JSON.parse(storage.getItem(STREAK_KEY))
    expect(restored.activeDates).toEqual(streak.activeDates)
    expect(restored.shieldedDates).toEqual(streak.shieldedDates)
    expect(restored.shields).toBe(2)
    expect(restored.celebrated).toEqual(streak.celebrated)
  })

  it('never erases days the device already has', () => {
    const today = { count: 1, lastUsedDate: '2026-11-24', activeDates: ['2026-11-24'], shieldedDates: [], shields: 0 }
    const storage = memoryStorage({ [STREAK_KEY]: JSON.stringify(today) })
    restoreLocalData({ [STREAK_KEY]: JSON.stringify(streak) }, storage)
    const merged = JSON.parse(storage.getItem(STREAK_KEY))
    expect(merged.activeDates).toEqual(['2026-11-09', '2026-11-10', '2026-11-20', '2026-11-24'])
    expect(merged.lastUsedDate).toBe('2026-11-24')
    expect(merged.shields).toBe(2)
    expect(merged.lastShieldUsed).toBe('2026-11-15')
  })

  it('expands an old count-only streak into its days', () => {
    const merged = mergeStreakStates(null, { count: 3, lastUsedDate: '2026-11-03' })
    expect(merged.count).toBe(3)
    const fromLegacy = mergeStreakStates({ activeDates: ['2026-11-05'] }, { count: 3, lastUsedDate: '2026-11-03' })
    expect(fromLegacy.activeDates).toEqual(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-05'])
  })

  it('ignores keys it does not own', () => {
    const storage = memoryStorage()
    restoreLocalData({ 'bookish:auth': 'x', 'other:key': 'y' }, storage)
    expect(storage.dump()).toEqual({})
  })
})
