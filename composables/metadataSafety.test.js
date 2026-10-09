import { beforeEach, describe, expect, it } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { useLibraryStore } from './useLibraryStore'
import { useDocumentIntelligenceStore } from './useDocumentIntelligenceStore'
import { collectDocumentEvidence, createIntelligenceSnapshot } from './documentIntelligence'
import { metadataCandidateMatches, selectMetadataCandidate } from './metadataPolicy'
import { recoverLegacyMetadata } from './metadataRecovery'
import { reconcileEffectiveTotal } from './useSeriesSuggestions'
import { sourceDocumentIdentity } from './sourceBookIdentity'
import { seriesMembership, seriesDisplayLabel, applySeriesChoice } from '../utils/bookSeriesState'
import { needsSeriesLookup, applyMetadataResult } from './useMetadataBackfill'

beforeEach(() => { globalThis.indexedDB = new IDBFactory() })
describe('independent classification and metadata safety', () => {
  it.each(['Fallen', 'Indelible'])('does not label %s standalone just because no series was found', (title) => {
    const book = { title, author: 'Example Author', series: null, seriesChecked: true }
    expect(seriesMembership(book)).toBe('unknown')
    expect(seriesDisplayLabel(book)).toBe('Series unknown')
    expect(needsSeriesLookup(book)).toBe(true)
    expect(applyMetadataResult(book, { title, author: book.author }, { didLookup: true }).record).toBeNull()
    const chosen = applySeriesChoice(book, 'standalone')
    expect(seriesDisplayLabel(chosen)).toBe('Standalone')
    expect(seriesMembership(applySeriesChoice(chosen, 'unknown'))).toBe('unknown')
  })
  it('uses embedded bibliographic fields only when the original filename corroborates the title', () => {
    expect(sourceDocumentIdentity('The Quiet Shore (Mara_ (Library).pdf', { embedded: { title: 'The Quiet Shore', author: 'Mara James' }, bibliographic: { title: 'Thank you for downloading' } }))
      .toEqual({ title: 'The Quiet Shore', author: 'Mara James' })
    expect(sourceDocumentIdentity('scan.pdf', { embedded: { title: 'Unrelated', author: 'Another Author' } }))
      .toEqual({ title: 'scan', author: '' })
  })
  it('accepts punctuation and middle-initial variants without accepting different authors', () => {
    expect(metadataCandidateMatches({ title: 'Im Coming Home', author: 'Octavia Butler' }, { title: "I'm Coming Home", author: 'Octavia E. Butler' })).toBe(true)
    expect(metadataCandidateMatches({ title: 'Novel', author: 'Jane A. Smith' }, { title: 'Novel', author: 'Jane B. Smith' })).toBe(false)
  })
  it.each([
    ['CV.pdf', 'Professional summary. Work experience. Education. Skills. Email: alex@example.test'],
    ['letter.pdf', 'Dear hiring manager. Application for engineer. Yours sincerely, Alex'],
    ['certificate.pdf', 'Certificate of completion. Student Alex successfully completed the course.'],
    ['results.pdf', 'Academic transcript. Student name: Alex. Course: Mathematics'],
    ['appointment.pdf', 'Appointment slip. Patient: Alex. Clinic: Test'],
    ['policy.pdf', 'Insurance claim application form. Name: Alex. Signature:'],
    ['schedule.pdf', 'Examination timetable. Semester two. Venue: Room 12'],
    ['fees.pdf', 'Fee structure. Academic year 2026. Tuition: 100'],
    ['paper.pdf', 'Thesis submitted to the university for a graduate degree'],
    ['TOPIC 1.pdf', 'Data structure and algorithm. Learning outcome'],
    ['plan.pdf', 'Business plan. Revenue generation and cost structure. Budget overview'],
    ['course.pdf', 'Course brochure. Curriculum and modules. Duration: twelve weeks'],
  ])('recognizes structured nonbook documents: %s', (fileName, text) => {
    expect(createIntelligenceSnapshot(collectDocumentEvidence({ fileName, pages: 2, content: `<div data-pdf-page="1">${text}</div>` })).kind).toBe('personal')
  })
  it('sorting cannot replace bibliographic fields or reading state', async () => {
    const library = useLibraryStore()
    const original = await library.addBook({ title: 'My file', author: 'My author', cover: 'cover.jpg', series: 'Chosen series', seriesTotal: 5, progress: 61, notes: ['keep'], format: 'pdf' })
    const evidence = collectDocumentEvidence({ content: '<div data-pdf-page="1">Invoice #10. Account number: 12. Amount due: 1</div>' })
    evidence.bibliographic = { title: 'Wrong title', author: 'Wrong author' }
    const result = await useDocumentIntelligenceStore().commit(original.id, original.updatedAt, evidence, createIntelligenceSnapshot(evidence))
    expect(result.book).toMatchObject({ title: original.title, author: original.author, cover: original.cover, seriesTotal: 5, progress: 61, notes: ['keep'], documentType: 'personal' })
  })
  it('rejects stale metadata and preserves progress and user-defined totals at the database boundary', async () => {
    const store = useLibraryStore()
    const initial = await store.addBook({ title: 'Novel', format: 'epub', seriesTotal: 5, userDefined: { seriesTotal: true }, progress: 35 })
    const saved = await store.updateBook({ ...initial, seriesTotal: 1, progress: 0, cover: 'new.jpg' }, { automaticMetadata: true })
    expect(saved).toMatchObject({ seriesTotal: 5, progress: 35, cover: 'new.jpg' })
    await expect(store.updateBook({ ...initial, cover: 'stale.jpg' }, { automaticMetadata: true })).rejects.toThrow()
    expect((await store.getBooks())[0].cover).toBe('new.jpg')
    expect(reconcileEffectiveTotal({ contiguous: true, rosterMax: 1, claimedTotal: 5 })).toBe(5)
  })
  it('rejects conflicting identity and ambiguous title-only searches', () => {
    expect(metadataCandidateMatches({ title: 'Novel', author: 'Jane Author' }, { title: 'Novel', author: 'John Other' })).toBe(false)
    expect(selectMetadataCandidate({ title: 'Novel' }, [{ title: 'Novel', author: 'Jane Author' }, { title: 'Novel', author: 'John Other' }])).toBeNull()
  })
  it('repairs only evidenced old title corruption, keeps a backup, and is idempotent', () => {
    const old = { format: 'pdf', title: 'Thank you for downloading', sourceFileName: 'The Quiet Shore - Mara James.pdf', intelligence: { engineVersion: 2 }, progress: 45 }
    const evidence = { bibliographic: { title: old.title } }
    const repaired = recoverLegacyMetadata(old, evidence)
    expect(repaired).toMatchObject({ title: 'The Quiet Shore', author: 'Mara James', progress: 45, metadataRecoveryBackup: { title: old.title } })
    expect(recoverLegacyMetadata(repaired, evidence)).toBe(repaired)
    expect(recoverLegacyMetadata({ ...old, userDefined: { title: true } }, evidence).title).toBe(old.title)
  })
})
