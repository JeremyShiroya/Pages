<template>
  <div class="choice-page">
    <MobileSettingsNav title="Formats Pages Reads" back-to="/settings/preferences" aria-label="Formats navigation" />
    <main class="choice-body">
      <!-- This choice REMOVES: books in a dropped format leave the library and
           the device scanner stops detecting that extension. Showing only one
           format without removing anything is "Show in Library". -->
      <SettingsOptionGroupMobile
        :model-value="formatMode"
        :options="formatModeOptions"
        aria-label="Formats Pages reads"
        :disabled="applyingFormat"
        footnote="Removing a format clears those books from your library and stops Pages detecting them, even ones added later. Your files stay on your device, so choosing the format again re-imports them."
        @update:model-value="chooseFormatMode"
      />
    </main>

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
import { enabledFormatsForMode } from '~/composables/usePagesSettings'
import { formatLabel, formatsRemovedBy, useFormatEnablement } from '~/composables/useFormatEnablement'
import { useToast } from '~/composables/useToast'
import MobileSettingsNav from './MobileSettingsNav.vue'
import SettingsOptionGroupMobile from './SettingsOptionGroupMobile.vue'

const { addToast } = useToast()
const { formatMode, countAffected, applyFormatMode } = useFormatEnablement()

const formatModeOptions = [
  { value: 'both', label: 'PDF and EPUB' },
  { value: 'pdf', label: 'PDF Only' },
  { value: 'epub', label: 'EPUB Only' },
]

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
  if (applyingFormat.value || mode === formatMode.value) return
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
  const mode = pendingFormatMode.value
  pendingFormatMode.value = null
  applyingFormat.value = true
  try {
    const { removed } = await applyFormatMode(mode)
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
  }
}
</script>

<style scoped>
.choice-page { min-height: 100vh; background: var(--color-settings-background); color: var(--color-text-primary); font-family: var(--mobile-font-family); }
.choice-body { display: grid; gap: var(--settings-section-gap); max-width: 600px; margin: 0 auto; padding: 18px var(--settings-gutter) calc(60px + env(safe-area-inset-bottom)); }

.format-confirm-overlay { position: fixed; inset: 0; z-index: 2500; display: grid; align-items: end; background: rgba(15, 23, 42, 0.4); }
.format-confirm-sheet { width: 100%; padding: 1.35rem 1.25rem calc(1.25rem + env(safe-area-inset-bottom)); border-radius: 20px 20px 0 0; background: var(--color-background-app); box-shadow: var(--shadow-modal); }
.format-confirm-sheet h2 { margin: 0 0 0.5rem; color: var(--color-text-primary); font-size: 1.02rem; }
.format-confirm-sheet p { margin: 0 0 1.1rem; color: var(--color-text-muted); font-size: 0.85rem; line-height: 1.5; }
.format-confirm-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
.format-confirm-actions button { min-height: 44px; border-radius: 12px; cursor: pointer; font-family: inherit; font-size: 0.9rem; }
.format-confirm-actions .ghost { border: 1px solid var(--color-border-card); background: transparent; color: var(--color-text-primary); }
.format-confirm-actions .danger { border: 0; background: var(--color-status-error, #dc2626); color: #fff; }
.format-confirm-actions .danger:disabled { opacity: 0.6; cursor: default; }
</style>
