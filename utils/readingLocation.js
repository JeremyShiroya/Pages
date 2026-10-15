// Persist content coordinates, not a rounded percentage or a screen number.
const clean = value => String(value || '').replace(/[\u00ad\u200b-\u200d\ufeff]/g, '').replace(/\s+/g, ' ').trim()
const integer = value => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
const unit = value => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0
export const READING_POSITION_FIELDS = Object.freeze([
  'readingPosition', 'previousReadingPosition', 'readingPositionEpoch', 'readingPositionSequence',
  'readingChunk', 'readingPdfPage', 'readingPdfView',
])

export function validReadingLocation(value) {
  if (!value || value.version !== 1 || !['epub', 'pdf'].includes(value.format)) return false
  if (!integer(value.chunk) || !integer(value.section)) return false
  if (value.format === 'pdf' && (!integer(value.pdfPage) || value.pdfPage < 1)) return false
  try { return JSON.stringify(value).length <= 8192 } catch { return false }
}

export function buildLocationIndex(chunks = []) {
  const starts = []
  const texts = chunks.map(clean)
  let length = 0
  for (const text of texts) { starts.push(length); length += text.length + 1 }
  const text = texts.join(' ')
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  return { starts, texts, text, fingerprint: `${text.length}:${hash >>> 0}` }
}

export function textAnchor(index, chunk, charOffset = 0) {
  const offset = (index.starts[chunk] || 0) + Math.max(0, Math.min(index.texts[chunk]?.length || 0, charOffset))
  return {
    fingerprint: index.fingerprint, offset,
    quote: index.text.slice(offset, offset + 96),
    prefix: index.text.slice(Math.max(0, offset - 48), offset),
  }
}

export function resolveTextAnchor(index, anchor, fallbackChunk = 0) {
  let offset = anchor?.fingerprint === index.fingerprint && integer(anchor?.offset) ? anchor.offset : -1
  if (offset < 0 && anchor?.quote) {
    let at = index.text.indexOf(anchor.quote)
    let best = -1
    let distance = Infinity
    while (at >= 0) {
      const prefixMatches = !anchor.prefix || index.text.slice(Math.max(0, at - anchor.prefix.length), at) === anchor.prefix
      const score = Math.abs(at - (Number(anchor.offset) || 0)) + (prefixMatches ? 0 : index.text.length)
      if (score < distance) { distance = score; best = at }
      at = index.text.indexOf(anchor.quote, at + 1)
    }
    offset = best
  }
  if (offset < 0) return { chunk: Math.max(0, Math.min(index.texts.length - 1, fallbackChunk)), charOffset: 0 }
  let lo = 0; let hi = index.starts.length - 1
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (index.starts[mid] <= offset) lo = mid
    else hi = mid - 1
  }
  return { chunk: lo, charOffset: Math.max(0, Math.min(index.texts[lo]?.length || 0, offset - (index.starts[lo] || 0))) }
}

export function pdfViewportLocation(page, rect, anchorY = 56, scrollLeft = 0, scrollWidth = 0, clientWidth = 0) {
  return {
    pdfPage: Math.max(1, Math.floor(page)),
    pdfOffset: unit((anchorY - rect.top) / Math.max(1, rect.height)),
    pdfHorizontal: unit(scrollLeft / Math.max(1, scrollWidth - clientWidth)),
  }
}

export function sameReadingLocation(a, b) {
  return !!a && !!b && JSON.stringify(a) === JSON.stringify(b)
}
