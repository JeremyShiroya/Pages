import { openLibraryDB, nextTimestamp, toPlainRecord } from '~/composables/useLibraryStore'
import { INTELLIGENCE_VERSION } from '~/composables/documentIntelligence'
import { withDocumentType } from '~/composables/useDocumentReview'
import { applyVerifiedMetadata } from '~/composables/documentIdentity'

export const useDocumentIntelligenceStore = () => {
  const getBook = async (bookId) => {
    const db = await openLibraryDB()
    return new Promise((resolve, reject) => {
      const req = db.transaction('books').objectStore('books').get(bookId)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
    })
  }
  const saveJob = async (job) => {
    const db = await openLibraryDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('intelligenceJobs', 'readwrite')
      tx.objectStore('intelligenceJobs').put(toPlainRecord({ ...job, engineVersion: INTELLIGENCE_VERSION, updatedAt: Date.now() }))
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }
  const queue = async (bookId, expectedUpdatedAt = null) => {
    const db = await openLibraryDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('intelligenceJobs', 'readwrite')
      const store = tx.objectStore('intelligenceJobs')
      const req = store.get(bookId)
      let queued = false
      req.onsuccess = () => {
        const old = req.result
        if (old?.engineVersion === INTELLIGENCE_VERSION && old?.status === 'complete') return
        store.put({ bookId, engineVersion: INTELLIGENCE_VERSION, status: 'queued',
          expectedUpdatedAt, attempts: old?.attempts || 0, updatedAt: Date.now() })
        queued = true
      }
      tx.oncomplete = () => resolve(queued)
      tx.onerror = (event) => reject(event.target.error)
      tx.onabort = (event) => reject(event.target.error || new Error('Analysis queue aborted'))
    })
  }

  const getJob = async (bookId) => {
    const db = await openLibraryDB()
    return new Promise((resolve, reject) => {
      const req = db.transaction('intelligenceJobs', 'readonly').objectStore('intelligenceJobs').get(bookId)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = (event) => reject(event.target.error)
    })
  }

  const saveEvidence = async (bookId, evidence) => {
    const db = await openLibraryDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('documentEvidence', 'readwrite')
      tx.objectStore('documentEvidence').put(toPlainRecord({ bookId, ...evidence }))
      tx.oncomplete = () => resolve()
      tx.onerror = (event) => reject(event.target.error)
    })
  }

  const getEvidence = async (bookId) => {
    const db = await openLibraryDB()
    return new Promise((resolve, reject) => {
      const req = db.transaction('documentEvidence', 'readonly').objectStore('documentEvidence').get(bookId)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = (event) => reject(event.target.error)
    })
  }

  const saveCandidates = async (bookId, candidates) => {
    const db = await openLibraryDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('metadataCandidates', 'readwrite')
      tx.objectStore('metadataCandidates').put(toPlainRecord({ bookId, candidates, checkedAt: Date.now() }))
      tx.oncomplete = () => resolve()
      tx.onerror = (event) => reject(event.target.error)
    })
  }

  // Book, decision, evidence, and job commit together. A delayed worker cannot
  // overwrite a user edit, a format switch, or a deleted record.
  const commit = async (bookId, expectedUpdatedAt, evidence, snapshot) => {
    const db = await openLibraryDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['books', 'documentEvidence', 'documentDecisions', 'intelligenceJobs'], 'readwrite')
      const books = tx.objectStore('books')
      const req = books.get(bookId)
      let result = { status: 'missing', book: null }
      req.onsuccess = () => {
        const current = req.result
        if (!current) { tx.objectStore('intelligenceJobs').delete(bookId); return }
        if (expectedUpdatedAt && current.updatedAt !== expectedUpdatedAt) {
          result = { status: 'stale', book: current }
          tx.objectStore('intelligenceJobs').put({ bookId, engineVersion: INTELLIGENCE_VERSION,
            status: 'queued', expectedUpdatedAt: current.updatedAt, updatedAt: Date.now() })
          return
        }
        const userChoice = current.documentTypeChosenByUser === true
        const kind = userChoice ? current.documentType : snapshot.kind
        const intelligence = { ...snapshot, kind, kindSource: userChoice ? 'user' : snapshot.kindSource,
          review: userChoice && current.reviewState === 'deferred' ? 'conflict' : userChoice ? 'none' : snapshot.review }
        if (current.intelligence?.identity?.status === 'user-approved') intelligence.identity = current.intelligence.identity
        // The sorting transaction may change handling type only. Bibliographic
        // fields belong exclusively to metadata enrichment and user edits.
        const updated = toPlainRecord({ ...current, intelligence, documentType: kind,
          reviewState: userChoice && current.reviewState === 'deferred' ? 'deferred'
            : intelligence.review === 'conflict' ? 'new' : null,
          documentTypeClassificationVersion: 4,
          updatedAt: nextTimestamp(current.updatedAt) })
        books.put(updated)
        tx.objectStore('documentEvidence').put(toPlainRecord({ bookId, ...evidence }))
        tx.objectStore('documentDecisions').put({ bookId, ...intelligence, updatedAt: Date.now() })
        tx.objectStore('intelligenceJobs').put({ bookId, engineVersion: INTELLIGENCE_VERSION,
          status: intelligence.analysis === 'needs-ocr' ? 'unsupported' : 'complete',
          expectedUpdatedAt: updated.updatedAt, updatedAt: Date.now() })
        result = { status: 'applied', book: updated }
      }
      tx.oncomplete = () => resolve(result)
      tx.onerror = (event) => reject(event.target.error)
      tx.onabort = (event) => reject(event.target.error || new Error('Document analysis aborted'))
    })
  }

  const commitIdentity = async (bookId, expectedUpdatedAt, resolution, candidates = []) => {
    const db = await openLibraryDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['books', 'documentDecisions', 'metadataCandidates'], 'readwrite')
      const books = tx.objectStore('books')
      const req = books.get(bookId)
      let result = { status: 'missing', book: null }
      req.onsuccess = () => {
        const current = req.result
        if (!current) return
        if (current.updatedAt !== expectedUpdatedAt) { result = { status: 'stale', book: current }; return }
        tx.objectStore('metadataCandidates').put(toPlainRecord({ bookId, candidates, checkedAt: Date.now() }))
        if (!resolution.candidate || !['verified-work', 'verified-edition', 'user-approved'].includes(resolution.status)) {
          const updated = toPlainRecord({ ...current,
            reviewState: resolution.status === 'user-rejected' ? null : current.reviewState,
            intelligence: { ...current.intelligence, identityCheckedAt: Date.now(),
              nextAttemptAt: resolution.nextAttemptAt || 0, analysisReason: resolution.analysisReason,
              identity: { status: resolution.status },
              review: resolution.status === 'user-rejected' ? 'none' : resolution.status === 'conflict' ? 'identity-conflict' : current.intelligence?.review || 'none',
              identityCandidates: resolution.status === 'conflict' ? (resolution.assessed || []).filter((item) => item.verdict.status.startsWith('verified')).map((item) => item.candidate).slice(0, 5) : [] },
            updatedAt: nextTimestamp(current.updatedAt) })
          books.put(updated)
          tx.objectStore('documentDecisions').put({ bookId, ...updated.intelligence, updatedAt: Date.now() })
          result = { status: 'applied', book: updated }
          return
        }
        const identity = { status: resolution.status,
          source: resolution.candidate?.primarySource || resolution.candidate?.source || 'catalog',
          title: resolution.candidate?.title, author: resolution.candidate?.author,
          verifiedAt: Date.now() }
        const verified = { ...current, reviewState: null, intelligence: { ...current.intelligence, identity, identityCheckedAt: Date.now(), nextAttemptAt: resolution.nextAttemptAt || 0, analysisReason: resolution.analysisReason, review: 'none', identityCandidates: [] } }
        const filled = applyVerifiedMetadata(verified, resolution.candidate, resolution.status)
        const updated = toPlainRecord({ ...filled, updatedAt: nextTimestamp(current.updatedAt) })
        books.put(updated)
        tx.objectStore('documentDecisions').put({ bookId, ...updated.intelligence, updatedAt: Date.now() })
        result = { status: 'applied', book: updated }
      }
      tx.oncomplete = () => resolve(result)
      tx.onerror = (event) => reject(event.target.error)
      tx.onabort = (event) => reject(event.target.error || new Error('Identity update aborted'))
    })
  }

  return { getBook, saveJob, queue, getJob, saveEvidence, getEvidence, saveCandidates, commit, commitIdentity }
}
