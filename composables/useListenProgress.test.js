import { describe, expect, it } from 'vitest'
import { estimatedListenTimeline, scopedListenProgress } from './useListenProgress'

describe('Listen time scopes', () => {
  const chunks = Array.from({ length: 4 }, (_, index) => `${index} ${'word '.repeat(144)}`)

  it('calculates full-book and current-chapter time at the selected speed', () => {
    const prefix = estimatedListenTimeline(chunks, 1)
    expect(scopedListenProgress(prefix, 2)).toMatchObject({ total: 240, elapsed: 120, percent: 50 })
    expect(scopedListenProgress(prefix, 2, 1, 2)).toMatchObject({ total: 120, elapsed: 60, percent: 50 })
    expect(scopedListenProgress(prefix, 2, 1, 2, 0.5)).toMatchObject({ total: 120, elapsed: 90, percent: 75 })
    expect(scopedListenProgress(estimatedListenTimeline(chunks, 2), 2).total).toBe(120)
  })

  it('handles books without readable chunks', () => {
    expect(scopedListenProgress(estimatedListenTimeline([]), 0).percent).toBe(0)
  })
})
