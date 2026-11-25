<template>
  <Teleport to="body">
    <Transition name="rds" @after-enter="resyncSystemBars" @after-leave="resyncSystemBars">
      <div v-if="open" class="rds-layer" :class="theme" data-system-bar-undimmed>
        <button type="button" class="rds-backdrop" aria-label="Close display settings" :style="{ opacity: backdropOpacity }" @click="close"></button>

        <section
          ref="sheetRef"
          class="reader-display-sheet rds-sheet"
          :class="{ expanded: snap === 'full', dragging }"
          :style="{ height: `${sheetHeight}px` }"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rds-title"
        >
          <!-- Drag handle: pull up to open the whole sheet, down to close. -->
          <header
            class="rds-head"
            @pointerdown="onHandleDown"
            @pointermove="onHandleMove"
            @pointerup="onHandleUp"
            @pointercancel="onHandleUp"
          >
            <span class="rds-grabber" aria-hidden="true"></span>
            <div class="rds-title-row">
              <h2 id="rds-title"><i class="ri-font-size-2" aria-hidden="true"></i> Display</h2>
              <div class="rds-head-actions">
                <button type="button" class="rds-icon-btn" :aria-label="snap === 'full' ? 'Show less' : 'Show all settings'" @click.stop="toggleSnap" @pointerdown.stop>
                  <i :class="snap === 'full' ? 'ri-arrow-down-s-line' : 'ri-arrow-up-s-line'"></i>
                </button>
                <button type="button" class="rds-icon-btn" aria-label="Close" @click.stop="close" @pointerdown.stop>
                  <i class="ri-close-line"></i>
                </button>
              </div>
            </div>
          </header>

          <div
            ref="bodyRef"
            class="rds-body"
            @touchstart.passive="onBodyTouchStart"
            @touchmove="onBodyTouchMove"
            @touchend="onBodyTouchEnd"
            @touchcancel="onBodyTouchEnd"
          >
            <!-- PDFs first: an original-layout PDF has nothing else to set. -->
            <div v-if="isPdfDocument" class="rds-block">
              <p class="rds-label">PDF view</p>
              <div class="rds-seg" role="group" aria-label="PDF view">
                <button
                  v-for="mode in ['original', 'reflow']"
                  :key="mode"
                  type="button"
                  :class="{ active: prefs.pdfViewMode === mode }"
                  :aria-pressed="prefs.pdfViewMode === mode"
                  :disabled="mode === 'reflow' && !pdfReflowAvailable"
                  @click="updatePrefs({ pdfViewMode: mode })"
                >
                  <i :class="mode === 'original' ? 'ri-file-pdf-2-line' : 'ri-text-wrap'"></i>
                  {{ mode === 'original' ? 'Original pages' : 'Reflow text' }}
                </button>
              </div>
              <p v-if="!pdfReflowAvailable" class="rds-note">This PDF has no text layer, so Reflow is unavailable.</p>
              <div v-if="isOriginalPdf" class="rds-stepper-row">
                <span>Zoom</span>
                <div class="rds-stepper" role="group" aria-label="PDF zoom">
                  <button type="button" aria-label="Zoom out" :disabled="prefs.pdfZoom <= PDF_ZOOM_MIN" @click="stepPdfZoom(-1)"><i class="ri-subtract-line"></i></button>
                  <output>{{ Math.round(prefs.pdfZoom * 100) }}%</output>
                  <button type="button" aria-label="Zoom in" :disabled="prefs.pdfZoom >= PDF_ZOOM_MAX" @click="stepPdfZoom(1)"><i class="ri-add-line"></i></button>
                </div>
              </div>
            </div>

            <template v-if="!isOriginalPdf">
              <!-- Page colour + page/scroll in one row. -->
              <div class="rds-row-top">
                <div class="rds-swatches" role="radiogroup" aria-label="Page colour">
                  <button
                    v-for="option in READER_PAGE_THEMES"
                    :key="option.id"
                    type="button"
                    role="radio"
                    class="rds-swatch"
                    :class="{ active: prefs.background === option.id }"
                    :aria-checked="prefs.background === option.id"
                    :aria-label="option.label"
                    :title="option.label"
                    @click="updatePrefs({ background: option.id })"
                  >
                    <span :style="{ background: option.swatch }"></span>
                  </button>
                </div>
                <div class="rds-mode" role="group" aria-label="Reading mode">
                  <button type="button" :class="{ active: prefs.readingMode === 'page' }" :aria-pressed="prefs.readingMode === 'page'" aria-label="Pages" @click="updatePrefs({ readingMode: 'page' })"><i class="ri-book-open-line"></i></button>
                  <button type="button" :class="{ active: prefs.readingMode === 'scroll' }" :aria-pressed="prefs.readingMode === 'scroll'" aria-label="Scroll" @click="updatePrefs({ readingMode: 'scroll' })"><i class="ri-scroll-to-bottom-line"></i></button>
                </div>
              </div>
              <p class="rds-caption">{{ themeLabel }} · {{ prefs.readingMode === 'page' ? 'Pages' : 'Scroll' }}</p>

              <!-- Quick tiles: font, size and brightness. -->
              <div class="rds-tiles">
                <button type="button" class="rds-font-tile" @click="cycleFont">
                  <span class="rds-font-glyph" :style="{ fontFamily: currentFontStack, '--rds-weight': prefs.fontWeight }">Aa</span>
                  <span class="rds-tile-title">{{ currentFontLabel }}</span>
                  <span class="rds-tile-hint">Tap to switch font</span>
                </button>

                <div
                  class="rds-vslider"
                  role="slider"
                  tabindex="0"
                  aria-label="Text size"
                  :aria-valuemin="READER_FONT_SIZE_MIN"
                  :aria-valuemax="READER_FONT_SIZE_MAX"
                  :aria-valuenow="prefs.fontSize"
                  @pointerdown="startVSlide($event, 'fontSize')"
                  @pointermove="moveVSlide($event, 'fontSize')"
                  @pointerup="endVSlide"
                  @pointercancel="endVSlide"
                  @keydown="keyVSlide($event, 'fontSize')"
                >
                  <span class="rds-vfill" :style="{ height: `${fraction('fontSize') * 100}%` }"></span>
                  <span class="rds-vvalue">{{ prefs.fontSize }}</span>
                  <i class="ri-font-size rds-vicon" aria-hidden="true"></i>
                  <span class="rds-vlabel">Size</span>
                </div>

                <div
                  class="rds-vslider"
                  role="slider"
                  tabindex="0"
                  aria-label="Brightness"
                  :aria-valuemin="READER_BRIGHTNESS_MIN"
                  aria-valuemax="100"
                  :aria-valuenow="prefs.brightness"
                  @pointerdown="startVSlide($event, 'brightness')"
                  @pointermove="moveVSlide($event, 'brightness')"
                  @pointerup="endVSlide"
                  @pointercancel="endVSlide"
                  @keydown="keyVSlide($event, 'brightness')"
                >
                  <span class="rds-vfill" :style="{ height: `${fraction('brightness') * 100}%` }"></span>
                  <span class="rds-vvalue">{{ prefs.brightness }}%</span>
                  <i class="ri-sun-line rds-vicon" aria-hidden="true"></i>
                  <span class="rds-vlabel">Light</span>
                </div>
              </div>

              <!-- Round toggles. -->
              <div class="rds-rounds">
                <button type="button" class="rds-round" :class="{ on: prefs.textAlign === 'justify' }" :aria-pressed="prefs.textAlign === 'justify'" @click="updatePrefs({ textAlign: prefs.textAlign === 'justify' ? 'left' : 'justify' })">
                  <span><i :class="prefs.textAlign === 'justify' ? 'ri-align-justify' : 'ri-align-left'"></i></span>
                  {{ prefs.textAlign === 'justify' ? 'Justified' : 'Left' }}
                </button>
                <button type="button" class="rds-round" :class="{ on: prefs.fontWeight >= 500 }" :aria-pressed="prefs.fontWeight >= 500" @click="updatePrefs({ fontWeight: prefs.fontWeight >= 500 ? 400 : 700 })">
                  <span><i class="ri-bold"></i></span>
                  Bold
                </button>
                <button type="button" class="rds-round" :class="{ on: settings.readerHighlight }" :aria-pressed="settings.readerHighlight" @click="updateSettings({ readerHighlight: !settings.readerHighlight })">
                  <span><i class="ri-mark-pen-line"></i></span>
                  Follow voice
                </button>
                <button type="button" class="rds-round" :class="{ on: snap === 'full' }" @click="toggleSnap">
                  <span><i class="ri-equalizer-2-line"></i></span>
                  {{ snap === 'full' ? 'Less' : 'More' }}
                </button>
              </div>

              <!-- ── Fine tuning: revealed by dragging the sheet up ── -->
              <div class="rds-divider"><span>Fine tuning</span></div>

              <div class="rds-preview" :class="previewThemeClass" :style="previewStyle">
                <p>It was the hour when the lamps came on along the river, and the pages seemed to turn themselves.</p>
              </div>

              <div class="rds-block">
                <p class="rds-label">Font</p>
                <div class="rds-font-cards">
                  <button
                    v-for="font in READER_FONT_OPTIONS"
                    :key="font.id"
                    type="button"
                    class="rds-font-card"
                    :class="{ active: prefs.fontFamily === font.id }"
                    :aria-pressed="prefs.fontFamily === font.id"
                    @click="updatePrefs({ fontFamily: font.id })"
                  >
                    <span :style="{ fontFamily: font.stack }">Aa</span>
                    {{ font.label }}
                  </button>
                </div>
              </div>

              <div class="rds-block">
                <p class="rds-label">Thickness</p>
                <div class="rds-seg" role="group" aria-label="Font weight">
                  <button
                    v-for="weight in READER_WEIGHT_OPTIONS"
                    :key="weight.id"
                    type="button"
                    :class="{ active: prefs.fontWeight === weight.id }"
                    :aria-pressed="prefs.fontWeight === weight.id"
                    class="rds-weight-btn"
                    :style="{ '--rds-weight': weight.id }"
                    @click="updatePrefs({ fontWeight: weight.id })"
                  >{{ weight.label }}</button>
                </div>
              </div>

              <div class="rds-block">
                <p class="rds-label">Line spacing</p>
                <div class="rds-spacing-cards" role="group" aria-label="Line spacing">
                  <button
                    v-for="spacing in READER_LINE_SPACING_OPTIONS"
                    :key="spacing"
                    type="button"
                    class="rds-spacing-card"
                    :class="{ active: prefs.lineSpacing === spacing }"
                    :aria-pressed="prefs.lineSpacing === spacing"
                    :aria-label="`Line spacing ${spacing}`"
                    @click="updatePrefs({ lineSpacing: spacing })"
                  >
                    <span class="rds-lines" :style="{ gap: `${(spacing - 1) * 7 + 2}px` }"><i></i><i></i><i></i></span>
                    {{ spacing }}
                  </button>
                </div>
              </div>

              <div class="rds-block">
                <div class="rds-range-head"><p class="rds-label">Page margins</p><output>{{ prefs.pageMargin }} px</output></div>
                <input class="rds-range" type="range" :min="READER_MARGIN_MIN" :max="READER_MARGIN_MAX" step="2" :value="prefs.pageMargin" :style="rangeFill(prefs.pageMargin, READER_MARGIN_MIN, READER_MARGIN_MAX)" aria-label="Page margins" @change="updatePrefs({ pageMargin: Number($event.target.value) })" @input="previewMargin = Number($event.target.value)" />
              </div>

              <div class="rds-block">
                <div class="rds-range-head"><p class="rds-label">Letter spacing</p><output>{{ (prefs.letterSpacing / 1000).toFixed(3) }} em</output></div>
                <input class="rds-range" type="range" min="0" :max="READER_LETTER_SPACING_MAX" step="5" :value="prefs.letterSpacing" :style="rangeFill(prefs.letterSpacing, 0, READER_LETTER_SPACING_MAX)" aria-label="Letter spacing" @change="updatePrefs({ letterSpacing: Number($event.target.value) })" />
              </div>

              <button type="button" class="rds-reset" @click="resetDefaults"><i class="ri-restart-line"></i> Reset to defaults</button>
            </template>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
// Reader display settings as a bottom sheet over the page, so every change is
// seen on the book itself. It opens at a comfortable height with the everyday
// controls; dragging it up (or tapping More) extends it to the top of the
// screen with the fine-tuning controls.
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import {
  useMobileReaderPrefs,
  DEFAULT_MOBILE_READER_PREFS,
  READER_FONT_OPTIONS,
  READER_WEIGHT_OPTIONS,
  READER_LINE_SPACING_OPTIONS,
  READER_FONT_SIZE_MIN,
  READER_FONT_SIZE_MAX,
  READER_MARGIN_MIN,
  READER_MARGIN_MAX,
  READER_LETTER_SPACING_MAX,
  READER_BRIGHTNESS_MIN,
  READER_PAGE_THEMES,
  PDF_ZOOM_MIN,
  PDF_ZOOM_MAX,
  PDF_ZOOM_STEP,
  readerFontStack,
} from '~/composables/useMobileReaderPrefs'
import { usePagesSettings } from '~/composables/usePagesSettings'

const props = defineProps({
  open: { type: Boolean, default: false },
  theme: { type: String, default: 'light' },
  isPdfDocument: { type: Boolean, default: false },
  pdfReflowAvailable: { type: Boolean, default: true },
})
const emit = defineEmits(['close'])

const { prefs, updatePrefs } = useMobileReaderPrefs()
const { settings, updateSettings } = usePagesSettings()

const isOriginalPdf = computed(() => props.isPdfDocument && prefs.value.pdfViewMode === 'original')
const themeLabel = computed(() => READER_PAGE_THEMES.find((option) => option.id === prefs.value.background)?.label || 'Auto')
const currentFont = computed(() => READER_FONT_OPTIONS.find((font) => font.id === prefs.value.fontFamily) || READER_FONT_OPTIONS[0])
const currentFontLabel = computed(() => currentFont.value.label)
const currentFontStack = computed(() => readerFontStack(prefs.value.fontFamily))
const previewMargin = ref(null)

const cycleFont = () => {
  const index = READER_FONT_OPTIONS.findIndex((font) => font.id === prefs.value.fontFamily)
  updatePrefs({ fontFamily: READER_FONT_OPTIONS[(index + 1) % READER_FONT_OPTIONS.length].id })
}
const stepPdfZoom = (direction) => updatePrefs({ pdfZoom: (prefs.value.pdfZoom || 1) + direction * PDF_ZOOM_STEP })
const resetDefaults = () => {
  const { readingMode, pdfViewMode, pdfPageMode, pdfZoom } = prefs.value
  updatePrefs({ ...DEFAULT_MOBILE_READER_PREFS, readingMode, pdfViewMode, pdfPageMode, pdfZoom })
}

const previewThemeClass = computed(() => `bg-${prefs.value.background}`)
const previewStyle = computed(() => ({
  fontFamily: currentFontStack.value,
  fontSize: `${prefs.value.fontSize}px`,
  '--rds-weight': prefs.value.fontWeight,
  lineHeight: prefs.value.lineSpacing,
  textAlign: prefs.value.textAlign,
  letterSpacing: `${0.002 + prefs.value.letterSpacing / 1000}em`,
  paddingInline: `${Math.round((previewMargin.value ?? prefs.value.pageMargin) * 0.8)}px`,
}))
const rangeFill = (value, min, max) => ({ '--fill': `${((value - min) / (max - min)) * 100}%` })

// ── Vertical slider tiles ──
const RANGES = {
  fontSize: { min: READER_FONT_SIZE_MIN, max: READER_FONT_SIZE_MAX, step: 1 },
  brightness: { min: READER_BRIGHTNESS_MIN, max: 100, step: 5 },
}
const fraction = (key) => {
  const { min, max } = RANGES[key]
  return Math.max(0, Math.min(1, (prefs.value[key] - min) / (max - min)))
}
let sliding = null
const valueAt = (event, key) => {
  const { min, max, step } = RANGES[key]
  const rect = sliding.rect
  const ratio = 1 - Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
  return Math.round((min + ratio * (max - min)) / step) * step
}
const startVSlide = (event, key) => {
  sliding = { key, rect: event.currentTarget.getBoundingClientRect() }
  event.currentTarget.setPointerCapture?.(event.pointerId)
  updatePrefs({ [key]: valueAt(event, key) })
}
const moveVSlide = (event, key) => {
  if (!sliding || sliding.key !== key) return
  const value = valueAt(event, key)
  if (value !== prefs.value[key]) updatePrefs({ [key]: value })
}
const endVSlide = () => { sliding = null }
const keyVSlide = (event, key) => {
  const { step } = RANGES[key]
  if (['ArrowUp', 'ArrowRight'].includes(event.key)) updatePrefs({ [key]: prefs.value[key] + step })
  else if (['ArrowDown', 'ArrowLeft'].includes(event.key)) updatePrefs({ [key]: prefs.value[key] - step })
  else return
  event.preventDefault()
}

// ── Sheet height + dragging ──
const sheetRef = ref(null)
const bodyRef = ref(null)
const snap = ref('peek')
const dragging = ref(false)
const viewport = ref(typeof window === 'undefined' ? 800 : window.innerHeight)
const dragHeight = ref(null)
// The status-bar inset, measured once per open: the app draws edge to edge, so
// "the top of the screen" for the sheet is just below the status bar.
const topInset = ref(0)
const measureTopInset = () => {
  if (typeof document === 'undefined') return
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top)'
  document.body.appendChild(probe)
  topInset.value = Number.parseFloat(getComputedStyle(probe).paddingTop) || 0
  probe.remove()
}
const fullHeight = computed(() => Math.max(320, viewport.value - topInset.value - 8))
const peekHeight = computed(() => Math.min(fullHeight.value, Math.max(380, Math.round(viewport.value * 0.6))))
const snapHeight = computed(() => (snap.value === 'full' ? fullHeight.value : peekHeight.value))
const sheetHeight = computed(() => dragHeight.value ?? snapHeight.value)
const backdropOpacity = computed(() => {
  const ratio = sheetHeight.value / peekHeight.value
  return Math.max(0, Math.min(1, ratio))
})

const close = () => emit('close')
// The system bars take their colour from whatever is under them. While the sheet
// is up that is the sheet, so once it has finished sliding in or out the bars
// re-sample: otherwise the navigation bar keeps the sheet's colour over the page.
const resyncSystemBars = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('bookish:system-bars-change'))
}
const toggleSnap = () => {
  snap.value = snap.value === 'full' ? 'peek' : 'full'
  if (snap.value === 'peek') nextTick(() => { if (bodyRef.value) bodyRef.value.scrollTop = 0 })
}

let drag = null
const beginDrag = (y) => {
  drag = { startY: y, startHeight: sheetHeight.value, lastY: y, lastT: performance.now(), velocity: 0 }
  dragging.value = true
}
const updateDrag = (y) => {
  if (!drag) return
  const now = performance.now()
  drag.velocity = (y - drag.lastY) / Math.max(1, now - drag.lastT)
  drag.lastY = y
  drag.lastT = now
  dragHeight.value = Math.max(120, Math.min(fullHeight.value, drag.startHeight - (y - drag.startY)))
}
const finishDrag = () => {
  if (!drag) return
  const height = dragHeight.value ?? snapHeight.value
  const velocity = drag.velocity // px/ms, positive = moving down
  drag = null
  dragging.value = false
  dragHeight.value = null
  if (velocity > 0.9 || height < peekHeight.value * 0.7) {
    if (snap.value === 'full' && height > peekHeight.value * 0.7 && velocity <= 1.6) { snap.value = 'peek'; return }
    close()
    return
  }
  if (velocity < -0.6) { snap.value = 'full'; return }
  snap.value = Math.abs(height - fullHeight.value) < Math.abs(height - peekHeight.value) ? 'full' : 'peek'
}

const onHandleDown = (event) => {
  if (event.button !== undefined && event.button !== 0) return
  event.currentTarget.setPointerCapture?.(event.pointerId)
  beginDrag(event.clientY)
}
const onHandleMove = (event) => { if (drag) updateDrag(event.clientY) }
const onHandleUp = () => finishDrag()

// Dragging from the content: pulling up while the sheet is not yet full
// extends it; pulling down from the top of the content collapses or closes it.
// Sliders and inputs keep their own gestures.
let bodyTouch = null
const onBodyTouchStart = (event) => {
  const touch = event.touches[0]
  if (!touch || event.target.closest?.('input, .rds-vslider')) { bodyTouch = null; return }
  bodyTouch = { x: touch.clientX, y: touch.clientY, decided: false, sheet: false }
}
const onBodyTouchMove = (event) => {
  if (!bodyTouch) return
  const touch = event.touches[0]
  const dy = touch.clientY - bodyTouch.y
  const dx = touch.clientX - bodyTouch.x
  if (!bodyTouch.decided) {
    if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return
    bodyTouch.decided = true
    const atTop = (bodyRef.value?.scrollTop || 0) <= 0
    bodyTouch.sheet = Math.abs(dy) > Math.abs(dx) && ((dy < 0 && snap.value !== 'full') || (dy > 0 && atTop))
    if (bodyTouch.sheet) beginDrag(bodyTouch.y)
  }
  if (bodyTouch.sheet) {
    event.preventDefault()
    updateDrag(touch.clientY)
  }
}
const onBodyTouchEnd = () => {
  if (bodyTouch?.sheet) finishDrag()
  bodyTouch = null
}

const onResize = () => { viewport.value = window.innerHeight }
const onKey = (event) => { if (event.key === 'Escape') close() }
watch(() => props.open, (open) => {
  if (typeof window === 'undefined') return
  if (open) {
    snap.value = 'peek'
    viewport.value = window.innerHeight
    measureTopInset()
    window.addEventListener('resize', onResize)
    window.addEventListener('keydown', onKey)
  } else {
    window.removeEventListener('resize', onResize)
    window.removeEventListener('keydown', onKey)
  }
}, { immediate: true })
onBeforeUnmount(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.rds-layer {
  --rds-bg: #f7f6f9;
  --rds-card: #ffffff;
  --rds-text: #1d1b22;
  --rds-muted: #77737f;
  --rds-line: rgba(29, 27, 34, 0.08);
  --rds-control: #ebe9ef;
  --rds-accent: var(--color-brand-primary, #8a2be2);
  --rds-accent-soft: color-mix(in srgb, var(--rds-accent) 14%, transparent);
  position: fixed;
  inset: 0;
  z-index: 3300;
  display: flex;
  align-items: flex-end;
  font-family: var(--mobile-font-family);
}
.rds-layer.dark {
  --rds-bg: #1b1a20;
  --rds-card: #26252c;
  --rds-text: #efedf3;
  --rds-muted: #9e9aa8;
  --rds-line: rgba(255, 255, 255, 0.08);
  --rds-control: #313038;
  --rds-accent: #b98cff;
}
.rds-backdrop { position: absolute; inset: 0; border: 0; background: rgba(10, 8, 14, 0.32); transition: opacity 0.2s ease; }
.rds-sheet {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  border-radius: 26px 26px 0 0;
  background: var(--rds-bg);
  color: var(--rds-text);
  box-shadow: 0 -18px 40px rgba(10, 8, 14, 0.22);
  transition: height 0.32s cubic-bezier(0.22, 1, 0.36, 1);
  overflow: hidden;
}
.rds-sheet.dragging { transition: none; }
.rds-head { flex: 0 0 auto; padding: 8px 16px 6px; touch-action: none; cursor: grab; user-select: none; }
.rds-grabber { display: block; width: 38px; height: 5px; margin: 0 auto 8px; border-radius: 999px; background: color-mix(in srgb, var(--rds-text) 22%, transparent); }
.rds-title-row { display: flex; align-items: center; justify-content: space-between; }
.rds-title-row h2 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 19px; font-weight: 700; letter-spacing: -0.01em; }
.rds-title-row h2 i { color: var(--rds-accent); font-size: 20px; }
.rds-head-actions { display: flex; gap: 8px; }
.rds-icon-btn { display: grid; width: 34px; height: 34px; place-items: center; border: 0; border-radius: 50%; background: var(--rds-control); color: var(--rds-text); font-size: 19px; cursor: pointer; }
.rds-body { flex: 1 1 auto; overflow-y: auto; overscroll-behavior: contain; padding: 10px 16px calc(28px + env(safe-area-inset-bottom)); }

.rds-row-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.rds-swatches { display: flex; gap: 4px; padding: 5px; border-radius: 999px; background: var(--rds-control); }
.rds-swatch { display: grid; width: 38px; height: 38px; place-items: center; padding: 0; border: 0; border-radius: 50%; background: transparent; cursor: pointer; }
.rds-swatch span { width: 26px; height: 26px; border-radius: 50%; box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.14); }
.rds-swatch.active { background: var(--rds-card); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12); }
.rds-swatch.active span { box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.14), 0 0 0 2px var(--rds-card), 0 0 0 4px var(--rds-accent); }
.rds-mode { display: flex; gap: 4px; padding: 5px; border-radius: 999px; background: var(--rds-control); }
.rds-mode button { display: grid; width: 42px; height: 38px; place-items: center; border: 0; border-radius: 999px; background: transparent; color: var(--rds-muted); font-size: 18px; cursor: pointer; }
.rds-mode button.active { background: var(--rds-card); color: var(--rds-text); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
.rds-caption { margin: 6px 4px 14px; color: var(--rds-muted); font-size: 12px; }

.rds-tiles { display: grid; grid-template-columns: 1.35fr 1fr 1fr; gap: 10px; height: 168px; }
.rds-font-tile { display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-end; padding: 14px; border: 0; border-radius: 22px; background: var(--rds-card); color: var(--rds-text); text-align: left; cursor: pointer; box-shadow: 0 1px 0 var(--rds-line); }
.rds-font-glyph { margin-bottom: auto; font-size: 34px; line-height: 1; }
.rds-tile-title { font-size: 15px; font-weight: 650; }
.rds-tile-hint { color: var(--rds-muted); font-size: 11.5px; }
.rds-vslider { position: relative; overflow: hidden; border-radius: 22px; background: var(--rds-control); touch-action: none; cursor: ns-resize; outline-offset: 2px; }
.rds-vfill { position: absolute; right: 0; bottom: 0; left: 0; background: var(--rds-card); border-top: 2px solid var(--rds-accent); transition: height 0.08s linear; }
.rds-vvalue { position: absolute; top: 12px; left: 0; right: 0; color: var(--rds-text); font-size: 14px; font-weight: 700; text-align: center; font-variant-numeric: tabular-nums; }
.rds-vicon { position: absolute; bottom: 30px; left: 50%; color: var(--rds-text); font-size: 22px; transform: translateX(-50%); }
.rds-vlabel { position: absolute; bottom: 10px; left: 0; right: 0; color: var(--rds-muted); font-size: 11px; text-align: center; }

.rds-rounds { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 16px 0 4px; }
.rds-round { display: grid; justify-items: center; gap: 6px; padding: 0; border: 0; background: none; color: var(--rds-muted); font: inherit; font-size: 11.5px; cursor: pointer; }
.rds-round span { display: grid; width: 54px; height: 54px; place-items: center; border-radius: 50%; background: var(--rds-control); color: var(--rds-text); font-size: 21px; transition: background 0.15s ease, color 0.15s ease; }
.rds-round.on span { background: var(--rds-accent-soft); color: var(--rds-accent); }
.rds-round.on { color: var(--rds-text); }

.rds-divider { display: flex; align-items: center; gap: 10px; margin: 22px 0 14px; color: var(--rds-muted); font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
.rds-divider::before, .rds-divider::after { content: ''; flex: 1; height: 1px; background: var(--rds-line); }

.rds-preview { margin-bottom: 16px; padding: 16px 0; border-radius: 18px; background: #ffffff; color: #1f1d24; box-shadow: inset 0 0 0 1px var(--rds-line); }
.rds-preview.bg-paper { background: #f7f2e8; color: #2b2620; }
.rds-preview.bg-sepia { background: #ecdfc8; color: #43331f; }
.rds-preview.bg-night { background: #14161c; color: #d9d6cf; }
.rds-layer.dark .rds-preview.bg-default { background: #1d1b22; color: #e6e3ea; }
.rds-preview p { margin: 0; hyphens: auto; }
/* main.css forces `font-weight: 400 !important` on p/span/button app-wide, so
   the sample and the weight buttons must out-rank it, or Thickness shows no
   change here even though it reaches the book text. */
.rds-preview p,
.rds-font-glyph,
.rds-weight-btn { font-weight: var(--rds-weight, 400) !important; }

.rds-block { margin-bottom: 16px; }
.rds-label { margin: 0 0 8px 2px; color: var(--rds-muted); font-size: 12px; font-weight: 600; }
.rds-note { margin: 6px 2px 0; color: var(--rds-muted); font-size: 11.5px; }
.rds-seg { display: flex; gap: 4px; padding: 4px; border-radius: 14px; background: var(--rds-control); }
.rds-seg button { display: inline-flex; flex: 1; align-items: center; justify-content: center; gap: 6px; min-height: 38px; padding: 0 6px; border: 0; border-radius: 10px; background: transparent; color: var(--rds-muted); font: inherit; font-size: 13px; cursor: pointer; }
.rds-seg button.active { background: var(--rds-card); color: var(--rds-text); box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1); }
.rds-seg button:disabled { opacity: 0.4; cursor: default; }
.rds-stepper-row { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; font-size: 14px; }
.rds-stepper { display: flex; align-items: center; gap: 4px; padding: 4px; border-radius: 14px; background: var(--rds-control); }
.rds-stepper button { display: grid; width: 36px; height: 34px; place-items: center; border: 0; border-radius: 10px; background: var(--rds-card); color: var(--rds-text); font-size: 18px; cursor: pointer; }
.rds-stepper button:disabled { opacity: 0.4; }
.rds-stepper output { min-width: 52px; font-size: 13px; text-align: center; }

.rds-font-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.rds-font-card { display: grid; justify-items: center; gap: 2px; padding: 12px 4px 10px; border: 1.5px solid transparent; border-radius: 16px; background: var(--rds-card); color: var(--rds-muted); font: inherit; font-size: 12px; cursor: pointer; }
.rds-font-card span { color: var(--rds-text); font-size: 26px; line-height: 1.2; }
.rds-font-card.active { border-color: var(--rds-accent); color: var(--rds-text); }

.rds-spacing-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.rds-spacing-card { display: grid; justify-items: center; gap: 6px; padding: 12px 4px 8px; border: 1.5px solid transparent; border-radius: 16px; background: var(--rds-card); color: var(--rds-muted); font: inherit; font-size: 12px; cursor: pointer; }
.rds-spacing-card.active { border-color: var(--rds-accent); color: var(--rds-text); }
.rds-lines { display: flex; flex-direction: column; width: 30px; height: 30px; justify-content: center; }
.rds-lines i { display: block; height: 3px; border-radius: 2px; background: currentColor; opacity: 0.7; }
.rds-lines i:last-child { width: 70%; }

.rds-range-head { display: flex; align-items: baseline; justify-content: space-between; }
.rds-range-head output { color: var(--rds-text); font-size: 12px; font-variant-numeric: tabular-nums; }
.rds-range { width: 100%; height: 30px; margin: 0; background: transparent; appearance: none; -webkit-appearance: none; }
.rds-range::-webkit-slider-runnable-track { height: 8px; border-radius: 999px; background: linear-gradient(90deg, var(--rds-accent) var(--fill, 0%), var(--rds-control) var(--fill, 0%)); }
.rds-range::-webkit-slider-thumb { width: 24px; height: 24px; margin-top: -8px; border: 3px solid var(--rds-card); border-radius: 50%; background: var(--rds-accent); box-shadow: 0 1px 6px rgba(0, 0, 0, 0.25); -webkit-appearance: none; }
.rds-range::-moz-range-track { height: 8px; border-radius: 999px; background: var(--rds-control); }
.rds-range::-moz-range-progress { height: 8px; border-radius: 999px; background: var(--rds-accent); }
.rds-range::-moz-range-thumb { width: 20px; height: 20px; border: 3px solid var(--rds-card); border-radius: 50%; background: var(--rds-accent); }

.rds-reset { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; min-height: 44px; margin-top: 6px; border: 1px dashed color-mix(in srgb, var(--rds-text) 22%, transparent); border-radius: 14px; background: transparent; color: var(--rds-muted); font: inherit; font-size: 13px; cursor: pointer; }

.rds-enter-active, .rds-leave-active { transition: opacity 0.22s ease; }
.rds-enter-active .rds-sheet, .rds-leave-active .rds-sheet { transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), height 0.32s cubic-bezier(0.22, 1, 0.36, 1); }
.rds-enter-from, .rds-leave-to { opacity: 0; }
.rds-enter-from .rds-sheet, .rds-leave-to .rds-sheet { transform: translateY(100%); }
</style>
