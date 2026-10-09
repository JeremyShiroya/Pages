import { describe, expect, it } from 'vitest'
import {
  deferredDocumentReviews,
  inferPdfBookDetails,
  inferPdfDocumentType,
  inferStoredPdfDocumentType,
  migrateLegacyPdfRecord,
  documentTypeOf,
  newDocumentReviews,
  validIsbn,
  withDocumentType,
} from './useDocumentReview'
import { metadataResultMatchesBook, missingMetadataFields } from './useMetadataBackfill'
import { mergeMetadataIntoBook } from './useDeviceLibrarySync'
import { matchesLibraryFilters } from './useLibraryFilters'

describe('PDF review state', () => {
  it('moves deferred files from the Books notice to notifications and clears them on classification', () => {
    const file = { id: 'pdf-1', title: 'My notes', format: 'pdf', documentType: 'unclassified', reviewState: 'new', intelligence: { engineVersion: 1, kind: 'unclassified', review: 'conflict' } }
    expect(newDocumentReviews([file])).toHaveLength(1)
    const deferred = withDocumentType(file, 'unclassified', { defer: true })
    expect(newDocumentReviews([deferred])).toHaveLength(0)
    expect(deferredDocumentReviews([deferred])).toHaveLength(1)
    expect(deferredDocumentReviews([withDocumentType(deferred, 'personal')])).toHaveLength(0)
    expect(deferredDocumentReviews([withDocumentType(deferred, 'book')])).toHaveLength(0)
  })

  it('only auto-identifies a PDF when ISBN, title and author corroborate one another', () => {
    expect(validIsbn('978-0-7432-7356-5')).toBe(true)
    const details = { text: 'The Great Gatsby F. Scott Fitzgerald ISBN 978-0-7432-7356-5', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', fileName: 'The_Great_Gatsby.pdf' }
    expect(inferPdfBookDetails(details)).toEqual({ title: details.title, author: details.author })
    expect(inferPdfBookDetails({ ...details, text: 'My notes about The Great Gatsby F. Scott Fitzgerald' })).toBeNull()
    expect(inferPdfBookDetails({ ...details, fileName: 'Personal notes.pdf' })).toBeNull()
    const withoutIsbn = { ...details, text: 'The Great Gatsby by F. Scott Fitzgerald. Chapter One.', pages: 180 }
    expect(inferPdfBookDetails(withoutIsbn)).toEqual({ title: details.title, author: details.author })
    expect(inferPdfBookDetails({ ...withoutIsbn, fileName: 'The_Great_Gatsby_notes.pdf' })).toBeNull()
  })

  it('does not search or fill unclassified files and requires exact PDF title and author matches', () => {
    const pdf = { title: 'My notes', format: 'pdf', documentType: 'unclassified', author: '' }
    const result = { title: 'My notes', author: 'Someone Else', blurb: 'Wrong description' }
    expect(missingMetadataFields(pdf)).toEqual([])
    expect(mergeMetadataIntoBook(pdf, result)).toBeNull()
    expect(metadataResultMatchesBook({ ...pdf, documentType: 'book' }, result)).toBe(false)
    expect(metadataResultMatchesBook({ ...pdf, documentType: 'book', author: 'Someone Else' }, result)).toBe(true)
  })

  it('classifies clear personal filenames and sends ambiguous PDFs to review', () => {
    expect(inferPdfDocumentType({ fileName: 'Bank_statement_March.pdf' }).type).toBe('personal')
    expect(inferPdfDocumentType({ fileName: 'Meeting notes.pdf' }).type).toBe('unclassified')
    expect(inferPdfDocumentType({ fileName: 'Untitled.pdf', text: 'Invoice number 123' }).type).toBe('unclassified')
    expect(inferPdfDocumentType({ fileName: 'Untitled.pdf', text: 'Invoice number 123. Amount due: 50.' }).type).toBe('personal')
    expect(documentTypeOf({ format: 'pdf' })).toBe('unclassified')
  })

  it('retains older book PDFs and repairs files moved to review by the previous migration', () => {
    const legacy = { id: 'one', format: 'pdf', documentType: 'book', deviceImportPath: '/storage/emulated/0/notes.pdf' }
    const migrated = migrateLegacyPdfRecord(legacy)
    expect(migrated.documentType).toBe('book')
    expect(migrated.reviewState).toBeNull()
    expect(migrateLegacyPdfRecord(migrated)).toBe(migrated)
    expect(migrateLegacyPdfRecord({ ...legacy, documentTypeChosenByUser: true })).toEqual({ ...legacy, documentTypeChosenByUser: true })
    expect(withDocumentType({ format: 'pdf', documentType: 'book' }, 'unclassified').documentTypeChosenByUser).toBe(true)
    const olderBook = {
      ...legacy, documentType: 'unclassified', reviewState: 'new', documentTypeClassificationVersion: 2,
      title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', pages: 180,
      deviceImportPath: '/storage/emulated/0/Downloads/The_Great_Gatsby.pdf',
    }
    expect(migrateLegacyPdfRecord(olderBook).documentType).toBe('book')
    expect(migrateLegacyPdfRecord({ ...olderBook, sourceFileName: 'my_notes.pdf', deviceImportPath: '/storage/emulated/0/Downloads/my_notes.pdf' }).documentType).toBe('unclassified')
    expect(migrateLegacyPdfRecord({ ...olderBook, reviewState: 'deferred' }).documentType).toBe('unclassified')
    expect(migrateLegacyPdfRecord({ ...legacy, deviceImportPath: '/storage/emulated/0/Bank_statement.pdf' }).documentType).toBe('personal')
  })

  it('uses stored text to restore books without ISBNs while rejecting unrelated metadata', () => {
    const book = {
      format: 'pdf', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald',
      sourceFileName: 'The_Great_Gatsby.pdf', pages: 180,
    }
    expect(inferStoredPdfDocumentType(book, 'The Great Gatsby by F. Scott Fitzgerald. Chapter One...')).toBe('book')
    expect(inferStoredPdfDocumentType({ ...book, sourceFileName: 'My_notes.pdf' }, 'Notes about The Great Gatsby by F. Scott Fitzgerald')).toBe('unclassified')
  })

  it('filters books, personal documents, and undecided files separately', () => {
    const files = [{ format: 'epub' }, { format: 'pdf', documentType: 'personal' }, { format: 'pdf' }]
    expect(['book', 'personal', 'unclassified'].map((type) =>
      files.filter((file) => matchesLibraryFilters(file, { documentType: type })).length,
    )).toEqual([1, 1, 1])
  })

  it('removes catalog-only metadata from personal documents and restores it if reclassified', () => {
    const book = { format: 'pdf', documentType: 'book', title: 'Invoice', genre: 'Fantasy', publishYear: 2019, webReview: 'Wrong book', series: 'Wrong series' }
    const personal = withDocumentType(book, 'personal')
    expect(personal.genre).toBeNull()
    expect(personal.publishYear).toBeNull()
    expect(personal.webReview).toBeNull()
    expect(personal.series).toBeNull()
    expect(withDocumentType(personal, 'book').genre).toBe('Fantasy')
  })
})
