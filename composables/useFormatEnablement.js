import { computed } from 'vue'
import {
  SUPPORTED_FORMATS,
  enabledFormatsForMode,
  formatModeFor,
  normalizeEnabledFormats,
  useBookishSettings,
} from '~/composables/useBookishSettings'
import { useBooks } from '~/composables/useBooks'
import { useBookStorage } from '~/composables/useBookStorage'
import { useLibraryStore } from '~/composables/useLibraryStore'
import { coverAssetName, isLocalAssetCover } from '~/composables/useCoverImageCache'
import { useDeviceAssets } from '~/composables/useDeviceAssets'
import {
  readImportRegistry,
  syncDeviceLibrary,
  writeImportRegistry,
} from '~/composables/useDeviceLibrarySync'

// Turning a format OFF is not a filter. The app stops handling that format
// entirely: its books leave the library, and the device scanner stops detecting
// the extension (see selectNewDeviceFiles), so dropping one onto the phone later
// does not bring it back.
//
// The FILES ARE NEVER TOUCHED. This is the whole reason the purge cannot go
// through useBooks().deleteBook: that path deletes the device file and
// tombstones the import registry, which is right for "delete this book" and
// wrong here. Re-enabling a format has to let the next scan re-import from the
// files still sitting on disk.

import { useToast } from '~/composables/useToast'
import { clearUnavailableLibraryFormatFilters } from '~/composables/useLibraryFilters'
import { backfillLibraryMetadata, useLibraryBackfill } from '~/composables/useMetadataBackfill'
import { realignEntireLibrarySeries, runSeriesSuggestionSweep } from '~/composables/useSeriesSuggestions'

let formatRefreshTail = Promise.resolve()
let formatRefreshVersion = 0

export const formatLabel = (format) => (format === 'pdf' ? 'PDF' : 'EPUB')

export const booksOfFormat = (books, format) => (
  (books || []).filter((book) => String(book?.format || '').toLowerCase() === format)
)

// Formats that are on now and would be off after the change.
export const formatsRemovedBy = (currentFormats, nextFormats) => {
  const next = normalizeEnabledFormats(nextFormats)
  return normalizeEnabledFormats(currentFormats).filter((format) => !next.includes(format))
}

// Formats that are off now and would be on after the change.
export const formatsAddedBy = (currentFormats, nextFormats) => {
  const next = normalizeEnabledFormats(nextFormats)
  const current = normalizeEnabledFormats(currentFormats)
  return next.filter((format) => !current.includes(format))
}

export const useFormatEnablement = () => {
  const nuxtApp = useNuxtApp()
  const { settings, updateSettings } = useBookishSettings()
  const { books, seriesList, updateBook, fetchAllData } = useBooks()
  const { addToast } = useToast()

  const enabledFormats = computed(() => normalizeEnabledFormats(settings.value.enabledFormats))
  const formatMode = computed(() => formatModeFor(enabledFormats.value))

  // How many books a mode change would remove, so the confirmation can say the
  // number out loud rather than asking the user to guess.
  const countAffected = (nextFormats) => formatsRemovedBy(enabledFormats.value, nextFormats)
    .reduce((total, format) => total + booksOfFormat(books.value, format).length, 0)

  // Record + cached content + cached cover. Not the file.
  const purgeBook = async (book) => {
    const store = useLibraryStore()
    const { deleteBookContent } = useBookStorage()

    await Promise.all([
      store.deleteBook(book.id),
      import.meta.client ? deleteBookContent(book.id) : Promise.resolve(),
    ])

    if (import.meta.client) {
      try {
        const registry = readImportRegistry()
        let registryChanged = false

        for (const key of Object.keys(registry)) {
          const item = registry[key]
          if (item?.bookId === book.id || key === book.path || key === book.id) {
            delete registry[key]
            registryChanged = true
          }
        }
        if (registryChanged) writeImportRegistry(registry)
      } catch (error) {
        console.warn('[Formats] Could not clean registry for purged book:', error)
      }
    }

    if (!import.meta.client) return
    try {
      const name = coverAssetName(book.cover)
      if (name && isLocalAssetCover(book.cover)) await useDeviceAssets().remove('covers', name)
    } catch (error) {
      // An orphaned cover file is harmless; a failed purge is not.
      console.warn('[Formats] Could not remove a cached cover:', error)
    }
  }

  /**
   * Apply an app-level format choice, purging the books it removes.
   * @returns {Promise<{removed: number, formats: string[]}>}
   */
  const applyEnabledFormats = async (nextFormats) => {
    const current = enabledFormats.value
    const next = normalizeEnabledFormats(nextFormats)
    const removedFormats = formatsRemovedBy(current, next)
    const addedFormats = formatsAddedBy(current, next)

    // Write the setting FIRST. Reset formatFilter to 'all' whenever format enablement changes,
    // so a lingering formatFilter never hides all books after changing modes.
    updateSettings({
      enabledFormats: next,
      formatFilter: 'all',
      formatChoiceMade: true,
    })
    clearUnavailableLibraryFormatFilters(next)

    let removed = 0
    if (removedFormats.length > 0) {
      const removedLabel = removedFormats.map(formatLabel).join(' and ')
      for (const format of removedFormats) {
        for (const book of booksOfFormat(books.value, format)) {
          try {
            await purgeBook(book)
            removed += 1
          } catch (error) {
            console.error('[Formats] Could not remove a book during format purge:', error)
          }
        }
      }
      if (removed > 0) {
        addToast(`Removed ${removed} ${removedLabel} book${removed === 1 ? '' : 's'} from your library.`, 'info')
      } else {
        addToast(`Removed ${removedLabel} format.`, 'info')
      }
      await fetchAllData(true)
    }

    if (import.meta.client) {
      // The same full detail and series pass as Storage → Update book details
      // runs after the phone scan. Keep it outside the preference confirmation:
      // hundreds of network lookups must not pin its Remove button on screen.
      const version = ++formatRefreshVersion
      const scanPromise = nuxtApp.runWithContext(() => syncDeviceLibrary({
        silent: false,
        backfillImported: false,
      }))
      const updateExistingBook = (record, options) => {
        const current = books.value.find((book) => book.id === record?.id)
        if (!current || !enabledFormats.value.includes(String(current.format).toLowerCase())) return null
        return updateBook(record, options)
      }
      formatRefreshTail = formatRefreshTail.catch(() => {}).then(async () => {
        await scanPromise
        if (version !== formatRefreshVersion) return
        const backfill = nuxtApp.runWithContext(() => useLibraryBackfill())
        if (backfill.state.running) await backfill.start({ books: books.value, updateBook })
        if (version !== formatRefreshVersion) return
        await backfillLibraryMetadata({
          books: [...books.value],
          updateBook: updateExistingBook,
          shouldStop: () => version !== formatRefreshVersion,
        })
        if (version !== formatRefreshVersion) return
        await nuxtApp.runWithContext(() => realignEntireLibrarySeries({
          books: [...books.value], seriesList: seriesList.value, updateBook: updateExistingBook,
        }))
        if (settings.value.seriesSuggestions === true && version === formatRefreshVersion) {
          await nuxtApp.runWithContext(() => runSeriesSuggestionSweep({ seriesList, settings }))
        }
      }).catch((error) => {
        console.warn('[Formats] Could not finish the full library refresh:', error)
        addToast('Book details could not be fully updated. You can retry from Storage.', 'error')
      })
    }

    if (removedFormats.length === 0 && addedFormats.length === 0) {
      await fetchAllData(true)
    }

    return { removed, addedFormats, removedFormats }
  }

  const applyFormatMode = (mode) => applyEnabledFormats(enabledFormatsForMode(mode))

  // The first-boot chooser has not been answered yet.
  const needsFormatChoice = computed(() => settings.value.formatChoiceMade !== true)

  const dismissFormatChoice = () => updateSettings({ formatChoiceMade: true })

  return {
    enabledFormats,
    formatMode,
    supportedFormats: SUPPORTED_FORMATS,
    countAffected,
    applyEnabledFormats,
    applyFormatMode,
    needsFormatChoice,
    dismissFormatChoice,
  }
}
