import { useBookStorage } from '~/composables/useBookStorage'
import { useDeviceAssets } from '~/composables/useDeviceAssets'
import { isNativeCapacitorPlatform } from '~/composables/useNativePlatform'

const safeFileName = (value) => String(value || 'book')
  .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 100) || 'book'

const sourceBlob = async (source, format) => {
  if (!source) return null
  if (source instanceof Blob) return source
  if (source instanceof ArrayBuffer) return new Blob([source])
  if (ArrayBuffer.isView(source)) return new Blob([source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength)])
  if (typeof source === 'string') {
    try {
      const response = await fetch(source)
      if (response.ok) return response.blob()
    } catch {}
  }
  return null
}

export const useShareBook = () => {
  const { getBookContent } = useBookStorage()
  const deviceAssets = useDeviceAssets()

  const shareBook = async (book) => {
    if (!book) return { ok: false, reason: 'Book not found.' }

    const format = String(book.format || 'epub').toLowerCase() === 'pdf' ? 'pdf' : 'epub'
    const title = String(book.title || 'Book')
    const author = String(book.author || 'Unknown author')
    const text = `${title} by ${author}`
    const mimeType = format === 'pdf' ? 'application/pdf' : 'application/epub+zip'
    const fileName = `${safeFileName(title)}.${format}`

    try {
      const stored = await getBookContent(book.id)
      const blob = await sourceBlob(stored?.source, format)

      if (isNativeCapacitorPlatform()) {
        const { Capacitor } = await import('@capacitor/core')
        const nativeShare = Capacitor.Plugins?.ApkInstaller
        if (nativeShare?.shareFile) {
          let uri = null
          // Device-scanned books already have an original file path. Prefer it
          // so existing EPUBs imported before source retention was added can
          // still be shared without being re-imported.
          if (book.deviceImportPath) {
            uri = book.deviceImportPath
          } else if (await deviceAssets.exists('pdfs', `${book.id}.pdf`)) {
            // The legacy source store used this location for both formats.
            // The native plugin copies it to a correctly named share file.
            uri = await deviceAssets.getUri('pdfs', `${book.id}.pdf`)
          } else if (blob) {
            const saved = await deviceAssets.saveArrayBuffer('shared-books', fileName, await blob.arrayBuffer())
            uri = saved?.uri ?? null
          }

          if (uri) {
            await nativeShare.shareFile({
              path: uri,
              mimeType,
              subject: title,
              title: 'Share book',
              text,
              fileName,
            })
            return { ok: true, sharedFile: true }
          }
        }

        return { ok: false, reason: 'The original book file is not available to share. Re-import the book to restore it.' }
      }

      if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
        return { ok: false, reason: 'Book sharing is not supported on this device.' }
      }

      if (blob) {
        const file = new File([blob], fileName, { type: mimeType })
        const data = { title, text, files: [file] }
        if (!navigator.canShare || navigator.canShare(data)) {
          await navigator.share(data)
          return { ok: true, sharedFile: true }
        }
      }

      return { ok: false, reason: 'The original book file is not available to share. Re-import the book to restore it.' }
    } catch (error) {
      if (error?.name === 'AbortError') return { ok: false, cancelled: true }
      return { ok: false, reason: error?.message || 'The book could not be shared.' }
    }
  }

  return { shareBook }
}
