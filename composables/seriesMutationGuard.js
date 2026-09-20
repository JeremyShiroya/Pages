// Shared safety boundary for unattended series-related writes.
// Manual edits remain unrestricted; automatic callers must opt in explicitly.

export const AUTOMATIC_SERIES_FIELDS = Object.freeze([
  'series',
  'seriesInstallment',
  'seriesTotal',
  'seriesChecked',
])

const hasProtectedFlag = (book, field) => (
  book?.userDefined === true
  || (book?.userDefined && typeof book.userDefined === 'object' && (
    book.userDefined[field] === true
    || (field === 'series' && book.userDefined.series === true)
  ))
)

export const isSeriesFieldProtected = (book, field) => (
  hasProtectedFlag(book, field)
  || (field !== 'series' && hasProtectedFlag(book, 'series'))
)

export const isSeriesRepairProtected = (book) => AUTOMATIC_SERIES_FIELDS
  .some((field) => isSeriesFieldProtected(book, field))

export function protectManualSeriesDecision(book) {
  const existing = book?.userDefined
  const userDefined = existing === true
    ? true
    : {
        ...(existing && typeof existing === 'object' ? existing : {}),
        series: true,
        seriesInstallment: true,
        seriesTotal: true,
      }

  return {
    ...book,
    seriesChecked: true,
    userDefined,
  }
}

const comparableSeriesValue = (value) => {
  if (value === null || value === undefined || value === '') return null
  return String(value).trim() || null
}

export const hasManualSeriesDecisionChanged = (before, after) => (
  comparableSeriesValue(before?.series) !== comparableSeriesValue(after?.series)
  || comparableSeriesValue(before?.seriesInstallment) !== comparableSeriesValue(after?.seriesInstallment)
  || comparableSeriesValue(before?.seriesTotal) !== comparableSeriesValue(after?.seriesTotal)
)

const same = (a, b) => (a ?? null) === (b ?? null)

export function validateAutomaticSeriesMutation(before, after, { allowMetadata = false } = {}) {
  if (!before?.id || !after?.id || String(before.id) !== String(after.id)) {
    return { valid: false, reason: 'Automatic series mutation requires the same book record.' }
  }

  for (const field of AUTOMATIC_SERIES_FIELDS) {
    if (!same(before[field], after[field]) && isSeriesFieldProtected(before, field)) {
      return { valid: false, reason: `The user-protected field "${field}" cannot be changed automatically.` }
    }
  }

  if (!allowMetadata) {
    const changed = Object.keys({ ...before, ...after }).filter((field) => (
      !['id', ...AUTOMATIC_SERIES_FIELDS].includes(field) && !same(before[field], after[field])
    ))
    if (changed.length) {
      return { valid: false, reason: `Automatic series repair attempted to change non-series fields: ${changed.join(', ')}.` }
    }
  }

  return { valid: true, reason: 'Automatic mutation passed the series safety boundary.' }
}

export function appendSeriesRepairAudit(entry, storage) {
  const target = storage || (typeof localStorage !== 'undefined' ? localStorage : null)
  if (!target) return
  try {
    const key = 'bookish:series-repair-audit:v1'
    const prior = JSON.parse(target.getItem(key) || '[]')
    const next = Array.isArray(prior) ? prior : []
    next.push({ ...entry, recordedAt: Date.now() })
    target.setItem(key, JSON.stringify(next.slice(-500)))
  } catch {
    // Audit persistence is best effort and must never block a safe write.
  }
}

export function readSeriesRepairAudit(storage) {
  const target = storage || (typeof localStorage !== 'undefined' ? localStorage : null)
  if (!target) return []
  try {
    const parsed = JSON.parse(target.getItem('bookish:series-repair-audit:v1') || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
