const normalized = (value: unknown) => String(value || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ')

const withoutArticle = (value: string) => value.replace(/^(?:the|a|an) /, '')

function oneEditApart(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0; let j = 0; let edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i += 1; j += 1; continue }
    if (++edits > 1) return false
    if (a.length >= b.length) i += 1
    if (b.length >= a.length) j += 1
  }
  return edits + Number(i < a.length || j < b.length) <= 1
}

function titleMatches(wanted: string, candidate: string, allowTypo: boolean) {
  const target = withoutArticle(normalized(wanted))
  const found = withoutArticle(normalized(candidate))
  if (!target || !found) return false
  if (target === found) return true
  // Edition subtitles are useful; a longer, different title is not.
  const candidateBase = candidate.split(/\s*[:(—–]\s*/)[0]
  if (withoutArticle(normalized(candidateBase)) === target) return true
  const targetBase = wanted.split(/\s*[:(—–]\s*/)[0]
  if (withoutArticle(normalized(targetBase)) === found) return true
  return allowTypo && target.length >= 9 && oneEditApart(target, found)
}

function authorMatches(wanted: string, candidate: string) {
  const authorTokens = (value: string) => {
    const first = value.split(/\s+(?:and|&)\s+|;/i)[0].trim()
    const commaParts = first.split(',').map((part) => part.trim())
    const ordered = commaParts.length === 2 && !commaParts[0].includes(' ')
      ? `${commaParts[1]} ${commaParts[0]}` : first
    return normalized(ordered).split(' ').filter(Boolean)
  }
  const target = authorTokens(wanted)
  const found = authorTokens(candidate)
  if (!target.length || !found.length) return false
  const surname = target.at(-1)
  if (found.at(-1) !== surname) return false
  return target.length === 1 || found.length === 1 || target[0][0] === found[0][0]
}

/** Require catalog evidence for both identity fields. A miss is better than a wrong cover. */
export function matchesRequestedBook(
  wantedTitle: string,
  wantedAuthor: string | null | undefined,
  candidateTitle: string | null | undefined,
  candidateAuthor: string | null | undefined,
) {
  if (!candidateTitle) return false
  const hasAuthor = Boolean(String(wantedAuthor || '').trim())
  if (hasAuthor && (!candidateAuthor || !authorMatches(String(wantedAuthor), candidateAuthor))) return false
  return titleMatches(wantedTitle, candidateTitle, hasAuthor)
}
