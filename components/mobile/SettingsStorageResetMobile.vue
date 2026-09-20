<template>
  <div class="storage-reset">
    <section class="overview" aria-label="Device library overview">
      <div class="overview-top">
        <div>
          <p class="eyebrow">On this device</p>
          <p class="space-value">{{ formattedStorageSize }}</p>
          <p class="muted">{{ storageMessage }}</p>
        </div>
        <button type="button" class="icon-button" aria-label="Refresh storage information" :disabled="storageLoading" @click="refreshStorageSummary">
          <i :class="storageLoading ? 'ri-loader-4-line spin' : 'ri-refresh-line'"></i>
        </button>
      </div>
      <div class="overview-facts">
        <div><strong>{{ totalBookCount }}</strong><span>Books</span></div>
        <div><strong>{{ hiddenCount }}</strong><span>Hidden</span></div>
        <div><strong>{{ scanFolders.length }}</strong><span>Locations</span></div>
      </div>
    </section>

    <section class="section">
      <h2>Book information</h2>
      <div class="surface">
        <div class="setting-row">
          <div class="setting-copy">
            <strong>Automatic details</strong>
            <span>Fill missing covers, authors and other book information in the background.</span>
          </div>
          <input type="checkbox" class="switch" aria-label="Automatic book details" :checked="settings.metadataAutoFill" @change="setAutoMetadata($event.target.checked)" />
        </div>
        <div class="setting-row status-row" aria-live="polite">
          <i :class="autoMeta.running ? 'ri-loader-4-line spin' : 'ri-information-line'"></i>
          <span>{{ settings.metadataAutoFill ? scanNowLabel : 'Automatic updates are off.' }}</span>
        </div>
        <div v-if="backfill.running" class="work-progress" aria-live="polite">
          <div class="work-label"><span>{{ backfill.currentTitle || 'Updating books' }}</span><span>{{ backfill.current }} / {{ backfill.total }}</span></div>
          <div class="track"><span :style="{ width: `${backfillPercent}%` }"></span></div>
          <button type="button" class="text-button" @click="stopBackfill">Stop update</button>
        </div>
        <div v-else class="action-row">
          <button type="button" class="primary-button" @click="startBackfill">Update book details</button>
          <p v-if="backfill.finished" class="muted" aria-live="polite">Checked {{ backfill.total }} book{{ backfill.total === 1 ? '' : 's' }}.
            <button v-if="backfill.diagnostics?.length" type="button" class="text-button" @click="showDiagnostics = true">Diagnostics</button>
            <button v-if="backfill.failures?.length" type="button" class="text-button" @click="showFailures = true">Unsuccessful ({{ backfill.failures.length }})</button>
          </p>
        </div>
      </div>
    </section>

    <section class="section">
      <h2>Scan locations</h2>
      <div class="surface">
        <p class="section-intro">Pages looks for PDF and EPUB files in these device folders.</p>
        <ul v-if="scanFolders.length" class="location-list">
          <li v-for="folder in scanFolders" :key="folder">
            <i class="ri-folder-line" aria-hidden="true"></i>
            <span>{{ folderLabel(folder) }}</span>
            <button type="button" :aria-label="`Stop scanning ${folderLabel(folder)}`" @click="removeScanFolder(folder)"><i class="ri-close-line"></i></button>
          </li>
        </ul>
        <p v-else class="muted">No folders selected.</p>
        <form class="add-location" @submit.prevent="addScanFolder(newFolderInput)">
          <input v-model="newFolderInput" type="text" placeholder="Folder name or path" aria-label="Folder to scan" />
          <button type="submit" :disabled="!newFolderInput.trim()">Add</button>
        </form>
        <button type="button" class="plain-button" @click="scanNow"><i class="ri-scan-line"></i> Scan device now</button>
      </div>
    </section>

    <section class="section">
      <h2>Hidden books</h2>
      <div class="surface hidden-surface">
        <p>{{ hiddenCount ? `${hiddenCount} book${hiddenCount === 1 ? '' : 's'} hidden from your library.` : 'Your library has no hidden books.' }}</p>
        <button v-if="hiddenCount" type="button" class="plain-button" @click="router.push('/settings/hidden')">Manage hidden books <i class="ri-arrow-right-s-line"></i></button>
        <button v-if="hiddenCount" type="button" class="text-button" @click="restoreHidden">Restore all hidden books</button>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="showDiagnostics || showFailures" class="sheet-overlay" @click.self="showDiagnostics = false; showFailures = false">
        <section class="result-sheet" role="dialog" aria-modal="true" :aria-label="showDiagnostics ? 'Series diagnostics' : 'Unsuccessful metadata lookups'">
          <header><h3>{{ showDiagnostics ? 'Series diagnostics' : 'Unsuccessful lookups' }}</h3><button type="button" aria-label="Close" @click="showDiagnostics = false; showFailures = false"><i class="ri-close-line"></i></button></header>
          <ul v-if="showDiagnostics"><li v-for="item in backfill.diagnostics" :key="item.bookId"><strong>{{ item.title }}</strong><span>{{ item.reason }}</span></li></ul>
          <ul v-else><li v-for="item in backfill.failures" :key="item.id"><strong>{{ item.title }}</strong><span>{{ item.reason }}</span></li></ul>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useLibraryBackfill } from '~/composables/useMetadataBackfill'
import { useAutoMetadata } from '~/composables/useAutoMetadata'
import { useBookishSettings } from '~/composables/useBookishSettings'
import { DEFAULT_SCAN_FOLDERS, normalizeScanFolder, readScanFolders, syncDeviceLibrary, writeScanFolders } from '~/composables/useDeviceLibrarySync'
import { isNativeCapacitorPlatform } from '~/composables/useNativePlatform'
import { useBooks } from '~/composables/useBooks'
import { useBookStorage } from '~/composables/useBookStorage'
import { useToast } from '~/composables/useToast'

const router = useRouter()
const { addToast } = useToast()
const { books, updateBook, restoreHiddenBooks, countHiddenBooks } = useBooks()
const { getStorageSummary } = useBookStorage()
const { settings, updateSettings } = useBookishSettings()
const { state: autoMeta } = useAutoMetadata()
const { state: backfill, start: runLibraryBackfill, stop: stopLibraryBackfill } = useLibraryBackfill()

const hiddenCount = ref(0)
const totalBookCount = computed(() => (books.value?.length || 0) + hiddenCount.value)
const storageLoading = ref(false)
const storageSummary = ref({ available: true, contentCount: 0, sourceCount: 0, totalBytes: 0, error: null })
const formattedStorageSize = computed(() => {
  let size = storageSummary.value.totalBytes || 0
  const units = ['B', 'KB', 'MB', 'GB']
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit += 1 }
  return `${size >= 10 || unit === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unit]}`
})
const storageMessage = computed(() => !storageSummary.value.available
  ? storageSummary.value.error || 'Storage information is unavailable.'
  : storageSummary.value.contentCount || storageSummary.value.sourceCount
    ? 'Reading files are saved locally.'
    : 'No reading files saved yet.')
const refreshStorageSummary = async () => {
  storageLoading.value = true
  try { storageSummary.value = await getStorageSummary() }
  catch { storageSummary.value = { ...storageSummary.value, available: false, error: 'Storage information is unavailable.' } }
  finally { storageLoading.value = false }
}
const refreshHiddenCount = async () => {
  try { hiddenCount.value = await countHiddenBooks() }
  catch { hiddenCount.value = 0 }
}
const restoreHidden = async () => {
  const restored = await restoreHiddenBooks()
  await refreshHiddenCount()
  addToast(restored ? `Restored ${restored} hidden book${restored === 1 ? '' : 's'}.` : 'No hidden books to restore.', 'success')
}

const setAutoMetadata = (enabled) => updateSettings({ metadataAutoFill: !!enabled })
const scanNowLabel = computed(() => autoMeta.running
  ? `Checking book ${Math.min(autoMeta.batchDone + 1, autoMeta.batchTotal || 1)} of ${autoMeta.batchTotal || 1}.`
  : autoMeta.pending
    ? `${autoMeta.pending} book${autoMeta.pending === 1 ? '' : 's'} waiting for details.`
    : 'All book details are up to date.')
const backfillPercent = computed(() => backfill.total ? Math.round(backfill.current / backfill.total * 100) : 0)
const showDiagnostics = ref(false)
const showFailures = ref(false)
const startBackfill = async () => {
  if (backfill.running) return
  try {
    await runLibraryBackfill({
      books: books.value,
      updateBook,
      onDone: ({ total, updated, stopped }) => addToast(
        !total ? 'All books already have their details.'
          : stopped ? 'Metadata update stopped.' : `Updated ${updated} of ${total} books.`,
        stopped ? 'info' : 'success',
      ),
    })
  } catch (error) {
    console.error('[Storage] Metadata update failed:', error)
    addToast('Could not update book details.', 'error')
  }
}
const stopBackfill = () => stopLibraryBackfill()

const scanFolders = ref(readScanFolders())
const newFolderInput = ref('')
const folderLabel = (folder) => folder === DEFAULT_SCAN_FOLDERS[0] ? 'All storage' : folder.replace('/storage/emulated/0/', '')
const addScanFolder = (value) => {
  const normalized = normalizeScanFolder(value)
  if (!normalized) return
  if (scanFolders.value.includes(normalized)) { addToast('That folder is already scanned.', 'info'); return }
  scanFolders.value = writeScanFolders([...scanFolders.value, normalized])
  newFolderInput.value = ''
}
const removeScanFolder = (folder) => {
  scanFolders.value = writeScanFolders(scanFolders.value.filter((item) => item !== folder))
}
const scanNow = () => {
  if (!isNativeCapacitorPlatform()) { addToast('Device scanning runs in the installed mobile app.', 'info'); return }
  syncDeviceLibrary()
}
onMounted(() => { refreshStorageSummary(); refreshHiddenCount() })
</script>

<style scoped>
.storage-reset { display: grid; gap: 32px; max-width: 760px; min-height: calc(100dvh - 70px); margin: 0 auto; padding: 20px var(--mobile-page-padding-inline, 16px) calc(var(--mobile-bottom-nav-height, 72px) + 32px); background: var(--color-settings-background); font-family: var(--mobile-font-family); color: var(--color-text-primary); }
.overview { padding: 6px 2px 22px; border-bottom: 1px solid var(--color-border-subtle); }
.overview-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.eyebrow, .section h2 { margin: 0 0 10px; color: var(--color-text-muted); font-size: 12px; font-weight: 650; letter-spacing: .07em; text-transform: uppercase; }
.space-value { margin: 0 0 3px; font-size: clamp(38px, 11vw, 52px); font-weight: 550; letter-spacing: -.045em; line-height: 1.05; }
.muted { margin: 0; color: var(--color-text-muted); font-size: 13px; line-height: 1.45; }
.icon-button { display: grid; width: 42px; height: 42px; place-items: center; border: 1px solid var(--color-border-card); border-radius: 12px; background: transparent; color: var(--color-text-secondary); font-size: 20px; }
.overview-facts { display: grid; grid-template-columns: repeat(3, 1fr); margin-top: 24px; }
.overview-facts div { display: grid; gap: 2px; padding-left: 14px; border-left: 1px solid var(--color-border-subtle); }
.overview-facts div:first-child { padding-left: 0; border: 0; }
.overview-facts strong { font-size: 21px; font-weight: 550; }
.overview-facts span { color: var(--color-text-muted); font-size: 12px; }
.section { min-width: 0; }
.section h2 { margin-left: 3px; }
.surface { display: grid; gap: 16px; padding: 18px; border-radius: 16px; background: var(--color-settings-group); }
.setting-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.setting-copy { display: grid; gap: 4px; }
.setting-copy strong { font-size: 15px; font-weight: 550; }
.setting-copy span, .section-intro { margin: 0; color: var(--color-text-muted); font-size: 13px; line-height: 1.4; }
.switch { position: relative; flex: 0 0 auto; appearance: none; width: 46px; height: 27px; margin: 0; border: 0; border-radius: 99px; background: var(--color-border-card); cursor: pointer; }
.switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 21px; height: 21px; border-radius: 50%; background: white; box-shadow: 0 1px 4px #0003; transition: transform .2s; }
.switch:checked { background: var(--color-brand-primary); }
.switch:checked::after { transform: translateX(19px); }
.status-row { justify-content: flex-start; padding-top: 14px; border-top: 1px solid var(--color-border-subtle); color: var(--color-text-secondary); font-size: 13px; }
.status-row i { color: var(--color-text-muted); font-size: 18px; }
.action-row { display: grid; gap: 10px; }
.primary-button, .plain-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 16px; border-radius: 11px; font: inherit; font-size: 14px; font-weight: 550; cursor: pointer; }
.primary-button { border: 0; background: var(--color-brand-primary); color: var(--color-text-on-brand); }
.plain-button { border: 1px solid var(--color-border-card); background: var(--color-surface-card); color: var(--color-text-primary); }
.text-button { width: fit-content; padding: 0; border: 0; background: transparent; color: var(--color-text-secondary); font: inherit; font-size: 13px; text-decoration: underline; cursor: pointer; }
.work-progress { display: grid; gap: 10px; }
.work-label { display: flex; justify-content: space-between; gap: 12px; color: var(--color-text-secondary); font-size: 12px; }
.work-label span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.track { height: 6px; overflow: hidden; border-radius: 99px; background: var(--color-border-card); }
.track span { display: block; height: 100%; border-radius: inherit; background: var(--color-text-secondary); }
.location-list { display: grid; margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--color-border-subtle); }
.location-list li { display: grid; grid-template-columns: 22px minmax(0, 1fr) 34px; align-items: center; gap: 8px; min-height: 48px; border-bottom: 1px solid var(--color-border-subtle); font-size: 14px; }
.location-list li > i { color: var(--color-text-muted); font-size: 19px; }
.location-list span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.location-list button, .result-sheet header button { display: grid; width: 34px; height: 34px; place-items: center; border: 0; background: transparent; color: var(--color-text-muted); font-size: 19px; }
.add-location { display: flex; gap: 8px; }
.add-location input { flex: 1; min-width: 0; min-height: 44px; padding: 0 12px; border: 1px solid var(--color-border-card); border-radius: 10px; background: var(--color-surface-card); color: var(--color-text-primary); font: inherit; font-size: 14px; }
.add-location button { padding: 0 17px; border: 1px solid var(--color-border-card); border-radius: 10px; background: var(--color-surface-card); color: var(--color-text-primary); font: inherit; cursor: pointer; }
.add-location button:disabled { opacity: .5; }
.hidden-surface p { margin: 0; color: var(--color-text-secondary); font-size: 14px; }
.hidden-surface .plain-button { justify-content: space-between; }
.sheet-overlay { position: fixed; inset: 0; z-index: 9998; display: flex; align-items: flex-end; background: #0f172a73; }
.result-sheet { width: 100%; max-height: 70vh; overflow-y: auto; padding: 18px 18px calc(18px + env(safe-area-inset-bottom)); border-radius: 18px 18px 0 0; background: var(--color-surface-modal); }
.result-sheet header { display: flex; align-items: center; justify-content: space-between; }
.result-sheet h3 { margin: 0; font-size: 16px; }
.result-sheet ul { display: grid; gap: 14px; padding: 0; list-style: none; }
.result-sheet li { display: grid; gap: 3px; font-size: 13px; }
.result-sheet li span { color: var(--color-text-muted); }
.spin { animation: storage-spin .9s linear infinite; }
@keyframes storage-spin { to { transform: rotate(360deg); } }
</style>
