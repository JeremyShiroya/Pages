import { describe, expect, it } from 'vitest'
import {
  PAGES_SETTINGS_KEY,
  DEFAULT_PAGES_SETTINGS,
  applyPagesTheme,
  normalizePagesSettings,
  readPagesSettings,
  writePagesSettings,
} from './usePagesSettings.js'

const createMemoryStorage = () => {
  const data = new Map()

  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    clear: () => data.clear(),
  }
}

describe('usePagesSettings storage helpers', () => {
  it('keeps Listen back and forward counters independent and migrates the old interval', () => {
    expect(normalizePagesSettings({ listenBackSeconds: 3, listenForwardSeconds: 42 }))
      .toMatchObject({ listenBackSeconds: 3, listenForwardSeconds: 42 })
    expect(normalizePagesSettings({ listenBackSeconds: 0, listenForwardSeconds: 99 }))
      .toMatchObject({ listenBackSeconds: 1, listenForwardSeconds: 60 })
    expect(normalizePagesSettings({ listenSkipSeconds: 24 }))
      .toMatchObject({ listenBackSeconds: 24, listenForwardSeconds: 24 })
  })
  it('returns defaults when no saved settings exist', () => {
    expect(readPagesSettings(createMemoryStorage())).toEqual(DEFAULT_PAGES_SETTINGS)
  })

  it('migrates only an untouched former navigation, without changing other preferences', () => {
    const storage = createMemoryStorage()
    storage.setItem(PAGES_SETTINGS_KEY, JSON.stringify({
      settingsVersion: 3, readerTheme: 'dark', appBackground: 'muted',
      mobileNavStyle: 'standard', mobileNavSize: 'standard', mobileNavOpacity: 95,
      mobileNavBlur: 18, mobileNavMaterial: 'current', mobileNavHighlight: 'soft',
      mobileNavActiveIconStyle: 'fill', mobileNavProfileDisplay: 'icon',
      mobileNavShowTitles: true,
    }))
    expect(readPagesSettings(storage)).toMatchObject({
      settingsVersion: 4, readerTheme: 'dark', appBackground: 'white',
      mobileNavStyle: 'floating', mobileNavSize: 'compact',
      mobileNavMaterial: 'frosted', mobileNavProfileDisplay: 'avatar',
      mobileNavActiveIconStyle: 'fill', mobileNavShowTitles: true,
    })
    expect(readPagesSettings(storage).mobileNavStyle).toBe('floating')
  })

  it('preserves the whole former navigation when even one field was customized', () => {
    const storage = createMemoryStorage()
    storage.setItem(PAGES_SETTINGS_KEY, JSON.stringify({
      settingsVersion: 3, mobileNavHighlight: 'none',
    }))
    expect(readPagesSettings(storage)).toMatchObject({
      mobileNavStyle: 'standard', mobileNavSize: 'compact', mobileNavOpacity: 95,
      mobileNavMaterial: 'current', mobileNavHighlight: 'none',
      mobileNavProfileDisplay: 'icon', mobileNavShowTitles: true,
    })
  })

  it('hide content activates only when explicitly true', () => {
    expect(normalizePagesSettings({ hideContent: true }).hideContent).toBe(true)
    expect(normalizePagesSettings({ hideContent: 'yes' }).hideContent).toBe(false)
    expect(normalizePagesSettings({}).hideContent).toBe(false)
  })

  it('defaults book actions to visible and validates the minimal alternative', () => {
    expect(normalizePagesSettings({}).bookActionDisplay).toBe('minimal')
    expect(normalizePagesSettings({ bookActionDisplay: 'visible' }).bookActionDisplay).toBe('visible')
    expect(normalizePagesSettings({ bookActionDisplay: 'minimal' }).bookActionDisplay).toBe('minimal')
    expect(normalizePagesSettings({ bookActionDisplay: 'invalid' }).bookActionDisplay).toBe('minimal')
    expect(normalizePagesSettings({ bookProgressDisplay: 'ring' })).not.toHaveProperty('bookProgressDisplay')
    expect(normalizePagesSettings({ ratingSource: 'storygraph' }).ratingSource).toBe('storygraph')
    expect(normalizePagesSettings({ ratingSource: 'none' }).ratingSource).toBe('none')
    expect(normalizePagesSettings({ personalRatingScale: 5 }).personalRatingScale).toBe(5)
  })

  it('always uses the Bright light canvas and the Muted dark canvas', () => {
    for (const appBackground of [undefined, 'muted', 'invalid']) {
      expect(normalizePagesSettings({ appBackground }).appBackground).toBe('white')
    }
    for (const darkAppBackground of [undefined, 'dark', 'invalid']) {
      expect(normalizePagesSettings({ darkAppBackground }).darkAppBackground).toBe('muted')
    }
  })

  it('always shows logo and title in the shared mobile header', () => {
    const storage = createMemoryStorage()
    for (const display of [undefined, 'greeting', 'unknown']) {
      writePagesSettings({ mobileTopNavDisplay: display }, storage)
      expect(readPagesSettings(storage).mobileTopNavDisplay).toBe('logo-title')
    }
  })

  it('always uses the compact bottom navigation size', () => {
    for (const mobileNavSize of [undefined, 'standard', 'compact']) {
      expect(normalizePagesSettings({ mobileNavSize }).mobileNavSize).toBe('compact')
    }
  })

  it('validates bottom navigation style, opacity, and blur', () => {
    expect(normalizePagesSettings({})).toMatchObject({ mobileNavStyle: 'floating', mobileNavSize: 'compact', mobileNavOpacity: 95, mobileNavBlur: 18 })
    expect(normalizePagesSettings({ mobileNavStyle: 'standard', mobileNavOpacity: 35, mobileNavBlur: 50 }))
      .toMatchObject({ mobileNavStyle: 'standard', mobileNavOpacity: 50, mobileNavBlur: 30 })
    expect(normalizePagesSettings({ mobileNavStyle: 'unknown', mobileNavOpacity: 'invalid' }))
      .toMatchObject({ mobileNavStyle: 'floating', mobileNavOpacity: 95 })
    expect(normalizePagesSettings({ mobileNavSize: 'compact' }).mobileNavSize).toBe('compact')
    expect(normalizePagesSettings({ mobileNavSize: 'invalid' }).mobileNavSize).toBe('compact')
  })

  it('retains frosted navigation and migrates removed liquid and bead choices', () => {
    expect(normalizePagesSettings({})).toMatchObject({
      mobileNavMaterial: 'frosted', mobileNavHighlight: 'soft',
    })
    expect(normalizePagesSettings({
      mobileNavMaterial: 'frosted', mobileNavHighlight: 'none',
    })).toMatchObject({
      mobileNavMaterial: 'frosted', mobileNavHighlight: 'none',
    })
    const migrated = normalizePagesSettings({ mobileNavMaterial: 'liquid', mobileNavHighlight: 'bead', mobileNavBeadSize: 'large' })
    expect(migrated).toMatchObject({ mobileNavMaterial: 'frosted', mobileNavHighlight: 'soft' })
    expect(migrated).not.toHaveProperty('mobileNavBeadSize')
  })

  it('validates the selected navigation icon style', () => {
    expect(normalizePagesSettings({}).mobileNavActiveIconStyle).toBe('fill')
    expect(normalizePagesSettings({ mobileNavActiveIconStyle: 'fill' }).mobileNavActiveIconStyle).toBe('fill')
    expect(normalizePagesSettings({ mobileNavActiveIconStyle: 'unknown' }).mobileNavActiveIconStyle).toBe('fill')
  })

  it('validates profile avatar and tab title preferences', () => {
    expect(normalizePagesSettings({})).toMatchObject({ mobileNavProfileDisplay: 'avatar', mobileNavShowTitles: true })
    expect(normalizePagesSettings({ mobileNavProfileDisplay: 'avatar', mobileNavShowTitles: false }))
      .toMatchObject({ mobileNavProfileDisplay: 'avatar', mobileNavShowTitles: false })
    expect(normalizePagesSettings({ mobileNavProfileDisplay: 'other', mobileNavShowTitles: 'false' }))
      .toMatchObject({ mobileNavProfileDisplay: 'avatar', mobileNavShowTitles: true })
  })

  it('applies the saved app background palette with the color theme', () => {
    applyPagesTheme('light', 'muted', 'dark')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.dataset.appBackground).toBe('muted')
    expect(document.documentElement.dataset.darkAppBackground).toBe('dark')

    applyPagesTheme('light', 'white')
    expect(document.documentElement.dataset.appBackground).toBe('white')
  })

  it('persists partial updates with defaults for missing values', () => {
    const storage = createMemoryStorage()

    writePagesSettings({
      readerTheme: 'dark',
      libraryView: 'table',
      ttsSpeed: 1.5,
    }, storage)

    expect(readPagesSettings(storage)).toMatchObject({
      ...DEFAULT_PAGES_SETTINGS,
      readerTheme: 'dark',
      libraryView: 'table',
      ttsSpeed: 1.5,
    })
  })

  it('ignores malformed saved JSON and falls back safely', () => {
    const storage = createMemoryStorage()
    storage.setItem(PAGES_SETTINGS_KEY, '{bad json')

    expect(readPagesSettings(storage)).toEqual(DEFAULT_PAGES_SETTINGS)
  })

  it('falls back when a hidden Kokoro voice was previously saved', () => {
    const storage = createMemoryStorage()

    writePagesSettings({ ttsVoice: 'kokoro:af_heart' }, storage)

    expect(readPagesSettings(storage).ttsVoice).toBe(DEFAULT_PAGES_SETTINGS.ttsVoice)
  })

  it('uses separate grid and table pagination defaults', () => {
    expect(DEFAULT_PAGES_SETTINGS.libraryGridItemsPerPage).toBe(12)
    expect(DEFAULT_PAGES_SETTINGS.libraryTableItemsPerPage).toBe(10)
  })

  it('opens series and playlist details in table view by default', () => {
    expect(DEFAULT_PAGES_SETTINGS.groupDetailView).toBe('table')
    expect(normalizePagesSettings({ groupDetailView: 'grid' }).groupDetailView).toBe('grid')
    expect(normalizePagesSettings({ groupDetailView: 'invalid' }).groupDetailView).toBe('table')
  })

  it('migrates the legacy shared page size without exceeding the new defaults', () => {
    expect(normalizePagesSettings({ libraryItemsPerPage: 20 })).toMatchObject({
      libraryGridItemsPerPage: 12,
      libraryTableItemsPerPage: 10,
    })

    expect(normalizePagesSettings({ libraryItemsPerPage: 8 })).toMatchObject({
      libraryGridItemsPerPage: 8,
      libraryTableItemsPerPage: 8,
    })
  })

  it('migrates legacy pagination values when reading stored settings', () => {
    const storage = createMemoryStorage()
    storage.setItem(PAGES_SETTINGS_KEY, JSON.stringify({ libraryItemsPerPage: 20 }))

    expect(readPagesSettings(storage)).toMatchObject({
      libraryGridItemsPerPage: 12,
      libraryTableItemsPerPage: 10,
    })
  })

  it('persists independent grid and table page sizes', () => {
    const storage = createMemoryStorage()

    writePagesSettings({
      libraryGridItemsPerPage: 10,
      libraryTableItemsPerPage: 30,
    }, storage)

    expect(readPagesSettings(storage)).toMatchObject({
      libraryGridItemsPerPage: 10,
      libraryTableItemsPerPage: 30,
    })
  })
})


it('migrates removed header and card choices to the fixed defaults', () => {
  for (const mobileTopNavDisplay of ['title', 'logo']) {
    expect(normalizePagesSettings({ mobileTopNavDisplay, seriesCardLayout: 'cover', playlistCardLayout: 'cover', seriesCardBackground: 'blank', playlistCardBackground: 'blank' })).toMatchObject({ mobileTopNavDisplay: 'logo-title', seriesCardLayout: 'fan', playlistCardLayout: 'fan', seriesCardBackground: 'blur', playlistCardBackground: 'blur' })
  }
})
