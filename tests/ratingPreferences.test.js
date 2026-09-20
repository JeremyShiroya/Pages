import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  getBookRating,
  getExternalRating,
  personalRatingForScale,
  personalRatingFromScale,
  withExternalRating,
} from '../composables/useBookRating.js'
import { parseStoryGraphRating, storyGraphCandidateUrls } from '../server/utils/storyGraphScraper.ts'
import { startRatingSync } from '../composables/useRatingSync.js'

describe('rating preferences', () => {
  it('keeps the compact visual contract: provider mark, stars, and a plain score', () => {
    const ratingDisplay = readFileSync(resolve(process.cwd(), 'components/shared/BookRatingDisplay.vue'), 'utf8')
    const progressDisplay = readFileSync(resolve(process.cwd(), 'components/shared/BookProgressDisplay.vue'), 'utf8')

    expect(ratingDisplay).toContain('<RatingProviderIcon :source="source" />')
    expect(ratingDisplay).toContain('goodreads-stars')
    expect(ratingDisplay).toContain('{{ formattedScore }}</strong>')
    expect(ratingDisplay).not.toContain('/{{ rating.scale }}')
    expect(progressDisplay).toContain('class="progress-track"')
    expect(progressDisplay).toContain('class="progress-fill"')
    expect(progressDisplay).not.toContain('<svg')
    expect(progressDisplay).not.toContain('progress-ring')
  })

  it('keeps personal ratings lossless while switching scales', () => {
    expect(personalRatingForScale(8, 5)).toBe(4)
    expect(personalRatingFromScale(4, 5)).toBe(8)
    expect(getBookRating({ rating: 8 }, 'personal', 5)).toMatchObject({ rating: 4, scale: 5 })
    expect(getBookRating({ rating: 8 }, 'personal', 10)).toMatchObject({ rating: 8, scale: 10 })
  })

  it('hides saved ratings when the no-rating preference is selected', () => {
    const book = { rating: 8, externalRatings: { goodreads: { rating: 4.2 } } }
    expect(getBookRating(book, 'none')).toBeNull()
    expect(getBookRating(book, 'goodreads')).toMatchObject({ rating: 4.2 })
  })

  it('retains source-specific ratings independently', () => {
    const goodreads = withExternalRating({ id: 1 }, 'goodreads', { rating: 4.2 })
    const both = withExternalRating(goodreads, 'storygraph', { rating: 4.35 })
    expect(getExternalRating(both, 'goodreads').rating).toBe(4.2)
    expect(getExternalRating(both, 'storygraph').rating).toBe(4.35)
  })

  it('reads legacy Goodreads reviews without destroying them', () => {
    expect(getExternalRating({ webReview: 'Goodreads Rating: 4.28/5' }, 'goodreads').rating).toBe(4.28)
  })

  it('parses StoryGraph averages and candidate pages', () => {
    expect(parseStoryGraphRating('36.8k reviews for: Dune 4.15 AVERAGE', 'https://example.test')).toMatchObject({
      rating: 4.15,
      ratingsCount: '36.8k',
    })
    expect(storyGraphCandidateUrls('https://app.thestorygraph.com/book_reviews/f25cdb32-62f8-47b6-ba0a-022f5bed8296'))
      .toEqual(['https://app.thestorygraph.com/book_reviews/f25cdb32-62f8-47b6-ba0a-022f5bed8296'])
  })

  it('reuses saved provider data and announces it without a network lookup', async () => {
    const messages = []
    const result = await startRatingSync({
      source: 'goodreads',
      books: [
        { id: 1, webReview: 'Goodreads Rating: 4.1/5' },
        { id: 2, externalRatings: { goodreads: { rating: 3.9, fetchedAt: 1 } } },
      ],
      updateBook: async () => { throw new Error('should not update') },
      addToast: (message) => messages.push(message),
    })
    expect(result).toMatchObject({ cached: 2, updated: 0 })
    expect(messages[0]).toContain('ready from saved data')
  })
})
