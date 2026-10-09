export const TTS_WORDS_PER_MIN = 145

export function chunkIndexAtEstimatedSecond(chunks, second, speed = 1) {
  if (!chunks?.length) return 0
  const rate = Math.max(0.5, Number(speed) || 1)
  let elapsed = 0
  for (let index = 0; index < chunks.length; index += 1) {
    const words = (String(chunks[index] || '').match(/\S+/g) || []).length || 1
    elapsed += words * 60 / (TTS_WORDS_PER_MIN * rate)
    if (second < elapsed) return index
  }
  return chunks.length - 1
}
