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
        <!-- Both the scrubber and the time under the author always followed the
             same choice, so it is one decision, shown as what the player will look like. -->
        <div class="listen-progress-choice">
          <span class="listen-setting-hint">What the progress bar and remaining time count toward.</span>
          <div class="listen-scope-cards" role="radiogroup" aria-label="Progress scope">
            <button
              v-for="option in scopeOptions"
              :key="option.id"
              type="button"
              role="radio"
              class="listen-scope-card"
              :class="{ active: progressScope === option.id }"
              :aria-checked="progressScope === option.id"
              @click="setProgressScope(option.id)"
            >
              <span class="listen-scope-top">
                <span class="listen-scope-icon"><i :class="option.icon" aria-hidden="true"></i></span>
                <span class="listen-scope-check" aria-hidden="true"><i v-if="progressScope === option.id" class="ri-check-line"></i></span>
              </span>
              <span class="listen-scope-title">{{ option.label }}</span>
              <span class="listen-scope-mock" aria-hidden="true">
                <span class="listen-scope-track"><span :style="{ width: option.fill }"></span></span>
                <span class="listen-scope-times"><span>{{ option.elapsed }}</span><span>{{ option.left }}</span></span>
              </span>
            </button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import MobileSettingsNav from '~/components/mobile/MobileSettingsNav.vue'
import { usePagesSettings } from '~/composables/usePagesSettings'

const route = useRoute()
const readerPath = computed(() => `/reader/${encodeURIComponent(String(route.params.id))}?mode=listen`)
const { settings, updateSettings } = usePagesSettings()
const listenBackSeconds = computed(() => settings.value.listenBackSeconds)
const listenForwardSeconds = computed(() => settings.value.listenForwardSeconds)
const setProgressScope = (scope) => updateSettings({ listenBarScope: scope, listenSummaryScope: scope })
const progressScope = computed(() => settings.value.listenBarScope)
const scopeOptions = [
  { id: 'book', label: 'Whole book', icon: 'ri-book-2-line', fill: '34%', elapsed: '2:41:08', left: '-5:12:40' },
  { id: 'chapter', label: 'Current chapter', icon: 'ri-bookmark-3-line', fill: '68%', elapsed: '14:22', left: '-6:45' },
]

const changeListenSkip = (direction, delta) => {
  const key = direction === 'back' ? 'listenBackSeconds' : 'listenForwardSeconds'
  const current = direction === 'back' ? listenBackSeconds.value : listenForwardSeconds.value
  updateSettings({ [key]: Math.max(1, Math.min(60, current + delta)) })
}
</script>

<style scoped>
.listen-settings-page { min-height: 100vh; background: var(--color-settings-background); color: var(--color-text-primary); font-family: var(--mobile-font-family); }
.listen-settings-content { display: grid; gap: calc(var(--settings-section-gap) + var(--settings-header-size) + var(--settings-header-gap)); max-width: 600px; margin: 0 auto; padding: calc(var(--settings-header-size) + var(--settings-header-gap) + 18px) var(--settings-gutter) calc(60px + env(safe-area-inset-bottom)); }
.listen-settings-group { position: relative; display: grid; padding: 0 var(--settings-row-inset); border-radius: var(--settings-radius); background: var(--color-settings-group); }
.listen-settings-group-title { position: absolute; bottom: calc(100% + var(--settings-header-gap)); left: var(--settings-row-inset); margin: 0; color: var(--color-text-muted); font-size: var(--settings-header-size); letter-spacing: .02em; text-transform: uppercase; }
.listen-setting-block { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: center; min-height: var(--settings-row-min); padding: 14px 0; }
.listen-setting-block + .listen-setting-block { border-top: 1px solid var(--color-border-subtle); }
.listen-setting-copy { display: grid; gap: 3px; min-width: 0; }
.listen-setting-label { font-size: var(--settings-label-size); }
.listen-setting-hint { color: var(--color-text-muted); font-size: var(--settings-caption-size); line-height: 1.35; }
.listen-skip-counter { display: inline-flex; align-items: center; padding: 3px; border-radius: 10px; background: var(--color-surface-secondary); }
.listen-skip-counter button { display: grid; width: 32px; height: 32px; place-items: center; border: 0; border-radius: 8px; background: var(--color-surface-card); color: var(--color-text-primary); font-size: 18px; cursor: pointer; }
.listen-skip-counter button:disabled { opacity: .35; cursor: default; }
.listen-skip-counter output { min-width: 52px; font-size: 13px; font-weight: 400; text-align: center; }
.listen-progress-choice { display: grid; gap: 12px; padding: 16px 0 18px; }
.listen-scope-cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.listen-scope-card { display: grid; gap: 10px; padding: 12px; border: 1.5px solid var(--color-border-subtle); border-radius: 14px; background: var(--color-surface-secondary); color: var(--color-text-primary); font: inherit; text-align: left; cursor: pointer; transition: border-color .15s ease, background .15s ease, transform .1s ease; -webkit-tap-highlight-color: transparent; }
.listen-scope-card:active { transform: scale(.98); }
.listen-scope-card.active { border-color: var(--color-brand-primary); background: color-mix(in srgb, var(--color-brand-primary) 9%, var(--color-surface-secondary)); }
.listen-scope-top { display: flex; align-items: center; justify-content: space-between; }
.listen-scope-icon { display: grid; width: 32px; height: 32px; place-items: center; border-radius: 10px; background: var(--color-surface-card); color: var(--color-text-muted); font-size: 17px; }
.listen-scope-card.active .listen-scope-icon { background: var(--color-brand-primary); color: #fff; }
.listen-scope-check { display: grid; width: 20px; height: 20px; place-items: center; border: 2px solid var(--color-border-subtle); border-radius: 50%; color: #fff; font-size: 13px; }
.listen-scope-card.active .listen-scope-check { border-color: var(--color-brand-primary); background: var(--color-brand-primary); }
.listen-scope-title { font-size: 14px; }
.listen-scope-mock { display: grid; gap: 5px; }
.listen-scope-track { position: relative; height: 4px; overflow: hidden; border-radius: 999px; background: color-mix(in srgb, var(--color-text-muted) 25%, transparent); }
.listen-scope-track span { position: absolute; inset: 0 auto 0 0; border-radius: inherit; background: var(--color-text-muted); }
.listen-scope-card.active .listen-scope-track span { background: var(--color-brand-primary); }
.listen-scope-times { display: flex; justify-content: space-between; color: var(--color-text-muted); font-size: 10.5px; font-variant-numeric: tabular-nums; }
.listen-setting-options { display: inline-flex; padding: 3px; border-radius: 10px; background: var(--color-surface-secondary); }
.listen-setting-options button { min-height: 32px; padding: 0 9px; border: 0; border-radius: 8px; background: transparent; color: var(--color-text-muted); font: inherit; font-size: 12px; font-weight: 500; white-space: nowrap; cursor: pointer; }
.listen-setting-options button.active { background: var(--color-brand-primary); color: #fff; }
@media (max-width: 360px) { .listen-setting-block { grid-template-columns: 1fr; gap: 8px; } .listen-skip-counter, .listen-setting-options { justify-self: start; } }
</style>
