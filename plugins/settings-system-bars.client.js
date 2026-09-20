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
  pathname.startsWith('/settings') || pathname.startsWith('/profile')
)

export default defineNuxtPlugin((nuxtApp) => {
  let frame = null
  let themeObserver = null

  const sync = () => {
    frame = null
    if (!usesSettingsPalette(window.location.pathname)) return
    const bridge = globalThis.Capacitor
    if (!bridge?.isNativePlatform?.()) return
    const background = settingsBackground()
    if (!background) return
    const luminance = (0.2126 * background.red + 0.7152 * background.green + 0.0722 * background.blue) / 255
    const dark = luminance < 0.56
    const color = androidColor(background)
    bridge.Plugins?.SystemBars?.setAppearance?.({
      dark,
      statusBarDark: dark,
      navigationBarDark: dark,
      statusBarColor: color,
      navigationBarColor: color,
    })?.catch?.(() => {})
  }

  const schedule = () => {
    if (frame !== null) cancelAnimationFrame(frame)
    frame = requestAnimationFrame(sync)
  }

  nuxtApp.hook('app:mounted', schedule)
  nuxtApp.hook('page:finish', schedule)
  themeObserver = new MutationObserver(schedule)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'data-app-background', 'data-dark-app-background'],
  })

  nuxtApp.hook('app:beforeUnmount', () => {
    if (frame !== null) cancelAnimationFrame(frame)
    themeObserver?.disconnect()
  })
})
