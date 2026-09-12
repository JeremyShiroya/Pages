import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useDeviceArchitecture } from '~/composables/useDeviceArchitecture'

// Phones always use the mobile UI. Tablets use it in portrait and switch to
// the wider desktop-style UI in landscape, including 1024px-wide iPads.
export const MOBILE_VIEW_MEDIA_QUERY = [
  '(max-width: 768px)',
  '(orientation: portrait) and (min-width: 769px) and (max-width: 1024px)',
].join(', ')

export const useResponsiveView = (query = MOBILE_VIEW_MEDIA_QUERY) => {
  if (query === MOBILE_VIEW_MEDIA_QUERY) {
    const { presentation } = useDeviceArchitecture()
    return {
      isMobileView: computed(() => presentation.value !== 'tablet-landscape'),
    }
  }

  const isMobileView = ref(false)
  let mediaQuery = null

  const syncViewport = () => {
    isMobileView.value = Boolean(mediaQuery?.matches)
  }

  onMounted(() => {
    mediaQuery = window.matchMedia(query)
    syncViewport()
    mediaQuery.addEventListener('change', syncViewport)
  })

  onBeforeUnmount(() => {
    mediaQuery?.removeEventListener('change', syncViewport)
    mediaQuery = null
  })

  return { isMobileView }
}
