import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const synthesizeEdgeSpeechInBrowser = vi.fn()
const nativeSpeechSupported = vi.fn(() => true)
const $fetch = vi.fn()

vi.stubGlobal('$fetch', (...args) => $fetch(...args))

vi.mock('~/composables/useEdgeSpeechClient', () => ({
  synthesizeEdgeSpeechInBrowser: (...args) => synthesizeEdgeSpeechInBrowser(...args),
}))

vi.mock('~/composables/tts/nativeSpeech', () => ({
  nativeSpeechSupported: () => nativeSpeechSupported(),
}))

const { synthesizeMobileSpeech, resetMobileTtsDriver, mobileTtsEdgeDisabled, edgeTimeoutForText } =
  await import('~/composables/tts/mobileTtsDriver')

const EDGE_AUDIO = { audio: 'data:audio/mp3;base64,AAA', boundaries: [] }
const speak = (options = {}) => synthesizeMobileSpeech({
  text: 'A sentence.',
  voice: 'en-US-ChristopherNeural',
  speed: 1,
  ...options,
})

const setHidden = (hidden) => {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => (hidden ? 'hidden' : 'visible'),
  })
}

describe('mobileTtsDriver Edge resilience', () => {
  it('allows a long PDF sentence enough time to finish streaming', async () => {
    synthesizeEdgeSpeechInBrowser.mockResolvedValue(EDGE_AUDIO)
    const text = 'A'.repeat(480)
    expect(edgeTimeoutForText(text)).toBeGreaterThan(40000)
    await speak({ text })
    expect(synthesizeEdgeSpeechInBrowser).toHaveBeenCalledWith(expect.objectContaining({
      text,
      timeoutMs: edgeTimeoutForText(text),
    }))
  })
  beforeEach(() => {
    resetMobileTtsDriver()
    synthesizeEdgeSpeechInBrowser.mockReset()
    $fetch.mockReset()
    nativeSpeechSupported.mockReturnValue(true)
    setHidden(false)
  })

  afterEach(() => setHidden(false))

  it('returns Edge audio and keeps the cloud path enabled', async () => {
    synthesizeEdgeSpeechInBrowser.mockResolvedValue(EDGE_AUDIO)
    await expect(speak()).resolves.toEqual(EDGE_AUDIO)
    expect(mobileTtsEdgeDisabled()).toBe(false)
  })

  it('quickly uses a phone voice after a failed Edge handshake', async () => {
    synthesizeEdgeSpeechInBrowser.mockRejectedValueOnce(new Error('socket timeout'))
    await expect(speak()).resolves.toMatchObject({ native: true })
    expect(mobileTtsEdgeDisabled()).toBe(true)
  })

  it('does not retry a rejected Edge handshake for each PDF sentence', async () => {
    synthesizeEdgeSpeechInBrowser.mockRejectedValue(new Error('handshake 403'))
    await expect(speak()).resolves.toMatchObject({ native: true })
    await expect(speak()).resolves.toMatchObject({ native: true })
    expect(synthesizeEdgeSpeechInBrowser).toHaveBeenCalledTimes(1)
    expect(mobileTtsEdgeDisabled()).toBe(true)
  })

  it('does not mistake a configured server HTML response for synthesized audio', async () => {
    synthesizeEdgeSpeechInBrowser.mockRejectedValue(new Error('handshake failed'))
    $fetch.mockResolvedValue('<!DOCTYPE html><html><body>Pages</body></html>')
    const options = {
      apiBaseUrl: 'https://pages.example',
      apiUrl: (path) => `https://pages.example${path}`,
    }

    await expect(speak(options)).resolves.toMatchObject({ native: true })
    expect($fetch).toHaveBeenCalledWith(
      'https://pages.example/api/tts',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('accepts usable audio from the configured server fallback', async () => {
    synthesizeEdgeSpeechInBrowser.mockRejectedValue(new Error('handshake failed'))
    $fetch.mockResolvedValue(EDGE_AUDIO)

    await expect(speak({
      apiBaseUrl: 'https://pages.example',
      apiUrl: (path) => `https://pages.example${path}`,
    })).resolves.toEqual(EDGE_AUDIO)
  })

  it('can probe Edge again after an explicit reset', async () => {
    synthesizeEdgeSpeechInBrowser.mockRejectedValueOnce(new Error('blip'))
    await expect(speak()).resolves.toMatchObject({ native: true })
    resetMobileTtsDriver()
    synthesizeEdgeSpeechInBrowser.mockResolvedValueOnce(EDGE_AUDIO)
    await expect(speak()).resolves.toEqual(EDGE_AUDIO)
    expect(mobileTtsEdgeDisabled()).toBe(false)
  })

  // Regression: backgrounding the app throttles the socket; that must never be
  // read as "Edge is dead" and change the narrator's voice mid-book.
  it('never disables Edge while the app is backgrounded, however many failures', async () => {
    setHidden(true)
    synthesizeEdgeSpeechInBrowser.mockRejectedValue(new Error('throttled'))
    for (let i = 0; i < 6; i += 1) {
      await expect(speak()).rejects.toThrow('throttled')
    }
    expect(mobileTtsEdgeDisabled()).toBe(false)
  })

  it('gives the backgrounded socket longer to answer', async () => {
    setHidden(true)
    synthesizeEdgeSpeechInBrowser.mockResolvedValue(EDGE_AUDIO)
    await speak()
    expect(synthesizeEdgeSpeechInBrowser).toHaveBeenCalledWith(
      expect.objectContaining({ timeoutMs: 30000, attempts: 1 }),
    )

    // Foreground gets two short attempts, so one stalled handshake retries in
    // 6s instead of holding the sentence for a full 12s.
    setHidden(false)
    await speak()
    expect(synthesizeEdgeSpeechInBrowser).toHaveBeenLastCalledWith(
      expect.objectContaining({ timeoutMs: 15000, attempts: 1 }),
    )
  })

  // Regression: the fallback used to latch for the whole session, so the
  // narrator stayed on the phone's voice long after the connection returned.
  it('re-probes Edge once the cooldown expires', async () => {
    vi.useFakeTimers()
    try {
      synthesizeEdgeSpeechInBrowser.mockRejectedValue(new Error('dead'))
      await speak()
      expect(mobileTtsEdgeDisabled()).toBe(true)

      vi.advanceTimersByTime(301_000)
      expect(mobileTtsEdgeDisabled()).toBe(false)

      synthesizeEdgeSpeechInBrowser.mockResolvedValue(EDGE_AUDIO)
      await expect(speak()).resolves.toEqual(EDGE_AUDIO)
    } finally {
      vi.useRealTimers()
    }
  })

  it('once disabled, keeps using the device voice without calling Edge again', async () => {
    synthesizeEdgeSpeechInBrowser.mockRejectedValue(new Error('dead'))
    await speak()
    expect(mobileTtsEdgeDisabled()).toBe(true)

    synthesizeEdgeSpeechInBrowser.mockClear()
    const result = await speak()
    expect(result).toMatchObject({ native: true })
    expect(synthesizeEdgeSpeechInBrowser).not.toHaveBeenCalled()
  })
})
