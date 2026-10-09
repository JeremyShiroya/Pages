<template>
  <div class="analytics-page">
    <MobileSettingsNav title="Analytics" :back-to="`/book/${bookId}`" aria-label="Book analytics navigation" />
    <main class="analytics-shell">
      <NuxtLink class="desktop-back" :to="`/book/${bookId}`"><i class="ri-arrow-left-line"></i> Book details</NuxtLink>
      <header class="heading">
        <div class="eyebrow"><i class="ri-bar-chart-line"></i> BOOK ANALYTICS</div>
        <h1>Reading insights</h1>
        <p v-if="book" class="subtitle">{{ book.title }}<span v-if="book.author"> · {{ book.author }}</span></p>
      </header>

      <div v-if="!book && !loading" class="empty-book">Book not found.</div>
      <template v-else-if="book">
        <section class="hero-card" aria-label="Read versus listened">
          <div class="card-heading"><span>YOUR TIME WITH THIS BOOK</span><i class="ri-time-line"></i></div>
          <div v-if="trackedSeconds" class="split-content">
            <div class="split-numbers">
              <div><strong>{{ readPercent }}%</strong><span>Read</span></div>
              <div><strong>{{ 100 - readPercent }}%</strong><span>Listened</span></div>
            </div>
            <div class="split-track" role="img" :aria-label="`${readPercent}% read, ${100 - readPercent}% listened`">
              <div :style="{ width: `${readPercent}%` }"></div>
            </div>
            <p class="muted">Based on {{ formatTime(readSeconds) }} reading and {{ formatTime(listenedSeconds) }} listening.</p>
          </div>
          <p v-else class="empty-metric">Time tracking begins when you read or listen to this book.</p>
        </section>

        <div class="metrics-grid">
          <section class="metric-card">
            <div class="card-heading"><span>MOST HIGHLIGHTED</span><i class="ri-mark-pen-line"></i></div>
            <template v-if="topHighlight">
              <strong class="chapter-title">{{ topHighlight.title }}</strong>
              <p class="metric-detail">{{ topHighlight.count }} highlight{{ topHighlight.count === 1 ? '' : 's' }}</p>
            </template>
            <p v-else class="empty-metric">No highlights yet</p>
          </section>
          <section class="metric-card">
            <div class="card-heading"><span>MOST NOTES</span><i class="ri-sticky-note-line"></i></div>
            <template v-if="topNote">
              <strong class="chapter-title">{{ topNote.title }}</strong>
              <p class="metric-detail">{{ topNote.count }} note{{ topNote.count === 1 ? '' : 's' }}</p>
            </template>
            <p v-else class="empty-metric">No notes yet</p>
          </section>
        </div>

        <section class="wide-card">
          <div class="card-heading"><span>READING SPEED</span><i class="ri-speed-line"></i></div>
          <div class="speed-grid">
            <div><strong>{{ pageSpeed }}</strong><span>per page</span></div>
            <div><strong>{{ chapterSpeed }}</strong><span>per chapter</span></div>
          </div>
          <p class="muted">Average active reading time for pages and chapters completed since tracking began.</p>
        </section>

        <div class="metrics-grid last-grid">
          <section class="metric-card">
            <div class="card-heading"><span>TIME SPENT</span><i class="ri-calendar-line"></i></div>
            <strong class="big-value">{{ daysTaken ?? '—' }}</strong>
            <p class="metric-detail">{{ daysTaken === 1 ? 'day' : 'days' }} {{ completed ? 'to complete' : 'reading so far' }}</p>
          </section>
          <section class="metric-card">
            <div class="card-heading"><span>BOOK STREAK</span><i class="ri-fire-line"></i></div>
            <strong class="big-value">{{ streak }}</strong>
            <p class="metric-detail">{{ streak === 1 ? 'day' : 'days' }} in a row</p>
          </section>
        </div>
        <p class="footnote">Activity before analytics was added is unavailable. Reading time counts while the reader is open; listening time counts while narration plays.</p>
      </template>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import MobileSettingsNav from '~/components/mobile/MobileSettingsNav.vue'
import { useBooks } from '~/composables/useBooks'
import { loadAnnotations, useAnnotations } from '~/composables/useAnnotations'
import { bookStreak, calendarDaysBetween, readBookAnalytics } from '~/composables/useBookAnalytics'

const route = useRoute()
const bookId = computed(() => String(route.params.id || ''))
const { books, initialized, fetchAllData } = useBooks()
const { annotations } = useAnnotations()
const book = computed(() => books.value.find(item => String(item.id) === bookId.value))
const loading = ref(true)
const activity = ref(null)
const today = ref(new Date())

const readSeconds = computed(() => Object.values(activity.value?.days || {}).reduce((sum, day) => sum + (Number(day.read) || 0), 0))
const listenedSeconds = computed(() => Object.values(activity.value?.days || {}).reduce((sum, day) => sum + (Number(day.listened) || 0), 0))
const trackedSeconds = computed(() => readSeconds.value + listenedSeconds.value)
const readPercent = computed(() => trackedSeconds.value ? Math.round(readSeconds.value / trackedSeconds.value * 100) : 0)
const completed = computed(() => Boolean(activity.value?.completedAt || book.value?.status === 'Read'))
const daysTaken = computed(() => calendarDaysBetween(activity.value?.firstAt, activity.value?.completedAt || today.value))
const streak = computed(() => bookStreak(activity.value?.days, today.value))

function formatTime(seconds) {
  if (seconds < 60) return '<1 min'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  return `${hours} hr${hours === 1 ? '' : 's'}${minutes % 60 ? ` ${minutes % 60} min` : ''}`
}
const pageSpeed = computed(() => activity.value?.pagesAdvanced && readSeconds.value
  ? formatTime(readSeconds.value / activity.value.pagesAdvanced) : '—')
const chapterSpeed = computed(() => activity.value?.chaptersAdvanced && readSeconds.value
  ? formatTime(readSeconds.value / activity.value.chaptersAdvanced) : '—')

function chapterIndex(chunk) {
  const counts = book.value?.sectionCounts || []
  let offset = 0
  for (let index = 0; index < counts.length; index += 1) {
    offset += Math.max(0, Number(counts[index]) || 0)
    if (chunk < offset) return index
  }
  return -1
}
function topChapter(items) {
  const counts = new Map()
  for (const item of items) {
    const index = chapterIndex(Number(item.startChunk) || 0)
    if (index < 0) continue
    counts.set(index, (counts.get(index) || 0) + 1)
  }
  const winner = [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]
  if (!winner) return null
  return { title: book.value?.tocTitles?.[winner[0]] || `Chapter ${winner[0] + 1}`, count: winner[1] }
}
const bookAnnotations = computed(() => annotations.value.filter(item => String(item.bookId) === bookId.value))
const topHighlight = computed(() => topChapter(bookAnnotations.value.filter(item => !item.note)))
const topNote = computed(() => topChapter(bookAnnotations.value.filter(item => item.note)))

onMounted(async () => {
  activity.value = readBookAnalytics(bookId.value)
  today.value = new Date()
  try {
    if (!initialized.value) await fetchAllData()
    await loadAnnotations(bookId.value)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.analytics-page { min-height: 100%; background: var(--color-background-page, #fff); color: var(--color-text-primary, #24232a); }
.analytics-shell { width: min(100%, 780px); margin: 0 auto; padding: 24px 22px calc(var(--mobile-bottom-nav-height, 72px) + 38px); }
.desktop-back { display: inline-flex; align-items: center; gap: 9px; margin: 0 0 28px; color: var(--color-text-secondary, #334155); font-size: .85rem; text-decoration: none; }
.desktop-back:hover { text-decoration: underline; }
.heading { margin: 9px 0 28px; }
.eyebrow, .card-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: var(--color-text-muted, #7a7882); font-size: .68rem; font-weight: 700; letter-spacing: .11em; }
.eyebrow { justify-content: flex-start; letter-spacing: .14em; }
.eyebrow i { font-size: 1rem; color: #6f6a78; }
h1 { margin: 10px 0 6px; font-size: clamp(1.85rem, 5vw, 2.45rem); letter-spacing: -.045em; line-height: 1.12; }
.subtitle { margin: 0; color: var(--color-text-muted, #7a7882); font-size: .9rem; line-height: 1.5; }
.hero-card, .wide-card, .metric-card { background: var(--color-surface-card, #fff); border: 1px solid var(--color-border-card, #eae8eb); border-radius: 18px; padding: 22px; }
.hero-card { margin-bottom: 12px; }
.card-heading i { font-size: 1.15rem; color: #8a8790; font-weight: 400; letter-spacing: 0; }
.split-numbers { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 27px 0 18px; }
.split-numbers div, .speed-grid div { display: flex; flex-direction: column; gap: 4px; }
.split-numbers strong { font-size: clamp(2.2rem, 8vw, 3.3rem); letter-spacing: -.07em; line-height: 1; }
.split-numbers span, .speed-grid span { color: var(--color-text-muted, #7a7882); font-size: .85rem; }
.split-track { height: 8px; border-radius: 20px; background: #e8e6e9; overflow: hidden; }
.split-track div { height: 100%; background: #45414b; border-radius: inherit; }
.muted, .footnote { color: var(--color-text-muted, #7a7882); font-size: .76rem; line-height: 1.5; }
.muted { margin: 13px 0 0; }
.metrics-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 12px; }
.metric-card { min-height: 154px; }
.chapter-title { display: block; margin-top: 28px; font-size: 1.15rem; line-height: 1.25; letter-spacing: -.025em; overflow-wrap: anywhere; }
.metric-detail { margin: 7px 0 0; color: var(--color-text-muted, #7a7882); font-size: .8rem; }
.empty-metric { margin: 29px 0 0; color: var(--color-text-muted, #7a7882); font-size: .87rem; line-height: 1.45; }
.wide-card { margin-bottom: 12px; }
.speed-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 26px; }
.speed-grid strong { font-size: 1.5rem; letter-spacing: -.04em; }
.big-value { display: block; margin-top: 22px; font-size: 2.25rem; line-height: 1; letter-spacing: -.055em; }
.last-grid { margin-bottom: 0; }
.footnote { margin: 18px 2px 0; }
.empty-book { padding: 28px; border: 1px solid var(--color-border-card, #eae8eb); border-radius: 16px; color: var(--color-text-muted, #7a7882); }
@media (max-width: 430px) { .analytics-shell { padding-inline: 16px; } .metric-card, .hero-card, .wide-card { padding: 18px; } .metrics-grid { gap: 9px; } }
@media (max-width: 1024px) and (orientation: portrait), (max-width: 768px) { .desktop-back { display: none; } }
</style>
