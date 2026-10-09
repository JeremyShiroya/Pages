import { foldDocumentText } from '~/composables/documentIntelligence'
import { documentTypeOf, validIsbn } from '~/composables/useDocumentReview'

export const canSearchCatalog = (book, evidence = null) => {
  if (documentTypeOf(book) !== 'book') return false
  if (String(book?.format).toLowerCase() !== 'pdf') return true
  if (book?.documentTypeChosenByUser) return Boolean(book.title)
  return ['local', 'legacy-provisional'].includes(book?.intelligence?.kindSource)
    && Boolean(evidence?.bibliographic?.title || book?.title)
}

export function buildDocumentQuery(book, evidence) {
  if (!canSearchCatalog(book, evidence)) return null
  const title = evidence?.bibliographic?.title || ''
  // Automatic queries must come from original source evidence. Only an
  // explicit Book choice allows the user-supplied display title as fallback.
  if (!title && !book.documentTypeChosenByUser) return null
  return { title: title || book.title, author: evidence?.bibliographic?.author || undefined }
}

export const canApplyCatalogMetadata = (book) => {
  if (documentTypeOf(book) !== 'book') return false
  if (String(book?.format).toLowerCase() !== 'pdf') return true
  return ['verified-edition', 'user-approved'].includes(book?.intelligence?.identity?.status)
}

const candidateIsbns = (candidate) => [candidate?.isbn, candidate?.isbn13, candidate?.isbn10]
  .flatMap((value) => Array.isArray(value) ? value : [value]).filter(Boolean)
  .map((value) => String(value).replace(/[^0-9X]/gi, '').toUpperCase())

export function verifyCatalogCandidate(evidence, candidate) {
  const title = foldDocumentText(candidate?.title)
  const author = foldDocumentText(candidate?.author)
  if (!title || !author || evidence?.extraction !== 'readable') return { status: 'candidate', reasons: ['Insufficient local text'] }
  const front = foldDocumentText((evidence.samples || []).filter((sample) => sample.page <= 6).map((sample) => sample.text).join(' '))
  const localTitle = foldDocumentText(evidence.bibliographic?.title || evidence.embedded?.title)
  const localAuthor = foldDocumentText(evidence.bibliographic?.author || evidence.embedded?.author)
  const titleCore = foldDocumentText(String(candidate.title).split(/[:—]/)[0])
  const titleMatch = (` ${front} `).includes(` ${title} `)
    || (localTitle && titleCore === localTitle && (` ${front} `).includes(` ${localTitle} `))
  const nameTokens = (value) => value.split(' ').filter(Boolean).sort()
  const authorTokens = nameTokens(author)
  const localTokens = nameTokens(localAuthor)
  const nameVariant = localTokens.length >= 2 && localTokens.length === authorTokens.length
    && localTokens.every((token, index) => token === authorTokens[index]
      || (Math.min(token.length, authorTokens[index].length) === 1 && token[0] === authorTokens[index][0]))
  const authorMatch = (` ${front} `).includes(` ${author} `) || nameVariant && (` ${front} `).includes(` ${localAuthor} `)
  if (!titleMatch || !authorMatch) return { status: 'rejected', reasons: [!titleMatch ? 'Title conflicts with the file' : 'Author conflicts with the file'] }
  const ownIsbns = (evidence.identifiers || []).filter((item) => item.page <= 6 && validIsbn(item.value))
    .map((item) => item.value.replace(/[^0-9X]/gi, '').toUpperCase())
  const editionMatch = ownIsbns.some((value) => candidateIsbns(candidate).includes(value))
  return { status: editionMatch ? 'verified-edition' : 'verified-work',
    reasons: editionMatch ? ['Title, author, and front-matter ISBN agree'] : ['Title and author agree with front matter'] }
}

export function selectVerifiedCatalogCandidate(evidence, candidates = []) {
  const assessed = candidates.map((candidate) => ({ candidate, verdict: verifyCatalogCandidate(evidence, candidate) }))
  const verified = assessed.filter((item) => item.verdict.status.startsWith('verified'))
  const works = new Map()
  for (const item of verified) {
    const key = `${foldDocumentText(String(item.candidate.title).split(/[:—]/)[0])}:${foldDocumentText(item.candidate.author)}`
    const group = works.get(key) || []
    group.push(item)
    works.set(key, group)
  }
  if (works.size !== 1) return { status: works.size > 1 ? 'conflict' : 'unresolved', assessed }
  const group = [...works.values()][0]
  const chosen = group.find((item) => item.verdict.status === 'verified-edition') || group[0]
  return { status: chosen.verdict.status, candidate: chosen.candidate, assessed }
}

export function applyVerifiedMetadata(book, candidate, identityStatus) {
  if (!['verified-work', 'verified-edition', 'user-approved'].includes(identityStatus)) return book
  const next = { ...book }
  const fields = identityStatus === 'verified-edition' || identityStatus === 'user-approved'
    ? ['title', 'author', 'blurb', 'genre', 'series', 'publisher', 'publishYear', 'cover']
    : ['title', 'author', 'blurb', 'genre', 'series']
  const fieldProvenance = { ...(book.fieldProvenance || {}) }
  let changed = false
  for (const field of fields) {
    if (book.userDefined === true || book.userDefined?.[field] === true) continue
    const placeholder = field === 'cover' && String(next.cover || '').startsWith('data:image/svg+xml')
    if (next[field] && !placeholder || !candidate?.[field]) continue
    next[field] = candidate[field]
    fieldProvenance[field] = { source: candidate.primarySource || candidate.source || 'catalog',
      identityStatus, previousValue: book[field] ?? null, appliedAt: Date.now() }
    changed = true
  }
  if (changed) next.fieldProvenance = fieldProvenance
  return next
}
