import { confirmHealthyStartup } from '~/composables/useLiveUpdate'
import { isNativeCapacitorPlatform } from '~/composables/useNativePlatform'

// Confirms to the live-update plugin that this web build started cleanly, which
// cancels its rollback timer (readyTimeout in capacitor.config.ts).
//
// "Cleanly" means the app actually resolved its first page WITHOUT landing on
// the error screen. A bundle that throws during startup shows error.vue, never
// confirms, and is rolled back to the APK's own build and blocked — so a bad
// web release costs one failed launch at most, never a bricked app.
//
// The built-in build confirms too: ready() is also what lets the plugin delete
// bundles that are no longer needed (autoDeleteBundles).
export default defineNuxtPlugin((nuxtApp) => {
  if (!isNativeCapacitorPlatform()) return

  let confirmed = false
  const confirm = () => {
    if (confirmed) return
    const error = nuxtApp.payload?.error
    if (error) return
    confirmed = true
    void confirmHealthyStartup()
  }

  nuxtApp.hook('app:suspense:resolve', () => {
    // One frame later, so a render error thrown by the first page is already
    // recorded in the payload before we vouch for this build.
    setTimeout(confirm, 0)
  })
})
