import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import {
  applyStreakShield,
  calculateStreakStats,
  grantStreakShields,
  milestoneProgress,
  nextMilestoneFor,
} from '../composables/useStreak.js'
import { longestBookStreak, readBookAnalytics, recordBookActivity } from '../composables/useBookAnalytics.js'
import {
  DEFAULT_MOBILE_READER_PREFS,
  normalizeMobileReaderPrefs,
  readerPrefsLayoutHash,
} from '../composables/useMobileReaderPrefs.js'

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('series suggestions are stored on the device and open like books', () => {
  const suggestions = read('composables/useSeriesSuggestions.js')

  test('stored details never expire for display and a page open does not refetch', () => {
    const raw = suggestions.slice(suggestions.indexOf('const readCacheRaw'), suggestions.indexOf('const writeCache'))
    expect(raw).not.toContain('CACHE_TTL_MS')
    expect(suggestions).toContain('preferStored')
    expect(read('components/mobile/SeriesDetailMobile.vue')).toContain('{ preferStored: true }')
  })

  test('covers are copied to the device and user edits win over the roster', () => {
    expect(suggestions).toContain('export const localizeSuggestionCovers')
    expect(suggestions).toContain('if (current?.userEdited) continue')
    expect(suggestions).toContain('export const saveSuggestionEdits')
  })

  test('a suggestion card opens a detail page with Edit Details instead of Listen/Read', () => {
    expect(read('components/shared/LibraryBookCard.vue')).toContain("if (!props.selectable) emit('open', props.book)")
    expect(existsSync(resolve(process.cwd(), 'pages/suggestion/[series]/[installment]/index.vue'))).toBe(true)
    expect(existsSync(resolve(process.cwd(), 'pages/suggestion/[series]/[installment]/edit.vue'))).toBe(true)
    const detail = read('components/mobile/BookDetailMobile.vue')
    expect(detail).toContain('Edit Details')
    expect(detail).toContain('Not in your library')
    const edit = read('components/mobile/EditBookMobile.vue')
    expect(edit).toContain('v-if="!isSuggestion" class="form-row"')
  })
})

describe('listen mode progress label', () => {
  test('defaults to the listened format', () => {
    expect(read('components/mobile/ReaderMobile.vue')).toContain('const listenSummaryMode = ref("listened")')
  })
})

describe('streak milestones', () => {
  test('progress toward the next milestone', () => {
    const progress = milestoneProgress(5, 5)
    expect(progress.next.days).toBe(7)
    expect(progress.previous.days).toBe(3)
    expect(progress.remaining).toBe(2)
    expect(progress.percent).toBe(50)
    expect(progress.isPersonalBest).toBe(true)
    expect(progress.badges.filter((badge) => badge.unlocked).map((badge) => badge.days)).toEqual([3])
  })

  test('the ladder keeps going past a year', () => {
    expect(nextMilestoneFor(365).days).toBe(400)
    expect(nextMilestoneFor(420).days).toBe(500)
    expect(milestoneProgress(420, 420).percent).toBe(20)
  })

  test('a held shield covers exactly one missed day', () => {
    const covered = applyStreakShield({ activeDates: ['2026-11-20', '2026-11-21'], shieldedDates: [], shields: 1 }, '2026-11-23')
    expect(covered).toMatchObject({ shields: 0, used: '2026-11-22', shieldedDates: ['2026-11-22'] })
    const tooLate = applyStreakShield({ activeDates: ['2026-11-20'], shieldedDates: [], shields: 2 }, '2026-11-23')
    expect(tooLate.used).toBe(null)
    const stats = calculateStreakStats(['2026-11-20', '2026-11-21', '2026-11-23'], new Date(2026, 10, 23, 12), { shieldedDates: ['2026-11-22'] })
    expect(stats.current).toBe(4)
    expect(stats.totalActiveDays).toBe(3)
  })

  test('shields are granted once per milestone per streak, capped', () => {
    const first = grantStreakShields({ runStart: '2026-11-01', current: 7, shields: 0, granted: [] })
    expect(first.shields).toBe(1)
    const again = grantStreakShields({ runStart: '2026-11-01', current: 8, shields: 1, granted: first.granted })
    expect(again.shields).toBe(1)
    const capped = grantStreakShields({ runStart: '2026-12-01', current: 400, shields: 3, granted: [] })
    expect(capped.shields).toBe(3)
  })
})

describe('book analytics', () => {
  const values = new Map()
  beforeEach(() => {
    values.clear()
    vi.stubGlobal('localStorage', {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    })
  })

  test('a page turn across a chapter boundary counts', () => {
    recordBookActivity('b', { page: '0:4' })
    recordBookActivity('b', { page: '1:0' })
    recordBookActivity('b', { page: '3:0' })
    expect(readBookAnalytics('b').pagesAdvanced).toBe(1)
  })

  test('longest book streak', () => {
    expect(longestBookStreak({
      '2026-11-01': { read: 5 }, '2026-11-02': { read: 5 }, '2026-11-03': { listened: 5 },
      '2026-11-05': { read: 5 }, '2026-11-06': { read: 0, listened: 0 },
    })).toBe(3)
  })

  test('a finished book stops counting days at its last activity', () => {
    const page = read('pages/analytics/[id].vue')
    expect(page).toContain("activity.value?.completedAt || (completed.value ? activity.value?.lastAt : null)")
  })
})

describe('reading settings sheet', () => {
  test('the separate page is gone and the reader opens a draggable sheet', () => {
    expect(existsSync(resolve(process.cwd(), 'pages/read-settings/[id].vue'))).toBe(false)
    const reader = read('components/mobile/ReaderMobile.vue')
    expect(reader).toContain('aria-label="Reading settings"')
    expect(reader).toContain('<ReaderDisplaySheet')
    const sheet = read('components/mobile/ReaderDisplaySheet.vue')
    expect(sheet).toContain('onHandleMove')
    // Sliders are the custom ReaderSlider, and text sliders commit on release
    // (re-laying-out the book on every drag step was the jitter).
    expect(sheet).toContain('<ReaderSlider')
    expect(sheet).toContain('@change="commit(\'fontSize\', $event)"')
    // Highlight colours are reachable from the reader too.
    expect(sheet).toContain("updateSettings({ highlightColor: 'accent' })")
    const slider = read('components/mobile/ReaderSlider.vue')
    expect(slider).toContain('setPointerCapture')
    expect(slider).toContain('requestAnimationFrame(report)')
  })

  test('new layout prefs are clamped and only change the layout hash when used', () => {
    expect(normalizeMobileReaderPrefs({ pageMargin: 99, letterSpacing: 13, brightness: 5 }))
      .toMatchObject({ pageMargin: 40, letterSpacing: 15, brightness: 35 })
    const base = readerPrefsLayoutHash(DEFAULT_MOBILE_READER_PREFS)
    expect(base).toBe('17|serif|400|1.62|justify')
    expect(readerPrefsLayoutHash({ ...DEFAULT_MOBILE_READER_PREFS, brightness: 50 })).toBe(base)
    expect(readerPrefsLayoutHash({ ...DEFAULT_MOBILE_READER_PREFS, pageMargin: 30 })).not.toBe(base)
  })
})
