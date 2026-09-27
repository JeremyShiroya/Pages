import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import {
  DEFAULT_BOOKISH_SETTINGS,
  FORMAT_FILTER_CHOICES,
  matchesFormatFilter,
  normalizeBookishSettings,
} from '../composables/useBookishSettings.js'

const root = resolve(process.cwd())
const read = (path) => readFileSync(resolve(root, path), 'utf8')

describe('appearance preferences', () => {
  test('new preference keys have sane defaults', () => {
    expect(DEFAULT_BOOKISH_SETTINGS.appBackground).toBe('white')
    expect(DEFAULT_BOOKISH_SETTINGS.darkAppBackground).toBe('muted')
    expect(DEFAULT_BOOKISH_SETTINGS.seriesCardBackground).toBe('blur')
    expect(DEFAULT_BOOKISH_SETTINGS.seriesCardLayout).toBe('fan')
    expect(DEFAULT_BOOKISH_SETTINGS.favouritesCardBackground).toBe('blur')
    expect(DEFAULT_BOOKISH_SETTINGS.favouritesCardLayout).toBe('list')
    expect(DEFAULT_BOOKISH_SETTINGS.profileFavouritesLayout).toBe('grid')
    // Playlist cards default to the same look as series cards.
    expect(DEFAULT_BOOKISH_SETTINGS.playlistCardBackground).toBe('blur')
    expect(DEFAULT_BOOKISH_SETTINGS.playlistCardLayout).toBe('fan')
    expect(DEFAULT_BOOKISH_SETTINGS.bookActionDisplay).toBe('minimal')
    expect(DEFAULT_BOOKISH_SETTINGS).not.toHaveProperty('bookProgressDisplay')
    expect(DEFAULT_BOOKISH_SETTINGS.ratingSource).toBe('goodreads')
    expect(DEFAULT_BOOKISH_SETTINGS.personalRatingScale).toBe(10)
    expect(DEFAULT_BOOKISH_SETTINGS.readerHighlight).toBe(true)
    expect(DEFAULT_BOOKISH_SETTINGS.listenCoverBlur).toBe(true)
    expect(DEFAULT_BOOKISH_SETTINGS.showStreak).toBe(true)
    expect(DEFAULT_BOOKISH_SETTINGS.formatFilter).toBe('all')
  })

  test('format filter offers all / epub / pdf and matches case-insensitively', () => {
    expect(FORMAT_FILTER_CHOICES.map((choice) => choice.value)).toEqual(['all', 'epub', 'pdf'])

    const epub = { format: 'EPUB' }
    const pdf = { format: 'pdf' }

    expect(matchesFormatFilter(epub, 'all')).toBe(true)
    expect(matchesFormatFilter(pdf, 'all')).toBe(true)
    expect(matchesFormatFilter(epub, 'epub')).toBe(true)
    expect(matchesFormatFilter(epub, 'pdf')).toBe(false)
    expect(matchesFormatFilter(pdf, 'pdf')).toBe(true)
    // Books with no recorded format fall out of any narrowed filter.
    expect(matchesFormatFilter({}, 'epub')).toBe(false)
    expect(matchesFormatFilter({}, 'all')).toBe(true)
  })

  test('normalize validates preference values and rejects junk', () => {
    const ok = normalizeBookishSettings({
      seriesCardBackground: 'blur',
      seriesCardLayout: 'cover',
      favouritesCardBackground: 'blank',
      favouritesCardLayout: 'list',
      profileFavouritesLayout: 'list',
      bookActionDisplay: 'visible',
      readerHighlight: false,
      showStreak: false,
      formatFilter: 'epub',
    })
    expect(ok.seriesCardBackground).toBe('blur')
    expect(ok.seriesCardLayout).toBe('cover')
    expect(ok.favouritesCardBackground).toBe('blank')
    expect(ok.favouritesCardLayout).toBe('list')
    expect(ok.profileFavouritesLayout).toBe('list')
    expect(ok.bookActionDisplay).toBe('visible')
    expect(ok.readerHighlight).toBe(false)
    expect(ok.showStreak).toBe(false)
    expect(ok.formatFilter).toBe('epub')

    const junk = normalizeBookishSettings({
      seriesCardLayout: 'nonsense',
      favouritesCardLayout: 'nope',
      profileFavouritesLayout: 'nope',
      playlistCardLayout: 'spiral',
      playlistCardBackground: 'rainbow',
      bookActionDisplay: 'floating',
      formatFilter: 'mobi',
    })
    expect(junk.seriesCardLayout).toBe('fan')
    expect(junk.favouritesCardLayout).toBe('list')
    expect(junk.profileFavouritesLayout).toBe('grid')
    expect(junk.playlistCardLayout).toBe('fan')
    expect(junk.playlistCardBackground).toBe('blur')
    expect(junk.bookActionDisplay).toBe('minimal')
    expect(junk.formatFilter).toBe('all')
  })

  test('preferences page and route exist and are wired from settings', () => {
    expect(existsSync(resolve(root, 'pages/settings/preferences.vue'))).toBe(true)
    expect(existsSync(resolve(root, 'components/mobile/PreferencesMobile.vue'))).toBe(true)

    const settings = read('components/mobile/SettingsMobile.vue')
    expect(settings).toContain("to: '/settings/preferences'")
    expect(settings).not.toMatch(/Preferences[^}]*comingSoon/)

    const prefs = read('components/mobile/PreferencesMobile.vue')
    for (const key of ['appBackground', 'darkAppBackground', 'bookActionDisplay', 'seriesCardBackground', 'seriesCardLayout', 'playlistCardBackground', 'playlistCardLayout', 'readerHighlight', 'listenCoverBlur', 'showStreak', 'seriesSuggestions']) {
      expect(prefs, key).toContain(key)
    }

    expect(prefs).toContain("{ value: 'white', label: 'Bright', preview: 'bright' }")
    expect(prefs).toContain("{ value: 'dark', label: 'Dark', preview: 'dark' }")
    expect(prefs).toContain('palette-preview--dark-muted')
    expect(prefs).toMatch(/\.pref-group\s*\{[^}]*border:[^}]*border-radius:[^}]*background:/s)

    const theme = read('assets/css/main.css')
    expect(theme).toContain('--color-reader-light-background: var(--color-background-app)')
    expect(theme).toContain('--color-reader-dark-background: var(--color-background-app)')
    expect(theme).toContain('--color-raised-surface-border: transparent')
    expect(theme).toContain('--color-raised-surface-border: var(--color-border-card)')

    const reader = read('components/mobile/ReaderMobile.vue')
    expect(reader).toContain('--mobile-reader-bg: var(--color-reader-light-background)')

    const streak = read('components/mobile/StreakCalendarMobile.vue')
    expect(streak).toContain('border: 1px solid var(--color-raised-surface-border)')

    // TWO format rows, and they do different things. "Book format" hides
    // (the app still handles both); "Formats Pages reads" removes (purges the
    // books and stops the scanner detecting the extension).
    expect(prefs).toContain("set('formatFilter'")
    expect(prefs).toContain('useFormatEnablement')
    expect(prefs).toContain('chooseFormatMode')
    // Hiding between formats is meaningless once only one is handled.
    expect(prefs).toContain('v-if="enabledFormats.length > 1"')

    // The standalone Favourites page still owns its own view toggle, while
    // Profile gets a separate persisted grid/list preference here.
    expect(prefs).not.toContain("set('favouritesCardLayout'")
    expect(prefs).not.toContain('favouritesCardBackground')
    expect(prefs).toContain("set('profileFavouritesLayout'")

    // Every Reading option is illustrated, like the card sections above it.
    expect(prefs).toContain('ReadingPreview')
    expect(existsSync(resolve(root, 'components/shared/previews/ReadingPreview.vue'))).toBe(true)
    expect(existsSync(resolve(root, 'components/shared/previews/BookActionsPreview.vue'))).toBe(true)
  })

  test('components consume the appearance preferences', () => {
    const seriesCard = read('components/shared/SeriesCollageCard.vue')
    expect(seriesCard).toContain('seriesCardLayout')
    expect(seriesCard).toContain('seriesCardBackground')
    expect(seriesCard).toContain("layout === 'cover'")

    const fav = read('components/mobile/FavouritesMobile.vue')
    expect(fav).toContain('favouritesCardLayout')
    expect(fav).toContain(':card-background="favouritesBackground"')
    // The shared controls row owns the grid/list choice, same as every shelf.
    expect(fav).toContain('LibraryControlsRow')
    expect(fav).toContain('setLayout')

    // Playlist cards render through the shared SeriesCollageCard (playlist
    // variant), which is where the playlist-card preferences are consumed.
    const playlists = read('components/mobile/PlaylistsMobile.vue')
    expect(playlists).toContain('variant="playlist"')
    const collageCard = read('components/shared/SeriesCollageCard.vue')
    expect(collageCard).toContain('playlistCardLayout')
    expect(collageCard).toContain('playlistCardBackground')

    const card = read('components/shared/LibraryBookCard.vue')
    expect(card).toContain('cardBackground')
    expect(card).toContain('no-backdrop')
    expect(card).toContain('collapseActions')
    expect(card).toContain('card-more-menu')

    const bookDetail = read('components/mobile/BookDetailMobile.vue')
    expect(bookDetail).toContain('minimalActions')
    expect(bookDetail).toContain('detail-more-menu')

    const topNav = read('components/mobile/MobileTopNav.vue')
    expect(topNav).toContain('v-if="showStreak"')

    // Format pills are drawn from the formats the app still handles, so a
    // PDF-only (or EPUB-only) app offers nothing to choose between.
    const books = read('components/mobile/BooksMobile.vue')
    const prefs = read('components/mobile/PreferencesMobile.vue')
    expect(books).toContain('settings.value.enabledFormats')
    expect(books).toContain('formatFilters.length > 1')
    expect(books).toContain(':collapse-actions="collapseBookActions"')
    expect(books).toContain('isPhone.value || settings.value.bookActionDisplay === "minimal"')
    expect(prefs).toContain('<section v-if="isTablet" class="pref-group">')

    const reader = read('pages/reader/[id].vue')
    expect(reader).toContain('highlightEnabled')
    expect(reader).toContain('settings.value.readerHighlight')
  })
})
