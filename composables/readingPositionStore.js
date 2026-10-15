import { Capacitor } from '@capacitor/core'
import { openLibraryDB, nextTimestamp, toPlainRecord } from './useLibraryStore'
import { validReadingLocation, sameReadingLocation, READING_POSITION_FIELDS } from '../utils/readingLocation'

export const POSITION_PREFIX = 'bookish:reading-position:'
export const POSITION_FIELDS = READING_POSITION_FIELDS
const writers = new Set()
const storage = () => { try { return globalThis.localStorage } catch { return null } }
const parse = raw => { try { return JSON.parse(raw || 'null') } catch { return null } }
const nativeMirror = async () => {
  if (!Capacitor.isNativePlatform()) return null
  const { Preferences } = await import('@capacitor/preferences')
  // Capacitor proxies manufacture a method for any property, including
  // `then`. Returning one directly from an async function makes JS treat it
  // as a promise and call the nonexistent native Preferences.then method.
  return {
    get: options => Preferences.get(options),
    set: options => Preferences.set(options),
    remove: options => Preferences.remove(options),
  }
}

// A single transaction reads the current book and patches only position fields.
// Metadata edits cannot be overwritten by a stale reader snapshot.
async function mutateBook(bookId, mutate) {
  const db = await openLibraryDB()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('books', 'readwrite')
      const store = tx.objectStore('books')
      const request = store.get(bookId)
      let result; let failure
      request.onsuccess = () => {
        try {
          if (!request.result) throw new Error('This book is no longer in the library.')
          result = mutate(request.result)
          if (result) store.put(toPlainRecord(result))
        } catch (error) { failure = error; tx.abort() }
      }
      tx.oncomplete = () => resolve(result)
      tx.onerror = () => reject(failure || tx.error || new Error('Position could not be saved.'))
      tx.onabort = () => reject(failure || tx.error || new Error('Position save was interrupted.'))
    })
  } finally { db.close() }
}

function applyCheckpoint(book, checkpoint) {
  if (!checkpoint || checkpoint.bookId !== book.id || !validReadingLocation(checkpoint.position)) return book
  if (checkpoint.epoch !== (book.readingPositionEpoch || 0) || !Number.isSafeInteger(checkpoint.sequence)
    || checkpoint.sequence <= (book.readingPositionSequence || 0)) return book
  const location = checkpoint.position
  return {
    ...book,
    progress: Math.max(0, Math.min(100, Number(checkpoint.summary?.progress) || 0)),
    status: ['Unread', 'Reading', 'Read'].includes(checkpoint.summary?.status) ? checkpoint.summary.status : 'Reading',
    lastReadAt: Number.isFinite(Date.parse(checkpoint.summary?.lastReadAt)) ? checkpoint.summary.lastReadAt : book.lastReadAt,
    previousReadingPosition: validReadingLocation(book.readingPosition) ? book.readingPosition : book.previousReadingPosition,
    readingPosition: location, readingPositionSequence: checkpoint.sequence,
    readingChunk: location.chunk,
    ...(location.format === 'pdf' ? { readingPdfPage: location.pdfPage, readingPdfView: location.view } : {}),
    updatedAt: nextTimestamp(book.updatedAt),
  }
}

export async function openReadingPosition(bookId, options = {}) {
  const local = options.storage ?? storage()
  const mirror = options.mirror === undefined ? await nativeMirror() : options.mirror
  const key = POSITION_PREFIX + bookId
  let localPending = null; let nativePending = null
  try { localPending = parse(local?.getItem(key)) } catch {}
  try { nativePending = parse((await mirror?.get({ key }))?.value) } catch {}
  const book = await mutateBook(bookId, current => {
    // Recover the newest journal BEFORE claiming the next session. A late save
    // from an older reader is subsequently rejected by the epoch check.
    for (const pending of [localPending, nativePending].filter(Boolean).sort((a, b) => a.sequence - b.sequence)) {
      current = applyCheckpoint(current, pending)
    }
    return { ...current, readingPositionEpoch: (current.readingPositionEpoch || 0) + 1, readingPositionSequence: 0 }
  })
  const epoch = book.readingPositionEpoch
  let sequence = 0; let pending = null; let inFlight = null; let closed = false
  let lastLocation = book.readingPosition
  let retryTimer = null
  let lastError = null

  const drain = () => {
    if (inFlight) return inFlight
    inFlight = (async () => {
      while (pending && !closed) {
        const checkpoint = pending
        let mirrorWrite
        try {
          // Preferences is a small native recovery mirror, not the library DB.
          // Serialize it with DB writes so old native calls cannot land last.
          mirrorWrite = mirror?.set({ key, value: JSON.stringify(checkpoint) }).catch(() => {})
          const saved = await mutateBook(bookId, current => {
            if (current.readingPositionEpoch !== epoch) throw new Error('Reading session was replaced.')
            return applyCheckpoint(current, checkpoint)
          })
          await mirrorWrite
          lastLocation = checkpoint.position
          lastError = null
          if (pending === checkpoint) pending = null
          try { options.onSaved?.(saved) } catch (error) { console.error('[ReadingPosition] Observer failed:', error) }
        } catch (error) {
          await mirrorWrite
          lastError = error
          options.onError?.(error)
          // Keep the latest dirty location. Never mark an optimistic UI state
          // as committed; an unchanged location must still retry a failed write.
          break
        }
      }
    })().finally(() => { inFlight = null })
    return inFlight
  }

  const writer = {
    book,
    capture(position, summary) {
      if (closed || !validReadingLocation(position)) return false
      if (sameReadingLocation(pending?.position || lastLocation, position) && !lastError) return false
      pending = {
        bookId, epoch, sequence: ++sequence, position: toPlainRecord(position),
        // Accept a narrow summary, never arbitrary book metadata from callers.
        summary: { progress: Math.max(0, Math.min(100, Number(summary?.progress) || 0)),
          status: ['Unread', 'Reading', 'Read'].includes(summary?.status) ? summary.status : 'Reading',
          lastReadAt: new Date().toISOString() },
      }
      // Synchronous recovery checkpoint before the first await. No trailing
      // debounce: continuous scrolling and quick page turns cannot starve it.
      try { local?.setItem(key, JSON.stringify(pending)) } catch (error) { options.onError?.(error) }
      void drain().then(() => {
        if (pending && !closed && !retryTimer) retryTimer = setTimeout(() => {
          retryTimer = null
          void drain()
        }, 1000)
      })
      return true
    },
    async flush() {
      await drain()
      if (pending && !closed) { await drain(); if (pending) throw lastError || new Error('Position is not saved yet.') }
    },
    async close() {
      try { await this.flush() } finally {
        closed = true
        if (retryTimer) clearTimeout(retryTimer)
        writers.delete(writer)
      }
    },
  }
  writers.add(writer)
  return writer
}

// Used only for explicit backup replacement/reset. Stop pending writers first
// so an old callback cannot recreate a checkpoint after the reset.
export async function flushReadingPositions() {
  await Promise.all([...writers].map(writer => writer.flush()))
}

export async function clearReadingPositionJournals(bookIds) {
  await Promise.allSettled([...writers].map(writer => writer.close()))
  const mirror = await nativeMirror()
  for (const id of bookIds) {
    const key = POSITION_PREFIX + id
    try { storage()?.removeItem(key) } catch {}
    await mirror?.remove({ key })
    try { storage()?.removeItem(`bookish:paged-pos:${id}`) } catch {}
  }
}
