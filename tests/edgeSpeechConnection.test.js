// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'

let sockets, synthesize
class SpeechSocket {
  static OPEN = 1
  static CONNECTING = 0
  constructor(url) {
    this.url = url
    this.readyState = 0
    this.requests = []
    sockets.push(this)
    queueMicrotask(() => { this.readyState = 1; this.onopen?.() })
  }
  send(message) { if (message.includes('Path:ssml')) this.requests.push(message) }
  close() { this.readyState = 3; this.onclose?.() }
  complete(word) {
    const frame = new TextEncoder().encode('Path:audio\r\nMP3')
    this.onmessage({ data: frame.buffer })
    this.onmessage({ data: 'Path:audio.metadata\r\n\r\n' + JSON.stringify({ Metadata: [
      { Type: 'WordBoundary', Data: { text: { Text: word }, Offset: 500000, Duration: 1000000 } },
    ] }) })
    this.onmessage({ data: 'Path:turn.end\r\n' })
  }
}
beforeEach(async () => {
  vi.resetModules()
  vi.useFakeTimers()
  sockets = []
  vi.stubGlobal('crypto', webcrypto)
  vi.stubGlobal('WebSocket', SpeechSocket)
  vi.stubGlobal('FileReader', class {
    readAsDataURL() { this.result = 'data:audio/mp3;base64,TVAz'; queueMicrotask(() => this.onload()) }
  })
  synthesize = (await import('../composables/useEdgeSpeechClient.js')).synthesizeEdgeSpeechInBrowser
})
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals() })

it('serializes concurrent prefetch turns on one connection with separate audio and word metadata', async () => {
  const results = ['First', 'Second', 'Third'].map(text => synthesize({ text, voice: 'en-US-AvaNeural' }))
  await vi.waitFor(() => expect(sockets[0]?.requests).toHaveLength(1))
  const url = new URL(sockets[0].url)
  expect(url.hostname).toBe('api.msedgeservices.com')
  expect(url.searchParams.has('Ocp-Apim-Subscription-Key')).toBe(true)
  sockets[0].complete('First')
  await vi.waitFor(() => expect(sockets[0].requests).toHaveLength(2))
  sockets[0].complete('Second')
  await vi.waitFor(() => expect(sockets[0].requests).toHaveLength(3))
  sockets[0].complete('Third')
  const audio = await Promise.all(results)
  expect(sockets).toHaveLength(1)
  expect(audio.map(result => result.boundaries.map(b => b.word))).toEqual([['First'], ['Second'], ['Third']])
  expect(audio.every(result => result.audio.startsWith('data:audio/mp3'))).toBe(true)
})

it('reconnects after the server closes an idle connection', async () => {
  const first = synthesize({ text: 'First', voice: 'en-US-AvaNeural' })
  await vi.waitFor(() => expect(sockets[0]?.requests).toHaveLength(1))
  sockets[0].complete('First')
  await first
  sockets[0].close()
  const second = synthesize({ text: 'Second', voice: 'en-US-AvaNeural' })
  await vi.waitFor(() => expect(sockets[1]?.requests).toHaveLength(1))
  sockets[1].complete('Second')
  expect((await second).boundaries[0].word).toBe('Second')
})

it('retries a reused connection that closes while sending the next turn', async () => {
  const first = synthesize({ text: 'First', voice: 'en-US-AvaNeural', attempts: 1 })
  await vi.waitFor(() => expect(sockets[0]?.requests).toHaveLength(1))
  sockets[0].complete('First')
  await first
  const second = synthesize({ text: 'Second', voice: 'en-US-AvaNeural', attempts: 1 })
  await vi.waitFor(() => expect(sockets[0].requests).toHaveLength(2))
  sockets[0].close()
  await vi.waitFor(() => expect(sockets[1]?.requests).toHaveLength(1))
  sockets[1].complete('Second')
  expect((await second).boundaries[0].word).toBe('Second')
})
