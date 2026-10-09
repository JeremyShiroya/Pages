export const normalizeMetadataText = (value) => String(value || '').normalize('NFKD')
  .replace(/\p{Mark}/gu, '').toLowerCase().replace(/['’]/g, '').replace(/[^\p{Letter}\p{Number}]+/gu, ' ').trim()

const titleCore = (value) => normalizeMetadataText(String(value || '').split(/\s*[:—]\s*/)[0]
  .replace(/\s*\([^)]*(?:edition|book\s*\d|series|#\s*\d)[^)]*\)\s*$/i, '')
  .replace(/\s+\d+(?:st|nd|rd|th)\s+(?:ed\.?|edition)$/i, ''))
  .replace(/\s+(?:a|an) (?:handbook|guide|introduction|novel|memoir)\b.*$/i, '')

export function metadataCandidateMatches(book, result) {
  if (!result) return false
  const title = titleCore(book?.title)
  const titles = (item) => {
    const values = [titleCore(item?.title)]
    const parts = String(item?.title || '').split(':')
    // Catalogs sometimes prefix a classic with its author's name.
    if (parts.length === 2 && normalizeMetadataText(item?.author).split(' ').includes(normalizeMetadataText(parts[0]))) values.push(titleCore(parts[1]))
    return values
  }
  if (!title || !titles(book).some((value) => titles(result).includes(value))) return false
  const author = normalizeMetadataText(book?.author)
  const other = normalizeMetadataText(result.author)
  if (!author) return true // Discovery is allowed; ambiguity is handled below.
  if (!other) return false
  if (author === other) return true
  const firstCreditedName = (raw) => String(raw || '').split(',').slice(0, 2).join(' ')
  if (String(book?.author).split(',').length >= 4 && normalizeMetadataText(firstCreditedName(book.author)).split(' ').sort().join(' ') === other.split(' ').sort().join(' ')) return true
  const tokens = (name) => name.split(' ').sort()
  const a = tokens(author), b = tokens(other)
  if (a.length !== b.length && Math.min(a.length, b.length) >= 2
    && a.filter((part) => part.length > 1).join(' ') === b.filter((part) => part.length > 1).join(' ')) return true
  return a.length === b.length && a.length >= 2 && a.every((part, i) => part === b[i]
    || (Math.min(part.length, b[i].length) === 1 && part[0] === b[i][0]))
}

export function selectMetadataCandidate(book, results = []) {
  const matching = results.filter((result) => metadataCandidateMatches(book, result))
  const authors = new Set(matching.map((result) => normalizeMetadataText(result.author)).filter(Boolean))
  if (!book?.author && authors.size > 1) return null
  return matching.find((result) => result.author) || null
}
