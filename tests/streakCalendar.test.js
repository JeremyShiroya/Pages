import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import { buildStreakRuns, calculateStreakStats } from '../composables/useStreak.js'

const root = resolve(process.cwd())
const read = (path) => readFileSync(resolve(root, path), 'utf8')

describe('streak history and calendar', () => {
  const dates = [
    '2026-07-01', '2026-07-02',
    '2026-07-05',
    '2026-08-10', '2026-08-11', '2026-08-12',
    '2026-09-06', '2026-09-07', '2026-09-08',
  ]

  test('groups active dates into consecutive runs', () => {
    expect(buildStreakRuns(dates).map((run) => run.days)).toEqual([2, 1, 3, 3])
  })

  test('derives useful gamification statistics', () => {
    const stats = calculateStreakStats(dates, new Date(2026, 8, 8, 12))
    expect(stats.current).toBe(3)
    expect(stats.longest).toBe(3)
    expect(stats.shortest).toBe(1)
    expect(stats.totalActiveDays).toBe(9)
    expect(stats.totalBreaks).toBe(3)
    expect(stats.previousRuns).toHaveLength(3)
    expect(stats.longestMonth).toMatch(/August|September/)
  })

  test('streak pill opens a dedicated page with no bottom navigation', () => {
    expect(existsSync(resolve(root, 'pages/streak.vue'))).toBe(true)
    const nav = read('components/mobile/MobileTopNav.vue')
    const page = read('components/mobile/StreakCalendarMobile.vue')
    expect(nav).toContain("router.push('/streak')")
    expect(page).toContain('MobileSettingsNav')
    expect(page).not.toContain('MobileBottomNav')
    expect(page).toContain('createStreakImage')
    expect(page).toContain('navigator.share')
  })
})
