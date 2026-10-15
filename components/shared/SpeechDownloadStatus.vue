<template>
  <aside v-if="status && status.phase !== 'ready'" class="speech-status" role="status" aria-live="polite">
    <strong>{{ name }}</strong>
    <span v-if="status.phase === 'downloading'">Downloading voice · {{ status.percent }}%<small>One-time download. Works offline afterward.</small></span>
    <span v-else-if="status.phase === 'installing'">Installing voice…</span>
    <span v-else-if="status.phase === 'loading'">Preparing voice…</span>
    <span v-else>Voice preparation failed. Check storage and connection, then select the voice again.</span>
    <button v-if="status.phase === 'error'" @click="dismiss" aria-label="Dismiss">×</button>
  </aside>
</template>
<script setup>
import { computed } from 'vue'
import { localSpeechStatus as status, LOCAL_TTS_VOICES } from '~/composables/tts/localTtsDriver'
const name = computed(() => LOCAL_TTS_VOICES.find(v => v.id === status.value?.voice)?.name || 'Narrator')
const dismiss = () => { status.value = null }
</script>
<style scoped>
.speech-status { position: fixed; z-index: 10000; top: calc(env(safe-area-inset-top) + 12px); left: 16px; right: 16px; margin: auto; max-width: 420px; padding: 12px 16px; border-radius: 12px; background: var(--color-surface-card, #fff); color: var(--color-text-primary, #222); box-shadow: 0 4px 24px #0003; display: flex; flex-direction: column; gap: 4px; font-size: 14px; }
small { display: block; opacity: .7; margin-top: 4px; }
button { position: absolute; right: 8px; top: 8px; }
</style>
