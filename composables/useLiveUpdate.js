// Silent web (OTA) updates for the native app.
//
// Pages is a Capacitor shell around a web build. Most releases change only that
// web build, so instead of asking the user to download and sideload a ~56MB APK,
// a release can ship a signed zip of the web layer (scripts/build-web-bundle.mjs)
// and every compatible phone switches to it quietly:
//
//   1. useAppUpdate fetches version.json and asks chooseUpdatePath() what to do.
//   2. 'web' → stageWebUpdate() downloads the zip in the background. The plugin
//      checks its RSA signature against the public key in capacitor.config.ts
//      before unpacking anything, then it is set as the NEXT bundle.
//   3. The next cold start runs it. Nothing changes under a user mid-chapter.
//   4. plugins/live-update.client.js confirms a healthy startup (ready()). A
//      bundle that never gets there is rolled back to the APK's own build after
//      readyTimeout and blocked, so a broken release cannot brick the app.
//
// Installing a newer APK always resets to that APK's built-in web build
// (Capacitor's own new-binary check), so the two update paths never fight.
//
// Every failure here is silent and leaves the app exactly as it was: the worst
// case of a failed web update is simply not being updated yet.

import { isNativeCapacitorPlatform } from '~/composables/useNativePlatform'
import { webBundleId } from '~/composables/appUpdateManifest'

// Capacitor plugin objects are Proxies that answer EVERY property — including
// `then` — with a native-method wrapper, so they look like thenables. Resolving
// a promise with one therefore never settles. The plugin is always passed
// around inside a plain holder object for that reason; never return it bare
// from an async function or a .then().
let pluginPromise = null
const loadPlugin = () => {
  if (!isNativeCapacitorPlatform()) return Promise.resolve({ plugin: null })
  if (!pluginPromise) {
    pluginPromise = import('@capawesome/capacitor-live-update')
      .then((mod) => ({ plugin: mod?.LiveUpdate || null }))
      .catch(() => ({ plugin: null }))
  }
  return pluginPromise
}

// --- our own record of staged and failed bundles -----------------------------
//
// The plugin blocks a rolled-back bundle only if ready() is called in the SAME
// process that rolled back. A user who sees a broken launch and swipes the app
// away loses that, and the next check would download and stage the same broken
// build again — a broken launch every other time. So we remember which bundle
// we staged; if a later startup is not running it, it failed (or a newer APK
// replaced it) and is never staged again.

export const LIVE_UPDATE_STATE_KEY = 'bookish:live-update'
const MAX_FAILED = 20

export const readLiveUpdateState = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(LIVE_UPDATE_STATE_KEY) || '{}')
    return {
      pending: typeof raw.pending === 'string' ? raw.pending : null,
      failed: Array.isArray(raw.failed) ? raw.failed.filter((id) => typeof id === 'string') : [],
    }
  } catch {
    return { pending: null, failed: [] }
  }
}

const writeLiveUpdateState = (state) => {
  try {
    localStorage.setItem(LIVE_UPDATE_STATE_KEY, JSON.stringify({
      pending: state.pending || null,
      failed: [...new Set(state.failed)].slice(-MAX_FAILED),
    }))
  } catch {
    // Storage unavailable — the plugin's own block list still applies.
  }
}

// Pure: what a startup's ready() result means for our record.
export function settleLiveUpdateState(state, { currentBundleId = null, previousBundleId = null, rollback = false } = {}) {
  const failed = [...state.failed]
  if (rollback && previousBundleId) failed.push(previousBundleId)
  if (state.pending && state.pending !== currentBundleId) failed.push(state.pending)
  return { pending: null, failed }
}

let readyPromise = null

// Tells the plugin this bundle started cleanly, which cancels the rollback
// timer. Safe to call more than once; the first answer is reused.
export function confirmHealthyStartup() {
  if (!readyPromise) {
    readyPromise = loadPlugin()
      .then(({ plugin }) => (plugin ? plugin.ready() : null))
      .then((result) => {
        if (!result) return result
        if (result.rollback) {
          console.warn('[live-update] bundle', result.previousBundleId, 'failed to start; rolled back to', result.currentBundleId || 'the built-in build')
        }
        writeLiveUpdateState(settleLiveUpdateState(readLiveUpdateState(), result))
        return result
      })
      .catch(() => null)
  }
  return readyPromise
}

let staging = null

// Downloads and stages `web` (a normalized manifest.web) for the next launch.
// Resolves to the staged bundle id, or null when nothing was (or could be) done.
export function stageWebUpdate(web) {
  if (!web) return Promise.resolve(null)
  if (staging) return staging
  staging = (async () => {
    const { plugin } = await loadPlugin()
    if (!plugin) return null
    // ready() must precede any bundle change, or the plugin may treat the
    // switch as part of an unconfirmed startup.
    await confirmHealthyStartup()

    const bundleId = webBundleId(web.versionCode)

    const [{ bundleId: current } = {}, { bundleId: next } = {}] = await Promise.all([
      plugin.getCurrentBundle().catch(() => ({})),
      plugin.getNextBundle().catch(() => ({})),
    ])
    if (current === bundleId || next === bundleId) return bundleId

    // A build that already failed to start on this phone is never retried;
    // the next release will be offered instead.
    const { bundleIds: blocked = [] } = await plugin.getBlockedBundles().catch(() => ({}))
    if (blocked.includes(bundleId) || readLiveUpdateState().failed.includes(bundleId)) return null

    const { bundleIds: downloaded = [] } = await plugin.getDownloadedBundles().catch(() => ({}))
    if (!downloaded.includes(bundleId)) {
      // The plugin verifies the signature (and refuses an unsigned bundle,
      // because a publicKey is configured) before the bundle is kept.
      await plugin.downloadBundle({ bundleId, url: web.url, signature: web.signature })
    }
    await plugin.setNextBundle({ bundleId })
    writeLiveUpdateState({ ...readLiveUpdateState(), pending: bundleId })
    return bundleId
  })()
    .catch((error) => {
      console.warn('[live-update] web update not staged:', error?.message || error)
      return null
    })
    .finally(() => { staging = null })
  return staging
}
