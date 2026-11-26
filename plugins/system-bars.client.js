import {
  SYSTEM_BAR_CHANGE_EVENT,
  compositeOver,
  hasModalOverlay,
  isFullScreenLayer,
  isLeaveTransitionClass,
  isLeavingLayer,
  isModalLikeNode,
  parseCssColor,
} from '~/utils/systemBarOverlay'
import { paintSystemBarScrims } from '~/utils/systemBarScrims'

const TRANSPARENT = '#00000000'

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

const layered = (overlays, base) => overlays.reduceRight((result, layer) => compositeOver(layer, result), base)

const surfaceAt = (x, y) => {
  const dim = dimAmount()
  // Full-screen translucent backdrops (an open modal) above the surface. They
  // are composited onto it so the bar dims exactly like the page under it.
  const overlays = []

  for (const element of document.elementsFromPoint(x, y)) {
    if (!(element instanceof Element)) continue
    if (isLeavingLayer(element)) continue
    const style = getComputedStyle(element)
    const raw = parseCssColor(style.backgroundColor)
    const color = raw && dimmed(raw, element, dim)

    // A native solid scrim would flatten gradients and cover art. Keeping the
    // bar transparent lets the real page continue through the safe-area strip.
    if (hasImageBackground(style)) {
      return { color: TRANSPARENT, base: TRANSPARENT, sample: overlays.length ? layered(overlays, { red: 128, green: 128, blue: 128, alpha: 1 }) : null }
    }

    if (!color || color.alpha <= 0.02) continue

    if (color.alpha >= 0.98) {
      const solid = layered(overlays, color)
      // `base` is the page colour alone: a backdrop above the in-page strip
      // already dims it there, so the strip must not be dimmed twice.
      return { color: toAndroidColor(solid), base: toAndroidColor(color), sample: solid }
    }

    if (isFullScreenLayer(element)) {
      overlays.push(color)
      continue
    }

    // A translucent bar or card (frosted navigation): layering the same
    // surface in a native scrim would double it, so keep the WebView rendering
    // and use the colour only for icon contrast.
    return { color: TRANSPARENT, base: TRANSPARENT, sample: color }
  }

  const documentColors = [
    parseCssColor(getComputedStyle(document.body).backgroundColor),
    parseCssColor(getComputedStyle(document.documentElement).backgroundColor),
  ]
  const found = documentColors.find((color) => color?.alpha > 0.02) || null
  const rootColor = found && layered(overlays, dimmed(found, null, dim))
  const rootBase = found && dimmed(found, null, dim)
  return {
    color: rootColor ? toAndroidColor(rootColor) : TRANSPARENT,
    base: rootBase ? toAndroidColor(rootBase) : TRANSPARENT,
    sample: rootColor,
  }
}

const isDarkSurface = (sample, fallbackDark) => {
  if (!sample) return fallbackDark
  const { red, green, blue } = sample
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255
  return luminance < 0.56
}

const isSettingsPalettePage = () => (
  window.location.pathname.startsWith('/settings')
  || window.location.pathname.startsWith('/listen-settings')
  || window.location.pathname.startsWith('/editprofilepage')
)

export default defineNuxtPlugin((nuxtApp) => {
  let frame = null
  let lateSync = null
  let themeObserver = null
  let pageObserver = null
  let modalObserver = null

  const sync = () => {
    frame = null
    const bridge = globalThis.Capacitor
    if (!bridge?.isNativePlatform?.()) return
    // Settings and Edit Profile use their own palette rather than the normal app
    // canvas, and their dedicated plugin owns both bars, so the sampler cannot
    // race it with a colour from the header or responsive shell. The exception
    // is an open modal: its backdrop is sampled here on every page.
    if (isSettingsPalettePage() && !hasModalOverlay()) return

    const width = Math.max(1, window.innerWidth)
    const height = Math.max(1, window.innerHeight)
    const status = surfaceAt(width / 2, 1)
    const navigation = surfaceAt(width / 2, height - 1)
    const overlayOpen = hasModalOverlay()
    const pagePreference = overlayOpen ? null : document.querySelector('[data-system-bar-icons]')?.dataset.systemBarIcons
    const fallbackDark = document.documentElement.dataset.theme === 'dark'
    const forcedDark = pagePreference === 'light'
      ? true
      : pagePreference === 'dark' ? false : null
    const forceTransparent = !overlayOpen && document.querySelector('[data-system-bar-color="transparent"]') !== null

    // Colour: the in-page strips (see utils/systemBarScrims). The native
    // strips are kept transparent; Android is only asked for icon contrast.
    paintSystemBarScrims({
      status: forceTransparent ? TRANSPARENT : status.base,
      navigation: forceTransparent ? TRANSPARENT : navigation.base,
    })
    bridge.Plugins?.SystemBars?.setAppearance?.({
      dark: fallbackDark,
      statusBarDark: forcedDark ?? isDarkSurface(status.sample, fallbackDark),
      navigationBarDark: forcedDark ?? isDarkSurface(navigation.sample, fallbackDark),
      statusBarColor: TRANSPARENT,
      navigationBarColor: TRANSPARENT,
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

  // A modal opening or closing changes what sits under the bars. Re-sample
  // straight away, and once more after enter/leave transitions have settled.
  const onModalChange = () => {
    scheduleSync()
    clearTimeout(lateSync)
    lateSync = setTimeout(() => {
      window.dispatchEvent(new Event(SYSTEM_BAR_CHANGE_EVENT))
    }, 360)
  }
  const watchModals = () => {
    modalObserver = new MutationObserver((records) => {
      for (const record of records) {
        // A teleported sheet/modal starting to close. Sync right now rather
        // than on removal: whatever the action does next (a favourite re-rendering
        // the library) can hold the main thread for a second, while the page's
        // own fade runs on the compositor — the bars used to lag behind it.
        if (record.type === 'attributes') {
          const target = record.target
          if (target.parentNode === document.body && isModalLikeNode(target) && isLeaveTransitionClass(target.className)) {
            if (frame !== null) cancelAnimationFrame(frame)
            sync()
            return onModalChange()
          }
          continue
        }
        for (const node of record.addedNodes) if (isModalLikeNode(node)) return onModalChange()
        for (const node of record.removedNodes) if (isModalLikeNode(node)) return onModalChange()
      }
    })
    modalObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
  }

  nuxtApp.hook('app:mounted', () => {
    syncPage()
    watchModals()
  })
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
    clearTimeout(lateSync)
    themeObserver?.disconnect()
    pageObserver?.disconnect()
    modalObserver?.disconnect()
    window.removeEventListener('resize', scheduleSync)
    window.removeEventListener('orientationchange', scheduleSync)
    window.removeEventListener(SYSTEM_BAR_CHANGE_EVENT, syncPage)
  })
})
