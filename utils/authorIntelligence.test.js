import { describe, expect, it } from 'vitest'
import {
  AUTHOR_DETAILS_VERSION,
  authorDetailsVersion,
  newestAuthorRecordFirst,
} from './authorIntelligence.js'

describe('author intelligence records', () => {
  it('tracks the current identity-aware schema', () => {
    expect(AUTHOR_DETAILS_VERSION).toBe(8)
  })

  it('prefers the newest schema before timestamps', () => {
    const stale = { authorDetailsVersion: 7, updatedAt: '2026-09-17T10:00:00Z' }
    const current = { authorDetailsVersion: 8, updatedAt: '2020-01-01T00:00:00Z' }
    expect([stale, current].sort(newestAuthorRecordFirst)[0]).toBe(current)
    expect(authorDetailsVersion({})).toBe(0)
  })
})
