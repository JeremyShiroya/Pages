<template>
  <div class="preferences">
    <MobileSettingsNav title="Preferences" back-to="/settings" aria-label="Settings navigation" />

    <div class="preferences-body">
      <section class="pref-group">
        <h2 class="pref-group-title">Appearance</h2>

        <div class="pref-block">
          <div class="pref-copy">
            <span class="pref-label">Light mode</span>
            <span class="pref-hint">Choose a bright white canvas or the original muted grey.</span>
          </div>
          <div class="option-grid" role="group" aria-label="Light mode background">
            <button
              v-for="opt in appBackgroundOptions"
              :key="opt.value"
              type="button"
              class="option palette-option"
              :class="{ active: settings.appBackground === opt.value }"
              :aria-pressed="settings.appBackground === opt.value"
              @click="set('appBackground', opt.value)"
            >
              <span class="preview palette-preview" :class="`palette-preview--${opt.preview}`" aria-hidden="true">
                <span class="palette-sidebar">
                  <i></i><i></i><i></i>
                </span>
                <span class="palette-content">
                  <i class="palette-heading"></i>
                  <span class="palette-cards"><i></i><i></i></span>
                  <i class="palette-line"></i>
                </span>
              </span>
              <span class="option-label">
                {{ opt.label }}
                <i v-if="settings.appBackground === opt.value" class="ri-check-line"></i>
              </span>
            </button>
          </div>
        </div>

        <div class="pref-block">
          <div class="pref-copy">
            <span class="pref-label">Dark mode</span>
            <span class="pref-hint">Choose pure black or the current muted charcoal.</span>
          </div>
          <div class="option-grid" role="group" aria-label="Dark mode background">
            <button
              v-for="opt in darkAppBackgroundOptions"
              :key="opt.value"
              type="button"
              class="option palette-option"
              :class="{ active: settings.darkAppBackground === opt.value }"
              :aria-pressed="settings.darkAppBackground === opt.value"
              @click="set('darkAppBackground', opt.value)"
            >
              <span class="preview palette-preview" :class="`palette-preview--${opt.preview}`" aria-hidden="true">
                <span class="palette-sidebar">
                  <i></i><i></i><i></i>
                </span>
                <span class="palette-content">
                  <i class="palette-heading"></i>
                  <span class="palette-cards"><i></i><i></i></span>
                  <i class="palette-line"></i>
                </span>
              </span>
              <span class="option-label">
                {{ opt.label }}
                <i v-if="settings.darkAppBackground === opt.value" class="ri-check-line"></i>
              </span>
            </button>
          </div>
        </div>
      </section>

      <section class="pref-group">
        <h2 class="pref-group-title">Ratings</h2>

        <div class="pref-block">
          <div class="pref-copy">
            <span class="pref-label">Rating shown across Pages</span>
            <span class="pref-hint">External ratings are saved per book, so switching sources never discards them.</span>
          </div>
          <div class="rating-option-list" role="radiogroup" aria-label="Rating source">
            <button
              v-for="opt in ratingSourceOptions"
              :key="opt.value"
              type="button"
              class="rating-source-option"
              :class="{ active: settings.ratingSource === opt.value }"
              role="radio"
              :aria-pressed="settings.ratingSource === opt.value"
              :aria-checked="settings.ratingSource === opt.value"
              @click="chooseRatingSource(opt.value)"
            >
              <span class="rating-source-copy">
                <strong>{{ opt.label }}</strong>
                <small>{{ opt.hint }}</small>
              </span>
              <span v-if="opt.value !== 'none'" class="rating-source-sample" aria-hidden="true">
                <BookRatingDisplay
                  :book="ratingPreviewBook"
                  :source="opt.value"
                  compact
                />
              </span>
              <span class="rating-choice-mark" aria-hidden="true">
                <i v-if="settings.ratingSource === opt.value" class="ri-check-line"></i>
              </span>
            </button>
          </div>
        </div>

        <div v-if="settings.ratingSource === 'personal'" class="pref-row">
          <div class="pref-copy">
            <span class="pref-label">Personal rating scale</span>
            <span class="pref-hint">Existing scores are converted for display and remain lossless.</span>
          </div>
          <div class="segmented" role="group" aria-label="Personal rating scale">
            <button
              v-for="scale in personalRatingScales"
              :key="scale"
              type="button"
              class="segment"
              :class="{ active: settings.personalRatingScale === scale }"
              @click="set('personalRatingScale', scale)"
            >1–{{ scale }}</button>
          </div>
        </div>

        <div v-if="ratingSync.state.running" class="rating-sync" role="status" aria-live="polite">
          <div class="rating-sync-copy">
            <span>Updating {{ ratingSyncLabel }} ratings</span>
            <strong>{{ ratingSyncPercent }}%</strong>
          </div>
          <div class="rating-sync-track" aria-hidden="true">
            <span :style="{ width: `${ratingSyncPercent}%` }"></span>
          </div>
          <small>{{ ratingSync.state.current }} of {{ ratingSync.state.total }} · {{ ratingSync.state.currentTitle }}</small>
        </div>
      </section>

      <section v-if="isTablet" class="pref-group">
        <h2 class="pref-group-title">Book actions</h2>

        <div class="pref-block">
          <div class="pref-copy">
            <span class="pref-label">Action display</span>
            <span class="pref-hint">Choose a cleaner More menu or keep every action visible.</span>
          </div>
          <div class="option-grid">
            <button
              v-for="opt in bookActionDisplayOptions"
              :key="opt.value"
              type="button"
              class="option"
              :class="{ active: settings.bookActionDisplay === opt.value }"
              @click="set('bookActionDisplay', opt.value)"
            >
              <span class="preview">
                <BookActionsPreview :mode="opt.value" />
              </span>
              <span class="option-label">
                {{ opt.label }}
                <i v-if="settings.bookActionDisplay === opt.value" class="ri-check-line"></i>
              </span>
            </button>
          </div>
        </div>
      </section>

      <section class="pref-group">
        <h2 class="pref-group-title">Profile favourites</h2>

        <div class="pref-block">
          <div class="pref-copy">
            <span class="pref-label">Layout</span>
            <span class="pref-hint">Choose how favourite books appear on your Profile page.</span>
          </div>
          <div class="option-grid">
            <button
              v-for="opt in profileFavouritesLayoutOptions"
              :key="opt.value"
              type="button"
              class="option"
              :class="{ active: settings.profileFavouritesLayout === opt.value }"
              @click="set('profileFavouritesLayout', opt.value)"
            >
              <span class="preview profile-layout-preview" :class="`profile-layout-preview--${opt.value}`" aria-hidden="true">
                <i v-for="index in (opt.value === 'grid' ? 6 : 3)" :key="index"></i>
              </span>
              <span class="option-label">
                {{ opt.label }}
                <i v-if="settings.profileFavouritesLayout === opt.value" class="ri-check-line"></i>
              </span>
            </button>
          </div>
        </div>
      </section>

      <!-- Series cards -->
      <section class="pref-group">
        <h2 class="pref-group-title">Series cards</h2>

        <!--LAYOUT-->

        <div class="pref-block">
          <div class="pref-copy">
            <span class="pref-label">Layout</span>
            <span class="pref-hint">Fanned covers, or the playlist-style card.</span>
          </div>
          <div class="option-grid">
            <button
              v-for="opt in seriesLayoutOptions"
              :key="opt.value"
              type="button"
              class="option"
              :class="{ active: settings.seriesCardLayout === opt.value }"
              @click="set('seriesCardLayout', opt.value)"
            >
              <span class="preview">
                <SeriesPreview :layout="opt.value" :background="settings.seriesCardBackground" />
              </span>
              <span class="option-label">{{ opt.label }}<i v-if="settings.seriesCardLayout === opt.value" class="ri-check-line"></i></span>
            </button>
          </div>
        </div>

        <!--BACKGROUND-->

        <div class="pref-block">
          <div class="pref-copy">
            <span class="pref-label">Background</span>
            <span class="pref-hint">Plain surface, or a blurred cover image.</span>
          </div>
          <div class="option-grid">
            <button
              v-for="opt in backgroundOptions"
              :key="opt.value"
              type="button"
              class="option"
              :class="{ active: settings.seriesCardBackground === opt.value }"
              @click="set('seriesCardBackground', opt.value)"
            >
              <span class="preview">
                <SeriesPreview layout="fan" :background="opt.value" />
              </span>
              <span class="option-label">{{ opt.label }}<i v-if="settings.seriesCardBackground === opt.value" class="ri-check-line"></i></span>
            </button>
          </div>
        </div>
      </section>

      <!-- Series suggestions -->
      <section class="pref-group">
        <h2 class="pref-group-title">Series suggestions</h2>

        <div class="pref-row">
          <div class="pref-copy">
            <span class="pref-label">Show missing books</span>
            <span class="pref-hint">
              A series detail page counts what you own against the whole series
              ("2/6 books"). Turn this on to see the installments you're missing
              as muted cards, in their place in the reading order.
            </span>
          </div>
          <button
            type="button"
            class="pref-toggle"
            role="switch"
            :aria-checked="settings.seriesSuggestions === true"
            :class="{ on: settings.seriesSuggestions === true }"
            @click="set('seriesSuggestions', settings.seriesSuggestions !== true)"
          >
            <span class="knob"></span>
          </button>
        </div>
      </section>

      <!-- Playlist cards — the same card and the same options as Series cards. -->
      <section class="pref-group">
        <h2 class="pref-group-title">Playlist cards</h2>

        <!--LAYOUT-->

        <div class="pref-block">
          <div class="pref-copy">
            <span class="pref-label">Layout</span>
            <span class="pref-hint">Fanned covers, or the playlist-style card.</span>
          </div>
          <div class="option-grid">
            <button
              v-for="opt in seriesLayoutOptions"
              :key="opt.value"
              type="button"
              class="option"
              :class="{ active: settings.playlistCardLayout === opt.value }"
              @click="set('playlistCardLayout', opt.value)"
            >
              <span class="preview">
                <SeriesPreview :layout="opt.value" :background="settings.playlistCardBackground" />
              </span>
              <span class="option-label">{{ opt.label }}<i v-if="settings.playlistCardLayout === opt.value" class="ri-check-line"></i></span>
            </button>
          </div>
        </div>
        
        <!--BACKGROUND-->

        <div class="pref-block">
          <div class="pref-copy">
            <span class="pref-label">Background</span>
            <span class="pref-hint">Plain surface, or a blurred cover image.</span>
          </div>
          <div class="option-grid">
            <button
              v-for="opt in backgroundOptions"
              :key="opt.value"
              type="button"
              class="option"
              :class="{ active: settings.playlistCardBackground === opt.value }"
              @click="set('playlistCardBackground', opt.value)"
            >
              <span class="preview">
                <SeriesPreview layout="fan" :background="opt.value" />
              </span>
              <span class="option-label">{{ opt.label }}<i v-if="settings.playlistCardBackground === opt.value" class="ri-check-line"></i></span>
            </button>
          </div>
        </div>

      </section>

      <!-- Reading — same visual-example treatment as the card sections above -->
      <section class="pref-group">
        <h2 class="pref-group-title">Reading</h2>

        <div class="pref-block">
          <div class="pref-copy">
            <span class="pref-label">Highlight while reading</span>
            <span class="pref-hint">Highlight the sentence being read aloud.</span>
          </div>
          <div class="option-grid">
            <button
              v-for="opt in toggleOptions"
              :key="`hl-${opt.value}`"
              type="button"
              class="option"
              :class="{ active: (settings.readerHighlight !== false) === opt.value }"
              @click="set('readerHighlight', opt.value)"
            >
              <span class="preview">
                <ReadingPreview kind="highlight" :on="opt.value" />
              </span>
              <span class="option-label">
                {{ opt.label }}
                <i v-if="(settings.readerHighlight !== false) === opt.value" class="ri-check-line"></i>
              </span>
            </button>
          </div>
        </div>

        <div class="pref-block">
          <div class="pref-copy">
            <span class="pref-label">Blurred cover in Listen mode</span>
            <span class="pref-hint">Soft blurred book cover behind the player.</span>
          </div>
          <div class="option-grid">
            <button
              v-for="opt in toggleOptions"
              :key="`lb-${opt.value}`"
              type="button"
              class="option"
              :class="{ active: (settings.listenCoverBlur !== false) === opt.value }"
              @click="set('listenCoverBlur', opt.value)"
            >
              <span class="preview">
                <ReadingPreview kind="listen" :on="opt.value" />
              </span>
              <span class="option-label">
                {{ opt.value ? 'Blurred cover' : 'Plain' }}
                <i v-if="(settings.listenCoverBlur !== false) === opt.value" class="ri-check-line"></i>
              </span>
            </button>
          </div>
        </div>
      </section>

      <!-- Interface -->
      <section class="pref-group">
        <h2 class="pref-group-title">Interface</h2>

        <div class="pref-row">
          <div class="pref-copy">
            <span class="pref-label">Reading streak</span>
            <span class="pref-hint">Show the streak counter in the top bar.</span>
          </div>
          <button
            type="button"
            class="pref-toggle"
            role="switch"
            :aria-checked="settings.showStreak !== false"
            :class="{ on: settings.showStreak !== false }"
            @click="set('showStreak', settings.showStreak === false)"
          >
            <span class="knob"></span>
          </button>
        </div>

        <div v-if="settings.developerMode" class="pref-row">
          <div class="pref-copy">
            <span class="pref-label">Hide content</span>
            <span class="pref-hint">Preview the app as though your library were empty. Nothing is deleted.</span>
          </div>
          <button
            type="button"
            class="pref-toggle"
            role="switch"
            :aria-checked="settings.hideContent === true"
            :class="{ on: settings.hideContent === true }"
            @click="toggleHideContent"
          >
            <span class="knob"></span>
          </button>
        </div>

        <!-- Two separate controls, deliberately. This one HIDES: the app still
             handles both formats, it just shows one. It disappears when only one
             format is enabled below, because then there is nothing to hide. -->
        <div v-if="enabledFormats.length > 1" class="pref-row">
          <div class="pref-copy">
            <span class="pref-label">Book format</span>
            <span class="pref-hint">Which formats appear in your library.</span>
          </div>
          <div class="segmented" role="group" aria-label="Book format filter">
            <button
              v-for="opt in formatFilterOptions"
              :key="opt.value"
              type="button"
              class="segment"
              :class="{ active: settings.formatFilter === opt.value }"
              @click="set('formatFilter', opt.value)"
            >{{ opt.label }}</button>
          </div>
        </div>

        <!-- And this one REMOVES: those books leave the library and the app
             stops detecting the format at all. -->
        <div class="pref-row">
          <div class="pref-copy">
            <span class="pref-label">Formats Pages reads</span>
            <span class="pref-hint">
              Removing a format clears those books from your library and stops Pages
              detecting them at all — even ones added later. Your files stay on your
              device, so turning it back on re-imports them.
            </span>
          </div>
          <div class="segmented" role="group" aria-label="Book formats Pages handles">
            <button
              v-for="opt in formatModeOptions"
              :key="opt.value"
              type="button"
              class="segment"
              :class="{ active: formatMode === opt.value }"
              @click="chooseFormatMode(opt.value)"
            >{{ opt.label }}</button>
          </div>
        </div>
      </section>
    </div>

    <!-- Removing a format destroys library records, so it says how many and what
         survives before doing it. -->
    <div v-if="pendingFormatMode" class="format-confirm-overlay" role="presentation" @click="pendingFormatMode = null">
      <section
        class="format-confirm-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="format-confirm-title"
        @click.stop
      >
        <h2 id="format-confirm-title">{{ pendingFormatTitle }}</h2>
        <p>{{ pendingFormatMessage }}</p>
        <div class="format-confirm-actions">
          <button type="button" class="ghost" @click="pendingFormatMode = null">Cancel</button>
          <button type="button" class="danger" :disabled="applyingFormat" @click="confirmFormatMode">
            {{ applyingFormat ? 'Removing…' : 'Remove' }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { enabledFormatsForMode, useBookishSettings } from '~/composables/useBookishSettings'
import { useBooks } from '~/composables/useBooks'
import { RATING_SOURCE_LABELS } from '~/composables/useBookRating'
import { useRatingSync } from '~/composables/useRatingSync'
import { formatLabel, formatsRemovedBy, useFormatEnablement } from '~/composables/useFormatEnablement'
import { useToast } from '~/composables/useToast'
import { useDeviceArchitecture } from '~/composables/useDeviceArchitecture'
import MobileSettingsNav from './MobileSettingsNav.vue'
import BookActionsPreview from '../shared/previews/BookActionsPreview.vue'
import BookRatingDisplay from '../shared/BookRatingDisplay.vue'
import ReadingPreview from '../shared/previews/ReadingPreview.vue'
// Playlist cards offer the same two layouts as series cards, so they share the
// same preview mockup.
import SeriesPreview from '../shared/previews/SeriesCardPreview.vue'

const { settings, updateSettings } = useBookishSettings()
const { isTablet } = useDeviceArchitecture()
const { addToast } = useToast()
const { books, updateBook, fetchAllData } = useBooks()
const ratingSync = useRatingSync()

const set = (key, value) => updateSettings({ [key]: value })

const appBackgroundOptions = [
  { value: 'white', label: 'Bright', preview: 'bright' },
  { value: 'muted', label: 'Muted', preview: 'light-muted' },
]

const darkAppBackgroundOptions = [
  { value: 'dark', label: 'Dark', preview: 'dark' },
  { value: 'muted', label: 'Muted', preview: 'dark-muted' },
]

const bookActionDisplayOptions = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'visible', label: 'Always visible' },
]

const ratingSourceOptions = [
  { value: 'goodreads', label: 'Goodreads', hint: 'Community rating from Goodreads' },
  { value: 'storygraph', label: 'StoryGraph', hint: 'Community rating from StoryGraph' },
  { value: 'personal', label: 'Personal Rating', hint: 'Your own score for each book' },
  { value: 'none', label: 'No rating', hint: 'Hide ratings across Pages' },
]
const personalRatingScales = [5, 10]
const ratingPreviewBook = {
  rating: 8,
  webReview: 'Goodreads Rating: 4.20/5',
  externalRatings: {
    goodreads: { rating: 4.2 },
    storygraph: { rating: 4.15 },
  },
}
const ratingSyncLabel = computed(() => RATING_SOURCE_LABELS[ratingSync.state.source] || 'book')
const ratingSyncPercent = computed(() => ratingSync.state.total
  ? Math.round((ratingSync.state.current / ratingSync.state.total) * 100)
  : 0)

const chooseRatingSource = (source) => {
  if (settings.value.ratingSource === source) return
  set('ratingSource', source)
  if (source === 'personal') {
    addToast('Personal ratings are now shown across Pages.', 'info')
    return
  }
  if (source === 'none') return
  // Module-level sync state keeps this job alive when Preferences unmounts;
  // useToast is also global, so completion is announced on whichever page is open.
  void ratingSync.start({ source, books: books.value, updateBook, addToast })
}

// Hide content swaps the in-memory library for an empty one (or back), so
// the change is visible the moment you leave settings — no restart needed.
const toggleHideContent = async () => {
  set('hideContent', settings.value.hideContent !== true)
  await fetchAllData(true)
}

const backgroundOptions = [
  { value: 'blank', label: 'Default' },
  { value: 'blur', label: 'Blur image' },
]
const seriesLayoutOptions = [
  { value: 'fan', label: 'Fanned' },
  { value: 'cover', label: 'Playlist style' },
]
const profileFavouritesLayoutOptions = [
  { value: 'grid', label: 'Grid' },
  { value: 'list', label: 'List' },
]
// Reading options are booleans, but they're presented as picture choices like
// the card sections rather than as bare switches.
const toggleOptions = [
  { value: true, label: 'On' },
  { value: false, label: 'Off' },
]
// "Book format" — an app-wide HIDE. Only offers formats the app still handles.
const formatFilterOptions = computed(() => [
  { value: 'all', label: 'All' },
  ...enabledFormats.value.map((format) => ({ value: format, label: formatLabel(format) })),
])

// "Formats Pages reads" — the app-level choice. See useFormatEnablement:
// turning one off purges its books and stops the device scanner detecting the
// extension. Not a filter, which is why it is its own row.
const formatModeOptions = [
  { value: 'both', label: 'All' },
  { value: 'pdf', label: 'PDF' },
  { value: 'epub', label: 'EPUB' },
]

const { enabledFormats, formatMode, countAffected, applyFormatMode } = useFormatEnablement()

const pendingFormatMode = ref(null)
const applyingFormat = ref(false)

const pendingFormatTitle = computed(() => {
  const removed = formatsRemovedBy(
    enabledFormatsForMode(formatMode.value),
    enabledFormatsForMode(pendingFormatMode.value),
  )
  return `Remove ${removed.map(formatLabel).join(' and ')} from your library?`
})

const pendingFormatMessage = computed(() => {
  const count = countAffected(enabledFormatsForMode(pendingFormatMode.value))
  const books = count === 1 ? '1 book' : `${count} books`
  return count > 0
    ? `${books} will be cleared from your library, and Pages will stop detecting that format. Your files stay on your device, so turning it back on re-imports them.`
    : 'Pages will stop detecting that format. Your files stay on your device.'
})

const chooseFormatMode = async (mode) => {
  if (mode === formatMode.value) return
  // Only a removal needs confirming; widening the set destroys nothing.
  const removes = formatsRemovedBy(
    enabledFormatsForMode(formatMode.value),
    enabledFormatsForMode(mode),
  ).length > 0
  if (removes) {
    pendingFormatMode.value = mode
    return
  }
  await applyFormatMode(mode)
}

const confirmFormatMode = async () => {
  if (applyingFormat.value || !pendingFormatMode.value) return
  applyingFormat.value = true
  try {
    const { removed } = await applyFormatMode(pendingFormatMode.value)
    addToast(
      removed > 0
        ? `Removed ${removed} book${removed === 1 ? '' : 's'} from your library.`
        : 'Format removed.',
      'success',
    )
  } catch (error) {
    console.error('[Preferences] Could not change the format choice:', error)
    addToast('Could not change the book formats.', 'error')
  } finally {
    applyingFormat.value = false
    pendingFormatMode.value = null
  }
}
</script>

<style scoped>
.preferences {
  min-height: 100vh;
  background: var(--color-settings-background);
  font-family: var(--mobile-font-family);
}

.preferences-body {
  display: grid;
  gap: 32px;
  padding: 28px var(--mobile-page-padding-inline, 16px) calc(var(--mobile-bottom-nav-height, 72px) + 32px);
}

.pref-group {
  position: relative;
  display: grid;
  gap: 14px;
  padding: 14px;
  border: 0;
  border-radius: 16px;
  background: var(--color-settings-group);
}

.pref-group-title {
  position: absolute;
  bottom: calc(100% + 9px);
  left: 4px;
  margin: 0;
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

/* Block = a label + a row of visual option cards. */
.pref-block {
  display: grid;
  gap: 10px;
}

.pref-block + .pref-block,
.pref-row + .pref-row {
  padding-top: 14px;
  border-top: 1px solid var(--color-border-subtle);
}

.pref-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.pref-label {
  color: var(--color-text-primary);
  font-size: 15.5px;
}

.pref-hint {
  color: var(--color-text-muted);
  font-size: 12.5px;
  line-height: 1.35;
}

.option-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

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

.rating-option-list {
  display: grid;
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--color-border-subtle);
  border-radius: 14px;
  background: var(--color-border-subtle);
}

.rating-source-option {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 24px;
  align-items: center;
  gap: 12px;
  min-width: 0;
  min-height: 72px;
  padding: 12px 13px;
  border: 0;
  background: var(--color-surface-card, var(--color-surface-secondary));
  color: var(--color-text-primary);
  cursor: pointer;
  text-align: left;
  transition: background-color 0.18s ease;
}

.rating-source-option.active {
  background: color-mix(in srgb, var(--color-surface-card) 90%, var(--color-brand-primary) 10%);
}

.rating-source-copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.rating-source-copy strong {
  font-size: 14px;
  font-weight: 650;
}

.rating-source-copy small {
  overflow: hidden;
  color: var(--color-text-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rating-source-sample {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.rating-choice-mark {
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border: 1.5px solid var(--color-border-card);
  border-radius: 50%;
  color: #fff;
  font-size: 13px;
}

.rating-source-option.active .rating-choice-mark {
  border-color: var(--color-brand-primary);
  background: var(--color-brand-primary);
}

.rating-sync {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--color-brand-primary) 8%, var(--color-surface-card));
}

.rating-sync-copy {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.rating-sync-track {
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--color-border-subtle);
}

.rating-sync-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--gradient-library-progress);
  transition: width 0.25s ease;
}

.rating-sync small {
  overflow: hidden;
  color: var(--color-text-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 390px) {
  .rating-source-option {
    grid-template-columns: minmax(0, 1fr) 24px;
  }

  .rating-source-sample {
    grid-column: 1 / -1;
    grid-row: 2;
    justify-content: flex-start;
  }
}

.preview {
  display: block;
  height: 92px;
  overflow: hidden;
  border-radius: 9px;
}

.profile-layout-preview {
  display: grid;
  align-content: center;
  gap: 7px;
  padding: 14px;
  background: var(--color-background-app);
}

.profile-layout-preview--grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.profile-layout-preview--list {
  grid-template-columns: 1fr;
}

.profile-layout-preview i {
  min-height: 17px;
  border-radius: 5px;
  background: color-mix(in srgb, var(--color-brand-primary) 28%, var(--color-surface-primary));
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
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 0 2px;
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
  width: 46px;
  height: 27px;
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
  top: 3px;
  left: 3px;
  width: 21px;
  height: 21px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 5px rgba(15, 23, 42, 0.25);
  transition: transform 0.2s ease;
}

.pref-toggle.on .knob {
  transform: translateX(19px);
}

.format-confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 2500;
  display: grid;
  align-items: end;
  background: rgba(15, 23, 42, 0.4);
}

.format-confirm-sheet {
  width: 100%;
  padding: 1.35rem 1.25rem calc(1.25rem + env(safe-area-inset-bottom));
  border-radius: 20px 20px 0 0;
  background: var(--color-background-app);
  box-shadow: var(--shadow-modal);
}

.format-confirm-sheet h2 {
  margin: 0 0 0.5rem;
  color: var(--color-text-primary);
  font-size: 1.02rem;
}

.format-confirm-sheet p {
  margin: 0 0 1.1rem;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  line-height: 1.5;
}

.format-confirm-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}

.format-confirm-actions button {
  min-height: 44px;
  border-radius: 12px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 600;
}

.format-confirm-actions .ghost {
  border: 1px solid var(--color-border-card);
  background: transparent;
  color: var(--color-text-primary);
}

.format-confirm-actions .danger {
  border: 0;
  background: var(--color-status-error, #dc2626);
  color: #fff;
}

.format-confirm-actions .danger:disabled {
  opacity: 0.6;
  cursor: default;
}

@media (min-width: 640px) {
  .format-confirm-overlay {
    align-items: center;
    justify-items: center;
    padding: 1.5rem;
  }

  .format-confirm-sheet {
    max-width: 400px;
    border-radius: 18px;
    padding-bottom: 1.25rem;
  }
}
</style>
