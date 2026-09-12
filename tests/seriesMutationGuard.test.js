import { describe, expect, test } from 'vitest'
import {
  isSeriesRepairProtected,
  validateAutomaticSeriesMutation,
} from '../composables/seriesMutationGuard.js'

describe('automatic series mutation safety boundary', () => {
  test('protects whole records and field-level overrides', () => {
    expect(isSeriesRepairProtected({ userDefined: true })).toBe(true)
    expect(isSeriesRepairProtected({ userDefined: { seriesTotal: true } })).toBe(true)
    expect(isSeriesRepairProtected({ userDefined: {} })).toBe(false)
  })

  test('rejects automatic changes to protected series values', () => {
    const before = { id: 'book-1', series: 'Custom', seriesTotal: 1, userDefined: { series: true } }
    const after = { ...before, series: 'Provider Series' }
    expect(validateAutomaticSeriesMutation(before, after).valid).toBe(false)
  })

  test('allows safe series-only changes and rejects unrelated changes', () => {
    const before = { id: 'book-1', title: 'Dune', series: null, seriesTotal: null }
    const after = { ...before, series: 'Dune', seriesTotal: 6 }
    expect(validateAutomaticSeriesMutation(before, after).valid).toBe(true)
    expect(validateAutomaticSeriesMutation(before, { ...after, title: 'Changed' }).valid).toBe(false)
    expect(validateAutomaticSeriesMutation(before, { ...after, title: 'Changed' }, { allowMetadata: true }).valid).toBe(true)
  })
})
