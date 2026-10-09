export function seriesMembership(book) {
  if (String(book?.series || '').trim()) return 'series'
  if (book?.seriesChecked && (book?.seriesStatus === 'standalone' || book?.userDefined?.series === true)) return 'standalone'
  return 'unknown'
}

export function seriesDisplayLabel(book) {
  const type = book?.documentTypeChosenByUser ? book.documentType : book?.intelligence?.kind || book?.documentType
  if (type === 'personal') return 'Personal document'
  if (type === 'unclassified') return 'Type undecided'
  return book?.series || (seriesMembership(book) === 'standalone' ? 'Standalone' : 'Series unknown')
}

export function applySeriesChoice(book, choice) {
  if (choice === 'series') return book
  const userDefined = book.userDefined === true ? true : { ...(book.userDefined || {}) }
  if (userDefined !== true) {
    for (const field of ['series', 'seriesInstallment', 'seriesTotal']) {
      if (choice === 'standalone') userDefined[field] = true
      else delete userDefined[field]
    }
  }
  return { ...book, series: null, seriesInstallment: null, seriesTotal: null,
    seriesStatus: choice, seriesChecked: choice === 'standalone', userDefined }
}
