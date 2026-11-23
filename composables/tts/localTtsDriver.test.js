// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
const bridge = vi.hoisted(() => ({ addListener: vi.fn(async () => ({})), prepare: vi.fn(async () => {}), cancel: vi.fn(async () => {}), synthesize: vi.fn(), installed: vi.fn(async () => ({ voices: { 'pocket:charles': false, 'kokoro:af_nicole': true } })), download: vi.fn(async () => {}), cancelDownload: vi.fn(async () => {}) }))
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'android' }, registerPlugin: () => bridge }))
import { synthesizeLocalSpeech, cancelLocalSpeech, isLocalTtsVoice, refreshLocalVoices, isLocalVoiceInstalled, downloadLocalVoice, localVoiceDownloading } from './localTtsDriver'
beforeEach(async () => { await cancelLocalSpeech(); bridge.synthesize.mockReset() })
it('coalesces identical synthesis while retaining exact voice identity', async () => {
  bridge.synthesize.mockResolvedValue({ audio: 'wav', duration: 2 })
  const results = await Promise.all([1, 2].map(() => synthesizeLocalSpeech({ text: 'Hello.', voice: 'kokoro:af_nicole' })))
  expect(bridge.synthesize).toHaveBeenCalledTimes(1)
  expect(bridge.synthesize).toHaveBeenCalledWith({ text: 'Hello.', voice: 'kokoro:af_nicole' })
  expect(results[0]).toEqual({ audio: 'wav', duration: 2, boundaries: [] })
})
it('rejects synthesis completed after a voice cancellation', async () => {
  let complete
  bridge.synthesize.mockImplementation(() => new Promise(resolve => { complete = resolve }))
  const request = synthesizeLocalSpeech({ text: 'Hello.', voice: 'pocket:charles' })
  const rejection = expect(request).rejects.toThrow('cancelled')
  await vi.waitFor(() => expect(complete).toBeTypeOf('function'))
  await cancelLocalSpeech()
  complete({ audio: 'old voice' })
  await rejection
})
it('only routes the two supported voices to the local engine', () => {
  expect(isLocalTtsVoice('pocket:charles')).toBe(true)
  expect(isLocalTtsVoice('kokoro:af_nicole')).toBe(true)
  expect(isLocalTtsVoice('kokoro:af_heart')).toBe(false)
  expect(isLocalTtsVoice('en-CA-LiamNeural')).toBe(false)
})

it('reports which narrators are on the device', async () => {
  await refreshLocalVoices()
  expect(isLocalVoiceInstalled('kokoro:af_nicole')).toBe(true)
  expect(isLocalVoiceInstalled('pocket:charles')).toBe(false)
})
it('downloads a narrator once, sharing concurrent requests, then marks it installed', async () => {
  await refreshLocalVoices()
  let finish
  bridge.download.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  bridge.installed.mockResolvedValue({ voices: { 'pocket:charles': true, 'kokoro:af_nicole': true } })
  const first = downloadLocalVoice('pocket:charles')
  const second = downloadLocalVoice('pocket:charles')
  await vi.waitFor(() => expect(finish).toBeTypeOf('function'))
  expect(localVoiceDownloading.value).toBe('pocket:charles')
  finish()
  await Promise.all([first, second])
  expect(bridge.download).toHaveBeenCalledTimes(1)
  expect(isLocalVoiceInstalled('pocket:charles')).toBe(true)
  expect(localVoiceDownloading.value).toBe(null)
})
