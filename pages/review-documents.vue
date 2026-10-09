<template>
  <main class="review-page">
    <header class="page-nav">
      <button type="button" aria-label="Back to books" @click="router.push('/books')"><i class="ri-arrow-left-line"></i></button>
      <h1>Review files</h1>
      <span></span>
    </header>
    <div class="review-content">
      <p class="intro">These files are ready to read. Pages found conflicting clues and needs your help to choose how to handle them.</p>
      <template v-if="current">
        <p class="counter">{{ pending.length }} file{{ pending.length === 1 ? '' : 's' }} to review</p>
        <article class="file-card">
          <div class="pdf-icon"><i :class="current.format === 'pdf' ? 'ri-file-pdf-2-line' : 'ri-file-text-line'"></i></div>
          <div>
            <h2>{{ current.sourceFileName || `${current.title}.pdf` }}</h2>
            <p>{{ String(current.format || 'File').toUpperCase() }} · {{ current.pages || 'Unknown number of' }} pages</p>
          </div>
        </article>
        <div class="explanation"><i class="ri-shield-check-line"></i><span>{{ identityReview ? 'More than one book identity matches. Your local details are kept until you choose.' : 'Pages found conflicting clues in the file. Choose how to handle it.' }}</span></div>
        <div v-if="current.intelligence?.kindReason" class="evidence-note">{{ current.intelligence.kindReason }}</div>
        <div v-if="sampleText" class="sample-card"><span>From page {{ samplePage }}</span><p>{{ sampleText }}</p></div>
        <h2 class="question">{{ identityReview ? 'Which book is this?' : 'What is this file?' }}</h2>
        <div v-if="identityReview" class="choices">
          <button v-for="(candidate, index) in current.intelligence.identityCandidates" :key="index" type="button" :disabled="saving" @click="chooseIdentity(candidate)">{{ candidate.title }} — {{ candidate.author }}</button>
          <button type="button" :disabled="saving" @click="chooseIdentity(null)">None of these · Keep local details</button>
        </div>
        <div v-else class="choices">
          <button type="button" class="primary" :disabled="saving" @click="choose('book')"><i class="ri-book-open-line"></i> Book</button>
          <button type="button" :disabled="saving" @click="choose('personal')"><i class="ri-file-text-line"></i> Personal document</button>
        </div>
        <button type="button" class="later" :disabled="saving" @click="decideLater">Decide later</button>
      </template>
      <div v-else class="done"><i class="ri-check-double-line"></i><h2>All caught up</h2><p>You can change any file’s type later from its edit page.</p><button type="button" @click="router.push('/books')">Back to Books</button></div>
    </div>
    <Teleport to="body">
      <div v-if="showLaterHelp" class="help-overlay" role="presentation">
        <section class="help-dialog" role="dialog" aria-modal="true" aria-labelledby="later-title">
          <div class="bell-picture" aria-hidden="true"><span class="bell-visual"><i class="ri-notification-3-line"></i><b></b></span><i class="ri-arrow-left-up-line"></i><span>Profile</span></div>
          <h2 id="later-title">Find it in Notifications</h2>
          <p>This file will wait in Notifications. Open <strong>Profile</strong> and tap the <strong>bell at the top left</strong> whenever you are ready to choose its type.</p>
          <button type="button" @click="closeLaterHelp">Got it</button>
        </section>
      </div>
    </Teleport>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useBooks } from '~/composables/useBooks'
import { newDocumentReviews, needsDocumentReview, withDocumentType } from '~/composables/useDocumentReview'
import { useDocumentIntelligenceStore } from '~/composables/useDocumentIntelligenceStore'
import { useToast } from '~/composables/useToast'

const router = useRouter()
const route = useRoute()
const { books, fetchAllData, updateBook } = useBooks()
const { addToast } = useToast()
const pending = computed(() => newDocumentReviews(books.value))
const current = computed(() => books.value.find((book) => book.id === route.query.document && needsDocumentReview(book)) || pending.value[0] || null)
const identityReview = computed(() => current.value?.intelligence?.review === 'identity-conflict')
const saving = ref(false)
const showLaterHelp = ref(false)
const sampleText = ref('')
const samplePage = ref(1)

onMounted(() => fetchAllData())
watch(() => current.value?.id, async (bookId) => {
  sampleText.value = ''
  if (!bookId) return
  try {
    const evidence = await useDocumentIntelligenceStore().getEvidence(bookId)
    if (current.value?.id !== bookId) return
    const sample = evidence?.samples?.find((item) => item.text?.trim())
    sampleText.value = sample?.text?.slice(0, 320) || ''
    samplePage.value = sample?.page || 1
  } catch {}
}, { immediate: true })

const choose = async (type) => {
  if (!current.value || saving.value) return
  saving.value = true
  try { await updateBook(withDocumentType(current.value, type)) }
  catch { addToast('Could not save this file type. Please try again.', 'error') }
  finally { saving.value = false }
}

const chooseIdentity = async (candidate) => {
  if (!current.value || saving.value) return
  saving.value = true
  try {
    const store = useDocumentIntelligenceStore()
    const result = await store.commitIdentity(current.value.id, current.value.updatedAt, candidate
      ? { status: 'user-approved', candidate, nextAttemptAt: Date.now() + 86400000 }
      : { status: 'user-rejected', nextAttemptAt: Number.MAX_SAFE_INTEGER })
    if (result.status !== 'applied') throw new Error('File changed')
    await fetchAllData(true)
  } catch { addToast('Could not save this choice. Please try again.', 'error') }
  finally { saving.value = false }
}

const decideLater = async () => {
  if (!current.value || saving.value) return
  saving.value = true
  try {
    await updateBook(identityReview.value ? { ...current.value, reviewState: 'deferred' }
      : withDocumentType(current.value, 'unclassified', { defer: true }))
    showLaterHelp.value = true
  } catch { addToast('Could not defer this file. Please try again.', 'error') }
  finally { saving.value = false }
}

const closeLaterHelp = () => {
  showLaterHelp.value = false
  router.push('/books')
}
</script>

<style scoped>
.review-page{min-height:100dvh;background:var(--color-background-app);color:var(--color-text-primary)}
.page-nav{height:70px;display:grid;grid-template-columns:48px 1fr 48px;align-items:center;max-width:760px;margin:auto;padding:0 18px}.page-nav h1{text-align:center;font-size:1.1rem}.page-nav button{border:0;background:transparent;color:inherit;font-size:23px}
.review-content{max-width:540px;margin:0 auto;padding:16px 24px 110px}.intro{color:var(--color-text-secondary);line-height:1.5}.counter{color:var(--color-brand-primary);font-size:.83rem;font-weight:700;margin-top:28px}.file-card{display:flex;align-items:center;gap:16px;border:1px solid var(--color-border-card);border-radius:16px;background:var(--color-surface-primary);padding:18px;margin:12px 0}.pdf-icon{width:64px;height:76px;display:grid;place-items:center;border-radius:8px;background:var(--color-brand-primary-soft);color:var(--color-brand-primary);font-size:32px}.file-card h2{font-size:1.05rem;overflow-wrap:anywhere;margin:0 0 6px}.file-card p{font-size:.8rem;color:var(--color-text-secondary);margin:0}.explanation{display:flex;gap:10px;border-radius:12px;background:var(--color-brand-primary-faint);color:var(--color-text-secondary);padding:14px;font-size:.84rem;line-height:1.45}.explanation i{color:var(--color-brand-primary);font-size:20px}.question{font-size:1.1rem;margin-top:30px}.choices{display:grid;grid-template-columns:1fr 1fr;gap:10px}.choices button,.done button{border:1px solid var(--color-border-card);background:var(--color-surface-primary);color:var(--color-text-primary);border-radius:11px;padding:13px 8px;font-weight:700}.choices .primary,.done button{background:var(--color-brand-primary);border-color:var(--color-brand-primary);color:white}.later{display:block;margin:19px auto;border:0;background:transparent;color:var(--color-brand-primary);font-weight:700}.done{text-align:center;margin-top:80px}.done>i{font-size:48px;color:var(--color-brand-primary)}.done p{color:var(--color-text-secondary)}
.help-overlay{position:fixed;inset:0;z-index:3000;background:#0009;display:grid;place-items:center;padding:20px}.help-dialog{width:min(390px,100%);border-radius:20px;background:var(--color-surface-primary);color:var(--color-text-primary);padding:27px;text-align:center;box-shadow:0 20px 55px #0004}.help-dialog h2{font-size:1.3rem}.help-dialog p{line-height:1.55;color:var(--color-text-secondary)}.help-dialog button{width:100%;border:0;border-radius:10px;padding:13px;background:var(--color-brand-primary);color:white;font-weight:800}.bell-picture{height:95px;border-radius:14px;background:var(--color-brand-primary-faint);display:flex;align-items:center;justify-content:space-around;color:var(--color-brand-primary);font-weight:800}.bell-picture>i{font-size:27px}.bell-visual{width:52px;height:52px;display:grid;place-items:center;position:relative;background:var(--color-surface-primary);border-radius:15px;font-size:29px;box-shadow:0 3px 12px #0002}.bell-visual b{position:absolute;right:9px;top:10px;width:9px;height:9px;border-radius:50%;background:#e54d67}
.evidence-note{margin-top:14px;font-size:.83rem;font-weight:700;color:var(--color-text-secondary)}.sample-card{margin-top:12px;padding:14px;border:1px solid var(--color-border-card);border-radius:12px;background:var(--color-surface-primary)}.sample-card span{font-size:.72rem;font-weight:700;color:var(--color-brand-primary)}.sample-card p{font-size:.86rem;line-height:1.5;color:var(--color-text-secondary);margin:8px 0 0;overflow-wrap:anywhere}
</style>
