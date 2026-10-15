import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const file = new URL('../android/app/libs/sherpa-onnx-1.13.8.aar', import.meta.url)
const sha = '633c24321e06b1fe79fEafa03ea16cbc0f8a286641e2da3559bac91bdb13bd96'.toLowerCase()
const valid = bytes => createHash('sha256').update(bytes).digest('hex') === sha
try { if (valid(await readFile(file))) process.exit(0) } catch {}
const response = await fetch('https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.13.8/sherpa-onnx-1.13.8.aar')
if (!response.ok) throw new Error(`Speech runtime download failed: ${response.status}`)
const bytes = Buffer.from(await response.arrayBuffer())
if (!valid(bytes)) throw new Error('Speech runtime checksum mismatch')
await mkdir(new URL('../android/app/libs/', import.meta.url), { recursive: true })
await writeFile(new URL(file.href + '.part'), bytes)
await rename(new URL(file.href + '.part'), file)
console.log('Verified Android speech runtime 1.13.8')
