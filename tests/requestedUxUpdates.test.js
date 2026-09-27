import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import { normalizeBookishSettings } from '../composables/useBookishSettings.js'
import { normalizeMobileReaderPrefs, PDF_ZOOM_MIN } from '../composables/useMobileReaderPrefs.js'

const root = resolve(process.cwd())
const read = (path) => readFileSync(resolve(root, path), 'utf8')

describe('requested mobile UX updates', () => {
  test('automatic library scans opt out of toast announcements', () => {
    const plugin = read('plugins/device-library-sync.client.js')
    expect(plugin).toContain('syncDeviceLibrary({ announce: false })')
    expect(plugin).toContain('syncDeviceLibrary({ silent: true })')
  })

  test('legacy Edge narrators migrate to their replacements', () => {
    expect(normalizeBookishSettings({ ttsVoice: 'en-US-ChristopherNeural' }).ttsVoice).toBe('en-CA-LiamNeural')
    expect(normalizeBookishSettings({ ttsVoice: 'en-US-GuyNeural' }).ttsVoice).toBe('en-US-BrianNeural')
    expect(normalizeBookishSettings({ ttsVoice: 'en-US-AriaNeural' }).ttsVoice).toBe('en-US-AvaNeural')
    expect(normalizeBookishSettings({ ttsVoice: 'en-US-AnaNeural' }).ttsVoice).toBe('en-US-AvaNeural')
    expect(normalizeBookishSettings({ ttsVoice: 'en-US-JennyNeural' }).ttsVoice).toBe('en-US-EmmaNeural')
    expect(normalizeBookishSettings({ ttsVoice: 'en-US-DavisNeural' }).ttsVoice).toBe('en-US-AndrewNeural')
  })

  test('the TTS server accepts every narrator offered by the player', () => {
    const player = read('composables/useTTS.js')
    const server = read('server/api/tts/index.post.ts')
    const roster = player.slice(player.indexOf('const EDGE_VOICES'), player.indexOf('const DEFAULT_TTS_VOICE'))
    const voiceIds = [...roster.matchAll(/id:\s*'([^']+)'/g)].map((match) => match[1])

    expect(voiceIds).toHaveLength(8)
    for (const voiceId of voiceIds) expect(server, voiceId).toContain(`'${voiceId}'`)
  })

  test('PDF zoom supports zooming below fit-to-width and contains magnified pages', () => {
    expect(PDF_ZOOM_MIN).toBeLessThan(1)
    expect(normalizeMobileReaderPrefs({ pdfZoom: 0.75 }).pdfZoom).toBe(0.75)
    expect(read('components/shared/PdfViewer.vue')).toContain("'is-zoomed': zoom > 1")
    expect(read('components/mobile/ReaderMobile.vue')).toMatch(/pdf-viewer\)[^{]*\{[^}]*overflow-x: hidden/s)
    expect(read('components/shared/PdfViewer.vue')).toContain('frameWidth: Math.min(viewport.width, availableWidth)')
  })

  test('book selection keeps its toolbar visible and compact cards compact', () => {
    const books = read('components/mobile/BooksMobile.vue')
    expect(books).toContain("'selection-toolbar': selectionMode")
    expect(books).toContain('v-if="!selectionMode" class="library-metrics-summary"')
    expect(books).toMatch(/\.controls-row\.in-container\.selection-toolbar\s*\{[^}]*position: fixed/s)
    expect(books).toMatch(/\.controls-row\.in-container\.selection-toolbar\s*\{[^}]*top:\s*calc\(69px/s)
    expect(read('components/shared/LibraryBookCard.vue')).toContain("'compact-actions': collapseActions && !restoreOnly")
  })

  test('settings use muted pages with borderless grouped surfaces', () => {
    const tokens = read('assets/css/main.css')
    const settings = read('components/mobile/SettingsMobile.vue')
    const preferences = read('components/mobile/PreferencesMobile.vue')
    const storage = read('components/mobile/SettingsStorageMobile.vue')
    const connection = read('components/shared/ConnectionTestPanel.vue')

    expect(tokens).toContain('--color-settings-background')
    expect(tokens).toContain('--color-settings-group')
    expect(settings).toMatch(/\.section\s*\{[^}]*border:\s*0[^}]*background:\s*var\(--color-settings-group\)/s)
    expect(settings).toMatch(/\.section-title\s*\{[^}]*position:\s*absolute[^}]*bottom:\s*calc\(100% \+ 7px\)/s)
    expect(settings).toMatch(/\.setting-item\s*\{[^}]*border:\s*0/s)
    expect(preferences).toMatch(/\.pref-group\s*\{[^}]*border:\s*0[^}]*background:\s*var\(--color-settings-group\)/s)
    expect(preferences).toMatch(/\.preferences-body\s*\{[^}]*gap:\s*32px/s)
    expect(preferences).toMatch(/\.pref-group-title\s*\{[^}]*position:\s*absolute[^}]*bottom:\s*calc\(100% \+ 9px\)/s)
    expect(preferences).toMatch(/\.option\s*\{[^}]*border:\s*0/s)
    expect(storage).toContain('Stored on this device')
    expect(storage).toContain('Library intelligence')
    expect(storage).toContain('Device scanning')
    expect(storage).toContain('Library visibility')
    expect(storage).toMatch(/\.storage-hero\s*\{[^}]*background:\s*var\(--color-brand-primary\)/s)
    expect(storage).toMatch(/\.storage-group\s*\{[^}]*border-radius:\s*16px[^}]*background:\s*var\(--color-settings-group\)/s)
    expect(connection).toMatch(/\.card-head h2\s*\{[^}]*position:\s*absolute[^}]*bottom:\s*calc\(100% \+ 7px\)/s)
    const systemBarSync = read('plugins/system-bars.client.js')
    expect(systemBarSync).toContain("nuxtApp.hook('page:finish', syncPage)")
    expect(systemBarSync).toContain('document.elementsFromPoint')
    expect(systemBarSync).toContain('statusBarColor')
    expect(systemBarSync).toContain('navigationBarColor')
    expect(systemBarSync).toContain("[data-system-bar-color=\"transparent\"]")
    const systemBars = read('android/app/src/main/java/com/bookish/app/SystemBarsPlugin.java')
    expect(systemBars).toContain('call.getString("statusBarColor")')
    expect(systemBars).toContain('call.getString("navigationBarColor")')
    expect(systemBars).toContain('WindowInsetsCompat.Type.statusBars()')
    expect(systemBars).toContain('WindowInsetsCompat.Type.navigationBars()')
    expect(systemBars).toContain('scrim.setBackgroundColor(color)')
    expect(read('components/mobile/ReaderMobile.vue')).toContain('data-system-bar-color')
    expect(read('components/mobile/ProfileMobile.vue')).toMatch(/\.profile-page\s*\{[^}]*background:\s*var\(--color-settings-background\)/s)
    expect(read('components/tablet/ProfileDesktop.vue')).toMatch(/\.profile-page\s*\{[^}]*background:\s*var\(--color-settings-background\)/s)
    expect(read('layouts/default.vue')).toContain("route.path.startsWith('/editprofilepage')")
    expect(read('layouts/default.vue')).toMatch(/\.app-layout\.settings-palette[\s\S]*background:\s*var\(--color-settings-background\)/)
    expect(systemBarSync).toContain("window.location.pathname.startsWith('/editprofilepage')")
    expect(read('plugins/settings-system-bars.client.js')).toContain("pathname.startsWith('/editprofilepage')")
    expect(settings).toMatch(/\.about-item\s*\{[^}]*background-color:\s*transparent/s)
  })

  test('detail pages blend into transparent Android system bars', () => {
    for (const file of [
      'components/mobile/SeriesDetailMobile.vue',
      'components/mobile/PlaylistDetailMobile.vue',
      'components/shared/BookGroupDetail.vue',
    ]) {
      const source = read(file)
      expect(source).toContain('data-system-bar-color="transparent"')
      expect(source).toContain(':data-system-bar-icons=')
    }
  })

  test('completed book cards keep a purple check and white percentage', () => {
    const card = read('components/shared/LibraryBookCard.vue')
    expect(card).toMatch(/\.card-progress :deep\(\.complete-icon\)\s*\{[^}]*color:\s*var\(--color-brand-primary\)/s)
    expect(card).toMatch(/\.card-progress :deep\(\.complete-text\)\s*\{[^}]*color:\s*var\(--color-text-on-image-primary\)/s)
  })

  test('book editing preserves its originating page', () => {
    const navigation = read('composables/useBookEditNavigation.js')
    expect(navigation).toContain("query: { returnTo: safeReturnPath(returnTo) }")
    expect(navigation).toContain('router.replace(returnTo.value)')
    for (const file of ['components/mobile/EditBookMobile.vue', 'components/shared/EditBookComp.vue']) {
      expect(read(file)).toContain('returnFromEditor()')
    }
    for (const file of [
      'components/mobile/BooksMobile.vue',
      'components/mobile/SeriesDetailMobile.vue',
      'components/mobile/PlaylistDetailMobile.vue',
      'components/shared/BookGroupDetail.vue',
    ]) {
      expect(read(file)).toContain('bookEditLocation')
    }
  })

  test('series and playlist details share Books selection and minimal actions', () => {
    for (const file of [
      'components/mobile/SeriesDetailMobile.vue',
      'components/mobile/PlaylistDetailMobile.vue',
      'components/shared/BookGroupDetail.vue',
    ]) {
      const source = read(file)
      expect(source).toContain('SelectionActionsBar')
      expect(source).toContain('useMultiSelect')
      expect(source).toContain('useLongPress')
      expect(source).toContain('collapse-actions')
      expect(source).toContain('@pointerdown')
    }
  })

  test('series and favourites empty actions share the lighter compact treatment', () => {
    for (const file of ['components/mobile/SeriesMobile.vue', 'components/mobile/FavouritesMobile.vue']) {
      const source = read(file)
      expect(source).toContain('Explore Library')
      expect(source).toContain('ri-add-line')
      expect(source).toMatch(/\.add-btn\s*\{[^}]*padding:\s*0\.75rem 1\.5rem[^}]*font-weight:\s*500/s)
    }
    expect(read('components/mobile/FavouritesMobile.vue')).not.toMatch(/\.empty-state i\s*\{/)
  })

  test('author pages use the identity-aware author intelligence version', () => {
    const authors = read('components/shared/AuthorsComp.vue')
    const detail = read('components/shared/AuthorDetailComp.vue')
    const books = read('composables/useBooks.js')
    const endpoint = read('server/api/authors/bio.get.ts')

    expect(authors).toContain('refreshAuthorIntelligence')
    expect(detail).toContain('AUTHOR_DETAILS_VERSION')
    expect(detail).toContain('newestAuthorRecordFirst')
    expect(books).toContain('detailsVersion')
    expect(endpoint).toContain('matchesLibrary')
    expect(endpoint).toContain('(wiki || openLib) ? rawWikidata : null')
  })

  test('streak image actions expose progress and use Android gallery/share APIs', () => {
    const streak = read('components/mobile/StreakCalendarMobile.vue')
    const native = read('android/app/src/main/java/com/bookish/app/ApkInstallerPlugin.java')
    expect(streak).toContain('/images/Flame.png')
    expect(streak).toContain("actionState === 'saving'")
    expect(streak).toContain('nativeMedia.saveImage')
    expect(streak).toContain('nativeMedia.shareImage')
    expect(native).toContain('MediaStore.Images.Media.RELATIVE_PATH')
  })
})
