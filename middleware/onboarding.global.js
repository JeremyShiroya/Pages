import { readPagesSettings } from '~/composables/usePagesSettings'

// First open → the setup flow. Settings are read straight from storage (not
// the reactive store) so the redirect is decided before any page mounts and
// the library never flashes underneath it.
export default defineNuxtRouteMiddleware((to) => {
  if (!import.meta.client) return
  const settings = readPagesSettings()
  if (to.path === '/welcome') {
    // ?flow=account is the "set up backup" flow opened from Profile/Backup.
    if (settings.onboardingComplete && !to.query.preview && to.query.flow !== 'account') {
      return navigateTo('/', { replace: true })
    }
    return
  }
  if (!settings.onboardingComplete) {
    return navigateTo({ path: '/welcome', query: to.fullPath !== '/' ? { next: to.fullPath } : {} }, { replace: true })
  }
})
