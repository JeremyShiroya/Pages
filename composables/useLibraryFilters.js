import { computed, reactive } from 'vue'
import { useBookishSettings } from '~/composables/useBookishSettings'
import { documentTypeOf } from '~/composables/useDocumentReview'

// Per-page library filter state.
//
// Filters used to be split between two bad homes: Status was a bare `ref('all')`
// inside each list component (so it died with the component — which is why
// opening a book and coming back reset it), and Format was a single library-wide
// setting every Filter panel wrote (so changing it on Favourites silently changed
// it on Series). Both now live here, keyed by SCOPE, and persist across
// navigation.
//
// A scope is a stable string naming the list: 'books', 'favourites', 'hidden',
// 'series', 'playlists', or a per-group id like 'series:12' / 'playlist:3'.

export const LIBRARY_FILTERS_KEY_PREFIX = 'bookish:filters:'

export const DEFAULT_LIBRARY_FILTERS = Object.freeze({
  status: 'all',
  format: 'all',
  documentType: 'all',
})

const STATUS_OPTIONS = ['all', 'Unread', 'Reading', 'Read']
const FORMAT_OPTIONS = ['all', 'epub', 'pdf']
const DOCUMENT_TYPE_OPTIONS = ['all', 'book', 'personal', 'unclassified']

export function normalizeLibraryFilters(value, extras = {}) {
  const source = value && typeof value === 'object' ? value : {}
  const normalized = {
    status: STATUS_OPTIONS.includes(source.status) ? source.status : DEFAULT_LIBRARY_FILTERS.status,
    format: FORMAT_OPTIONS.includes(source.format) ? source.format : DEFAULT_LIBRARY_FILTERS.format,
    documentType: DOCUMENT_TYPE_OPTIONS.includes(source.documentType) ? source.documentType : DEFAULT_LIBRARY_FILTERS.documentType,
  }
  // Pages contribute their own groups (Series has "Books collected", Playlists
  // sorts by name). They are free-form, so they are kept only when the page
  // still declares them — a renamed filter cannot resurrect a stale value.
  for (const [key, allowed] of Object.entries(extras)) {
    const candidate = source[key]
    normalized[key] = Array.isArray(allowed) && allowed.includes(candidate) ? candidate : allowed?.[0]
  }
  return normalized
}

const storageKey = (scope) => `${LIBRARY_FILTERS_KEY_PREFIX}${scope}`

// Injectable so tests can drive the persistence without a real localStorage —
// the Nuxt test environment's stub is not a working Storage.
const resolveStorage = (storage) => {
  if (storage) return storage
  if (typeof localStorage === 'undefined') return null
  return localStorage
}

// Module-level so a back-navigation within the session restores instantly
// instead of round-tripping storage on every mount.
const scopeCache = reactive({})

// A saved page filter can outlive the format it selected. Clear it in memory
// and in storage when the app's handled formats change.
export function clearUnavailableLibraryFormatFilters(enabledFormats, storage = null) {
  const allowed = new Set(enabledFormats || [])
  const target = resolveStorage(storage)
  const scopes = new Set(Object.keys(scopeCache))
  if (target) {
    try {
      for (let i = 0; i < target.length; i += 1) {
        const key = target.key(i)
        if (key?.startsWith(LIBRARY_FILTERS_KEY_PREFIX)) scopes.add(key.slice(LIBRARY_FILTERS_KEY_PREFIX.length))
      }
    } catch {}
  }
  for (const scope of scopes) {
    let current = scopeCache[scope]
    if (!current) {
      try { current = JSON.parse(target?.getItem(storageKey(scope)) || 'null') } catch {}
    }
    if (!current || current.format === 'all' || allowed.has(current.format)) continue
    const updated = { ...current, format: 'all' }
    if (scopeCache[scope]) scopeCache[scope] = updated
    try { target?.setItem(storageKey(scope), JSON.stringify(updated)) } catch {}
  }
}

export function resetLibraryFiltersForTests() {
  for (const key of Object.keys(scopeCache)) delete scopeCache[key]
}

function loadScope(scope, extras, storage) {
  if (scopeCache[scope]) return scopeCache[scope]

  const target = resolveStorage(storage)
  let stored = null
  try {
    stored = target ? JSON.parse(target.getItem(storageKey(scope)) || 'null') : null
  } catch {
    stored = null
  }

  const normalized = normalizeLibraryFilters(stored, extras)
  const { settings } = useBookishSettings()
  if (normalized.format !== 'all' && !settings.value.enabledFormats.includes(normalized.format)) {
    normalized.format = 'all'
  }
  scopeCache[scope] = normalized
  return scopeCache[scope]
}

/**
 * @param {string} scope   stable id for the list this panel belongs to
 * @param {object} extras  { extraKey: [allowedValues] } — first value is default
 * @param {Storage} [storage] override, for tests
 */
export const useLibraryFilters = (scope, extras = {}, storage = null) => {
  const key = String(scope || 'library')
  loadScope(key, extras, storage)

  const filters = computed(() => scopeCache[key])

  const setFilters = (patch) => {
    scopeCache[key] = normalizeLibraryFilters({ ...scopeCache[key], ...patch }, extras)
    const target = resolveStorage(storage)
    try {
      target?.setItem(storageKey(key), JSON.stringify(scopeCache[key]))
    } catch {
      // Private browsing or a full quota — the filters simply stay in memory.
    }
    return scopeCache[key]
  }

  const setFilter = (name, value) => setFilters({ [name]: value })

  const resetFilters = () => setFilters({ ...DEFAULT_LIBRARY_FILTERS })

  const hasActiveFilter = computed(() => (
    Object.entries(scopeCache[key]).some(([name, value]) => (
      name in DEFAULT_LIBRARY_FILTERS
        ? value !== DEFAULT_LIBRARY_FILTERS[name]
        : value !== extras[name]?.[0]
    ))
  ))

  // Two format controls stack, and they are not the same thing:
  //
  //   settings.formatFilter — Preferences → "Book format". App-wide HIDE: the
  //     app still handles the format, it just isn't shown. Applies everywhere.
  //   filters.format        — this page's own Filter panel. Narrows further,
  //     and says nothing about any other page.
  //
  // A book has to pass both. (Neither is `enabledFormats`, which decides whether
  // the app handles the format at all — see useFormatEnablement.)
  const { settings } = useBookishSettings()

  const matches = (book, statusOf) => {
    const hidden = settings.value.formatFilter || 'all'
    if (hidden !== 'all' && String(book?.format || '').toLowerCase() !== hidden) return false
    return matchesLibraryFilters(book, scopeCache[key], statusOf)
  }

  return { filters, setFilter, setFilters, resetFilters, hasActiveFilter, matches }
}

// Drops books the scope's filters exclude — the PAGE's filters only. Callers
// that also need the app-wide hide should use the `matches` returned by
// useLibraryFilters, which folds both in.
//
// Format is compared case-insensitively because books carry `format` as a
// free-form string.
export function matchesLibraryFilters(book, filters, statusOf = (b) => b?.status) {
  const status = filters?.status || 'all'
  const format = filters?.format || 'all'
  const documentType = filters?.documentType || 'all'
  if (status !== 'all' && (statusOf(book) || 'Unread') !== status) return false
  if (format !== 'all' && String(book?.format || '').toLowerCase() !== format) return false
  if (documentType !== 'all' && documentTypeOf(book) !== documentType) return false
  return true
}
