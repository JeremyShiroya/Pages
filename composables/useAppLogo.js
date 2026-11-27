import { computed } from 'vue'
import { usePagesSettings } from '~/composables/usePagesSettings'

// The Pages logo in the app's accent colour (Settings → Theme → Accent
// Colour), for the logo inside the app: top bar, About, What's New. The App
// Icon choice only changes the home-screen launcher, never this.
export const useAppLogo = () => {
  const { settings } = usePagesSettings()
  return computed(() => `/images/logos/${settings.value.accentColor || 'purple'}.png`)
}
