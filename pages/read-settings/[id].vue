<template>
  <div class="read-settings-page">
    <MobileSettingsNav title="Read settings" :back-to="readerPath" aria-label="Read settings navigation" />
    <main class="read-settings-content">
      <section v-if="isPdfDocument" class="read-settings-group" aria-labelledby="pdf-heading">
        <h2 id="pdf-heading" class="read-settings-group-title">PDF display</h2>
        <div class="read-setting-block">
          <div class="read-setting-copy"><span class="read-setting-label">View</span><span class="read-setting-hint">Published pages or text fitted to the screen.</span></div>
          <div class="read-setting-options" role="group" aria-label="PDF view">
            <button v-for="mode in ['original', 'reflow']" :key="mode" type="button" :class="{ active: prefs.pdfViewMode === mode }" :aria-pressed="prefs.pdfViewMode === mode" :disabled="mode === 'reflow' && !pdfReflowAvailable" @click="updatePrefs({ pdfViewMode: mode })">{{ mode === 'original' ? 'Original' : 'Reflow' }}</button>
          </div>
        </div>
        <p v-if="!pdfReflowAvailable" class="read-setting-note">This PDF has no text layer, so Reflow is unavailable.</p>
        <div v-if="isOriginalPdf" class="read-setting-block">
          <div class="read-setting-copy"><span class="read-setting-label">Zoom</span><span class="read-setting-hint">Original pages scroll continuously.</span></div>
          <div class="read-setting-stepper" role="group" aria-label="PDF zoom">
            <button type="button" aria-label="Zoom out" :disabled="prefs.pdfZoom <= PDF_ZOOM_MIN" @click="stepPdfZoom(-1)"><i class="ri-subtract-line"></i></button>
            <output>{{ Math.round(prefs.pdfZoom * 100) }}%</output>
            <button type="button" aria-label="Zoom in" :disabled="prefs.pdfZoom >= PDF_ZOOM_MAX" @click="stepPdfZoom(1)"><i class="ri-add-line"></i></button>
          </div>
        </div>
      </section>

      <section v-if="!isOriginalPdf" class="read-settings-group" aria-labelledby="layout-heading">
        <h2 id="layout-heading" class="read-settings-group-title">Page layout</h2>
        <div class="read-setting-block">
          <div class="read-setting-copy"><span class="read-setting-label">Reading mode</span><span class="read-setting-hint">Turn pages or scroll through the text.</span></div>
          <div class="read-setting-options" role="group" aria-label="Reading mode">
            <button v-for="mode in ['page', 'scroll']" :key="mode" type="button" :class="{ active: prefs.readingMode === mode }" :aria-pressed="prefs.readingMode === mode" @click="updatePrefs({ readingMode: mode })">{{ mode === 'page' ? 'Pages' : 'Scroll' }}</button>
          </div>
        </div>
        <div class="read-setting-block">
          <div class="read-setting-copy"><span class="read-setting-label">Background</span></div>
          <div class="read-setting-options" role="group" aria-label="Reading background">
            <button type="button" :class="{ active: prefs.background === 'default' }" :aria-pressed="prefs.background === 'default'" @click="updatePrefs({ background: 'default' })">Default</button>
            <button type="button" :class="{ active: prefs.background === 'sepia' }" :aria-pressed="prefs.background === 'sepia'" @click="updatePrefs({ background: 'sepia' })">Book brown</button>
          </div>
        </div>
      </section>

      <section v-if="!isOriginalPdf" class="read-settings-group" aria-labelledby="type-heading">
        <h2 id="type-heading" class="read-settings-group-title">Typography</h2>
        <div class="read-setting-block">
          <div class="read-setting-copy"><span class="read-setting-label">Font size</span></div>
          <div class="read-setting-stepper" role="group" aria-label="Font size">
            <button type="button" aria-label="Smaller text" :disabled="prefs.fontSize <= READER_FONT_SIZE_MIN" @click="stepFontSize(-1)"><i class="ri-subtract-line"></i></button>
            <output>{{ prefs.fontSize }}</output>
            <button type="button" aria-label="Larger text" :disabled="prefs.fontSize >= READER_FONT_SIZE_MAX" @click="stepFontSize(1)"><i class="ri-add-line"></i></button>
          </div>
        </div>
        <div class="read-setting-block stacked">
          <div class="read-setting-copy"><span class="read-setting-label">Font</span></div>
          <div class="read-setting-options" role="group" aria-label="Font family">
            <button v-for="font in READER_FONT_OPTIONS" :key="font.id" type="button" :class="{ active: prefs.fontFamily === font.id }" :aria-pressed="prefs.fontFamily === font.id" @click="updatePrefs({ fontFamily: font.id })">{{ font.label }}</button>
          </div>
        </div>
        <div class="read-setting-block stacked">
          <div class="read-setting-copy"><span class="read-setting-label">Thickness</span></div>
          <div class="read-setting-options" role="group" aria-label="Font weight">
            <button v-for="weight in READER_WEIGHT_OPTIONS" :key="weight.id" type="button" :class="{ active: prefs.fontWeight === weight.id }" :aria-pressed="prefs.fontWeight === weight.id" @click="updatePrefs({ fontWeight: weight.id })">{{ weight.label }}</button>
          </div>
        </div>
        <div class="read-setting-block stacked">
          <div class="read-setting-copy"><span class="read-setting-label">Line spacing</span></div>
          <div class="read-setting-options" role="group" aria-label="Line spacing">
            <button v-for="spacing in READER_LINE_SPACING_OPTIONS" :key="spacing" type="button" :class="{ active: prefs.lineSpacing === spacing }" :aria-pressed="prefs.lineSpacing === spacing" @click="updatePrefs({ lineSpacing: spacing })">{{ spacing }}</button>
          </div>
        </div>
        <div class="read-setting-block">
          <div class="read-setting-copy"><span class="read-setting-label">Alignment</span></div>
          <div class="read-setting-options" role="group" aria-label="Text alignment">
            <button type="button" :class="{ active: prefs.textAlign === 'justify' }" :aria-pressed="prefs.textAlign === 'justify'" @click="updatePrefs({ textAlign: 'justify' })">Justify</button>
            <button type="button" :class="{ active: prefs.textAlign === 'left' }" :aria-pressed="prefs.textAlign === 'left'" @click="updatePrefs({ textAlign: 'left' })">Left</button>
          </div>
        </div>
      </section>

      <section class="read-settings-group" aria-labelledby="reading-heading">
        <h2 id="reading-heading" class="read-settings-group-title">Reading</h2>
        <div class="read-setting-block">
          <div class="read-setting-copy"><span class="read-setting-label">Highlight while reading</span><span class="read-setting-hint">Follow the sentence being spoken.</span></div>
          <div class="read-setting-options" role="group" aria-label="Highlight while reading">
            <button type="button" :class="{ active: settings.readerHighlight }" :aria-pressed="settings.readerHighlight" @click="updateSettings({ readerHighlight: true })">On</button>
            <button type="button" :class="{ active: !settings.readerHighlight }" :aria-pressed="!settings.readerHighlight" @click="updateSettings({ readerHighlight: false })">Off</button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import MobileSettingsNav from '~/components/mobile/MobileSettingsNav.vue'
import { useMobileReaderPrefs, READER_FONT_OPTIONS, READER_WEIGHT_OPTIONS, READER_LINE_SPACING_OPTIONS, READER_FONT_SIZE_MIN, READER_FONT_SIZE_MAX, PDF_ZOOM_MIN, PDF_ZOOM_MAX, PDF_ZOOM_STEP } from '~/composables/useMobileReaderPrefs'
import { useBookishSettings } from '~/composables/useBookishSettings'

const route = useRoute()
const readerPath = computed(() => `/reader/${encodeURIComponent(String(route.params.id))}?mode=read`)
const { prefs, updatePrefs } = useMobileReaderPrefs()
const { settings, updateSettings } = useBookishSettings()
const isPdfDocument = computed(() => route.query.format === 'pdf')
const isOriginalPdf = computed(() => isPdfDocument.value && prefs.value.pdfViewMode === 'original')
const pdfReflowAvailable = computed(() => route.query.reflow !== '0')
const stepFontSize = direction => updatePrefs({ fontSize: prefs.value.fontSize + direction })
const stepPdfZoom = direction => updatePrefs({ pdfZoom: prefs.value.pdfZoom + direction * PDF_ZOOM_STEP })
</script>

<style scoped>
.read-settings-page { min-height: 100dvh; background: var(--color-settings-background); color: var(--color-text-primary); font-family: var(--mobile-font-family); }
.read-settings-content { display: grid; gap: 32px; max-width: 600px; margin: 0 auto; padding: 28px var(--mobile-page-padding-inline, 16px) calc(60px + env(safe-area-inset-bottom)); }
.read-settings-group { position: relative; display: grid; padding: 4px 14px; border-radius: 16px; background: var(--color-settings-group); }
.read-settings-group-title { position: absolute; bottom: calc(100% + 9px); left: 4px; margin: 0; color: var(--color-text-muted); font-size: 12px; font-weight: 650; letter-spacing: .07em; text-transform: uppercase; }
.read-setting-block { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: center; min-height: 74px; padding: 12px 0; }
.read-setting-block + .read-setting-block, .read-setting-note + .read-setting-block { border-top: 1px solid var(--color-border-subtle); }
.read-setting-copy { display: grid; gap: 3px; min-width: 0; }
.read-setting-label { font-size: 16px; }
.read-setting-hint, .read-setting-note { color: var(--color-text-muted); font-size: 12px; line-height: 1.3; }
.read-setting-note { margin: 0; padding: 0 0 14px; }
.read-setting-options, .read-setting-stepper { display: inline-flex; flex-wrap: wrap; padding: 3px; border-radius: 10px; background: var(--color-surface-secondary); }
.read-setting-options button { min-height: 32px; padding: 0 9px; border: 0; border-radius: 8px; background: transparent; color: var(--color-text-muted); font: inherit; font-size: 12px; font-weight: 500; white-space: nowrap; cursor: pointer; }
.read-setting-options button.active { background: var(--color-brand-primary); color: #fff; }
.read-setting-options button:disabled { opacity: .35; cursor: default; }
.read-setting-stepper { align-items: center; flex-wrap: nowrap; }
.read-setting-stepper button { display: grid; width: 32px; height: 32px; place-items: center; border: 0; border-radius: 8px; background: var(--color-surface-card); color: var(--color-text-primary); font-size: 18px; cursor: pointer; }
.read-setting-stepper button:disabled { opacity: .35; cursor: default; }
.read-setting-stepper output { min-width: 48px; align-self: center; font-size: 13px; text-align: center; }
@media (max-width: 420px) { .read-setting-block.stacked { grid-template-columns: 1fr; gap: 8px; } .read-setting-block.stacked .read-setting-options { justify-self: start; } }
@media (max-width: 360px) { .read-setting-block { grid-template-columns: 1fr; gap: 8px; } .read-setting-options, .read-setting-stepper { justify-self: start; } }
</style>
