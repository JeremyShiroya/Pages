<template>
  <div class="listen-settings-page">
    <MobileSettingsNav title="Listen settings" :back-to="readerPath" aria-label="Listen settings navigation" />
    <main class="listen-settings-content">
      <section class="listen-settings-group" aria-labelledby="playback-heading">
        <h2 id="playback-heading" class="listen-settings-group-title">Playback</h2>
        <div class="listen-setting-block">
          <div class="listen-setting-copy">
            <span class="listen-setting-label">Skip backward</span>
            <span class="listen-setting-hint">How far the back button moves.</span>
          </div>
          <div class="listen-skip-counter" role="group" aria-label="Skip backward interval">
            <button type="button" aria-label="Decrease back skip" :disabled="listenBackSeconds <= 1" @click="changeListenSkip('back', -1)"><i class="ri-subtract-line"></i></button>
            <output>{{ listenBackSeconds }} sec</output>
            <button type="button" aria-label="Increase back skip" :disabled="listenBackSeconds >= 60" @click="changeListenSkip('back', 1)"><i class="ri-add-line"></i></button>
          </div>
        </div>
        <div class="listen-setting-block">
          <div class="listen-setting-copy">
            <span class="listen-setting-label">Skip forward</span>
            <span class="listen-setting-hint">How far the forward button moves.</span>
          </div>
          <div class="listen-skip-counter" role="group" aria-label="Skip forward interval">
            <button type="button" aria-label="Decrease forward skip" :disabled="listenForwardSeconds <= 1" @click="changeListenSkip('forward', -1)"><i class="ri-subtract-line"></i></button>
            <output>{{ listenForwardSeconds }} sec</output>
            <button type="button" aria-label="Increase forward skip" :disabled="listenForwardSeconds >= 60" @click="changeListenSkip('forward', 1)"><i class="ri-add-line"></i></button>
          </div>
        </div>
      </section>
      <section class="listen-settings-group" aria-labelledby="progress-heading">
        <h2 id="progress-heading" class="listen-settings-group-title">Progress</h2>
        <div class="listen-setting-block">
          <div class="listen-setting-copy">
            <span class="listen-setting-label">Progress bar</span>
            <span class="listen-setting-hint">Show time for the book or current chapter.</span>
          </div>
          <div class="listen-setting-options" role="group" aria-label="Progress bar scope">
            <button type="button" :class="{ active: settings.listenBarScope === 'book' }" :aria-pressed="settings.listenBarScope === 'book'" @click="setProgressScope('book')">Full book</button>
            <button type="button" :class="{ active: settings.listenBarScope === 'chapter' }" :aria-pressed="settings.listenBarScope === 'chapter'" @click="setProgressScope('chapter')">Chapter</button>
          </div>
        </div>
        <div class="listen-setting-block">
          <div class="listen-setting-copy">
            <span class="listen-setting-label">Time summary</span>
            <span class="listen-setting-hint">The time shown below the author.</span>
          </div>
          <div class="listen-setting-options" role="group" aria-label="Time summary scope">
            <button type="button" :class="{ active: settings.listenSummaryScope === 'book' }" :aria-pressed="settings.listenSummaryScope === 'book'" @click="setProgressScope('book')">Full book</button>
            <button type="button" :class="{ active: settings.listenSummaryScope === 'chapter' }" :aria-pressed="settings.listenSummaryScope === 'chapter'" @click="setProgressScope('chapter')">Chapter</button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import MobileSettingsNav from '~/components/mobile/MobileSettingsNav.vue'
import { useBookishSettings } from '~/composables/useBookishSettings'

const route = useRoute()
const readerPath = computed(() => `/reader/${encodeURIComponent(String(route.params.id))}?mode=listen`)
const { settings, updateSettings } = useBookishSettings()
const listenBackSeconds = computed(() => settings.value.listenBackSeconds)
const listenForwardSeconds = computed(() => settings.value.listenForwardSeconds)
const setProgressScope = (scope) => updateSettings({ listenBarScope: scope, listenSummaryScope: scope })

const changeListenSkip = (direction, delta) => {
  const key = direction === 'back' ? 'listenBackSeconds' : 'listenForwardSeconds'
  const current = direction === 'back' ? listenBackSeconds.value : listenForwardSeconds.value
  updateSettings({ [key]: Math.max(1, Math.min(60, current + delta)) })
}
</script>

<style scoped>
.listen-settings-page { min-height: 100vh; background: var(--color-settings-background); color: var(--color-text-primary); font-family: var(--mobile-font-family); }
.listen-settings-content { display: grid; gap: 32px; max-width: 600px; margin: 0 auto; padding: 28px var(--mobile-page-padding-inline, 16px) calc(60px + env(safe-area-inset-bottom)); }
.listen-settings-group { position: relative; display: grid; padding: 4px 14px; border-radius: 16px; background: var(--color-settings-group); }
.listen-settings-group-title { position: absolute; bottom: calc(100% + 9px); left: 4px; margin: 0; color: var(--color-text-muted); font-size: 12px; font-weight: 650; letter-spacing: .07em; text-transform: uppercase; }
.listen-setting-block { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: center; min-height: 74px; padding: 12px 0; }
.listen-setting-block + .listen-setting-block { border-top: 1px solid var(--color-border-subtle); }
.listen-setting-copy { display: grid; gap: 3px; min-width: 0; }
.listen-setting-label { font-size: 16px; }
.listen-setting-hint { color: var(--color-text-muted); font-size: 12px; line-height: 1.3; }
.listen-skip-counter { display: inline-flex; align-items: center; padding: 3px; border-radius: 10px; background: var(--color-surface-secondary); }
.listen-skip-counter button { display: grid; width: 32px; height: 32px; place-items: center; border: 0; border-radius: 8px; background: var(--color-surface-card); color: var(--color-text-primary); font-size: 18px; cursor: pointer; }
.listen-skip-counter button:disabled { opacity: .35; cursor: default; }
.listen-skip-counter output { min-width: 52px; font-size: 13px; font-weight: 400; text-align: center; }
.listen-setting-options { display: inline-flex; padding: 3px; border-radius: 10px; background: var(--color-surface-secondary); }
.listen-setting-options button { min-height: 32px; padding: 0 9px; border: 0; border-radius: 8px; background: transparent; color: var(--color-text-muted); font: inherit; font-size: 12px; font-weight: 500; white-space: nowrap; cursor: pointer; }
.listen-setting-options button.active { background: var(--color-brand-primary); color: #fff; }
@media (max-width: 360px) { .listen-setting-block { grid-template-columns: 1fr; gap: 8px; } .listen-skip-counter, .listen-setting-options { justify-self: start; } }
</style>
