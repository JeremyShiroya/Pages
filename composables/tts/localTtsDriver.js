import { Capacitor, registerPlugin } from '@capacitor/core'
import { ref } from 'vue'

const LocalSpeech = registerPlugin('LocalSpeech')
// The narrators' model files are NOT part of the app: each is downloaded once,
// on request, from the voice picker's download button.
export const LOCAL_TTS_VOICES = Object.freeze([
  { id: 'pocket:charles', name: 'Charles (UK)', downloadMB: 98 },
  { id: 'kokoro:af_nicole', name: 'Nicole (US)', downloadMB: 350 },
])
export const isLocalTtsVoice = id => LOCAL_TTS_VOICES.some(voice => voice.id === id)
export const localSpeechStatus = ref(null)
// { 'pocket:charles': true|false, ... } once the device has been asked; empty
// until then (and always empty off Android).
export const localVoicesInstalled = ref({})
export const localVoiceDownloading = ref(null)
const pending = new Map()
let listener = null
let generation = 0
let cancellation = Promise.resolve()
let downloadRequest = null

const onAndroid = () => Capacitor.getPlatform() === 'android'

async function observeProgress() {
  if (!onAndroid()) throw new Error('Charles and Nicole currently require the Android app.')
  if (!listener) listener = LocalSpeech.addListener('progress', event => { localSpeechStatus.value = event })
  await listener
}

export const isLocalVoiceInstalled = id => localVoicesInstalled.value?.[id] === true

export async function refreshLocalVoices() {
  if (!onAndroid()) return localVoicesInstalled.value
  try {
    const result = await LocalSpeech.installed()
    localVoicesInstalled.value = { ...(result?.voices || {}) }
    localVoiceDownloading.value = result?.downloading || localVoiceDownloading.value
  } catch (error) {
    console.warn('[LocalSpeech] Could not read installed voices:', error)
  }
  return localVoicesInstalled.value
}

// Download a narrator's files. Resolves when they are installed; concurrent
// calls for the same voice share one download.
export async function downloadLocalVoice(voice) {
  if (!isLocalTtsVoice(voice)) throw new Error('Unknown narrator')
  if (isLocalVoiceInstalled(voice)) return true
  if (downloadRequest?.voice === voice) return downloadRequest.promise
  if (downloadRequest) throw new Error('Another voice is still downloading')
  localVoiceDownloading.value = voice
  // Registered synchronously, before any await, so a second tap joins this
  // download instead of starting another one.
  const promise = observeProgress()
    .then(() => LocalSpeech.download({ voice }))
    .then(async () => {
      localVoicesInstalled.value = { ...localVoicesInstalled.value, [voice]: true }
      await refreshLocalVoices()
      if (localSpeechStatus.value?.voice === voice) localSpeechStatus.value = null
      return true
    })
    .finally(() => {
      if (downloadRequest?.voice === voice) downloadRequest = null
      if (localVoiceDownloading.value === voice) localVoiceDownloading.value = null
    })
  downloadRequest = { voice, promise }
  return promise
}

export async function cancelLocalVoiceDownload() {
  if (!onAndroid()) return
  await LocalSpeech.cancelDownload()
}

export async function prepareLocalSpeech(voice) {
  await observeProgress()
  return LocalSpeech.prepare({ voice })
}
export async function cancelLocalSpeech() {
  generation++
  pending.clear()
  // A download in progress reports through the same status; leave it showing.
  if (localSpeechStatus.value?.phase !== 'downloading' && localSpeechStatus.value?.phase !== 'installing') {
    localSpeechStatus.value = null
  }
  if (onAndroid()) cancellation = LocalSpeech.cancel()
  await cancellation
}
export async function synthesizeLocalSpeech({ text, voice }) {
  await cancellation
  await observeProgress()
  const key = JSON.stringify([voice, text])
  if (pending.has(key)) return pending.get(key)
  const token = generation
  const request = LocalSpeech.synthesize({ text, voice }).then(result => {
    if (token !== generation) throw new Error('Speech request cancelled')
    // The engines return sentence audio, without measured word timestamps.
    // Keep sentence highlighting; never fabricate word alignment.
    return { ...result, boundaries: [] }
  }).finally(() => { if (pending.get(key) === request) pending.delete(key) })
  pending.set(key, request)
  return request
}

// ── Gapless streaming ──────────────────────────────────────────────────────
//
// Charles and Nicole play through ONE continuous native audio stream (see
// LocalSpeechStream.java): the engine synthesizes upcoming sentences in
// reading order straight into it, so a sentence boundary is just more samples
// — no per-sentence audio element, no base64 hop, no start-up latency, and
// speed is applied natively without re-synthesizing. The player still works
// sentence by sentence: each sentence gets a small audio-like handle whose
// "ended" fires when the native stream reports that sentence finished.

export const STREAM_LOOKAHEAD = 10
// Narrators synthesized at the playback speed natively (see LocalSpeechStream).
const NATIVE_SPEED_VOICES = new Set(['kokoro:af_nicole'])
const stream = {
  voice: null,
  active: false,
  nativePaused: false,
  texts: new Map(),
  queued: new Set(),
  lastQueued: -1,
  ended: new Set(),
  handles: new Map(),
  items: null,
  listener: null,
}

export const localStreamingSupported = () => onAndroid()

// Loudness (0–1) at the native stream's playback head, reported ~30 times a
// second while it changes. Read by the Listen view's orb.
let streamLevel = 0
let streamLevelAt = 0
export const localStreamLevel = () => {
  if (!stream.active || stream.nativePaused) return 0
  // A stale value (no event for a while) means nothing new is playing.
  return performance.now() - streamLevelAt > 400 && streamLevel > 0 ? 0 : streamLevel
}

function onStreamEvent(event) {
  if (event?.type === 'level') {
    const value = Number(event.message)
    streamLevel = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0
    streamLevelAt = performance.now()
    return
  }
  const index = Number(event?.index)
  if (!Number.isFinite(index)) return
  if (event.type === 'started') {
    topUpStream(index)
  } else if (event.type === 'ended') {
    stream.ended.add(index)
    stream.handles.get(index)?._ended()
  } else if (event.type === 'error') {
    console.warn('[LocalSpeech] Sentence skipped:', index, event.message)
  }
}

async function ensureStreamListener() {
  if (!stream.listener) stream.listener = LocalSpeech.addListener('stream', onStreamEvent)
  await stream.listener
}

function nextItems(from, count) {
  const indexes = []
  const texts = []
  for (const item of stream.items?.(from, count) || []) {
    if (stream.queued.has(item.index)) continue
    indexes.push(item.index)
    texts.push(item.text)
    stream.queued.add(item.index)
    stream.texts.set(item.index, item.text)
    stream.lastQueued = Math.max(stream.lastQueued, item.index)
  }
  return { indexes, texts }
}

// Keep the native queue STREAM_LOOKAHEAD sentences ahead of what is playing.
// Charles synthesizes at about real time on mid-range phones, so he keeps a
// deeper queue: the cushion built while paused or on the Listen screen lasts.
const lookaheadFor = voice => (voice === 'pocket:charles' ? STREAM_LOOKAHEAD * 2 : STREAM_LOOKAHEAD)

function topUpStream(playingIndex) {
  if (!stream.active) return
  const wanted = playingIndex + lookaheadFor(stream.voice)
  if (stream.lastQueued >= wanted) return
  const { indexes, texts } = nextItems(stream.lastQueued + 1, wanted - stream.lastQueued)
  if (indexes.length) LocalSpeech.streamAppend({ indexes, texts }).catch(error => console.warn('[LocalSpeech] Append:', error))
}

export async function stopLocalStream() {
  if (!stream.active) return
  stream.active = false
  stream.nativePaused = false
  stream.queued.clear()
  stream.texts.clear()
  stream.ended.clear()
  stream.handles.clear()
  stream.lastQueued = -1
  try { await LocalSpeech.streamStop() } catch {}
}

async function startStream({ voice, index, items, speed, volume, paused }) {
  await ensureStreamListener()
  stream.items = items
  stream.voice = voice
  stream.queued.clear()
  stream.texts.clear()
  stream.ended.clear()
  stream.lastQueued = -1
  stream.active = true
  const first = nextItems(index, lookaheadFor(voice) + 1)
  if (!first.indexes.length) { stream.active = false; throw new Error('Nothing to read') }
  await LocalSpeech.streamStart({ voice, ...first, speed, volume })
  stream.speed = speed
  stream.nativePaused = false
  if (paused) {
    await LocalSpeech.streamPause()
    stream.nativePaused = true
  }
}

const streamReadyAt = (voice, index, text) => (
  stream.active && stream.voice === voice && stream.queued.has(index)
  && (text === undefined || stream.texts.get(index) === text)
)

/**
 * Pre-buffer: start synthesizing from `index` with playback paused, so that
 * pressing play resumes audio that already exists — instantly, and with a
 * cushion that lets slower narrators stay ahead of playback. Also loads the
 * narrator's model ahead of time. No-op when already buffering there.
 */
export async function prepareLocalStream({ voice, index, items, speed = 1, volume = 1 }) {
  if (!localStreamingSupported() || !isLocalTtsVoice(voice) || !isLocalVoiceInstalled(voice)) return false
  const text = items(index, 1)[0]?.text
  if (streamReadyAt(voice, index, text)) return true
  try {
    await startStream({ voice, index, items, speed, volume, paused: true })
    return true
  } catch (error) {
    console.warn('[LocalSpeech] Pre-buffer failed:', error)
    return false
  }
}

/**
 * An audio-element-like handle for ONE sentence of the stream.
 * `items(from, count)` returns the book's next readable sentences as
 * [{ index, text }] (empty sentences already skipped).
 */
export function createLocalStreamAudio({ voice, index, items, speed = 1, volume = 1 }) {
  let rate = speed
  let level = volume
  let startedAt = 0
  let pausedAt = 0
  let endedFired = false
  const handle = {
    _native: true,
    onended: null,
    onerror: null,
    duration: Number.NaN,
    paused: true,
    get currentTime() {
      if (!startedAt) return 0
      return ((handle.paused ? pausedAt : performance.now()) - startedAt) / 1000 * rate
    },
    set currentTime(_) {},
    get playbackRate() { return rate },
    set playbackRate(value) {
      const next = Number(value) || 1
      if (next === rate) return
      rate = next
      if (!stream.active) return
      if (NATIVE_SPEED_VOICES.has(voice) && !handle.paused) {
        // This narrator speaks at the chosen speed itself (less work than
        // stretching 1x audio), so audio already synthesized is at the old
        // speed: restart from this sentence at the new one.
        startStream({ voice, index, items, speed: rate, volume: level, paused: false }).catch(() => {})
        return
      }
      LocalSpeech.streamSpeed({ speed: rate }).catch(() => {})
    },
    get volume() { return level },
    set volume(value) {
      level = Math.max(0, Math.min(1, Number(value)))
      if (stream.active) LocalSpeech.streamVolume({ volume: level }).catch(() => {})
    },
    async play() {
      await ensureStreamListener()
      stream.handles.set(index, handle)
      const text = items(index, 1)[0]?.text
      const speedMismatch = NATIVE_SPEED_VOICES.has(voice) && stream.speed !== rate
      if (streamReadyAt(voice, index, text) && !speedMismatch) {
        stream.items = items
        // Resuming a pause, or starting from a pre-buffered position.
        if (stream.nativePaused) {
          await LocalSpeech.streamSpeed({ speed: rate }).catch(() => {})
          await LocalSpeech.streamResume()
          stream.nativePaused = false
        }
      } else {
        // Start (or restart after a seek) a stream at this sentence.
        await startStream({ voice, index, items, speed: rate, volume: level, paused: false })
      }
      if (!startedAt) startedAt = performance.now()
      else if (pausedAt) startedAt += performance.now() - pausedAt
      pausedAt = 0
      handle.paused = false
      // A very short sentence may already have finished before the player
      // asked for it.
      if (stream.ended.has(index)) queueMicrotask(() => handle._ended())
    },
    pause() {
      if (handle.paused) return
      handle.paused = true
      pausedAt = performance.now()
      stream.nativePaused = true
      // Synthesis carries on while paused, so resuming is gapless.
      LocalSpeech.streamPause().catch(() => {})
    },
    // Called when narration is cancelled, seeks or changes voice.
    stop() {
      handle.onended = null
      stream.handles.delete(index)
      void stopLocalStream()
    },
    _ended() {
      if (endedFired) return
      endedFired = true
      stream.handles.delete(index)
      stream.ended.delete(index)
      handle.onended?.()
    },
  }
  return handle
}
