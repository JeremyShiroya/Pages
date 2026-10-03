<template>
  <div v-if="isTablet && route.path !== '/settings'" class="tablet-settings-shell">
    <header class="shell-heading">
      <span>YOUR SPACE</span>
      <h1>Settings</h1>
      <p>Shape how Pages reads, listens, and organizes your library.</p>
    </header>
    <div class="shell-workspace">
      <aside class="shell-directory" aria-label="Settings pages">
        <span class="directory-label">EXPLORE</span>
        <NuxtLink
          v-for="item in settingsPages"
          :key="item.to"
          :to="item.to"
          class="directory-link"
          :class="{ active: route.path === item.to || (item.to === '/settings/preferences' && route.path.startsWith('/settings/preferences/')) }"
          :aria-current="route.path === item.to ? 'page' : undefined"
        >
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
          <i v-if="route.path === item.to" class="ri-check-line current-mark"></i>
        </NuxtLink>
      </aside>
      <main class="shell-content"><NuxtPage /></main>
    </div>
  </div>
  <NuxtPage v-else />
</template>

<script setup>
import { useDeviceArchitecture } from '~/composables/useDeviceArchitecture'
import { useBookishSettings } from '~/composables/useBookishSettings'

const route = useRoute()
const { isTablet } = useDeviceArchitecture()
const { settings } = useBookishSettings()
const settingsPages = computed(() => [
  { label: 'Overview', to: '/settings', icon: 'ri-dashboard-line' },
  { label: 'Preferences', to: '/settings/preferences', icon: 'ri-equalizer-2-line' },
  { label: 'Storage', to: '/settings/storage', icon: 'ri-database-2-line' },
  { label: 'Hidden books', to: '/settings/hidden', icon: 'ri-eye-off-line' },
  { label: 'About', to: '/settings/about', icon: 'ri-information-line' },
  { label: 'Privacy Policy', to: '/settings/privacy', icon: 'ri-lock-line' },
  ...(settings.value.developerMode ? [{ label: 'Connection test', to: '/settings/connection', icon: 'ri-base-station-line' }] : []),
])
</script>

<style scoped>
.tablet-settings-shell { width: 100%; min-width: 0; padding-bottom: 2rem; }
.shell-heading { padding: .5rem 0 1.75rem; border-bottom: 1px solid var(--color-border-card); }
.shell-heading span, .directory-label { color: var(--color-brand-primary); font-size: .7rem; font-weight: 700; letter-spacing: .13em; }
.shell-heading h1 { margin: .45rem 0 .35rem; color: var(--color-text-primary); font-size: clamp(2rem, 3vw, 3rem); font-weight: 600; letter-spacing: -.04em; }
.shell-heading p { margin: 0; color: var(--color-text-muted); font-size: .95rem; }
.shell-workspace { display: grid; grid-template-columns: minmax(205px, 250px) minmax(0, 1fr); gap: clamp(1.5rem, 3vw, 3.5rem); align-items: start; padding-top: 1.5rem; }
.shell-directory { position: sticky; top: 1.25rem; display: grid; align-content: start; gap: .2rem; }
.directory-label { margin: 0 0 .6rem .55rem; }
.directory-link { display: flex; align-items: center; gap: .7rem; min-height: 42px; padding: .45rem .7rem; border-radius: 9px; color: var(--color-text-secondary); font-size: .84rem; text-decoration: none; }
.directory-link:hover { background: var(--color-brand-primary-soft); color: var(--color-brand-primary); }
.directory-link.active { background: var(--color-brand-primary); color: #fff; }
.directory-link i { font-size: 1rem; }
.current-mark { margin-left: auto; }
.shell-content { min-width: 0; }
.shell-content :deep(nav.nav) { display: none; }
.shell-content :deep(.settings-detail-page) { min-height: 0; background: transparent; }
.shell-content :deep(.preferences) { min-height: 0; background: transparent; font-family: inherit; }
.shell-content :deep(.preferences-body) { gap: 1.5rem; padding: 0; }
.shell-content :deep(.pref-group) { gap: 1rem; padding: 1.5rem; border: 1px solid var(--color-border-card); border-radius: 14px; background: var(--color-surface-card); }
.shell-content :deep(.pref-group-title) { position: static; margin: 0 0 .35rem; color: var(--color-text-primary); font-size: 1.1rem; font-weight: 600; letter-spacing: normal; text-transform: none; }
@media (max-width: 900px) { .shell-workspace { grid-template-columns: minmax(155px, 190px) minmax(0, 1fr); gap: 1rem; } .shell-directory { grid-template-columns: 1fr; } }
</style>
