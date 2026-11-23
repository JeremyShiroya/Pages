// Sentence-boundary silence trimming for narration audio.
//
// Narration is synthesized one sentence at a time, and each clip comes back
// padded with silence at both ends (Edge pads every request). Played back to
// back, the trailing padding of one sentence plus the leading padding of the
// next is the "long pause between sentences" readers hear. Trimming each clip
// to its speech, plus a short natural pause, makes sentences flow.

const SILENCE_THRESHOLD = 0.012 // ≈ -38 dBFS
const KEEP_LEAD_S = 0.03        // breath before speech
const KEEP_TAIL_S = 0.14        // a natural sentence pause
const MIN_SAVING_S = 0.08       // not worth re-encoding below this

// First and last sample index above the threshold, or null for pure silence.
export function speechBounds(samples, threshold = SILENCE_THRESHOLD) {
  let start = 0
  let end = samples.length - 1
  while (start < samples.length && Math.abs(samples[start]) < threshold) start++
  if (start >= samples.length) return null
  while (end > start && Math.abs(samples[end]) < threshold) end--
  return { start, end }
}

// The slice of a clip to keep, in samples, or null when trimming would not
// shorten it meaningfully.
export function trimWindow(samples, sampleRate) {
  const bounds = speechBounds(samples)
  if (!bounds) return null
  const from = Math.max(0, bounds.start - Math.round(KEEP_LEAD_S * sampleRate))
  const to = Math.min(samples.length, bounds.end + 1 + Math.round(KEEP_TAIL_S * sampleRate))
  const saved = (samples.length - (to - from)) / sampleRate
  return saved >= MIN_SAVING_S ? { from, to } : null
}

// 16-bit mono PCM WAV.
export function encodeWav(samples, sampleRate) {
  const bytes = new Uint8Array(44 + samples.length * 2)
  const view = new DataView(bytes.buffer)
  const ascii = (offset, text) => { for (let i = 0; i < text.length; i++) bytes[offset + i] = text.charCodeAt(i) }
  ascii(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); ascii(8, 'WAVE')
  ascii(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  ascii(36, 'data'); view.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const value = Math.max(-1, Math.min(1, samples[i] || 0))
    view.setInt16(44 + i * 2, value * 32767, true)
  }
  return bytes
}

function toBase64(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

/**
 * Trim a synthesized clip ({ audio: dataUrl, boundaries }) in place of the
 * original. Word-boundary offsets are shifted by the trimmed lead so word
 * highlighting stays aligned. Any failure returns the clip unchanged — this is
 * an optimisation, never a reason for a sentence not to play.
 */
export async function trimClipSilence(clip, { sampleRate = 24000 } = {}) {
  if (!clip?.audio || typeof clip.audio !== 'string' || !clip.audio.startsWith('data:audio')) return clip
  const Context = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext
  if (!Context || typeof fetch === 'undefined') return clip
  try {
    const encoded = await (await fetch(clip.audio)).arrayBuffer()
    const context = new Context(1, 1, sampleRate)
    const decoded = await context.decodeAudioData(encoded)
    const samples = decoded.getChannelData(0)
    const window = trimWindow(samples, decoded.sampleRate)
    if (!window) return clip
    const kept = samples.subarray(window.from, window.to)
    const lead = window.from / decoded.sampleRate
    return {
      ...clip,
      audio: `data:audio/wav;base64,${toBase64(encodeWav(kept, decoded.sampleRate))}`,
      boundaries: (clip.boundaries || []).map(boundary => ({
        ...boundary,
        offset: Math.max(0, (Number(boundary.offset) || 0) - lead),
      })),
    }
  } catch (error) {
    console.warn('[TTS] Silence trim skipped:', error?.message || error)
    return clip
  }
}
