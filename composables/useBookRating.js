import { computed } from 'vue'
import { parseGoodreadsReview } from '~/composables/useGoodreadsRating'
import { useBookishSettings } from '~/composables/useBookishSettings'

export const RATING_SOURCE_LABELS = Object.freeze({
  goodreads: 'Goodreads',
  storygraph: 'StoryGraph',
  personal: 'Personal Rating',
  none: 'No rating',
})

const finiteRating = (value) => {
  const rating = Number(value)
  return Number.isFinite(rating) && rating > 0 ? rating : 0
}

export const getExternalRating = (book, source) => {
  const saved = book?.externalRatings?.[source]
  const savedRating = finiteRating(saved?.rating)
  if (savedRating) {
    return {
      source,
      rating: savedRating,
      ratingsCount: saved.ratingsCount || null,
      url: saved.url || null,
      fetchedAt: Number(saved.fetchedAt) || null,
    }
  }

  if (source === 'goodreads') {
    const legacy = parseGoodreadsReview(book?.webReview)
    if (legacy.hasRating) {
      return {
        source,
        rating: legacy.rating,
        ratingsCount: legacy.ratingsCount || null,
        url: null,
        fetchedAt: null,
      }
    }
  }
  return null
}

// Personal scores are stored on the historical 0–10 scale. Presenting a five
// point system is therefore lossless: switching back to ten restores the same
// value instead of rewriting every book.
export const personalRatingForScale = (rating, scale = 10) => {
  const normalized = Math.max(0, Math.min(10, Number(rating) || 0))
  return Number(scale) === 5 ? normalized / 2 : normalized
}

export const personalRatingFromScale = (rating, scale = 10) => {
  const selected = Math.max(0, Math.min(Number(scale) === 5 ? 5 : 10, Number(rating) || 0))
  return Number(scale) === 5 ? selected * 2 : selected
}

export const getBookRating = (book, source = 'goodreads', personalScale = 10) => {
  if (source === 'none') return null
  if (source === 'personal') {
    const rating = personalRatingForScale(book?.rating, personalScale)
    return rating > 0
      ? { source, rating, scale: Number(personalScale) === 5 ? 5 : 10, ratingsCount: null }
      : null
  }
  const external = getExternalRating(book, source)
  return external ? { ...external, scale: 5 } : null
}

export const withExternalRating = (book, source, rating) => ({
  ...book,
  externalRatings: {
    ...(book?.externalRatings || {}),
    [source]: {
      rating: finiteRating(rating?.rating),
      ratingsCount: rating?.ratingsCount || null,
      url: rating?.url || null,
      fetchedAt: Number(rating?.fetchedAt) || Date.now(),
    },
  },
})

export const useSelectedBookRating = (book) => {
  const { settings } = useBookishSettings()
  const source = computed(() => settings.value.ratingSource)
  const rating = computed(() => getBookRating(
    book?.value ?? book,
    source.value,
    settings.value.personalRatingScale,
  ))
  return { source, rating, settings }
}
