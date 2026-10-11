// Browser-side Edge TTS synthesizer for native (Capacitor) builds.
//
// The Read Aloud endpoint gates the WebSocket handshake on the User-Agent
// advertising Microsoft Edge ("Edg/" or "EdgA/"); the native shell appends
// that marker via `appendUserAgent` in capacitor.config.ts, which lets the
// WebView talk to the endpoint directly — no Nuxt server required on device.
// Response shape matches /api/tts exactly: { audio: dataUrl, boundaries }.

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4'
const WSS_URL = 'wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1'
const SEC_MS_GEC_VERSION = '1-143.0.3650.96'
const AUDIO_PATH_DELIMITER = 'Path:audio\r\n'
const HEADER_BODY_DELIMITER = '\r\n\r\n'
const DEFAULT_TIMEOUT_MS = 20000
const DEFAULT_ATTEMPTS = 2
const RETRY_DELAY_MS = 350
let speechSocket = null
let socketIdleTimer = null
let synthesisQueue = Promise.resolve()

export const EDGE_TTS_RATE_MAP = Object.freeze({
  '0.75': '-25%',
  '1': '+0%',
  '1.0': '+0%',
  '1.25': '+25%',
  '1.5': '+50%',
  '2': '+100%',
  '2.0': '+100%',
})

export function edgeRateForSpeed(speed) {
  return EDGE_TTS_RATE_MAP[String(speed)] ?? '+0%'
}

export function escapeSsmlText(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function buildEdgeSsml({ text, voice, rate = '+0%' }) {
  return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${escapeSsmlText(voice)}'><prosody rate='${rate}'>${escapeSsmlText(text)}</prosody></voice></speak>`
}

// Windows FILETIME ticks of the current 5-minute window + the trusted client
// token, SHA-256 hashed — the endpoint rejects handshakes without it.
export async function generateSecMsGec(now = Date.now()) {
  const ticks = Math.floor(now / 1000) + 11644473600
  const rounded = ticks - (ticks % 300)
  const data = new TextEncoder().encode(`${rounded * 10000000}${TRUSTED_CLIENT_TOKEN}`)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

function randomRequestId() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

// Binary frames are "<headers>Path:audio\r\n<mp3 bytes>" — return the bytes.
export function extractEdgeAudioPayload(bytes) {
  const delimiter = AUDIO_PATH_DELIMITER
  const limit = Math.min(bytes.length - delimiter.length, 1024)

  for (let start = 0; start <= limit; start += 1) {
    let matched = true
    for (let i = 0; i < delimiter.length; i += 1) {
      if (bytes[start + i] !== delimiter.charCodeAt(i)) {
        matched = false
        break
      }
    }
    if (matched) return bytes.subarray(start + delimiter.length)
  }

  return null
}

// Metadata frames carry {"Metadata":[{"Type":"WordBoundary","Data":{...}}]}.
// Offsets arrive in 100ns ticks; boundaries mirror the server's shape with
// charIndex resolved against the chunk text so word highlighting lines up.
export function appendEdgeWordBoundaries(boundaries, payloadText, searchState) {
  let payload
  try {
    payload = JSON.parse(payloadText)
  } catch {
    return boundaries
  }

  const items = Array.isArray(payload?.Metadata) ? payload.Metadata : []
  for (const meta of items) {
    if (meta?.Type !== 'WordBoundary') continue

    const word = meta.Data?.text?.Text ?? ''
    const offsetTicks = meta.Data?.Offset ?? 0
    const durationTicks = meta.Data?.Duration ?? 0
    const charIdx = word
      ? searchState.lowerText.indexOf(word.toLowerCase(), searchState.searchFrom)
      : -1
    if (charIdx !== -1) searchState.searchFrom = charIdx + word.length

    boundaries.push({
      word,
      offset: offsetTicks / 10_000_000,
      duration: durationTicks / 10_000_000,
      charIndex: charIdx,
    })
  }

  return boundaries
}

function audioPartsToDataUrl(parts) {
  const blob = new Blob(parts, { type: 'audio/mp3' })
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error ?? new Error('Could not encode audio data'))
    reader.readAsDataURL(blob)
  })
}

async function synthesizeOnce({ text, voice, rate, timeoutMs }) {
  const requestId = randomRequestId()
  const secMsGec = await generateSecMsGec()
  const url = `${WSS_URL}?Ocp-Apim-Subscription-Key=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}&ConnectionId=${requestId}`

  return new Promise((resolve, reject) => {
    clearTimeout(socketIdleTimer)
    const ws = speechSocket?.readyState === WebSocket.OPEN ? speechSocket : new WebSocket(url)
    speechSocket = ws
    ws.binaryType = 'arraybuffer'

    const audioParts = []
    const boundaries = []
    const searchState = { lowerText: String(text).toLowerCase(), searchFrom: 0 }
    let settled = false

    const cleanup = (keepConnection = false) => {
      clearTimeout(timer)
      clearTimeout(handshakeTimer)
      ws.onopen = null
      ws.onmessage = null
      ws.onerror = null
      ws.onclose = null
      if (keepConnection && ws.readyState === WebSocket.OPEN) {
        socketIdleTimer = setTimeout(() => {
          if (speechSocket === ws) speechSocket = null
          ws.close()
        }, 45000)
      } else if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        if (speechSocket === ws) speechSocket = null
        try { ws.close() } catch { /* already closing */ }
      }
    }

    const fail = (error) => {
      if (settled) return
      settled = true
      cleanup()
      reject(error)
    }

    const finish = async () => {
      if (settled) return
      settled = true
      cleanup(true)
      if (!audioParts.length) {
        reject(new Error('Edge TTS returned no audio data'))
        return
      }
      try {
        resolve({ audio: await audioPartsToDataUrl(audioParts), boundaries })
      } catch (error) {
        reject(error)
      }
    }

    const timer = setTimeout(() => fail(new Error('Edge TTS timed out')), timeoutMs)
    const handshakeTimer = setTimeout(() => fail(new Error('Edge TTS connection timed out')), 6000)

    const sendRequest = () => {
      clearTimeout(handshakeTimer)
      ws.send(`X-Timestamp:${new Date().toISOString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config${HEADER_BODY_DELIMITER}{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"},"outputFormat":"audio-24khz-96kbitrate-mono-mp3"}}}}`)
      ws.send(`X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml${HEADER_BODY_DELIMITER}${buildEdgeSsml({ text, voice, rate })}`)
    }
    ws.onopen = sendRequest
    if (ws.readyState === WebSocket.OPEN) queueMicrotask(sendRequest)

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        const payload = extractEdgeAudioPayload(new Uint8Array(event.data))
        if (payload?.length) audioParts.push(payload)
        return
      }

      const message = String(event.data)
      if (message.includes('Path:audio.metadata')) {
        const bodyStart = message.indexOf(HEADER_BODY_DELIMITER)
        if (bodyStart !== -1) {
          appendEdgeWordBoundaries(boundaries, message.slice(bodyStart + HEADER_BODY_DELIMITER.length), searchState)
        }
      } else if (message.includes('Path:turn.end')) {
        finish()
      }
    }

    ws.onerror = () => fail(new Error('Edge TTS WebSocket error'))
    ws.onclose = () => {
      // A close before turn.end means the synth was cut short.
      fail(new Error('Edge TTS connection closed before synthesis finished'))
    }
  })
}

async function synthesizeQueuedSpeech({
  text,
  voice,
  speed = 1,
  attempts = DEFAULT_ATTEMPTS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const value = String(text ?? '').trim()
  if (!value) throw new Error('text is required')

  const rate = edgeRateForSpeed(speed)
  let lastError
  let reconnected = false

  for (let attempt = 1; attempt <= Math.max(1, attempts); attempt += 1) {
    const reusedConnection = speechSocket?.readyState === WebSocket.OPEN
    try {
      return await synthesizeOnce({ text: value, voice, rate, timeoutMs })
    } catch (error) {
      lastError = error
      // A server can close an idle socket just as the next turn is sent.
      // Reconnect once without changing narrator or spending a retry delay.
      if (reusedConnection && !reconnected) {
        reconnected = true
        attempt -= 1
        continue
      }
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt))
      }
    }
  }

  throw lastError
}

// A socket handles one turn at a time. Sharing it avoids three simultaneous
// handshakes when playback and two prefetch requests start together.
export function synthesizeEdgeSpeechInBrowser(options = {}) {
  const request = synthesisQueue.then(() => synthesizeQueuedSpeech(options))
  synthesisQueue = request.catch(() => {})
  return request
}
