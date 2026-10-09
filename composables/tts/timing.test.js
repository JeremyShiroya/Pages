import { describe, expect, it } from 'vitest'
import { chunkIndexAtEstimatedSecond } from './timing'

describe('narration skip timing', () => {
  const chunks = Array.from({ length: 4 }, () => 'word '.repeat(145))

  it('can move across multiple chunks for a longer skip', () => {
    expect(chunkIndexAtEstimatedSecond(chunks, 125, 1)).toBe(2)
    expect(chunkIndexAtEstimatedSecond(chunks, 125, 2)).toBe(3)
  })

  it('clamps skips to the book', () => {
    expect(chunkIndexAtEstimatedSecond(chunks, 999, 1)).toBe(3)
    expect(chunkIndexAtEstimatedSecond(chunks, 0, 1)).toBe(0)
  })
})
