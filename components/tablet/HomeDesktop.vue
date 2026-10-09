<template>
  <main class="tablet-home">
    <header class="home-toolbar">
      <label class="home-search">
        <i class="ri-search-line" aria-hidden="true"></i>
        <input v-model.trim="query" type="search" placeholder="Search books, series, authors…" aria-label="Search library" />
      </label>
      <h1 class="home-brand">Pages</h1>
    </header>

    <HomeSkeleton v-if="loading && !initialized" />
    <EmptyState v-else-if="error && books.length === 0" title="Library could not load" :description="error" icon="ri-error-warning-line">
      <template #action><button class="retry-btn" @click="fetchAllData(true)">Retry</button></template>
    </EmptyState>
    <EmptyState v-else-if="initialized && books.length === 0" illustration="library" title="Your library awaits" description="Add your first book and Pages will keep your reading, listening and progress right here.">
      <template #action><NuxtLink to="/add" class="primary-link">Add your first book</NuxtLink></template>
    </EmptyState>

    <div v-else class="home-columns">
      <div class="home-library-column">
        <section v-if="currentBook" class="home-section currently-reading">
          <h1>Currently Reading</h1>
          <article class="current-card" @click="openBook(currentBook)">
            <div class="current-backdrop" :style="coverBackground(currentBook)"></div><div class="current-shade"></div>
            <img :src="currentBook.cover" :alt="currentBook.title" class="current-cover" />
            <div class="current-copy">
              <h2>{{ currentBook.title }}</h2><p class="current-author">{{ currentBook.author }}</p>
              <p class="current-blurb">{{ truncate(currentBook.blurb, 245) }}</p>
              <BookProgressDisplay :progress="currentBook.progress" compact />
              <div class="current-actions">
                <button type="button" @click.stop="handlePlay(currentBook)"><i :class="isBookPlaying(currentBook) ? 'ri-pause-fill' : 'ri-play-fill'"></i>{{ isBookPlaying(currentBook) ? 'Pause' : 'Listen' }}</button>
                <button type="button" @click.stop="openReader(currentBook)"><i class="ri-book-open-line"></i>Read</button>
              </div>
            </div>
          </article>
        </section>

        <section class="home-section recently-added">
          <div class="section-heading"><h1>Recently Added</h1><NuxtLink to="/books">See all</NuxtLink></div>
          <div v-if="visibleRecentBooks.length" class="recent-list">
            <article v-for="book in visibleRecentBooks" :key="book.id" class="recent-book" @click="openBook(book)">
              <img :src="book.cover" :alt="book.title" />
              <div><h2>{{ book.title }}</h2><p class="recent-author">{{ book.author }}</p><p class="recent-blurb">{{ truncate(book.blurb, 135) }}</p></div>
            </article>
          </div>
          <p v-else class="no-results">No books match “{{ query }}”.</p>
        </section>
      </div>

      <aside class="series-column">
        <div class="section-heading"><h1>Series</h1><NuxtLink to="/series">See all</NuxtLink></div>
        <div class="series-stack">
          <SeriesCollageCard v-for="group in visibleSeries" :key="group.id" :series="group" @open="openSeries" />
          <p v-if="!visibleSeries.length" class="no-results">No series match “{{ query }}”.</p>
        </div>
      </aside>
    </div>
  </main>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useBooks } from '~/composables/useBooks'
import { useTTS } from '~/composables/useTTS'
import BookProgressDisplay from '../shared/BookProgressDisplay.vue'
import SeriesCollageCard from '../shared/SeriesCollageCard.vue'
import EmptyState from '../shared/EmptyState.vue'
import HomeSkeleton from '../shared/HomeSkeleton.vue'

const router = useRouter()
const query = ref('')
const { books, recentlyAddedBooks, recentlyReadBooks, seriesList, loading, initialized, error, fetchAllData } = useBooks()
const { play, togglePlay, ttsBook, ttsStatus } = useTTS()
const normalizedQuery = computed(() => query.value.toLocaleLowerCase())
const matches = (...values) => !normalizedQuery.value || values.some(value => String(value || '').toLocaleLowerCase().includes(normalizedQuery.value))
const currentBook = computed(() => recentlyReadBooks.value.find(book => matches(book.title, book.author)) || null)
const visibleRecentBooks = computed(() => recentlyAddedBooks.value.filter(book => matches(book.title, book.author, book.series)).slice(0, 6))
const visibleSeries = computed(() => seriesList.value.filter(group => matches(group.name, group.author)).slice(0, 3))
const truncate = (value, length) => { const text = String(value || ''); return text.length > length ? `${text.slice(0, length).trim()}…` : text }
const coverBackground = book => ({ backgroundImage: book?.cover ? `url(${book.cover})` : 'none' })
const openBook = book => router.push(`/book/${book.id}`)
const openReader = book => router.push(`/reader/${book.id}?mode=read`)
const openSeries = group => router.push(`/serie/${group.id}`)
const isBookPlaying = book => ttsBook.value?.id === book.id && ttsStatus.value !== 'idle' && ttsStatus.value !== 'paused'
const handlePlay = (book) => { if (ttsBook.value?.id === book.id && ttsStatus.value !== 'idle') togglePlay(); else play(book) }
</script>

<style scoped>
.tablet-home{min-height:calc(100vh - 120px);color:var(--color-text-primary)}
.home-toolbar,.section-heading{display:flex;align-items:center;justify-content:space-between}.home-toolbar{margin-bottom:1.15rem}
.home-search{display:flex;width:min(280px,45vw);min-height:34px;align-items:center;gap:8px;padding:0 12px;border:1px solid var(--color-border-card);border-radius:11px;background:var(--color-surface-card);color:var(--color-text-muted)}
.home-search input{width:100%;border:0;outline:0;background:transparent;color:var(--color-text-primary);font:inherit;font-size:12px}
.home-brand{margin:0;color:var(--color-brand-primary);font-size:1.6rem;font-weight:700;letter-spacing:-.045em}
.home-columns{display:grid;grid-template-columns:minmax(0,2.15fr) minmax(245px,1fr);gap:26px;align-items:start}.home-library-column{min-width:0}.home-section+.home-section{margin-top:1.2rem}
.home-section h1,.series-column h1{margin:0 0 .65rem;font-size:1.05rem;font-weight:500;color:var(--color-text-primary)}.section-heading h1{margin-bottom:0}.section-heading{margin-bottom:.65rem}.section-heading a{color:var(--color-text-muted);font-size:.75rem;text-decoration:none}
.current-card{position:relative;display:grid;grid-template-columns:112px minmax(0,1fr);gap:18px;min-height:190px;overflow:hidden;padding:16px;border-radius:18px;color:#fff;cursor:pointer}
.current-backdrop,.series-backdrop{position:absolute;inset:-24px;background-position:center;background-size:cover;filter:blur(28px) saturate(125%);transform:scale(1.16)}.current-shade,.series-shade{position:absolute;inset:0;background:linear-gradient(110deg,rgba(12,13,18,.91),rgba(24,27,31,.72))}
.current-cover{position:relative;z-index:1;width:112px;height:158px;align-self:center;border-radius:7px;object-fit:cover;box-shadow:var(--shadow-cover)}.current-copy{position:relative;z-index:1;display:flex;min-width:0;flex-direction:column;justify-content:center}.current-copy h2{margin:0;font-size:1.2rem;font-weight:500}.current-author{margin:3px 0 7px;color:rgba(255,255,255,.75);font-size:.72rem}.current-blurb{display:-webkit-box;margin:0 0 9px;overflow:hidden;color:rgba(255,255,255,.83);font-size:.72rem;line-height:1.45;-webkit-box-orient:vertical;-webkit-line-clamp:3}.current-copy :deep(.book-progress-display){width:min(230px,100%);color:rgba(255,255,255,.85)}
.current-actions{display:flex;gap:7px;margin-top:10px}.current-actions button{display:inline-flex;min-height:28px;align-items:center;gap:5px;padding:0 11px;border:1px solid rgba(255,255,255,.48);border-radius:999px;background:rgba(0,0,0,.2);color:#fff;cursor:pointer;font-size:.68rem}.current-actions button:first-child{background:#fff;color:#14151a}
.recent-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px 22px}.recent-book{display:grid;grid-template-columns:72px minmax(0,1fr);gap:11px;min-width:0;cursor:pointer}.recent-book>img{width:72px;height:104px;border-radius:7px;object-fit:cover;box-shadow:var(--shadow-cover)}.recent-book h2{margin:2px 0;overflow:hidden;color:var(--color-text-primary);font-size:.88rem;font-weight:500;text-overflow:ellipsis;white-space:nowrap}.recent-author{margin:0 0 5px;color:var(--color-text-muted);font-size:.66rem}.recent-blurb{display:-webkit-box;margin:0;overflow:hidden;color:var(--color-text-secondary);font-size:.66rem;line-height:1.45;-webkit-box-orient:vertical;-webkit-line-clamp:4}
.series-stack{display:grid;gap:13px}.series-card{position:relative;min-height:151px;overflow:hidden;border-radius:16px;color:#fff;cursor:pointer}.series-shade{background:linear-gradient(125deg,rgba(13,43,55,.86),rgba(21,82,102,.62))}.series-copy{position:relative;z-index:2;padding:15px}.series-copy h2{margin:0 0 4px;font-size:.88rem;font-weight:500}.series-copy p{margin:0;color:rgba(255,255,255,.78);font-size:.68rem}.series-covers{position:absolute;right:10px;bottom:-27px;z-index:2;display:flex;align-items:flex-end;justify-content:flex-end;width:80%}.series-covers img{width:78px;height:112px;margin-left:-26px;border-radius:4px 4px 0 0;object-fit:cover;box-shadow:-5px 0 14px rgba(0,0,0,.28);transform:rotate(-3deg)}.series-covers img:nth-child(2){transform:translateY(-5px) rotate(1deg)}.series-covers img:nth-child(3){transform:rotate(5deg)}
.no-results{color:var(--color-text-muted);font-size:.82rem}.primary-link,.retry-btn{display:inline-flex;padding:.7rem 1rem;border:0;border-radius:10px;background:var(--color-brand-primary);color:#fff;text-decoration:none;cursor:pointer}
@media(max-width:980px){.home-columns{grid-template-columns:minmax(0,1.8fr) minmax(220px,.9fr);gap:18px}.current-card{grid-template-columns:92px minmax(0,1fr);min-height:168px}.current-cover{width:92px;height:136px}.recent-list{gap-inline:14px}.recent-book{grid-template-columns:62px minmax(0,1fr)}.recent-book>img{width:62px;height:92px}}
</style>
