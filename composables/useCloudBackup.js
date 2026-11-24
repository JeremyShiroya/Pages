import { computed, reactive, readonly, ref } from 'vue'
import { getSupabase, useAccount } from '~/composables/useAccount'
import { deserializeValue, serializeValue, useLibraryBackup } from '~/composables/useLibraryBackup'
import { useBookStorage } from '~/composables/useBookStorage'
import { PAGES_SCAN_FOLDERS_KEY } from '~/composables/useDeviceLibrarySync'
import { isNativeCapacitorPlatform } from '~/composables/useNativePlatform'
import { BACKUP_FORMAT_VERSION, decodeBackupPayload, encodeBackupPayload } from '~/utils/backupCodec'
import { assetRef, markAsset, mergeHeavyFields, splitHeavyFields } from '~/utils/backupAssets'

// Cloud backup = a compressed snapshot of the library (books, progress,
// highlights, collections, profile, settings) plus, optionally, each book's
// extracted content as its own compressed object.
//
// Why content is per book and not inside the snapshot:
// - memory: a 300-book library is hundreds of MB; one book at a time keeps the
//   heap flat (the app has OOM'd on large libraries before)
// - speed: an unchanged book is skipped by hash, so later backups only send
//   what changed
//
// Device-imported files on the phone (Downloads, Documents…) survive an
// uninstall; after a restore the device scan matches them to the restored
// books by path and refills their content, keeping ids, progress and notes.

const BUCKET = 'backups'
const PREFS_KEY = 'bookish:cloud-backup'
// Set once the one-time "back up your library" invitation has been shown (or
// the setup flow already offered an account). Storage keys keep the original
// `bookish:` prefix: renaming them would orphan existing users' data.
export const BACKUP_PROMPT_SEEN_KEY = 'bookish:backup-prompt-seen'
// A single Storage object limit is 50 MB (see the migration). Leave headroom.
const MAX_CONTENT_OBJECT_BYTES = 45 * 1024 * 1024

export const BACKUP_FREQUENCIES = Object.freeze([
  { value: 'daily', label: 'Daily', hint: 'Once a day, when Pages is open', ms: 24 * 60 * 60 * 1000 },
  { value: 'weekly', label: 'Weekly', hint: 'Once a week', ms: 7 * 24 * 60 * 60 * 1000 },
  { value: 'manual', label: 'Only when I tap Back up now', hint: 'No automatic backups', ms: 0 },
])

export const BACKUP_VERSION_OPTIONS = Object.freeze([1, 3, 5])

export const DEFAULT_BACKUP_PREFS = Object.freeze({
  enabled: true,
  frequency: 'daily',
  wifiOnly: true,
  includeBookFiles: false,
  keepVersions: 3,
  lastBackupAt: null,
  lastBackupBytes: 0,
  lastError: '',
  contentHashes: {},
  // When this install first became the owner of the cloud copy: a manual
  // backup or a restore. Until then automatic backups refuse to replace a
  // bigger backup (see backupNow).
  baselineAt: null,
})

function normalizePrefs(value) {
  const source = value && typeof value === 'object' ? value : {}
  return {
    enabled: source.enabled !== false,
    frequency: BACKUP_FREQUENCIES.some((item) => item.value === source.frequency) ? source.frequency : DEFAULT_BACKUP_PREFS.frequency,
    wifiOnly: source.wifiOnly !== false,
    includeBookFiles: source.includeBookFiles === true,
    keepVersions: BACKUP_VERSION_OPTIONS.includes(Number(source.keepVersions)) ? Number(source.keepVersions) : DEFAULT_BACKUP_PREFS.keepVersions,
    lastBackupAt: typeof source.lastBackupAt === 'string' ? source.lastBackupAt : null,
    lastBackupBytes: Number(source.lastBackupBytes) || 0,
    lastError: typeof source.lastError === 'string' ? source.lastError : '',
    contentHashes: source.contentHashes && typeof source.contentHashes === 'object' ? { ...source.contentHashes } : {},
    baselineAt: typeof source.baselineAt === 'string' ? source.baselineAt : null,
  }
}

function readPrefs() {
  if (typeof localStorage === 'undefined') return normalizePrefs(null)
  try {
    return normalizePrefs(JSON.parse(localStorage.getItem(PREFS_KEY) || 'null'))
  } catch {
    return normalizePrefs(null)
  }
}

const prefsState = ref(readPrefs())

function writePrefs(patch) {
  prefsState.value = normalizePrefs({ ...prefsState.value, ...patch })
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefsState.value)) } catch {}
  return prefsState.value
}

const runState = reactive({
  running: false,
  kind: '',            // 'backup' | 'restore' | 'delete'
  phase: '',
  current: 0,
  total: 0,
})

export function frequencyMs(frequency) {
  return BACKUP_FREQUENCIES.find((item) => item.value === frequency)?.ms ?? 0
}

export function isBackupDue(prefs, now = Date.now()) {
  if (!prefs.enabled) return false
  const interval = frequencyMs(prefs.frequency)
  if (!interval) return false
  if (!prefs.lastBackupAt) return true
  return now - new Date(prefs.lastBackupAt).getTime() >= interval
}

// Best effort: Android WebView exposes the connection type; elsewhere it is
// unknown and treated as allowed.
export function onMeteredConnection() {
  const type = globalThis.navigator?.connection?.type
  return type === 'cellular'
}

function deviceLabel() {
  if (isNativeCapacitorPlatform()) return 'Android phone'
  const ua = globalThis.navigator?.userAgent || ''
  if (/android/i.test(ua)) return 'Android browser'
  if (/iphone|ipad/i.test(ua)) return 'iPhone browser'
  return 'Web browser'
}

function readLocal(key) {
  try { return localStorage.getItem(key) } catch { return null }
}

async function sourceToTransferable(source) {
  // Native PDFs come back as a WebView file URL; read the actual bytes.
  if (typeof source === 'string') {
    if (/^(https?:|capacitor:|file:|blob:)/.test(source) || source.startsWith('/_capacitor_file_')) {
      const response = await (globalThis.CapacitorWebFetch || fetch)(source)
      if (!response.ok) throw new Error(`Could not read a book file (${response.status}).`)
      return response.arrayBuffer()
    }
  }
  return source
}

async function uploadObject(supabase, path, bytes) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, new Blob([bytes], { type: 'application/gzip' }), {
    upsert: true,
    contentType: 'application/gzip',
    cacheControl: '0',
  })
  if (error) throw error
}

async function downloadObject(supabase, path) {
  const { data, error } = await supabase.storage.from(BUCKET).download(path)
  if (error) throw error
  return data
}

async function listAll(supabase, folder) {
  const names = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(BUCKET).list(folder, { limit: 1000, offset })
    if (error) throw error
    names.push(...(data || []).map((item) => `${folder}/${item.name}`))
    if (!data || data.length < 1000) break
  }
  return names
}

async function removeObjects(supabase, paths) {
  for (let index = 0; index < paths.length; index += 100) {
    const { error } = await supabase.storage.from(BUCKET).remove(paths.slice(index, index + 100))
    if (error) throw error
  }
}

function friendlyError(error) {
  const message = String(error?.message || error || '')
  if (/failed to fetch|network|load failed/i.test(message)) return 'No connection. Your library is safe on this phone; the backup will retry.'
  if (/jwt|not signed in|401|403/i.test(message)) return 'Your sign-in expired. Sign in again to keep backing up.'
  return message || 'Backup failed.'
}

async function runPool(items, limit, worker) {
  let next = 0
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      await worker(items[index], index)
    }
  })
  await Promise.all(lanes)
}

const assetPath = (userId, sha256) => `${userId}/assets/${sha256}.json.gz`
export const useCloudBackup = () => {
  const account = useAccount()
  const { exportPagesData, importPagesData } = useLibraryBackup()
  const config = useRuntimeConfig().public

  const requireSession = async () => {
    const supabase = await getSupabase()
    const userId = account.user.value?.id
    if (!supabase || !userId) throw new Error('Sign in to use cloud backup.')
    return { supabase, userId }
  }

  const begin = (kind, phase) => {
    Object.assign(runState, { running: true, kind, phase, current: 0, total: 0 })
  }
  const end = () => Object.assign(runState, { running: false, kind: '', phase: '', current: 0, total: 0 })

  const listBackups = async () => {
    const { supabase } = await requireSession()
    const { data, error } = await supabase
      .from('backups')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }

  const latestBackup = async () => {
    const { supabase } = await requireSession()
    const { data, error } = await supabase
      .from('backups')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
    if (error) throw error
    return data?.[0] ?? null
  }

  const uploadBookContent = async (supabase, userId, bookIds, contentHashes) => {
    const { getBookContent } = useBookStorage()
    const manifest = {}
    let uploadedBytes = 0
    let skipped = 0
    runState.phase = 'Backing up book files'
    runState.total = bookIds.length
    for (const [index, bookId] of bookIds.entries()) {
      runState.current = index + 1
      try {
        const record = await getBookContent(bookId)
        if (!record) continue
        const plain = await serializeValue({ ...record, source: await sourceToTransferable(record.source) })
        const encoded = await encodeBackupPayload(plain)
        if (encoded.storedBytes > MAX_CONTENT_OBJECT_BYTES) {
          skipped += 1
          continue
        }
        const path = `${userId}/content/${bookId}.json.gz`
        if (contentHashes[bookId] !== encoded.sha256) {
          await uploadObject(supabase, path, encoded.bytes)
          uploadedBytes += encoded.storedBytes
        }
        manifest[bookId] = { path, sha256: encoded.sha256, bytes: encoded.storedBytes }
      } catch (error) {
        if (/network|fetch|jwt|401|403/i.test(String(error?.message))) throw error
        console.warn('[CloudBackup] Skipped content for', bookId, error)
        skipped += 1
      }
      // Yield so a long run never blocks the UI or pins memory.
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
    return { manifest, uploadedBytes, skipped }
  }

  // Moves each book's embedded cover / legacy text into its own
  // content-named object (see utils/backupAssets.js). Mutates the snapshot's
  // book records in place to carry a marker instead.
  const externalizeBookAssets = async (supabase, userId, library) => {
    const records = library.indexedDB?.['bookish-library']?.books || []
    const existing = new Set((await listAll(supabase, `${userId}/assets`).catch(() => []))
      .map((path) => path.split('/').pop().replace('.json.gz', '')))
    const refs = new Set()
    let uploadedBytes = 0
    const work = []
    for (const record of records) {
      const { light, heavy } = splitHeavyFields(record.value)
      if (heavy) work.push({ record, light, heavy })
    }
    if (!work.length) return { refs, uploadedBytes }
    runState.phase = 'Backing up covers'
    runState.total = work.length
    let done = 0
    await runPool(work, 4, async ({ record, light, heavy }) => {
      const encoded = await encodeBackupPayload(heavy)
      if (!existing.has(encoded.sha256)) {
        existing.add(encoded.sha256)
        await uploadObject(supabase, assetPath(userId, encoded.sha256), encoded.bytes)
        uploadedBytes += encoded.storedBytes
      }
      refs.add(encoded.sha256)
      record.value = markAsset(light, encoded.sha256, Object.keys(heavy))
      runState.current = ++done
    })
    return { refs, uploadedBytes }
  }

  // Deletes cover/text objects that no kept backup refers to any more.
  const pruneAssets = async (supabase, userId) => {
    const { data, error } = await supabase.from('backups').select('asset_refs')
    if (error) return
    const referenced = new Set((data || []).flatMap((row) => row.asset_refs || []))
    // Anything younger than an hour may belong to another device's backup
    // that is still uploading and has not written its row yet.
    const cutoff = Date.now() - 60 * 60 * 1000
    const orphaned = []
    for (let offset = 0; ; offset += 1000) {
      const { data: items, error: listError } = await supabase.storage.from(BUCKET)
        .list(`${userId}/assets`, { limit: 1000, offset })
      if (listError) return
      for (const item of items || []) {
        const sha = item.name.replace('.json.gz', '')
        const created = new Date(item.created_at || 0).getTime()
        if (!referenced.has(sha) && created < cutoff) orphaned.push(`${userId}/assets/${item.name}`)
      }
      if (!items || items.length < 1000) break
    }
    if (orphaned.length) await removeObjects(supabase, orphaned).catch(() => {})
  }

  // Puts each book's cover/text back before the library is written.
  const rehydrateBookAssets = async (supabase, userId, library) => {
    const records = (library.indexedDB?.['bookish-library']?.books || []).filter((record) => assetRef(record.value))
    if (!records.length) return
    runState.phase = 'Restoring covers'
    runState.total = records.length
    runState.current = 0
    const cache = new Map()
    await runPool(records, 4, async (record) => {
      const ref = assetRef(record.value)
      try {
        if (!cache.has(ref.sha256)) {
          cache.set(ref.sha256, downloadObject(supabase, assetPath(userId, ref.sha256))
            .then((blob) => decodeBackupPayload(blob, ref.sha256)))
        }
        record.value = mergeHeavyFields(record.value, await cache.get(ref.sha256))
      } catch (error) {
        // The book itself still restores; a missing cover refills from its
        // source, and text from the file on the phone.
        console.warn('[CloudBackup] Could not restore a cover/text for', record.key, error)
        record.value = mergeHeavyFields(record.value, {})
      }
      runState.current += 1
    })
  }

  /**
   * @param {{ reason?: 'manual'|'auto'|'setup' }} options
   */
  const backupNow = async ({ reason = 'manual' } = {}) => {
    if (runState.running) return { skipped: 'busy' }
    const prefs = prefsState.value
    if (reason === 'auto' && prefs.wifiOnly && onMeteredConnection()) return { skipped: 'metered' }

    begin('backup', 'Preparing your library')
    try {
      const { supabase, userId } = await requireSession()
      const library = await exportPagesData({ includeStorage: false })
      const bookIds = (library.indexedDB?.['bookish-library']?.books || [])
        .map((record) => record.key)
        .filter((key) => typeof key === 'string' || typeof key === 'number')
      // Never let an automatic run replace a real backup with an empty library
      // (a fresh install before its scan, or a reader who chose Start fresh).
      if (reason === 'auto' && bookIds.length === 0) return { skipped: 'empty' }

      // A fresh install (cleared data, new phone) fills its library gradually
      // as the device scan runs. Until this install has restored or been told
      // to back up by hand, an automatic run must not replace a backup that
      // holds more books: a few such runs would rotate the real one away.
      if (reason !== 'manual' && !prefs.baselineAt) {
        const latest = await latestBackup().catch(() => null)
        const cloudBooks = Number(latest?.book_count) || 0
        if (cloudBooks > bookIds.length) {
          writePrefs({
            lastError: `This phone has ${bookIds.length} book${bookIds.length === 1 ? '' : 's'}, but your latest backup has ${cloudBooks}. Automatic backup is paused so it doesn't replace it. Restore it from this page, or tap Back up now to replace it.`,
          })
          return { skipped: 'smaller-than-cloud' }
        }
      }

      const { refs: assetRefs, uploadedBytes: assetBytes } = await externalizeBookAssets(supabase, userId, library)

      let contentManifest = {}
      let contentBytes = 0
      if (prefs.includeBookFiles) {
        const result = await uploadBookContent(supabase, userId, bookIds, prefs.contentHashes)
        contentManifest = result.manifest
        contentBytes = Object.values(contentManifest).reduce((sum, item) => sum + item.bytes, 0)
      }

      runState.phase = 'Uploading snapshot'
      const snapshot = {
        app: 'Pages',
        kind: 'cloud-snapshot',
        formatVersion: BACKUP_FORMAT_VERSION,
        library,
        local: { [PAGES_SCAN_FOLDERS_KEY]: readLocal(PAGES_SCAN_FOLDERS_KEY) },
        content: contentManifest,
      }
      const encoded = await encodeBackupPayload(snapshot)
      const backupId = crypto.randomUUID()
      const snapshotPath = `${userId}/snapshots/${backupId}.json.gz`
      await uploadObject(supabase, snapshotPath, encoded.bytes)

      const annotationCount = library.indexedDB?.['bookish-library']?.annotations?.length || 0
      const { error: insertError } = await supabase.from('backups').insert({
        id: backupId,
        user_id: userId,
        snapshot_path: snapshotPath,
        format_version: BACKUP_FORMAT_VERSION,
        sha256: encoded.sha256,
        raw_bytes: encoded.rawBytes,
        stored_bytes: encoded.storedBytes,
        content_bytes: contentBytes + assetBytes,
        asset_refs: [...assetRefs],
        book_count: bookIds.length,
        annotation_count: annotationCount,
        includes_content: prefs.includeBookFiles,
        device_label: deviceLabel(),
        app_version: String(config.appVersion || ''),
      })
      if (insertError) {
        await removeObjects(supabase, [snapshotPath]).catch(() => {})
        throw insertError
      }

      runState.phase = 'Tidying up'
      await pruneOldVersions(supabase, userId, prefs.keepVersions, contentManifest, prefs.includeBookFiles)
      await pruneAssets(supabase, userId)

      writePrefs({
        lastBackupAt: new Date().toISOString(),
        baselineAt: prefs.baselineAt || new Date().toISOString(),
        lastBackupBytes: encoded.storedBytes + contentBytes + assetBytes,
        lastError: '',
        contentHashes: Object.fromEntries(Object.entries(contentManifest).map(([id, item]) => [id, item.sha256])),
      })
      return { ok: true, storedBytes: encoded.storedBytes, rawBytes: encoded.rawBytes, books: bookIds.length }
    } catch (error) {
      console.warn('[CloudBackup] Backup failed:', error)
      writePrefs({ lastError: friendlyError(error) })
      throw new Error(friendlyError(error))
    } finally {
      end()
    }
  }

  const pruneOldVersions = async (supabase, userId, keep, contentManifest, includeContent) => {
    const { data } = await supabase.from('backups').select('id, snapshot_path, book_count').order('created_at', { ascending: false })
    const rows = data || []
    const stale = rows.slice(keep)
    // Never rotate away the biggest backup while the newest one is smaller:
    // it is most likely the real library, and the newer ones a partial copy.
    const newestBooks = Number(rows[0]?.book_count) || 0
    const biggest = stale.reduce((best, row) => (Number(row.book_count) > Number(best?.book_count ?? -1) ? row : best), null)
    if (biggest && Number(biggest.book_count) > newestBooks) stale.splice(stale.indexOf(biggest), 1)
    if (stale.length) {
      await removeObjects(supabase, stale.map((row) => row.snapshot_path)).catch(() => {})
      await supabase.from('backups').delete().in('id', stale.map((row) => row.id))
    }
    // Content of books no longer in the library (or all of it, once book
    // files are switched off) is removed so the cloud copy never outgrows it.
    const keepPaths = new Set(includeContent ? Object.values(contentManifest).map((item) => item.path) : [])
    const existing = await listAll(supabase, `${userId}/content`).catch(() => [])
    const orphaned = existing.filter((path) => !keepPaths.has(path))
    if (orphaned.length) await removeObjects(supabase, orphaned).catch(() => {})
  }

  /**
   * Restores a backup row over this device's library. The caller reloads the
   * app afterwards so every in-memory store starts from the restored data.
   */
  const restoreBackup = async (row) => {
    if (runState.running) throw new Error('Another backup task is running.')
    begin('restore', 'Downloading your backup')
    try {
      const { supabase, userId } = await requireSession()
      const blob = await downloadObject(supabase, row.snapshot_path)
      runState.phase = 'Checking it arrived intact'
      const snapshot = await decodeBackupPayload(blob, row.sha256)
      if (snapshot?.app !== 'Pages' || snapshot?.kind !== 'cloud-snapshot') {
        throw new Error('This backup is not from Pages.')
      }

      await rehydrateBookAssets(supabase, userId, snapshot.library)
      runState.phase = 'Restoring your library'
      await importPagesData(snapshot.library)
      for (const [key, value] of Object.entries(snapshot.local || {})) {
        try {
          if (value === null || value === undefined) localStorage.removeItem(key)
          else localStorage.setItem(key, value)
        } catch {}
      }

      const entries = Object.entries(snapshot.content || {})
      if (entries.length) {
        const { saveBookContent } = useBookStorage()
        runState.phase = 'Restoring book files'
        runState.total = entries.length
        for (const [index, [bookId, item]] of entries.entries()) {
          runState.current = index + 1
          try {
            const record = deserializeValue(await decodeBackupPayload(await downloadObject(supabase, item.path), item.sha256))
            await saveBookContent(bookId, record)
          } catch (error) {
            // The device scan refills content for files still on the phone.
            console.warn('[CloudBackup] Could not restore content for', bookId, error)
          }
          await new Promise((resolve) => setTimeout(resolve, 0))
        }
      }

      writePrefs({
        lastBackupAt: row.created_at,
        baselineAt: new Date().toISOString(),
        lastError: '',
        includeBookFiles: Boolean(row.includes_content) || prefsState.value.includeBookFiles,
        contentHashes: Object.fromEntries(entries.map(([id, item]) => [id, item.sha256])),
      })
      return { books: row.book_count }
    } finally {
      end()
    }
  }

  const deleteAllCloudData = async () => {
    begin('delete', 'Deleting your cloud backups')
    try {
      const { supabase, userId } = await requireSession()
      const paths = [
        ...await listAll(supabase, `${userId}/snapshots`),
        ...await listAll(supabase, `${userId}/content`),
        ...await listAll(supabase, `${userId}/assets`),
      ]
      if (paths.length) await removeObjects(supabase, paths)
      const { error } = await supabase.from('backups').delete().eq('user_id', userId)
      if (error) throw error
      writePrefs({ lastBackupAt: null, lastBackupBytes: 0, contentHashes: {}, lastError: '' })
    } finally {
      end()
    }
  }

  const maybeAutoBackup = async () => {
    if (!account.signedIn.value || runState.running) return
    if (!isBackupDue(prefsState.value)) return
    try {
      await backupNow({ reason: 'auto' })
    } catch {
      // lastError is already recorded for the Backup page.
    }
  }

  const status = computed(() => {
    if (!account.signedIn.value) return { tone: 'off', label: 'Not backed up', icon: 'ri-cloud-off-line' }
    if (runState.running && runState.kind === 'backup') return { tone: 'busy', label: 'Backing up…', icon: 'ri-loop-right-line' }
    if (prefsState.value.lastError) return { tone: 'error', label: 'Backup needs attention', icon: 'ri-error-warning-line' }
    if (!prefsState.value.enabled) return { tone: 'off', label: 'Backup paused', icon: 'ri-pause-circle-line' }
    if (prefsState.value.lastBackupAt) return { tone: 'ok', label: 'Backed up', icon: 'ri-cloud-line' }
    return { tone: 'off', label: 'Waiting for first backup', icon: 'ri-cloud-line' }
  })

  return {
    prefs: readonly(prefsState),
    run: readonly(runState),
    status,
    updatePrefs: writePrefs,
    listBackups,
    latestBackup,
    backupNow,
    restoreBackup,
    deleteAllCloudData,
    maybeAutoBackup,
  }
}

export function formatBytes(bytes) {
  const value = Number(bytes) || 0
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`
  return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export function formatRelativeTime(iso, now = Date.now()) {
  if (!iso) return 'Never'
  const diff = Math.max(0, now - new Date(iso).getTime())
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
