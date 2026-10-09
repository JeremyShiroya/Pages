// Classification is independent of file format. Records with no PDF type are
// uncertain until the library migration examines their existing book signals.
export const documentTypeOf = (book) => {
  if (book?.documentTypeChosenByUser && ['book', 'personal', 'unclassified'].includes(book?.documentType)) return book.documentType
  if (book?.intelligence?.engineVersion && ['book', 'personal', 'unclassified'].includes(book.intelligence.kind)) return book.intelligence.kind
  const type = String(book?.documentType || '').toLowerCase()
  if (['book', 'personal', 'unclassified'].includes(type)) return type
  return String(book?.format || '').toLowerCase() === 'pdf' ? 'unclassified' : 'book'
}

export const needsDocumentReview = (book) => book?.intelligence?.review === 'identity-conflict'
  || documentTypeOf(book) === 'unclassified' && (book?.intelligence?.review === 'conflict' || book?.reviewState === 'deferred')
export const newDocumentReviews = (books = []) => books.filter((book) =>
  needsDocumentReview(book) && book.reviewState !== 'deferred')
export const deferredDocumentReviews = (books = []) => books.filter((book) =>
  needsDocumentReview(book) && book.reviewState === 'deferred')

export const withDocumentType = (book, documentType, { defer = false, automatic = false } = {}) => {
  if (!['book', 'personal', 'unclassified'].includes(documentType)) {
    throw new Error('Invalid document type')
  }
  const result = {
    ...book,
    documentType,
    reviewState: documentType === 'unclassified' && defer ? 'deferred' : null,
    documentTypeChosenByUser: !automatic,
    intelligence: {
      ...(book?.intelligence || {}), kind: documentType,
      kindSource: automatic ? (book?.intelligence?.kindSource || 'local') : 'user',
      nextAttemptAt: 0,
      review: documentType === 'unclassified' && defer ? 'conflict'
        : documentType === 'book' && book?.intelligence?.review === 'identity-conflict' ? 'identity-conflict' : 'none',
    },
  }
  if (documentType === 'personal' && book?.documentType !== 'personal') {
    const fields = ['genre', 'publishYear', 'series', 'seriesInstallment', 'seriesTotal', 'webReview', 'goodreadsRating']
    result.bookMetadataBackup = Object.fromEntries(fields.map((field) => [field, book?.[field]]))
    for (const field of fields) result[field] = null
  } else if (documentType === 'book' && book?.documentType === 'personal' && book.bookMetadataBackup) {
    for (const [field, value] of Object.entries(book.bookMetadataBackup)) result[field] = value
    result.bookMetadataBackup = null
  }
  return result
}

const normalized = (value) => String(value || '').normalize('NFD')
  .replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

export const validIsbn = (value) => {
  const isbn = String(value || '').toUpperCase().replace(/[^0-9X]/g, '')
  if (isbn.length === 13) {
    const sum = [...isbn].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0)
    return sum % 10 === 0
  }
  if (isbn.length === 10) {
    const sum = [...isbn].reduce((total, digit, index) => total + (digit === 'X' ? 10 : Number(digit)) * (10 - index), 0)
    return sum % 11 === 0
  }
  return false
}

export const inferPdfBookDetails = ({ text = '', title = '', author = '', fileName = '', pages = 0 } = {}) => {
  const pageText = normalized(String(text).replace(/<[^>]*>/g, ' ').slice(0, 20000))
  const cleanTitle = normalized(title)
  const cleanAuthor = normalized(author)
  const cleanFile = normalized(String(fileName).replace(/\.pdf$/i, ''))
  const isbnCandidates = String(text).slice(0, 20000).match(/(?:ISBN(?:-1[03])?\s*[:#]?\s*)?(?:97[89][\s-]?)?\d[\d\s-]{8,20}[\dX]/gi) || []
  const hasIsbn = isbnCandidates.some((candidate) => validIsbn(candidate))
  const titleAgrees = cleanTitle.length >= 8 && pageText.includes(cleanTitle)
    && (cleanFile.includes(cleanTitle) || cleanTitle.includes(cleanFile))
  const authorAgrees = cleanAuthor.length >= 5 && pageText.includes(cleanAuthor)
  const exactTitleFile = cleanFile === cleanTitle || cleanFile === `${cleanTitle} ${cleanAuthor}`
  const looksLikeNotes = /\b(?:notes|summary|report|review|essay|assignment|analysis|workbook)\b/.test(cleanFile)
  const corroboratedWithoutIsbn = Number(pages) >= 20 && exactTitleFile && !looksLikeNotes
  return (hasIsbn || corroboratedWithoutIsbn) && titleAgrees && authorAgrees
    ? { title: title.trim(), author: author.trim() } : null
}

const PERSONAL_NAME = /(?:^|[\s_-])(?:invoice|receipt|payslip|paystub|bank[\s_-]*statement|tax[\s_-]*(?:return|form)|medical[\s_-]*(?:record|report)|lab[\s_-]*result|passport|boarding[\s_-]*pass|utility[\s_-]*bill|insurance[\s_-]*claim|resume|curriculum[\s_-]*vitae|employment[\s_-]*contract)(?:[\s_.-]|$)/i
const PERSONAL_TEXT_MARKERS = [
  /\binvoice\s*(?:number|no\.?|#)/i, /\bamount\s+due\b/i,
  /\baccount\s+number\b/i, /\btaxpayer\b/i,
  /\bpatient\s+(?:name|id)\b/i, /\blaboratory\s+result\b/i,
  /\bboarding\s+pass\b/i, /\bpay\s+period\b/i, /\btotal\s+paid\b/i,
]

export const inferPdfDocumentType = ({ text = '', title = '', author = '', fileName = '', pages = 0 } = {}) => {
  const book = inferPdfBookDetails({ text, title, author, fileName, pages })
  if (book) return { type: 'book', book }
  const name = String(fileName || '')
  const pageText = String(text).slice(0, 12000).replace(/<[^>]*>/g, ' ')
  const personalSignals = PERSONAL_TEXT_MARKERS.filter((marker) => marker.test(pageText)).length
  // A precise document name is enough; a generic word in page text alone is
  // not. Scanned PDFs without searchable text still reach review safely.
  if (PERSONAL_NAME.test(name) || personalSignals >= 2
    || (personalSignals >= 1 && /(?:personal|statement|document|form|report)/i.test(name))) {
    return { type: 'personal', book: null }
  }
  return { type: 'unclassified', book: null }
}

export const legacyPdfFileName = (book) => String(book?.sourceFileName || book?.deviceImportPath?.split(/[\\/]/).pop() || '')

const plausibleBookTitle = (value) => {
  const title = normalized(value)
  return title.length >= 6 && !/^(?:untitled|document|file|scan|notes|report|statement|form|download|pdf)(?:\s|$)/.test(title)
}

const fileAgreesWithTitle = (book, fileName) => {
  const title = normalized(book?.title)
  const name = normalized(String(fileName || '').replace(/\.pdf$/i, ''))
  return plausibleBookTitle(book?.title) && name.length >= 6
    && (name.includes(title) || title.includes(name))
}

// Earlier releases treated every PDF as a book. Their existing classification
// should not be erased simply because the strict new-import detector cannot
// find an ISBN in a filename. For PDFs already moved to review, require
// several independent book signals before restoring that classification.
export const hasLegacyBookEvidence = (book) => {
  const fileName = legacyPdfFileName(book)
  const author = normalized(book?.author)
  if (!plausibleBookTitle(book?.title) || author.length < 5 || /^(?:unknown|anonymous|n a)$/.test(author)) return false
  const bookFolder = /[\\/](?:books|ebooks|novels|literature)[\\/]/i.test(String(book?.deviceImportPath || ''))
  const titleMatch = fileAgreesWithTitle(book, fileName)
  const longEnough = Number(book?.pages) >= 30
  const catalogDetail = Boolean(book?.genre || book?.publishYear || book?.series || book?.publisher)
  return (titleMatch && (longEnough || catalogDetail))
    || (bookFolder && longEnough && catalogDetail)
    || (!fileName && longEnough && catalogDetail)
}

export const inferStoredPdfDocumentType = (book, text = '') => {
  const fileName = legacyPdfFileName(book)
  const decision = inferPdfDocumentType({ text, title: book?.title, author: book?.author, fileName })
  if (decision.type !== 'unclassified') return decision.type
  const pageText = normalized(String(text).replace(/<[^>]*>/g, ' ').slice(0, 20000))
  const title = normalized(book?.title)
  const author = normalized(book?.author)
  if (Number(book?.pages) >= 20 && fileAgreesWithTitle(book, fileName)
    && title.length >= 6 && author.length >= 5
    && pageText.includes(title) && pageText.includes(author)) return 'book'
  return 'unclassified'
}

export const migrateLegacyPdfRecord = (book) => {
  if (String(book?.format || '').toLowerCase() !== 'pdf'
    || book?.documentTypeChosenByUser
    || book?.reviewState === 'deferred'
    || book?.documentType === 'personal'
    || book?.documentTypeClassificationVersion >= 3) return book
  const sourceFileName = legacyPdfFileName(book)
  const decision = inferPdfDocumentType({ fileName: sourceFileName })
  const type = decision.type === 'personal' ? 'personal'
    : book?.documentType === 'book' ? 'book'
      : hasLegacyBookEvidence(book) ? 'book' : 'unclassified'
  return {
    ...withDocumentType(book, type, { automatic: true }),
    reviewState: type === 'unclassified' ? 'new' : null,
    sourceFileName: sourceFileName || book.sourceFileName,
    documentTypeClassificationVersion: 3,
  }
}
