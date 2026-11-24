<template>
  <div class="ob" :class="{ 'ob-dark': darkStep }" data-system-bar-color="transparent">
    <Transition :name="direction === 'back' ? 'ob-back' : 'ob-forward'" mode="out-in">
      <!-- ── Welcome ─────────────────────────────────────────────────────── -->
      <section v-if="step === 'intro'" key="intro" class="ob-screen ob-center">
        <div class="ob-brand ob-rise">
          <img src="/images/P Logo.png" alt="" class="ob-brand-logo" />
          <span>Pages</span>
        </div>
        <div class="ob-hero">
          <OnboardingIllustration name="welcome" glow />
          <h1 class="ob-headline ob-rise d1">Every book you own.<br />Read it. Hear it.</h1>
          <p class="ob-lede ob-rise d2">EPUBs and PDFs in one quiet library, with narration whenever your eyes need a rest.</p>
        </div>
        <footer class="ob-foot plain ob-rise d3">
          <button type="button" class="ob-btn bright" @click="go('account', { mode: 'new' })">Get started</button>
          <p class="ob-alt">Already use Pages? <button type="button" class="ob-inline" @click="go('account', { mode: 'returning' })">Sign in</button></p>
        </footer>
      </section>

      <!-- ── Account ─────────────────────────────────────────────────────── -->
      <section v-else-if="step === 'account'" key="account" class="ob-screen">
        <OnboardingHeader />
        <div class="ob-body ob-center">
          <OnboardingIllustration name="account" size="medium" />
          <h1 class="ob-title ob-rise d1">{{ mode === 'returning' ? 'Welcome back' : 'Keep your library safe' }}</h1>
          <p class="ob-text ob-rise d2">
            {{ mode === 'returning'
              ? 'Sign in to bring back your books, reading progress and highlights.'
              : 'A free account keeps a copy of your library, progress and highlights. Delete the app or switch phones and nothing is lost.' }}
          </p>
        </div>
        <footer class="ob-foot ob-rise d3">
          <p v-if="error" class="ob-note error" role="alert"><i class="ri-error-warning-line"></i>{{ error }}</p>
          <button type="button" class="ob-btn outline social" :disabled="busy" @click="signIn">
            <span v-if="busy" class="ob-spinner" aria-hidden="true"></span>
            <svg v-else class="ob-g" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span>{{ busy ? 'Signing in…' : 'Continue with Google' }}</span>
          </button>
          <button v-if="flow === 'full'" type="button" class="ob-btn ghost" :disabled="busy" @click="go('name')">
            Continue without an account
          </button>
          <p class="ob-fine">Your books never leave your phone. <NuxtLink to="/settings/privacy" class="ob-fine-link">Privacy</NuxtLink></p>
        </footer>
      </section>

      <!-- ── Name ────────────────────────────────────────────────────────── -->
      <section v-else-if="step === 'name'" key="name" class="ob-screen">
        <OnboardingHeader />
        <form class="ob-body ob-center" @submit.prevent="saveName">
          <div class="ob-avatar ob-pop" :class="{ photo: avatarPreview }">
            <img v-if="avatarPreview" :src="avatarPreview" alt="" referrerpolicy="no-referrer" />
            <span v-else>{{ nameInitial }}</span>
          </div>
          <h1 class="ob-title ob-rise d1">{{ signedIn ? 'Is this you?' : 'What should we call you?' }}</h1>
          <p class="ob-text ob-rise d2">{{ signedIn ? 'This is the name on your Google account. Change it if you like.' : 'Just a first name is fine. It stays on this phone.' }}</p>
          <label class="ob-field ob-rise d3">
            <span>Your name</span>
            <input v-model="name" type="text" maxlength="32" autocomplete="given-name" enterkeyhint="done" placeholder="Reader" />
          </label>
          <label v-if="google.avatarUrl" class="ob-switch-row ob-rise d3">
            <span>Use my Google photo</span>
            <input v-model="useGooglePhoto" type="checkbox" class="ob-switch" />
          </label>
        </form>
        <footer class="ob-foot ob-rise d3">
          <button type="button" class="ob-btn solid" :disabled="busy" @click="saveName">Continue</button>
          <button v-if="!signedIn" type="button" class="ob-btn ghost" @click="name = ''; saveName()">Skip</button>
        </footer>
      </section>

      <!-- ── Restore ─────────────────────────────────────────────────────── -->
      <section v-else-if="step === 'restore'" key="restore" class="ob-screen">
        <OnboardingHeader :hide-back="restoring" />
        <div v-if="!restoring" class="ob-body ob-center">
          <OnboardingIllustration name="restore" size="medium" />
          <h1 class="ob-title ob-rise d1">We found your library</h1>
          <p v-if="!backupChoices.length" class="ob-text ob-rise d2">Backed up from {{ foundBackup?.device_label || 'Pages' }} {{ formatRelativeTime(foundBackup?.created_at).toLowerCase() }}.</p>
          <p v-else class="ob-text ob-rise d2">Your newest backup has fewer books than an earlier one. Choose which to bring back.</p>
          <div v-if="backupChoices.length" class="ob-choices full ob-rise d3" role="radiogroup" aria-label="Backup to restore">
            <button
              v-for="(row, index) in backupChoices"
              :key="row.id"
              type="button"
              role="radio"
              :aria-checked="foundBackup?.id === row.id"
              class="ob-choice"
              :class="{ on: foundBackup?.id === row.id }"
              @click="foundBackup = row"
            >
              <span class="ob-choice-copy">
                <strong>{{ row.book_count }} books · {{ row.annotation_count }} highlights</strong>
                <small>{{ index === 0 ? 'Biggest' : 'Newest' }} · {{ formatRelativeTime(row.created_at) }} · {{ row.device_label || 'Pages' }}</small>
              </span>
              <span class="ob-tick"><i class="ri-check-line"></i></span>
            </button>
          </div>
          <div v-else-if="foundBackup" class="ob-stats ob-rise d3">
            <div><strong>{{ foundBackup.book_count }}</strong><span>books</span></div>
            <div><strong>{{ foundBackup.annotation_count }}</strong><span>highlights</span></div>
            <div><strong>{{ formatBytes(Number(foundBackup.stored_bytes) + Number(foundBackup.content_bytes)) }}</strong><span>to download</span></div>
          </div>
          <p v-if="localBookCount" class="ob-note ob-rise d3"><i class="ri-information-line"></i>This replaces the {{ localBookCount }} book{{ localBookCount === 1 ? '' : 's' }} on this phone.</p>
        </div>
        <div v-else class="ob-body ob-center" aria-live="polite">
          <div class="ob-ring" :style="{ '--p': restorePercent }">
            <span>{{ restorePercent }}<small>%</small></span>
          </div>
          <h1 class="ob-title">Restoring your library</h1>
          <p class="ob-text">{{ backupRun.phase || 'Getting things ready…' }}</p>
        </div>
        <footer v-if="!restoring" class="ob-foot ob-rise d3">
          <p v-if="error" class="ob-note error" role="alert"><i class="ri-error-warning-line"></i>{{ error }}</p>
          <button type="button" class="ob-btn solid" @click="restore">Restore my library</button>
          <button type="button" class="ob-btn outline" @click="startFresh">Start fresh</button>
        </footer>
      </section>

      <!-- ── Backup setup ────────────────────────────────────────────────── -->
      <section v-else-if="step === 'backup'" key="backup" class="ob-screen">
        <OnboardingHeader />
        <div class="ob-body">
          <h1 class="ob-title left ob-rise">How should we back up?</h1>
          <p class="ob-text left ob-rise d1">You can change this any time in Settings → Storage → Backup.</p>

          <div class="ob-choices ob-rise d2" role="radiogroup" aria-label="Backup frequency">
            <button
              v-for="option in BACKUP_FREQUENCIES"
              :key="option.value"
              type="button"
              role="radio"
              :aria-checked="backupDraft.frequency === option.value"
              class="ob-choice"
              :class="{ on: backupDraft.frequency === option.value }"
              @click="backupDraft.frequency = option.value"
            >
              <span class="ob-choice-copy"><strong>{{ option.label }}</strong><small>{{ option.hint }}</small></span>
              <span class="ob-tick"><i class="ri-check-line"></i></span>
            </button>
          </div>

          <div class="ob-group ob-rise d3">
            <label class="ob-switch-row">
              <span class="ob-switch-copy"><strong>Wi‑Fi only</strong><small>Never use mobile data for automatic backups</small></span>
              <input v-model="backupDraft.wifiOnly" type="checkbox" class="ob-switch" />
            </label>
            <label class="ob-switch-row">
              <span class="ob-switch-copy"><strong>Include book files</strong><small>Uses more space. Books in your phone's folders come back on their own.</small></span>
              <input v-model="backupDraft.includeBookFiles" type="checkbox" class="ob-switch" />
            </label>
          </div>
        </div>
        <footer class="ob-foot ob-rise d3">
          <button type="button" class="ob-btn solid" @click="saveBackup">Continue</button>
        </footer>
      </section>

      <!-- ── Formats ─────────────────────────────────────────────────────── -->
      <section v-else-if="step === 'formats'" key="formats" class="ob-screen">
        <OnboardingHeader />
        <div class="ob-body">
          <h1 class="ob-title left ob-rise">What will you read?</h1>
          <p class="ob-text left ob-rise d1">Pages only looks for the formats you choose. You can change this later.</p>
          <div class="ob-choices ob-rise d2" role="radiogroup" aria-label="Book formats">
            <button
              v-for="option in formatOptions"
              :key="option.mode"
              type="button"
              role="radio"
              :aria-checked="formatChoice === option.mode"
              class="ob-choice tall"
              :class="{ on: formatChoice === option.mode }"
              @click="formatChoice = option.mode"
            >
              <span class="ob-choice-icon"><i :class="option.icon"></i></span>
              <span class="ob-choice-copy"><strong>{{ option.label }}</strong><small>{{ option.hint }}</small></span>
              <span class="ob-tick"><i class="ri-check-line"></i></span>
            </button>
          </div>
        </div>
        <footer class="ob-foot ob-rise d3">
          <button type="button" class="ob-btn solid" @click="go('books')">Continue</button>
        </footer>
      </section>

      <!-- ── Find books / file access (also after a restore) ─────────────── -->
      <section v-else-if="step === 'books' || step === 'reconnect'" :key="step" class="ob-screen">
        <OnboardingHeader :hide-back="step === 'reconnect'" />
        <div class="ob-body ob-center">
          <OnboardingIllustration :name="native ? 'books' : 'welcome'" size="medium" />
          <h1 class="ob-title ob-rise d1">{{ booksCopy.title }}</h1>
          <p class="ob-text ob-rise d2">{{ booksCopy.body }}</p>
          <div v-if="native" class="ob-assure ob-rise d3">
            <i class="ri-shield-check-line"></i>
            <div>
              <strong>Your files stay yours</strong>
              <span>Pages only reads book files. Nothing leaves your phone unless you back it up.</span>
            </div>
          </div>
        </div>
        <footer class="ob-foot ob-rise d3">
          <button type="button" class="ob-btn solid" :disabled="busy" @click="step === 'reconnect' ? reconnect(true) : applyFormats(true)">
            {{ native ? 'Allow access' : 'Add a book' }}
          </button>
          <button type="button" class="ob-btn outline" :disabled="busy" @click="step === 'reconnect' ? reconnect(false) : applyFormats(false)">Maybe later</button>
        </footer>
      </section>

      <!-- ── Done ────────────────────────────────────────────────────────── -->
      <section v-else-if="step === 'done'" key="done" class="ob-screen ob-center">
        <div class="ob-confetti" aria-hidden="true">
          <span v-for="piece in confetti" :key="piece.id" :style="piece.style"></span>
        </div>
        <div class="ob-hero">
          <OnboardingIllustration name="done" glow />
          <h1 class="ob-display ob-rise d1">{{ doneTitle }}</h1>
          <p class="ob-lede ob-rise d2">{{ doneCopy }}</p>
        </div>
        <footer class="ob-foot plain ob-rise d3">
          <button type="button" class="ob-btn bright" @click="finish">{{ flow === 'account' && !restored ? 'Done' : 'Start reading' }}</button>
        </footer>
      </section>
    </Transition>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import OnboardingIllustration from '~/components/onboarding/OnboardingIllustration.vue'
import { useAccount, initAccount } from '~/composables/useAccount'
import {
  BACKUP_FREQUENCIES,
  BACKUP_PROMPT_SEEN_KEY,
  formatBytes,
  formatRelativeTime,
  useCloudBackup,
} from '~/composables/useCloudBackup'
import {
  enabledFormatsForMode,
  readPagesSettings,
  usePagesSettings,
  writePagesSettings,
} from '~/composables/usePagesSettings'
import { useFormatEnablement } from '~/composables/useFormatEnablement'
import { requestDeviceBooksAccess } from '~/composables/useDeviceLibrarySync'
import { useUserProfile } from '~/composables/useUserProfile'
import { useBooks } from '~/composables/useBooks'
import { isNativeCapacitorPlatform } from '~/composables/useNativePlatform'

definePageMeta({ layout: false })

const PENDING_KEY = 'bookish:onboarding-pending'

const route = useRoute()
const router = useRouter()
const account = useAccount()
const backup = useCloudBackup()
const { updateSettings } = usePagesSettings()
const { applyFormatMode } = useFormatEnablement()
const { profile, updateProfile } = useUserProfile()
const { books } = useBooks()

const native = isNativeCapacitorPlatform()
const flow = computed(() => (route.query.flow === 'account' ? 'account' : 'full'))
const nextPath = computed(() => {
  const next = String(route.query.next || '')
  return next.startsWith('/') && !next.startsWith('//') ? next : ''
})

const step = ref(flow.value === 'account' ? 'account' : 'intro')
const history = ref([])
const direction = ref('forward')
const mode = ref('new')
const busy = ref(false)
const error = ref('')
const restored = ref(false)
const restoring = ref(false)
const addBookAfter = ref(false)

const name = ref('')
const useGooglePhoto = ref(true)
const formatChoice = ref('both')
const foundBackup = ref(null)
const backupChoices = ref([])
const backupDraft = reactive({
  frequency: backup.prefs.value.enabled ? backup.prefs.value.frequency : 'manual',
  wifiOnly: backup.prefs.value.wifiOnly,
  includeBookFiles: backup.prefs.value.includeBookFiles,
})

const signedIn = account.signedIn
const google = account.googleProfile
const backupRun = backup.run
const localBookCount = computed(() => books.value?.length || 0)

// The welcome and celebration screens are the dark, bold "moments".
const darkStep = computed(() => step.value === 'intro' || step.value === 'done')

const formatOptions = [
  { mode: 'both', icon: 'ri-book-shelf-line', label: 'Everything', hint: 'EPUBs and PDFs' },
  { mode: 'epub', icon: 'ri-book-open-line', label: 'EPUB only', hint: 'Ebooks. PDFs are ignored' },
  { mode: 'pdf', icon: 'ri-file-pdf-2-line', label: 'PDF only', hint: 'Documents. EPUBs are ignored' },
]

// ── Progress ────────────────────────────────────────────────────────────────
const progressSlots = computed(() => (flow.value === 'account'
  ? [['account'], ['restore', 'backup'], ['reconnect']]
  : [['account'], ['name'], ['restore', 'backup'], ['formats', 'reconnect'], ['books']]))
const progressPercent = computed(() => {
  const index = progressSlots.value.findIndex((slot) => slot.includes(step.value))
  return Math.round(((index + 1) / progressSlots.value.length) * 100)
})

const OnboardingHeader = defineComponent({
  props: { hideBack: Boolean },
  setup(props) {
    return () => h('header', { class: 'ob-head' }, [
      h('button', {
        type: 'button',
        class: ['ob-back', { hidden: props.hideBack }],
        'aria-label': 'Back',
        onClick: back,
      }, [h('i', { class: 'ri-arrow-left-line' })]),
      h('div', {
        class: 'ob-bar',
        role: 'progressbar',
        'aria-valuemin': 0,
        'aria-valuemax': 100,
        'aria-valuenow': progressPercent.value,
      }, [h('span', { style: { width: `${progressPercent.value}%` } })]),
    ])
  },
})

// ── Navigation ──────────────────────────────────────────────────────────────
function go(next, options = {}) {
  if (options.mode) mode.value = options.mode
  error.value = ''
  direction.value = 'forward'
  history.value.push(step.value)
  step.value = next
  if (next === 'name') prefillName()
}

function back() {
  error.value = ''
  if (!history.value.length) {
    if (flow.value === 'account') router.replace(nextPath.value || '/profile')
    return
  }
  direction.value = 'back'
  step.value = history.value.pop()
}

// ── Account ─────────────────────────────────────────────────────────────────
async function signIn() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    if (!native) {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify({ flow: flow.value, mode: mode.value, next: nextPath.value }))
    }
    const query = new URLSearchParams()
    if (flow.value === 'account') query.set('flow', 'account')
    if (nextPath.value) query.set('next', nextPath.value)
    const result = await account.signInWithGoogle({ returnTo: `/welcome${query.toString() ? `?${query}` : ''}` })
    if (result === 'redirecting') return
    await afterSignIn()
  } catch (cause) {
    sessionStorage.removeItem(PENDING_KEY)
    const message = String(cause?.message || '')
    error.value = /cancel/i.test(message) ? '' : (message || 'Sign-in did not finish. Please try again.')
  } finally {
    busy.value = false
  }
}

async function afterSignIn() {
  // Backup first: a returning reader's restore brings their name back with it.
  let rows = []
  try {
    rows = await backup.listBackups()
  } catch (cause) {
    console.warn('[Onboarding] Could not look for a backup:', cause)
  }
  // An empty backup has nothing to bring back, and "restoring" it would only
  // replace this phone's library with nothing.
  const usable = rows.filter((row) => Number(row.book_count) > 0)
  const newest = usable[0] || null
  const biggest = usable.reduce((best, row) => (Number(row.book_count) > Number(best?.book_count ?? -1) ? row : best), null)
  // A newer but smaller backup usually comes from a half-set-up install, so
  // the bigger one is offered first, with the newest as the alternative.
  backupChoices.value = biggest && newest && biggest.id !== newest.id && Number(biggest.book_count) > Number(newest.book_count)
    ? [biggest, newest]
    : []
  foundBackup.value = biggest && backupChoices.value.length ? biggest : newest
  if (foundBackup.value) go('restore')
  else if (flow.value === 'full') go('name')
  else go('backup')
}

function prefillName() {
  if (name.value) return
  const current = profile.value?.displayName
  name.value = google.value.name || (current && current !== 'Reader' ? current : '')
}

const avatarPreview = computed(() => (signedIn.value && useGooglePhoto.value && google.value.avatarUrl
  ? google.value.avatarUrl.replace(/=s\d+-c$/, '=s256-c')
  : ''))
const nameInitial = computed(() => (name.value.trim()[0] || 'R').toUpperCase())

// The profile only stores bundled avatars or small JPEG data URLs, so the
// Google photo is converted once. Failure just keeps the default avatar.
async function googlePhotoAsDataUrl(url) {
  const response = await fetch(url)
  const bitmap = await createImageBitmap(await response.blob())
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  canvas.getContext('2d').drawImage(bitmap, 0, 0, 256, 256)
  return canvas.toDataURL('image/jpeg', 0.86)
}

async function saveName() {
  if (busy.value) return
  busy.value = true
  try {
    const patch = { displayName: name.value.trim() || 'Reader' }
    if (avatarPreview.value) {
      try { patch.avatarValue = await googlePhotoAsDataUrl(avatarPreview.value) } catch {}
    }
    await updateProfile(patch)
  } catch (cause) {
    console.warn('[Onboarding] Could not save the name:', cause)
  } finally {
    busy.value = false
  }
  go(signedIn.value ? 'backup' : 'formats')
}

// ── Restore ─────────────────────────────────────────────────────────────────
const restorePercent = computed(() => {
  const run = backupRun
  if (!run.total) return run.running ? 8 : 100
  return Math.min(100, Math.round((run.current / run.total) * 100))
})

async function restore() {
  if (!foundBackup.value) return
  restoring.value = true
  error.value = ''
  try {
    await backup.restoreBackup(foundBackup.value)
    // The restore wrote settings straight to storage; patch them there too.
    // Going through the in-memory store would overwrite the restored values.
    writePagesSettings({ ...readPagesSettings(), onboardingComplete: true })
    restored.value = true
    // On the phone, ask for file access now (with an explanation) so the
    // first scan after the restart can reconnect the restored books.
    go(native ? 'reconnect' : 'done')
  } catch (cause) {
    error.value = String(cause?.message || 'Restore failed. Nothing was changed.')
  } finally {
    restoring.value = false
  }
}

function startFresh() {
  go(flow.value === 'full' ? 'name' : 'backup')
}

// ── Backup setup ────────────────────────────────────────────────────────────
function saveBackup() {
  // 'Only when I tap Back up now' is automatic backup switched off.
  const manual = backupDraft.frequency === 'manual'
  backup.updatePrefs({ ...backupDraft, enabled: !manual, frequency: manual ? 'daily' : backupDraft.frequency })
  if (flow.value === 'full') {
    go('formats')
  } else {
    go('done')
    // The library already exists here, so the first backup can start now.
    backup.backupNow({ reason: 'setup' }).catch(() => {})
  }
}

// ── Formats + device access ─────────────────────────────────────────────────
const booksCopy = computed(() => {
  if (step.value === 'reconnect') {
    const count = Number(foundBackup.value?.book_count) || 0
    return {
      title: 'Reconnect your books',
      body: `Allow access so Pages can match your ${count} restored book${count === 1 ? '' : 's'} to the files on this phone and open them again.`,
    }
  }
  return native
    ? { title: 'Find the books on your phone', body: 'Pages scans your folders for EPUBs and PDFs, and adds new ones every time you open it.' }
    : { title: 'Add your first book', body: 'Bring in an EPUB or PDF from your computer to start reading.' }
})

async function applyFormats(allow) {
  if (busy.value) return
  busy.value = true
  try {
    if (allow && native) {
      // Starts the device scan, which asks for file access on its own.
      await applyFormatMode(formatChoice.value)
    } else {
      updateSettings({
        enabledFormats: enabledFormatsForMode(formatChoice.value),
        formatFilter: 'all',
        formatChoiceMade: true,
      })
    }
    addBookAfter.value = allow && !native
  } catch (cause) {
    console.warn('[Onboarding] Could not apply formats:', cause)
    updateSettings({ enabledFormats: enabledFormatsForMode(formatChoice.value), formatFilter: 'all', formatChoiceMade: true })
  } finally {
    busy.value = false
  }
  go('done')
}

async function reconnect(allow) {
  if (busy.value) return
  busy.value = true
  try {
    if (allow) await requestDeviceBooksAccess()
  } finally {
    busy.value = false
  }
  go('done')
}

// ── Done ────────────────────────────────────────────────────────────────────
const firstName = computed(() => (name.value || profile.value?.displayName || '').trim().split(/\s+/)[0])
const doneTitle = computed(() => {
  if (restored.value) return 'Welcome back!'
  if (flow.value === 'account') return 'Backup is on!'
  return firstName.value && firstName.value !== 'Reader' ? `You're all set, ${firstName.value}!` : "You're all set!"
})
const doneCopy = computed(() => {
  if (restored.value) return 'Your library, progress and highlights are back. Books on this phone reconnect on their own.'
  if (flow.value === 'account') return 'Your first backup has started. Find it any time in Settings → Storage → Backup.'
  return signedIn.value
    ? 'Your library is ready and backed up.'
    : 'Your library is ready. Turn on backup any time from your profile.'
})

const CONFETTI_COLORS = ['#c9a7ff', '#8a5cf6', '#ffffff', '#ffd166', '#7ce7c4']
const confetti = Array.from({ length: 30 }, (_, id) => ({
  id,
  style: {
    left: `${(id * 37) % 100}%`,
    background: CONFETTI_COLORS[id % CONFETTI_COLORS.length],
    '--x': `${((id * 53) % 140) - 70}px`,
    '--r': `${(id * 97) % 720}deg`,
    '--d': `${200 + (id % 8) * 80}ms`,
    width: `${6 + (id % 3) * 3}px`,
    height: `${10 + (id % 4) * 3}px`,
  },
}))

function finish() {
  sessionStorage.removeItem(PENDING_KEY)
  // The setup flow already offered an account, so the one-time invitation
  // for pre-account users (components/shared/BackupPrompt.vue) never shows.
  try { localStorage.setItem(BACKUP_PROMPT_SEEN_KEY, '1') } catch {}
  if (restored.value) {
    // Every in-memory store was loaded before the restore; start clean.
    window.location.replace(nextPath.value || '/')
    return
  }
  if (flow.value === 'full') updateSettings({ onboardingComplete: true })
  const target = flow.value === 'account'
    ? (nextPath.value || '/profile')
    : (addBookAfter.value ? '/add' : (nextPath.value || '/'))
  router.replace(target)
}

// ── Returning from the web OAuth redirect ───────────────────────────────────
onMounted(async () => {
  let pending = null
  try { pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null') } catch {}
  if (!pending) return
  sessionStorage.removeItem(PENDING_KEY)
  mode.value = pending.mode || 'new'
  step.value = 'account'
  if (flow.value === 'full') history.value = ['intro']
  busy.value = true
  try {
    await initAccount()
    if (account.signedIn.value) await afterSignIn()
    else error.value = 'Sign-in did not finish. Please try again.'
  } finally {
    busy.value = false
  }
})
</script>

<style scoped>
/* Design: one centred 3D object, a bold headline, short muted copy, full
   pill buttons under a hairline. Dark, oversized type for the two "moments"
   (welcome and done). The app forces weight 400 everywhere; onboarding is the
   one place that needs real bold, so it opts back in locally. */
.ob {
  --ob-bg: #ffffff;
  --ob-ink: #15111d;
  --ob-muted: #6c6676;
  --ob-line: rgba(21, 17, 29, 0.1);
  --ob-soft: #f4f2f8;
  --ob-brand: #7c3aed;
  --ob-brand-ink: #ffffff;
  --ob-moment-bg: #120c1e;
  --ob-moment-ink: #ffffff;
  --ob-moment-accent: #d6c3ff;

  position: fixed;
  inset: 0;
  z-index: 50;
  overflow: hidden auto;
  background: var(--ob-bg);
  color: var(--ob-ink);
  font-family: 'DM Sans', var(--mobile-font-family);
  transition: background-color 0.5s ease;
}
:global(:root[data-theme="dark"] .ob) {
  --ob-bg: var(--color-background-app, #111018);
  --ob-ink: #f5f2fa;
  --ob-muted: rgba(245, 242, 250, 0.62);
  --ob-line: rgba(245, 242, 250, 0.12);
  --ob-soft: rgba(245, 242, 250, 0.07);
  --ob-brand: #a77bff;
  --ob-brand-ink: #120c1e;
  --ob-moment-bg: #0b0713;
}
.ob.ob-dark { background: var(--ob-moment-bg); color: var(--ob-moment-ink); }

.ob-screen {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  max-width: 480px;
  margin: 0 auto;
  padding: calc(env(safe-area-inset-top) + 10px) 22px calc(env(safe-area-inset-bottom) + 18px);
}

/* ── Header: round back button + one thin progress bar ── */
:deep(.ob-head) { display: flex; align-items: center; gap: 16px; min-height: 52px; }
:deep(.ob-back) {
  display: grid;
  flex: none;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 50%;
  background: var(--ob-soft);
  color: var(--ob-ink);
  font-size: 21px;
  transition: transform 0.15s ease;
}
:deep(.ob-back:active) { transform: scale(0.9); }
:deep(.ob-back.hidden) { visibility: hidden; }
:deep(.ob-bar) { flex: 1; height: 4px; margin-right: 58px; overflow: hidden; border-radius: 999px; background: var(--ob-line); }
:deep(.ob-bar span) { display: block; height: 100%; border-radius: inherit; background: var(--ob-ink); transition: width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1); }

/* ── Layout ── */
.ob-body { display: flex; flex: 1; flex-direction: column; gap: 12px; padding: 18px 0 8px; }
.ob-center { align-items: center; text-align: center; }
.ob-body.ob-center { justify-content: center; }
.ob-hero { display: flex; flex: 1; flex-direction: column; align-items: center; justify-content: center; gap: 14px; text-align: center; }

.ob .ob-title {
  max-width: 340px;
  margin: 10px 0 0;
  font-size: clamp(27px, 7.4vw, 32px);
  font-weight: 700 !important;
  line-height: 1.12;
  letter-spacing: -0.025em;
  color: var(--ob-ink);
}
.ob .ob-text {
  max-width: 330px;
  margin: 0;
  font-size: 16px;
  line-height: 1.5;
  color: var(--ob-muted);
}
.ob .left { align-self: stretch; max-width: none; text-align: left; }

/* Dark moments */
.ob .ob-headline {
  margin: 6px 0 0;
  font-size: clamp(32px, 9vw, 40px);
  font-weight: 700 !important;
  line-height: 1.08;
  letter-spacing: -0.03em;
  color: var(--ob-moment-ink);
}
.ob .ob-display {
  max-width: 340px;
  margin: 6px 0 0;
  font-size: clamp(38px, 11vw, 52px);
  font-weight: 700 !important;
  line-height: 0.95;
  letter-spacing: -0.035em;
  text-transform: uppercase;
  color: var(--ob-moment-accent);
}
.ob .ob-lede { max-width: 320px; margin: 0; font-size: 16.5px; line-height: 1.5; color: rgba(255, 255, 255, 0.72); }
.ob-brand { display: flex; align-items: center; justify-content: center; gap: 10px; padding-top: 10px; font-size: 19px; color: var(--ob-moment-ink); }
.ob-brand-logo { width: 30px; height: 30px; border-radius: 9px; }
.ob .ob-brand span { font-weight: 600 !important; letter-spacing: -0.01em; }

/* ── Footer: hairline, then pill buttons ── */
.ob-foot {
  display: flex;
  align-self: stretch;
  flex-direction: column;
  gap: 10px;
  margin: 0 -22px;
  padding: 16px 22px 0;
  border-top: 1px solid var(--ob-line);
}
.ob-foot.plain { border-top: 0; }
.ob .ob-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  min-height: 56px;
  padding: 0 22px;
  border: 0;
  border-radius: 999px;
  font: inherit;
  font-size: 17px;
  font-weight: 600 !important;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.2s ease, background-color 0.2s ease;
}
.ob .ob-btn:active:not(:disabled) { transform: scale(0.97); }
.ob .ob-btn:disabled { opacity: 0.55; }
.ob .ob-btn.solid { background: var(--ob-brand); color: var(--ob-brand-ink); }
.ob .ob-btn.bright { background: var(--ob-moment-accent); color: #120c1e; }
.ob .ob-btn.outline { background: transparent; color: var(--ob-ink); box-shadow: inset 0 0 0 1.5px var(--ob-ink); }
.ob .ob-btn.ghost { min-height: 48px; background: transparent; color: var(--ob-ink); }
.ob .ob-btn.social { justify-content: center; box-shadow: inset 0 0 0 1.5px var(--ob-line); }
.ob .ob-btn.social .ob-g,
.ob .ob-btn.social .ob-spinner { position: absolute; left: 22px; }
.ob-g { width: 22px; height: 22px; }
.ob .ob-alt { margin: 6px 0 2px; font-size: 15px; text-align: center; color: rgba(255, 255, 255, 0.7); }
.ob .ob-inline { padding: 0; border: 0; background: none; color: var(--ob-moment-ink); font: inherit; font-weight: 700 !important; cursor: pointer; }
.ob .ob-fine { margin: 2px 0 0; font-size: 13px; text-align: center; color: var(--ob-muted); }
.ob-fine-link { color: var(--ob-ink); text-underline-offset: 3px; }
.ob .ob-note { display: flex; gap: 8px; align-items: flex-start; margin: 4px 0 0; padding: 12px 14px; border-radius: 14px; background: var(--ob-soft); font-size: 14px; line-height: 1.4; text-align: left; color: var(--ob-ink); }
.ob .ob-note.error { background: rgba(220, 38, 38, 0.09); color: #b91c1c; }
:global(:root[data-theme="dark"] .ob .ob-note.error) { color: #fca5a5; }
.ob-note i { font-size: 18px; line-height: 1.1; }
.ob-spinner { width: 20px; height: 20px; border: 2.5px solid var(--ob-line); border-top-color: var(--ob-ink); border-radius: 50%; animation: ob-rotate 0.8s linear infinite; }

/* ── Name ── */
.ob-avatar {
  display: grid;
  place-items: center;
  width: 108px;
  height: 108px;
  overflow: hidden;
  border-radius: 50%;
  background: var(--ob-brand);
  color: var(--ob-brand-ink);
  font-size: 44px;
  box-shadow: 0 0 0 6px var(--ob-soft);
}
.ob-avatar img { width: 100%; height: 100%; object-fit: cover; }
.ob-field { display: flex; flex-direction: column; gap: 8px; align-self: stretch; margin-top: 14px; text-align: left; }
.ob .ob-field > span { font-size: 14px; font-weight: 600 !important; color: var(--ob-ink); }
.ob-field input {
  min-height: 56px;
  padding: 0 16px;
  border: 1.5px solid var(--ob-line);
  border-radius: 14px;
  outline: none;
  background: var(--ob-bg);
  color: var(--ob-ink);
  font: inherit;
  font-size: 17px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.ob-field input:focus { border-color: var(--ob-ink); box-shadow: 0 0 0 1px var(--ob-ink); }

/* ── Switches ── */
.ob-switch-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; align-self: stretch; padding: 14px 2px; text-align: left; font-size: 16px; }
.ob-switch-copy { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.ob .ob-switch-copy strong { font-size: 16px; font-weight: 600 !important; }
.ob .ob-switch-copy small { font-size: 13.5px; line-height: 1.4; color: var(--ob-muted); }
.ob-switch {
  position: relative;
  flex: none;
  width: 50px;
  height: 30px;
  margin: 0;
  border-radius: 999px;
  background: var(--ob-line);
  appearance: none;
  cursor: pointer;
  transition: background-color 0.25s ease;
}
.ob-switch::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  transition: transform 0.28s cubic-bezier(0.2, 1.3, 0.4, 1);
}
.ob-switch:checked { background: var(--ob-brand); }
.ob-switch:checked::after { transform: translateX(20px); }
.ob-group { margin-top: 18px; padding: 0 16px; border-radius: 20px; background: var(--ob-soft); }
.ob-group .ob-switch-row + .ob-switch-row { border-top: 1px solid var(--ob-line); }

/* ── Choice cards (selected = solid ink) ── */
.ob-choices { display: flex; flex-direction: column; gap: 10px; margin-top: 18px; }
.ob-choices.full { align-self: stretch; margin-top: 10px; }
.ob .ob-choice {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-height: 64px;
  padding: 14px 18px;
  border: 0;
  border-radius: 18px;
  background: var(--ob-soft);
  color: var(--ob-ink);
  font: inherit;
  text-align: left;
  transition: background-color 0.25s ease, color 0.25s ease, transform 0.15s ease;
}
.ob .ob-choice.tall { min-height: 76px; }
.ob .ob-choice:active { transform: scale(0.98); }
.ob .ob-choice.on { background: var(--ob-ink); color: var(--ob-bg); }
.ob-choice-copy { display: flex; flex: 1; flex-direction: column; gap: 3px; min-width: 0; }
.ob .ob-choice-copy strong { font-size: 16.5px; font-weight: 600 !important; }
.ob .ob-choice-copy small { font-size: 13.5px; line-height: 1.35; opacity: 0.68; }
.ob-choice-icon { display: grid; flex: none; place-items: center; width: 44px; height: 44px; border-radius: 50%; background: var(--ob-bg); color: var(--ob-ink); font-size: 21px; }
.ob-tick { display: grid; flex: none; place-items: center; width: 26px; height: 26px; border-radius: 50%; box-shadow: inset 0 0 0 1.5px var(--ob-line); color: transparent; font-size: 17px; transition: background-color 0.25s ease, color 0.25s ease, transform 0.3s cubic-bezier(0.2, 1.6, 0.4, 1); }
.ob-choice.on .ob-tick { background: var(--ob-bg); color: var(--ob-ink); box-shadow: none; transform: scale(1.08); }

/* ── Restore ── */
.ob-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-self: stretch; margin-top: 14px; padding: 16px 6px; border-radius: 20px; background: var(--ob-soft); }
.ob-stats div { display: flex; flex-direction: column; gap: 2px; }
.ob-stats div + div { border-left: 1px solid var(--ob-line); }
.ob .ob-stats strong { font-size: 20px; font-weight: 700 !important; letter-spacing: -0.02em; }
.ob .ob-stats span { font-size: 12.5px; color: var(--ob-muted); }
.ob-ring {
  display: grid;
  place-items: center;
  width: 148px;
  height: 148px;
  margin-bottom: 6px;
  border-radius: 50%;
  background: conic-gradient(var(--ob-brand) calc(var(--p) * 1%), var(--ob-line) 0);
  transition: background 0.4s ease;
}
.ob .ob-ring span { display: grid; place-items: center; width: 128px; height: 128px; border-radius: 50%; background: var(--ob-bg); font-size: 34px; font-weight: 700 !important; letter-spacing: -0.03em; }
.ob .ob-ring small { font-size: 18px; color: var(--ob-muted); }

/* ── Reassurance card ── */
.ob-assure { display: flex; gap: 12px; align-items: flex-start; align-self: stretch; margin-top: 16px; padding: 16px; border-radius: 18px; background: var(--ob-soft); text-align: left; }
.ob-assure > i { display: grid; flex: none; place-items: center; width: 38px; height: 38px; border-radius: 50%; background: var(--ob-bg); color: var(--ob-brand); font-size: 19px; }
.ob-assure div { display: flex; flex-direction: column; gap: 3px; }
.ob .ob-assure strong { font-size: 15px; font-weight: 600 !important; }
.ob .ob-assure span { font-size: 13.5px; line-height: 1.4; color: var(--ob-muted); }

/* ── Done ── */
.ob-confetti { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.ob-confetti span { position: absolute; top: -24px; border-radius: 2px; opacity: 0; }

/* ── Motion ── */
@media (prefers-reduced-motion: no-preference) {
  .ob-rise { animation: ob-rise 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
  .ob-rise.d1 { animation-delay: 0.12s; }
  .ob-rise.d2 { animation-delay: 0.2s; }
  .ob-rise.d3 { animation-delay: 0.28s; }
  .ob-pop { animation: ob-pop 0.7s cubic-bezier(0.2, 1.5, 0.35, 1) both; }
  .ob-confetti span { animation: ob-confetti 2.6s cubic-bezier(0.25, 0.6, 0.4, 1) var(--d) forwards; }

  .ob-forward-enter-active, .ob-forward-leave-active,
  .ob-back-enter-active, .ob-back-leave-active { transition: opacity 0.26s ease, transform 0.34s cubic-bezier(0.2, 0.8, 0.2, 1); }
  .ob-forward-enter-from { opacity: 0; transform: translateX(28px); }
  .ob-forward-leave-to { opacity: 0; transform: translateX(-28px); }
  .ob-back-enter-from { opacity: 0; transform: translateX(-28px); }
  .ob-back-leave-to { opacity: 0; transform: translateX(28px); }
}

@keyframes ob-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@keyframes ob-pop { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: none; } }
@keyframes ob-rotate { to { transform: rotate(360deg); } }
@keyframes ob-confetti {
  0% { opacity: 1; transform: translate(0, 0) rotate(0); }
  100% { opacity: 0; transform: translate(var(--x), 105vh) rotate(var(--r)); }
}
</style>
