// Startup error containment.
//
// Until the first page has finished loading, Nuxt routes EVERY Vue error to
// its full-screen error page — including a failed background task in some
// component's onMounted hook, a watcher, or an event handler. One transient
// startup hiccup (a slow IndexedDB open, a native plugin that is not ready, a
// cover that fails to decode) therefore replaced the whole app with a
// developer-style "500 / An error has occurred" page that looks like a broken
// website, with no way back in. After startup the very same errors are
// harmless console noise. This plugin makes startup behave like the rest of
// the app's life: only an error that stops a page from RENDERING is fatal (and
// that now lands on the app's own recovery screen, error.vue); everything else
// is logged and the app carries on.
//
// The "00." prefix runs this before every other plugin.

// Vue reports where an error came from. In production builds `info` is a link
// ending in the error-type code: 0 = setup function, 1 = render function. Every
// other code is a lifecycle hook, watcher, event handler, directive, etc.
export function isRenderError(info) {
  const text = String(info ?? '')
  if (/setup function|render function/i.test(text)) return true
  const code = text.match(/#runtime-([\w-]+)$/)?.[1]
  return code === '0' || code === '1'
}

// A module/chunk that cannot be fetched. On a phone the assets are local, so
// this only happens when the WebView kept an old index after an update — a
// single reload picks up the files that are actually installed.
export function isChunkLoadError(error) {
  const text = `${error?.name || ''} ${error?.message || ''}`
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Loading chunk [\w-]+ failed/i.test(text)
}

const RELOAD_KEY = 'bookish:chunk-reload-at'

function reloadOnceForChunks() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY)) || 0
    // Never loop: one recovery reload per 30 seconds at most.
    if (Date.now() - last < 30_000) return false
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {}
  window.location.reload()
  return true
}

export default defineNuxtPlugin({
  name: 'bookish-app-errors',
  enforce: 'pre',
  setup(nuxtApp) {
    const vueApp = nuxtApp.vueApp
    const nuxtHandler = vueApp.config.errorHandler
    let started = false
    nuxtApp.hook('app:suspense:resolve', () => { started = true })

    vueApp.config.errorHandler = (error, instance, info) => {
      if (isChunkLoadError(error) && reloadOnceForChunks()) return
      if (!started && isRenderError(info) && typeof nuxtHandler === 'function') {
        return nuxtHandler(error, instance, info)
      }
      console.error('[Pages] Recovered from an error:', info, error)
    }

    nuxtApp.hook('app:chunkError', ({ error }) => {
      console.warn('[Pages] Code chunk failed to load; reloading.', error)
      reloadOnceForChunks()
    })

    window.addEventListener('unhandledrejection', (event) => {
      if (isChunkLoadError(event.reason)) {
        if (reloadOnceForChunks()) event.preventDefault()
        return
      }
      console.warn('[Pages] Unhandled background failure:', event.reason)
    })
  },
})
