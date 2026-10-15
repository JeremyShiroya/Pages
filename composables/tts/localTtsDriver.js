import { Capacitor, registerPlugin } from '@capacitor/core'
import { ref } from 'vue'

const LocalSpeech = registerPlugin('LocalSpeech')
export const LOCAL_TTS_VOICES = Object.freeze([
  { id: 'pocket:charles', name: 'Charles (UK)', downloadMB: 98 },
  { id: 'kokoro:af_nicole', name: 'Nicole (US)', downloadMB: 350 },
])
export const isLocalTtsVoice = id => LOCAL_TTS_VOICES.some(voice => voice.id === id)
export const localSpeechStatus = ref(null)
const pending = new Map()
let listener = null
let generation = 0
let cancellation = Promise.resolve()

async function observeProgress() {
  if (Capacitor.getPlatform() !== 'android') throw new Error('Charles and Nicole currently require the Android app.')
  if (!listener) listener = LocalSpeech.addListener('progress', event => { localSpeechStatus.value = event })
  await listener
}
export async function prepareLocalSpeech(voice) {
  await observeProgress()
  return LocalSpeech.prepare({ voice })
}
export async function cancelLocalSpeech() {
  generation++
  pending.clear()
  localSpeechStatus.value = null
  if (Capacitor.getPlatform() === 'android') cancellation = LocalSpeech.cancel()
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
