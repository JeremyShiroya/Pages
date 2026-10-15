<template>
  <div class="pdf-viewer" :class="{ 'is-zoomed': zoom > 1 }" ref="viewerRef">
    <div v-if="pdfError" class="pdf-error">
      <i class="ri-file-damage-line"></i>
      <p>Could not render PDF.</p>
    </div>

    <div v-else-if="!ready" class="pdf-loading">
      <SkeletonLoader variant="pdf" />
    </div>

    <template v-else>
      <div
        v-for="page in pages"
        :id="`pdf-page-${page.number}`"
        :key="page.number"
        :ref="el => setPageWrap(el, page.number)"
        class="pdf-page-wrap"
        :data-page="page.number"
        :style="{ width: `${page.frameWidth}px`, height: `${page.height}px` }"
      >
        <div
          class="pdf-page-content"
          :style="{ width: `${page.width}px`, height: `${page.height}px` }"
        >
          <svg v-if="!paintedPages.has(page.number)" class="pdf-preview" :viewBox="`0 0 ${page.width} ${page.height}`" aria-label="Page text preview">
            <text v-for="(item, index) in previewItems(page.number)" :key="index" :x="item.x" :y="item.y" :font-size="item.size" fill="currentColor">{{ item.text }}</text>
          </svg>
          <div v-if="!paintedPages.has(page.number) && !previewItems(page.number).length" class="pdf-render-status" role="status">Rendering page {{ page.number }}…</div>
          <canvas
            :ref="el => setPageCanvas(el, page.number)"
            class="pdf-canvas"
          ></canvas>
          <div :ref="el => setTextLayer(el, page.number)" class="pdf-text-metrics" aria-hidden="true"></div>
          <div class="pdf-highlight-layer" aria-hidden="true">
            <span
              v-for="(highlight, index) in highlightsByPage[page.number] || []"
              :key="index"
              class="pdf-highlight"
              :style="{
                left: `${highlight.left}px`,
                top: `${highlight.top}px`,
                width: `${highlight.width}px`,
                height: `${highlight.height}px`,
              }"
            ></span>
          </div>
          <div class="pdf-word-highlight-layer" aria-hidden="true">
            <span
              v-for="(highlight, index) in wordHighlightsByPage[page.number] || []"
              :key="index"
              class="pdf-word-highlight"
              :style="{
                left: `${highlight.left}px`,
                top: `${highlight.top}px`,
                width: `${highlight.width}px`,
                height: `${highlight.height}px`,
              }"
            ></span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch, computed } from 'vue'
import { pdfViewportLocation } from '~/utils/readingLocation'
import { chunkHighlightRects, chunkSubRangeRects, pagesToRender, scrollTargetForChunk } from '~/composables/usePdfGeometry'
import { wordSpansWithinChunk } from '~/composables/usePdfManifest'
import SkeletonLoader from './SkeletonLoader.vue'

const props = defineProps({
  src: { required: true },
  zoom: { type: Number, default: 1 },
  // Pixels trimmed off the container before the fit-to-width scale is computed.
  // Desktop leaves room for the page's drop shadow; mobile wants the page to
  // reach the edges — a hardcoded 32 here (on top of the container's own
  // padding) is what left mobile PDFs rendering at ~86% of the screen width.
  widthInset: { type: Number, default: 32 },
  manifest: { type: Object, default: null },
  activeChunkId: { type: Number, default: -1 },
  activeWord: { type: Object, default: null },
})

const emit = defineEmits(['page-change', 'loaded'])

const viewerRef = ref(null)
const pages = ref([])
const selectedPage = ref(1)
const paintedPages = ref(new Set())
const previewByPage = computed(() => {
  const result = new Map()
  for (const record of pages.value) {
  const number = record.number
  const page = props.manifest?.pages?.find(page => page.page === number)
  const transform = viewportTransforms.get(number)
  if (!page || !transform) continue
  result.set(number, (page.items || []).filter(item => item.str?.trim()).map(item => {
    const t = item.transform || [1, 0, 0, 1, 0, 0]
    return { text: item.str, x: transform[0] * t[4] + transform[2] * t[5] + transform[4], y: transform[1] * t[4] + transform[3] * t[5] + transform[5], size: Math.hypot(t[2], t[3]) * Math.abs(transform[0]) }
  }))
  }
  return result
})
const previewItems = number => previewByPage.value.get(number) || []
const ready = ref(false)
const pdfError = ref(false)
const highlightsByPage = ref({})

const pageCanvases = new Map()
const textLayerContainers = new Map()
const textLayers = new Map()
let TextLayer = null
const setTextLayer = (element, number) => {
  if (element) textLayerContainers.set(number, element)
}
const pageWraps = new Map()
const viewportTransforms = new Map()
const renderedPages = new Set()
const _visiblePages = new Set()

let pdfDocument = null
let renderGeneration = 0
let pageObserver = null
let _baseScale = 1

const dataUrlToBytes = (dataUrl) => {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

// A location pdf.js can stream from directly (device file served by the
// WebView, blob, or remote URL) — as opposed to inline base64/data.
const isStreamableUrl = (source) => (
  typeof source === 'string'
  && !source.startsWith('data:')
  && /^(https?:|capacitor:|file:|blob:)/i.test(source)
)

const sourceToBytes = async (source) => {
  if (source instanceof Uint8Array) return source
  if (source instanceof ArrayBuffer) return new Uint8Array(source.slice(0))
  if (source instanceof Blob) return new Uint8Array(await source.arrayBuffer())
  if (typeof source === 'string') return dataUrlToBytes(source)
  throw new TypeError('Unsupported PDF source')
}

const setPageCanvas = (element, pageNumber) => {
  if (element) pageCanvases.set(pageNumber, element)
}

const setPageWrap = (element, pageNumber) => {
  if (element) pageWraps.set(pageNumber, element)
}

const resetPageRefs = () => {
  for (const layer of textLayers.values()) layer.cancel()
  textLayers.clear()
  textLayerContainers.clear()
  pageCanvases.clear()
  pageWraps.clear()
  viewportTransforms.clear()
  renderedPages.clear()
  paintedPages.value = new Set()
  _visiblePages.clear()
}

const renderPage = async (pageNumber, baseScale, generation) => {
  if (!pdfDocument || generation !== renderGeneration) return
  const page = await pdfDocument.getPage(pageNumber)
  if (generation !== renderGeneration) return

  const viewport = page.getViewport({ scale: baseScale * props.zoom })
  viewportTransforms.set(pageNumber, viewport.transform.slice())
  const canvas = pageCanvases.get(pageNumber)
  if (!canvas) return

  // Render offscreen, then commit atomically. A stale job must never clear a
  // visible canvas or contend with another pdf.js render on the same canvas.
  const buffer = document.createElement('canvas')
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  buffer.width = Math.floor(viewport.width * dpr)
  buffer.height = Math.floor(viewport.height * dpr)
  const context = buffer.getContext('2d')
  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  await page.render({ canvasContext: context, viewport }).promise
  if (generation !== renderGeneration) return
  canvas.width = buffer.width
  canvas.height = buffer.height
  canvas.style.width = `${viewport.width}px`
  canvas.style.height = `${viewport.height}px`
  canvas.getContext('2d').drawImage(buffer, 0, 0)
  paintedPages.value = new Set([...paintedPages.value, pageNumber])
  const container = textLayerContainers.get(pageNumber)
  if (container && TextLayer) {
    textLayers.get(pageNumber)?.cancel()
    container.replaceChildren()
    container.style.setProperty('--total-scale-factor', String(viewport.scale))
    const textContentSource = await page.getTextContent()
    if (generation !== renderGeneration) return
    const layer = new TextLayer({ textContentSource, container, viewport })
    textLayers.set(pageNumber, layer)
    await layer.render()
    if (generation !== renderGeneration) return
    updateHighlights()
    updateWordHighlights()
  }
}

const pendingRenders = new Map()
const renderPageIfNeeded = async (pageNumber, generation = renderGeneration) => {
  if (!pdfDocument || renderedPages.has(pageNumber)) return
  const key = `${generation}:${pageNumber}`
  if (pendingRenders.has(key)) return pendingRenders.get(key)
  const job = renderPage(pageNumber, _baseScale, generation).then(() => {
    if (generation === renderGeneration) renderedPages.add(pageNumber)
  }).catch(error => console.warn('PDF page render failed:', error)).finally(() => pendingRenders.delete(key))
  pendingRenders.set(key, job)
  return job
}

let windowRequest = 0
const renderWindow = async (visiblePages) => {
  const request = ++windowRequest
  const generation = renderGeneration
  const target = pagesToRender(visiblePages, pdfDocument?.numPages || 0, 3)
  // Visible pages first; never leave them behind speculative neighbours.
  const ordered = [...new Set([...visiblePages, ...target])]
  for (const pageNumber of ordered) {
    if (generation !== renderGeneration || request !== windowRequest) return
    await renderPageIfNeeded(pageNumber, generation)
  }
  if (request !== windowRequest) return
  for (const pageNumber of [...renderedPages]) {
    if (target.includes(pageNumber)) continue
    const canvas = pageCanvases.get(pageNumber)
    if (canvas) { canvas.width = 0; canvas.height = 0 }
    textLayers.get(pageNumber)?.cancel()
    textLayers.delete(pageNumber)
    textLayerContainers.get(pageNumber)?.replaceChildren()
    renderedPages.delete(pageNumber)
    const painted = new Set(paintedPages.value)
    painted.delete(pageNumber)
    paintedPages.value = painted
  }
}

// DOM ranges use PDF.js's font layout, so narrow letters and wide letters no
// longer get identical widths. Fall back to item geometry until a page renders.
const measuredSpanRects = (pageNumber, spans) => {
  const layer = textLayers.get(pageNumber)
  const container = textLayerContainers.get(pageNumber)
  if (!layer || !container || !spans?.length) return null
  const page = props.manifest?.pages?.find(entry => entry.page === pageNumber)
  const origin = container.getBoundingClientRect()
  const scale = origin.width / container.offsetWidth || 1
  const rects = []
  for (const span of spans) {
    const div = layer.textDivs[span.itemIndex]
    const node = div?.firstChild
    if (!node || node.nodeType !== Node.TEXT_NODE || node.textContent !== page?.items?.[span.itemIndex]?.str) return null
    const range = document.createRange()
    range.setStart(node, Math.min(node.length, span.start))
    range.setEnd(node, Math.min(node.length, span.end))
    for (const rect of range.getClientRects()) {
      if (rect.width > 0 && rect.height > 0) rects.push({
        left: (rect.left - origin.left) / scale,
        top: (rect.top - origin.top) / scale,
        width: rect.width / scale,
        height: rect.height / scale,
      })
    }
  }
  return rects.length ? rects : null
}

const updateHighlights = () => {
  const chunk = props.manifest?.chunks?.find(entry => entry.id === props.activeChunkId)
  const viewportTransform = chunk ? viewportTransforms.get(chunk.page) : null
  if (!chunk || !viewportTransform) {
    highlightsByPage.value = {}
    return
  }

  highlightsByPage.value = {
    [chunk.page]: (measuredSpanRects(chunk.page, chunk.spans) || chunkHighlightRects(props.manifest, chunk.id, viewportTransform))
      .map(rect => ({
        left: Math.max(0, rect.left - 1.5),
        top: Math.max(0, rect.top - 1),
        width: rect.width + 3,
        height: rect.height + 2,
      })),
  }
}

const wordHighlightsByPage = ref({})

const updateWordHighlights = () => {
  const chunk = props.manifest?.chunks?.find(entry => entry.id === props.activeChunkId)
  const range = props.activeWord
  const viewportTransform = chunk ? viewportTransforms.get(chunk.page) : null
  if (!chunk || !range || !viewportTransform || !(range.end > range.start)) {
    wordHighlightsByPage.value = {}
    return
  }

  wordHighlightsByPage.value = {
    [chunk.page]: (measuredSpanRects(chunk.page, wordSpansWithinChunk(props.manifest, chunk.id, range.start, range.end)) || chunkSubRangeRects(props.manifest, chunk.id, range.start, range.end, viewportTransform))
      .map(rect => ({
        left: Math.max(0, rect.left - 1),
        top: Math.max(0, rect.top - 1),
        width: rect.width + 2,
        height: rect.height + 2,
      })),
  }
}

const refreshHighlights = () => {
  updateHighlights()
  updateWordHighlights()
}

const buildPages = async () => {
  if (!pdfDocument) return
  const firstPage = await pdfDocument.getPage(1)
  const firstViewport = firstPage.getViewport({ scale: 1 })
  const availableWidth = Math.max(200, (viewerRef.value?.clientWidth || 820) - props.widthInset)
  const baseScale = availableWidth / firstViewport.width
  _baseScale = baseScale

  // Cheap layout pass: size + viewport transform for EVERY page, no canvas.
  const pageRecords = []
  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    const page = pageNumber === 1 ? firstPage : await pdfDocument.getPage(pageNumber)
    const viewport = page.getViewport({ scale: baseScale * props.zoom })
    viewportTransforms.set(pageNumber, viewport.transform.slice())
    pageRecords.push({
      number: pageNumber,
      width: viewport.width,
      frameWidth: Math.min(viewport.width, availableWidth),
      height: viewport.height,
    })
  }

  pages.value = pageRecords
  ready.value = true
  await nextTick()
  for (const wrap of pageWraps.values()) {
    wrap.scrollLeft = Math.max(0, (wrap.scrollWidth - wrap.clientWidth) / 2)
  }
  setupPageObserver()

  renderedPages.clear()
  await renderWindow([1])

  refreshHighlights()
  emit('loaded', { pages: pdfDocument.numPages })
}

const relayout = async () => {
  if (!pdfDocument) return
  const savedPosition = getPosition()
  layoutPosition = savedPosition
  const generation = ++renderGeneration

  const firstPage = await pdfDocument.getPage(1)
  const firstViewport = firstPage.getViewport({ scale: 1 })
  const availableWidth = Math.max(200, (viewerRef.value?.clientWidth || 820) - props.widthInset)
  const baseScale = availableWidth / firstViewport.width
  _baseScale = baseScale

  const pageRecords = []
  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    const page = pageNumber === 1 ? firstPage : await pdfDocument.getPage(pageNumber)
    const viewport = page.getViewport({ scale: baseScale * props.zoom })
    viewportTransforms.set(pageNumber, viewport.transform.slice())
    pageRecords.push({
      number: pageNumber,
      width: viewport.width,
      frameWidth: Math.min(viewport.width, availableWidth),
      height: viewport.height,
    })
  }
  if (generation !== renderGeneration) return

  // Drop stale-size canvases; the visible window re-renders below.
  for (const pageNumber of [...renderedPages]) {
    const canvas = pageCanvases.get(pageNumber)
    if (canvas) {
      canvas.width = 0
      canvas.height = 0
    }
  }
  renderedPages.clear()
  paintedPages.value = new Set()

  pages.value = pageRecords
  await nextTick()
  for (const wrap of pageWraps.values()) {
    wrap.scrollLeft = Math.max(0, (wrap.scrollWidth - wrap.clientWidth) / 2)
  }
  await renderWindow(_visiblePages.size ? [..._visiblePages] : [selectedPage.value])
  refreshHighlights()
  await restorePosition(savedPosition)
  layoutPosition = null
}

const renderPdf = async () => {
  layoutPosition = null
  if (!props.src) return
  const generation = ++renderGeneration
  ready.value = false
  selectedPage.value = 1
  pdfError.value = false
  pages.value = []
  highlightsByPage.value = {}
  resetPageRefs()

  try {
    const pdfjsLib = await import('pdfjs-dist')
    TextLayer = pdfjsLib.TextLayer
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url
    ).toString()
    // Stream device files / URLs straight from disk (pdf.js fetches ranges as
    // pages are shown) instead of loading the whole PDF into the JS heap.
    pdfDocument = isStreamableUrl(props.src)
      ? await pdfjsLib.getDocument({ url: props.src }).promise
      : await pdfjsLib.getDocument({ data: await sourceToBytes(props.src) }).promise
    if (generation !== renderGeneration) return
    await buildPages()
  } catch (error) {
    console.error('PDF render error:', error)
    pdfError.value = true
    ready.value = false
  }
}

// The page under the reading anchor line (upper third of the viewport).
// Deciding by "largest intersection in this observer batch" flip-flopped when
// the zoom fit several whole pages on screen — a batch only contains pages
// whose ratio CHANGED, so a barely-visible neighbour could beat the page
// actually being read. A fixed anchor line is stable at any zoom.
const pageAtAnchor = () => {
  const anchorY = Math.min(window.innerHeight * 0.35, 320)
  const candidates = _visiblePages.size ? [..._visiblePages] : [...pageWraps.keys()]
  let best = 0
  let bestDistance = Infinity
  for (const pageNumber of candidates) {
    const element = pageWraps.get(pageNumber)
    if (!element) continue
    const rect = element.getBoundingClientRect()
    if (rect.top <= anchorY && rect.bottom > anchorY) return pageNumber
    const distance = rect.top > anchorY ? rect.top - anchorY : anchorY - rect.bottom
    if (distance < bestDistance) {
      bestDistance = distance
      best = pageNumber
    }
  }
  return best
}

const setupPageObserver = () => {
  pageObserver?.disconnect()
  pageObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const pageNumber = Number(entry.target?.dataset?.page)
      if (!pageNumber) continue
      if (entry.isIntersecting) _visiblePages.add(pageNumber)
      else _visiblePages.delete(pageNumber)
    }

    const currentPage = pageAtAnchor()
    if (currentPage) { selectedPage.value = currentPage; emit('page-change', currentPage) }

    const visible = [...new Set([currentPage || 1, ..._visiblePages])]
    renderWindow(visible)
  }, {
    root: null,
    rootMargin: '1600px 0px 1600px 0px',
    threshold: [0, 0.1, 0.3, 0.5, 0.7],
  })
  for (const wrap of pageWraps.values()) pageObserver.observe(wrap)
}

let layoutPosition = null
const getVisiblePage = () => {
  const anchorY = 56
  const records = [...pageWraps.entries()].map(([page, element]) => {
    const rect = element.getBoundingClientRect()
    return { page, top: rect.top, bottom: rect.bottom }
  })
  const atAnchor = records.find(record => record.top <= anchorY && record.bottom > anchorY)
  if (atAnchor) return atAnchor.page
  records.sort((a, b) => Math.abs(a.top - anchorY) - Math.abs(b.top - anchorY))
  return records[0]?.page || 1
}

const getPosition = () => {
  if (layoutPosition) return layoutPosition
  const page = getVisiblePage()
  const wrap = pageWraps.get(page)
  if (!wrap) return { pdfPage: page, pdfOffset: 0, pdfHorizontal: 0 }
  const position = pdfViewportLocation(page, wrap.getBoundingClientRect(), 56, wrap.scrollLeft, wrap.scrollWidth, wrap.clientWidth)
  position.pdfOffset = Math.round(position.pdfOffset * 10000) / 10000
  position.pdfHorizontal = Math.round(position.pdfHorizontal * 10000) / 10000
  return position
}

const restorePosition = async (position) => {
  if (!pages.value.length) return false
  const page = Math.max(1, Math.min(pages.value.length, Number(position?.pdfPage) || 1))
  await nextTick()
  const wrap = pageWraps.get(page)
  if (!wrap) return false
  const offset = Math.max(0, Math.min(1, Number(position?.pdfOffset) || 0))
  const rect = wrap.getBoundingClientRect()
  window.scrollTo({ top: Math.max(0, window.scrollY + rect.top + rect.height * offset - 56), behavior: 'instant' })
  wrap.scrollLeft = Math.max(0, wrap.scrollWidth - wrap.clientWidth) * Math.max(0, Math.min(1, Number(position?.pdfHorizontal) || 0))
  selectedPage.value = page
  await renderWindow([page])
  emit('page-change', page)
  return true
}

const scrollToPage = (pageNumber, behavior = 'smooth', block = 'start') => {
  selectedPage.value = Math.max(1, Math.min(pages.value.length, Number(pageNumber)))
  emit('page-change', selectedPage.value)
  renderWindow([selectedPage.value])
  pageWraps.get(Number(pageNumber))?.scrollIntoView({ behavior, block })
}

const scrollToChunk = (chunkId, behavior = 'smooth') => {
  const chunk = props.manifest?.chunks?.find(entry => entry.id === Number(chunkId))
  const viewportTransform = chunk ? viewportTransforms.get(chunk.page) : null
  if (!chunk || !viewportTransform) return

  renderPageIfNeeded(chunk.page)
  const target = scrollTargetForChunk(props.manifest, chunk.id, viewportTransform)
  const pageWrap = pageWraps.get(chunk.page)
  if (!target || !pageWrap) return
  const pageRect = pageWrap.getBoundingClientRect()
  const top = window.scrollY + pageRect.top + target.top - 72
  window.scrollTo({ top: Math.max(0, top), behavior })
}

defineExpose({ getVisiblePage, getPosition, restorePosition, scrollToPage, scrollToChunk })

// Between observer threshold crossings (e.g. zoomed out with whole pages on
// screen) the anchor can cross a page edge without any ratio change — follow
// the scroll directly, rAF-throttled.
let _anchorRaf = null
const onViewerScroll = () => {
  if (_anchorRaf !== null) return
  _anchorRaf = requestAnimationFrame(() => {
    _anchorRaf = null
    const page = pageAtAnchor()
    if (page) { selectedPage.value = page; emit('page-change', page) }
  })
}

onMounted(() => {
  renderPdf()
  window.addEventListener('scroll', onViewerScroll, { passive: true })
})
onUnmounted(() => {
  renderGeneration += 1
  windowRequest += 1
  pdfDocument?.destroy?.()
  pageObserver?.disconnect()
  window.removeEventListener('scroll', onViewerScroll)
  if (_anchorRaf !== null) cancelAnimationFrame(_anchorRaf)
})

watch(() => props.src, renderPdf)
watch(() => props.zoom, relayout)
watch(() => props.manifest, refreshHighlights, { deep: true })
watch(() => props.activeChunkId, refreshHighlights)
watch(() => props.activeWord, updateWordHighlights)
</script>

<style scoped>
.pdf-viewer {
  width: 100%;
  max-width: min(100%, 1040px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  overflow-x: hidden;
  overscroll-behavior-x: contain;
  touch-action: pan-x pan-y;
  padding: 0 0.5rem 2rem;
}

.pdf-page-wrap {
  position: relative;
  flex: 0 0 auto;
  background: var(--color-surface-primary);
  border-radius: 3px;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  touch-action: pan-x pan-y;
  box-shadow: var(--shadow-reader-page);
}

.pdf-page-wrap::-webkit-scrollbar {
  display: none;
}

.pdf-page-content {
  position: relative;
}

.pdf-preview { position: absolute; inset: 0; width: 100%; height: 100%; color: var(--color-text-primary); background: var(--color-surface-primary); }
.pdf-render-status { position: absolute; inset: 0; display: grid; place-items: center; color: var(--color-text-muted); }

.pdf-canvas {
  display: block;
  background: var(--color-surface-primary);
}

.pdf-text-metrics {
  position: absolute;
  inset: 0;
  overflow: clip;
  opacity: 0;
  pointer-events: none;
  user-select: none;
  line-height: 1;
  text-align: initial;
  text-size-adjust: none;
  transform-origin: 0 0;
  --min-font-size: 1;
  --text-scale-factor: calc(var(--total-scale-factor) * var(--min-font-size));
  --min-font-size-inv: calc(1 / var(--min-font-size));
}
.pdf-text-metrics :deep(span), .pdf-text-metrics :deep(br) {
  position: absolute;
  white-space: pre;
  transform-origin: 0% 0%;
  --font-height: 0;
  font-size: calc(var(--text-scale-factor) * var(--font-height));
  --scale-x: 1;
  --rotate: 0deg;
  transform: rotate(var(--rotate)) scaleX(var(--scale-x)) scale(var(--min-font-size-inv));
}

.pdf-highlight-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}

.pdf-highlight {
  position: absolute;
  background: var(--color-reader-highlight);
  border-radius: 2px;
  box-shadow: 0 0 0 1px var(--color-reader-highlight-border);
  mix-blend-mode: multiply;
}

.pdf-word-highlight-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
}

.pdf-word-highlight {
  position: absolute;
  background: var(--color-reader-word-highlight);
  border-radius: 2px;
  mix-blend-mode: multiply;
}

.pdf-loading,
.pdf-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 4rem 0;
  color: var(--color-text-muted);
  text-align: center;
}

.pdf-error i {
  font-size: 2.5rem;
}
</style>
