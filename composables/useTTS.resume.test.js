import { describe, expect, test } from 'vitest'
import {
  dismissStoredTtsSession,
  readStoredTtsSession,
  savedPlaybackChunk,
  writeStoredTtsSession,
} from './useTTS.js'

const memoryStorage = () => {
  const values = new Map()
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  }
}

describe('dismissed narration resume', () => {
  test('keeps the exact sentence checkpoint while marking the player dismissed', () => {
    const storage = memoryStorage()
    writeStoredTtsSession({ bookId: 'book-1', chunkIdx: 1537, totalChunks: 10000, progress: 15 }, storage)

    dismissStoredTtsSession('book-1', storage)

    const saved = readStoredTtsSession(storage)
    expect(saved.dismissed).toBe(true)
    expect(savedPlaybackChunk({ id: 'book-1', progress: 15 }, saved, 10000)).toBe(1537)
  })

  test('does not reuse another book or a checkpoint from changed content', () => {
    const saved = { bookId: 'book-1', chunkIdx: 1537, totalChunks: 10000 }
    expect(savedPlaybackChunk({ id: 'book-2' }, saved, 10000)).toBeNull()
    expect(savedPlaybackChunk({ id: 'book-1' }, saved, 9999)).toBeNull()
  })

  test('does not dismiss another book\'s active session', () => {
    const storage = memoryStorage()
    writeStoredTtsSession({ bookId: 'book-1', chunkIdx: 12, totalChunks: 50 }, storage)
    expect(dismissStoredTtsSession('book-2', storage)).toBeNull()
    expect(readStoredTtsSession(storage).dismissed).toBe(false)
  })
})
