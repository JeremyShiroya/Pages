
import { mergeAutomaticMetadata } from './metadataPolicy'
import { recoverLegacyMetadata } from './metadataRecovery'
export const LIBRARY_DB_NAME = 'bookish-library'
const DB_NAME = LIBRARY_DB_NAME
// v4 adds document intelligence records. Version bumps must only ever
// ADD stores here — existing ones hold the user's whole library.
const DB_VERSION = 4
export const PROFILE_ID = 'local'
export const DEFAULT_PROFILE = Object.freeze({
  id: PROFILE_ID,
  displayName: 'Reader',
  avatarType: 'image',
  avatarValue: '/images/User%20Avatars/default-user.jpeg',
  profileTextMode: 'compliment',
  bio: '',
})

const PROFILE_AVATAR_TYPES = new Set(['preset', 'image'])
const USER_AVATAR_PATH_PREFIX = '/images/User%20Avatars/'
const LEGACY_USER_AVATAR_PATH_PREFIX = '/Images/User%20Avatars/'

// IndexedDB's structured clone cannot serialize Vue reactive proxies — passing
// one to `put()` throws DataCloneError ("#<Object> could not be cloned"), and a
// shallow spread doesn't help because nested arrays/objects stay reactive. Every
// write therefore goes through a deep plain-object snapshot first. Without this,
// edits and progress saves fail silently while the UI still reports success.
export function toPlainRecord(value) {
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return value
  }
}

export function nextTimestamp(previousTimestamp) {
  const now = new Date()
  if (!previousTimestamp) return now.toISOString()

  const previous = Date.parse(previousTimestamp)
  if (!Number.isFinite(previous) || now.getTime() > previous) return now.toISOString()

  return new Date(previous + 1).toISOString()
}

// Exported so other stores (annotations) share this connection and its
// upgrade path instead of opening the same database with their own version.
export function openLibraryDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('books')) {
        db.createObjectStore('books', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('collections')) {
        db.createObjectStore('collections', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('profiles')) {
        db.createObjectStore('profiles', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('annotations')) {
        const store = db.createObjectStore('annotations', { keyPath: 'id' })
        // Every read is "the annotations for this book", so index the book.
        store.createIndex('bookId', 'bookId', { unique: false })
      }
      for (const name of ['documentEvidence', 'documentDecisions', 'metadataCandidates', 'intelligenceJobs']) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'bookId' })
      }
    }
    request.onsuccess = (e) => resolve(e.target.result)
    request.onerror = (e) => reject(e.target.error)
  })
}

export function normalizeProfile(profile, existing = null) {
  const source = profile && typeof profile === 'object' ? profile : {}
  const displayName = String(source.displayName ?? existing?.displayName ?? DEFAULT_PROFILE.displayName)
    .trim()
    .slice(0, 32)
  const avatarType = PROFILE_AVATAR_TYPES.has(source.avatarType)
    ? source.avatarType
    : existing?.avatarType || DEFAULT_PROFILE.avatarType
  const rawAvatarValue = String(source.avatarValue ?? existing?.avatarValue ?? DEFAULT_PROFILE.avatarValue).trim()
  const normalizedAvatarValue = rawAvatarValue.startsWith(LEGACY_USER_AVATAR_PATH_PREFIX)
    ? `${USER_AVATAR_PATH_PREFIX}${rawAvatarValue.slice(LEGACY_USER_AVATAR_PATH_PREFIX.length)}`
    : rawAvatarValue
  const avatarValue = normalizedAvatarValue.startsWith(USER_AVATAR_PATH_PREFIX)
    || (/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(normalizedAvatarValue) && normalizedAvatarValue.length <= 1_000_000)
    ? normalizedAvatarValue
    : DEFAULT_PROFILE.avatarValue

  return {
    ...DEFAULT_PROFILE,
    ...existing,
    id: PROFILE_ID,
    displayName: displayName || DEFAULT_PROFILE.displayName,
    avatarType: avatarType === 'preset' ? 'image' : avatarType,
    avatarValue: avatarValue || DEFAULT_PROFILE.avatarValue,
    profileTextMode: (source.profileTextMode ?? existing?.profileTextMode) === 'bio' ? 'bio' : 'compliment',
    bio: String(source.bio ?? existing?.bio ?? '').trim().slice(0, 240),
  }
}

export const useLibraryStore = () => {
  const getBooks = async () => {
    const db = await openLibraryDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['books', 'documentEvidence'], 'readwrite')
      const req = tx.objectStore('books').getAll()
      let records = []
      req.onsuccess = (e) => {
        records = e.target.result
        records.forEach((book, index) => {
          if (book.metadataRecoveryVersion === 2 || book.format !== 'pdf' || !book.intelligence?.engineVersion || book.intelligence.engineVersion > 2 && book.metadataRecoveryVersion !== 1) return
          const evidenceRequest = tx.objectStore('documentEvidence').get(book.id)
          evidenceRequest.onsuccess = () => {
            const recovered = recoverLegacyMetadata(book, evidenceRequest.result)
            records[index] = { ...recovered, updatedAt: nextTimestamp(book.updatedAt) }
            tx.objectStore('books').put(records[index])
          }
        })
      }
      tx.oncomplete = () => resolve(records)
      tx.onerror = (e) => reject(e.target.error)
      tx.onabort = (e) => reject(e.target.error ?? new DOMException('Transaction aborted'))
    })
  }

  const addBook = async (bookData) => {
    const now = new Date().toISOString()
    const book = toPlainRecord({ ...bookData, id: crypto.randomUUID(), createdAt: now, updatedAt: now })
    const db = await openLibraryDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction('books', 'readwrite')
      tx.objectStore('books').put(book)
      tx.oncomplete = () => resolve()
      tx.onerror = (e) => reject(e.target.error)
      tx.onabort = (e) => reject(e.target.error ?? new DOMException('Transaction aborted'))
    })
    return book
  }

  // Device scans can race a format switch, an Open-with import, or a restart.
  // Check the complete store (including hidden books) and insert in one
  // readwrite transaction so one physical path can acquire only one record.
  const addDeviceBookIfAbsent = async (bookData) => {
    const path = String(bookData?.deviceImportPath || '')
    if (!path) throw new Error('A device import needs a file path')
    const now = new Date().toISOString()
    const candidate = toPlainRecord({ ...bookData, id: crypto.randomUUID(), createdAt: now, updatedAt: now })
    const db = await openLibraryDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('books', 'readwrite')
      const store = tx.objectStore('books')
      let result = null
      const request = store.getAll()
      request.onsuccess = () => {
        const existing = request.result.find((book) => book.deviceImportPath === path)
        if (existing) result = { book: existing, created: false }
        else {
          result = { book: candidate, created: true }
          store.put(candidate)
        }
      }
      tx.oncomplete = () => resolve(result)
      tx.onerror = (event) => reject(event.target.error)
      tx.onabort = (event) => reject(event.target.error ?? new DOMException('Transaction aborted'))
    })
  }

  // Repair records produced by older scan races. Remap playlists and notes in
  // the same transaction as the delete, so nothing can point at a lost id.
  const mergeDuplicateDeviceBooks = async (path, keeperId) => {
    const db = await openLibraryDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['books', 'collections', 'annotations'], 'readwrite')
      const bookStore = tx.objectStore('books')
      const collectionStore = tx.objectStore('collections')
      const annotationStore = tx.objectStore('annotations')
      const values = {}
      let removedIds = []
      const maybeMerge = () => {
        if (!values.books || !values.collections || !values.annotations) return
        const matches = values.books.filter((book) => book.deviceImportPath === path)
        const keeper = matches.find((book) => book.id === keeperId)
        if (!keeper || matches.length < 2) return
        const losers = matches.filter((book) => book.id !== keeperId)
        removedIds = losers.map((book) => book.id)
        const merged = { ...keeper }
        const keepFields = new Set(['id', 'deviceImportPath', 'createdAt', 'updatedAt', 'progress', 'status', 'lastReadAt', 'isFavourite', 'isHidden'])
        for (const loser of losers) {
          for (const [field, value] of Object.entries(loser)) {
            if (keepFields.has(field) || value === null || value === undefined || value === '') continue
            if (merged[field] === null || merged[field] === undefined || merged[field] === '') merged[field] = value
          }
          if ((Number(loser.progress) || 0) > (Number(merged.progress) || 0)) {
            merged.progress = loser.progress
            merged.status = loser.status
          }
          if (String(loser.lastReadAt || '') > String(merged.lastReadAt || '')) merged.lastReadAt = loser.lastReadAt
          merged.isFavourite = !!(merged.isFavourite || loser.isFavourite)
          merged.isHidden = !!(merged.isHidden && loser.isHidden)
        }
        merged.updatedAt = nextTimestamp(merged.updatedAt)
        bookStore.put(toPlainRecord(merged))
        for (const id of removedIds) bookStore.delete(id)
        const removed = new Set(removedIds.map(String))
        for (const collection of values.collections) {
          if (!(collection.bookIds || []).some((id) => removed.has(String(id)))) continue
          collection.bookIds = [...new Set(collection.bookIds.map((id) => removed.has(String(id)) ? keeperId : id))]
          collection.updatedAt = nextTimestamp(collection.updatedAt)
          collectionStore.put(collection)
        }
        for (const annotation of values.annotations) {
          if (removed.has(String(annotation.bookId))) {
            annotationStore.put({ ...annotation, bookId: String(keeperId) })
          }
        }
      }
      for (const [name, store] of [['books', bookStore], ['collections', collectionStore], ['annotations', annotationStore]]) {
        const request = store.getAll()
        request.onsuccess = () => { values[name] = request.result; maybeMerge() }
      }
      tx.oncomplete = () => resolve(removedIds)
      tx.onerror = (event) => reject(event.target.error)
      tx.onabort = (event) => reject(event.target.error ?? new DOMException('Transaction aborted'))
    })
  }

  const updateBook = async (book, { automaticMetadata = false } = {}) => {
    let updated = toPlainRecord({ ...book, updatedAt: nextTimestamp(book.updatedAt) })
    const db = await openLibraryDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction('books', 'readwrite')
      const store = tx.objectStore('books')
      const request = store.get(updated.id)
      request.onsuccess = () => {
        // A delayed metadata update must not recreate a book removed by a
        // format switch while its network request was in flight.
        if (!request.result) {
          tx.abort()
          return
        }
        if (automaticMetadata) {
          const current = request.result
          if (book.updatedAt && book.updatedAt !== current.updatedAt) { tx.abort(); return }
          updated = toPlainRecord({ ...mergeAutomaticMetadata(current, book), updatedAt: nextTimestamp(current.updatedAt) })
        }
        store.put(updated)
      }
      tx.oncomplete = () => resolve()
      tx.onerror = (e) => reject(e.target.error)
      tx.onabort = (e) => reject(e.target.error ?? new Error(`Book ${updated.id} no longer exists`))
    })
    return updated
  }

  const deleteBook = async (id) => {
    const db = await openLibraryDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('books', 'readwrite')
      tx.objectStore('books').delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = (e) => reject(e.target.error)
      tx.onabort = (e) => reject(e.target.error ?? new DOMException('Transaction aborted'))
    })
  }

  const getCollections = async () => {
    const db = await openLibraryDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('collections', 'readonly')
      const req = tx.objectStore('collections').getAll()
      req.onsuccess = (e) => resolve(e.target.result)
      req.onerror = (e) => reject(e.target.error)
    })
  }

  const addCollection = async (collectionData) => {
    const now = new Date().toISOString()
    const collection = toPlainRecord({
      ...collectionData,
      id: crypto.randomUUID(),
      bookIds: collectionData.bookIds || [],
      createdAt: now,
      updatedAt: now,
    })
    const db = await openLibraryDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction('collections', 'readwrite')
      tx.objectStore('collections').put(collection)
      tx.oncomplete = () => resolve()
      tx.onerror = (e) => reject(e.target.error)
      tx.onabort = (e) => reject(e.target.error ?? new DOMException('Transaction aborted'))
    })
    return collection
  }

  const updateCollection = async (collection) => {
    const db = await openLibraryDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('collections', 'readwrite')
      const store = tx.objectStore('collections')
      const request = store.get(collection.id)
      let updated = null
      request.onsuccess = (event) => {
        const existing = event.target.result
        if (!existing) {
          reject(new Error(`Collection ${collection.id} not found`))
          tx.abort()
          return
        }
        updated = {
          ...existing,
          name: String(collection.name || '').trim(),
          updatedAt: nextTimestamp(existing.updatedAt),
        }
        store.put(updated)
      }
      tx.oncomplete = () => resolve(updated)
      tx.onerror = (e) => reject(e.target.error)
      tx.onabort = (e) => reject(e.target.error ?? new DOMException('Transaction aborted'))
    })
  }

  const deleteCollection = async (id) => {
    const db = await openLibraryDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('collections', 'readwrite')
      tx.objectStore('collections').delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = (e) => reject(e.target.error)
      tx.onabort = (e) => reject(e.target.error ?? new DOMException('Transaction aborted'))
    })
  }

  const getProfile = async () => {
    const db = await openLibraryDB()
    const profile = await new Promise((resolve, reject) => {
      const tx = db.transaction('profiles', 'readonly')
      const req = tx.objectStore('profiles').get(PROFILE_ID)
      req.onsuccess = (e) => resolve(e.target.result ?? null)
      req.onerror = (e) => reject(e.target.error)
    })

    return normalizeProfile(profile)
  }

  const saveProfile = async (profileData) => {
    const db = await openLibraryDB()
    const now = new Date().toISOString()
    const updated = await new Promise((resolve, reject) => {
      const tx = db.transaction('profiles', 'readwrite')
      const store = tx.objectStore('profiles')
      const req = store.get(PROFILE_ID)
      let profile = null

      req.onsuccess = (event) => {
        const existing = event.target.result ?? null
        profile = toPlainRecord({
          ...normalizeProfile(profileData, existing),
          createdAt: existing?.createdAt || now,
          updatedAt: nextTimestamp(existing?.updatedAt),
        })
        store.put(profile)
      }

      tx.oncomplete = () => resolve(profile)
      tx.onerror = (e) => reject(e.target.error)
      tx.onabort = (e) => reject(e.target.error ?? new DOMException('Transaction aborted'))
    })

    return updated
  }

  const addBookToCollection = async (collectionId, bookId) => {
    const db = await openLibraryDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('collections', 'readwrite')
      const store = tx.objectStore('collections')
      const req = store.get(collectionId)
      req.onsuccess = (e) => {
        const collection = e.target.result
        if (!collection) {
          reject(new Error(`Collection ${collectionId} not found`))
          tx.abort()
          return
        }
        if (!collection.bookIds.includes(bookId)) {
          collection.bookIds = [...collection.bookIds, bookId]
          collection.updatedAt = nextTimestamp(collection.updatedAt)
          store.put(collection)
        }
      }
      tx.oncomplete = () => resolve()
      tx.onerror = (e) => reject(e.target.error)
      tx.onabort = (e) => reject(e.target.error ?? new DOMException('Transaction aborted'))
    })
  }

  const removeBookFromCollection = async (collectionId, bookId) => {
    const db = await openLibraryDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('collections', 'readwrite')
      const store = tx.objectStore('collections')
      const req = store.get(collectionId)
      req.onsuccess = (e) => {
        const collection = e.target.result
        if (!collection) {
          reject(new Error(`Collection ${collectionId} not found`))
          tx.abort()
          return
        }
        if (collection.bookIds.some((id) => String(id) === String(bookId))) {
          collection.bookIds = collection.bookIds.filter((id) => String(id) !== String(bookId))
          collection.updatedAt = nextTimestamp(collection.updatedAt)
          store.put(collection)
        }
      }
      tx.oncomplete = () => resolve()
      tx.onerror = (e) => reject(e.target.error)
      tx.onabort = (e) => reject(e.target.error ?? new DOMException('Transaction aborted'))
    })
  }

  const updateAuthorImage = async (authorName, imageUrl) => {
    const db = await openLibraryDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction('books', 'readwrite')
      const store = tx.objectStore('books')
      const req = store.getAll()
      req.onsuccess = (e) => {
        try {
          const now = new Date().toISOString()
          for (const book of e.target.result) {
            if (book.author === authorName) {
              store.put({ ...book, authorImage: imageUrl, updatedAt: nextTimestamp(book.updatedAt || now) })
            }
          }
        } catch (err) {
          tx.abort()
          reject(err)
        }
      }
      tx.oncomplete = () => resolve()
      tx.onerror = (e) => reject(e.target.error)
      tx.onabort = (e) => reject(e.target.error ?? new DOMException('Transaction aborted'))
    })
  }

  const updateAuthorDetails = async (authorName, details) => {
    const db = await openLibraryDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction('books', 'readwrite')
      const store = tx.objectStore('books')
      const req = store.getAll()
      req.onsuccess = (e) => {
        try {
          const now = new Date().toISOString()
          for (const book of e.target.result) {
            if (book.author === authorName) {
              const patch = {}
              if (details.bio !== undefined) patch.authorBio = details.bio
              if (details.birthDate !== undefined) patch.authorBirthDate = details.birthDate
              if (details.deathDate !== undefined) patch.authorDeathDate = details.deathDate
              if (details.nationality !== undefined) patch.authorNationality = details.nationality
              if (details.notableWorks !== undefined) patch.authorNotableWorks = details.notableWorks
              if (details.validatedBooksCount !== undefined) {
                patch.authorValidatedBooksCount = details.validatedBooksCount
              }
              if (details.validatedSeriesCount !== undefined) {
                patch.authorValidatedSeriesCount = details.validatedSeriesCount
              }
              if (details.latestWork !== undefined) patch.authorLatestWork = details.latestWork
              if (details.spouseName !== undefined) patch.authorSpouseName = details.spouseName
              if (details.hasChildren !== undefined) patch.authorHasChildren = details.hasChildren
              if (details.childrenCount !== undefined) patch.authorChildrenCount = details.childrenCount
              if (details.version !== undefined) patch.authorDetailsVersion = details.version
              store.put({ ...book, ...patch, updatedAt: nextTimestamp(book.updatedAt || now) })
            }
          }
        } catch (err) {
          tx.abort()
          reject(err)
        }
      }
      tx.oncomplete = () => resolve()
      tx.onerror = (e) => reject(e.target.error)
      tx.onabort = (e) => reject(e.target.error ?? new DOMException('Transaction aborted'))
    })
  }

  return {
    getBooks,
    addBook,
    addDeviceBookIfAbsent,
    mergeDuplicateDeviceBooks,
    updateBook,
    deleteBook,
    getCollections,
    addCollection,
    updateCollection,
    deleteCollection,
    addBookToCollection,
    removeBookFromCollection,
    getProfile,
    saveProfile,
    updateAuthorImage,
    updateAuthorDetails,
  }
}
