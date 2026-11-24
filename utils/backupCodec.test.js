import { describe, expect, it } from 'vitest'
import { decodeBackupPayload, encodeBackupPayload, gunzipBytes, gzipBytes, sha256Hex } from './backupCodec'

describe('backupCodec', () => {
  it('round-trips a library snapshot losslessly', async () => {
    const snapshot = {
      app: 'Pages',
      books: Array.from({ length: 200 }, (_, i) => ({
        id: `book-${i}`,
        title: `Title ${i} — “quoted” ünïcödé 📚`,
        progress: i / 200,
        tags: ['a', 'b', null],
        nested: { deep: { value: i % 2 === 0, n: -0.5 } },
      })),
    }
    const encoded = await encodeBackupPayload(snapshot)
    expect(encoded.storedBytes).toBeLessThan(encoded.rawBytes / 3)
    const decoded = await decodeBackupPayload(encoded.bytes, encoded.sha256)
    expect(decoded).toEqual(snapshot)
  })

  it('round-trips arbitrary bytes exactly', async () => {
    const bytes = new Uint8Array(4096).map((_, i) => (i * 31) % 256)
    const back = await gunzipBytes(await gzipBytes(bytes))
    expect(await sha256Hex(back)).toBe(await sha256Hex(bytes))
  })

  it('rejects a payload whose hash does not match', async () => {
    const encoded = await encodeBackupPayload({ a: 1 })
    await expect(decodeBackupPayload(encoded.bytes, 'deadbeef')).rejects.toThrow(/integrity/)
  })

  it('rejects corrupted bytes', async () => {
    const encoded = await encodeBackupPayload({ a: 'x'.repeat(1000) })
    const broken = encoded.bytes.slice(0, Math.floor(encoded.bytes.length / 2))
    await expect(decodeBackupPayload(broken, encoded.sha256)).rejects.toThrow()
  })
})
