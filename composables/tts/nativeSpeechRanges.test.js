// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const tts = vi.hoisted(() => ({ addListener: vi.fn(), speak: vi.fn(), stop: vi.fn() }))
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true, isPluginAvailable: () => true } }))
vi.mock('@capacitor-community/text-to-speech', () => ({ TextToSpeech: tts }))
import { createNativeSpeechAudio } from './nativeSpeech.js'

describe('native spoken-word ranges', () => {
  let listener, remove, finish, player
  beforeEach(() => {
    vi.useFakeTimers()
    remove = vi.fn().mockResolvedValue()
    tts.addListener.mockImplementation(async (_event, fn) => { listener = fn; return { remove } })
    tts.speak.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    tts.stop.mockResolvedValue()
    player = createNativeSpeechAudio({ text: 'A wide word.', voice: 'en-US-AvaNeural' })
    player.onboundary = vi.fn()
  })
  afterEach(() => { player.stop(); vi.useRealTimers(); vi.clearAllMocks() })

  it('does not invent word progress during synthesis delay, then follows actual spoken offsets', async () => {
    await player.play()
    vi.advanceTimersByTime(1000)
    expect(player.onboundary).not.toHaveBeenCalled()
    listener({ start: 2, end: 6, spokenWord: 'wide' })
    expect(player.onboundary).toHaveBeenCalledWith({ charIndex: 2, word: 'wide' })
    finish()
    await Promise.resolve(); await Promise.resolve()
    expect(remove).toHaveBeenCalledOnce()
  })

  it('rejects invalid and stale ranges after pause', async () => {
    await player.play()
    listener({ start: -1, end: 5 })
    listener({ start: 2, end: 6, spokenWord: 'other' })
    player.pause()
    listener({ start: 2, end: 6, spokenWord: 'wide' })
    expect(player.onboundary).not.toHaveBeenCalled()
    expect(remove).toHaveBeenCalledOnce()
  })

  it('does not start cancelled speech if listener registration completes late', async () => {
    let registered
    tts.addListener.mockImplementation(() => new Promise(resolve => { registered = resolve }))
    const playing = player.play()
    player.stop()
    registered({ remove })
    await playing
    expect(tts.speak).not.toHaveBeenCalled()
    expect(remove).toHaveBeenCalledOnce()
  })
})
