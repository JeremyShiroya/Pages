<template>
  <div class="backup-page">
    <!-- No account: the only way to turn on cloud backup is to create one. -->
    <section v-if="!signedIn" class="backup-hero empty">
      <div class="hero-art"><OnboardingIllustration name="backup" size="small" /></div>
      <h2>Back up your library</h2>
      <p>Create a free account and Pages keeps a compressed copy of your books, progress, highlights and settings, so deleting the app or switching phones never loses them.</p>
      <button v-if="configured" type="button" class="primary-button wide" @click="router.push({ path: '/welcome', query: { flow: 'account', next: '/settings/backup' } })">
        <i class="ri-user-add-line"></i> Create account to back up
      </button>
      <p v-else class="muted">Cloud backup is not set up in this build.</p>
    </section>

    <template v-else>
      <section class="backup-hero" :class="`tone-${status.tone}`">
        <div class="hero-top">
          <span class="status-icon"><i :class="[status.icon, { spin: run.running && run.kind === 'backup' }]"></i></span>
          <div class="hero-copy">
            <p class="eyebrow">Cloud backup</p>
            <h2>{{ status.label }}</h2>
            <p class="muted">Last backup: {{ formatRelativeTime(prefs.lastBackupAt) }}<template v-if="prefs.lastBackupBytes"> · {{ formatBytes(prefs.lastBackupBytes) }}</template></p>
          </div>
        </div>
        <p v-if="prefs.lastError && !run.running" class="error-note" role="alert"><i class="ri-error-warning-line"></i>{{ prefs.lastError }}</p>
        <div v-if="run.running" class="work-progress" aria-live="polite">
          <div class="work-label"><span>{{ run.phase }}</span><span v-if="run.total">{{ run.current }} / {{ run.total }}</span></div>
          <div class="track"><span :class="{ indeterminate: !run.total }" :style="run.total ? { width: `${Math.round(run.current / run.total * 100)}%` } : {}"></span></div>
        </div>
        <button v-else type="button" class="primary-button wide" @click="runBackup"><i class="ri-upload-cloud-2-line"></i> Back up now</button>
      </section>

      <section class="section">
        <h2>Automatic backup</h2>
        <div class="surface">
          <label class="setting-row">
            <span class="setting-copy"><strong>Back up automatically</strong><span>Runs while Pages is open, in the background.</span></span>
            <input type="checkbox" class="switch" :checked="prefs.enabled" aria-label="Back up automatically" @change="updatePrefs({ enabled: $event.target.checked })" />
          </label>
          <div class="choice-list" :class="{ disabled: !prefs.enabled }" role="radiogroup" aria-label="Backup frequency">
            <button
              v-for="option in automaticFrequencies"
              :key="option.value"
              type="button"
              role="radio"
              class="choice"
              :aria-checked="prefs.frequency === option.value"
              :disabled="!prefs.enabled"
              @click="updatePrefs({ frequency: option.value })"
            >
              <span class="setting-copy"><strong>{{ option.label }}</strong><span>{{ option.hint }}</span></span>
              <span class="radio" :class="{ on: prefs.frequency === option.value }"></span>
            </button>
          </div>
          <label class="setting-row divided">
            <span class="setting-copy"><strong>Wi‑Fi only</strong><span>Skip automatic backups on mobile data.</span></span>
            <input type="checkbox" class="switch" :checked="prefs.wifiOnly" aria-label="Wi-Fi only" @change="updatePrefs({ wifiOnly: $event.target.checked })" />
          </label>
        </div>
      </section>

      <section class="section">
        <h2>What's included</h2>
        <div class="surface">
          <ul class="included">
            <li><i class="ri-check-line"></i>Library, series, playlists and favourites</li>
            <li><i class="ri-check-line"></i>Reading and listening progress</li>
            <li><i class="ri-check-line"></i>Highlights and notes</li>
            <li><i class="ri-check-line"></i>Profile and settings</li>
          </ul>
          <label class="setting-row divided">
            <span class="setting-copy"><strong>Include book files</strong><span>Also back up each book's contents. Uses more space. Books in your phone's folders come back on their own after a restore.</span></span>
            <input type="checkbox" class="switch" :checked="prefs.includeBookFiles" aria-label="Include book files" @change="updatePrefs({ includeBookFiles: $event.target.checked })" />
          </label>
          <div class="setting-row divided">
            <span class="setting-copy"><strong>Backups to keep</strong><span>Older ones are removed automatically.</span></span>
            <div class="segmented" role="radiogroup" aria-label="Backups to keep">
              <button
                v-for="count in BACKUP_VERSION_OPTIONS"
                :key="count"
                type="button"
                role="radio"
                :aria-checked="prefs.keepVersions === count"
                :class="{ on: prefs.keepVersions === count }"
                @click="updatePrefs({ keepVersions: count })"
              >{{ count }}</button>
            </div>
          </div>
          <p class="muted small"><i class="ri-lock-line"></i> Backups are compressed on this phone before upload and checked for integrity when restored. Only your account can read them.</p>
        </div>
      </section>

      <section class="section">
        <h2>Restore</h2>
        <div class="surface">
          <p v-if="versionsLoading" class="muted">Loading backups…</p>
          <p v-else-if="versionsError" class="muted">{{ versionsError }}</p>
          <p v-else-if="!versions.length" class="muted">No backups yet. Your first one starts automatically, or tap Back up now.</p>
          <ul v-else class="versions">
            <li v-for="row in versions" :key="row.id">
              <button type="button" :disabled="run.running" @click="restoreTarget = row">
                <span class="version-icon"><i class="ri-history-line"></i></span>
                <span class="setting-copy">
                  <strong>{{ formatDate(row.created_at) }}</strong>
                  <span>{{ row.book_count }} books · {{ row.annotation_count }} notes · {{ formatBytes(Number(row.stored_bytes) + Number(row.content_bytes)) }} · {{ row.device_label || 'Pages' }}</span>
                </span>
                <i class="ri-arrow-right-s-line"></i>
              </button>
            </li>
          </ul>
        </div>
      </section>

      <section class="section">
        <h2>Account</h2>
        <div class="surface">
          <div class="account-row">
            <img v-if="googleProfile.avatarUrl" :src="googleProfile.avatarUrl" alt="" referrerpolicy="no-referrer" />
            <span v-else class="account-initial">{{ (googleProfile.name || googleProfile.email || 'P')[0].toUpperCase() }}</span>
            <span class="setting-copy"><strong>{{ googleProfile.name || 'Google account' }}</strong><span>{{ googleProfile.email }}</span></span>
          </div>
          <button type="button" class="plain-button" :disabled="run.running" @click="confirm = 'signout'">Sign out</button>
          <button type="button" class="text-button danger-text" :disabled="run.running" @click="confirm = 'wipe'">Delete cloud backups</button>
          <button type="button" class="text-button danger-text" :disabled="run.running" @click="confirm = 'delete'">Delete account</button>
        </div>
      </section>
    </template>

    <Teleport to="body">
      <div v-if="restoreTarget" class="sheet-overlay" @click.self="!restoring && (restoreTarget = null)">
        <section class="result-sheet confirm-sheet" role="alertdialog" aria-modal="true" aria-labelledby="restore-title">
          <h3 id="restore-title">Restore this backup?</h3>
          <p>From {{ formatDate(restoreTarget.created_at) }}: {{ restoreTarget.book_count }} books and {{ restoreTarget.annotation_count }} highlights and notes. This replaces the library, progress and settings on this phone. Pages restarts when it finishes.</p>
          <div v-if="restoring" class="work-progress" aria-live="polite">
            <div class="work-label"><span>{{ run.phase }}</span><span v-if="run.total">{{ run.current }} / {{ run.total }}</span></div>
            <div class="track"><span :class="{ indeterminate: !run.total }" :style="run.total ? { width: `${Math.round(run.current / run.total * 100)}%` } : {}"></span></div>
          </div>
          <p v-if="sheetError" class="error-note" role="alert">{{ sheetError }}</p>
          <button type="button" class="plain-button" :disabled="restoring" @click="restoreTarget = null">Cancel</button>
          <button type="button" class="primary-button" :disabled="restoring" @click="runRestore">{{ restoring ? 'Restoring…' : 'Restore and restart' }}</button>
        </section>
      </div>

      <div v-if="confirm" class="sheet-overlay" @click.self="!working && (confirm = '')">
        <section class="result-sheet confirm-sheet" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
          <img v-if="confirm !== 'signout'" src="/images/Trash.png" alt="" class="sheet-art" width="400" height="400" />
          <h3 id="confirm-title">{{ confirmCopy.title }}</h3>
          <p>{{ confirmCopy.body }}</p>
          <p v-if="sheetError" class="error-note" role="alert">{{ sheetError }}</p>
          <button type="button" class="plain-button" :disabled="working" @click="confirm = ''">Cancel</button>
          <button type="button" class="primary-button" :class="{ 'danger-fill': confirm !== 'signout' }" :disabled="working" @click="runConfirm">{{ working ? 'Working…' : confirmCopy.action }}</button>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import OnboardingIllustration from '~/components/onboarding/OnboardingIllustration.vue'
import { isAccountConfigured, useAccount } from '~/composables/useAccount'
import {
  BACKUP_FREQUENCIES,
  BACKUP_VERSION_OPTIONS,
  formatBytes,
  formatRelativeTime,
  useCloudBackup,
} from '~/composables/useCloudBackup'
import { useToast } from '~/composables/useToast'

const router = useRouter()
const { addToast } = useToast()
const account = useAccount()
const backup = useCloudBackup()

const configured = isAccountConfigured()
const signedIn = account.signedIn
const googleProfile = account.googleProfile
const prefs = backup.prefs
const run = backup.run
const status = backup.status
const updatePrefs = backup.updatePrefs

// "Manual" is the switch being off; the list only offers real schedules.
const automaticFrequencies = BACKUP_FREQUENCIES.filter((option) => option.value !== 'manual')

const versions = ref([])
const versionsLoading = ref(false)
const versionsError = ref('')
const restoreTarget = ref(null)
const restoring = ref(false)
const confirm = ref('')
const working = ref(false)
const sheetError = ref('')

watch([restoreTarget, confirm], () => { sheetError.value = '' })

const formatDate = (iso) => new Date(iso).toLocaleString(undefined, {
  day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
})

async function loadVersions() {
  if (!signedIn.value) return
  versionsLoading.value = true
  versionsError.value = ''
  try {
    versions.value = await backup.listBackups()
  } catch (error) {
    versionsError.value = 'Could not load your backups. Check your connection.'
  } finally {
    versionsLoading.value = false
  }
}

async function runBackup() {
  try {
    const result = await backup.backupNow({ reason: 'manual' })
    if (result?.ok) {
      const saved = Math.max(0, Math.round((1 - result.storedBytes / Math.max(1, result.rawBytes)) * 100))
      addToast(`Backed up ${result.books} books (${saved}% smaller after compression).`, 'success')
      loadVersions()
    }
  } catch (error) {
    addToast(error.message, 'error')
  }
}

async function runRestore() {
  restoring.value = true
  try {
    await backup.restoreBackup(restoreTarget.value)
    window.location.replace('/')
  } catch (error) {
    sheetError.value = error.message || 'Restore failed. Nothing was changed.'
    restoring.value = false
  }
}

const confirmCopy = computed(() => ({
  signout: {
    title: 'Sign out?',
    body: 'Automatic backups stop on this phone. Your library stays here, and your cloud backups stay safe until you sign in again.',
    action: 'Sign out',
  },
  wipe: {
    title: 'Delete all cloud backups?',
    body: 'Every backup in your account is permanently deleted. Your library on this phone is not touched. This cannot be undone.',
    action: 'Delete backups',
  },
  delete: {
    title: 'Delete your account?',
    body: 'Your account and every cloud backup are permanently deleted. Your library on this phone is not touched. This cannot be undone.',
    action: 'Delete account',
  },
}[confirm.value] || {}))

async function runConfirm() {
  working.value = true
  sheetError.value = ''
  try {
    if (confirm.value === 'signout') {
      await account.signOut()
      addToast('Signed out. Backups are paused on this phone.', 'info')
    } else if (confirm.value === 'wipe') {
      await backup.deleteAllCloudData()
      versions.value = []
      addToast('Cloud backups deleted.', 'info')
    } else if (confirm.value === 'delete') {
      await backup.deleteAllCloudData()
      await account.deleteAccount()
      addToast('Account deleted.', 'info')
    }
    confirm.value = ''
  } catch (error) {
    sheetError.value = error.message || 'That did not work. Please try again.'
  } finally {
    working.value = false
  }
}

onMounted(loadVersions)
watch(signedIn, (value) => { if (value) loadVersions() })
watch(() => prefs.value.lastBackupAt, () => loadVersions())
</script>

<style scoped>
.backup-page { display: grid; gap: var(--settings-section-gap); max-width: 760px; margin: 0 auto; padding: 18px var(--settings-gutter) calc(var(--mobile-bottom-nav-height, 72px) + 32px); font-family: var(--mobile-font-family); color: var(--color-text-primary); }
.backup-hero { display: grid; gap: 16px; padding: 20px var(--settings-row-inset); border-radius: var(--settings-radius); background: var(--color-settings-group); }
.backup-hero.empty { justify-items: center; text-align: center; }
.backup-hero.empty h2 { margin: 0; font-size: 24px; letter-spacing: -0.02em; }
.backup-hero.empty p { margin: 0; color: var(--color-text-muted); font-size: 14px; line-height: 1.5; }
.hero-art { width: 100%; padding: 4px 0 10px; --ob-ink: var(--color-text-primary); --ob-paper: var(--color-surface-card); --ob-bright: #c9a7ff; --ob-accent: var(--color-brand-primary); --ob-soft-strong: var(--color-brand-primary-soft); }
.hero-top { display: flex; gap: 14px; align-items: center; }
.hero-copy h2 { margin: 0 0 2px; font-size: 22px; letter-spacing: -0.02em; }
.status-icon { display: grid; flex: none; place-items: center; width: 52px; height: 52px; border-radius: 50%; background: var(--color-brand-primary-soft); color: var(--color-brand-primary); font-size: 26px; }
.tone-ok .status-icon { background: rgba(22, 163, 74, 0.12); color: #16a34a; }
.tone-error .status-icon { background: rgba(220, 38, 38, 0.12); color: #dc2626; }
.eyebrow, .section h2 { margin: 0 0 var(--settings-header-gap) var(--settings-row-inset); color: var(--color-text-muted); font-size: var(--settings-header-size); letter-spacing: .02em; text-transform: uppercase; }
.hero-copy .eyebrow { margin: 0 0 2px; }
.muted { margin: 0; color: var(--color-text-muted); font-size: 13px; line-height: 1.45; }
.muted.small { display: flex; gap: 6px; font-size: 12.5px; }
.section { min-width: 0; }
.surface { display: grid; gap: 16px; padding: 18px var(--settings-row-inset); border-radius: var(--settings-radius); background: var(--color-settings-group); }
.setting-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.setting-row.divided { padding-top: 16px; border-top: 1px solid var(--color-border-subtle); }
.setting-copy { display: grid; flex: 1; gap: 4px; min-width: 0; text-align: left; }
.setting-copy strong { font-size: var(--settings-label-size); }
.setting-copy span { color: var(--color-text-muted); font-size: var(--settings-caption-size); line-height: 1.4; }
.switch { position: relative; flex: 0 0 auto; appearance: none; width: var(--settings-switch-width); height: var(--settings-switch-height); margin: 0; border: 0; border-radius: 99px; background: var(--color-border-card); cursor: pointer; transition: background-color .2s; }
.switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: var(--settings-switch-knob); height: var(--settings-switch-knob); border-radius: 50%; background: white; box-shadow: 0 1px 4px #0003; transition: transform .2s; }
.switch:checked { background: var(--color-brand-primary); }
.switch:checked::after { transform: translateX(calc(var(--settings-switch-width) - var(--settings-switch-knob) - 4px)); }
.choice-list { display: grid; gap: 8px; transition: opacity .2s; }
.choice-list.disabled { opacity: .45; }
.choice { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 14px; border: 1px solid var(--color-border-card); border-radius: 12px; background: var(--color-surface-card); color: inherit; font: inherit; }
.choice[aria-checked="true"] { border-color: var(--color-brand-primary); box-shadow: inset 0 0 0 1px var(--color-brand-primary); }
.radio { position: relative; flex: none; width: 20px; height: 20px; border-radius: 50%; box-shadow: inset 0 0 0 2px var(--color-border-card); }
.radio.on { box-shadow: inset 0 0 0 2px var(--color-brand-primary); }
.radio.on::after { content: ''; position: absolute; inset: 5px; border-radius: 50%; background: var(--color-brand-primary); }
.segmented { display: flex; flex: none; padding: 3px; border-radius: 10px; background: var(--color-surface-card); box-shadow: inset 0 0 0 1px var(--color-border-card); }
.segmented button { min-width: 38px; min-height: 32px; border: 0; border-radius: 8px; background: transparent; color: var(--color-text-secondary); font: inherit; font-size: 14px; }
.segmented button.on { background: var(--color-brand-primary); color: var(--color-text-on-brand); }
.included { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; font-size: 14px; }
.included i { margin-right: 8px; color: var(--color-brand-primary); }
.versions { display: grid; margin: 0; padding: 0; list-style: none; }
.versions li + li { border-top: 1px solid var(--color-border-subtle); }
.versions button { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 0; border: 0; background: transparent; color: inherit; font: inherit; }
.versions button > i { color: var(--color-text-muted); font-size: 20px; }
.version-icon { display: grid; flex: none; place-items: center; width: 38px; height: 38px; border-radius: 50%; background: var(--color-brand-primary-soft); color: var(--color-brand-primary); font-size: 18px; }
.account-row { display: flex; align-items: center; gap: 12px; }
.account-row img, .account-initial { flex: none; width: 44px; height: 44px; border-radius: 50%; object-fit: cover; }
.account-initial { display: grid; place-items: center; background: var(--color-brand-primary); color: var(--color-text-on-brand); font-size: 18px; }
.primary-button, .plain-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 46px; padding: 0 16px; border-radius: 999px; font: inherit; font-size: 15px; cursor: pointer; transition: transform .15s; }
.primary-button:active, .plain-button:active { transform: scale(.98); }
.primary-button { border: 0; background: var(--color-brand-primary); color: var(--color-text-on-brand); }
.primary-button.wide { width: 100%; }
.plain-button { border: 1px solid var(--color-border-card); background: var(--color-surface-card); color: var(--color-text-primary); }
.primary-button:disabled, .plain-button:disabled { opacity: .55; }
.danger-fill { background: #be3030; }
.text-button { width: fit-content; padding: 0; border: 0; background: transparent; color: var(--color-text-secondary); font: inherit; font-size: 14px; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.danger-text { color: #be3030; }
.error-note { display: flex; gap: 8px; margin: 0; padding: 10px 12px; border-radius: 12px; background: rgba(220, 38, 38, .1); color: #b91c1c; font-size: 13px; line-height: 1.4; }
:root[data-theme="dark"] .error-note { color: #fca5a5; }
.work-progress { display: grid; gap: 8px; }
.work-label { display: flex; justify-content: space-between; gap: 12px; color: var(--color-text-secondary); font-size: 12.5px; }
.track { position: relative; height: 6px; overflow: hidden; border-radius: 99px; background: var(--color-border-card); }
.track span { display: block; height: 100%; border-radius: inherit; background: var(--color-brand-primary); transition: width .3s; }
.track span.indeterminate { width: 40%; animation: backup-slide 1.2s ease-in-out infinite; }
.spin { display: inline-block; animation: backup-spin 1s linear infinite; }
.sheet-overlay { position: fixed; inset: 0; z-index: 9998; display: flex; align-items: flex-end; background: #0f172a73; }
.result-sheet { width: 100%; max-height: 80vh; overflow-y: auto; padding: 20px 18px calc(18px + env(safe-area-inset-bottom)); border-radius: 20px 20px 0 0; background: var(--color-surface-modal); animation: backup-sheet .28s cubic-bezier(.2, .8, .2, 1); }
.confirm-sheet { display: grid; gap: 14px; }
.confirm-sheet h3 { margin: 0; font-size: 18px; }
.sheet-art { justify-self: center; width: 112px; height: 112px; margin-bottom: -6px; animation: backup-art .6s cubic-bezier(.2, 1.4, .35, 1) both; }
@keyframes backup-art { from { opacity: 0; transform: scale(.7) rotate(-6deg); } to { opacity: 1; transform: none; } }
.confirm-sheet p { margin: 0; font-size: 14px; line-height: 1.5; color: var(--color-text-secondary); }
@keyframes backup-spin { to { transform: rotate(360deg); } }
@keyframes backup-slide { from { transform: translateX(-100%); } to { transform: translateX(250%); } }
@keyframes backup-sheet { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .spin, .track span.indeterminate, .result-sheet { animation: none; } }
</style>
