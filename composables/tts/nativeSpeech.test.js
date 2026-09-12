import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  browserSpeechSupported,
  createNativeSpeechAudio,
  loadNativeVoices,
  nativeSpeechSupported,
} from './nativeSpeech'

class FakeUtterance {
  constructor(text) {
    this.text = text
  }
}

describe('browser speech fallback', () => {
  let browserVoice
  let speechSynthesis

  beforeEach(() => {
    browserVoice = {
      name: 'Microsoft David',
      voiceURI: 'Microsoft David Desktop',
      lang: 'en-US',
      localService: true,
    }
    speechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: vi.fn(() => [browserVoice]),
    }
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: FakeUtterance,
    })
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: speechSynthesis,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete window.SpeechSynthesisUtterance
    delete window.speechSynthesis
  })

  it('recognizes Web Speech without requiring the Capacitor plugin', () => {
    expect(browserSpeechSupported()).toBe(true)
    expect(nativeSpeechSupported()).toBe(true)
  })

  it('loads browser voices in the same shape used by the voice picker', async () => {
    await expect(loadNativeVoices()).resolves.toEqual([
      expect.objectContaining({
        name: 'Microsoft David',
        voiceURI: 'Microsoft David Desktop',
        lang: 'en-US',
        _browserVoice: browserVoice,
      }),
    ])
  })

  it('speaks a fallback chunk and advances when the browser finishes it', async () => {
    const voices = await loadNativeVoices()
    const player = createNativeSpeechAudio({
      text: 'Read this in the browser.',
      voice: 'en-US-ChristopherNeural',
      speed: 1.25,
      volume: 0.6,
      voices,
    })
    const ended = vi.fn()
    player.onended = ended

    await player.play()

    expect(speechSynthesis.speak).toHaveBeenCalledOnce()
    const utterance = speechSynthesis.speak.mock.calls[0][0]
    expect(utterance).toMatchObject({
      text: 'Read this in the browser.',
      lang: 'en-US',
      rate: 1.25,
      volume: 0.6,
      voice: browserVoice,
    })

    utterance.onend()
    expect(ended).toHaveBeenCalledOnce()
  })

  it('cancels browser speech without reporting a playback failure', async () => {
    const player = createNativeSpeechAudio({ text: 'Stop me.', voice: 'en-US-ChristopherNeural' })
    const failed = vi.fn()
    player.onerror = failed

    await player.play()
    const utterance = speechSynthesis.speak.mock.calls[0][0]
    player.stop()
    utterance.onerror({ error: 'canceled' })

    expect(speechSynthesis.cancel).toHaveBeenCalledOnce()
    expect(failed).not.toHaveBeenCalled()
  })
})
