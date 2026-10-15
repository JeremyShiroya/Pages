// @vitest-environment node
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLibraryStore, openLibraryDB } from './useLibraryStore'
import { openReadingPosition, POSITION_PREFIX } from './readingPositionStore'
import { buildLocationIndex, textAnchor, resolveTextAnchor, pdfViewportLocation } from '../utils/readingLocation'
import { resolveStartChunk, readingPositionUpdate } from './useReadingPosition'

let local
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  const values = new Map()
  local = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
})
const location = (page, chunk = 0) => ({ version: 1, format: 'pdf', view: 'original', chunk, section: 0, pdfPage: page, pdfOffset: 0.42 })
const summary = { progress: 0, status: 'Reading' }
const book = () => useLibraryStore().addBook({ title: 'Reader', format: 'pdf', progress: 0, status: 'Unread' })
const read = async () => (await useLibraryStore().getBooks())[0]

describe('durable reader checkpoints', () => {
  it('saves early scanned PDF pages even when progress and chunk are identical', async () => {
    const b = await book()
    const writer = await openReadingPosition(b.id, { storage: local, mirror: null })
    writer.capture(location(2), summary)
    await writer.flush()
    writer.capture(location(3), summary)
    await writer.close()
    const reopened = await openReadingPosition(b.id, { storage: local, mirror: null })
    expect(reopened.book.readingPosition).toEqual(location(3))
    expect(reopened.book.readingPdfPage).toBe(3)
    await reopened.close()
  })

  it('journals immediately and recovers a checkpoint whose DB transaction never ran', async () => {
    const b = await book()
    const first = await openReadingPosition(b.id, { storage: local, mirror: null })
    await first.close()
    local.setItem(POSITION_PREFIX + b.id, JSON.stringify({ bookId: b.id, epoch: first.book.readingPositionEpoch,
      sequence: 1, position: location(74), summary }))
    const reopened = await openReadingPosition(b.id, { storage: local, mirror: null })
    expect(reopened.book.readingPosition.pdfPage).toBe(74)
    await reopened.close()
  })

  it('recovers native mirror data if WebView localStorage was cleared', async () => {
    const b = await book()
    const first = await openReadingPosition(b.id, { storage: local, mirror: null })
    await first.close()
    const checkpoint = { bookId: b.id, epoch: first.book.readingPositionEpoch, sequence: 8, position: location(81), summary }
    const mirror = { get: async () => ({ value: JSON.stringify(checkpoint) }), set: async () => {} }
    const reopened = await openReadingPosition(b.id, { storage: local, mirror })
    expect(reopened.book.readingPdfPage).toBe(81)
    await reopened.close()
  })

  it('rejects an old reader and permits intentional backward movement in the new session', async () => {
    const b = await book()
    const old = await openReadingPosition(b.id, { storage: local, mirror: null })
    const current = await openReadingPosition(b.id, { storage: local, mirror: null })
    current.capture(location(90), summary)
    await current.flush()
    old.capture(location(1), summary)
    await expect(old.flush()).rejects.toThrow('replaced')
    current.capture(location(12), summary)
    await current.close()
    expect((await read()).readingPdfPage).toBe(12)
    await old.close().catch(() => {})
  })

  it('never restores stale position fields from a slow metadata edit', async () => {
    const b = await book()
    const writer = await openReadingPosition(b.id, { storage: local, mirror: null })
    writer.capture(location(44), { progress: 43, status: 'Reading' })
    await writer.flush()
    await useLibraryStore().updateBook({ ...b, title: 'Renamed' })
    expect(await read()).toMatchObject({ title: 'Renamed', progress: 43, readingPdfPage: 44 })
    await writer.close()
  })

  it('retries a failed save of an unchanged location without optimistic loss', async () => {
    const b = await book()
    const onError = vi.fn()
    const writer = await openReadingPosition(b.id, { storage: local, mirror: null, onError })
    const original = indexedDB.open.bind(indexedDB)
    const spy = vi.spyOn(indexedDB, 'open').mockImplementation(() => { throw new Error('Storage temporarily unavailable') })
    writer.capture(location(50), summary)
    expect(JSON.parse(local.getItem(POSITION_PREFIX + b.id)).position.pdfPage).toBe(50)
    await expect(writer.flush()).rejects.toThrow('temporarily')
    spy.mockImplementation(original)
    await writer.flush()
    expect((await read()).readingPdfPage).toBe(50)
    expect(onError).toHaveBeenCalled()
    await writer.close()
    spy.mockRestore()
  })

  it('coalesces a long uninterrupted burst, preserving the last page and one bounded journal', async () => {
    const b = await book()
    const writer = await openReadingPosition(b.id, { storage: local, mirror: null })
    for (let page = 1; page <= 10000; page++) writer.capture(location(page), summary)
    await writer.close()
    expect((await read()).readingPdfPage).toBe(10000)
    expect(local.getItem(POSITION_PREFIX + b.id).length).toBeLessThan(2048)
  })

  it('does not recreate a deleted book from a late save', async () => {
    const b = await book()
    const writer = await openReadingPosition(b.id, { storage: local, mirror: null })
    await useLibraryStore().deleteBook(b.id)
    writer.capture(location(15), summary)
    await expect(writer.flush()).rejects.toThrow('no longer')
    expect(await useLibraryStore().getBooks()).toEqual([])
    await writer.close().catch(() => {})
  })

  it('ignores a corrupt journal and keeps the previous valid stored checkpoint', async () => {
    const b = await book()
    const writer = await openReadingPosition(b.id, { storage: local, mirror: null })
    writer.capture(location(9), summary)
    await writer.close()
    local.setItem(POSITION_PREFIX + b.id, '{broken')
    const next = await openReadingPosition(b.id, { storage: local, mirror: null })
    expect(next.book.readingPdfPage).toBe(9)
    await next.close()
  })
})

describe('stable content anchors', () => {
  it('uses legacy progress when chunk is null, absent or empty, while preserving explicit zero', () => {
    for (const value of [null, undefined, '']) expect(resolveStartChunk({ readingChunk: value, progress: 50 }, 1001)).toBe(500)
    expect(resolveStartChunk({ readingChunk: 0, progress: 50 }, 1001)).toBe(0)
  })
  it('compares PDF page identity independently of rounded progress', () => {
    expect(readingPositionUpdate({ readingChunk: 0, progress: 0, status: 'Reading', readingPdfPage: 2 },
      { chunk: 0, progress: 0, status: 'Reading', pdfPage: 3 })).toMatchObject({ readingPdfPage: 3 })
  })
  it('restores the same text after changing chunk boundaries', () => {
    const before = buildLocationIndex(['First sentence. Second sentence.', 'Third sentence.'])
    const anchor = textAnchor(before, 0, 16)
    const after = buildLocationIndex(['First sentence.', 'Second sentence.', 'Third sentence.'])
    expect(resolveTextAnchor(after, anchor)).toEqual({ chunk: 1, charOffset: 0 })
  })
  it('uses context to find a repeated passage after content before it changes', () => {
    const before = buildLocationIndex(['First heading.', 'Same words.', 'Second heading.', 'Same words.'])
    const anchor = textAnchor(before, 3)
    const after = buildLocationIndex(['New introduction.', 'First heading.', 'Same words.', 'Second heading.', 'Same words.'])
    expect(resolveTextAnchor(after, anchor).chunk).toBe(4)
  })
  it('records scale-independent PDF offsets', () => {
    expect(pdfViewportLocation(5, { top: -444, height: 1000 })).toMatchObject({ pdfPage: 5, pdfOffset: 0.5 })
  })
})
