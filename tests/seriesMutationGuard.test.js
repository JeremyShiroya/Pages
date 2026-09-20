import { describe, expect, test } from 'vitest'
import {
  hasManualSeriesDecisionChanged,
  isSeriesRepairProtected,
  protectManualSeriesDecision,
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

  test('persists a manual standalone decision as protected', () => {
    const original = { id: 'book-1', series: 'Wrong Series', seriesInstallment: 1, seriesTotal: 2 }
    const standalone = { ...original, series: null, seriesInstallment: null, seriesTotal: null }

    expect(hasManualSeriesDecisionChanged(original, standalone)).toBe(true)
    expect(protectManualSeriesDecision(standalone)).toMatchObject({
      series: null,
      seriesChecked: true,
      userDefined: { series: true, seriesInstallment: true, seriesTotal: true },
    })
  })

  test('does not report untouched series fields as a manual decision', () => {
    const book = { id: 'book-1', series: null, seriesInstallment: null, seriesTotal: null }
    expect(hasManualSeriesDecisionChanged(book, { ...book })).toBe(false)
  })
})
