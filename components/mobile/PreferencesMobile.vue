<template>
  <div class="preferences">
    <MobileSettingsNav title="Preferences" back-to="/settings" aria-label="Settings navigation" />

    <!-- Ordered by how central a setting is to reading and how often it is
         touched: Reading, then Library, then Appearance (set once). Inside each
         group, switches come before rows that open a page. -->
    <div class="preferences-body">
      <section class="pref-group">
        <h2 class="pref-group-title">Reading</h2>

        <div class="pref-row">
          <div class="pref-copy">
            <span class="pref-label">Highlight While Reading</span>
            <span class="pref-hint">Highlight the sentence being read aloud.</span>
          </div>
          <button
            type="button"
            class="pref-toggle"
            role="switch"
            aria-label="Highlight while reading"
            :aria-checked="settings.readerHighlight !== false"
            :class="{ on: settings.readerHighlight !== false }"
            @click="set('readerHighlight', settings.readerHighlight === false)"
          >
            <span class="knob"></span>
          </button>
        </div>

        <div class="pref-row">
          <div class="pref-copy">
            <span class="pref-label">Blurred Cover in Listen</span>
            <span class="pref-hint">Show a soft blurred book cover behind the player.</span>
          </div>
          <button
            type="button"
            class="pref-toggle"
            role="switch"
            aria-label="Blurred cover in Listen mode"
            :aria-checked="settings.listenCoverBlur !== false"
            :class="{ on: settings.listenCoverBlur !== false }"
            @click="set('listenCoverBlur', settings.listenCoverBlur === false)"
          >
            <span class="knob"></span>
          </button>
        </div>

        <!-- "Formats Pages Reads" REMOVES: those books leave the library and the
             scanner stops detecting them. Hiding one is "Show in Library". -->
        <NuxtLink class="pref-link" to="/settings/preferences/formats">
          <span class="pref-link-label">Formats Pages Reads</span>
          <span class="pref-link-value">{{ formatModeSummary }}</span>
          <i class="ri-arrow-right-s-line" aria-hidden="true"></i>
        </NuxtLink>

        <NuxtLink class="pref-link" to="/settings/preferences/streak">
          <span class="pref-link-label">Reading Streak</span>
          <span class="pref-link-value">{{ streakSummary }}</span>
          <i class="ri-arrow-right-s-line" aria-hidden="true"></i>
        </NuxtLink>
      </section>

      <section class="pref-group">
        <h2 class="pref-group-title">Library</h2>

        <div class="pref-row">
          <div class="pref-copy">
            <span class="pref-label">Show Missing Books</span>
            <span class="pref-hint">Show books you're missing in a series as muted cards.</span>
          </div>
          <button
            type="button"
            class="pref-toggle"
            role="switch"
            aria-label="Show missing books"
            :aria-checked="settings.seriesSuggestions === true"
            :class="{ on: settings.seriesSuggestions === true }"
            @click="set('seriesSuggestions', settings.seriesSuggestions !== true)"
          >
            <span class="knob"></span>
          </button>
        </div>

        <!-- "Show in Library" only HIDES, so it disappears once a single
             format is handled: there is nothing left to hide. -->
        <NuxtLink v-if="enabledFormats.length > 1" class="pref-link" to="/settings/preferences/book-format">
          <span class="pref-link-label">Show in Library</span>
          <span class="pref-link-value">{{ formatFilterSummary }}</span>
          <i class="ri-arrow-right-s-line" aria-hidden="true"></i>
        </NuxtLink>

        <NuxtLink class="pref-link" to="/settings/preferences/ratings">
          <span class="pref-link-label">Rating Source</span>
          <span class="pref-link-value">
            <i v-if="ratingSync.state.running" class="ri-loader-4-line pref-link-spin" aria-label="Updating ratings"></i>
            {{ ratingSourceSummary }}
          </span>
          <i class="ri-arrow-right-s-line" aria-hidden="true"></i>
        </NuxtLink>
      </section>

      <section class="pref-group">
        <h2 class="pref-group-title">Appearance</h2>

        <NuxtLink class="pref-link" to="/settings/preferences/bottom-navigation">
          <span class="pref-link-label">Bottom Navigation</span>
          <span class="pref-link-value"></span>
          <i class="ri-arrow-right-s-line" aria-hidden="true"></i>
        </NuxtLink>

        <div v-if="isTablet" class="pref-block">
          <div class="pref-copy">
            <span class="pref-label">Book Actions</span>
            <span class="pref-hint">Card actions are kept in a More menu.</span>
          </div>
          <div class="option-grid">
            <button
              v-for="opt in bookActionDisplayOptions.slice(0, 1)"
              :key="opt.value"
              type="button"
              class="option active"
              @click="set('bookActionDisplay', opt.value)"
            >
              <span class="preview">
                <BookActionsPreview :mode="opt.value" />
              </span>
              <span class="option-label">
                {{ opt.label }}
                <i class="ri-check-line"></i>
              </span>
            </button>
          </div>
        </div>
      </section>

      <!-- Developer-only switches, kept apart from everyday settings. -->
      <section v-if="settings.developerMode" class="pref-group">
        <h2 class="pref-group-title">Developer</h2>

        <div class="pref-row">
          <div class="pref-copy">
            <span class="pref-label">Hide Content</span>
            <span class="pref-hint">Preview the app as though your library were empty. Nothing is deleted.</span>
          </div>
          <button
            type="button"
            class="pref-toggle"
            role="switch"
            aria-label="Hide content"
            :aria-checked="settings.hideContent === true"
            :class="{ on: settings.hideContent === true }"
            @click="toggleHideContent"
          >
            <span class="knob"></span>
          </button>
        </div>

        <div class="pref-row">
          <div class="pref-copy">
            <span class="pref-label">Settings Icons</span>
            <span class="pref-hint">Show the icon beside each row on the Settings page.</span>
          </div>
          <button
            type="button"
            class="pref-toggle"
            role="switch"
            aria-label="Settings icons"
            :aria-checked="settings.settingsIcons !== false"
            :class="{ on: settings.settingsIcons !== false }"
            @click="set('settingsIcons', settings.settingsIcons === false)"
          >
            <span class="knob"></span>
          </button>
        </div>

        <div class="pref-row">
          <div class="pref-copy">
            <span class="pref-label">Settings Arrows</span>
            <span class="pref-hint">Show the arrow at the end of each row on the Settings page.</span>
          </div>
          <button
            type="button"
            class="pref-toggle"
            role="switch"
            aria-label="Settings arrows"
            :aria-checked="settings.settingsArrows !== false"
            :class="{ on: settings.settingsArrows !== false }"
            @click="set('settingsArrows', settings.settingsArrows === false)"
          >
            <span class="knob"></span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePagesSettings } from '~/composables/usePagesSettings'
import { useBooks } from '~/composables/useBooks'
import { useRatingSync } from '~/composables/useRatingSync'
import { formatLabel, useFormatEnablement } from '~/composables/useFormatEnablement'
import { useDeviceArchitecture } from '~/composables/useDeviceArchitecture'
import MobileSettingsNav from './MobileSettingsNav.vue'
import BookActionsPreview from '../shared/previews/BookActionsPreview.vue'

const { settings, updateSettings } = usePagesSettings()
const { isTablet } = useDeviceArchitecture()
const { fetchAllData } = useBooks()
const ratingSync = useRatingSync()

const set = (key, value) => updateSettings({ [key]: value })
// Light mode is always Bright and dark mode always Muted (see
// normalizePagesSettings), so the canvas choices are gone from this page.

const bookActionDisplayOptions = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'visible', label: 'Always visible' },
]

// The rating source is chosen on its own page (RatingsPreferencesMobile); the
// row here shows the current choice and spins while ratings are refreshing.
const ratingSourceSummary = computed(() => (
  { goodreads: 'Goodreads', storygraph: 'StoryGraph', personal: 'Personal', none: 'None' }[settings.value.ratingSource] || 'Goodreads'
))

// Hide content swaps the in-memory library for an empty one (or back), so
// the change is visible the moment you leave settings — no restart needed.
const toggleHideContent = async () => {
  set('hideContent', settings.value.hideContent !== true)
  await fetchAllData(true)
}

// Interface rows open their own pages (BookFormatPreferencesMobile,
// ReadFormatsPreferencesMobile, StreakPreferencesMobile); each row here shows
// the current choice, as a system settings list does.
const { enabledFormats, formatMode } = useFormatEnablement()
const formatFilterSummary = computed(() => (
  settings.value.formatFilter === 'all' ? 'All Formats' : `${formatLabel(settings.value.formatFilter)} Only`
))
const formatModeSummary = computed(() => (
  { both: 'PDF and EPUB', pdf: 'PDF Only', epub: 'EPUB Only' }[formatMode.value] || 'PDF and EPUB'
))
const streakSummary = computed(() => (settings.value.showStreak === false ? 'Off' : 'On'))
</script>

<style scoped>
.preferences {
  min-height: 100vh;
  background: var(--color-settings-background);
  font-family: var(--mobile-font-family);
}

.preferences-body {
  display: grid;
  gap: calc(var(--settings-section-gap) + var(--settings-header-size) + var(--settings-header-gap));
  padding: calc(var(--settings-header-size) + var(--settings-header-gap) + 18px) var(--settings-gutter) calc(var(--mobile-bottom-nav-height, 72px) + 32px);
}

/* Rows sit flush in the card with dividers between them, as in the main
   Settings list; the section name sits above the card in line with the text. */
.pref-group {
  position: relative;
  display: grid;
  padding: 0 var(--settings-row-inset);
  border: 0;
  border-radius: var(--settings-radius);
  background: var(--color-settings-group);
}

.pref-group-title {
  position: absolute;
  bottom: calc(100% + var(--settings-header-gap));
  left: var(--settings-row-inset);
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--settings-header-size);
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

/* Block = a label + a row of visual option cards. */
.pref-block {
  display: grid;
  gap: 12px;
  padding: var(--settings-row-pad-y) 0 22px;
}

.pref-group > * + * {
  border-top: 1px solid var(--color-border-subtle);
}

.pref-group > .pref-group-title + * {
  border-top: 0;
}

.pref-copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.pref-label {
  color: var(--color-text-primary);
  font-size: var(--settings-label-size);
}

.pref-hint {
  color: var(--color-text-muted);
  font-size: var(--settings-caption-size);
  line-height: 1.35;
}

.option-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.pref-destination { display: grid; grid-template-columns: 40px minmax(0, 1fr) 20px; align-items: center; gap: 12px; min-height: 64px; padding: 10px; border-radius: 16px; background: var(--color-surface-card); color: var(--color-text-primary); text-decoration: none; }
.navigation-links { display: grid; }
.nav-pref-destination { min-height: var(--settings-row-min); border: 0; border-radius: 0; background: transparent; grid-template-columns: minmax(0, 1fr) 20px; padding: var(--settings-row-pad-y) 0; }
.nav-pref-destination strong { color: var(--color-text-primary); font-size: var(--settings-label-size); }
.nav-pref-destination small { font-size: var(--settings-caption-size); }
.pref-destination-icon { display: grid; width: 40px; height: 40px; place-items: center; border-radius: 12px; background: var(--color-brand-primary-faint); color: var(--color-brand-primary); font-size: 20px; }
.pref-destination strong, .pref-destination small { display: block; }
.pref-destination small { margin-top: 3px; color: var(--color-text-muted); font-size: 12px; line-height: 1.3; }
.pref-destination > i { color: var(--color-text-muted); font-size: 20px; }

.option {
  display: grid;
  gap: 8px;
  padding: 8px;
  border: 0;
  border-radius: 14px;
  background: var(--color-surface-card, var(--color-surface-secondary));
  cursor: pointer;
  transition: background-color 0.18s ease, transform 0.12s ease;
}

.option:active {
  transform: scale(0.98);
}

.option.active {
  background: color-mix(in srgb, var(--color-settings-group) 82%, var(--color-brand-primary) 18%);
}

.preview {
  display: block;
  height: 92px;
  overflow: hidden;
  border-radius: 9px;
}

.palette-preview {
  --palette-app: #ffffff;
  --palette-sidebar: #ffffff;
  --palette-surface: #f8fafc;
  --palette-border: #e2e8f0;
  --palette-ink: #64748b;
  display: grid;
  grid-template-columns: 30% 1fr;
  gap: 7px;
  padding: 8px;
  border: 1px solid var(--palette-border);
  background: var(--palette-app);
}

.palette-preview--light-muted {
  --palette-app: #dfe0eb;
  --palette-sidebar: #dfe0eb;
  --palette-surface: #ffffff;
  --palette-border: #cdcfde;
  --palette-ink: #64748b;
}

.palette-preview--dark {
  --palette-app: #000000;
  --palette-sidebar: #000000;
  --palette-surface: #0a0a0a;
  --palette-border: #262626;
  --palette-ink: #a1a1aa;
}

.palette-preview--dark-muted {
  --palette-app: #111018;
  --palette-sidebar: #171621;
  --palette-surface: #1f1d29;
  --palette-border: #3f3b50;
  --palette-ink: #a8b1c2;
}

.palette-sidebar,
.palette-content {
  min-width: 0;
  border: 1px solid var(--palette-border);
  border-radius: 6px;
  background: var(--palette-sidebar);
}

.palette-sidebar {
  display: grid;
  align-content: start;
  gap: 7px;
  padding: 10px 6px;
}

.palette-sidebar i,
.palette-heading,
.palette-line {
  display: block;
  height: 4px;
  border-radius: 999px;
  background: var(--palette-ink);
  opacity: 0.62;
}

.palette-sidebar i:first-child {
  width: 76%;
  background: #8a2be2;
  opacity: 1;
}

.palette-content {
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 10px 8px;
  background: var(--palette-surface);
}

.palette-heading {
  width: 52%;
  height: 6px;
}

.palette-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
}

.palette-cards i {
  display: block;
  height: 26px;
  border: 1px solid var(--palette-border);
  border-radius: 5px;
  background: var(--palette-app);
}

.palette-line {
  width: 72%;
}

.option-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 500;
}

.option.active .option-label {
  color: var(--color-brand-primary);
}

.option-label i {
  font-size: 15px;
}

/* Simple rows for toggles / format. */
.pref-row {
  display: flex;
  min-height: var(--settings-switch-row-min);
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: var(--settings-row-pad-y) 0;
}

.segmented {
  display: inline-flex;
  flex: 0 0 auto;
  padding: 3px;
  border-radius: 10px;
  background: var(--color-surface-secondary);
}

.segment {
  min-height: 32px;
  padding: 0 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  transition: background 0.18s ease, color 0.18s ease;
}

.segment.active {
  background: var(--color-brand-primary);
  color: #fff;
}

.pref-toggle {
  position: relative;
  flex: 0 0 auto;
  width: var(--settings-switch-width);
  height: var(--settings-switch-height);
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--color-border-card);
  cursor: pointer;
  transition: background 0.2s ease;
}

.pref-toggle.on {
  background: var(--color-brand-primary);
}

.pref-toggle .knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: var(--settings-switch-knob);
  height: var(--settings-switch-knob);
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 5px rgba(15, 23, 42, 0.25);
  transition: transform 0.2s ease;
}

.pref-toggle.on .knob {
  transform: translateX(calc(var(--settings-switch-width) - var(--settings-switch-knob) - 4px));
}

/* A row that opens a page of options: label, current value, arrow. */
.pref-link {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 20px;
  align-items: center;
  gap: 8px;
  min-height: var(--settings-row-min);
  padding: var(--settings-row-pad-y) 0;
  color: var(--color-text-primary);
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
}

.pref-link-label {
  font-size: var(--settings-label-size);
}

.pref-link-value {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-muted);
  font-size: var(--settings-label-size);
  white-space: nowrap;
}

.pref-link-spin {
  font-size: 16px;
  animation: pref-link-spin 1s linear infinite;
}

@keyframes pref-link-spin {
  to { transform: rotate(360deg); }
}

.pref-link > i {
  color: var(--color-text-muted);
  font-size: 20px;
}
</style>
