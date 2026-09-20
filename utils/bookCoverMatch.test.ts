import { describe, expect, it } from 'vitest'
import { matchesRequestedBook } from './bookCoverMatch'

describe('cover identity matching', () => {
  it('accepts editions and author punctuation variations', () => {
    expect(matchesRequestedBook('The Girl Before', 'J P Delaney', 'The Girl Before: A Novel', 'JP Delaney')).toBe(true)
    expect(matchesRequestedBook('1984', 'George Orwell', '1984 (Signet Classics)', 'George Orwell')).toBe(true)
  })

  it('permits a one-letter title typo only when the author agrees', () => {
    expect(matchesRequestedBook('The Girl Befor', 'J P Delaney', 'The Girl Before', 'J. P. Delaney')).toBe(true)
    expect(matchesRequestedBook('The Girl Befor', undefined, 'The Girl Before', 'J. P. Delaney')).toBe(false)
  })

  it('rejects similar titles, other authors, and missing author evidence', () => {
    expect(matchesRequestedBook('The Girl Before', 'J P Delaney', 'Playing Nice', 'J P Delaney')).toBe(false)
    expect(matchesRequestedBook('The Girl Before', 'J P Delaney', 'The Girl Before', 'Rena Olsen')).toBe(false)
    expect(matchesRequestedBook('The Girl Before', 'J P Delaney', 'A Girl Before the Mast', 'J P Delaney')).toBe(false)
    expect(matchesRequestedBook('The Girl Before', 'J P Delaney', 'The Girl Before', '')).toBe(false)
    expect(matchesRequestedBook('1984', 'George Orwell', '1984 Study Guide', 'George Orwell')).toBe(false)
  })
})
