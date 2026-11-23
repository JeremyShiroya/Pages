import { Capacitor } from '@capacitor/core'
import { openLibraryDB, nextTimestamp, toPlainRecord } from './useLibraryStore'
import { validReadingLocation, sameReadingLocation, READING_POSITION_FIELDS } from '../utils/readingLocation'

export const POSITION_PREFIX = 'bookish:reading-position:'
export const POSITION_FIELDS = READING_POSITION_FIELDS
// Consecutive failed writes before the reader is told its position is at risk.
export const PERSISTENT_FAILURES = 3
const PAGE_MAP_PREFIX = 'bookish:page-map:'
const writers = new Set()

// localStorage is shared by every cache in the app. When it fills up, drop what
// can be rebuilt (page maps are re-measured on open; other books' journals are
// already committed to the database by the time anyone reads again).
function freeJournalSpace(local, keepKey, prefix) {
  try {
    const removable = []
    for (let i = 0; i < local.length; i += 1) {
      const name = local.key(i)
      if (name && name !== keepKey && name.startsWith(prefix)) removable.push(name)
    }
    for (const name of removable) local.removeItem(name)
  } catch {}
}
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
  // Consecutive failed database writes. A single failure is routine on a busy
  // phone (the WebView suspending, a long transaction elsewhere) and the
  // journal already holds the position, so the reader is only told once a
  // failure has proven persistent. Reporting every attempt is what turned a
  // transient hiccup into an endless stream of "could not be saved" toasts.
  let failures = 0
  let reported = false
  // Set when this writer can never succeed again: a newer reader session owns
  // the record, or the record is gone (deleted, or merged into another one by
  // the device library scan). Neither is the user's problem to fix.
  let stopped = null

  const report = (error) => {
    if (reported) return
    reported = true
    try { options.onError?.(error) } catch (observerError) { console.error('[ReadingPosition] Observer failed:', observerError) }
  }

  const scheduleRetry = () => {
    if (retryTimer || closed || stopped || !pending) return
    // 1s, 2s, 4s … capped at 15s: keeps retrying for as long as the reader is
    // open without hammering a database that is genuinely unavailable.
    const delay = Math.min(15000, 1000 * 2 ** Math.max(0, failures - 1))
    retryTimer = setTimeout(() => {
      retryTimer = null
      void drain().then(scheduleRetry)
    }, delay)
  }

  const drain = () => {
    if (inFlight) return inFlight
    inFlight = (async () => {
      while (pending && !closed && !stopped) {
        const checkpoint = pending
        let mirrorWrite
        try {
          // Preferences is a small native recovery mirror, not the library DB.
          // Serialize it with DB writes so old native calls cannot land last.
          mirrorWrite = Promise.resolve(mirror?.set({ key, value: JSON.stringify(checkpoint) })).catch(() => {})
          const saved = await mutateBook(bookId, current => {
            if (current.readingPositionEpoch !== epoch) {
              throw Object.assign(new Error('Reading session was replaced.'), { terminal: 'superseded' })
            }
            return applyCheckpoint(current, checkpoint)
          })
          await mirrorWrite
          lastLocation = checkpoint.position
          lastError = null
          failures = 0
          if (pending === checkpoint) pending = null
          try { options.onSaved?.(saved) } catch (error) { console.error('[ReadingPosition] Observer failed:', error) }
        } catch (error) {
          await mirrorWrite
          lastError = error
          if (error?.terminal || /no longer in the library/i.test(String(error?.message))) {
            stopped = error.terminal || 'missing'
            console.warn(`[ReadingPosition] Writer for ${bookId} stopped (${stopped}).`)
            break
          }
          failures += 1
          console.warn(`[ReadingPosition] Save attempt ${failures} failed:`, error)
          if (failures >= PERSISTENT_FAILURES) report(error)
          // Keep the latest dirty location. Never mark an optimistic UI state
          // as committed; an unchanged location must still retry a failed write.
          break
        }
      }
    })().finally(() => { inFlight = null })
    return inFlight
  }

  const writeJournal = (checkpoint) => {
    if (!local) return
    const value = JSON.stringify(checkpoint)
    try { local.setItem(key, value); return } catch {}
    // Quota exceeded. Page maps are re-measured on open, and other books'
    // journals are insurance for writes that almost always already landed;
    // this book's live position is neither. Make room, then retry.
    for (const prefix of [PAGE_MAP_PREFIX, POSITION_PREFIX]) {
      freeJournalSpace(local, key, prefix)
      try { local.setItem(key, value); return } catch {}
    }
    // The database write below is still the primary save; the journal is only
    // crash insurance, so this alone is not worth interrupting reading.
    console.warn('[ReadingPosition] Recovery journal unavailable; relying on the database write.')
  }

  const writer = {
    book,
    get stopped() { return stopped },
    capture(position, summary) {
      if (closed || stopped || !validReadingLocation(position)) return false
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
      writeJournal(pending)
      void drain().then(scheduleRetry)
      return true
    },
    async flush() {
      await drain()
      if (pending && !closed && !stopped) await drain()
      if (stopped) throw lastError
      if (pending && !closed) throw lastError || new Error('Position is not saved yet.')
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
  // A stopped writer (superseded or deleted book) has nothing left to save.
  await Promise.all([...writers].map(writer => writer.flush().catch((error) => {
    if (!writer.stopped) throw error
  })))
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
