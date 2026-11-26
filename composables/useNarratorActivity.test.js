import { describe, expect, test } from 'vitest'
import { estimateWordTimeline, wordAt, wordEnvelope } from './useNarratorActivity'

describe('narrator activity', () => {
  test('estimates one slot per word, with pauses after punctuation', () => {
    const timeline = estimateWordTimeline('Hello there, friend. Bye')
    expect(timeline).toHaveLength(4)
    const gapAfterComma = timeline[2].start - timeline[1].end
    const gapAfterStop = timeline[3].start - timeline[2].end
    const plainGap = timeline[1].start - timeline[0].end
    expect(plainGap).toBe(0)
    expect(gapAfterComma).toBeGreaterThan(0.1)
    expect(gapAfterStop).toBeGreaterThan(gapAfterComma)
  })

  test('finds the word being spoken at a time', () => {
    const timeline = estimateWordTimeline('one two three')
    expect(wordAt(timeline, -1)).toBe(-1)
    expect(wordAt(timeline, 0)).toBe(0)
    expect(wordAt(timeline, timeline[2].start + 0.01)).toBe(2)
    expect(wordAt(timeline, 999)).toBe(2)
  })

  test('the orb is still in a pause and moves inside a word', () => {
    expect(wordEnvelope(0.5, 0, 0.4)).toBe(0)
    expect(wordEnvelope(0.2, 0, 0.4)).toBeGreaterThan(0.5)
    expect(wordEnvelope(-0.1, 0, 0.4)).toBe(0)
  })
})
