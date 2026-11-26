// Drives the Listen view from the narration clock, once per frame:
//
//  • `level` (0–1) – how much the narrator is "speaking" right now. It rises on
//    each word and falls to rest in the gaps between words and at commas and
//    full stops, so the orb moves with the speech and holds still in pauses.
//    Written straight to a CSS variable (--voice) on the target element, never
//    through Vue state, so it costs no re-render.
//  • `estimatedWordIndex` – for narrators that report no word timings (the
//    on-device stream), which word of the sentence is being spoken, estimated
//    from the clock. -1 when real timings exist.
//
// No Web Audio analyser: routing the narration through an AudioContext would
// let Android suspend it in the background and silence the book.
import { onBeforeUnmount, ref, watch } from 'vue'

const BASE_WORD_SEC = 0.08      // per word, at 1x
const PER_LETTER_SEC = 0.055    // ~170 words a minute for average English words
const COMMA_PAUSE_SEC = 0.22
const STOP_PAUSE_SEC = 0.42
const VOICED_LEVEL = 0.12       // stream loudness above which the narrator counts as speaking

const wordLength = word => word.replace(/[^\p{L}\p{N}]/gu, '').length || 1

/** Estimated word timeline for a sentence at 1x: [{ start, end }] in seconds. */
export function estimateWordTimeline(text, { pauses = true } = {}) {
  const out = []
  let t = 0
  for (const match of String(text || '').matchAll(/\S+/g)) {
    const word = match[0]
    const duration = BASE_WORD_SEC + PER_LETTER_SEC * wordLength(word)
    out.push({ start: t, end: t + duration })
    t += duration
    if (!pauses) continue
    if (/[.!?…]["'”’)\]]*$/.test(word)) t += STOP_PAUSE_SEC
    else if (/[,;:—–]["'”’)\]]*$/.test(word)) t += COMMA_PAUSE_SEC
  }
  return out
}

/** Index of the last word that has started at time t (−1 before the first). */
export function wordAt(timeline, t) {
  let lo = 0
  let hi = timeline.length - 1
  let found = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (timeline[mid].start <= t) { found = mid; lo = mid + 1 } else hi = mid - 1
  }
  return found
}

/** Mouth-like envelope inside one word: quick rise, softer fall, 0 outside. */
export function wordEnvelope(t, start, end) {
  if (t < start || t > end || end <= start) return 0
  const p = (t - start) / (end - start)
  return Math.sin(Math.PI * Math.min(1, p * 1.15)) ** 0.7
}

const hash = (n) => {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

export function useNarratorActivity({ clock, playing, text, boundaries, speed, target }) {
  const estimatedWordIndex = ref(-1)
  let rafId = null
  let level = 0
  let timeline = []
  let voicedTimeline = []
  let timelineFor = null
  let voicedSeconds = 0
  let lastFrameAt = 0

  const write = (value) => {
    const el = target.value
    if (el) el.style.setProperty('--voice', value.toFixed(3))
  }

  const frame = () => {
    rafId = null
    const state = clock?.()
    let goal = 0
    let estimate = -1

    if (state && !state.paused) {
      const t = state.time
      const marks = boundaries.value || []
      if (state.kind === 'timed' && marks.length) {
        // Edge: real word timings.
        let i = -1
        for (let lo = 0, hi = marks.length - 1; lo <= hi;) {
          const mid = (lo + hi) >> 1
          if (marks[mid].offset <= t) { i = mid; lo = mid + 1 } else hi = mid - 1
        }
        if (i >= 0) {
          const start = marks[i].offset
          const end = start + Math.max(0.08, Number(marks[i].duration) || 0.25)
          goal = wordEnvelope(t, start, end) * (0.72 + 0.28 * hash(i + 1))
        }
      } else {
        const source = text.value || ''
        if (timelineFor !== source) {
          timeline = estimateWordTimeline(source)
          voicedTimeline = estimateWordTimeline(source, { pauses: false })
          timelineFor = source
          voicedSeconds = 0
        }
        if (state.kind === 'native' && marks.length) {
          // Phone voice: one boundary per word as it starts; its length is estimated.
          const mark = marks[marks.length - 1]
          const word = String(mark.word || 'word')
          const rate = Math.max(0.25, Number(speed.value) || 1)
          const length = (BASE_WORD_SEC + PER_LETTER_SEC * wordLength(word)) / rate
          goal = wordEnvelope(t, mark.offset, mark.offset + length) * 0.9
        } else if (state.kind === 'stream' && state.level !== null && state.level !== undefined) {
          // On-device narrators: the native stream reports the real loudness at
          // the speaker, so the orb follows the actual audio — still in pauses
          // and while the engine is catching up, moving only when sound plays.
          goal = state.level
          // The word estimate advances only while the narrator is voicing, so a
          // synthesis stall or a long pause no longer runs the words ahead.
          const now = performance.now()
          const dt = lastFrameAt ? Math.min(0.1, (now - lastFrameAt) / 1000) : 0
          lastFrameAt = now
          if (state.level > VOICED_LEVEL) voicedSeconds += dt * Math.max(0.25, Number(speed.value) || 1)
          const i = wordAt(voicedTimeline, voicedSeconds)
          estimate = Math.max(0, i)
        } else {
          // Edge without timings (real seconds) or a stream without levels.
          const rate = state.kind === 'stream' ? 1 : Math.max(0.25, Number(speed.value) || 1)
          const at = t * rate
          const i = wordAt(timeline, at)
          if (i >= 0) {
            goal = wordEnvelope(at, timeline[i].start, timeline[i].end) * (0.72 + 0.28 * hash(i + 1))
            if (state.kind === 'stream') estimate = i
          }
        }
      }
    }

    // Fast attack, slower release: words pop, pauses settle.
    level += (goal - level) * (goal > level ? 0.45 : 0.16)
    if (level < 0.002) level = 0
    write(level)
    if (estimate !== estimatedWordIndex.value) estimatedWordIndex.value = estimate

    if (playing.value || level > 0) rafId = requestAnimationFrame(frame)
  }

  const start = () => {
    if (rafId === null && typeof requestAnimationFrame !== 'undefined') rafId = requestAnimationFrame(frame)
  }

  watch(playing, (on) => { if (on) start() }, { immediate: true })
  watch(target, () => { write(level); if (playing.value) start() })
  // A new sentence starts its own estimate from scratch.
  watch(text, () => { estimatedWordIndex.value = -1 })

  onBeforeUnmount(() => {
    if (rafId !== null) cancelAnimationFrame(rafId)
    rafId = null
  })

  return { estimatedWordIndex }
}
