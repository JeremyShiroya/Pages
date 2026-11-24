<template>
  <Teleport to="body">
    <Transition name="bp">
      <div v-if="visible" class="bp-layer" role="presentation" @click.self="dismiss">
        <section class="bp-sheet" role="dialog" aria-modal="true" aria-labelledby="bp-title">
          <span class="bp-grip" aria-hidden="true"></span>
          <OnboardingIllustration name="account" size="medium" />
          <h2 id="bp-title" class="bp-title">Keep your library safe</h2>
          <p class="bp-text">
            You have {{ bookCount }} book{{ bookCount === 1 ? '' : 's' }} in Pages. Back them up so deleting the
            app or changing phones never loses your progress and highlights.
          </p>
          <div class="bp-actions">
            <button type="button" class="bp-btn solid" @click="accept">Back up my library</button>
            <button type="button" class="bp-btn ghost" @click="dismiss">Not now</button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import OnboardingIllustration from '~/components/onboarding/OnboardingIllustration.vue'
import { isAccountConfigured, useAccount } from '~/composables/useAccount'
import { useBooks } from '~/composables/useBooks'
import { readPagesSettings } from '~/composables/usePagesSettings'
import { BACKUP_PROMPT_SEEN_KEY } from '~/composables/useCloudBackup'

// One-time invitation for people who used Pages before accounts existed.
// New installs meet the same offer inside the setup flow, which marks this as
// seen. It only ever appears on Home, never over the reader or narration,
// and "Not now" is final: Profile and Settings → Storage → Backup stay there.
const SHOW_DELAY_MS = 2500

const route = useRoute()
const router = useRouter()
const { signedIn, ready } = useAccount()
const { books, initialized } = useBooks()

const visible = ref(false)
const bookCount = computed(() => books.value?.length || 0)
let timer = null

const alreadySeen = () => {
  try { return localStorage.getItem(BACKUP_PROMPT_SEEN_KEY) === '1' } catch { return true }
}
const markSeen = () => {
  try { localStorage.setItem(BACKUP_PROMPT_SEEN_KEY, '1') } catch {}
}

const eligible = computed(() => (
  isAccountConfigured()
  && ready.value
  && !signedIn.value
  && initialized.value
  && bookCount.value > 0
  && route.path === '/'
))

watch(eligible, (value) => {
  clearTimeout(timer)
  if (!value || visible.value) return
  timer = setTimeout(() => {
    if (!eligible.value || alreadySeen() || !readPagesSettings().onboardingComplete) return
    markSeen()
    visible.value = true
  }, SHOW_DELAY_MS)
}, { immediate: true })

// Leaving Home (opening a book, say) closes it without fuss.
watch(() => route.path, (path) => { if (path !== '/') visible.value = false })

function dismiss() {
  visible.value = false
}

function accept() {
  visible.value = false
  router.push({ path: '/welcome', query: { flow: 'account', next: '/' } })
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<style scoped>
.bp-layer {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(10, 6, 18, 0.48);
}
.bp-sheet {
  --ob-ink: var(--color-text-primary);
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 520px;
  padding: 10px 22px calc(env(safe-area-inset-bottom) + 18px);
  border-radius: 28px 28px 0 0;
  background: var(--color-surface-modal, #fff);
  color: var(--color-text-primary);
  font-family: 'DM Sans', var(--mobile-font-family);
  text-align: center;
}
.bp-grip { width: 40px; height: 5px; margin-bottom: 6px; border-radius: 999px; background: var(--color-border-card); }
.bp-sheet .bp-title {
  margin: 4px 0 8px;
  font-size: 26px;
  font-weight: 700 !important;
  line-height: 1.15;
  letter-spacing: -0.025em;
}
.bp-text { max-width: 330px; margin: 0; font-size: 15.5px; line-height: 1.5; color: var(--color-text-muted); }
.bp-actions { display: flex; flex-direction: column; gap: 8px; align-self: stretch; margin-top: 22px; }
.bp-sheet .bp-btn {
  min-height: 56px;
  border: 0;
  border-radius: 999px;
  font: inherit;
  font-size: 17px;
  font-weight: 600 !important;
  cursor: pointer;
  transition: transform 0.15s ease;
}
.bp-btn:active { transform: scale(0.97); }
.bp-btn.solid { background: var(--color-brand-primary); color: var(--color-text-on-brand); }
.bp-btn.ghost { min-height: 48px; background: transparent; color: var(--color-text-primary); }

.bp-enter-active, .bp-leave-active { transition: background-color 0.3s ease; }
.bp-enter-active .bp-sheet, .bp-leave-active .bp-sheet { transition: transform 0.42s cubic-bezier(0.2, 0.9, 0.2, 1); }
.bp-enter-from, .bp-leave-to { background-color: rgba(10, 6, 18, 0); }
.bp-enter-from .bp-sheet, .bp-leave-to .bp-sheet { transform: translateY(100%); }
@media (prefers-reduced-motion: reduce) {
  .bp-enter-active .bp-sheet, .bp-leave-active .bp-sheet { transition: none; }
}
</style>
