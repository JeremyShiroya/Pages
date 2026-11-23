<template>
  <!-- The app's own recovery screen. Without this file Nuxt shows its
       developer error page ("500 / An error has occurred"), which looks like a
       broken website rather than an app and offers no way back in. -->
  <main class="app-recovery" role="alert">
    <img class="app-recovery-logo" src="/images/Pages-Logo.png" alt="" />
    <h1>{{ notFound ? 'This page isn’t available' : 'Pages needs a moment' }}</h1>
    <p>
      {{ notFound
        ? 'It may have moved in an update. Your library is safe.'
        : 'Something went wrong while opening this screen. Your books, progress and notes are stored on this device and are safe.' }}
    </p>
    <div class="app-recovery-actions">
      <button type="button" class="primary" @click="tryAgain">Try again</button>
      <button type="button" @click="goHome">Go to library</button>
    </div>
    <details v-if="detail" class="app-recovery-detail">
      <summary>Details for support</summary>
      <pre>{{ detail }}</pre>
    </details>
  </main>
</template>

<script setup>
import { computed, onMounted } from 'vue'

const props = defineProps({ error: { type: Object, default: null } })

const notFound = computed(() => Number(props.error?.statusCode ?? props.error?.status) === 404)
const detail = computed(() => {
  const message = props.error?.message || props.error?.statusMessage || ''
  return message && message !== 'undefined' ? String(message).slice(0, 600) : ''
})

const goHome = () => clearError({ redirect: '/' })
// A full reload re-runs startup from scratch — what fixes a transient failure.
const tryAgain = () => {
  if (notFound.value) return goHome()
  window.location.reload()
}

onMounted(() => {
  console.error('[Pages] Showing recovery screen for:', props.error)
  // An unknown route is never worth a dead end: go straight to the library.
  if (notFound.value) goHome()
})
</script>

<style scoped>
.app-recovery {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: calc(env(safe-area-inset-top) + 24px) 24px calc(env(safe-area-inset-bottom) + 24px);
  background: var(--color-background-page, #f7f5fb);
  color: var(--color-text-primary, #1f1b2d);
  text-align: center;
  font-family: inherit;
}
.app-recovery-logo { width: 72px; height: 72px; border-radius: 18px; object-fit: contain; }
h1 { margin: 8px 0 0; font-size: 21px; font-weight: 700; }
p { margin: 0; max-width: 320px; color: var(--color-text-secondary, #6b6680); font-size: 15px; line-height: 1.5; }
.app-recovery-actions { display: flex; flex-direction: column; gap: 10px; width: min(100%, 300px); margin-top: 12px; }
button {
  min-height: 46px;
  border: 0;
  border-radius: 999px;
  background: var(--color-surface-card, #fff);
  color: var(--color-text-primary, #1f1b2d);
  font: inherit;
  font-size: 15px;
  font-weight: 600;
}
button.primary { background: var(--color-brand-primary, #7c3aed); color: #fff; }
.app-recovery-detail { margin-top: 18px; max-width: 320px; color: var(--color-text-secondary, #6b6680); font-size: 12px; }
.app-recovery-detail pre { white-space: pre-wrap; word-break: break-word; text-align: left; }
</style>
