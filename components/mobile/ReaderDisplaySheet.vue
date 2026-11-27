<template>
  <Teleport to="body">
    <Transition name="rds" @after-enter="resyncSystemBars" @after-leave="resyncSystemBars">
      <div v-if="open" class="rds-layer" :class="theme" data-system-bar-undimmed>
        <button type="button" class="rds-backdrop" aria-label="Close display settings" @click="close"></button>

        <!-- Display settings, laid out like an iOS settings sheet: a fixed
             preview, then grouped cards. Sliders commit on release, so the book
             is re-laid-out once per change rather than on every step of a drag. -->
        <section
          ref="sheetRef"
          class="reader-display-sheet rds-sheet"
          :class="{ dragging: dragY !== null }"
          :style="dragY ? { transform: `translateY(${dragY}px)` } : undefined"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rds-title"
        >
          <!-- Pull the handle down to close. -->
          <header
            class="rds-head"
            @pointerdown="onHandleDown"
            @pointermove="onHandleMove"
            @pointerup="onHandleUp"
            @pointercancel="onHandleUp"
          >
            <span class="rds-grabber" aria-hidden="true"></span>
            <div class="rds-title-row">
              <h2 id="rds-title">Reading Settings</h2>
              <button type="button" class="rds-close" aria-label="Close" @click.stop="close" @pointerdown.stop>
                <i class="ri-close-line" aria-hidden="true"></i>
              </button>
            </div>
          </header>

          <div ref="bodyRef" class="rds-body">
            <!-- PDFs first: an original-layout PDF has nothing else to set. -->
            <section v-if="isPdfDocument" class="rds-group">
              <div class="rds-card rds-pad">
                <div class="rds-seg" role="group" aria-label="PDF view">
                  <button
                    v-for="mode in ['original', 'reflow']"
                    :key="mode"
                    type="button"
                    :class="{ active: prefs.pdfViewMode === mode }"
                    :aria-pressed="prefs.pdfViewMode === mode"
                    :disabled="mode === 'reflow' && !pdfReflowAvailable"
                    @click="updatePrefs({ pdfViewMode: mode })"
                  >{{ mode === 'original' ? 'Original Pages' : 'Reflow Text' }}</button>
                </div>
                <p v-if="!pdfReflowAvailable" class="rds-note">This PDF has no text layer, so Reflow is unavailable.</p>
                <div v-if="isOriginalPdf" class="rds-row rds-row-flush">
                  <span class="rds-label">Zoom</span>
                  <div class="rds-stepper" role="group" aria-label="PDF zoom">
                    <button type="button" aria-label="Zoom out" :disabled="prefs.pdfZoom <= PDF_ZOOM_MIN" @click="stepPdfZoom(-1)"><i class="ri-subtract-line"></i></button>
                    <output>{{ Math.round(prefs.pdfZoom * 100) }}%</output>
                    <button type="button" aria-label="Zoom in" :disabled="prefs.pdfZoom >= PDF_ZOOM_MAX" @click="stepPdfZoom(1)"><i class="ri-add-line"></i></button>
                  </div>
                </div>
              </div>
            </section>

            <template v-if="!isOriginalPdf">
              <!-- Preview at a FIXED height: text grows inside it, nothing
                   below moves while a slider is being dragged. -->
              <div class="rds-preview" :class="`bg-${prefs.background}`" aria-hidden="true">
                <p :style="previewStyle">It was the hour when the lamps came on along the river, and the pages seemed to turn themselves. Nobody on the bridge looked up.</p>
              </div>

              <!-- Page -->
              <section class="rds-group" aria-label="Page">
                <div class="rds-card rds-pad">
                  <div class="rds-page-row">
                    <div class="rds-themes" role="radiogroup" aria-label="Page colour">
                      <button
                        v-for="option in READER_PAGE_THEMES"
                        :key="option.id"
                        type="button"
                        role="radio"
                        class="rds-theme"
                        :class="{ active: prefs.background === option.id }"
                        :aria-checked="prefs.background === option.id"
                        :aria-label="option.label"
                        @click="updatePrefs({ background: option.id })"
                      >
                        <span :style="{ background: option.swatch }"></span>
                      </button>
                    </div>
                    <div class="rds-seg rds-seg-icons" role="group" aria-label="Reading mode">
                      <button type="button" :class="{ active: prefs.readingMode === 'page' }" :aria-pressed="prefs.readingMode === 'page'" aria-label="Pages" @click="updatePrefs({ readingMode: 'page' })"><i class="ri-book-open-line"></i></button>
                      <button type="button" :class="{ active: prefs.readingMode === 'scroll' }" :aria-pressed="prefs.readingMode === 'scroll'" aria-label="Scroll" @click="updatePrefs({ readingMode: 'scroll' })"><i class="ri-scroll-to-bottom-line"></i></button>
                    </div>
                  </div>
                  <div class="rds-slider-block">
                    <ReaderSlider
                      :model-value="prefs.brightness"
                      :min="READER_BRIGHTNESS_MIN"
                      :max="100"
                      :step="1"
                      label="Brightness"
                      :value-text="`${prefs.brightness}%`"
                      @input="updatePrefs({ brightness: $event })"
                    >
                      <template #start><i class="ri-sun-line rds-glyph-small"></i></template>
                      <template #end><i class="ri-sun-fill rds-glyph-large"></i></template>
                    </ReaderSlider>
                  </div>
                </div>
              </section>

              <!-- Text -->
              <section class="rds-group" aria-labelledby="rds-text-title">
                <h3 id="rds-text-title" class="rds-group-title">Text</h3>
                <div class="rds-card">
                  <div class="rds-pad">
                    <div class="rds-seg rds-fonts" role="group" aria-label="Font">
                      <button
                        v-for="font in READER_FONT_OPTIONS"
                        :key="font.id"
                        type="button"
                        :class="{ active: prefs.fontFamily === font.id }"
                        :aria-pressed="prefs.fontFamily === font.id"
                        @click="updatePrefs({ fontFamily: font.id })"
                      >
                        <span class="rds-font-aa" :style="{ fontFamily: font.stack }">Aa</span>
                        <span class="rds-font-name">{{ font.label }}</span>
                      </button>
                    </div>
                  </div>

                  <div class="rds-slider-block rds-divided">
                    <div class="rds-slider-head"><span class="rds-label">Font Size</span><output>{{ live.fontSize ?? prefs.fontSize }} px</output></div>
                    <ReaderSlider
                      :model-value="prefs.fontSize"
                      :min="READER_FONT_SIZE_MIN"
                      :max="READER_FONT_SIZE_MAX"
                      label="Font size"
                      @input="live.fontSize = $event"
                      @change="commit('fontSize', $event)"
                    >
                      <template #start><span class="rds-a-small">A</span></template>
                      <template #end><span class="rds-a-large">A</span></template>
                    </ReaderSlider>
                  </div>

                  <div class="rds-row rds-divided">
                    <span class="rds-label">Thickness</span>
                    <div class="rds-seg rds-seg-compact" role="group" aria-label="Font weight">
                      <button
                        v-for="weight in READER_WEIGHT_OPTIONS"
                        :key="weight.id"
                        type="button"
                        :class="{ active: prefs.fontWeight === weight.id }"
                        :aria-pressed="prefs.fontWeight === weight.id"
                        :aria-label="weight.label"
                        :style="{ '--rds-weight': weight.id }"
                        @click="updatePrefs({ fontWeight: weight.id })"
                      >Aa</button>
                    </div>
                  </div>

                  <div class="rds-row rds-divided">
                    <span class="rds-label">Line Spacing</span>
                    <div class="rds-seg rds-seg-compact" role="group" aria-label="Line spacing">
                      <button
                        v-for="spacing in READER_LINE_SPACING_OPTIONS"
                        :key="spacing"
                        type="button"
                        :class="{ active: prefs.lineSpacing === spacing }"
                        :aria-pressed="prefs.lineSpacing === spacing"
                        :aria-label="`Line spacing ${spacing}`"
                        @click="updatePrefs({ lineSpacing: spacing })"
                      >
                        <span class="rds-lines" :style="{ gap: `${(spacing - 1) * 6 + 2}px` }"><i></i><i></i><i></i></span>
                      </button>
                    </div>
                  </div>

                  <div class="rds-row rds-divided">
                    <span class="rds-label">Justify Text</span>
                    <button
                      type="button"
                      class="rds-switch"
                      role="switch"
                      aria-label="Justify text"
                      :aria-checked="prefs.textAlign === 'justify'"
                      :class="{ on: prefs.textAlign === 'justify' }"
                      @click="updatePrefs({ textAlign: prefs.textAlign === 'justify' ? 'left' : 'justify' })"
                    ><span class="knob"></span></button>
                  </div>
                </div>
              </section>

              <!-- Layout -->
              <section class="rds-group" aria-labelledby="rds-layout-title">
                <h3 id="rds-layout-title" class="rds-group-title">Layout</h3>
                <div class="rds-card">
                  <div class="rds-slider-block">
                    <div class="rds-slider-head"><span class="rds-label">Page Margins</span><output>{{ live.pageMargin ?? prefs.pageMargin }} px</output></div>
                    <ReaderSlider
                      :model-value="prefs.pageMargin"
                      :min="READER_MARGIN_MIN"
                      :max="READER_MARGIN_MAX"
                      :step="2"
                      label="Page margins"
                      @input="live.pageMargin = $event"
                      @change="commit('pageMargin', $event)"
                    >
                      <template #start><span class="rds-margin-glyph narrow"><i></i></span></template>
                      <template #end><span class="rds-margin-glyph wide"><i></i></span></template>
                    </ReaderSlider>
                  </div>
                  <div class="rds-slider-block rds-divided">
                    <div class="rds-slider-head"><span class="rds-label">Letter Spacing</span><output>{{ ((live.letterSpacing ?? prefs.letterSpacing) / 1000).toFixed(2) }}</output></div>
                    <ReaderSlider
                      :model-value="prefs.letterSpacing"
                      :min="0"
                      :max="READER_LETTER_SPACING_MAX"
                      :step="5"
                      label="Letter spacing"
                      @input="live.letterSpacing = $event"
                      @change="commit('letterSpacing', $event)"
                    >
                      <template #start><span class="rds-spacing-glyph">Aa</span></template>
                      <template #end><span class="rds-spacing-glyph wide">A T</span></template>
                    </ReaderSlider>
                  </div>
                </div>
              </section>

              <!-- Highlight: the same choice as Preferences → Highlight. -->
              <section class="rds-group" aria-labelledby="rds-highlight-title">
                <h3 id="rds-highlight-title" class="rds-group-title">Highlight</h3>
                <div class="rds-card">
                  <div class="rds-row">
                    <span class="rds-label">Follow the Voice</span>
                    <button
                      type="button"
                      class="rds-switch"
                      role="switch"
                      aria-label="Highlight while reading"
                      :aria-checked="highlightOn"
                      :class="{ on: highlightOn }"
                      @click="updateSettings({ readerHighlight: !highlightOn })"
                    ><span class="knob"></span></button>
                  </div>
                  <div v-if="highlightOn" class="rds-hl-colours rds-divided" role="radiogroup" aria-label="Highlight colour">
                    <button
                      type="button"
                      role="radio"
                      class="rds-hl"
                      :class="{ active: highlightFollowsAccent }"
                      :aria-checked="highlightFollowsAccent"
                      aria-label="Match accent"
                      @click="updateSettings({ highlightColor: 'accent' })"
                    >
                      <span class="rds-hl-dot accent" :class="{ mono: settings.accentColor === 'mono' }" :style="{ background: accentSolid(settings.accentColor, isDarkApp) }"><i class="ri-palette-line"></i></span>
                      <span class="rds-hl-name">Accent</span>
                    </button>
                    <button
                      v-for="accent in ACCENT_SWATCHES"
                      :key="accent.id"
                      type="button"
                      role="radio"
                      class="rds-hl"
                      :class="{ active: settings.highlightColor === accent.id }"
                      :aria-checked="settings.highlightColor === accent.id"
                      :aria-label="accent.label"
                      @click="updateSettings({ highlightColor: accent.id })"
                    >
                      <span class="rds-hl-dot" :class="{ mono: accent.id === 'mono' }" :style="{ background: isDarkApp ? accent.dark : accent.light }"></span>
                      <span class="rds-hl-name">{{ accent.label.replace('Pastel ', 'P. ') }}</span>
                    </button>
                  </div>
                </div>
              </section>

              <button type="button" class="rds-reset" @click="resetDefaults">Reset to Defaults</button>
            </template>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
// Reader display settings as a bottom sheet over the page, so every change is
// seen on the book itself.
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import ReaderSlider from '~/components/mobile/ReaderSlider.vue'
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
import { ACCENT_SWATCHES, accentSolid } from '~/utils/accentPalette'

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
const isDarkApp = computed(() => settings.value.readerTheme === 'dark')
const highlightOn = computed(() => settings.value.readerHighlight !== false)
const highlightFollowsAccent = computed(() => !settings.value.highlightColor || settings.value.highlightColor === 'accent')

// Values while a slider is held: shown in its label and the preview only. The
// book takes the value once, on release (`commit`) — re-laying-out a long
// chapter on every step of a drag is what made the old sliders jitter.
const live = reactive({ fontSize: null, pageMargin: null, letterSpacing: null })
const commit = (key, value) => {
  live[key] = null
  updatePrefs({ [key]: value })
}

const stepPdfZoom = (direction) => updatePrefs({ pdfZoom: (prefs.value.pdfZoom || 1) + direction * PDF_ZOOM_STEP })
const resetDefaults = () => {
  const { readingMode, pdfViewMode, pdfPageMode, pdfZoom } = prefs.value
  updatePrefs({ ...DEFAULT_MOBILE_READER_PREFS, readingMode, pdfViewMode, pdfPageMode, pdfZoom })
  // The highlight colour goes back to following the app's accent.
  if (settings.value.highlightColor !== 'accent') updateSettings({ highlightColor: 'accent' })
}

const previewStyle = computed(() => ({
  fontFamily: readerFontStack(prefs.value.fontFamily),
  fontSize: `${live.fontSize ?? prefs.value.fontSize}px`,
  '--rds-weight': prefs.value.fontWeight,
  lineHeight: prefs.value.lineSpacing,
  textAlign: prefs.value.textAlign,
  letterSpacing: `${0.002 + (live.letterSpacing ?? prefs.value.letterSpacing) / 1000}em`,
  paddingInline: `${Math.round((live.pageMargin ?? prefs.value.pageMargin) * 0.8)}px`,
}))

// ── Pull down to close ──
const sheetRef = ref(null)
const bodyRef = ref(null)
const dragY = ref(null)
let dragStart = null
const onHandleDown = (event) => {
  if (event.button !== undefined && event.button !== 0) return
  event.currentTarget.setPointerCapture?.(event.pointerId)
  dragStart = { y: event.clientY, t: performance.now() }
  dragY.value = 0
}
const onHandleMove = (event) => {
  if (!dragStart) return
  dragY.value = Math.max(0, event.clientY - dragStart.y)
}
const onHandleUp = (event) => {
  if (!dragStart) return
  const distance = dragY.value || 0
  const speed = distance / Math.max(1, performance.now() - dragStart.t)
  dragStart = null
  dragY.value = null
  if (distance > 120 || speed > 0.8) close()
}

const close = () => emit('close')
// The system bars take their colour from whatever is under them. While the sheet
// is up that is the sheet, so once it has finished sliding in or out the bars
// re-sample: otherwise the navigation bar keeps the sheet's colour over the page.
const resyncSystemBars = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('bookish:system-bars-change'))
}

const onKey = (event) => { if (event.key === 'Escape') close() }
watch(() => props.open, (open) => {
  if (typeof window === 'undefined') return
  if (open) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
}, { immediate: true })
onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.rds-layer {
  --rds-bg: #f2f2f7;
  --rds-card: #ffffff;
  --rds-text: #000000;
  --rds-muted: #8a8a8e;
  --rds-line: rgba(60, 60, 67, 0.14);
  --rds-control: rgba(118, 118, 128, 0.12);
  --rds-seg-active: #ffffff;
  --rds-accent: var(--color-brand-primary);
  position: fixed;
  inset: 0;
  z-index: 3300;
  display: flex;
  align-items: flex-end;
  font-family: var(--mobile-font-family);
}

.rds-layer.dark {
  --rds-bg: #1c1c1e;
  --rds-card: #2c2c2e;
  --rds-text: #ffffff;
  --rds-muted: #98989f;
  --rds-line: rgba(84, 84, 88, 0.6);
  --rds-control: rgba(118, 118, 128, 0.24);
  --rds-seg-active: #636366;
}

.rds-backdrop { position: absolute; inset: 0; border: 0; background: rgba(0, 0, 0, 0.3); }

.rds-sheet {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 640px;
  max-height: calc(100vh - env(safe-area-inset-top) - 24px);
  margin: 0 auto;
  overflow: hidden;
  border-radius: 22px 22px 0 0;
  background: var(--rds-bg);
  color: var(--rds-text);
  box-shadow: 0 -12px 36px rgba(0, 0, 0, 0.18);
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.rds-sheet.dragging { transition: none; }

.rds-head { flex: none; padding: 6px 16px 4px; touch-action: none; cursor: grab; user-select: none; }
.rds-grabber { display: block; width: 36px; height: 5px; margin: 0 auto 6px; border-radius: 999px; background: color-mix(in srgb, var(--rds-text) 22%, transparent); }
.rds-title-row { display: grid; grid-template-columns: 30px 1fr 30px; align-items: center; }
.rds-title-row h2 { grid-column: 2; margin: 0; font-size: 17px; font-weight: 400 !important; text-align: center; }
.rds-close { display: grid; width: 30px; height: 30px; place-items: center; padding: 0; border: 0; border-radius: 50%; background: var(--rds-control); color: var(--rds-muted); font-size: 18px; cursor: pointer; }

.rds-body {
  display: grid;
  gap: 22px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 10px 16px calc(24px + env(safe-area-inset-bottom));
}

/* ── Preview: fixed height, text clipped and faded at the bottom ── */
.rds-preview {
  height: 108px;
  overflow: hidden;
  border-radius: 14px;
  background: #ffffff;
  color: #1d1b22;
  -webkit-mask-image: linear-gradient(to bottom, #000 72%, transparent);
  mask-image: linear-gradient(to bottom, #000 72%, transparent);
}
.rds-preview.bg-paper { background: #f7f2e8; color: #2b2620; }
.rds-preview.bg-sepia { background: #ecdfc8; color: #3a2f22; }
.rds-preview.bg-night { background: #000000; color: #d8d6dc; }
.rds-layer.dark .rds-preview.bg-default { background: #18171c; color: #e4e4e7; }
.rds-preview p { margin: 0; padding-block: 14px; font-weight: var(--rds-weight, 400) !important; }

/* ── Grouped cards ── */
.rds-group { display: grid; gap: 7px; }
.rds-group-title { margin: 0 0 0 16px; color: var(--rds-muted); font-size: 13px; font-weight: 400 !important; letter-spacing: 0.02em; text-transform: uppercase; }
.rds-card { overflow: hidden; border-radius: 14px; background: var(--rds-card); }
.rds-pad { padding: 12px 14px; }
.rds-divided { position: relative; }
.rds-divided::before { position: absolute; top: 0; right: 0; left: 16px; height: 0.5px; background: var(--rds-line); content: ''; }
.rds-row { display: flex; min-height: 50px; align-items: center; justify-content: space-between; gap: 12px; padding: 6px 14px 6px 16px; }
.rds-row-flush { padding: 10px 0 0; }
.rds-label { font-size: 16px; }
.rds-note { margin: 8px 2px 0; color: var(--rds-muted); font-size: 13px; }

/* Segmented controls (iOS). */
.rds-seg { display: flex; gap: 2px; padding: 2px; border-radius: 9px; background: var(--rds-control); }
.rds-seg button { display: grid; flex: 1; min-height: 32px; place-items: center; padding: 0 10px; border: 0; border-radius: 7px; background: transparent; color: var(--rds-text); font: inherit; font-size: 14px; cursor: pointer; transition: background-color 0.16s ease; -webkit-tap-highlight-color: transparent; }
.rds-seg button.active { background: var(--rds-seg-active); box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12), 0 1px 1px rgba(0, 0, 0, 0.04); }
.rds-seg button:disabled { opacity: 0.4; }
.rds-seg-icons button { width: 44px; flex: none; font-size: 18px; }
.rds-seg-compact button { min-width: 46px; flex: none; font-weight: var(--rds-weight, 400) !important; }
.rds-fonts button { min-height: 60px; gap: 1px; align-content: center; }
.rds-font-aa { font-size: 22px; line-height: 1.1; }
.rds-font-name { color: var(--rds-muted); font-size: 11.5px; }

.rds-lines { display: grid; width: 18px; }
.rds-lines i { display: block; height: 1.5px; border-radius: 1px; background: currentColor; }

/* Page colour circles + Pages / Scroll. */
.rds-page-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.rds-themes { display: flex; gap: 8px; }
.rds-theme { display: grid; width: 36px; height: 36px; place-items: center; padding: 0; border: 0; border-radius: 50%; background: transparent; cursor: pointer; }
.rds-theme span { width: 30px; height: 30px; border-radius: 50%; box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.14); }
.rds-theme.active span { box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.14), 0 0 0 2px var(--rds-card), 0 0 0 4px var(--rds-accent); }

/* Sliders. */
.rds-slider-block { padding: 8px 16px 6px; --rs-track: var(--rds-control); --rs-fill: var(--rds-accent); --rs-end-color: var(--rds-muted); }
.rds-card.rds-pad .rds-slider-block { padding: 10px 0 0; }
.rds-slider-head { display: flex; align-items: baseline; justify-content: space-between; padding-top: 6px; }
.rds-slider-head output { color: var(--rds-muted); font-size: 15px; font-variant-numeric: tabular-nums; }
.rds-glyph-small { font-size: 15px; }
.rds-glyph-large { font-size: 22px; }
.rds-a-small, .rds-a-large { font-family: Georgia, 'Times New Roman', serif; }
.rds-a-small { font-size: 14px; }
.rds-a-large { font-size: 23px; }
.rds-spacing-glyph { font-family: Georgia, 'Times New Roman', serif; font-size: 16px; white-space: nowrap; }
.rds-spacing-glyph.wide { letter-spacing: 0.08em; }
.rds-margin-glyph { display: grid; width: 20px; height: 16px; place-items: center; border-inline: 1.5px solid currentColor; }
.rds-margin-glyph i { display: block; height: 8px; border-block: 1.5px solid currentColor; }
.rds-margin-glyph.narrow i { width: 12px; }
.rds-margin-glyph.wide i { width: 6px; }

/* Switches (same as Settings). */
.rds-switch { position: relative; flex: none; width: var(--settings-switch-width, 51px); height: var(--settings-switch-height, 31px); padding: 0; border: 0; border-radius: 999px; background: var(--rds-control); cursor: pointer; transition: background 0.2s ease; }
.rds-switch.on { background: var(--color-switch-on); }
.rds-switch .knob { position: absolute; top: 2px; left: 2px; width: var(--settings-switch-knob, 27px); height: var(--settings-switch-knob, 27px); border-radius: 50%; background: #fff; box-shadow: 0 2px 5px rgba(15, 23, 42, 0.25); transition: transform 0.2s ease; }
.rds-switch.on .knob { background: var(--color-switch-knob-on); transform: translateX(calc(var(--settings-switch-width, 51px) - var(--settings-switch-knob, 27px) - 4px)); }

/* Highlight colours: one scrolling row. */
.rds-hl-colours { display: flex; gap: 6px; overflow-x: auto; padding: 12px 12px 10px; scrollbar-width: none; }
.rds-hl-colours::-webkit-scrollbar { display: none; }
.rds-hl { display: grid; flex: none; width: 54px; justify-items: center; gap: 5px; padding: 0; border: 0; background: none; color: var(--rds-muted); font: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.rds-hl-dot { display: grid; width: 32px; height: 32px; place-items: center; border-radius: 50%; color: #fff; font-size: 15px; transition: box-shadow 0.16s ease; }
.rds-hl-dot.accent { color: var(--color-text-on-brand); }
.rds-hl-dot.mono { box-shadow: inset 0 0 0 1px rgba(128, 128, 128, 0.55); }
.rds-hl.active .rds-hl-dot.mono { box-shadow: inset 0 0 0 1px rgba(128, 128, 128, 0.55), 0 0 0 2px var(--rds-card), 0 0 0 4px var(--rds-text); }
.rds-hl.active .rds-hl-dot { box-shadow: 0 0 0 2px var(--rds-card), 0 0 0 4px var(--rds-text); }
.rds-hl-name { font-size: 10.5px; line-height: 1.15; text-align: center; }
.rds-hl.active .rds-hl-name { color: var(--rds-text); }

.rds-stepper { display: inline-flex; align-items: center; height: 34px; overflow: hidden; border-radius: 9px; background: var(--rds-control); }
.rds-stepper button { display: grid; width: 40px; height: 100%; place-items: center; border: 0; background: transparent; color: var(--rds-text); font-size: 18px; cursor: pointer; }
.rds-stepper button:disabled { opacity: 0.3; }
.rds-stepper output { min-width: 52px; border-inline: 1px solid var(--rds-line); font-size: 14px; text-align: center; font-variant-numeric: tabular-nums; }

.rds-reset { min-height: 48px; border: 0; border-radius: 14px; background: var(--rds-card); color: var(--rds-accent); font: inherit; font-size: 16px; cursor: pointer; }
.rds-reset:active { background: var(--rds-control); }

/* ── Motion ── */
.rds-enter-active, .rds-leave-active { transition: opacity 0.22s ease; }
.rds-enter-active .rds-sheet, .rds-leave-active .rds-sheet { transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1); }
.rds-enter-from, .rds-leave-to { opacity: 0; }
.rds-enter-from .rds-sheet, .rds-leave-to .rds-sheet { transform: translateY(100%); }
@media (prefers-reduced-motion: reduce) {
  .rds-enter-active .rds-sheet, .rds-leave-active .rds-sheet { transition: none; }
}
</style>
