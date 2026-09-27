import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import {
  DAILY_COMPLIMENTS,
  DAILY_COMPLIMENT_STORAGE_KEY,
  getDailyCompliment,
} from '../composables/useDailyCompliment'

const root = resolve(process.cwd())
const read = (path) => readFileSync(resolve(root, path), 'utf8')

const memoryStorage = () => {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
}

const seededRandom = () => {
  let seed = 0x1a2b3c4d
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 2 ** 32
  }
}

const day = (offset) => new Date(2026, 0, 1 + offset, 12)

describe('profile favourites preferences and daily compliments', () => {
  test('provides exactly 1,000 unique gender-neutral compliments', () => {
    expect(DAILY_COMPLIMENTS).toHaveLength(1000)
    expect(new Set(DAILY_COMPLIMENTS).size).toBe(1000)
    expect(DAILY_COMPLIMENTS.join(' ')).not.toMatch(/\b(?:he|she|him|her|his|hers|man|woman|boy|girl)\b/i)
  })

  test('keeps one compliment per day and exhausts a cycle without repeats', () => {
    const storage = memoryStorage()
    const random = seededRandom()
    const first = getDailyCompliment({ storage, now: day(0), random }).compliment
    expect(getDailyCompliment({ storage, now: day(0), random }).compliment).toBe(first)

    const cycle = [first]
    for (let offset = 1; offset < 1000; offset += 1) {
      cycle.push(getDailyCompliment({ storage, now: day(offset), random }).compliment)
    }
    expect(new Set(cycle).size).toBe(1000)
  })

  test('starts the next cycle outside the previous 60 days', () => {
    const storage = memoryStorage()
    const random = seededRandom()
    const cycle = []
    for (let offset = 0; offset < 1000; offset += 1) {
      cycle.push(getDailyCompliment({ storage, now: day(offset), random }).compliment)
    }
    const next = getDailyCompliment({ storage, now: day(1000), random }).compliment
    expect(cycle.slice(-60)).not.toContain(next)
    expect(JSON.parse(storage.getItem(DAILY_COMPLIMENT_STORAGE_KEY)).cycle).toBe(1)
  })

  test('wires profile layout selection, long press actions, and red filled hearts', () => {
    const preferences = read('components/mobile/PreferencesMobile.vue')
    const profile = read('components/shared/ProfilePage.vue')
    const selectionBar = read('components/shared/SelectionActionsBar.vue')
    const card = read('components/shared/LibraryBookCard.vue')
    const detail = read('components/mobile/BookDetailMobile.vue')
    const actionsPreview = read('components/shared/previews/BookActionsPreview.vue')
    const css = read('assets/css/main.css')

    expect(preferences).toContain("set('profileFavouritesLayout', opt.value)")
    expect(profile).toContain("profileFavouritesLayout === 'list' ? 'books-list' : 'books-grid'")
    expect(profile).toContain('@pointerdown="(event) => onPointerDown(event, book)"')
    expect(profile.indexOf('class="profile-tabs"')).toBeLessThan(profile.indexOf('<SelectionActionsBar'))
    expect(profile.indexOf('<SelectionActionsBar')).toBeLessThan(profile.indexOf('v-if="favourites.length"'))
    expect(selectionBar).toContain("action.key === 'favourite'")
    expect(selectionBar).toContain('.selection-action.favourite')
    for (const source of [card, detail, actionsPreview]) {
      expect(source).toContain('ri-heart-fill favourite-heart-icon')
    }
    expect(css).toContain('.favourite-heart-icon')
    expect(css).toContain('var(--color-status-danger-bright, #dc2626)')
  })
})
