// Activity is kept per book and per local calendar day. Older books have no
// history to reconstruct, so the analytics screen treats missing values as such.
const keyFor = (bookId) => `bookish:book-analytics:v1:${bookId}`

export function localDay(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function readBookAnalytics(bookId) {
  if (!bookId || typeof localStorage === 'undefined') return null
  try {
    const value = JSON.parse(localStorage.getItem(keyFor(bookId)) || 'null')
    return value && typeof value === 'object' ? value : null
  } catch {
    return null
  }
}

export function recordBookActivity(bookId, { mode, seconds = 0, page, chapter, completed = false } = {}) {
  if (!bookId || typeof localStorage === 'undefined') return null
  const now = new Date()
  const previous = readBookAnalytics(bookId) || {}
  const days = { ...(previous.days || {}) }
  const day = localDay(now)
  const daily = { ...(days[day] || { read: 0, listened: 0 }) }
  const elapsed = Math.max(0, Math.min(60, Number(seconds) || 0))
  if (mode === 'read' || mode === 'listened') daily[mode] = (Number(daily[mode]) || 0) + elapsed
  days[day] = daily

  const next = {
    ...previous,
    firstAt: previous.firstAt || now.toISOString(),
    lastAt: now.toISOString(),
    completedAt: previous.completedAt || (completed ? now.toISOString() : null),
    days,
    pagesAdvanced: Number(previous.pagesAdvanced) || 0,
    chaptersAdvanced: Number(previous.chaptersAdvanced) || 0,
  }
  // Only an adjacent forward move is counted as reading speed. Opening a saved
  // position or jumping through the TOC must not count skipped pages.
  if (Number.isInteger(page) && page >= 1) {
    if (Number(previous.lastPage) + 1 === page) next.pagesAdvanced += 1
    next.lastPage = page
  } else if (typeof page === 'string' && /^\d+:\d+$/.test(page)) {
    const [section, pageInSection] = page.split(':').map(Number)
    const [lastSection, lastPageInSection] = String(previous.lastPagedPosition || '').split(':').map(Number)
    if (section === lastSection && pageInSection === lastPageInSection + 1) next.pagesAdvanced += 1
    next.lastPagedPosition = page
  }
  if (Number.isInteger(chapter) && chapter >= 1) {
    if (Number(previous.lastChapter) + 1 === chapter) next.chaptersAdvanced += 1
    next.lastChapter = chapter
  }
  try { localStorage.setItem(keyFor(bookId), JSON.stringify(next)) } catch { /* Storage may be full. */ }
  return next
}

export function bookStreak(days, today = new Date()) {
  const active = (date) => {
    const row = days?.[localDay(date)]
    return (Number(row?.read) || 0) + (Number(row?.listened) || 0) > 0
  }
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (!active(cursor)) cursor.setDate(cursor.getDate() - 1)
  let count = 0
  while (active(cursor)) {
    count += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return count
}

export function calendarDaysBetween(start, end) {
  if (!start || !end) return null
  const first = new Date(start)
  const last = new Date(end)
  if (!Number.isFinite(first.getTime()) || !Number.isFinite(last.getTime())) return null
  const a = Date.UTC(first.getFullYear(), first.getMonth(), first.getDate())
  const b = Date.UTC(last.getFullYear(), last.getMonth(), last.getDate())
  return Math.max(1, Math.round((b - a) / 86400000) + 1)
}
