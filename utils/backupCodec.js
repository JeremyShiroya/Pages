// Lossless compression for cloud backups.
//
// Why gzip via CompressionStream:
// - It is native code in every WebView/Chrome we ship to (and Node 18+ for
//   tests), so it runs far faster than any JS port of zstd/brotli and adds
//   nothing to the bundle.
// - Backups are JSON text, which gzip shrinks by ~80-90%. EPUB/PDF bytes are
//   already compressed and are not what we send through here.
// - It is lossless by definition; on top of that every payload carries the
//   SHA-256 of the UNcompressed bytes, and decode refuses anything whose hash
//   does not match, so a truncated or corrupted download can never be
//   half-restored.

export const BACKUP_FORMAT_VERSION = 1

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

async function pipeThrough(bytes, transform) {
  const stream = new Blob([bytes]).stream().pipeThrough(transform)
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

export async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function gzipBytes(bytes) {
  return pipeThrough(bytes, new CompressionStream('gzip'))
}

export async function gunzipBytes(bytes) {
  return pipeThrough(bytes, new DecompressionStream('gzip'))
}

/**
 * Serialize + compress a JSON-safe value.
 * @returns {Promise<{ bytes: Uint8Array, sha256: string, rawBytes: number, storedBytes: number }>}
 */
export async function encodeBackupPayload(value) {
  const raw = textEncoder.encode(JSON.stringify(value))
  const [bytes, sha256] = await Promise.all([gzipBytes(raw), sha256Hex(raw)])
  return { bytes, sha256, rawBytes: raw.byteLength, storedBytes: bytes.byteLength }
}

/**
 * Decompress + verify + parse. Throws if the hash does not match.
 * @param {Uint8Array|ArrayBuffer|Blob} input
 * @param {string} [expectedSha256] skip verification only when unknown
 */
export async function decodeBackupPayload(input, expectedSha256) {
  const compressed = input instanceof Blob
    ? new Uint8Array(await input.arrayBuffer())
    : input instanceof Uint8Array ? input : new Uint8Array(input)
  const raw = await gunzipBytes(compressed)
  if (expectedSha256) {
    const actual = await sha256Hex(raw)
    if (actual !== expectedSha256) {
      throw new Error('Backup failed its integrity check. It was not restored.')
    }
  }
  return JSON.parse(textDecoder.decode(raw))
}
