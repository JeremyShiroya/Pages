// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { encodeWav, speechBounds, trimWindow, trimClipSilence } from './silenceTrim'

const rate = 24000
const clip = (leadS, speechS, tailS) => {
  const samples = new Float32Array(Math.round((leadS + speechS + tailS) * rate))
  const start = Math.round(leadS * rate)
  for (let i = 0; i < Math.round(speechS * rate); i++) samples[start + i] = 0.5 * Math.sin(i / 5)
  return samples
}

describe('sentence silence trimming', () => {
  it('finds where speech starts and ends', () => {
    const samples = clip(0.2, 1, 0.6)
    const bounds = speechBounds(samples)
    expect(bounds.start / rate).toBeCloseTo(0.2, 2)
    expect(bounds.end / rate).toBeCloseTo(1.2, 2)
  })

  it('keeps a short lead-in and a natural pause, dropping the padding', () => {
    const window = trimWindow(clip(0.25, 1, 0.7), rate)
    expect(window.from / rate).toBeCloseTo(0.22, 2)
    expect((window.to - window.from) / rate).toBeCloseTo(0.03 + 1 + 0.14, 1)
  })

  it('leaves an already tight clip alone', () => {
    expect(trimWindow(clip(0.02, 1, 0.12), rate)).toBeNull()
    expect(speechBounds(new Float32Array(100))).toBeNull()
  })

  it('writes a valid 16-bit mono WAV header', () => {
    const bytes = encodeWav(new Float32Array(10), rate)
    const view = new DataView(bytes.buffer)
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('RIFF')
    expect(view.getUint32(24, true)).toBe(rate)
    expect(view.getUint32(40, true)).toBe(20)
  })

  it('returns the clip untouched where audio cannot be decoded', async () => {
    const original = { audio: 'data:audio/mpeg;base64,AAAA', boundaries: [{ offset: 1 }] }
    expect(await trimClipSilence(original)).toBe(original)
  })
})
