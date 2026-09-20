import { beforeEach, describe, expect, it, vi } from 'vitest'
import { searchBookCovers } from './coverSearch'
import { searchGoogleBooks } from './googleBooksApi'
import { searchOpenLibrary } from './openLibraryApi'
import { searchGoodreads, scrapeGoodreadsBook } from './goodreadsScraper'
import { searchKobo } from './koboScraper'
import { searchHardcover } from './hardcoverApi'
import { searchAppleBooksCovers } from './appleBooksApi'

vi.mock('./googleBooksApi', () => ({ searchGoogleBooks: vi.fn() }))
vi.mock('./openLibraryApi', () => ({ searchOpenLibrary: vi.fn() }))
vi.mock('./goodreadsScraper', () => ({ searchGoodreads: vi.fn(), scrapeGoodreadsBook: vi.fn(), normalizeGoodreadsImage: (url: string) => url }))
vi.mock('./koboScraper', () => ({ searchKobo: vi.fn(), scrapeKoboBook: vi.fn() }))
vi.mock('./hardcoverApi', () => ({ searchHardcover: vi.fn() }))
vi.mock('./appleBooksApi', () => ({ searchAppleBooksCovers: vi.fn() }))

beforeEach(() => {
  vi.mocked(searchGoogleBooks).mockResolvedValue([])
  vi.mocked(searchOpenLibrary).mockResolvedValue([])
  vi.mocked(searchGoodreads).mockResolvedValue([])
  vi.mocked(searchKobo).mockResolvedValue([])
  vi.mocked(searchHardcover).mockResolvedValue([])
  vi.mocked(searchAppleBooksCovers).mockResolvedValue([])
  vi.mocked(scrapeGoodreadsBook).mockResolvedValue(null)
  vi.stubGlobal('fetch', vi.fn())
})

describe('catalog cover search', () => {
  it('shows only the requested title and author, including Apple Books', async () => {
    vi.mocked(searchGoogleBooks).mockResolvedValue([
      { title: 'The Girl Before', author: 'J P Delaney', cover: 'https://books.google.com/books/content?id=real', blurb: null, genre: null, publishYear: null, publisher: null, series: null, seriesInstallment: null, seriesTotal: null },
      { title: 'Playing Nice', author: 'J P Delaney', cover: 'https://books.google.com/books/content?id=other', blurb: null, genre: null, publishYear: null, publisher: null, series: null, seriesInstallment: null, seriesTotal: null },
      { title: 'The Girl Before', author: 'Rena Olsen', cover: 'https://books.google.com/books/content?id=wrong-author', blurb: null, genre: null, publishYear: null, publisher: null, series: null, seriesInstallment: null, seriesTotal: null },
      { title: 'The Girl Before', author: 'J P Delaney', cover: 'https://example.com/image-not-available.jpg', blurb: null, genre: null, publishYear: null, publisher: null, series: null, seriesInstallment: null, seriesTotal: null },
    ])
    vi.mocked(searchAppleBooksCovers).mockResolvedValue([
      { title: 'The Girl Before', author: 'JP Delaney', cover: 'https://is1-ssl.mzstatic.com/image/thumb/real/600x600bb.jpg' },
      { title: 'The Girl Before', author: 'Rena Olsen', cover: 'https://is1-ssl.mzstatic.com/image/thumb/wrong/600x600bb.jpg' },
    ])

    const result = await searchBookCovers('The Girl Before', 'J P Delaney')
    expect(result.images.map((image) => image.source)).toEqual(['googleBooks', 'appleBooks'])
    expect(result.images.map((image) => image.url)).toEqual([
      'https://books.google.com/books/content?id=real',
      'https://is1-ssl.mzstatic.com/image/thumb/real/600x600bb.jpg',
    ])
  })

  it('gets varied covers from editions of a verified Open Library work', async () => {
    vi.mocked(searchOpenLibrary).mockResolvedValue([{
      id: '/works/OL123W', title: '1984', author: 'George Orwell', cover: 'https://covers.openlibrary.org/b/id/1-L.jpg',
      blurb: null, series: null, seriesInstallment: null, seriesTotal: null, genre: null, publishYear: null, publisher: null, isbn13s: [],
    }])
    vi.mocked(globalThis.fetch).mockResolvedValue({ ok: true, json: async () => ({ entries: [
      { title: '1984', covers: [2] },
      { title: '1984 Study Guide', covers: [3] },
    ] }) } as Response)

    const result = await searchBookCovers('1984', 'George Orwell')
    expect(result.images.map((image) => image.url)).toEqual([
      'https://covers.openlibrary.org/b/id/1-L.jpg?default=false',
      'https://covers.openlibrary.org/b/id/2-L.jpg?default=false',
    ])
    expect(globalThis.fetch).toHaveBeenCalledWith('https://openlibrary.org/works/OL123W/editions.json?limit=40', expect.any(Object))
  })
})
