import { TTS_WORDS_PER_MIN } from './tts/timing'

export function estimatedListenTimeline(chunks, speed = 1) {
  const prefix = [0]
  const rate = Math.max(0.5, Number(speed) || 1)
  for (const chunk of chunks || []) {
    const count = (String(chunk || '').match(/\S+/g) || []).length || 1
    prefix.push(prefix[prefix.length - 1] + count * 60 / (TTS_WORDS_PER_MIN * rate))
  }
  return prefix
}

export function scopedListenProgress(prefix, chunk, start = 0, end = prefix.length - 2, fraction = 0) {
  if (!prefix || prefix.length < 2) return { start: 0, end: 0, total: 0, elapsed: 0, percent: 0 }
  const max = Math.max(0, prefix.length - 2)
  const from = Math.max(0, Math.min(max, Number(start) || 0))
  const through = Math.max(from, Math.min(max, Number(end) || 0))
  const current = Math.max(from, Math.min(through + 1, Number(chunk) || 0))
  const total = Math.max(0, prefix[through + 1] - prefix[from])
  const partial = current <= through
    ? (prefix[current + 1] - prefix[current]) * Math.max(0, Math.min(1, Number(fraction) || 0))
    : 0
  const elapsed = Math.max(0, prefix[current] + partial - prefix[from])
  return { start: from, end: through, total, elapsed, percent: total > 0 ? Math.round(elapsed / total * 100) : 0 }
}
