export type StoryGraphRating = {
  rating: number
  ratingsCount: string | null
  url: string
  fetchedAt: number
}

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
}

const compact = (value: unknown) => String(value || '').replace(/\s+/g, ' ').trim()
const normalize = (value: unknown) => compact(value)
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()

const unwrapUrl = (value: string) => {
  const decoded = value.replace(/&amp;/g, '&')
  try {
    const url = new URL(decoded, 'https://www.google.com')
    const target = url.searchParams.get('q') || url.searchParams.get('uddg') || decoded
    return decodeURIComponent(target)
  } catch {
    return decoded
  }
}

export function parseStoryGraphRating(text: string, url = ''): StoryGraphRating | null {
  const plain = String(text || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
  const ratingMatch = plain.match(/\b([0-5](?:\.\d{1,2})?)\s*(?:\r?\n|\s){0,4}AVERAGE\b/i)
    || plain.match(/average(?:\s+rating)?\s*[:\-]?\s*([0-5](?:\.\d{1,2})?)/i)
  const rating = Number(ratingMatch?.[1])
  if (!Number.isFinite(rating) || rating <= 0 || rating > 5) return null

  const countMatch = plain.match(/([\d,.]+\s*[km]?)\s+(?:reviews|ratings)\s+for\s*:/i)
    || plain.match(/based\s+on\s+([\d,.]+\s*[km]?)/i)
  return {
    rating,
    ratingsCount: countMatch?.[1] || null,
    url,
    fetchedAt: Date.now(),
  }
}

export function storyGraphCandidateUrls(text: string) {
  const matches = String(text || '').match(/(?:https?:\/\/app\.thestorygraph\.com)?\/(?:book_reviews|books)\/[0-9a-f-]{24,}/gi) || []
  return [...new Set(matches.map((match) => {
    const url = unwrapUrl(match)
    return url.startsWith('http') ? url : `https://app.thestorygraph.com${url}`
  }))]
}

const fetchText = async (url: string, fetchFn: typeof fetch) => {
  try {
    const response = await fetchFn(url, { headers })
    return response.ok ? await response.text() : ''
  } catch {
    return ''
  }
}

const pageMatches = (text: string, title: string, author?: string) => {
  const page = normalize(text)
  const wantedTitle = normalize(title)
  const wantedAuthor = normalize(author)
  if (!wantedTitle || !page.includes(wantedTitle)) return false
  return !wantedAuthor || page.includes(wantedAuthor)
}

export async function searchStoryGraphRating(
  title: string,
  author?: string,
  { fetchFn = fetch }: { fetchFn?: typeof fetch } = {},
): Promise<StoryGraphRating | null> {
  if (!compact(title)) return null
  const query = `site:app.thestorygraph.com/book_reviews \"${compact(title)}\" ${compact(author)}`.trim()
  const searchUrls = [
    `https://r.jina.ai/http://www.google.com/search?q=${encodeURIComponent(query)}`,
    `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`,
  ]

  const candidates: string[] = []
  for (const searchUrl of searchUrls) {
    const searchText = await fetchText(searchUrl, fetchFn)
    candidates.push(...storyGraphCandidateUrls(searchText))
    const inline = parseStoryGraphRating(searchText)
    if (inline && pageMatches(searchText, title, author)) return inline
    if (candidates.length) break
  }

  for (const candidate of [...new Set(candidates)].slice(0, 4)) {
    const proxyUrl = `https://r.jina.ai/http://${candidate.replace(/^https?:\/\//, '')}`
    const text = await fetchText(proxyUrl, fetchFn) || await fetchText(candidate, fetchFn)
    if (!pageMatches(text, title, author)) continue
    const rating = parseStoryGraphRating(text, candidate)
    if (rating) return rating
  }
  return null
}
