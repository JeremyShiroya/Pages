#!/usr/bin/env node
// Packages the current web build as a signed live-update (OTA) bundle.
//
// Run it right after building the release APK, from the SAME build, so the zip
// is byte-for-byte the web layer inside that APK:
//
//   npm run cap:sync                      # builds .output/public
//   (build + sign the APK as usual)
//   npm run release:web                   # → release/pages-web-<version>.zip
//                                         #   release/pages-web-<version>.json
//
// Attach both files to the GitHub release next to the APK. The release workflow
// verifies them and folds them into version.json (scripts/generate-version-
// manifest.mjs).
//
// It computes minNativeCode — the lowest APK versionCode containing every
// native change this web build depends on — from git history, so a web build
// that calls native code a phone lacks is never offered to that phone.
//
// Signing uses android/live-update-private.pem (never committed). Its public
// half is LiveUpdate.publicKey in capacitor.config.ts.

import { createHash, createPrivateKey, createSign } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'
import { normalizeWebBundle } from '../composables/appUpdateManifest.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const webDir = resolve(root, process.env.PAGES_WEB_DIR || process.env.BOOKISH_WEB_DIR || '.output/public')
const keyPath = resolve(root, process.env.PAGES_LIVE_UPDATE_KEY || process.env.BOOKISH_LIVE_UPDATE_KEY || 'android/live-update-private.pem')
const outDir = resolve(root, 'release')

// --allow-dirty: for testing on a dev phone only. It skips the "everything is
// committed and matches HEAD" checks, which exist so a published bundle always
// matches its APK. Never publish a bundle built with it.
const allowDirty = process.argv.includes('--allow-dirty')

const fail = (message) => {
  console.error(`\n  ✗ ${message}\n`)
  process.exit(1)
}

const git = (...args) => execFileSync('git', args, {
  cwd: root,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore'],
}).trim()

// ---- native compatibility --------------------------------------------------

// Paths whose changes need a new APK. Everything else is web.
export const NATIVE_PATHS = ['android', 'capacitor.config.ts']

// npm packages that ship native Android code. Read from node_modules (anything
// with an android/ folder) plus a name heuristic, so packages that were removed
// earlier in history still count when their version changes.
const nativePackageNames = () => {
  const names = new Set()
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
  for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
    if (existsSync(resolve(root, 'node_modules', name, 'android'))) names.add(name)
  }
  return names
}

const nativeDepsAt = (commit, names) => {
  let pkg
  try {
    pkg = JSON.parse(git('show', `${commit}:package.json`))
  } catch {
    return ''
  }
  const deps = pkg.dependencies || {}
  return Object.keys(deps)
    .filter((name) => names.has(name) || /capacitor/i.test(name))
    .sort()
    .map((name) => `${name}@${deps[name]}`)
    .join(',')
}

export const computeMinNativeCode = () => {
  // Real content changes only: `npx cap sync` rewrites android/capacitor.*.gradle
  // with different line endings on every sync, which `git status` reports as
  // modified even though nothing changed. Untracked files still count.
  const paths = ['--', ...NATIVE_PATHS, 'package.json']
  const dirty = [
    git('diff', '--name-only', '--ignore-cr-at-eol', 'HEAD', ...paths),
    git('ls-files', '--others', '--exclude-standard', ...paths),
  ].filter(Boolean).join('\n')
  if (dirty && !allowDirty) {
    fail(`Uncommitted native changes — commit them first, so the APK and this bundle agree:\n${dirty}`)
  }

  const candidates = []
  const lastNativeCommit = git('log', '-1', '--format=%H', '--', ...NATIVE_PATHS)
  if (lastNativeCommit) candidates.push(lastNativeCommit)

  // The newest commit where the set/versions of native npm packages changed.
  const names = nativePackageNames()
  const pkgCommits = git('log', '--format=%H', '--', 'package.json').split('\n').filter(Boolean)
  for (const commit of pkgCommits) {
    let parent = ''
    try { parent = git('rev-parse', `${commit}^`) } catch { /* root commit */ }
    if (!parent || nativeDepsAt(commit, names) !== nativeDepsAt(parent, names)) {
      candidates.push(commit)
      break
    }
  }

  const codes = candidates.map((commit) => Number(git('rev-list', '--count', commit)))
  return Math.max(1, ...codes)
}

// ---- the build being packaged ---------------------------------------------

// Nuxt inlines runtimeConfig into index.html, so the bundle states its own
// build number — the value the app later compares versions with.
const readBundleVersion = () => {
  const indexPath = join(webDir, 'index.html')
  if (!existsSync(indexPath)) fail(`No build at ${webDir}. Run "npm run cap:sync" (or "npm run generate") first.`)
  const html = readFileSync(indexPath, 'utf8')
  const code = /buildNumber:"?(\d+)"?/.exec(html)?.[1]
  const name = /appVersion:"([^"]+)"/.exec(html)?.[1]
  if (!code) fail('Could not find buildNumber in index.html — is this a Nuxt generate output?')
  return { versionCode: Number(code), versionName: name || '' }
}

const listFiles = (dir) => readdirSync(dir).flatMap((entry) => {
  const full = join(dir, entry)
  return statSync(full).isDirectory() ? listFiles(full) : [full]
})

const main = async () => {
  if (!existsSync(keyPath)) {
    fail(`Signing key not found at ${keyPath}.\n    It is the private half of LiveUpdate.publicKey in capacitor.config.ts.`)
  }
  const { versionCode, versionName } = readBundleVersion()
  const headCode = Number(git('rev-list', '--count', 'HEAD'))
  if (versionCode !== headCode && !allowDirty) {
    fail(`The build in ${relative(root, webDir)} is versionCode ${versionCode}, but HEAD is ${headCode}.\n    Rebuild from the release commit so the bundle and the APK match.`)
  }
  const minNativeCode = computeMinNativeCode()

  const zip = new JSZip()
  for (const file of listFiles(webDir)) {
    // Paths relative to the build root, with index.html at the top level.
    zip.file(relative(webDir, file).split('\\').join('/'), readFileSync(file))
  }
  const data = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  })

  // The plugin verifies SHA256withRSA over the zip bytes, base64-encoded.
  const signature = createSign('RSA-SHA256').update(data).sign(createPrivateKey(readFileSync(keyPath)), 'base64')
  const sha256 = createHash('sha256').update(data).digest('hex')

  const base = `pages-web-${versionName || versionCode}`
  const meta = { versionCode, versionName, minNativeCode, sha256, signature, size: data.length }

  // Validate with the app's own rules (with a placeholder url — the workflow
  // supplies the real release url).
  if (!normalizeWebBundle({ ...meta, url: 'https://example.invalid/bundle.zip' })) {
    fail(`The bundle metadata fails the app's own validation: ${JSON.stringify({ ...meta, signature: '…' })}`)
  }

  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, `${base}.zip`), data)
  writeFileSync(join(outDir, `${base}.json`), `${JSON.stringify(meta, null, 2)}\n`)

  if (allowDirty) console.warn('\n  ! Built with --allow-dirty — for device testing only, do not publish.')
  console.log(`
  ✓ release/${base}.zip   (${(data.length / 1048576).toFixed(1)} MB)
  ✓ release/${base}.json

    versionCode    ${versionCode}
    minNativeCode  ${minNativeCode}   phones with an APK at or above this update silently;
                         older ones are offered the APK instead

  Attach BOTH files to the GitHub release next to the APK.
`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => fail(error?.stack || String(error)))
}
