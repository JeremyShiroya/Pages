// Shared sentence-chunk → DOM-span mapping.
//
// Wraps every readable chunk of a rendered section in a
// `<span data-tts-chunk="N">` so narration can highlight the exact sentence.
// Used by the desktop/scroll reader (pages/reader/[id].vue) and the mobile
// paged renderer (components/mobile/ReaderPagedEpub.vue).

export const normalizeForSearch = (value) => (value || '').replace(/\s+/g, ' ').trim()

export function decodeHtmlEntities(text) {
  if (!import.meta.client || !text) return text || ''
  if (!text.includes('&')) return text
  const el = document.createElement('textarea')
  // Protect raw "<" so the parser can't swallow following text as a tag
  el.innerHTML = text.replace(/</g, '&lt;')
  return el.value
}

export function unwrapTtsSpans(container) {
  container.querySelectorAll('span[data-tts-chunk]').forEach(span => {
    const parent = span.parentNode
    if (!parent) return
    while (span.firstChild) parent.insertBefore(span.firstChild, span)
    parent.removeChild(span)
    parent.normalize()
  })
}

export function buildTextIndex(container) {
  const map = []
  let text = ''

  const appendSpace = (node, offset) => {
    if (!text || text.endsWith(' ')) return
    text += ' '
    map.push({ node, offset: Math.min(offset, node.nodeValue.length), synthetic: true })
  }

  const walker = (container.ownerDocument || document).createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT
        if (node.parentElement?.closest('script, style')) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      },
    }
  )

  let node
  while ((node = walker.nextNode())) {
    const value = node.nodeValue
    for (let i = 0; i < value.length; i++) {
      const ch = value[i]
      const code = ch.charCodeAt(0)
      // Soft hyphens / zero-width chars are stripped from chunk targets too
      if (code === 0xAD || (code >= 0x200B && code <= 0x200D) || code === 0xFEFF) continue
      if (/\s/.test(ch)) {
        appendSpace(node, i)
      } else {
        text += ch
        map.push({ node, offset: i, synthetic: false })
      }
    }
    appendSpace(node, value.length)
  }

  return { text, map }
}

export function resolveRangePoint(map, index, direction) {
  let cursor = index
  while (cursor >= 0 && cursor < map.length && map[cursor]?.synthetic) {
    cursor += direction
  }
  return map[cursor] || null
}

// Wrap every chunk of ONE section in a <span data-tts-chunk> for highlighting.
// Matching is scoped to the section element and chunks are matched in order,
// so an identical sentence elsewhere can't steal the match. The whole sentence
// is matched when possible (exact start AND end); otherwise a prefix locates
// the start and a suffix pins the end, so length drift between the chunk text
// and the rendered DOM never clips the first or last letters.
// `registerSpan(chunkIdx, span)` receives each created span.
export function mapSectionChunks(sectionEl, chunks, baseIdx, registerSpan) {
  const { text, map } = buildTextIndex(sectionEl)
  if (!map.length) return
  const flatLower = text.toLowerCase()
  const ranges = []
  let searchFrom = 0

  for (let i = 0; i < chunks.length; i++) {
    const target = normalizeForSearch(decodeHtmlEntities(chunks[i])).toLowerCase()
    if (!target) continue

    let start = flatLower.indexOf(target, searchFrom)
    let end
    if (start !== -1) {
      // Exact whole-sentence match: both ends are real DOM positions.
      end = start + target.length - 1
    } else {
      const key = target.slice(0, Math.min(120, target.length))
      start = flatLower.indexOf(key, searchFrom)
      if (start === -1 && key.length > 48) start = flatLower.indexOf(key.slice(0, 48), searchFrom)
      if (start === -1) continue
      const suffix = target.slice(-Math.min(24, target.length))
      const suffixFrom = start + Math.max(0, target.length - suffix.length - 12)
      const suffixPos = flatLower.indexOf(suffix, suffixFrom)
      end = suffixPos !== -1 && suffixPos >= start
        ? suffixPos + suffix.length - 1
        : start + target.length - 1
    }
    end = Math.min(end, map.length - 1)
    ranges.push({ chunkIdx: baseIdx + i, start, end })
    searchFrom = end + 1
  }

  // Apply in reverse so wrapping earlier ranges doesn't invalidate later offsets.
  // ONE Range, reused: every live Range in a document is updated on every DOM
  // mutation, so a fresh Range per sentence made wrapping quadratic — measured
  // at ~9 ms per sentence (2.5 s per chapter) on a mid-range phone.
  const doc = sectionEl.ownerDocument || document
  const range = doc.createRange()
  for (let i = ranges.length - 1; i >= 0; i--) {
    const info = ranges[i]
    const startPt = resolveRangePoint(map, info.start, 1)
    const endPt = resolveRangePoint(map, info.end, -1)
    if (!startPt || !endPt) continue

    const endOffset = Math.min(endPt.node.nodeValue.length, endPt.offset + 1)
    try {
      range.setStart(startPt.node, startPt.offset)
      range.setEnd(endPt.node, endOffset)
      const span = doc.createElement('span')
      span.dataset.ttsChunk = String(info.chunkIdx)
      span.appendChild(range.extractContents())
      range.insertNode(span)
      registerSpan?.(info.chunkIdx, span)
    } catch {
      // Overlapping or detached range — skip this chunk's highlight.
    }
  }
}

// ── Offscreen wrapping ─────────────────────────────────────────────────────
//
// Wrapping sentences inside the LIVE page edits a fully laid-out document a
// few hundred times per chapter; each edit invalidates style/layout and every
// live Range. On a phone that was multi-second main-thread freezes (taps not
// responding, blank areas while scrolling). The same work in a fresh, inert
// offscreen document takes a few milliseconds; the result is swapped into the
// page with ONE innerHTML assignment.
const WRAP_CACHE_LIMIT = 80
const wrapCache = new Map()

// A fresh document per section: inert (no image loads, no scripts) and free of
// the main page's accumulated live Ranges (~8 ms per chapter on a phone). Some
// DOM emulators cannot run Ranges in such a document; there an inert <template>
// is used instead. Probed once.
let offscreenMode = null
function freshDocumentRoot() {
  const doc = document.implementation.createHTMLDocument('')
  const root = doc.createElement('div')
  doc.body.appendChild(root)
  return root
}
function templateRoot() {
  const template = document.createElement('template')
  template.innerHTML = '<div></div>'
  return template.content.firstChild
}
function offscreenRoot() {
  if (!offscreenMode) {
    offscreenMode = 'template'
    try {
      const probe = freshDocumentRoot()
      probe.innerHTML = '<p>ab cd</p>'
      mapSectionChunks(probe, ['ab cd'], 0)
      if (probe.querySelector('span[data-tts-chunk]')?.textContent === 'ab cd') offscreenMode = 'document'
    } catch {}
  }
  return offscreenMode === 'document' ? freshDocumentRoot() : templateRoot()
}

export function wrapSectionHtml(html, chunks, baseIdx) {
  const source = String(html || '')
  if (!import.meta.client || !source || !chunks?.length) return source
  const key = `${baseIdx}:${chunks.length}:${source.length}`
  const hit = wrapCache.get(key)
  if (hit && hit.source === source && hit.first === chunks[0]) return hit.html
  const root = offscreenRoot()
  root.innerHTML = source
  mapSectionChunks(root, chunks, baseIdx)
  const wrapped = root.innerHTML
  wrapCache.set(key, { source, first: chunks[0], html: wrapped })
  while (wrapCache.size > WRAP_CACHE_LIMIT) wrapCache.delete(wrapCache.keys().next().value)
  return wrapped
}

// Register the spans already present in a container (from wrapSectionHtml).
export function collectChunkSpans(container, registerSpan) {
  if (!container) return 0
  let count = 0
  for (const span of container.querySelectorAll('span[data-tts-chunk]')) {
    const idx = Number(span.dataset.ttsChunk)
    if (!Number.isFinite(idx)) continue
    registerSpan?.(idx, span)
    count += 1
  }
  return count
}
