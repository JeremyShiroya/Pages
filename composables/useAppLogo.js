import { computed } from 'vue'
import { effectiveLauncherIcon, usePagesSettings } from '~/composables/usePagesSettings'

// The Pages logo in the colour of the chosen app icon (Settings → Theme →
// App Icon, which follows the accent by default), so the logo inside the app
// always matches the one on the home screen.
export const useAppLogo = () => {
  const { settings } = usePagesSettings()
  return computed(() => `/images/logos/${effectiveLauncherIcon(settings.value)}.png`)
}
