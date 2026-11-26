import { SYSTEM_BAR_CHANGE_EVENT, hasModalOverlay } from '~/utils/systemBarOverlay'
import { paintSystemBarScrims } from '~/utils/systemBarScrims'

const parseColor = (value) => {
  const raw = String(value || '').trim()
  const hex = raw.match(/^#([\da-f]{6})$/i)?.[1]
  if (hex) {
    return {
      red: Number.parseInt(hex.slice(0, 2), 16),
      green: Number.parseInt(hex.slice(2, 4), 16),
      blue: Number.parseInt(hex.slice(4, 6), 16),
    }
  }
  const parts = raw.match(/[\d.]+/g)?.map(Number) || []
  return parts.length >= 3 ? { red: parts[0], green: parts[1], blue: parts[2] } : null
}

const settingsBackground = () => {
  const declared = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-settings-background')
    .trim()
  const probe = document.createElement('span')
  probe.style.cssText = `position:fixed;pointer-events:none;color:${declared}`
  document.body.appendChild(probe)
  const rgb = parseColor(getComputedStyle(probe).color) || parseColor(declared)
  probe.remove()
  return rgb
}

const androidColor = ({ red, green, blue }) => (
  `#${[red, green, blue].map((part) => Math.round(part).toString(16).padStart(2, '0')).join('')}`
)

const usesSettingsPalette = (pathname) => (
  pathname.startsWith('/settings')
  || pathname.startsWith('/listen-settings')
  || pathname.startsWith('/editprofilepage')
)

export default defineNuxtPlugin((nuxtApp) => {
  let frame = null
  let themeObserver = null

  const sync = () => {
    frame = null
    if (!usesSettingsPalette(window.location.pathname)) return
    // While a modal is open its backdrop decides the bar colours; the general
    // system-bars plugin samples it. This one takes over again once it closes.
    if (hasModalOverlay()) return
    const bridge = globalThis.Capacitor
    if (!bridge?.isNativePlatform?.()) return
    const background = settingsBackground()
    if (!background) return
    const luminance = (0.2126 * background.red + 0.7152 * background.green + 0.0722 * background.blue) / 255
    const dark = luminance < 0.56
    const color = androidColor(background)
    // The colour goes on the in-page strips (utils/systemBarScrims), which
    // backdrops cover in step; the native strips stay transparent.
    paintSystemBarScrims({ status: color, navigation: color })
    bridge.Plugins?.SystemBars?.setAppearance?.({
      dark,
      statusBarDark: dark,
      navigationBarDark: dark,
      statusBarColor: '#00000000',
      navigationBarColor: '#00000000',
    })?.catch?.(() => {})
  }

  const schedule = () => {
    if (frame !== null) cancelAnimationFrame(frame)
    frame = requestAnimationFrame(sync)
  }

  nuxtApp.hook('app:mounted', schedule)
  nuxtApp.hook('page:finish', schedule)
  window.addEventListener(SYSTEM_BAR_CHANGE_EVENT, schedule)
  themeObserver = new MutationObserver(schedule)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'data-app-background', 'data-dark-app-background'],
  })

  nuxtApp.hook('app:beforeUnmount', () => {
    if (frame !== null) cancelAnimationFrame(frame)
    themeObserver?.disconnect()
    window.removeEventListener(SYSTEM_BAR_CHANGE_EVENT, schedule)
  })
})
