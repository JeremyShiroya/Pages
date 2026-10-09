import { beforeEach, describe, expect, it, vi } from 'vitest'
import { bookStreak, calendarDaysBetween, readBookAnalytics, recordBookActivity } from './useBookAnalytics'

const values = new Map()
beforeEach(() => {
  values.clear()
  vi.stubGlobal('localStorage', {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  })
})

describe('book analytics', () => {
  it('keeps read and listened time separate and counts adjacent page turns only', () => {
    recordBookActivity('book-a', { mode: 'read', seconds: 12, page: 1, chapter: 1 })
    recordBookActivity('book-a', { mode: 'listened', seconds: 8, page: 2, chapter: 2 })
    recordBookActivity('book-a', { page: 20, chapter: 9 })
    const result = readBookAnalytics('book-a')
    const day = Object.values(result.days)[0]
    expect(day).toMatchObject({ read: 12, listened: 8 })
    expect(result.pagesAdvanced).toBe(1)
    expect(result.chaptersAdvanced).toBe(1)
  })

  it('uses calendar days and lets a streak continue from yesterday', () => {
    const days = {
      '2026-10-03': { read: 10 },
      '2026-10-04': { listened: 10 },
    }
    expect(bookStreak(days, new Date(2026, 9, 5))).toBe(2)
    expect(calendarDaysBetween('2026-10-03T22:00:00', '2026-10-05T08:00:00')).toBe(3)
  })
})
