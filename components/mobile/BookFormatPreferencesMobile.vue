<template>
  <div class="choice-page">
    <MobileSettingsNav title="Show in Library" back-to="/settings/preferences" aria-label="Book format navigation" />
    <main class="choice-body">
      <!-- This choice only HIDES: Pages still reads every enabled format, the
           library just shows one. Removing a format is "Formats Pages Reads". -->
      <SettingsOptionGroupMobile
        :model-value="settings.formatFilter"
        :options="options"
        aria-label="Formats shown in your library"
        footnote="Choose which formats appear in your library. Hidden books stay on your device and come back when you choose All Formats."
        @update:model-value="updateSettings({ formatFilter: $event })"
      />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePagesSettings } from '~/composables/usePagesSettings'
import { formatLabel, useFormatEnablement } from '~/composables/useFormatEnablement'
import MobileSettingsNav from './MobileSettingsNav.vue'
import SettingsOptionGroupMobile from './SettingsOptionGroupMobile.vue'

const { settings, updateSettings } = usePagesSettings()
const { enabledFormats } = useFormatEnablement()

// Only formats the app still handles can be shown or hidden.
const options = computed(() => [
  { value: 'all', label: 'All Formats' },
  ...enabledFormats.value.map((format) => ({ value: format, label: `${formatLabel(format)} Only` })),
])
</script>

<style scoped>
.choice-page { min-height: 100vh; background: var(--color-settings-background); color: var(--color-text-primary); font-family: var(--mobile-font-family); }
.choice-body { display: grid; gap: var(--settings-section-gap); max-width: 600px; margin: 0 auto; padding: 18px var(--settings-gutter) calc(60px + env(safe-area-inset-bottom)); }
</style>
