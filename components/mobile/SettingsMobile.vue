<template>
  <div class="profile">
    <MobileSettingsNav title="Settings" back-to="/" aria-label="Settings navigation" />

    <div class="profile-container" :class="{ 'no-icons': !showIcons }">
      <section v-for="group in settingsGroups" :key="group.label" class="section">
        <h2 class="section-title">{{ group.label }}</h2>
        <div
          v-for="row in group.rows"
          :key="row.label"
          class="setting-item"
          :class="{ 'has-switch': row.type === 'theme' || row.type === 'developerMode' }"
          @click="handleSettingsRow(row)"
        >
          <div class="setting-info">
            <i v-if="showIcons" :class="row.icon"></i>
            <span>{{ row.label }}</span>
          </div>

          <span
            v-if="row.type === 'theme'"
            class="theme-toggle"
            role="switch"
            aria-label="Toggle dark mode"
            :aria-checked="settings.readerTheme === 'dark'"
          >
            <span></span>
          </span>
          <span
            v-else-if="row.type === 'developerMode'"
            class="theme-toggle"
            role="switch"
            aria-label="Toggle developer mode"
            :aria-checked="settings.developerMode === true"
          >
            <span></span>
          </span>
          <i v-else-if="showArrows" class="ri-arrow-right-s-line right-icon"></i>
        </div>

      </section>

      <div class="about-item" style="cursor: pointer; user-select: none;" @click="handleVersionClick">
        <span>Version {{ appVersion }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import MobileSettingsNav from '~/components/mobile/MobileSettingsNav.vue'
import { usePagesSettings } from '~/composables/usePagesSettings'
import { useShareApp } from '~/composables/useShareApp'
import { useToast } from '~/composables/useToast'

const runtimeConfig = useRuntimeConfig()
const { settings, updateSettings } = usePagesSettings()
const { canShareApp, shareApp } = useShareApp()
const { addToast } = useToast()
const router = useRouter()
const appVersion = computed(() => runtimeConfig.public.appVersion || '0.0.0')
// Plain rows by default; developer mode (Preferences → Developer) can bring
// back the row icons and arrows to compare.
const showIcons = computed(() => settings.value.settingsRowIcons === true)
const showArrows = computed(() => settings.value.settingsRowArrows === true)

const versionClickCount = ref(0)
let versionClickTimer = null

const handleVersionClick = () => {
  if (settings.value.developerMode) return
  versionClickCount.value += 1
  if (versionClickTimer) clearTimeout(versionClickTimer)
  versionClickTimer = setTimeout(() => {
    versionClickCount.value = 0
  }, 3000)

  if (versionClickCount.value >= 20) {
    versionClickCount.value = 0
    if (versionClickTimer) clearTimeout(versionClickTimer)
    updateSettings({ developerMode: true })
    addToast('Developer mode has been turned on.', 'success')
  }
}

const mobileSettingsRows = computed(() => [
  { label: 'Theme', icon: 'ri-moon-line', type: 'theme' },
  { label: 'Preferences', icon: 'ri-edit-box-line', to: '/settings/preferences' },
  { label: 'Storage', icon: 'ri-database-2-line', to: '/settings/storage' },
  ...(settings.value.developerMode ? [{ label: 'Connection test', icon: 'ri-base-station-line', to: '/settings/connection' }] : []),
  ...(canShareApp() ? [{ label: 'Share Pages', icon: 'ri-share-line', type: 'share' }] : []),
  { label: 'About', icon: 'ri-information-line', to: '/settings/about' },
  { label: 'Privacy Policy', icon: 'ri-lock-line', to: '/settings/privacy' },
  ...(settings.value.developerMode ? [{ label: 'Developer Mode', icon: 'ri-code-s-slash-line', type: 'developerMode' }] : []),
])

const settingsGroups = computed(() => {
  const rows = mobileSettingsRows.value
  return [
    { label: 'Appearance', rows: rows.filter(row => ['Theme', 'Preferences'].includes(row.label)) },
    { label: 'Library', rows: rows.filter(row => ['Storage'].includes(row.label)) },
    { label: 'Pages', rows: rows.filter(row => ['Share Pages', 'About', 'Privacy Policy'].includes(row.label)) },
    { label: 'Developer', rows: rows.filter(row => ['Connection test', 'Developer Mode'].includes(row.label)) },
  ].filter(group => group.rows.length)
})

const navigate = (path) => {
  router.push(path)
}

const handleSettingsRow = async (row) => {
  if (row.type === 'theme') {
    setReaderTheme(settings.value.readerTheme === 'dark' ? 'light' : 'dark')
    return
  }

  if (row.type === 'developerMode') {
    updateSettings({ developerMode: !settings.value.developerMode })
    return
  }

  if (row.type === 'share') {
    // Copying ~10MB before the sheet opens is quick but not instant, so say
    // something rather than leaving the tap looking ignored.
    addToast('Preparing the app file…', 'info')
    const { ok, reason } = await shareApp()
    if (!ok) addToast(reason, 'error')
    return
  }

  if (row.to) {
    navigate(row.to)
    return
  }

  addToast(`${row.label} page is coming later.`, 'info')
}

const setReaderTheme = (readerTheme) => updateSettings({ readerTheme })

</script>

<style scoped>
.profile {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  background-color: var(--color-settings-background);
  font-family: var(--mobile-font-family);
}

.profile-container {
  flex: 1;
  padding: 6px var(--settings-gutter) 100px;
}

/* Header outside the card, in line with the row text; the card follows. */
.section {
  position: relative;
  margin: calc(var(--settings-section-gap) + var(--settings-header-size) + var(--settings-header-gap)) 0 0;
  border: 0;
  border-radius: var(--settings-radius);
  background: var(--color-settings-group);
}

.section:first-child {
  margin-top: calc(var(--settings-header-size) + var(--settings-header-gap) + 18px);
}

.section-title {
  position: absolute;
  bottom: calc(100% + var(--settings-header-gap));
  left: var(--settings-row-inset);
  margin: 0;
  padding: 0;
  color: var(--color-text-muted);
  font-size: var(--settings-header-size);
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.setting-item {
  position: relative;
  display: grid;
  width: 100%;
  min-height: var(--settings-row-min);
  align-items: center;
  grid-template-columns: minmax(0, 1fr) auto;
  padding: var(--settings-row-pad-y) var(--settings-row-inset);
  border: 0;
  background-color: transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

/* Rows that carry a switch are a little taller, as in the system pattern. */
.setting-item.has-switch {
  min-height: var(--settings-switch-row-min);
}

/* Default: the list without the leading icons. */
.no-icons .setting-info {
  grid-template-columns: minmax(0, 1fr);
}

.no-icons .setting-item + .setting-item::before {
  left: var(--settings-row-inset);
}

.setting-item:first-of-type { border-radius: var(--settings-radius) var(--settings-radius) 0 0; }
.setting-item:last-of-type { border-radius: 0 0 var(--settings-radius) var(--settings-radius); }
.setting-item:only-of-type { border-radius: var(--settings-radius); }

/* Dividers start at the label (past the icon) and run to the card's edge. */
.setting-item + .setting-item::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  left: calc(var(--settings-row-inset) + 34px);
  height: 1px;
  background: var(--color-border-subtle);
}

.setting-item:active {
  background-color: var(--color-surface-hover);
}

.setting-info {
  display: grid;
  align-items: center;
  grid-template-columns: 22px minmax(0, 1fr);
  column-gap: 12px;
  min-width: 0;
}

.setting-info span {
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-primary);
  font-size: var(--settings-label-size);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.setting-info i {
  color: var(--color-text-secondary);
  font-size: 21px;
  line-height: 1;
  text-align: center;
}

.right-icon {
  color: var(--color-text-muted);
  font-size: 20px;
  line-height: 1;
}

.theme-toggle {
  position: relative;
  width: var(--settings-switch-width);
  height: var(--settings-switch-height);
  border-radius: 999px;
  background: var(--color-border-card);
  transition: background-color 0.2s ease;
}

.theme-toggle span {
  position: absolute;
  top: 2px;
  left: 2px;
  width: var(--settings-switch-knob);
  height: var(--settings-switch-knob);
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.2);
  transition: transform 0.2s ease;
}

.theme-toggle[aria-checked='true'] {
  background: var(--color-brand-primary);
}

.theme-toggle[aria-checked='true'] span {
  transform: translateX(calc(var(--settings-switch-width) - var(--settings-switch-knob) - 4px));
}

.about-item {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  margin: 28px 0 8px;
  background-color: transparent;
  color: var(--color-text-muted);
  font-size: 14px;
}
</style>
