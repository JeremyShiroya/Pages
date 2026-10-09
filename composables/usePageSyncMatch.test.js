import { describe, expect, it } from 'vitest'
import { findPageSyncMatch } from './usePageSyncMatch'

const pages = [
  { page: 12, chunk: 44, text: 'The lantern burned beside the narrow stone bridge. Mara waited for the last train to cross the valley.' },
  { page: 13, chunk: 48, text: 'At dawn the little orchard stood silent. A blue ribbon fluttered near the gate while the children searched the hillside.' },
]

describe('Page Sync matching', () => {
  it('finds the page despite punctuation and case changes', () => {
    expect(findPageSyncMatch('AT DAWN, the little orchard stood silent! A blue ribbon fluttered near the gate.', pages)?.page).toBe(13)
  })

  it('does not move progress for unreadable or unrelated photos', () => {
    expect(findPageSyncMatch('The end', pages)).toBeNull()
    expect(findPageSyncMatch('Silver clouds rolled over the distant harbor as fishermen returned home before the rain', pages)).toBeNull()
  })
})
