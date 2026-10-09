import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLibraryStore } from './useLibraryStore'
import { useDocumentIntelligenceStore } from './useDocumentIntelligenceStore'
import { createDocumentIntelligenceRunner } from './useDocumentIntelligence'
import { collectDocumentEvidence, selectPdfEvidencePages, createIntelligenceSnapshot } from './documentIntelligence'
import { backfillLibraryMetadata } from './useMetadataBackfill'
import { selectVerifiedCatalogCandidate } from './documentIdentity'

beforeEach(() => { globalThis.indexedDB = new IDBFactory() })
const local = () => collectDocumentEvidence({ format: 'pdf', pages: 80, fileName: 'scan.pdf', content:
  '<div data-pdf-page="1"><p>The Quiet Shore</p><p>Mara James</p></div>' +
  '<div data-pdf-page="2"><p>Copyright 2020. All rights reserved.</p></div>' +
  '<div data-pdf-page="20"><p>Chapter One</p></div><div data-pdf-page="40"><p>Chapter Two</p></div>' })
const candidate = { title: 'The Quiet Shore', author: 'Mara James', blurb: 'A story of life beside the sea.', genre: 'Fiction' }

describe('document intelligence workflow', () => {
  it('publishes already-classified fresh imports so sleeping enrichment can wake immediately', async () => {
    const library = useLibraryStore()
    const store = useDocumentIntelligenceStore()
    const evidence = local()
    const book = await library.addBook({ title: candidate.title, format: 'pdf', documentType: 'book', intelligence: createIntelligenceSnapshot(evidence) })
    await store.saveEvidence(book.id, evidence)
    const onChange = vi.fn()
    const loadEvidence = vi.fn()
    await createDocumentIntelligenceRunner({ store, loadEvidence, onChange }).run(book.id)
    expect(loadEvidence).not.toHaveBeenCalled()
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: book.id, documentType: 'book' }))
  })
  it('sorts locally then independently enriches a PDF without an ISBN', async () => {
    const library = useLibraryStore()
    const original = await library.addBook({ title: candidate.title, author: candidate.author, format: 'pdf', documentType: 'unclassified', progress: 42, seriesTotal: 5 })
    const search = vi.fn().mockResolvedValue([candidate])
    const runner = createDocumentIntelligenceRunner({ store: useDocumentIntelligenceStore(), loadEvidence: async () => local(), search })
    await runner.run(original.id)
    expect(search).not.toHaveBeenCalled()
    const [sorted] = await library.getBooks()
    expect(sorted).toMatchObject({ title: original.title, author: original.author, progress: 42, seriesTotal: 5, documentType: 'book' })
    const result = await backfillLibraryMetadata({ books: [sorted], searchFn: search, updateBook: library.updateBook })
    expect(search).toHaveBeenCalledWith(candidate.title, candidate.author, undefined, expect.objectContaining({ force: true, light: false }))
    expect(result).toMatchObject({ searched: 1, updated: 1, skipped: 0 })
    expect((await library.getBooks())[0]).toMatchObject({ blurb: candidate.blurb, progress: 42, seriesTotal: 5 })
  })

  it('persists local analysis cooldown and allows explicit reanalysis without catalog calls', async () => {
    const library = useLibraryStore()
    const book = await library.addBook({ format: 'pdf', title: 'scan' })
    const loadEvidence = vi.fn().mockResolvedValue(local())
    const runner = createDocumentIntelligenceRunner({ store: useDocumentIntelligenceStore(), loadEvidence })
    expect((await runner.run(book.id)).status).toBe('book')
    expect((await runner.run(book.id)).status).toBe('waiting')
    expect((await runner.run(book.id, { force: true })).status).toBe('book')
    expect(loadEvidence).toHaveBeenCalledTimes(2)
  })

  it('personal document analysis never sends its title or contents to a provider', async () => {
    const library = useLibraryStore()
    const book = await library.addBook({ format: 'pdf', title: 'Account 1234' })
    const search = vi.fn()
    const runner = createDocumentIntelligenceRunner({ store: useDocumentIntelligenceStore(), loadEvidence: async () => collectDocumentEvidence({ content: '<div data-pdf-page="1">Invoice #42. Account number: 1234. Amount due: 500.</div>' }), search })
    expect((await runner.run(book.id, { force: true })).status).toBe('personal')
    expect(search).not.toHaveBeenCalled()
  })

  it('inspects body and ending pages and treats corroborating providers as one work', () => {
    expect(selectPdfEvidencePages(80)).toEqual(expect.arrayContaining([1, 6, 20, 40, 60, 80]))
    const evidence = local()
    expect(evidence.signals.filter((s) => s.name === 'chapters').map((s) => s.page)).toEqual([20, 40])
    expect(selectVerifiedCatalogCandidate(evidence, [candidate, { ...candidate, source: 'other' }]).status).toBe('verified-work')
  })
})
