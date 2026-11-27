// Accent-coloured copies of three empty-state illustrations (Favourites,
// Playlists, Currently Reading), one per accent colour in Settings → Theme.
//
//   node scripts/generate-accent-empty-states.mjs            → public/images/empty/
//   node scripts/generate-accent-empty-states.mjs --preview <out.png>
//
// Only purple-hued pixels change: each one takes the accent's hue and
// saturation and keeps its own light/shade (shifted by how far the accent's
// lightness is from the artwork's purple), in proportion to how purple it is,
// so skin, greys, whites and the red/yellow details are left exactly as drawn.
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const SOURCES = {
  favourites: 'public/images/Favourites empty-state.png',
  playlists: 'public/images/Playlist empty-state.png',
  reading: 'public/images/Empty State 1.png',
}
// Same ids and colours as utils/accentPalette.js (light-theme shade).
const ACCENTS = {
  purple: null,
  'pastel-purple': '#a685e2',
  'pastel-blue': '#5f9fd8',
  'pastel-pink': '#e2789f',
  'pastel-yellow': '#d4b13e',
  burgundy: '#8c1c3a',
  sage: '#6f8f6a',
  green: '#2ea44f',
  'pastel-green': '#5fb87e',
  mono: '#4a4a4e', // Black & White: purple becomes graphite, shading kept
}
const SIZE = 600

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}
function hslToRgb(h, s, l) {
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0), f(8), f(4)].map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255))
}
const isPurple = (h, s) => h >= 235 && h <= 300 && s > 0.12

async function load(file) {
  const { data, info } = await sharp(resolve(root, file)).resize(SIZE, SIZE, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  // The artwork's own purple: the average of its strongly purple pixels.
  let sh = 0, ss = 0, sl = 0, n = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2])
    if (isPurple(h, s) && s > 0.35) { sh += h; ss += s; sl += l; n++ }
  }
  return { data, info, base: [sh / n, ss / n, sl / n] }
}

function recolour({ data, info, base }, hex) {
  const out = Buffer.from(data)
  if (!hex) return sharp(out, { raw: info })
  const [th, ts, tl] = rgbToHsl(...hexToRgb(hex))
  for (let i = 0; i < out.length; i += 4) {
    if (!out[i + 3]) continue
    const [h, s, l] = rgbToHsl(out[i], out[i + 1], out[i + 2])
    if (!isPurple(h, s)) continue
    const amount = Math.max(0, Math.min(1, (s - 0.12) / 0.3))
    const [r, g, b] = hslToRgb(th, ts * Math.min(1, s / base[1]), l + (tl - base[2]) * amount)
    out[i] = r; out[i + 1] = g; out[i + 2] = b
  }
  return sharp(out, { raw: info })
}

const loaded = {}
for (const [name, file] of Object.entries(SOURCES)) loaded[name] = await load(file)

if (process.argv.includes('--preview')) {
  const tile = 150
  const names = Object.keys(SOURCES)
  const accents = Object.entries(ACCENTS)
  const composites = []
  for (const [row, name] of names.entries()) {
    for (const [col, [, hex]] of accents.entries()) {
      composites.push({ input: await recolour(loaded[name], hex).resize(tile, tile).png().toBuffer(), left: col * tile, top: row * tile })
    }
  }
  await sharp({ create: { width: tile * accents.length, height: tile * names.length, channels: 4, background: '#f2f2f7' } })
    .composite(composites).png().toFile(process.argv[process.argv.indexOf('--preview') + 1])
} else {
  mkdirSync(resolve(root, 'public/images/empty'), { recursive: true })
  for (const name of Object.keys(SOURCES)) {
    for (const [id, hex] of Object.entries(ACCENTS)) {
      await recolour(loaded[name], hex).webp({ quality: 86, alphaQuality: 90 }).toFile(resolve(root, `public/images/empty/${name}-${id}.webp`))
    }
  }
  console.log('empty states written')
}
