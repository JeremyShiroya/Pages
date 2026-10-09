import { watch } from 'vue'
import { useTTS } from '~/composables/useTTS'
import { recordBookActivity } from '~/composables/useBookAnalytics'

export default defineNuxtPlugin(() => {
  const { ttsBook, ttsStatus, ttsProgress } = useTTS()
  let lastTick = Date.now()
  const tick = () => {
    const now = Date.now()
    const elapsed = Math.max(0, Math.min(15, (now - lastTick) / 1000))
    lastTick = now
    if (!document.hidden && ttsStatus.value === 'playing' && ttsBook.value?.id) {
      recordBookActivity(ttsBook.value.id, {
        mode: 'listened', seconds: elapsed, completed: ttsProgress.value >= 100,
      })
    }
  }
  window.setInterval(tick, 10000)
  window.addEventListener('pagehide', tick)
  document.addEventListener('visibilitychange', () => { lastTick = Date.now() })
  watch([ttsBook, ttsStatus], () => { lastTick = Date.now() })
})
