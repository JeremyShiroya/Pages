<template>
  <Teleport to="body">
    <Transition name="ua">
      <!-- A tap outside must not close the alert mid-download: the transfer
           would carry on with nothing left on screen reporting it. -->
      <div
        v-if="available"
        class="ua-layer"
        @click.self="available.mandatory || busy || notesOpen ? null : dismiss()"
      >
        <!-- The alert: same card as Delete — left-aligned title and message,
             plain text buttons at the bottom right. -->
        <section
          v-show="!notesOpen"
          class="ua-alert"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="ua-title"
          aria-describedby="ua-message"
        >
          <h2 id="ua-title">Update Available</h2>
          <p id="ua-message" class="ua-message">
            Pages {{ available.versionName }} is ready to install<template v-if="installedName"> (you have {{ installedName }})</template>.
            <button type="button" class="ua-whats-new" @click="notesOpen = true">Check what's new</button>
          </p>

          <!-- Downloading in the app: our own progress, so the user never has
               to go and find the file in the browser's downloads. -->
          <div v-if="busy" class="ua-progress" role="status" aria-live="polite">
            <div class="ua-track">
              <div
                class="ua-fill"
                :class="{ indeterminate: install.status === 'downloading' && !install.totalBytes }"
                :style="install.totalBytes ? { width: `${install.percent}%` } : null"
              ></div>
            </div>
            <p class="ua-progress-label">{{ progressLabel }}</p>
          </div>

          <!-- Android 8+ keeps a per-app "install unknown apps" switch the user
               has to turn on themselves; without it nothing explains the stall. -->
          <p v-else-if="install.status === 'needs-permission'" class="ua-note">
            {{ install.message }} Turn on “Allow from this source”, then tap Update again.
          </p>
          <p v-else-if="install.status === 'error'" class="ua-note">{{ install.message }}</p>

          <div v-if="!busy" class="ua-actions">
            <!-- "Later" holds only for this app session. -->
            <button v-if="!available.mandatory" type="button" class="ua-btn" @click="dismiss">
              Later
            </button>
            <UpdateAction class="ua-btn ua-primary" />
          </div>
        </section>

        <!-- What's new: a full page over the alert. Back returns to the alert,
             which never closed; the page ends with its own Update. -->
        <Transition name="ua-page">
          <section
            v-if="notesOpen"
            class="ua-page"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ua-page-title"
          >
            <header class="ua-page-nav">
              <button type="button" class="ua-back" aria-label="Back to the update" @click="notesOpen = false">
                <i class="ri-arrow-left-s-line" aria-hidden="true"></i>
              </button>
              <span class="ua-page-nav-title">What's New</span>
            </header>

            <main class="ua-page-body">
              <div class="ua-hero">
                <img class="ua-hero-icon" :src="appLogo" alt="" />
                <div>
                  <h1 id="ua-page-title">Pages {{ available.versionName }}</h1>
                  <p v-if="installedName">You have {{ installedName }}</p>
                </div>
              </div>

              <section class="ua-card">
                <!-- Notes come from the remote manifest, so they are rendered as
                     text. Never swap this for v-html. -->
                <p v-if="available.notes" class="ua-notes">{{ available.notes }}</p>
                <p v-else class="ua-notes muted">Improvements and fixes throughout the app.</p>
              </section>

              <p v-if="install.status === 'needs-permission'" class="ua-note">
                {{ install.message }} Turn on “Allow from this source”, then tap Update again.
              </p>
              <p v-else-if="install.status === 'error'" class="ua-note">{{ install.message }}</p>
              <p v-else class="ua-note">
                {{ inAppCapable ? 'Downloads in the app. Android will ask you to confirm the install.' : 'The download opens in your browser. Tap it when it finishes to install.' }}
              </p>

              <div v-if="busy" class="ua-progress" role="status" aria-live="polite">
                <div class="ua-track">
                  <div
                    class="ua-fill"
                    :class="{ indeterminate: install.status === 'downloading' && !install.totalBytes }"
                    :style="install.totalBytes ? { width: `${install.percent}%` } : null"
                  ></div>
                </div>
                <p class="ua-progress-label">{{ progressLabel }}</p>
              </div>
              <UpdateAction v-else class="ua-page-update" />
            </main>
          </section>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { useAppLogo } from '~/composables/useAppLogo'
const appLogo = useAppLogo()
import { computed, defineComponent, h, onMounted, ref, watch } from 'vue'
import { useAppUpdate } from '~/composables/useAppUpdate'
import { useApkUpdateInstall } from '~/composables/useApkUpdateInstall'

const { available, installed, dismiss } = useAppUpdate()
const {
  state: install,
  canInstallInApp,
  downloadAndInstall,
  openInstallSettings,
  reset,
} = useApkUpdateInstall()

const installedName = computed(() => installed.value?.name || '')
const notesOpen = ref(false)

// Only native builds carrying the installer plugin download in-app; everything
// else keeps the browser hand-off rather than showing a button that can't work.
const inAppCapable = ref(false)
onMounted(async () => { inAppCapable.value = await canInstallInApp() })

const busy = computed(() => ['downloading', 'opening'].includes(install.value.status))

// A fresh prompt should not inherit the previous attempt's error or progress.
watch(available, (next) => {
  if (next) reset()
  notesOpen.value = false
})

const startUpdate = () => downloadAndInstall(available.value)

const formatMb = (bytes) => `${(Number(bytes || 0) / (1024 * 1024)).toFixed(1)} MB`
const progressLabel = computed(() => {
  if (install.value.status === 'opening') return 'Opening the installer…'
  if (install.value.totalBytes) {
    return `Downloading ${install.value.percent}% · ${formatMb(install.value.receivedBytes)} of ${formatMb(install.value.totalBytes)}`
  }
  return 'Downloading…'
})

// The one Update action, used by the alert and by the What's New page. The
// in-app path is a button; everything else stays a real link, because the
// Capacitor WebView turns an external navigation into an ACTION_VIEW intent
// (window.open is a no-op there).
const UpdateAction = defineComponent({
  name: 'UpdateAction',
  setup(_, { attrs }) {
    return () => {
      if (install.value.status === 'needs-permission') {
        return h('button', { ...attrs, type: 'button', onClick: openInstallSettings }, 'Open Settings')
      }
      if (inAppCapable.value) {
        return h('button', { ...attrs, type: 'button', onClick: startUpdate }, install.value.status === 'error' ? 'Try Again' : 'Update')
      }
      return h('a', { ...attrs, href: available.value?.apkUrl, rel: 'noopener noreferrer', onClick: dismiss }, 'Update')
    }
  },
})
// Kept for the link path's markup checks: :href="available.apkUrl"
</script>

<style scoped>
.ua-layer {
  --ua-bg: #f2f2f7;
  --ua-page: #f2f2f7;
  --ua-card: #ffffff;
  --ua-text: #000000;
  --ua-muted: #8a8a8e;
  --ua-press: rgba(0, 0, 0, 0.06);
  position: fixed;
  inset: 0;
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.45);
  font-family: var(--mobile-font-family);
}

:global(html[data-theme="dark"] .ua-layer) {
  --ua-bg: #2c2c2e;
  --ua-page: #000000;
  --ua-card: #1c1c1e;
  --ua-text: #ffffff;
  --ua-muted: #98989f;
  --ua-press: rgba(255, 255, 255, 0.08);
}

/* ── Alert ── */
.ua-alert {
  width: 100%;
  max-width: 400px;
  padding: 26px 24px 14px;
  border-radius: 28px;
  background: var(--ua-bg);
  color: var(--ua-text);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.2);
  text-align: left;
}

.ua-alert h2 {
  margin: 0 0 14px;
  font-size: 20px;
  font-weight: 400 !important;
  line-height: 1.25;
}

.ua-message {
  margin: 0;
  font-size: 16px;
  line-height: 1.45;
}

/* "Check what's new": inline text in the app's accent. */
.ua-whats-new {
  display: inline;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-brand-primary);
  font: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.ua-note {
  margin: 14px 0 0;
  color: var(--ua-muted);
  font-size: 14px;
  line-height: 1.4;
}

.ua-actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 26px;
}

.ua-btn {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  padding: 0 16px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--ua-text);
  font: inherit;
  font-size: 17px;
  font-weight: 400 !important;
  text-decoration: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.ua-primary {
  color: var(--color-brand-primary);
}

.ua-btn:active {
  background: var(--ua-press);
}

/* ── Download progress ── */
.ua-progress {
  margin-top: 18px;
}

.ua-track {
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ua-text) 12%, transparent);
}

.ua-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--color-brand-primary);
  transition: width 0.2s ease;
}

.ua-fill.indeterminate {
  width: 35%;
  animation: ua-slide 1.1s ease-in-out infinite;
}

.ua-progress-label {
  margin: 8px 0 4px;
  color: var(--ua-muted);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

/* ── What's new page ── */
.ua-page {
  position: fixed;
  inset: 0;
  z-index: 1;
  overflow-y: auto;
  background: var(--ua-page);
  color: var(--ua-text);
  overscroll-behavior: contain;
}

.ua-page-nav {
  position: sticky;
  top: 0;
  z-index: 1;
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  min-height: 52px;
  padding: env(safe-area-inset-top) 8px 0;
  background: var(--ua-page);
}

.ua-back {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ua-text);
  font-size: 28px;
  cursor: pointer;
}

.ua-back:active {
  background: var(--ua-press);
}

.ua-page-nav-title {
  font-size: 17px;
  text-align: center;
}

.ua-page-body {
  display: grid;
  gap: 18px;
  max-width: 600px;
  margin: 0 auto;
  padding: 14px 16px calc(32px + env(safe-area-inset-bottom));
}

.ua-hero {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 6px 4px;
}

.ua-hero-icon {
  width: 64px;
  height: 64px;
  border-radius: 15px;
}

.ua-hero h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 400 !important;
}

.ua-hero p {
  margin: 3px 0 0;
  color: var(--ua-muted);
  font-size: 14px;
}

.ua-card {
  padding: 16px;
  border-radius: 14px;
  background: var(--ua-card);
}

.ua-notes {
  margin: 0;
  font-size: 16px;
  line-height: 1.5;
  white-space: pre-line;
}

.ua-notes.muted {
  color: var(--ua-muted);
}

.ua-page-body .ua-note {
  margin: 0 4px;
}

/* The page's own Update: a full-width filled button at the end. */
.ua-page-update {
  display: flex;
  min-height: 50px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 14px;
  background: var(--color-brand-primary);
  color: var(--color-text-on-brand, #fff);
  font: inherit;
  font-size: 17px;
  text-decoration: none;
  cursor: pointer;
}

.ua-page-update:active {
  background: var(--color-brand-primary-hover);
}

/* ── Motion ── */
.ua-enter-active,
.ua-leave-active {
  transition: opacity 0.18s ease;
}

.ua-enter-active .ua-alert {
  transition: transform 0.24s cubic-bezier(0.2, 1.2, 0.4, 1), opacity 0.24s ease;
}

.ua-enter-from,
.ua-leave-to {
  opacity: 0;
}

.ua-enter-from .ua-alert {
  opacity: 0;
  transform: scale(1.06);
}

.ua-page-enter-active,
.ua-page-leave-active {
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.ua-page-enter-from,
.ua-page-leave-to {
  transform: translateX(100%);
}

@keyframes ua-slide {
  from { transform: translateX(-100%); }
  to { transform: translateX(300%); }
}

@media (prefers-reduced-motion: reduce) {
  .ua-enter-active .ua-alert,
  .ua-page-enter-active,
  .ua-page-leave-active,
  .ua-fill.indeterminate { transition: none; animation: none; }
}
</style>
