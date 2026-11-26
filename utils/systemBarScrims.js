// The colour behind the status and navigation bars, drawn INSIDE the page.
//
// The app runs edge to edge: the WebView reaches under both bars. Their colour
// used to be a native strip (SystemBarsPlugin.applyBarScrim) set from a sample
// of the page, which could only change after JavaScript had re-sampled and
// Android had repainted — so every sheet, alert and fade that changed the page
// instantly left the bars a beat (or a second, on a busy phone) behind.
//
// These two fixed strips sit above page content and its own bars (top nav,
// bottom nav, mini player, reader chrome all live below z-index 2000) and
// below every backdrop, sheet and alert (2000 and up). A backdrop fading in
// therefore covers the strip in the same frame as the page, on the compositor;
// only the plain page colour behind them is still set from a sample. They take
// no pointer events, so hit-testing (and the sampler) looks straight through.
const IDS = { top: 'pages-status-bar-scrim', bottom: 'pages-navigation-bar-scrim' }

export const SCRIM_Z_INDEX = 1999

const ensure = (edge) => {
  let el = document.getElementById(IDS[edge])
  if (el) return el
  el = document.createElement('div')
  el.id = IDS[edge]
  el.setAttribute('aria-hidden', 'true')
  el.style.cssText = [
    'position:fixed', 'left:0', 'right:0', `${edge}:0`,
    `height:env(safe-area-inset-${edge})`,
    `z-index:${SCRIM_Z_INDEX}`, 'pointer-events:none', 'background:transparent',
    'contain:strict',
  ].join(';')
  document.body.appendChild(el)
  return el
}

// `color`: any CSS colour; '#00000000' / null / 'transparent' clear the strip.
export function paintSystemBarScrims({ status, navigation }) {
  if (typeof document === 'undefined' || !document.body) return
  const css = (value) => (!value || value === '#00000000' ? 'transparent' : value)
  if (status !== undefined) ensure('top').style.backgroundColor = css(status)
  if (navigation !== undefined) ensure('bottom').style.backgroundColor = css(navigation)
}
