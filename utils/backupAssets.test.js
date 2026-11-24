import { describe, expect, it } from 'vitest'
import { ASSET_MARKER, assetRef, markAsset, mergeHeavyFields, splitHeavyFields } from './backupAssets'
import { decodeBackupPayload, encodeBackupPayload } from './backupCodec'

const bigCover = `data:image/jpeg;base64,${'A'.repeat(5000)}`
const bigContent = Array.from({ length: 300 }, (_, i) => ({ id: i, text: `Chapter ${i} — “text”` }))

describe('backupAssets', () => {
  it('moves embedded covers and large content out, losslessly', async () => {
    const book = { id: 'b1', title: 'T', cover: bigCover, content: bigContent, progress: 0.4 }
    const { light, heavy } = splitHeavyFields(book)
    expect(light.cover).toBeUndefined()
    expect(light.content).toBeUndefined()
    expect(Object.keys(heavy).sort()).toEqual(['content', 'cover'])

    const encoded = await encodeBackupPayload(heavy)
    const marked = markAsset(light, encoded.sha256, Object.keys(heavy))
    expect(assetRef(marked).sha256).toBe(encoded.sha256)

    const restored = mergeHeavyFields(marked, await decodeBackupPayload(encoded.bytes, encoded.sha256))
    expect(restored).toEqual(book)
    expect(ASSET_MARKER in restored).toBe(false)
  })

  it('leaves remote cover URLs and small records inline', () => {
    const book = { id: 'b2', cover: 'https://covers.example/1.jpg', content: 'short' }
    const { light, heavy } = splitHeavyFields(book)
    expect(heavy).toBeNull()
    expect(light).toBe(book)
  })

  it('gives identical heavy fields the same content name', async () => {
    const a = await encodeBackupPayload(splitHeavyFields({ id: 1, cover: bigCover }).heavy)
    const b = await encodeBackupPayload(splitHeavyFields({ id: 2, cover: bigCover }).heavy)
    expect(a.sha256).toBe(b.sha256)
  })
})
