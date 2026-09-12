import { computed, onBeforeUnmount, onMounted, readonly, ref } from 'vue'
import { MOBILE_DEVICE_ARCHITECTURE } from '~/architectures/mobile/deviceArchitecture'
import { TABLET_DEVICE_ARCHITECTURE } from '~/architectures/tablet/deviceArchitecture'

export const TABLET_MIN_SHORT_EDGE = 600
export const INSTALLED_DEVICE_CLASS_KEY = 'bookish:installed-device-class:v1'

const deviceClass = ref('mobile')
const orientation = ref('portrait')
const ready = ref(false)
let consumers = 0
let listening = false

const isNativeApp = () => {
  if (!import.meta.client) return false
  const capacitor = window.Capacitor
  return Boolean(capacitor?.isNativePlatform?.() ?? capacitor?.isNative)
}

const viewportSize = () => ({
  width: Math.max(0, Number(window.innerWidth) || Number(window.screen?.width) || 0),
  height: Math.max(0, Number(window.innerHeight) || Number(window.screen?.height) || 0),
})

const physicalScreenSize = () => ({
  width: Math.max(0, Number(window.screen?.width) || Number(window.innerWidth) || 0),
  height: Math.max(0, Number(window.screen?.height) || Number(window.innerHeight) || 0),
})

export const classifyDevice = ({ width, height }) => (
  Math.min(width, height) >= TABLET_MIN_SHORT_EDGE ? 'tablet' : 'mobile'
)

const syncDevice = () => {
  if (!import.meta.client) return

  const viewport = viewportSize()
  orientation.value = viewport.width > viewport.height ? 'landscape' : 'portrait'

  if (isNativeApp()) {
    const saved = window.localStorage?.getItem(INSTALLED_DEVICE_CLASS_KEY)
    if (saved === 'mobile' || saved === 'tablet') {
      deviceClass.value = saved
    } else {
      deviceClass.value = classifyDevice(physicalScreenSize())
      window.localStorage?.setItem(INSTALLED_DEVICE_CLASS_KEY, deviceClass.value)
    }
  } else {
    // Browser previews stay responsive. Native installs deliberately do not
    // reclassify on rotation, which keeps phone and tablet state isolated.
    deviceClass.value = classifyDevice(viewport)
  }

  ready.value = true
}

const startListening = () => {
  if (!import.meta.client || listening) return
  listening = true
  syncDevice()
  window.addEventListener('resize', syncDevice, { passive: true })
  window.addEventListener('orientationchange', syncDevice, { passive: true })
}

const stopListening = () => {
  if (!import.meta.client || !listening || consumers > 0) return
  window.removeEventListener('resize', syncDevice)
  window.removeEventListener('orientationchange', syncDevice)
  listening = false
}

export const useDeviceArchitecture = () => {
  onMounted(() => {
    consumers += 1
    startListening()
    syncDevice()
  })

  onBeforeUnmount(() => {
    consumers = Math.max(0, consumers - 1)
    stopListening()
  })

  const isPhone = computed(() => deviceClass.value === 'mobile')
  const isTablet = computed(() => deviceClass.value === 'tablet')
  const isPortrait = computed(() => orientation.value === 'portrait')
  const architecture = computed(() => (
    isTablet.value ? TABLET_DEVICE_ARCHITECTURE : MOBILE_DEVICE_ARCHITECTURE
  ))
  const presentation = computed(() => (
    architecture.value.presentationForOrientation(orientation.value)
  ))

  return {
    architecture,
    deviceClass: readonly(deviceClass),
    isPhone,
    isPortrait,
    isTablet,
    orientation: readonly(orientation),
    presentation,
    ready: readonly(ready),
  }
}
