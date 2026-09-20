import { getQuery } from 'h3'
import { searchGoodreads, scrapeGoodreadsBook } from '~/server/utils/goodreadsScraper'
import { searchStoryGraphRating } from '~/server/utils/storyGraphScraper'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const title = String(query.title || '').trim()
  const author = String(query.author || '').trim()
  const source = String(query.source || '').toLowerCase()
  if (!title) throw createError({ statusCode: 400, statusMessage: 'A book title is required.' })
  if (!['goodreads', 'storygraph'].includes(source)) {
    throw createError({ statusCode: 400, statusMessage: 'Unknown rating source.' })
  }

  if (source === 'storygraph') {
    return { source, rating: await searchStoryGraphRating(title, author || undefined) }
  }

  const results = await searchGoodreads(title, author || undefined)
  for (const candidate of results.slice(0, 3)) {
    const details = await scrapeGoodreadsBook(candidate.url, candidate)
    const review = String(details?.webReview || candidate.webReview || '')
    const rating = Number(review.match(/(?:Goodreads\s+)?Rating:\s*([\d.]+)/i)?.[1])
    if (Number.isFinite(rating) && rating > 0) {
      return {
        source,
        rating: {
          rating,
          ratingsCount: review.match(/([\d,]+)\s+ratings?/i)?.[1] || null,
          url: candidate.url,
          fetchedAt: Date.now(),
        },
      }
    }
  }
  return { source, rating: null }
})
