<template>
  <div class="listen-settings-page">
    <MobileSettingsNav title="Listen settings" :back-to="readerPath" aria-label="Listen settings navigation" />
    <main class="listen-settings-content">
      <!-- iOS grouped settings: section titles above inset cards, steppers as a
           grey segmented pill (− | value | +), choices as list rows with a
           trailing check, tinted in the brand purple. -->
      <!-- The same page as Preferences → Listen Screen, one tap from the player. -->
      <section class="ls-section" aria-labelledby="screen-heading">
        <h2 id="screen-heading" class="ls-section-title">Appearance</h2>
        <div class="ls-card">
          <NuxtLink class="ls-link" :to="{ path: '/settings/preferences/listen-screen', query: { from: route.fullPath } }">
            <span class="ls-label">Listen Screen</span>
            <span class="ls-link-value">{{ listenScreenSummary }}</span>
            <i class="ri-arrow-right-s-line" aria-hidden="true"></i>
          </NuxtLink>
        </div>
      </section>

      <section class="ls-section" aria-labelledby="playback-heading">
        <h2 id="playback-heading" class="ls-section-title">Playback</h2>
        <div class="ls-card">
          <div v-for="skip in skipRows" :key="skip.direction" class="ls-row">
            <div class="ls-copy">
              <span class="ls-label">{{ skip.label }}</span>
              <span class="ls-hint">{{ skip.hint }}</span>
            </div>
            <div class="ls-stepper" role="group" :aria-label="`${skip.label} interval`">
              <button type="button" :aria-label="`Decrease ${skip.label.toLowerCase()}`" :disabled="skip.value <= 1" @click="changeListenSkip(skip.direction, -1)">
                <i class="ri-subtract-line" aria-hidden="true"></i>
              </button>
              <output>{{ skip.value }}s</output>
              <button type="button" :aria-label="`Increase ${skip.label.toLowerCase()}`" :disabled="skip.value >= 60" @click="changeListenSkip(skip.direction, 1)">
                <i class="ri-add-line" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="ls-section" aria-labelledby="progress-heading">
        <h2 id="progress-heading" class="ls-section-title">Progress</h2>
        <!-- One choice drives both the scrubber and the time under the author. -->
        <p class="ls-section-hint">What the progress bar and remaining time count toward.</p>
        <div class="ls-card ls-list" role="radiogroup" aria-label="Progress scope">
          <button
            v-for="option in scopeOptions"
            :key="option.id"
            type="button"
            role="radio"
            class="ls-choice"
            :class="{ active: progressScope === option.id }"
            :aria-checked="progressScope === option.id"
            @click="setProgressScope(option.id)"
          >
            <i class="ls-choice-icon" :class="option.icon" aria-hidden="true"></i>
            <span class="ls-choice-body">
              <span class="ls-choice-title">{{ option.label }}</span>
              <span class="ls-choice-meta" aria-hidden="true">
                <span>{{ option.elapsed }}</span>
                <span class="ls-dot">•</span>
                <span>{{ option.left }}</span>
                <span class="ls-choice-track"><span :style="{ width: option.fill }"></span></span>
              </span>
            </span>
            <i v-if="progressScope === option.id" class="ri-check-line ls-check" aria-hidden="true"></i>
          </button>
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
const listenScreenSummary = computed(() => (settings.value.listenVisual === 'cover' ? 'Book Cover' : 'Narrator Orb'))

// Example times only: they show what each choice makes the player display.
const scopeOptions = [
  { id: 'book', label: 'Whole Book', icon: 'ri-book-open-line', fill: '34%', elapsed: '2:41:08', left: '-5:12:40' },
  // A single page: one chapter of the book.
  { id: 'chapter', label: 'Current Chapter', icon: 'ri-file-text-line', fill: '68%', elapsed: '14:22', left: '-6:45' },
]

const skipRows = computed(() => [
  { direction: 'back', label: 'Skip Backward', hint: 'How far the back button moves.', value: listenBackSeconds.value },
  { direction: 'forward', label: 'Skip Forward', hint: 'How far the forward button moves.', value: listenForwardSeconds.value },
])

const changeListenSkip = (direction, delta) => {
  const key = direction === 'back' ? 'listenBackSeconds' : 'listenForwardSeconds'
  const current = direction === 'back' ? listenBackSeconds.value : listenForwardSeconds.value
  updateSettings({ [key]: Math.max(1, Math.min(60, current + delta)) })
}
</script>

<style scoped>
.listen-settings-page { min-height: 100vh; background: var(--color-settings-background); color: var(--color-text-primary); font-family: var(--mobile-font-family); }
.listen-settings-content { display: grid; gap: 30px; max-width: 600px; margin: 0 auto; padding: 22px var(--settings-gutter) calc(60px + env(safe-area-inset-bottom)); }

.ls-section { display: grid; }
.ls-section-title { margin: 0 0 var(--settings-header-gap, 8px) var(--settings-row-inset, 16px); color: var(--color-text-muted); font-size: var(--settings-header-size); font-weight: 400; letter-spacing: .02em; text-transform: uppercase; }
.ls-section-hint { margin: 10px var(--settings-row-inset, 16px) 14px; color: var(--color-text-primary); font-size: var(--settings-caption-size, 14px); line-height: 1.4; }

.ls-card { overflow: hidden; border-radius: var(--settings-radius, 14px); background: var(--color-settings-group); }

.ls-link { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 6px; min-height: 50px; padding: 0 12px 0 var(--settings-row-inset, 16px); color: var(--color-text-primary); text-decoration: none; -webkit-tap-highlight-color: transparent; }
.ls-link:active { background: var(--color-surface-hover); }
.ls-link-value { color: var(--color-text-muted); font-size: var(--settings-label-size); }
.ls-link i { color: var(--color-text-muted); font-size: 20px; }

/* Playback rows: label + hint, stepper on the right. */
.ls-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 14px; padding: 14px var(--settings-row-inset, 16px); }
.ls-row + .ls-row { box-shadow: inset 0 1px 0 var(--color-border-subtle); }
.ls-copy { display: grid; gap: 3px; min-width: 0; }
.ls-label { font-size: var(--settings-label-size); }
.ls-hint { color: var(--color-text-muted); font-size: var(--settings-caption-size); line-height: 1.35; }

/* iOS stepper: one grey pill, hairlines between − value +. */
.ls-stepper { display: inline-flex; align-items: center; height: 38px; overflow: hidden; border-radius: 10px; background: color-mix(in srgb, var(--color-text-primary) 8%, transparent); }
.ls-stepper button { display: grid; width: 42px; height: 100%; place-items: center; border: 0; background: transparent; color: var(--color-text-primary); font-size: 20px; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.ls-stepper button:active:not(:disabled) { background: color-mix(in srgb, var(--color-text-primary) 10%, transparent); }
.ls-stepper button:disabled { opacity: .3; cursor: default; }
.ls-stepper output { min-width: 50px; padding: 0 4px; border-inline: 1px solid color-mix(in srgb, var(--color-text-primary) 14%, transparent); font-size: 15px; line-height: 22px; text-align: center; font-variant-numeric: tabular-nums; }

/* Progress choices: icon, title, example times + bar, trailing check. */
.ls-list { display: grid; }
.ls-choice { position: relative; display: grid; grid-template-columns: 28px minmax(0, 1fr) 22px; align-items: center; gap: 14px; min-height: 64px; padding: 10px var(--settings-row-inset, 16px); border: 0; background: transparent; color: var(--color-text-primary); font: inherit; text-align: left; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.ls-choice:active { background: var(--color-surface-hover); }
/* Hairline starts at the text, as in iOS lists. */
.ls-choice + .ls-choice::before { content: ''; position: absolute; top: 0; right: 0; left: calc(var(--settings-row-inset, 16px) + 42px); height: 1px; background: var(--color-border-subtle); }
.ls-choice-icon { color: var(--color-text-primary); font-size: 22px; line-height: 1; }
.ls-choice-body { display: grid; gap: 4px; min-width: 0; }
.ls-choice-title { font-size: var(--settings-label-size); }
.ls-choice-meta { display: flex; align-items: center; gap: 6px; color: var(--color-text-muted); font-size: 13px; font-variant-numeric: tabular-nums; }
.ls-dot { font-size: 10px; }
.ls-choice-track { position: relative; flex: 0 1 96px; height: 4px; margin-left: 4px; overflow: hidden; border-radius: 999px; background: color-mix(in srgb, var(--color-text-muted) 25%, transparent); }
.ls-choice-track span { position: absolute; inset: 0 auto 0 0; border-radius: inherit; background: var(--color-text-muted); }
.ls-check { color: var(--color-brand-primary); font-size: 22px; }

/* The chosen row takes the brand tint, like iOS's blue. */
.ls-choice.active .ls-choice-icon,
.ls-choice.active .ls-choice-title { color: var(--color-brand-primary); }
.ls-choice.active .ls-choice-track span { background: var(--color-brand-primary); }

@media (max-width: 360px) { .ls-row { grid-template-columns: 1fr; gap: 10px; } .ls-stepper { justify-self: start; } }
</style>
