import { searchGoodreads, scrapeGoodreadsBook, normalizeGoodreadsImage } from './goodreadsScraper'
import { searchGoogleBooks } from './googleBooksApi'
import { searchOpenLibrary } from './openLibraryApi'
import { searchKobo, scrapeKoboBook } from './koboScraper'
import { searchHardcover } from './hardcoverApi'
import { searchAppleBooksCovers } from './appleBooksApi'
import { addUniqueImage, isUsefulCoverUrl } from './imageSearch'
import { matchesRequestedBook } from '../../utils/bookCoverMatch'

// Shared by the server endpoint and the on-device native search. Only catalog
// records with matching title AND author are eligible; search rank is not proof.
export type CoverImage = { url: string; source: string; label: string }

const SOURCE_LABELS: Record<string, string> = {
  goodreads: 'Goodreads',
  googleBooks: 'Google Books',
  openLibrary: 'Open Library',
  kobo: 'Kobo',
  hardcover: 'Hardcover',
  appleBooks: 'Apple Books',
}

function addCover(images: CoverImage[], seen: Set<string>, url: string | null | undefined, source: string) {
  if (!url) return
  let candidate = normalizeGoodreadsImage(url) || url
  // Open Library returns a 1px blank image for missing covers by default.
  if (candidate.includes('covers.openlibrary.org/')) {
    try {
      const parsed = new URL(candidate)
      parsed.searchParams.set('default', 'false')
      candidate = parsed.toString()
    } catch { return }
  }
  const urls: string[] = []
  addUniqueImage(urls, seen, candidate, isUsefulCoverUrl)
  if (urls.length) images.push({ url: urls[0], source, label: SOURCE_LABELS[source] })
}

function addMatching(
  images: CoverImage[], seen: Set<string>,
  wantedTitle: string, wantedAuthor: string | undefined,
  item: { title?: string | null; author?: string | null; cover?: string | null } | null,
  source: string,
) {
  if (!item || !matchesRequestedBook(wantedTitle, wantedAuthor, item.title, item.author)) return
  addCover(images, seen, item.cover, source)
}

async function matchingOpenLibraryEditions(
  works: Array<{ id: string; title: string; author: string }>,
  title: string,
  author?: string,
) {
  const work = works.find((item) =>
    /^\/works\/OL\d+W$/.test(item.id)
    && matchesRequestedBook(title, author, item.title, item.author))
  if (!work) return [] as Array<{ title: string; author: string; cover: string }>
  try {
    const response = await fetch(`https://openlibrary.org${work.id}/editions.json?limit=40`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return []
    const data = await response.json()
    return (Array.isArray(data.entries) ? data.entries : [])
      .filter((entry: any) => entry.title && Array.isArray(entry.covers) && entry.covers.length)
      .map((entry: any) => ({
        title: String(entry.title),
        author: work.author,
        cover: `https://covers.openlibrary.org/b/id/${Number(entry.covers[0])}-L.jpg`,
      }))
      .filter((entry: { title: string; author: string; cover: string }) =>
        matchesRequestedBook(title, author, entry.title, entry.author))
      .slice(0, 10)
  } catch {
    return []
  }
}

export async function searchBookCovers(title: string, author?: string, _publisher?: string) {
  const [googleResult, openLibraryResult, goodreadsResult, koboResult, hardcoverResult, appleResult] = await Promise.allSettled([
    searchGoogleBooks(title, author),
    searchOpenLibrary(title, author),
    searchGoodreads(title, author),
    searchKobo(title, author),
    searchHardcover(title, author),
    searchAppleBooksCovers(title, author),
  ])
  const google = googleResult.status === 'fulfilled' ? googleResult.value : []
  const openLibrary = openLibraryResult.status === 'fulfilled' ? openLibraryResult.value : []
  const goodreads = goodreadsResult.status === 'fulfilled' ? goodreadsResult.value : []
  const koboUrls = koboResult.status === 'fulfilled' ? koboResult.value : []
  const hardcover = hardcoverResult.status === 'fulfilled' ? hardcoverResult.value : []
  const apple = appleResult.status === 'fulfilled' ? appleResult.value : []

  // Scrape only matching Goodreads results. A broad search can return books by
  // a different author whose title shares words with the query.
  const goodreadsCandidates = goodreads.filter((item) =>
    matchesRequestedBook(title, author, item.title, item.author)).slice(0, 6)
  const [goodreadsDetails, koboDetails, openLibraryEditions] = await Promise.allSettled([
    Promise.allSettled(goodreadsCandidates.map((item) => scrapeGoodreadsBook(item.url, item))),
    Promise.allSettled(koboUrls.slice(0, 5).map((url) => scrapeKoboBook(url))),
    matchingOpenLibraryEditions(openLibrary, title, author),
  ])

  const images: CoverImage[] = []
  const seen = new Set<string>()
  for (const item of goodreadsCandidates) addMatching(images, seen, title, author, item, 'goodreads')
  if (goodreadsDetails.status === 'fulfilled') {
    goodreadsDetails.value.forEach((entry) => {
      if (entry.status === 'fulfilled') addMatching(images, seen, title, author, entry.value, 'goodreads')
    })
  }
  for (const item of google) addMatching(images, seen, title, author, item, 'googleBooks')
  for (const item of openLibrary) addMatching(images, seen, title, author, item, 'openLibrary')
  if (openLibraryEditions.status === 'fulfilled') {
    for (const item of openLibraryEditions.value) addMatching(images, seen, title, author, item, 'openLibrary')
  }
  if (koboDetails.status === 'fulfilled') {
    koboDetails.value.forEach((entry) => {
      if (entry.status === 'fulfilled') addMatching(images, seen, title, author, entry.value, 'kobo')
    })
  }
  for (const item of hardcover) addMatching(images, seen, title, author, item, 'hardcover')
  for (const item of apple) addMatching(images, seen, title, author, item, 'appleBooks')

  return { images: images.slice(0, 24) }
}
