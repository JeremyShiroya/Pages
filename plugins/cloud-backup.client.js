import { initAccount, isAccountConfigured } from '~/composables/useAccount'
import { useCloudBackup } from '~/composables/useCloudBackup'

// Automatic cloud backups. They run only while Pages is open and visible:
// a backgrounded WebView is throttled by Android and may be killed mid-upload,
// and a backup is cheap enough to simply wait for the next open.
const CHECK_INTERVAL_MS = 30 * 60 * 1000
const FIRST_CHECK_DELAY_MS = 20 * 1000

export default defineNuxtPlugin((nuxtApp) => {
  if (!isAccountConfigured()) return
  initAccount()

  nuxtApp.hook('app:mounted', () => {
    const check = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      nuxtApp.runWithContext(() => useCloudBackup().maybeAutoBackup())
    }

    // Startup belongs to the library scan and the reader; back up after.
    setTimeout(check, FIRST_CHECK_DELAY_MS)
    setInterval(check, CHECK_INTERVAL_MS)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') setTimeout(check, 5000)
    })
  })
})
