import { INTELLIGENCE_VERSION, collectDocumentEvidence, createIntelligenceSnapshot } from './documentIntelligence'
import { documentTypeOf } from './useDocumentReview'
import { useDocumentIntelligenceStore } from './useDocumentIntelligenceStore'
import { useBookStorage } from './useBookStorage'

export function documentAnalysisDue(book, now = Date.now()) {
  if (String(book?.format).toLowerCase() !== 'pdf') return false
  if (book.documentTypeChosenByUser && documentTypeOf(book) !== 'book') return false
  if (Number(book.intelligence?.engineVersion || 0) < INTELLIGENCE_VERSION) return true
  return now >= Number(book.intelligence?.nextAttemptAt || 0)
}

// Dependencies are injected for end-to-end tests against the real IDB store.
export function createDocumentIntelligenceRunner({ store, loadEvidence, onChange = () => {}, now = Date.now }) {
  const inFlight = new Map()
  const run = async (bookId, { force = false } = {}) => {
    if (inFlight.has(bookId)) {
      await inFlight.get(bookId)
      if (!force) return { status: 'joined', searched: false, updated: false }
    }
    const task = (async () => {
      let book = await store.getBook(bookId)
      if (!book) return { status: 'missing', searched: false, updated: false }
      if (book.documentTypeChosenByUser && documentTypeOf(book) !== 'book') {
        return { status: 'user-choice', reason: 'Preserved your file type choice.', searched: false, updated: false }
      }
      const previousJob = await store.getJob(bookId)
      const revisionChanged = previousJob?.expectedUpdatedAt !== book.updatedAt
      if (!force && !revisionChanged && previousJob?.engineVersion === INTELLIGENCE_VERSION && previousJob.nextAttemptAt > now()) {
        return { status: 'waiting', reason: 'Waiting for the next retry.', searched: false, updated: false }
      }
      let searched = false
      const attempts = Number(previousJob?.attempts || 0) + 1
      const job = { bookId, status: 'extracting', attempts, expectedUpdatedAt: book.updatedAt }
      await store.saveJob(job)
      try {
        let evidence = await store.getEvidence(bookId)
        if (force || !evidence || evidence.version !== INTELLIGENCE_VERSION || Number(book.intelligence?.engineVersion || 0) < INTELLIGENCE_VERSION) {
          evidence = await loadEvidence(book, evidence)
          const saved = await store.commit(bookId, book.updatedAt, evidence, createIntelligenceSnapshot(evidence))
          if (saved.status !== 'applied') return { status: saved.status, reason: 'File changed during analysis; retry queued.', searched, updated: false }
          book = saved.book
          onChange(book)
        }
        const status = documentTypeOf(book)
        const reason = book.intelligence?.kindReason || 'Not enough local evidence.'
        // Fresh imports already carry evidence, so they skip the commit above.
        // Publish those too: the metadata scheduler may be asleep after seeing
        // an empty library at first launch.
        onChange(book)
        await store.saveJob({ ...job, status: 'complete', expectedUpdatedAt: book.updatedAt, nextAttemptAt: now() + 86400000, reason })
        return { status, reason, searched: false, updated: false, book }

      } catch (error) {
        await store.saveJob({ ...job, status: 'retryable-failure', nextAttemptAt: now() + Math.min(60 * 60_000, 60_000 * 2 ** Math.min(attempts - 1, 6)), error: String(error?.message || error) })
        throw error
      }
    })()
    inFlight.set(bookId, task)
    try { return await task } finally { if (inFlight.get(bookId) === task) inFlight.delete(bookId) }
  }
  return { run }
}

let listener = () => {}
let runner = null
let analysisLane = Promise.resolve()
export const setDocumentIntelligenceListener = (callback) => { listener = callback }

export function runDocumentIntelligence(bookId, options = {}) {
  if (!runner) runner = createDocumentIntelligenceRunner({
    store: useDocumentIntelligenceStore(),
    onChange: (book) => listener(book),
    loadEvidence: async (book, existing) => {
      const stored = await useBookStorage().getBookContent(book.id)
      if (!stored) throw new Error('Original file has not finished saving. Retry analysis.')
      if (stored.source) {
        const { extractPdfEvidence } = await import('./usePdfExtractor')
        return extractPdfEvidence(stored.source, { fileName: book.sourceFileName || '', path: book.deviceImportPath || '' })
      }
      return collectDocumentEvidence({ format: 'pdf', content: stored.content, pages: stored.pages || book.pages,
        tocItems: stored.tocItems, fileName: book.sourceFileName || '', embeddedTitle: existing?.embedded?.title,
        embeddedAuthor: existing?.embedded?.author })
    },
  })
  const task = analysisLane.then(() => runner.run(bookId, options))
  analysisLane = task.catch(() => {})
  return task
}
