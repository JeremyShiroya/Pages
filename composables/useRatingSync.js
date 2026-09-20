import { reactive, readonly } from 'vue'
import { useApiEndpoint } from '~/composables/useApiEndpoint'
import { isNativeCapacitorPlatform } from '~/composables/useNativePlatform'
import { fetchBookMetadataResults } from '~/composables/useBookMetadataSearch'
import { parseGoodreadsReview } from '~/composables/useGoodreadsRating'
import { getExternalRating, RATING_SOURCE_LABELS, withExternalRating } from '~/composables/useBookRating'

const syncState = reactive({
  running: false,
  source: '',
  current: 0,
  total: 0,
  currentTitle: '',
  updated: 0,
  unavailable: 0,
})

let runPromise = null

export const hasRatingLookup = (book, source) => (
  Boolean(book?.externalRatings?.[source]?.fetchedAt) || Boolean(getExternalRating(book, source))
)

const goodreadsFromMetadata = async (book) => {
  const results = await fetchBookMetadataResults(book.title, book.author || undefined, undefined, { light: true })
  for (const result of results || []) {
    const parsed = parseGoodreadsReview(result?.webReview)
    if (!parsed.hasRating) continue
    return {
      rating: parsed.rating,
      ratingsCount: parsed.ratingsCount,
      url: result.goodreadsUrl || null,
      fetchedAt: Date.now(),
    }
  }
  return null
}

export async function fetchExternalBookRating(book, source) {
  if (source === 'goodreads') return goodreadsFromMetadata(book)
  if (source !== 'storygraph') return null

  const { apiUrl, apiBaseUrl } = useApiEndpoint()
  const native = isNativeCapacitorPlatform()
  if (native && !apiBaseUrl) {
    const { searchStoryGraphRating } = await import('~/server/utils/storyGraphScraper')
    return searchStoryGraphRating(book.title, book.author || undefined)
  }

  try {
    const params = new URLSearchParams({ source, title: book.title })
    if (book.author) params.set('author', book.author)
    const response = await fetch(apiUrl(`/api/books/rating?${params.toString()}`))
    if (!response.ok) throw new Error(`Rating request failed with ${response.status}`)
    return (await response.json()).rating || null
  } catch (error) {
    if (!native) throw error
    const { searchStoryGraphRating } = await import('~/server/utils/storyGraphScraper')
    return searchStoryGraphRating(book.title, book.author || undefined)
  }
}

export const useRatingSync = () => ({
  state: readonly(syncState),
  start: startRatingSync,
})

export function startRatingSync({ source, books, updateBook, addToast } = {}) {
  if (!['goodreads', 'storygraph'].includes(source)) return Promise.resolve(null)
  if (syncState.running) return runPromise

  const library = Array.isArray(books) ? books : []
  const pending = library.filter((book) => !hasRatingLookup(book, source))
  const savedCount = library.length - pending.length
  const label = RATING_SOURCE_LABELS[source]

  if (!pending.length) {
    addToast?.(`${label} ratings are ready from saved data.`, 'info')
    return Promise.resolve({ total: library.length, updated: 0, cached: savedCount, unavailable: 0 })
  }

  if (savedCount > 0) {
    addToast?.(`Using ${savedCount} saved ${label} rating${savedCount === 1 ? '' : 's'} while the rest update.`, 'info')
  }

  Object.assign(syncState, {
    running: true,
    source,
    current: 0,
    total: pending.length,
    currentTitle: '',
    updated: 0,
    unavailable: 0,
  })

  runPromise = (async () => {
    try {
      for (let index = 0; index < pending.length; index += 1) {
        const book = pending[index]
        syncState.current = index + 1
        syncState.currentTitle = book.title
        try {
          const rating = await fetchExternalBookRating(book, source)
          await updateBook(withExternalRating(book, source, rating || { rating: 0, fetchedAt: Date.now() }))
          if (rating?.rating) syncState.updated += 1
          else syncState.unavailable += 1
        } catch {
          // Network/provider failures are deliberately not cached; switching
          // back later gets a genuine retry instead of preserving an outage.
          syncState.unavailable += 1
        }
      }
      const found = syncState.updated
      addToast?.(
        `${label} rating update finished — ${found} of ${pending.length} book${pending.length === 1 ? '' : 's'} found.`,
        found > 0 ? 'success' : 'info',
        5000,
      )
      return { total: library.length, updated: found, cached: savedCount, unavailable: syncState.unavailable }
    } finally {
      syncState.running = false
      syncState.currentTitle = ''
      runPromise = null
    }
  })()

  return runPromise
}
