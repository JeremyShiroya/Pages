<template>
  <div class="choice-page">
    <MobileSettingsNav title="Ratings" back-to="/settings/preferences" aria-label="Ratings navigation" />
    <main class="choice-body">
      <SettingsOptionGroupMobile
        title="Rating Shown Across Pages"
        :model-value="settings.ratingSource"
        :options="ratingSourceOptions"
        footnote="External ratings are saved per book, so switching sources never discards them."
        @update:model-value="chooseRatingSource"
      />

      <SettingsOptionGroupMobile
        v-if="settings.ratingSource === 'personal'"
        title="Personal Rating Scale"
        :model-value="settings.personalRatingScale"
        :options="scaleOptions"
        footnote="Existing scores are converted for display and remain lossless."
        @update:model-value="updateSettings({ personalRatingScale: $event })"
      />

      <!-- Background refresh after switching to an external source. -->
      <section v-if="ratingSync.state.running" class="sync" role="status" aria-live="polite">
        <div class="sync-card">
          <span class="sync-icon" aria-hidden="true"><i class="ri-loader-4-line"></i></span>
          <div class="sync-body">
            <div class="sync-copy">
              <span class="sync-title">Updating {{ ratingSyncLabel }} ratings</span>
              <span class="sync-percent">{{ ratingSyncPercent }}%</span>
            </div>
            <div class="sync-track" aria-hidden="true"><span :style="{ width: `${ratingSyncPercent}%` }"></span></div>
            <span class="sync-detail">
              {{ ratingSync.state.current }} of {{ ratingSync.state.total }}<template v-if="ratingSync.state.currentTitle"> · {{ ratingSync.state.currentTitle }}</template>
            </span>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePagesSettings } from '~/composables/usePagesSettings'
import { useBooks } from '~/composables/useBooks'
import { RATING_SOURCE_LABELS } from '~/composables/useBookRating'
import { useRatingSync } from '~/composables/useRatingSync'
import { useToast } from '~/composables/useToast'
import MobileSettingsNav from './MobileSettingsNav.vue'
import SettingsOptionGroupMobile from './SettingsOptionGroupMobile.vue'

const { settings, updateSettings } = usePagesSettings()
const { books, updateBook } = useBooks()
const { addToast } = useToast()
const ratingSync = useRatingSync()

const ratingSourceOptions = [
  { value: 'goodreads', label: 'Goodreads', hint: 'Community rating from Goodreads' },
  { value: 'storygraph', label: 'StoryGraph', hint: 'Community rating from StoryGraph' },
  { value: 'personal', label: 'Personal Rating', hint: 'Your own score for each book' },
  { value: 'none', label: 'No Rating', hint: 'Hide ratings across Pages' },
]
const scaleOptions = [
  { value: 5, label: '1 to 5' },
  { value: 10, label: '1 to 10' },
]

const ratingSyncLabel = computed(() => RATING_SOURCE_LABELS[ratingSync.state.source] || 'book')
const ratingSyncPercent = computed(() => (ratingSync.state.total
  ? Math.round((ratingSync.state.current / ratingSync.state.total) * 100)
  : 0))

const chooseRatingSource = (source) => {
  if (settings.value.ratingSource === source) return
  updateSettings({ ratingSource: source })
  if (source === 'personal') {
    addToast('Personal ratings are now shown across Pages.', 'info')
    return
  }
  if (source === 'none') return
  // Module-level sync state keeps this job alive when this page unmounts;
  // useToast is also global, so completion is announced wherever you are.
  void ratingSync.start({ source, books: books.value, updateBook, addToast })
}
</script>

<style scoped>
.choice-page { min-height: 100vh; background: var(--color-settings-background); color: var(--color-text-primary); font-family: var(--mobile-font-family); }
.choice-body { display: grid; gap: var(--settings-section-gap); max-width: 600px; margin: 0 auto; padding: 18px var(--settings-gutter) calc(60px + env(safe-area-inset-bottom)); }

.sync-card { display: grid; grid-template-columns: 34px minmax(0, 1fr); align-items: center; gap: 14px; padding: var(--settings-row-pad-y) var(--settings-row-inset); border-radius: var(--settings-radius); background: var(--color-settings-group); }
.sync-icon { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 50%; background: color-mix(in srgb, var(--color-brand-primary) 14%, transparent); color: var(--color-brand-primary); font-size: 18px; }
.sync-icon i { animation: sync-spin 1s linear infinite; }
.sync-body { display: grid; gap: 7px; min-width: 0; }
.sync-copy { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.sync-title { font-size: 15px; }
.sync-percent { flex: none; color: var(--color-text-muted); font-size: 13px; font-variant-numeric: tabular-nums; }
.sync-track { height: 4px; overflow: hidden; border-radius: 999px; background: color-mix(in srgb, var(--color-text-muted) 22%, transparent); }
.sync-track span { display: block; height: 100%; border-radius: inherit; background: var(--color-brand-primary); transition: width 0.25s ease; }
.sync-detail { overflow: hidden; color: var(--color-text-muted); font-size: 12.5px; text-overflow: ellipsis; white-space: nowrap; }
@keyframes sync-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .sync-icon i { animation: none; } }
</style>
