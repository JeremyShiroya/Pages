import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { useLibraryStore } from './useLibraryStore'
import { useDocumentIntelligenceStore } from './useDocumentIntelligenceStore'
import { collectDocumentEvidence, createIntelligenceSnapshot } from './documentIntelligence'

beforeEach(() => { globalThis.indexedDB = new IDBFactory() })

const local = collectDocumentEvidence({ format: 'pdf', content: '<div data-pdf-page="1">Invoice #42. Account number: 123. Amount due: 50.</div>' })
const snapshot = createIntelligenceSnapshot(local)

describe('durable document decisions', () => {
  it('does not overwrite a newer manual choice from a delayed analysis job', async () => {
    const library = useLibraryStore()
    const store = useDocumentIntelligenceStore()
    const initial = await library.addBook({ title: 'Invoice', format: 'pdf', documentType: 'unclassified' })
    await library.updateBook({ ...initial, documentType: 'book', documentTypeChosenByUser: true })
    const result = await store.commit(initial.id, initial.updatedAt, local, snapshot)
    expect(result.status).toBe('stale')
    expect((await library.getBooks())[0].documentType).toBe('book')
  })

  it('does not resurrect a deleted document', async () => {
    const library = useLibraryStore()
    const store = useDocumentIntelligenceStore()
    const initial = await library.addBook({ title: 'Invoice', format: 'pdf' })
    await library.deleteBook(initial.id)
    expect((await store.commit(initial.id, initial.updatedAt, local, snapshot)).status).toBe('missing')
    expect(await library.getBooks()).toEqual([])
  })

  it('keeps explicit decisions even when newer evidence disagrees', async () => {
    const library = useLibraryStore()
    const store = useDocumentIntelligenceStore()
    const initial = await library.addBook({ title: 'Invoice', format: 'pdf', documentType: 'book', documentTypeChosenByUser: true })
    const result = await store.commit(initial.id, initial.updatedAt, local, snapshot)
    expect(result.book.documentType).toBe('book')
    expect(result.book.intelligence.kindSource).toBe('user')
    expect(result.book.reviewState).toBeNull()
  })
})
