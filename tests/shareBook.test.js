import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

const root = resolve(process.cwd())
const read = (path) => readFileSync(resolve(root, path), 'utf8')

describe('book sharing', () => {
  test('Android uses the native share sheet before the Web Share fallback', () => {
    const share = read('composables/useShareBook.js')
    const nativeAt = share.indexOf('isNativeCapacitorPlatform()')
    const navigatorAt = share.indexOf("typeof navigator === 'undefined'")

    expect(nativeAt).toBeGreaterThan(-1)
    expect(navigatorAt).toBeGreaterThan(nativeAt)
    expect(share).toContain('nativeShare.shareFile')
    expect(share).not.toContain('nativeShare.shareText')
    expect(share).toContain("saveArrayBuffer('shared-books'")
    expect(share).toContain('book.deviceImportPath')
    expect(share).toContain('fileName,')
  })

  test('the native FileProvider can serve app files and exposes book share methods', () => {
    const filePaths = read('android/app/src/main/res/xml/file_paths.xml')
    const plugin = read('android/app/src/main/java/com/bookish/app/ApkInstallerPlugin.java')

    expect(filePaths).toContain('<files-path name="bookish_files" path="." />')
    expect(plugin).toContain('public void shareFile(PluginCall call)')
    expect(plugin).toContain('public void shareText(PluginCall call)')
    expect(plugin).toContain('Intent.ACTION_SEND')
    expect(plugin).toContain('FLAG_GRANT_READ_URI_PERMISSION')
    expect(plugin).toContain('safeSharedFileName')
  })

  test('EPUB imports retain the original archive for file sharing', () => {
    expect(read('composables/useEpubExtractor.js')).toContain('source: ab')
    expect(read('components/mobile/AddBookMobile.vue')).toContain('extractedSource.value = result.source')
    expect(read('composables/useDeviceLibrarySync.js')).toContain('source = extracted.source')
  })
})
