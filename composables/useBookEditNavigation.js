const safeReturnPath = (value, fallback = '/books') => {
  const path = Array.isArray(value) ? value[0] : value
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return fallback
  if (path.startsWith('/edit/')) return fallback
  return path
}

export const bookEditLocation = (bookId, returnTo = '/books') => ({
  path: `/edit/${bookId}`,
  query: { returnTo: safeReturnPath(returnTo) },
})

const BOOKS_SCROLL_KEY = 'bookish:books-edit-scroll'

export const rememberBooksEditScroll = (path, scrollY) => {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(BOOKS_SCROLL_KEY, JSON.stringify({
    path: safeReturnPath(path),
    scrollY: Math.max(0, Number(scrollY) || 0),
    savedAt: Date.now(),
  }))
}

export const takeBooksEditScroll = (path) => {
  if (typeof window === 'undefined') return null
  const saved = window.sessionStorage.getItem(BOOKS_SCROLL_KEY)
  if (!saved) return null
  window.sessionStorage.removeItem(BOOKS_SCROLL_KEY)
  try {
    const position = JSON.parse(saved)
    if (position.path !== path || Date.now() - position.savedAt > 30 * 60 * 1000) return null
    return Number.isFinite(position.scrollY) ? position.scrollY : null
  } catch {
    return null
  }
}

export const useBookEditReturn = () => {
  const route = useRoute()
  const router = useRouter()
  const returnTo = computed(() => safeReturnPath(route.query.returnTo))
  const returnFromEditor = () => router.replace(returnTo.value)

  return { returnTo, returnFromEditor }
}
