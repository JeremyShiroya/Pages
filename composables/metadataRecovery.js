import { sourceBookIdentity } from './sourceBookIdentity'

// One-time repair of the v1/v2 sorter writing guessed page lines as titles.
// Keep an exact backup; never infer a replacement for user-edited fields.
export function recoverLegacyMetadata(book, evidence) {
  if (book.metadataRecoveryVersion === 2 || book.format !== 'pdf' || !book.intelligence?.engineVersion || book.intelligence.engineVersion > 2 && book.metadataRecoveryVersion !== 1) return book
  const next = { ...book, metadataRecoveryVersion: 2 }
  if (!book.documentTypeChosenByUser && book.intelligence.engineVersion < 3) {
    next.documentType = 'unclassified'
    next.intelligence = { ...book.intelligence, kind: 'unclassified' }
  }
  const source = sourceBookIdentity(book.sourceFileName || evidence?.fileName)
  const unlocked = (field) => book.userDefined !== true && !book.userDefined?.[field]
  const previousTitle = book.metadataRecoveryBackup?.title || book.title
  const boilerplate = /^(?:thank you for|downloaded from|published by)\b|\bpublications$/i.test(previousTitle)
    || /^(?:revisededition|secondedition|firstedition)$/i.test(previousTitle.replace(/\s/g, ''))
  const overwrittenTitle = evidence?.bibliographic?.title && previousTitle === evidence.bibliographic.title
  if (book.metadataRecoveryVersion === 1 && !boilerplate && unlocked('title') && book.metadataRecoveryBackup?.title) next.title = book.metadataRecoveryBackup.title
  if (unlocked('title') && source.title && overwrittenTitle && boilerplate && book.title !== source.title) {
    next.metadataRecoveryBackup = { title: book.title, author: book.author, recoveredAt: Date.now() }
    next.title = source.title
    if (unlocked('author') && source.author) next.author = source.author
    next.metaCheckedAt = 0
    next.metaCompleteAt = null
  }
  return next
}
