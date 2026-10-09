// Conservative filename identity for imports and repair of the v1/v2 sorter.
// The sorting engine must never use an arbitrary page line as a book title.
export function sourceBookIdentity(fileName) {
  let name = String(fileName || '').replace(/\.pdf$/i, '')
    .replace(/^_?(?:oceanofpdf|readrobe|pdfdrive)\.com_*/i, '')
    .replace(/\s*\([^)]*$/g, '').replace(/\s*\([^)]*\)\s*$/g, '')
    .replace(/[-_]English[-_]Full$/i, '').replace(/_+/g, ' ').trim()
  const parts = name.split(/\s+-\s+/)
  const title = (parts[0] || name).replace(/-/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/\s+(?:en|english)$/i, '').replace(/\s+\d+(?:st|nd|rd|th)\s+(?:ed\.?|edition)$/i, '')
  const author = parts.length === 2 && /^[\p{L} .'-]{5,70}$/u.test(parts[1]) ? parts[1].trim() : ''
  return { title, author }
}

export function sourceDocumentIdentity(fileName, evidence) {
  const source = sourceBookIdentity(fileName)
  const key = (value) => String(value || '').normalize('NFKD').replace(/\p{Mark}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
  const embedded = evidence?.embedded || {}
  const titleAgrees = key(embedded.title) && key(source.title) === key(embedded.title)
  const credibleAuthor = /^[\p{L}][\p{L} .,'’\-]{4,99}$/u.test(embedded.author || '')
    && !/\b(?:unknown|administrator|microsoft|untitled|user)\b/i.test(embedded.author)
  // Embedded catalog fields may seed a query when the independent filename
  // agrees. Never substitute arbitrary extracted page lines for these fields.
  return { title: titleAgrees ? embedded.title : source.title,
    author: source.author || (titleAgrees && credibleAuthor ? embedded.author : '') }
}
