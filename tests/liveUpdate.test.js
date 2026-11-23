import { createSign, createVerify, generateKeyPairSync } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import {
  chooseUpdatePath,
  normalizeUpdateManifest,
  normalizeWebBundle,
  webBundleId,
} from '../composables/appUpdateManifest.js'

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8')

const SIG = 'A'.repeat(342) + '=='
const web = (overrides = {}) => ({
  versionCode: 300,
  minNativeCode: 290,
  url: 'https://github.com/o/r/releases/download/v1.4.0/bookish-web-1.4.0.zip',
  sha256: 'a'.repeat(64),
  signature: SIG,
  size: 13_000_000,
  ...overrides,
})

const manifest = (overrides = {}) => normalizeUpdateManifest({
  versionCode: 300,
  versionName: '1.4.0',
  apkUrl: 'https://github.com/o/r/releases/download/v1.4.0/bookish-1.4.0.apk',
  web: web(),
  ...overrides,
})

describe('web bundle validation', () => {
  test('accepts a well-formed bundle', () => {
    expect(normalizeWebBundle(web())).toEqual(web())
  })

  test.each([
    ['plain http url', { url: 'http://example.com/b.zip' }],
    ['javascript url', { url: 'javascript:alert(1)' }],
    ['missing signature', { signature: '' }],
    ['junk signature', { signature: 'not base64!' }],
    ['short checksum', { sha256: 'abc' }],
    ['missing minNativeCode', { minNativeCode: undefined }],
    ['minNativeCode above the bundle', { minNativeCode: 301 }],
    ['fractional version', { versionCode: 300.5 }],
  ])('rejects %s', (_, overrides) => {
    expect(normalizeWebBundle(web(overrides))).toBeNull()
  })

  test('a bad web section never invalidates the APK manifest', () => {
    const m = manifest({ web: web({ url: 'http://insecure' }) })
    expect(m).not.toBeNull()
    expect(m.web).toBeNull()
  })

  test('bundle ids are stable per version', () => {
    expect(webBundleId(300)).toBe('web-300')
  })
})

describe('choosing between a silent web update and the APK prompt', () => {
  test('a compatible APK updates silently', () => {
    expect(chooseUpdatePath({ nativeCode: 290, webCode: 290, manifest: manifest() })).toBe('web')
  })

  test('an APK missing required native code is offered the APK', () => {
    expect(chooseUpdatePath({ nativeCode: 289, webCode: 289, manifest: manifest() })).toBe('apk')
  })

  test('a manifest without a web bundle behaves exactly as before', () => {
    expect(chooseUpdatePath({ nativeCode: 290, webCode: 290, manifest: manifest({ web: undefined }) })).toBe('apk')
  })

  test('nothing happens once the web update is running', () => {
    expect(chooseUpdatePath({ nativeCode: 290, webCode: 300, manifest: manifest() })).toBe('none')
  })

  test('nothing happens when the APK itself is current', () => {
    expect(chooseUpdatePath({ nativeCode: 300, webCode: 300, manifest: manifest() })).toBe('none')
  })

  test('a web bundle for a different version than the release is ignored', () => {
    const m = manifest({ web: web({ versionCode: 299 }) })
    expect(chooseUpdatePath({ nativeCode: 290, webCode: 290, manifest: m })).toBe('apk')
  })

  test('an unknown installed version stays silent', () => {
    expect(chooseUpdatePath({ nativeCode: null, webCode: 290, manifest: manifest() })).toBe('none')
  })
})

describe('signing format', () => {
  // The plugin verifies SHA256withRSA over the zip bytes, base64-encoded —
  // exactly what scripts/build-web-bundle.mjs produces.
  test('a bundle signature verifies with the matching public key only', () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    const other = generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey
    const data = Buffer.from('zip bytes')
    const signature = createSign('RSA-SHA256').update(data).sign(privateKey, 'base64')
    expect(normalizeWebBundle(web({ signature }))).not.toBeNull()
    expect(createVerify('RSA-SHA256').update(data).verify(publicKey, signature, 'base64')).toBe(true)
    expect(createVerify('RSA-SHA256').update(data).verify(other, signature, 'base64')).toBe(false)
  })

  test('the build script signs the way the plugin verifies', () => {
    const script = read('scripts/build-web-bundle.mjs')
    expect(script).toMatch(/createSign\('RSA-SHA256'\)/)
    expect(script).toMatch(/\.sign\(.*'base64'\)/)
  })
})

describe('live update wiring', () => {
  const config = read('capacitor.config.ts')

  test('bundles must be signed, and a bad one rolls back and is blocked', () => {
    expect(config).toMatch(/LiveUpdate:\s*\{/)
    expect(config).toContain('-----BEGIN PUBLIC KEY-----')
    expect(config).toMatch(/readyTimeout:\s*\d{4,}/)
    expect(config).toMatch(/autoBlockRolledBackBundles:\s*true/)
  })

  test('the private signing key is never committed', () => {
    expect(read('.gitignore')).toMatch(/^android\/live-update-private\.pem$/m)
  })

  test('the update checker stages web updates instead of prompting', () => {
    const checker = read('composables/useAppUpdate.js')
    expect(checker).toMatch(/chooseUpdatePath\(/)
    expect(checker).toMatch(/stageWebUpdate\(manifest\.web\)/)
  })

  test('downloads pass the signature and skip rolled-back builds', () => {
    const client = read('composables/useLiveUpdate.js')
    expect(client).toMatch(/downloadBundle\(\{[^}]*signature: web\.signature/)
    expect(client).toMatch(/getBlockedBundles\(/)
    expect(client).toMatch(/setNextBundle\(/)
    // Applying immediately would swap the app's code under the reader.
    expect(client).not.toMatch(/\.reload\(\)/)
  })

  test('a build that lands on the error screen never confirms itself', () => {
    const plugin = read('plugins/live-update.client.js')
    expect(plugin).toMatch(/app:suspense:resolve/)
    expect(plugin).toMatch(/payload\?\.error/)
    expect(plugin).toMatch(/confirmHealthyStartup\(\)/)
  })

  test('the release workflow verifies the bundle before publishing it', () => {
    const workflow = read('.github/workflows/publish-version-manifest.yml')
    expect(workflow).toMatch(/sha256sum/)
    expect(workflow).toMatch(/--web-meta/)
  })
})

describe('Capacitor plugin proxies are thenables', () => {
  // Resolving a promise with a plugin proxy calls its fake `then` and hangs
  // forever — on device, ready() was never reached and every startup timed out.
  test('the live-update plugin is never resolved bare from a promise', () => {
    const client = read('composables/useLiveUpdate.js')
    expect(client).toMatch(/\.then\(\(mod\) => \(\{ plugin: mod\?\.LiveUpdate/)
    expect(client).not.toMatch(/\.then\(\(mod\) => mod\?\.LiveUpdate/)
  })
})

describe('a failed bundle is never staged twice', () => {
  test('a staged bundle that is not running at the next startup counts as failed', async () => {
    const { settleLiveUpdateState } = await import('../composables/useLiveUpdate.js')
    expect(settleLiveUpdateState({ pending: 'web-300', failed: [] }, { currentBundleId: null }))
      .toEqual({ pending: null, failed: ['web-300'] })
  })

  test('a staged bundle that is running is a success', async () => {
    const { settleLiveUpdateState } = await import('../composables/useLiveUpdate.js')
    expect(settleLiveUpdateState({ pending: 'web-300', failed: [] }, { currentBundleId: 'web-300' }))
      .toEqual({ pending: null, failed: [] })
  })

  test('a rollback the plugin reports is recorded too', async () => {
    const { settleLiveUpdateState } = await import('../composables/useLiveUpdate.js')
    expect(settleLiveUpdateState({ pending: null, failed: ['web-1'] }, { rollback: true, previousBundleId: 'web-2' }))
      .toEqual({ pending: null, failed: ['web-1', 'web-2'] })
  })

  test('staging checks the record', () => {
    expect(read('composables/useLiveUpdate.js')).toMatch(/readLiveUpdateState\(\)\.failed\.includes\(bundleId\)/)
  })
})

describe('the PWA service worker never runs in the native app', () => {
  test('the PWA module does not register it on its own', () => {
    const config = read('nuxt.config.ts')
    expect(config).toMatch(/client:\s*\{\s*registerPlugin:\s*false\s*\}/)
    expect(config).toMatch(/injectRegister:\s*false/)
  })

  test('registration happens on the web only, and native removes leftovers', () => {
    const plugin = read('plugins/disable-sw-native.client.js')
    const nativeGuard = plugin.indexOf('if (!isNativeCapacitorPlatform())')
    const register = plugin.indexOf("register('/sw.js'")
    expect(nativeGuard).toBeGreaterThan(-1)
    expect(register).toBeGreaterThan(nativeGuard)
    expect(plugin).toContain('unregister()')
  })
})
