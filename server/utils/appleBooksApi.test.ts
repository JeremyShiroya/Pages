import { describe, expect, it, vi } from 'vitest'
import { searchAppleBooksCovers } from './appleBooksApi'

describe('Apple Books covers', () => {
  it('searches by title and upgrades artwork while preserving catalog identity', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ results: [
        { kind: 'ebook', trackName: 'The Girl Before', artistName: 'J.P. Delaney', artworkUrl100: 'http://is1-ssl.mzstatic.com/image/thumb/real/100x100bb.jpg' },
      ] }),
    } as Response)
    const results = await searchAppleBooksCovers('The Girl Before', 'J P Delaney')
    expect(results).toEqual([{
      title: 'The Girl Before',
      author: 'J.P. Delaney',
      cover: 'https://is1-ssl.mzstatic.com/image/thumb/real/600x600bb.jpg',
    }])
    expect(String(fetchSpy.mock.calls[0][0])).toContain('term=The+Girl+Before&')
    expect(String(fetchSpy.mock.calls[0][0])).not.toContain('Delaney')
    fetchSpy.mockRestore()
  })
})
