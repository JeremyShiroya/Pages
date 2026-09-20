export const AUTHOR_DETAILS_VERSION = 8

export const authorDetailsVersion = (book) => {
  const version = Number(book?.authorDetailsVersion)
  return Number.isFinite(version) ? version : 0
}

export const newestAuthorRecordFirst = (left, right) => {
  const versionDifference = authorDetailsVersion(right) - authorDetailsVersion(left)
  if (versionDifference) return versionDifference

  return new Date(right?.updatedAt || 0).getTime() - new Date(left?.updatedAt || 0).getTime()
}
