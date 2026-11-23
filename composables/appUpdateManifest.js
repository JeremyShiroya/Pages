// Pure update-manifest rules, shared by the app and the release script.
//
// Deliberately free of Nuxt/Capacitor imports so scripts/generate-version-
// manifest.mjs can validate with the EXACT logic the app validates with — a
// manifest that the generator accepts is one the app is guaranteed to accept.

// Android's ceiling for versionCode; anything beyond it can't be a real build.
export const MAX_VERSION_CODE = 2_100_000_000
const MAX_NOTES_LENGTH = 2000

// Only whole positive numbers pass — rejects '12abc', '', null, 1.5, Infinity.
export function toVersionCode(value) {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 && value <= MAX_VERSION_CODE ? value : null
  }
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const parsed = Number(trimmed)
  return parsed > 0 && parsed <= MAX_VERSION_CODE ? parsed : null
}

// The manifest names a url the app hands to the OS, so the scheme is restricted
// to https. Without this a tampered manifest could point at intent:// or
// javascript: and turn the update prompt into an attack surface.
export function isSafeApkUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false
  try {
    return new URL(value.trim()).protocol === 'https:'
  } catch {
    return false
  }
}

// Coerce a fetched manifest into a trusted shape, or null if it can't be
// trusted. Callers must treat null as "no update" rather than as an error.
export function normalizeUpdateManifest(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const versionCode = toVersionCode(raw.versionCode)
  if (!versionCode) return null
  if (!isSafeApkUrl(raw.apkUrl)) return null

  const versionName = typeof raw.versionName === 'string' && raw.versionName.trim()
    ? raw.versionName.trim()
    : String(versionCode)

  const notes = typeof raw.notes === 'string' ? raw.notes.trim().slice(0, MAX_NOTES_LENGTH) : ''

  return {
    versionCode,
    versionName,
    apkUrl: raw.apkUrl.trim(),
    notes,
    // Only an explicit `true` forces the update, so a malformed value can't
    // trap the user in an undismissable dialog.
    mandatory: raw.mandatory === true,
    // Optional silent web update (see normalizeWebBundle). Absent or invalid
    // means "APK only", which is exactly how manifests behaved before OTA.
    web: normalizeWebBundle(raw.web),
  }
}

// --- Silent web (OTA) updates -------------------------------------------------
//
// A release can carry a signed zip of the web layer next to its APK. Phones
// whose installed APK already contains every native change that web build
// needs swap to it silently on the next launch; everyone else gets the APK
// prompt exactly as before.

const SHA256_HEX = /^[0-9a-f]{64}$/
// Base64 of an RSA signature: 256 bytes for a 2048-bit key = 344 chars. Bounded
// loosely so a 4096-bit key also passes, but junk does not.
const BASE64 = /^[A-Za-z0-9+/]{100,1400}={0,2}$/

export function normalizeWebBundle(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const versionCode = toVersionCode(raw.versionCode)
  // minNativeCode: the lowest APK versionCode that contains all the native code
  // (Java/Kotlin, plugins, gradle) this web build calls into.
  const minNativeCode = toVersionCode(raw.minNativeCode)
  if (!versionCode || !minNativeCode || minNativeCode > versionCode) return null
  if (!isSafeApkUrl(raw.url)) return null
  const sha256 = typeof raw.sha256 === 'string' ? raw.sha256.trim().toLowerCase() : ''
  if (!SHA256_HEX.test(sha256)) return null
  const signature = typeof raw.signature === 'string' ? raw.signature.trim() : ''
  if (!BASE64.test(signature)) return null
  const size = Number.isFinite(raw.size) && raw.size > 0 ? Math.round(raw.size) : null
  return { versionCode, minNativeCode, url: raw.url.trim(), sha256, signature, size }
}

// The bundle id the plugin stores a web build under. Derived from the version
// so a re-check never downloads the same build twice.
export const webBundleId = (versionCode) => `web-${versionCode}`

// What to do about a manifest, given the installed APK (nativeCode) and the web
// build actually running (webCode — the bundle's own baked-in build number,
// which is higher than nativeCode once a web update has been applied):
//   'web'  download the web bundle silently; no prompt
//   'apk'  the release needs native code this APK lacks — offer the APK
//   'none' already up to date (or nothing we can safely compare)
export function chooseUpdatePath({ nativeCode, webCode, manifest }) {
  if (!manifest) return 'none'
  const native = toVersionCode(nativeCode)
  if (!native) return 'none'
  const running = Math.max(native, toVersionCode(webCode) || 0)
  if (manifest.versionCode <= running) return 'none'
  const web = manifest.web
  if (web && web.versionCode === manifest.versionCode && native >= web.minNativeCode) {
    return 'web'
  }
  return 'apk'
}

// Whether `manifest` describes a build newer than what's installed, and whether
// the user has already chosen to skip it.
export function shouldPromptForUpdate({ installedCode, installedName, manifest, skippedCode = null }) {
  if (!manifest) return false
  const installed = toVersionCode(installedCode)
  // An unknown installed version means we can't compare — staying silent beats
  // nagging someone who is already up to date.
  if (!installed) return false
  if (manifest.versionCode <= installed) return false
  if (installedName && manifest.versionName && installedName.trim() === manifest.versionName.trim()) return false
  // A mandatory update ignores an earlier skip.
  if (manifest.mandatory) return true
  const skipped = toVersionCode(skippedCode)
  return !skipped || skipped < manifest.versionCode
}
