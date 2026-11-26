import fs from 'node:fs'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import {
  DEFAULT_PAGES_SETTINGS,
  FORMAT_FILTER_CHOICES,
  matchesFormatFilter,
  normalizePagesSettings,
} from '../composables/usePagesSettings.js'

const root = resolve(process.cwd())
const read = (path) => readFileSync(resolve(root, path), 'utf8')

describe('appearance preferences', () => {
  test('new preference keys have sane defaults', () => {
    expect(DEFAULT_PAGES_SETTINGS.appBackground).toBe('white')
    expect(DEFAULT_PAGES_SETTINGS.darkAppBackground).toBe('muted')
    expect(DEFAULT_PAGES_SETTINGS.seriesCardBackground).toBe('blur')
    expect(DEFAULT_PAGES_SETTINGS.seriesCardLayout).toBe('fan')
    expect(DEFAULT_PAGES_SETTINGS.favouritesCardBackground).toBe('blur')
    expect(DEFAULT_PAGES_SETTINGS.favouritesCardLayout).toBe('list')
    expect(DEFAULT_PAGES_SETTINGS.profileFavouritesLayout).toBe('grid')
    // Playlist cards default to the same look as series cards.
    expect(DEFAULT_PAGES_SETTINGS.playlistCardBackground).toBe('blur')
    expect(DEFAULT_PAGES_SETTINGS.playlistCardLayout).toBe('fan')
    expect(DEFAULT_PAGES_SETTINGS.bookActionDisplay).toBe('minimal')
    expect(DEFAULT_PAGES_SETTINGS).not.toHaveProperty('bookProgressDisplay')
    expect(DEFAULT_PAGES_SETTINGS.ratingSource).toBe('goodreads')
    expect(DEFAULT_PAGES_SETTINGS.personalRatingScale).toBe(10)
    expect(DEFAULT_PAGES_SETTINGS.readerHighlight).toBe(true)
    expect(DEFAULT_PAGES_SETTINGS.listenCoverBlur).toBe(true)
    expect(DEFAULT_PAGES_SETTINGS.listenVisual).toBe('orb')
    expect(DEFAULT_PAGES_SETTINGS.showStreak).toBe(true)
    expect(DEFAULT_PAGES_SETTINGS.formatFilter).toBe('all')
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
    const ok = normalizePagesSettings({
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
    expect(ok.seriesCardLayout).toBe('fan')
    expect(ok.favouritesCardBackground).toBe('blank')
    expect(ok.favouritesCardLayout).toBe('list')
    // Profile favourites are no longer a choice: always a grid.
    expect(ok.profileFavouritesLayout).toBe('grid')
    expect(ok.bookActionDisplay).toBe('visible')
    expect(ok.readerHighlight).toBe(false)
    expect(ok.showStreak).toBe(false)
    expect(ok.formatFilter).toBe('epub')

    const junk = normalizePagesSettings({
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
    for (const key of ['bookActionDisplay', 'readerHighlight', 'seriesSuggestions']) {
      expect(prefs, key).toContain(key)
    }

    // Light is always Bright and dark always Muted: no canvas choice, and no
    // top-navigation page (the header is always "Logo and title").
    expect(prefs).not.toContain('appBackgroundOptions')
    expect(prefs).not.toContain('/settings/preferences/top-navigation')
    expect(existsSync(resolve(root, 'pages/settings/preferences/top-navigation.vue'))).toBe(false)
    // Interface choices with more than on/off open their own page of radio
    // options: the streak, which formats show, and which formats Pages reads.
    for (const route of ['streak', 'book-format', 'formats']) {
      expect(prefs).toContain(`to="/settings/preferences/${route}"`)
      expect(existsSync(resolve(root, `pages/settings/preferences/${route}.vue`))).toBe(true)
    }
    const streakPrefs = read('components/mobile/StreakPreferencesMobile.vue')
    expect(streakPrefs).toContain('showStreak')
    expect(streakPrefs).toContain('streakIcon')
    expect(streakPrefs).toContain('streakBackground')
    expect(prefs).toMatch(/\.pref-group\s*\{[^}]*border:[^}]*border-radius:[^}]*background:/s)

    const theme = read('assets/css/main.css')
    expect(theme).toContain('--color-reader-light-background: var(--color-background-app)')
    expect(theme).toContain('--color-reader-dark-background: var(--color-background-app)')
    expect(theme).toContain('--color-raised-surface-border: transparent')
    expect(theme).toContain('--color-raised-surface-border: var(--color-border-card)')

    const reader = read('components/mobile/ReaderMobile.vue')
    expect(reader).toContain('--mobile-reader-bg: var(--color-reader-light-background)')

    // The streak page uses the borderless grouped cards of the settings pages.
    const streak = read('components/mobile/StreakCalendarMobile.vue')
    expect(streak).toContain('background: var(--color-settings-group)')

    // TWO format choices, and they do different things. "Show in Library"
    // hides (the app still handles both); "Formats Pages Reads" removes (purges
    // the books and stops the scanner detecting the extension).
    const bookFormat = read('components/mobile/BookFormatPreferencesMobile.vue')
    const readFormats = read('components/mobile/ReadFormatsPreferencesMobile.vue')
    expect(bookFormat).toContain('formatFilter')
    expect(readFormats).toContain('useFormatEnablement')
    expect(readFormats).toContain('chooseFormatMode')
    // Hiding between formats is meaningless once only one is handled.
    expect(prefs).toContain('v-if="enabledFormats.length > 1"')

    // The standalone Favourites page still owns its own view toggle, and
    // Profile favourites are always a grid, so neither is chosen here.
    expect(prefs).not.toContain("set('favouritesCardLayout'")
    expect(prefs).not.toContain('favouritesCardBackground')
    expect(prefs).not.toContain('profileFavouritesLayout')

    // Ratings open their own page; the two Reading options are plain switches.
    expect(prefs).toContain('to="/settings/preferences/ratings"')
    expect(existsSync(resolve(root, 'pages/settings/preferences/ratings.vue'))).toBe(true)
    // Highlight is a row that opens its own page (switch + colour).
    expect(prefs).toContain('to="/settings/preferences/highlight"')
    expect(fs.readFileSync('components/mobile/HighlightPreferencesMobile.vue', 'utf8')).toContain('readerHighlight: !enabled')
    // Orb vs cover (and the cover's blur switch) live on their own page.
    expect(prefs).toContain('to="/settings/preferences/listen-screen"')
    const listenScreen = read('components/mobile/ListenScreenPreferencesMobile.vue')
    expect(listenScreen).toContain('listenVisual')
    expect(listenScreen).toContain('listenCoverBlur')
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
    // The "more" options open as an Apple-style bottom action sheet, grouped
    // by what each action does, with Delete the only destructive (red) row.
    expect(bookDetail).toContain('<BookActionSheet')
    const actionSheet = read('components/shared/BookActionSheet.vue')
    for (const group of ["id: 'collect'", "id: 'details'", "id: 'share'", "id: 'remove'"]) {
      expect(actionSheet).toContain(group)
    }
    expect(actionSheet).toContain("action: 'delete', icon: 'ri-delete-bin-line', label: 'Delete Book', destructive: true")

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
    // Book actions is a tablet-only choice inside Appearance.
    expect(prefs).toContain('<div v-if="isTablet" class="pref-block">')

    const reader = read('pages/reader/[id].vue')
    expect(reader).toContain('highlightEnabled')
    expect(reader).toContain('settings.value.readerHighlight')
  })
})
