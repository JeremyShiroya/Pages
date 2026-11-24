// Activity is kept per book and per local calendar day. Older books have no
// history to reconstruct, so the analytics screen treats missing values as such.
const keyFor = (bookId) => `bookish:book-analytics:v1:${bookId}`
// Quiet time that ends a reading session.
const SESSION_GAP_MS = 1000 * 60 * 20
// A page that took longer than this was not being read the whole time.
const MAX_PAGE_SECONDS = 60 * 10
const MIN_PAGE_SECONDS = 2
const MIN_CHAPTER_SECONDS = 60
const MAX_CHAPTER_SECONDS = 60 * 60 * 3

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
    pageSeconds: Number(previous.pageSeconds) || 0,
    sessions: Number(previous.sessions) || 0,
  }
  // A new session starts after a long quiet gap — that is what "average
  // session" on the analytics page is measured against.
  if (elapsed > 0 && (!previous.lastAt || now - new Date(previous.lastAt) > SESSION_GAP_MS)) next.sessions += 1
  // Only an adjacent forward move is counted as reading speed. Opening a saved
  // position or jumping through the TOC must not count skipped pages.
  let turned = false
  if (Number.isInteger(page) && page >= 1) {
    if (Number(previous.lastPage) + 1 === page) turned = true
    next.lastPage = page
  } else if (typeof page === 'string' && /^\d+:\d+$/.test(page)) {
    const [section, pageInSection] = page.split(':').map(Number)
    const [lastSection, lastPageInSection] = String(previous.lastPagedPosition || '').split(':').map(Number)
    // Turning from the last page of one chapter to the first of the next is a
    // page turn too — it used to be dropped, so chapter-heavy books undercounted.
    if (section === lastSection && pageInSection === lastPageInSection + 1) turned = true
    else if (section === lastSection + 1 && pageInSection === 0 && Number.isFinite(lastPageInSection)) turned = true
    next.lastPagedPosition = page
  }
  if (turned) {
    next.pagesAdvanced += 1
    // Time on the page just finished, measured between turns. A long gap means
    // the reader put the book down, so it is left out instead of skewing speed.
    // A flick through in under two seconds is skimming, not reading.
    const since = previous.lastTurnAt ? (now - new Date(previous.lastTurnAt)) / 1000 : 0
    const timed = since >= MIN_PAGE_SECONDS && since <= MAX_PAGE_SECONDS
    if (timed) next.pageSeconds += since
    next.timedPages = (Number(previous.timedPages) || 0) + (timed ? 1 : 0)
  }
  if (page !== undefined) next.lastTurnAt = now.toISOString()
  if (Number.isInteger(chapter) && chapter >= 1) {
    // A chapter only counts as finished when time was actually spent in it.
    // Counting every +1 section change let position saves during loading or
    // fast skimming log "21 chapters at 2 seconds each".
    if (Number(previous.lastChapter) + 1 === chapter) {
      const dwell = previous.lastChapterAt ? (now - new Date(previous.lastChapterAt)) / 1000 : 0
      if (dwell >= MIN_CHAPTER_SECONDS && dwell <= MAX_CHAPTER_SECONDS) {
        next.chaptersAdvanced += 1
        next.chapterSeconds = (Number(previous.chapterSeconds) || 0) + dwell
        next.timedChapters = (Number(previous.timedChapters) || 0) + 1
      }
    }
    if (Number(previous.lastChapter) !== chapter || !previous.lastChapterAt) next.lastChapterAt = now.toISOString()
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

// Longest run of consecutive active days with this book, ever.
export function longestBookStreak(days) {
  const keys = Object.entries(days || {})
    .filter(([, row]) => (Number(row?.read) || 0) + (Number(row?.listened) || 0) > 0)
    .map(([key]) => key)
    .sort()
  let best = 0
  let run = 0
  let previous = null
  for (const key of keys) {
    const [year, month, day] = key.split('-').map(Number)
    const stamp = Date.UTC(year, month - 1, day) / 86400000
    run = previous !== null && stamp - previous === 1 ? run + 1 : 1
    best = Math.max(best, run)
    previous = stamp
  }
  return best
}
