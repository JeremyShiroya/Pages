import { describe, expect, it } from 'vitest'
import { collectDocumentEvidence, createIntelligenceSnapshot, foldDocumentText } from './documentIntelligence'
import { canApplyCatalogMetadata, canSearchCatalog, verifyCatalogCandidate } from './documentIdentity'

const pages = (...text) => text.map((value, index) => `<div data-pdf-page="${index + 1}">${value}</div>`).join('')
const evidence = (content, extra = {}) => collectDocumentEvidence({ format: 'pdf', content, pages: 6, ...extra })

describe('document intelligence', () => {
  it('recognizes a book without ISBN or matching filename and does not request review', () => {
    const local = evidence(pages('The Long Journey by Amina Okafor', 'Copyright 2025. Published by Cedar Press.', 'Contents Chapter One Chapter Two', 'Chapter One The road began at dawn.'), { fileName: 'scan_004.pdf', embeddedTitle: 'The Long Journey', embeddedAuthor: 'Amina Okafor' })
    expect(createIntelligenceSnapshot(local)).toMatchObject({ kind: 'book', review: 'none' })
  })

  it('treats a transaction document as personal without catalog access', () => {
    const local = evidence(pages('Invoice #123. Account number: 9876. Amount due: 42.00', 'Bill to: Alex. Payment due: Friday'))
    const snapshot = createIntelligenceSnapshot(local)
    expect(snapshot.kind).toBe('personal')
    expect(canSearchCatalog({ format: 'pdf', title: 'Invoice', documentType: snapshot.kind, intelligence: snapshot })).toBe(false)
  })

  it('uses front matter rather than a later invoice example to classify a textbook', () => {
    const local = evidence(pages('Accounting Practice by Maya Njoroge', 'Copyright 2024. Contents Chapter One', 'Chapter One Fundamentals', 'Chapter Two', 'Invoice #123. Account number: 9876. Amount due: 42.00'))
    expect(createIntelligenceSnapshot(local)).toMatchObject({ kind: 'book', review: 'none' })
  })

  it('keeps an unreadable scan undecided without a mandatory review', () => {
    const snapshot = createIntelligenceSnapshot(evidence(pages('', '')))
    expect(snapshot).toMatchObject({ kind: 'unclassified', analysis: 'needs-ocr', review: 'none' })
  })

  it('asks only when independent publication and form evidence conflict', () => {
    const local = evidence(pages('The Annual Ledger by Ada Jones. Copyright 2025. Chapter One. Invoice #123. Account number: 9876. Amount due: 42.00'))
    expect(createIntelligenceSnapshot(local)).toMatchObject({ kind: 'unclassified', review: 'conflict' })
  })

  it('verifies a work separately from its edition and never trusts a later cited ISBN', () => {
    const local = evidence(pages('The Long Journey by Amina Okafor', 'Copyright 2025', 'Chapter One'), { embeddedTitle: 'The Long Journey', embeddedAuthor: 'Amina Okafor' })
    const candidate = { title: 'The Long Journey', author: 'Amina Okafor', isbn: '9780743273565' }
    expect(verifyCatalogCandidate(local, candidate).status).toBe('verified-work')
    expect(canApplyCatalogMetadata({ format: 'pdf', documentType: 'book', intelligence: { identity: { status: 'unresolved' } } })).toBe(false)
    expect(canApplyCatalogMetadata({ format: 'pdf', documentType: 'book', intelligence: { identity: { status: 'verified-work' } } })).toBe(false)
  })

  it('retains non-Latin letters during matching', () => {
    expect(foldDocumentText('Μικρό βιβλίο — كتاب')).toContain('كتاب')
  })
})
