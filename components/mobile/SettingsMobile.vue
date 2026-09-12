<template>
  <div class="profile">
    <MobileSettingsNav title="Settings" back-to="/" aria-label="Settings navigation" />

    <div class="profile-container">
      <div
        class="profile-link"
        role="button"
        tabindex="0"
        aria-label="Open profile"
        @click="navigate('/profile')"
        @keydown.enter="navigate('/profile')"
      >
        <img :src="profileAvatarSrc" :alt="`${profile.displayName} avatar`" />
        <strong>{{ profile.displayName || 'Reader' }}</strong>
        <i class="ri-arrow-right-s-line" aria-hidden="true"></i>
      </div>

      <section v-for="group in settingsGroups" :key="group.label" class="section">
        <h2 class="section-title">{{ group.label }}</h2>
        <div
          v-for="row in group.rows"
          :key="row.label"
          class="setting-item"
          @click="handleSettingsRow(row)"
        >
          <div class="setting-info">
            <i :class="row.icon"></i>
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
          <i v-else class="ri-arrow-right-s-line right-icon"></i>
        </div>

      </section>

      <div class="about-item" style="cursor: pointer; user-select: none;" @click="handleVersionClick">
        <span>Version {{ appVersion }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import MobileSettingsNav from '~/components/mobile/MobileSettingsNav.vue'
import { useBookishSettings } from '~/composables/useBookishSettings'
import { useShareApp } from '~/composables/useShareApp'
import { useToast } from '~/composables/useToast'
import { BOOKISH_PROFILE_UPDATED_EVENT, useUserProfile } from '~/composables/useUserProfile'

const runtimeConfig = useRuntimeConfig()
const { settings, updateSettings } = useBookishSettings()
const { canShareApp, shareApp } = useShareApp()
const { addToast } = useToast()
const { profile, activeAvatarPreset, loadProfile } = useUserProfile()
const router = useRouter()
const appVersion = computed(() => runtimeConfig.public.appVersion || '0.0.0')
const profileAvatarSrc = computed(() => profile.value.avatarType === 'image'
  ? profile.value.avatarValue
  : activeAvatarPreset.value.src)

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

onMounted(() => {
  loadProfile()
  window.addEventListener(BOOKISH_PROFILE_UPDATED_EVENT, loadProfile)
})

onBeforeUnmount(() => {
  window.removeEventListener(BOOKISH_PROFILE_UPDATED_EVENT, loadProfile)
})
</script>

<style scoped>
.profile {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  background-color: var(--color-background-app);
  font-family: var(--mobile-font-family);
}

.profile-container {
  flex: 1;
  padding: 10px 16px 100px;
}

.section {
  overflow: hidden;
  margin-bottom: 20px;
  border: 1px solid var(--color-border-subtle);
  border-radius: 16px;
  background: var(--color-surface-card);
}

.section-title {
  margin: 0;
  padding: 11px 14px 7px;
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.profile-link {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 68px;
  margin-bottom: 24px;
  padding: 10px 14px 10px 10px;
  border: 1px solid var(--color-border-subtle);
  border-radius: 16px;
  background: var(--color-surface-card);
  color: var(--color-text-primary);
  cursor: pointer;
}

.profile-link:focus-visible {
  outline: 2px solid var(--color-brand-primary);
  outline-offset: 3px;
}

.profile-link img {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
}

.profile-link strong {
  overflow: hidden;
  font-size: 16px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-link i {
  color: var(--color-text-muted);
  font-size: 20px;
}

.setting-item {
  display: grid;
  width: 100%;
  align-items: center;
  grid-template-columns: minmax(0, 1fr) auto;
  margin-bottom: 0;
  padding: 14px 0;
  border-top: 1px solid var(--color-border-subtle);
  background-color: transparent;
  cursor: pointer;
}

.setting-item:active {
  background-color: var(--color-surface-hover);
}

.setting-info {
  display: grid;
  align-items: center;
  grid-template-columns: 20px minmax(0, 1fr);
  column-gap: 12px;
  min-width: 0;
  padding-left: 14px;
}

.setting-info span {
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-primary);
  font-size: 18px;
  font-weight: 400;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.setting-info i {
  color: var(--color-text-primary);
  font-size: 20px;
  line-height: 1;
  text-align: center;
}

.right-icon {
  padding-right: 16px;
  color: var(--color-text-muted);
  font-size: 20px;
  line-height: 1;
}

.theme-toggle {
  position: relative;
  width: 42px;
  height: 24px;
  margin-right: 16px;
  border-radius: 999px;
  background: var(--color-border-card);
  transition: background-color 0.2s ease;
}

.theme-toggle span {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: var(--color-surface-primary);
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.18);
  transition: transform 0.2s ease;
}

.theme-toggle[aria-checked='true'] {
  background: var(--color-brand-primary);
}

.theme-toggle[aria-checked='true'] span {
  transform: translateX(18px);
}

.about-item {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  background-color: var(--color-background-app);
  color: var(--color-text-muted);
  font-size: 16px;
}
</style>
