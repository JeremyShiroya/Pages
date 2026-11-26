// Shared by the two system-bar plugins. A modal's backdrop is a translucent
// layer covering the whole screen; under it the status and navigation bars
// should dim exactly as the page does, instead of keeping the page's colour.

export const SYSTEM_BAR_CHANGE_EVENT = 'bookish:system-bars-change'

export const parseCssColor = (value) => {
  const parts = String(value || '').match(/[\d.]+/g)?.map(Number) || []
  if (parts.length < 3) return null
  return {
    red: Math.max(0, Math.min(255, parts[0])),
    green: Math.max(0, Math.min(255, parts[1])),
    blue: Math.max(0, Math.min(255, parts[2])),
    alpha: parts.length > 3 ? Math.max(0, Math.min(1, parts[3])) : 1,
  }
}

// Covers (almost) the whole viewport: a backdrop, not a frosted bar or card.
export const isFullScreenLayer = (element) => {
  const rect = element.getBoundingClientRect()
  return rect.width >= window.innerWidth * 0.98 && rect.height >= window.innerHeight * 0.98
}

// Paint `top` (with its alpha) over an opaque `base`.
export const compositeOver = (top, base) => {
  const a = top.alpha
  return {
    red: top.red * a + base.red * (1 - a),
    green: top.green * a + base.green * (1 - a),
    blue: top.blue * a + base.blue * (1 - a),
    alpha: 1,
  }
}

// True while a translucent full-screen backdrop sits over the given point.
export const modalOverlayAt = (x, y) => {
  for (const element of document.elementsFromPoint(x, y)) {
    if (!(element instanceof Element)) continue
    const color = parseCssColor(getComputedStyle(element).backgroundColor)
    if (!color || color.alpha <= 0.02) continue
    return color.alpha < 0.98 && isFullScreenLayer(element)
  }
  return false
}

export const hasModalOverlay = () => {
  if (typeof document === 'undefined') return false
  const x = Math.max(1, window.innerWidth) / 2
  return modalOverlayAt(x, 1) || modalOverlayAt(x, Math.max(1, window.innerHeight) - 1)
}

// Elements whose appearing or disappearing usually means a modal opened or
// closed. Checked by class name only, so watching the whole page stays cheap.
const MODAL_CLASS = /overlay|backdrop|layer|modal|sheet|dialog/i
export const isModalLikeNode = (node) => {
  if (!node || node.nodeType !== 1) return false
  const name = typeof node.className === 'string' ? node.className : ''
  if (MODAL_CLASS.test(name)) return true
  const first = node.firstElementChild
  return Boolean(first && typeof first.className === 'string' && MODAL_CLASS.test(first.className))
}
