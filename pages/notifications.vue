<template>
  <main class="notifications-page">
    <header class="page-nav"><button type="button" aria-label="Back to profile" @click="router.push('/profile')"><i class="ri-arrow-left-line"></i></button><h1>Notifications</h1><span></span></header>
    <div class="content">
      <p class="intro">Files you chose to decide on later appear here.</p>
      <div v-if="!pending.length" class="empty"><i class="ri-notification-off-line"></i><h2>All caught up</h2><p>There are no files waiting for a decision.</p></div>
      <article v-for="file in pending" :key="file.id" class="notification-card">
        <div class="file-icon"><i class="ri-file-pdf-2-line"></i></div>
        <div class="file-details"><h2>{{ file.sourceFileName || file.title }}</h2><p>{{ file.intelligence?.review === 'identity-conflict' ? 'Which book matches this file?' : 'Is this a book or a personal document?' }}</p><div v-if="file.intelligence?.review === 'identity-conflict'" class="actions"><button type="button" @click="router.push({ path: '/review-documents', query: { document: file.id } })">Compare matches</button></div><div v-else class="actions"><button type="button" :disabled="savingId === file.id" @click="choose(file, 'book')">Book</button><button type="button" :disabled="savingId === file.id" @click="choose(file, 'personal')">Personal document</button><button type="button" class="open" @click="router.push(`/book/${file.id}`)">Open file</button></div></div>
      </article>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useBooks } from '~/composables/useBooks'
import { deferredDocumentReviews, withDocumentType } from '~/composables/useDocumentReview'
import { useToast } from '~/composables/useToast'

const router = useRouter()
const { books, fetchAllData, updateBook } = useBooks()
const { addToast } = useToast()
const pending = computed(() => deferredDocumentReviews(books.value))
const savingId = ref(null)
onMounted(() => fetchAllData())
const choose = async (file, type) => {
  if (savingId.value) return
  savingId.value = file.id
  try { await updateBook(withDocumentType(file, type)) }
  catch { addToast('Could not save this file type. Please try again.', 'error') }
  finally { savingId.value = null }
}
</script>

<style scoped>
.notifications-page{min-height:100dvh;background:var(--color-background-app);color:var(--color-text-primary)}.page-nav{height:70px;display:grid;grid-template-columns:48px 1fr 48px;align-items:center;max-width:760px;margin:auto;padding:0 18px}.page-nav h1{text-align:center;font-size:1.1rem}.page-nav button{border:0;background:transparent;color:inherit;font-size:23px}.content{max-width:700px;margin:0 auto;padding:14px 24px 110px}.intro{color:var(--color-text-secondary);font-size:.9rem}.notification-card{display:flex;gap:15px;padding:17px;margin:18px 0;background:var(--color-surface-primary);border:1px solid var(--color-border-card);border-radius:15px}.file-icon{color:var(--color-brand-primary);font-size:28px}.file-details{min-width:0}.file-details h2{font-size:1rem;overflow-wrap:anywhere;margin:0 0 5px}.file-details p{margin:0;color:var(--color-text-secondary);font-size:.86rem}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:15px}.actions button{border:1px solid var(--color-brand-primary);border-radius:8px;background:var(--color-brand-primary);color:white;padding:8px 10px;font-size:.79rem;font-weight:700}.actions button:nth-child(2){background:var(--color-surface-primary);color:var(--color-brand-primary)}.actions .open{border-color:var(--color-border-card);background:transparent;color:var(--color-text-secondary)}.empty{text-align:center;margin-top:100px;color:var(--color-text-secondary)}.empty i{font-size:48px;color:var(--color-brand-primary)}.empty h2{color:var(--color-text-primary)}
</style>
