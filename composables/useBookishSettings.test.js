import { describe, expect, it } from 'vitest'
import {
  BOOKISH_SETTINGS_KEY,
  DEFAULT_BOOKISH_SETTINGS,
  applyBookishTheme,
  normalizeBookishSettings,
  readBookishSettings,
  writeBookishSettings,
} from './useBookishSettings.js'

const createMemoryStorage = () => {
  const data = new Map()

  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    clear: () => data.clear(),
  }
}

describe('useBookishSettings storage helpers', () => {
  it('returns defaults when no saved settings exist', () => {
    expect(readBookishSettings(createMemoryStorage())).toEqual(DEFAULT_BOOKISH_SETTINGS)
  })

  it('hide content activates only when explicitly true', () => {
    expect(normalizeBookishSettings({ hideContent: true }).hideContent).toBe(true)
    expect(normalizeBookishSettings({ hideContent: 'yes' }).hideContent).toBe(false)
    expect(normalizeBookishSettings({}).hideContent).toBe(false)
  })

  it('defaults book actions to visible and validates the minimal alternative', () => {
    expect(normalizeBookishSettings({}).bookActionDisplay).toBe('minimal')
    expect(normalizeBookishSettings({ bookActionDisplay: 'visible' }).bookActionDisplay).toBe('visible')
    expect(normalizeBookishSettings({ bookActionDisplay: 'minimal' }).bookActionDisplay).toBe('minimal')
    expect(normalizeBookishSettings({ bookActionDisplay: 'invalid' }).bookActionDisplay).toBe('minimal')
    expect(normalizeBookishSettings({ bookProgressDisplay: 'ring' })).not.toHaveProperty('bookProgressDisplay')
    expect(normalizeBookishSettings({ ratingSource: 'storygraph' }).ratingSource).toBe('storygraph')
    expect(normalizeBookishSettings({ ratingSource: 'none' }).ratingSource).toBe('none')
    expect(normalizeBookishSettings({ personalRatingScale: 5 }).personalRatingScale).toBe(5)
  })

  it('defaults to white and validates the original muted app background', () => {
    expect(normalizeBookishSettings({}).appBackground).toBe('white')
    expect(normalizeBookishSettings({ appBackground: 'muted' }).appBackground).toBe('muted')
    expect(normalizeBookishSettings({ appBackground: 'invalid' }).appBackground).toBe('white')
  })

  it('defaults dark mode to muted and validates the pure-black alternative', () => {
    expect(normalizeBookishSettings({}).darkAppBackground).toBe('muted')
    expect(normalizeBookishSettings({ darkAppBackground: 'dark' }).darkAppBackground).toBe('dark')
    expect(normalizeBookishSettings({ darkAppBackground: 'invalid' }).darkAppBackground).toBe('muted')
  })

  it('applies the saved app background palette with the color theme', () => {
    applyBookishTheme('light', 'muted', 'dark')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.dataset.appBackground).toBe('muted')
    expect(document.documentElement.dataset.darkAppBackground).toBe('dark')

    applyBookishTheme('light', 'white')
    expect(document.documentElement.dataset.appBackground).toBe('white')
  })

  it('persists partial updates with defaults for missing values', () => {
    const storage = createMemoryStorage()

    writeBookishSettings({
      readerTheme: 'dark',
      libraryView: 'table',
      ttsSpeed: 1.5,
    }, storage)

    expect(readBookishSettings(storage)).toMatchObject({
      ...DEFAULT_BOOKISH_SETTINGS,
      readerTheme: 'dark',
      libraryView: 'table',
      ttsSpeed: 1.5,
    })
  })

  it('ignores malformed saved JSON and falls back safely', () => {
    const storage = createMemoryStorage()
    storage.setItem(BOOKISH_SETTINGS_KEY, '{bad json')

    expect(readBookishSettings(storage)).toEqual(DEFAULT_BOOKISH_SETTINGS)
  })

  it('falls back when a hidden Kokoro voice was previously saved', () => {
    const storage = createMemoryStorage()

    writeBookishSettings({ ttsVoice: 'kokoro:af_heart' }, storage)

    expect(readBookishSettings(storage).ttsVoice).toBe(DEFAULT_BOOKISH_SETTINGS.ttsVoice)
  })

  it('uses separate grid and table pagination defaults', () => {
    expect(DEFAULT_BOOKISH_SETTINGS.libraryGridItemsPerPage).toBe(12)
    expect(DEFAULT_BOOKISH_SETTINGS.libraryTableItemsPerPage).toBe(10)
  })

  it('opens series and playlist details in table view by default', () => {
    expect(DEFAULT_BOOKISH_SETTINGS.groupDetailView).toBe('table')
    expect(normalizeBookishSettings({ groupDetailView: 'grid' }).groupDetailView).toBe('grid')
    expect(normalizeBookishSettings({ groupDetailView: 'invalid' }).groupDetailView).toBe('table')
  })

  it('migrates the legacy shared page size without exceeding the new defaults', () => {
    expect(normalizeBookishSettings({ libraryItemsPerPage: 20 })).toMatchObject({
      libraryGridItemsPerPage: 12,
      libraryTableItemsPerPage: 10,
    })

    expect(normalizeBookishSettings({ libraryItemsPerPage: 8 })).toMatchObject({
      libraryGridItemsPerPage: 8,
      libraryTableItemsPerPage: 8,
    })
  })

  it('migrates legacy pagination values when reading stored settings', () => {
    const storage = createMemoryStorage()
    storage.setItem(BOOKISH_SETTINGS_KEY, JSON.stringify({ libraryItemsPerPage: 20 }))

    expect(readBookishSettings(storage)).toMatchObject({
      libraryGridItemsPerPage: 12,
      libraryTableItemsPerPage: 10,
    })
  })

  it('persists independent grid and table page sizes', () => {
    const storage = createMemoryStorage()

    writeBookishSettings({
      libraryGridItemsPerPage: 10,
      libraryTableItemsPerPage: 30,
    }, storage)

    expect(readBookishSettings(storage)).toMatchObject({
      libraryGridItemsPerPage: 10,
      libraryTableItemsPerPage: 30,
    })
  })
})
