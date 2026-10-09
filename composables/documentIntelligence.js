// Local, explainable document evidence. Scores are votes from independent
// document structures, not probabilities or assertions of catalog identity.
import { sourceBookIdentity } from './sourceBookIdentity'
export const INTELLIGENCE_VERSION = 3

export function selectPdfEvidencePages(total, outline = []) {
  const count = Math.max(0, Number(total) || 0)
  if (count <= 12) return Array.from({ length: count }, (_, i) => i + 1)
  const selected = new Set([1, 2, 3, 4, 5, 6, Math.ceil(count / 4), Math.ceil(count / 2), Math.ceil(count * .75), count])
  for (const entry of outline) {
    if (selected.size >= 12) break
    if (entry.page > 0 && entry.page <= count) selected.add(Number(entry.page))
  }
  return [...selected].sort((a, b) => a - b)
}

export const foldDocumentText = (value) => String(value || '')
  .normalize('NFKD').replace(/\p{Mark}/gu, '')
  .toLocaleLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, ' ').trim()

const decode = (value) => String(value || '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&(?:amp|lt|gt|quot|#39);/g, (match) => ({
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
  })[match] || match)
  .replace(/\s+/g, ' ').trim()

export function samplePdfPages(html, totalPages = 0, outline = []) {
  const pattern = /<div\s+data-pdf-page="(\d+)"[^>]*>([\s\S]*?)<\/div>/g
  const source = String(html || '')
  let found = 0
  for (const _match of source.matchAll(pattern)) found += 1
  if (!found) {
    const text = decode(source).slice(0, 4000)
    return { samples: source ? [{ page: 1, text }] : [], extraction: text.length >= 30 ? 'readable' : 'no-text', totalPages: Number(totalPages) || (source ? 1 : 0) }
  }
  const selected = new Set(selectPdfEvidencePages(Number(totalPages) || found, outline))
  const chosen = []
  let index = 0
  for (const match of source.matchAll(pattern)) {
    if (selected.has(Number(match[1]))) chosen.push({ page: Number(match[1]), text: decode(match[2]).slice(0, 6000),
      lines: match[2].split(/<\/p>|<br\s*\/?>/i).map(decode).filter(Boolean).slice(0, 80) })
    index += 1
  }
  return { samples: chosen, extraction: chosen.some((page) => page.text.length >= 30) ? 'readable' : 'no-text', totalPages: Number(totalPages) || found }
}

const BOOK_MARKERS = [
  ['chapters', /\b(?:chapter\s+(?:\d+|[ivxlcdm]+|one|two)|prologue|epilogue)\b/i],
  ['front-matter', /\b(?:copyright|all rights reserved|published by|first edition|imprint)\b/i],
  ['contents', /\b(?:table of contents|contents)\b/i],
  ['author-back-matter', /\babout the author\b[\s\S]{0,120}\balso by\s+[\p{L}]/iu],
]
const DOCUMENT_MARKERS = [
  ['transaction', /\b(?:invoice\s*(?:number|no\.?|#)|receipt\s*(?:number|no\.?|#)|amount due|balance due)\b/i],
  ['account', /\b(?:account\s*(?:number|no\.?|#)|statement period|billing address)\b/i],
  ['form', /\b(?:patient\s+(?:name|id)|employee\s+id|pay period|taxpayer identification)\b/i],
  ['fields', /\b(?:date of birth|signature|bill to|payment due)\s*:/i],
]

export function collectDocumentEvidence({ format = 'pdf', fileName = '', path = '', content = '', pages = 0, embeddedTitle = '', embeddedAuthor = '', tocItems = [], extractionStatus = null } = {}) {
  const sampled = samplePdfPages(content, pages, tocItems)
  const front = sampled.samples.filter((item) => item.page <= 6)
  const frontText = front.map((item) => item.text).join(' ').slice(0, 12000)
  const allSampleText = sampled.samples.map((item) => item.text).join(' ').slice(0, 18000)
  const signals = []
  for (const [name, pattern] of BOOK_MARKERS) {
    const region = name === 'chapters' || name === 'contents' ? sampled.samples : front
    for (const match of region.filter((item) => pattern.test(item.text))) signals.push({ family: 'book', name, page: match.page })
  }
  if ((tocItems || []).length >= 3) signals.push({ family: 'book', name: 'outline', page: null })
  if (sampled.samples.filter((page) => page.text.split(/\s+/).length >= 90).length >= 3) {
    signals.push({ family: 'book', name: 'sustained-prose', page: sampled.samples[1]?.page || 1 })
  }
  for (const [name, pattern] of DOCUMENT_MARKERS) {
    const match = front.find((item) => item.page <= 2 && pattern.test(item.text))
    if (match) signals.push({ family: 'document', name, page: match.page })
  }
  const lines = front.flatMap((item) => (item.lines || []).map((text) => ({ text, page: item.page })))
  const isTitle = (value) => value.length >= 4 && value.length <= 140
    && !/^(?:copyright|all rights|contents|isbn|chapter|www\.|https?:)/i.test(value)
    && !/\.(?:pdf|docx?)$/i.test(value) && !/\b(?:microsoft word|acrobat|untitled)\b/i.test(value)
  const embeddedTitleVisible = embeddedTitle && front.some((p) => foldDocumentText(p.text).includes(foldDocumentText(embeddedTitle)))
  const fileTitle = foldDocumentText(String(fileName).replace(/\.pdf$/i, '').replace(/[_-]/g, ' '))
  const titleLine = lines.find((line) => isTitle(line.text) && fileTitle && foldDocumentText(line.text) === fileTitle)
    || lines.find((line) => isTitle(line.text) && line.page <= 2)
  const title = String(embeddedTitleVisible ? embeddedTitle : titleLine?.text || '').trim()
  const byline = lines.find((line) => /^by\s+[\p{L}][\p{L}.\-' ]{3,70}$/iu.test(line.text))
  const titleIndex = lines.findIndex((line) => foldDocumentText(line.text) === foldDocumentText(title))
  const following = lines[titleIndex + 1]
  const looksLikeName = following && following.page === lines[titleIndex]?.page
    && /^[\p{Lu}][\p{L}.'-]+(?:\s+[\p{Lu}][\p{L}.'-]+){1,3}$/u.test(following.text)
    && !/\b(?:press|edition|volume|chapter|contents|published|rights|reserved)\b/i.test(following.text)
  const embeddedAuthorVisible = embeddedAuthor && front.some((p) => foldDocumentText(p.text).includes(foldDocumentText(embeddedAuthor)))
  const author = String(embeddedAuthorVisible ? embeddedAuthor : byline?.text.replace(/^by\s+/i, '') || (looksLikeName ? following.text : '')).trim()
  if (byline) signals.push({ family: 'book', name: 'byline', page: byline.page })
  if (title && author && foldDocumentText(frontText).includes(foldDocumentText(title))
    && foldDocumentText(frontText).includes(foldDocumentText(author))) {
    signals.push({ family: 'book', name: 'embedded-title-byline', page: front[0]?.page || 1 })
  }
  const sourceTitle = foldDocumentText(sourceBookIdentity(fileName).title)
  if (sourceTitle.length >= 5 && (` ${foldDocumentText(frontText)} `).includes(` ${sourceTitle} `)) {
    signals.push({ family: 'book', name: 'source-title', page: 1 })
  }
  const identifiers = []
  for (const page of front) {
    for (const match of page.text.matchAll(/\bISBN(?:-1[03])?\s*[:#]?\s*((?:97[89][\s-]?)?\d[\d\s-]{8,20}[\dX])/gi)) {
      identifiers.push({ type: 'isbn', value: match[1].trim(), page: page.page })
    }
  }
  const opening = front.filter((p) => p.page <= 2).map((p) => p.text).join(' ')
  const short = sampled.totalPages <= 12
  const has = (pattern) => pattern.test(opening)
  const purposes = [
    ['curriculum-vitae', short && has(/\b(?:professional summary|curriculum vitae|work experience|employment history|education|skills)\b/i)
      && has(/\b(?:references|referees|experience|skills|education)\b/i) && has(/\b(?:email|tel|phone|linkedin|github)\b|[\w.+-]+@[\w.-]+/i)],
    ['correspondence', short && has(/\b(?:dear|re\s*:|application for|offer of admission|admission letter)\b/i)
      && has(/\b(?:yours|sincerely|human resource|registrar|p\.?o\.?\s*box|admission|adm no)\b/i)],
    ['certificate', short && has(/\bcertificate of (?:course completion|completion|achievement|participation)|\bcertif(?:ies|y) that\b/i)
      && has(/\b(?:student|course|completed|completion|awarded|successfully|credential)\b/i)],
    ['academic-record', has(/\b(?:result\s*slip|exam(?:ination)?\s*card|academic transcript)\b/i)
      && has(/\b(?:student name|reg(?:istration)?\s*(?:no|number)|course|programme)\b/i)],
    ['appointment', short && has(/\b(?:appointment slip|appointment date|appt no)\b/i)
      && has(/\b(?:name|clinic|doctor|appointment time|patient)\s*[:.]/i)],
    ['application-form', short && has(/\b(?:application form|proposal form|personal accident policy|insurance claim)\b/i)
      && has(/\b(?:id\s*(?:no|number)|name|signature|licen[cs]e|proposer|postal address)\b/i)],
    ['timetable', has(/\b(?:examination|examinations|exam)\b/i) && has(/\btimetable\b/i) && has(/\b(?:venue|semester|unit title)\b/i)],
    ['fee-schedule', has(/\bfees? structure\b/i) && has(/\b(?:academic year|programmes|tuition|semester)\b/i)],
    ['academic-paper', has(/\b(?:theses|dissertations|thesis|digital commons|scholarworks)\b/i)
      && has(/\b(?:university|graduate|honors program|submitted|degree)\b/i)],
    ['course-notes', /\btopic\s*\d+\b/i.test(fileName) && has(/\b(?:data structure|algorithm|topic one|topic two|topic three|learning outcome)\b/i)],
    ['business-plan', short && has(/\b(?:revenue generation|cost structure|business plan|revenue plan|project proposal)\b/i)
      && has(/\b(?:budget|overview|platform|cost|revenue)\b/i)],
    ['course-brochure', short && has(/\b(?:bootcamp|course brochure|course outline)\b/i) && has(/\b(?:partnership|curriculum|duration|fees|enroll|modules)\b/i)],
    ['scanned-form', short && sampled.extraction === 'no-text' && /\b(?:exam application form|driving test application|appointment slip|result\s*slip|exam card)\b/i.test(fileName)],
  ].filter(([, matched]) => matched).map(([purpose]) => purpose)
  for (const purpose of purposes) signals.push({ family: 'document', name: purpose, page: 1 })
  return {
    version: INTELLIGENCE_VERSION, format, fileName, path, pages: sampled.totalPages,
    extraction: extractionStatus || sampled.extraction,
    embedded: { title: String(embeddedTitle || ''), author: String(embeddedAuthor || '') },
    bibliographic: { title, author, titlePage: titleLine?.page || 1 }, purposes, signals, identifiers,
    sampledPages: sampled.samples.map((item) => item.page),
    samples: sampled.samples.map((item) => ({ page: item.page, text: item.text.slice(0, 6000), lines: item.lines || [] })),
    // This is local evidence only. It must never be sent to a catalog API.
    excerpt: allSampleText.slice(0, 12000),
  }
}

export function decideDocumentKind(evidence, { userChoice = null } = {}) {
  if (userChoice) return { kind: userChoice, source: 'user', review: 'none', reason: 'Chosen by you' }
  if (evidence?.format === 'epub') return { kind: 'book', source: 'format', review: 'none', reason: 'EPUB publication' }
  const book = new Set((evidence?.signals || []).filter((signal) => signal.family === 'book').map((signal) => signal.name))
  const document = new Set((evidence?.signals || []).filter((signal) => signal.family === 'document').map((signal) => signal.name))
  const bookStructure = book.has('chapters') || book.has('outline') || book.has('contents') || book.has('sustained-prose')
  const publication = book.has('front-matter') || book.has('embedded-title-byline') || book.has('byline') || book.has('source-title') || book.has('author-back-matter')
  const chapterPages = new Set((evidence?.signals || []).filter((s) => s.name === 'chapters').map((s) => s.page)).size
  const formStructure = document.has('transaction') && (document.has('account') || document.has('fields'))
    || document.has('form') && document.has('fields')
  if (evidence?.purposes?.length) return { kind: 'personal', source: 'local', review: 'none', reason: `Document structure: ${evidence.purposes.join(', ')}` }
  if (bookStructure && publication && formStructure) {
    return { kind: 'unclassified', source: 'local', review: 'conflict', reason: 'Publication and form evidence disagree' }
  }
  if (bookStructure && publication || chapterPages >= 2 && book.has('sustained-prose') && !formStructure) return { kind: 'book', source: 'local', review: 'none', reason: 'Publication structure across sampled pages' }
  if (formStructure && !bookStructure) return { kind: 'personal', source: 'local', review: 'none', reason: 'Document form structure' }
  return { kind: 'unclassified', source: 'local', review: 'none', reason: evidence?.extraction === 'no-text' ? 'No readable text yet' : 'Not enough independent evidence' }
}

export function createIntelligenceSnapshot(evidence, choice = null) {
  const decision = decideDocumentKind(evidence, { userChoice: choice })
  return { engineVersion: INTELLIGENCE_VERSION, kind: decision.kind, kindSource: decision.source,
    kindReason: decision.reason, identity: { status: 'unresolved' },
    analysis: evidence?.extraction === 'no-text' ? 'needs-ocr' : 'complete',
    review: decision.review, evidenceVersion: evidence?.version || INTELLIGENCE_VERSION }
}
