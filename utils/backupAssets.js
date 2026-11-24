// Heavy per-book fields are stored outside the library snapshot.
//
// Book records can carry an embedded cover (a data: URL, already-compressed
// image bytes that gzip cannot shrink) and, on older libraries, the book's
// extracted text. Together they made a 109-book snapshot 71 MB. Kept inline,
// every backup re-sent all of it and a growing library would hit the 50 MB
// object limit.
//
// Instead each book's heavy fields go into their own object, named by the
// SHA-256 of their content:
//   - unchanged books are never uploaded twice (the name already exists)
//   - identical covers are stored once
//   - older snapshot versions keep working, because an object's name IS its
//     content, so it is never overwritten with something else
// The snapshot keeps a small marker in their place. Restoring puts the exact
// same values back: nothing is re-encoded or resized.

export const ASSET_MARKER = '__backupAsset'

const MIN_COVER_CHARS = 2048
const MIN_CONTENT_CHARS = 4096

function isHeavy(field, value) {
  if (value === null || value === undefined) return false
  if (field === 'cover') return typeof value === 'string' && value.startsWith('data:') && value.length >= MIN_COVER_CHARS
  if (field === 'content') {
    const length = typeof value === 'string' ? value.length : JSON.stringify(value).length
    return length >= MIN_CONTENT_CHARS
  }
  return false
}

export const HEAVY_BOOK_FIELDS = Object.freeze(['cover', 'content'])

/**
 * @returns {{ light: object, heavy: object|null }} heavy is null when the
 *   record has nothing worth moving out.
 */
export function splitHeavyFields(record) {
  if (!record || typeof record !== 'object') return { light: record, heavy: null }
  const heavy = {}
  for (const field of HEAVY_BOOK_FIELDS) {
    if (isHeavy(field, record[field])) heavy[field] = record[field]
  }
  if (!Object.keys(heavy).length) return { light: record, heavy: null }
  const light = { ...record }
  for (const field of Object.keys(heavy)) delete light[field]
  return { light, heavy }
}

export function markAsset(light, sha256, fields) {
  return { ...light, [ASSET_MARKER]: { sha256, fields } }
}

export function assetRef(record) {
  return record?.[ASSET_MARKER] || null
}

export function mergeHeavyFields(record, heavy) {
  const merged = { ...record, ...heavy }
  delete merged[ASSET_MARKER]
  return merged
}
