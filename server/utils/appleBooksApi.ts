export type AppleBookCover = {
  title: string
  author: string
  cover: string
}

const cache = new Map<string, { until: number; results: AppleBookCover[] }>()

/** Apple's public catalog gives a verified title and author for each artwork URL. */
export async function searchAppleBooksCovers(title: string, _author?: string): Promise<AppleBookCover[]> {
  const key = title.trim().toLowerCase()
  const cached = cache.get(key)
  if (cached && cached.until > Date.now()) return cached.results

  try {
    const params = new URLSearchParams({
      // Apple heavily broadens combined title+author searches. Title-only
      // retrieves the editions; the shared identity filter applies author.
      term: title,
      media: 'ebook',
      entity: 'ebook',
      country: 'us',
      limit: '25',
    })
    const response = await fetch(`https://itunes.apple.com/search?${params}`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return []
    const data = await response.json()
    const results = (Array.isArray(data.results) ? data.results : [])
      .filter((item: any) => item.kind === 'ebook' && item.trackName && item.artistName && item.artworkUrl100)
      .map((item: any) => ({
        title: String(item.trackName),
        author: String(item.artistName),
        cover: String(item.artworkUrl100)
          .replace(/^http:\/\//i, 'https://')
          .replace(/\/100x100(?:bb)?\.(jpe?g|png)(?:\?.*)?$/i, '/600x600bb.$1'),
      }))
    cache.set(key, { until: Date.now() + 5 * 60_000, results })
    return results
  } catch {
    return []
  }
}
