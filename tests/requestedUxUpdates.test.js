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
    expect(read('components/shared/LibraryBookCard.vue')).toContain("'compact-actions': collapseActions && !restoreOnly")
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
