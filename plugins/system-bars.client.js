const SYSTEM_BAR_CHANGE_EVENT = 'bookish:system-bars-change'

const parseCssColor = (value) => {
  const parts = String(value || '').match(/[\d.]+/g)?.map(Number) || []
  if (parts.length < 3) return null
  return {
    red: Math.max(0, Math.min(255, parts[0])),
    green: Math.max(0, Math.min(255, parts[1])),
    blue: Math.max(0, Math.min(255, parts[2])),
    alpha: parts.length > 3 ? Math.max(0, Math.min(1, parts[3])) : 1,
  }
}

const toAndroidColor = ({ red, green, blue }) => (
  `#${[red, green, blue]
    .map((part) => Math.round(part).toString(16).padStart(2, '0'))
    .join('')}`
)

const hasImageBackground = (style) => (
  style.backgroundImage && style.backgroundImage !== 'none'
)

// The reader's brightness control is a black layer over the page. It ignores
// touches, so elementsFromPoint never returns it and a solid native scrim would
// paint an undimmed strip above it. Pages that dim declare the layer's opacity
// in data-system-bar-dim; surfaces that sit above the dimmer (the display
// sheet) opt out with data-system-bar-undimmed.
const dimAmount = () => {
  const value = Number(document.querySelector('[data-system-bar-dim]')?.dataset.systemBarDim)
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0
}

const dimmed = (color, element, amount) => {
  if (!amount || element?.closest?.('[data-system-bar-undimmed]')) return color
  const keep = 1 - amount
  return { ...color, red: color.red * keep, green: color.green * keep, blue: color.blue * keep }
}

const surfaceAt = (x, y) => {
  let fallbackColor = null
  const dim = dimAmount()

  for (const element of document.elementsFromPoint(x, y)) {
    if (!(element instanceof Element)) continue
    const style = getComputedStyle(element)
    const raw = parseCssColor(style.backgroundColor)
    const color = raw && dimmed(raw, element, dim)

    // A native solid scrim would flatten gradients and cover art. Keeping the
    // bar transparent lets the real page continue through the safe-area strip.
    if (hasImageBackground(style)) {
      return { color: '#00000000', sample: fallbackColor }
    }

    if (!color || color.alpha <= 0.02) continue
    fallbackColor = color
    if (color.alpha >= 0.98) return { color: toAndroidColor(color), sample: color }

    // Layering the same translucent surface in a native scrim doubles it, so
    // preserve the WebView rendering and use the colour only for contrast.
    return { color: '#00000000', sample: color }
  }

  const documentColors = [
    parseCssColor(getComputedStyle(document.body).backgroundColor),
    parseCssColor(getComputedStyle(document.documentElement).backgroundColor),
  ]
  const found = documentColors.find((color) => color?.alpha > 0.02) || null
  const rootColor = found && dimmed(found, null, dim)
  return {
    color: rootColor ? toAndroidColor(rootColor) : '#00000000',
    sample: rootColor,
  }
}

const isDarkSurface = (sample, fallbackDark) => {
  if (!sample) return fallbackDark
  const { red, green, blue } = sample
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255
  return luminance < 0.56
}

export default defineNuxtPlugin((nuxtApp) => {
  let frame = null
  let themeObserver = null
  let pageObserver = null

  const sync = () => {
    frame = null
    const bridge = globalThis.Capacitor
    if (!bridge?.isNativePlatform?.()) return
    // Settings and Edit Profile use their own palette rather than the normal app canvas. Their
    // dedicated plugin owns both system bars so the generic surface sampler
    // cannot race it with a colour from the header or responsive shell.
    if (
      window.location.pathname.startsWith('/settings')
      || window.location.pathname.startsWith('/listen-settings')
      || window.location.pathname.startsWith('/editprofilepage')
    ) return

    const width = Math.max(1, window.innerWidth)
    const height = Math.max(1, window.innerHeight)
    const status = surfaceAt(width / 2, 1)
    const navigation = surfaceAt(width / 2, height - 1)
    const pagePreference = document.querySelector('[data-system-bar-icons]')?.dataset.systemBarIcons
    const fallbackDark = document.documentElement.dataset.theme === 'dark'
    const forcedDark = pagePreference === 'light'
      ? true
      : pagePreference === 'dark' ? false : null
    const forceTransparent = document.querySelector('[data-system-bar-color="transparent"]') !== null

    bridge.Plugins?.SystemBars?.setAppearance?.({
      dark: fallbackDark,
      statusBarDark: forcedDark ?? isDarkSurface(status.sample, fallbackDark),
      navigationBarDark: forcedDark ?? isDarkSurface(navigation.sample, fallbackDark),
      statusBarColor: forceTransparent ? '#00000000' : status.color,
      navigationBarColor: forceTransparent ? '#00000000' : navigation.color,
    })?.catch?.(() => {})
  }

  const scheduleSync = () => {
    if (frame !== null) cancelAnimationFrame(frame)
    frame = requestAnimationFrame(sync)
  }

  const observePagePreference = () => {
    pageObserver?.disconnect()
    const target = document.querySelector('[data-system-bar-icons], [data-system-bar-color], [data-system-bar-dim]')
    if (!target) return
    pageObserver = new MutationObserver(scheduleSync)
    pageObserver.observe(target, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-system-bar-icons', 'data-system-bar-color', 'data-system-bar-dim'],
    })
  }

  const syncPage = () => {
    observePagePreference()
    scheduleSync()
  }

  nuxtApp.hook('app:mounted', syncPage)
  nuxtApp.hook('page:finish', syncPage)

  themeObserver = new MutationObserver(scheduleSync)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'data-app-background', 'data-dark-app-background'],
  })
  window.addEventListener('resize', scheduleSync)
  window.addEventListener('orientationchange', scheduleSync)
  window.addEventListener(SYSTEM_BAR_CHANGE_EVENT, syncPage)

  nuxtApp.hook('app:beforeUnmount', () => {
    if (frame !== null) cancelAnimationFrame(frame)
    themeObserver?.disconnect()
    pageObserver?.disconnect()
    window.removeEventListener('resize', scheduleSync)
    window.removeEventListener('orientationchange', scheduleSync)
    window.removeEventListener(SYSTEM_BAR_CHANGE_EVENT, syncPage)
  })
})
