import { syncDeviceLibrary } from '~/composables/useDeviceLibrarySync'
import { hydrateSeriesSuggestions } from '~/composables/useSeriesSuggestions'
import { isNativeCapacitorPlatform } from '~/composables/useNativePlatform'

// Repeating background scans keep the library current without reopening the
// app — new files land in the library, and series gaps resolve on their own.
export const DEVICE_RESCAN_INTERVAL_MS = 3 * 60 * 1000

// Kicks off the ReadERA-style device scan on every native app open, shortly
// after startup so the first paint isn't competing with storage work. The
// Scans are intentionally quiet. Automatic work should not cover the reading
// UI with progress/success toasts; permission prompts still appear when needed.
export default defineNuxtPlugin((nuxtApp) => {
  if (!isNativeCapacitorPlatform()) return

  nuxtApp.hook('app:mounted', () => {
    // Suggestions already on the device go into the shared store immediately,
    // so a series page paints its missing books on first render instead of
    // waiting on its own lookup.
    nuxtApp.runWithContext(() => hydrateSeriesSuggestions())

    // setTimeout drops the Nuxt context, and the sync uses useState-backed
    // composables — restore the context or every composable call throws.
    let hasRanInitialScan = false

    setTimeout(() => {
      nuxtApp.runWithContext(() => syncDeviceLibrary({ announce: false })).then(() => {
        hasRanInitialScan = true
      })
    }, 1500)

    // Listen for app coming back into foreground (e.g. after user grants permission in System Settings)
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          setTimeout(() => {
            nuxtApp.runWithContext(() => syncDeviceLibrary({
              silent: hasRanInitialScan,
              announce: false,
            })).then(() => {
              hasRanInitialScan = true
            })
          }, 350)
        }
      })
    }).catch((err) => {
      console.warn('[DeviceSync] Could not attach appStateChange listener:', err)
    })

    setInterval(() => {
      // Skip while backgrounded — Android throttles the WebView's timers there
      // anyway, and a hidden app doesn't need a fresh scan.
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      nuxtApp.runWithContext(() => syncDeviceLibrary({ silent: true }))
    }, DEVICE_RESCAN_INTERVAL_MS)
  })
})
