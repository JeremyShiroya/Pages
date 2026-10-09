// Metadata and document sorting are separate systems. Sorting contributes only
// handling type; it never proves a catalog identity or writes book details.
import { documentTypeOf } from './useDocumentReview'

export const metadataEligible = (book) => documentTypeOf(book) === 'book'
export { metadataCandidateMatches, selectMetadataCandidate, normalizeMetadataText } from '../utils/metadataIdentity'

export const METADATA_FIELDS = ['author', 'blurb', 'genre', 'series', 'seriesInstallment', 'seriesTotal', 'seriesChecked', 'seriesStatus', 'publisher', 'publishYear', 'cover', 'webReview', 'externalRatings', 'provenance', 'metaCompleteAt', 'metaCheckedAt', 'metaErrorCount']

export function mergeAutomaticMetadata(current, proposed) {
  const next = { ...current }
  if (!metadataEligible(current)) return next
  for (const field of METADATA_FIELDS) {
    if (!(field in proposed)) continue
    if (current.userDefined === true || current.userDefined?.[field] || field.startsWith('series') && current.userDefined?.series) continue
    if (field === 'seriesTotal' && Number(proposed[field]) < Number(current[field])) continue
    if (field === 'seriesTotal' && current[field] && !proposed[field]) continue
    next[field] = proposed[field]
  }
  return next
}
