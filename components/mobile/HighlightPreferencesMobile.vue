<template>
  <div class="hl-page">
    <MobileSettingsNav title="Highlight" back-to="/settings/preferences" aria-label="Highlight settings navigation" />

    <main class="hl-body">
      <!-- A live sample: the sentence band and the word being spoken. -->
      <div class="hl-preview" :style="{ '--hl': previewColor }" aria-hidden="true">
        <p>
          The lamps came on along the river.
          <span class="hl-band" :class="{ off: !enabled }">It was the hour when <span class="hl-word">the</span> pages seemed to turn themselves.</span>
          Nobody on the bridge looked up.
        </p>
      </div>

      <section>
        <div class="hl-card">
          <div class="hl-row">
            <div class="hl-copy">
              <span class="hl-label">Highlight While Reading</span>
              <span class="hl-hint">Highlight the sentence being read aloud.</span>
            </div>
            <button
              type="button"
              class="hl-toggle"
              role="switch"
              aria-label="Highlight while reading"
              :aria-checked="enabled"
              :class="{ on: enabled }"
              @click="updateSettings({ readerHighlight: !enabled })"
            >
              <span class="knob"></span>
            </button>
          </div>
        </div>
      </section>

      <section v-if="enabled" aria-labelledby="hl-colour-title">
        <h2 id="hl-colour-title" class="hl-section-title">Colour</h2>
        <!-- Match Accent first: the default, and the way back after picking
             a colour of its own. -->
        <div class="hl-card">
          <button type="button" class="hl-match" role="radio" :aria-checked="followsAccent" @click="updateSettings({ highlightColor: 'accent' })">
            <span class="hl-match-swatch" :class="{ mono: settings.accentColor === 'mono' }" :style="{ background: accentSwatch }"></span>
            <span class="hl-label">Match Accent</span>
            <span class="hl-match-value">{{ accentLabel(settings.accentColor) }}</span>
            <i v-if="followsAccent" class="ri-check-line hl-check" aria-hidden="true"></i>
          </button>
        </div>

        <div class="hl-card hl-swatches">
          <div class="hl-grid" role="radiogroup" aria-labelledby="hl-colour-title">
            <button
              v-for="accent in ACCENT_SWATCHES"
              :key="accent.id"
              type="button"
              role="radio"
              class="hl-option"
              :class="{ active: settings.highlightColor === accent.id }"
              :aria-checked="settings.highlightColor === accent.id"
              :aria-label="accent.label"
              @click="updateSettings({ highlightColor: accent.id })"
            >
              <span class="hl-swatch" :class="{ mono: accent.id === 'mono' }" :style="{ '--swatch': isDark ? accent.dark : accent.light, '--swatch-ring': accent.ring || (isDark ? accent.dark : accent.light) }">
                <i v-if="settings.highlightColor === accent.id" class="ri-check-line" aria-hidden="true"></i>
              </span>
              <span class="hl-name">{{ accent.label }}</span>
            </button>
          </div>
        </div>
        <p class="hl-footnote">Highlights follow your accent colour unless you pick one here.</p>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import MobileSettingsNav from '~/components/mobile/MobileSettingsNav.vue'
import { usePagesSettings } from '~/composables/usePagesSettings'
import { ACCENT_SWATCHES, accentLabel, accentSolid } from '~/utils/accentPalette'

const { settings, updateSettings } = usePagesSettings()
const isDark = computed(() => settings.value.readerTheme === 'dark')
const enabled = computed(() => settings.value.readerHighlight !== false)
const followsAccent = computed(() => !settings.value.highlightColor || settings.value.highlightColor === 'accent')
const accentSwatch = computed(() => {
  const accent = ACCENT_SWATCHES.find((item) => item.id === settings.value.accentColor) || ACCENT_SWATCHES[0]
  return isDark.value ? accent.dark : accent.light
})
const previewColor = computed(() => accentSolid(followsAccent.value ? settings.value.accentColor : settings.value.highlightColor, isDark.value))
</script>

<style scoped>
.hl-page { min-height: 100vh; background: var(--color-settings-background); color: var(--color-text-primary); font-family: var(--mobile-font-family); }
.hl-body { display: grid; gap: var(--settings-section-gap, 30px); max-width: 600px; margin: 0 auto; padding: 18px var(--settings-gutter) calc(60px + env(safe-area-inset-bottom)); }

.hl-preview { padding: 18px 18px; border-radius: var(--settings-radius, 14px); background: var(--color-settings-group); }
.hl-preview p { margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 17px; line-height: 1.6; }
.hl-band { padding: 2px 0; border-radius: 4px; background: color-mix(in srgb, var(--hl) 25%, transparent); box-decoration-break: clone; -webkit-box-decoration-break: clone; transition: background-color 0.2s ease; }
.hl-word { border-radius: 3px; background: color-mix(in srgb, var(--hl) 50%, transparent); }
.hl-band.off, .hl-band.off .hl-word { background: transparent; }

.hl-section-title { margin: 0 0 var(--settings-header-gap, 8px) var(--settings-row-inset, 16px); color: var(--color-text-muted); font-size: var(--settings-header-size); font-weight: 400; letter-spacing: 0.02em; text-transform: uppercase; }
.hl-card { overflow: hidden; border-radius: var(--settings-radius, 14px); background: var(--color-settings-group); }
.hl-card + .hl-card { margin-top: 12px; }
.hl-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 14px; min-height: var(--settings-switch-row-min, 60px); padding: 10px var(--settings-row-inset, 16px); }
.hl-copy { display: grid; gap: 3px; }
.hl-label { font-size: var(--settings-label-size); }
.hl-hint { color: var(--color-text-muted); font-size: var(--settings-caption-size); line-height: 1.35; }

.hl-toggle { position: relative; width: var(--settings-switch-width); height: var(--settings-switch-height); padding: 0; border: 0; border-radius: 999px; background: var(--color-border-card); cursor: pointer; transition: background 0.2s ease; }
.hl-toggle.on { background: var(--color-switch-on); }
.hl-toggle .knob { position: absolute; top: 2px; left: 2px; width: var(--settings-switch-knob); height: var(--settings-switch-knob); border-radius: 50%; background: #fff; box-shadow: 0 2px 5px rgba(15, 23, 42, 0.25); transition: transform 0.2s ease; }
.hl-toggle.on .knob { background: var(--color-switch-knob-on); transform: translateX(calc(var(--settings-switch-width) - var(--settings-switch-knob) - 4px)); }

.hl-match { display: grid; width: 100%; grid-template-columns: 26px minmax(0, 1fr) auto 22px; align-items: center; gap: 12px; min-height: 52px; padding: 0 var(--settings-row-inset, 16px); border: 0; background: transparent; color: var(--color-text-primary); font: inherit; text-align: left; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.hl-match:active { background: var(--color-surface-hover); }
.hl-match-swatch { width: 26px; height: 26px; border-radius: 50%; }
.hl-match-value { color: var(--color-text-muted); font-size: var(--settings-label-size); }
.hl-check { color: var(--color-brand-primary); font-size: 22px; }

.hl-swatches { padding: 16px 10px 8px; }
.hl-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); row-gap: 12px; }
.hl-option { display: grid; justify-items: center; gap: 7px; padding: 0 0 6px; border: 0; background: none; color: var(--color-text-muted); font: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.hl-swatch { display: grid; width: 40px; height: 40px; place-items: center; border-radius: 50%; background: var(--swatch); color: #fff; font-size: 22px; transition: box-shadow 0.16s ease, transform 0.16s ease; }
.hl-option.active .hl-swatch { box-shadow: 0 0 0 2.5px var(--color-settings-group), 0 0 0 4.5px var(--swatch-ring); }
.hl-swatch.mono, .hl-match-swatch.mono { box-shadow: inset 0 0 0 1px rgba(128, 128, 128, 0.55); }
.hl-option.active .hl-swatch.mono { box-shadow: inset 0 0 0 1px rgba(128, 128, 128, 0.55), 0 0 0 2.5px var(--color-settings-group), 0 0 0 4.5px var(--swatch-ring); }
.hl-option:active .hl-swatch { transform: scale(0.92); }
.hl-name { font-size: 11.5px; line-height: 1.2; text-align: center; }
.hl-option.active .hl-name { color: var(--color-text-primary); }
.hl-footnote { margin: 10px var(--settings-row-inset, 16px) 0; color: var(--color-text-muted); font-size: var(--settings-caption-size, 13px); line-height: 1.4; }
@media (max-width: 340px) { .hl-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
</style>
