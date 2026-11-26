// Keeps the home-screen icon in step with Settings → Theme → App Icon.
//
// Android swaps the icon by enabling one Launcher* activity-alias and
// disabling the rest (AppIconPlugin.java). Disabling the alias the app was
// opened from makes some launchers (One UI among them) close the app, so the
// swap never happens while Pages is on screen: it waits until the user leaves
// the app (the Capacitor `pause` event), and not while a book is being read
// aloud in the background — closing the app then would stop the narration.
// The next pause after narration stops picks it up.
import { registerPlugin } from '@capacitor/core'
import { effectiveLauncherIcon, usePagesSettings } from '~/composables/usePagesSettings'
import { isNativeCapacitorPlatform } from '~/composables/useNativePlatform'

const AppIcon = registerPlugin('AppIcon')

export default defineNuxtPlugin((nuxtApp) => {
  if (!isNativeCapacitorPlatform()) return
  const { settings } = usePagesSettings()
  const status = useState('tts:status', () => 'idle')
  // What the launcher shows right now (read from Android once at start).
  const applied = useState('app-icon:applied', () => null)

  const readCurrent = async () => {
    try {
      const result = await AppIcon.getIcon()
      applied.value = result?.name || 'purple'
    } catch {
      applied.value = null // plugin missing (older APK): nothing to switch
    }
  }

  const applyIfPending = async () => {
    const wanted = effectiveLauncherIcon(settings.value)
    if (!applied.value || applied.value === wanted) return
    if (status.value === 'playing') return
    try {
      await AppIcon.setIcon({ name: wanted })
      applied.value = wanted
    } catch (error) {
      console.warn('[AppIcon] switch failed:', error?.message || error)
    }
  }

  nuxtApp.hook('app:mounted', async () => {
    await readCurrent()
    try {
      const { App } = await import('@capacitor/app')
      await App.addListener('pause', () => { void applyIfPending() })
    } catch (error) {
      console.warn('[AppIcon] pause listener unavailable:', error?.message || error)
    }
  })
})
