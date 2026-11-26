<template>
  <div class="analytics-page">
    <MobileSettingsNav title="Analytics" :back-to="`/book/${bookId}`" aria-label="Book analytics navigation" />
    <main class="analytics-shell">
      <NuxtLink class="desktop-back" :to="`/book/${bookId}`"><i class="ri-arrow-left-line"></i> Book details</NuxtLink>

      <div v-if="!book && !loading" class="empty-book">Book not found.</div>
      <template v-else-if="book">
        <!-- Masthead: the book itself, not a generic "insights" banner. -->
        <header class="masthead">
          <img class="mast-cover" :src="book.cover || ''" :alt="book.title" @error="(event) => { event.target.style.visibility = 'hidden' }" />
          <div class="mast-copy">
            <p class="kicker">Your time with</p>
            <h1>{{ book.title }}</h1>
            <p v-if="book.author" class="byline">{{ book.author }}</p>
            <div class="status-line">
              <span class="status-dot" :class="{ done: completed }"></span>
              {{ completed ? `Finished${completedLabel ? ` ${completedLabel}` : ''}` : `${progress}% through` }}
            </div>
          </div>
        </header>

        <!-- Headline number + the read/listen split. -->
        <section class="ledger-hero" aria-label="Total time">
          <template v-if="trackedSeconds">
            <p class="hero-number">{{ heroTime.value }}<span>{{ heroTime.unit }}</span></p>
            <p class="hero-caption">spent with this book across {{ activeDays }} {{ activeDays === 1 ? 'day' : 'days' }}</p>
            <div class="split" role="img" :aria-label="`${readPercent}% read, ${100 - readPercent}% listened`">
              <span v-if="readSeconds" class="split-read" :style="{ flexGrow: readSeconds }"></span>
              <span v-if="listenedSeconds" class="split-listen" :style="{ flexGrow: listenedSeconds }"></span>
            </div>
            <div class="split-legend">
              <span><i class="swatch read"></i><i class="ri-book-open-line" aria-hidden="true"></i> Read <strong>{{ formatTime(readSeconds) }}</strong> · {{ readPercent }}%</span>
              <span><i class="swatch listen"></i><i class="ri-headphone-line" aria-hidden="true"></i> Listened <strong>{{ formatTime(listenedSeconds) }}</strong> · {{ 100 - readPercent }}%</span>
            </div>
          </template>
          <p v-else class="empty-metric">Time tracking begins the next time you read or listen to this book.</p>
        </section>

        <!-- Last 14 days, read and listened stacked. -->
        <section v-if="trackedSeconds" class="panel" aria-labelledby="rhythm-title">
          <header class="panel-head">
            <h2 id="rhythm-title">Last two weeks</h2>
            <span>{{ recentActiveDays }} of 14 days</span>
          </header>
          <div class="chart" role="img" :aria-label="chartSummary">
            <button
              v-for="(day, index) in recentDays"
              :key="day.key"
              type="button"
              class="chart-col"
              :class="{ selected: selectedDay === index, today: day.isToday }"
              :aria-label="`${day.label}: ${formatTime(day.read)} read, ${formatTime(day.listened)} listened`"
              @click="selectedDay = selectedDay === index ? null : index"
            >
              <span class="bar-stack" :style="{ height: `${day.height}%` }">
                <span v-if="day.listened" class="bar-listen" :style="{ flexGrow: day.listened }"></span>
                <span v-if="day.read" class="bar-read" :style="{ flexGrow: day.read }"></span>
              </span>
              <span class="chart-tick">{{ day.tick }}</span>
            </button>
          </div>
          <p class="chart-readout">
            <template v-if="selectedDay !== null">
              <strong>{{ recentDays[selectedDay].label }}</strong> — {{ formatTime(recentDays[selectedDay].read) }} read, {{ formatTime(recentDays[selectedDay].listened) }} listened
            </template>
            <template v-else>Tap a day for its details. Busiest: <strong>{{ busiestDay }}</strong></template>
          </p>
        </section>

        <!-- The numbers, as a ledger. -->
        <section class="panel ledger" aria-label="Reading numbers">
          <div class="ledger-row">
            <span class="ledger-icon"><i class="ri-speed-up-line"></i></span>
            <span class="ledger-label">Time per page<small>{{ pageSampleNote }}</small></span>
            <strong>{{ pageSpeed }}</strong>
          </div>
          <div class="ledger-row">
            <span class="ledger-icon"><i class="ri-book-2-line"></i></span>
            <span class="ledger-label">Time per chapter<small>{{ shownChapterCount ? `${shownChapterCount} chapter${shownChapterCount === 1 ? '' : 's'} finished in order` : 'Finish a chapter to measure' }}</small></span>
            <strong>{{ chapterSpeed }}</strong>
          </div>
          <div class="ledger-row">
            <span class="ledger-icon"><i class="ri-timer-line"></i></span>
            <span class="ledger-label">Average session<small>{{ sessions ? `${sessions} session${sessions === 1 ? '' : 's'}` : 'Counted from now on' }}</small></span>
            <strong>{{ averageSession }}</strong>
          </div>
          <div class="ledger-row">
            <span class="ledger-icon"><i class="ri-calendar-2-line"></i></span>
            <span class="ledger-label">{{ completed ? 'Days to finish' : 'Days since you started' }}<small>{{ startedLabel ? `Started ${startedLabel}` : 'No start date yet' }}</small></span>
            <strong>{{ daysTaken ?? '—' }}</strong>
          </div>
          <div class="ledger-row">
            <span class="ledger-icon"><i class="ri-fire-line"></i></span>
            <span class="ledger-label">Book streak<small>{{ bestBookStreak > streak ? `Best run: ${bestBookStreak} days` : 'Days in a row with this book' }}</small></span>
            <strong>{{ streak }}</strong>
          </div>
        </section>

        <!-- Where the reader engaged most. -->
        <section class="panel" aria-labelledby="marks-title">
          <header class="panel-head">
            <h2 id="marks-title">Your marks</h2>
            <span>{{ highlightCount }} highlight{{ highlightCount === 1 ? '' : 's' }} · {{ noteCount }} note{{ noteCount === 1 ? '' : 's' }}</span>
          </header>
          <div v-if="topHighlight || topNote" class="marks">
            <div v-if="topHighlight" class="mark-block">
              <p class="mark-kicker"><i class="ri-mark-pen-line"></i> Most highlighted</p>
              <strong>{{ topHighlight.title }}</strong>
              <span>{{ topHighlight.count }} highlight{{ topHighlight.count === 1 ? '' : 's' }}</span>
              <blockquote v-if="topHighlight.quote">“{{ topHighlight.quote }}”</blockquote>
            </div>
            <div v-if="topNote" class="mark-block">
              <p class="mark-kicker"><i class="ri-sticky-note-line"></i> Most notes</p>
              <strong>{{ topNote.title }}</strong>
              <span>{{ topNote.count }} note{{ topNote.count === 1 ? '' : 's' }}</span>
            </div>
          </div>
          <p v-else class="empty-metric">Highlights and notes you make while reading will show up here.</p>
        </section>

        <p class="footnote">Activity from before analytics existed is unavailable. Reading time counts while the reader is open; listening time counts while narration plays. Page time leaves out pages left open for more than ten minutes.</p>
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
import { bookStreak, calendarDaysBetween, localDay, longestBookStreak, readBookAnalytics } from '~/composables/useBookAnalytics'

const route = useRoute()
const bookId = computed(() => String(route.params.id || ''))
const { books, initialized, fetchAllData } = useBooks()
const { annotations } = useAnnotations()
const book = computed(() => books.value.find(item => String(item.id) === bookId.value))
const loading = ref(true)
const activity = ref(null)
const today = ref(new Date())
const selectedDay = ref(null)

const dayRows = computed(() => activity.value?.days || {})
const readSeconds = computed(() => Object.values(dayRows.value).reduce((sum, day) => sum + (Number(day.read) || 0), 0))
const listenedSeconds = computed(() => Object.values(dayRows.value).reduce((sum, day) => sum + (Number(day.listened) || 0), 0))
const trackedSeconds = computed(() => readSeconds.value + listenedSeconds.value)
const readPercent = computed(() => trackedSeconds.value ? Math.round(readSeconds.value / trackedSeconds.value * 100) : 0)
const activeDays = computed(() => Object.values(dayRows.value).filter(day => (Number(day.read) || 0) + (Number(day.listened) || 0) > 0).length)
const progress = computed(() => Math.max(0, Math.min(100, Math.round(Number(book.value?.progress) || 0))))
const completed = computed(() => Boolean(activity.value?.completedAt || book.value?.status === 'Read'))
// A book marked Read with no recorded finish date ends at its last activity —
// counting up to TODAY made "days to finish" grow forever after finishing.
const finishedAt = computed(() => activity.value?.completedAt || (completed.value ? activity.value?.lastAt : null))
const daysTaken = computed(() => calendarDaysBetween(activity.value?.firstAt, finishedAt.value || today.value))
const streak = computed(() => bookStreak(dayRows.value, today.value))
const bestBookStreak = computed(() => longestBookStreak(dayRows.value))
const sessions = computed(() => Number(activity.value?.sessions) || 0)
const chapterCount = computed(() => Number(activity.value?.chaptersAdvanced) || 0)
// The count shown under "Time per chapter": timed chapters, or a legacy count
// only when its estimate is believable.
const shownChapterCount = computed(() => {
  const timed = Number(activity.value?.timedChapters) || 0
  if (timed) return timed
  return chapterCount.value && readSeconds.value / chapterCount.value >= 60 ? chapterCount.value : 0
})

const shortDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() === today.value.getFullYear() ? undefined : 'numeric' }) : ''
}
const startedLabel = computed(() => shortDate(activity.value?.firstAt))
const completedLabel = computed(() => (finishedAt.value ? shortDate(finishedAt.value) : ''))

function formatTime(seconds) {
  const value = Number(seconds) || 0
  if (value <= 0) return '0 min'
  if (value < 60) return `${Math.round(value)} sec`
  const minutes = Math.round(value / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  return `${hours} hr${hours === 1 ? '' : 's'}${minutes % 60 ? ` ${minutes % 60} min` : ''}`
}
const heroTime = computed(() => {
  const minutes = Math.round(trackedSeconds.value / 60)
  if (minutes < 60) return { value: String(Math.max(1, minutes)), unit: minutes === 1 ? ' min' : ' mins' }
  const hours = minutes / 60
  return { value: hours >= 10 ? String(Math.round(hours)) : hours.toFixed(1).replace(/\.0$/, ''), unit: ' hrs' }
})

// Per-page speed comes from the time actually measured between page turns.
// Older records only have the page count, so they fall back to read time over
// pages — the old estimate, marked as such.
const pageSpeed = computed(() => {
  const timed = Number(activity.value?.timedPages) || 0
  const seconds = Number(activity.value?.pageSeconds) || 0
  if (timed >= 3 && seconds > 0) return formatTime(seconds / timed)
  const pages = Number(activity.value?.pagesAdvanced) || 0
  return pages && readSeconds.value ? `~${formatTime(readSeconds.value / pages)}` : '—'
})
const pageSampleNote = computed(() => {
  const timed = Number(activity.value?.timedPages) || 0
  if (timed >= 3) return `Across ${timed} timed page turns`
  return Number(activity.value?.pagesAdvanced) ? 'Estimate — keep turning pages' : 'Turn a few pages to measure'
})
// Chapters are timed by how long the reader stayed in each one. Older records
// only have a count — shown as an estimate, and only when it is plausible.
const chapterSpeed = computed(() => {
  const timed = Number(activity.value?.timedChapters) || 0
  const seconds = Number(activity.value?.chapterSeconds) || 0
  if (timed && seconds) return formatTime(seconds / timed)
  const legacy = chapterCount.value && readSeconds.value ? readSeconds.value / chapterCount.value : 0
  return legacy >= 60 ? `~${formatTime(legacy)}` : '—'
})
const averageSession = computed(() => sessions.value ? formatTime(trackedSeconds.value / sessions.value) : '—')

const recentDays = computed(() => {
  const rows = []
  const base = new Date(today.value.getFullYear(), today.value.getMonth(), today.value.getDate())
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = new Date(base)
    date.setDate(base.getDate() - offset)
    const row = dayRows.value[localDay(date)] || {}
    rows.push({
      key: localDay(date),
      read: Number(row.read) || 0,
      listened: Number(row.listened) || 0,
      isToday: offset === 0,
      tick: date.toLocaleDateString(undefined, { weekday: 'narrow' }),
      label: date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
    })
  }
  const peak = Math.max(1, ...rows.map(row => row.read + row.listened))
  return rows.map(row => ({ ...row, height: row.read + row.listened ? Math.max(6, Math.round((row.read + row.listened) / peak * 100)) : 0 }))
})
const recentActiveDays = computed(() => recentDays.value.filter(day => day.read + day.listened > 0).length)
const busiestDay = computed(() => {
  const best = [...recentDays.value].sort((a, b) => (b.read + b.listened) - (a.read + a.listened))[0]
  return best && best.read + best.listened ? `${best.label} (${formatTime(best.read + best.listened)})` : 'none yet'
})
const chartSummary = computed(() => `Reading and listening time for the last 14 days. ${recentActiveDays.value} active days. Busiest ${busiestDay.value}.`)

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
  const groups = new Map()
  for (const item of items) {
    const index = chapterIndex(Number(item.startChunk) || 0)
    if (index < 0) continue
    const group = groups.get(index) || []
    group.push(item)
    groups.set(index, group)
  }
  const winner = [...groups].sort((a, b) => b[1].length - a[1].length || a[0] - b[0])[0]
  if (!winner) return null
  const longest = [...winner[1]].map(item => String(item.text || '').trim()).filter(Boolean)
    .sort((a, b) => b.length - a.length)[0] || ''
  const quote = longest.length > 180 ? `${longest.slice(0, 177).trimEnd()}…` : longest
  return { title: book.value?.tocTitles?.[winner[0]] || `Chapter ${winner[0] + 1}`, count: winner[1].length, quote }
}
const bookAnnotations = computed(() => annotations.value.filter(item => String(item.bookId) === bookId.value))
const highlightCount = computed(() => bookAnnotations.value.filter(item => !item.note).length)
const noteCount = computed(() => bookAnnotations.value.filter(item => item.note).length)
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
.analytics-page {
  --series-read: var(--color-brand-primary);
  --series-listen: #b07a1c;
  min-height: 100dvh;
  background: var(--color-background-app, #fff);
  color: var(--color-text-primary, #24232a);
}
:global(:root[data-theme="dark"] .analytics-page) { --series-listen: #c47d22; }
.analytics-shell { width: min(100%, 780px); margin: 0 auto; padding: 14px 20px calc(var(--mobile-bottom-nav-height, 72px) + 38px); }
.desktop-back { display: inline-flex; align-items: center; gap: 9px; margin: 0 0 24px; color: var(--color-text-secondary, #334155); font-size: .85rem; text-decoration: none; }

/* Masthead */
.masthead { display: grid; grid-template-columns: 72px 1fr; gap: 16px; align-items: center; margin-bottom: 22px; }
.mast-cover { width: 72px; aspect-ratio: 2 / 3; border-radius: 6px; object-fit: cover; background: var(--color-surface-secondary); box-shadow: 0 10px 22px rgba(15, 23, 42, .18); }
.kicker { margin: 0 0 3px; color: var(--color-text-muted); font-size: .72rem; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
.masthead h1 { margin: 0; font-family: Literata, Georgia, serif; font-size: clamp(1.35rem, 5.4vw, 1.8rem); font-weight: 600; line-height: 1.15; letter-spacing: -.01em; overflow-wrap: anywhere; }
.byline { margin: 4px 0 0; color: var(--color-text-secondary); font-size: .9rem; }
.status-line { display: inline-flex; align-items: center; gap: 7px; margin-top: 8px; color: var(--color-text-muted); font-size: .8rem; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--series-listen); }
.status-dot.done { background: #2f9e6f; }

/* Hero */
.ledger-hero { padding: 4px 2px 22px; border-bottom: 1px solid var(--color-border-subtle); margin-bottom: 18px; }
.hero-number { margin: 0; font-family: Literata, Georgia, serif; font-size: clamp(3.2rem, 15vw, 4.4rem); font-weight: 600; line-height: 1; letter-spacing: -.04em; font-variant-numeric: tabular-nums; }
.hero-number span { margin-left: 4px; color: var(--color-text-muted); font-family: var(--mobile-font-family); font-size: 1.1rem; font-weight: 500; letter-spacing: 0; }
.hero-caption { margin: 6px 0 16px; color: var(--color-text-secondary); font-size: .9rem; }
.split { display: flex; gap: 2px; height: 12px; }
.split span { flex-basis: 0; min-width: 4px; }
.split span:first-child { border-radius: 4px 0 0 4px; }
.split span:last-child { border-radius: 0 4px 4px 0; }
.split span:only-child { border-radius: 4px; }
.split-read { background: var(--series-read); }
.split-listen { background: var(--series-listen); }
.split-legend { display: grid; gap: 6px; margin-top: 12px; color: var(--color-text-secondary); font-size: .82rem; }
.split-legend span { display: flex; align-items: center; gap: 6px; }
.split-legend strong { color: var(--color-text-primary); font-weight: 600; }
.swatch { display: inline-block; width: 10px; height: 10px; border-radius: 3px; }
.swatch.read { background: var(--series-read); }
.swatch.listen { background: var(--series-listen); }

/* Panels */
.panel { margin-bottom: 14px; padding: 18px; border-radius: 20px; background: var(--color-surface-card, #fff); border: 1px solid var(--color-border-card, #eae8eb); }
.panel-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.panel-head h2 { margin: 0; font-size: 1rem; font-weight: 650; }
.panel-head span { color: var(--color-text-muted); font-size: .78rem; }

/* Chart */
.chart { display: grid; grid-template-columns: repeat(14, minmax(0, 1fr)); gap: 4px; height: 132px; align-items: end; padding-bottom: 2px; border-bottom: 1px solid var(--color-border-subtle); }
.chart-col { display: grid; grid-template-rows: 1fr auto; height: 100%; padding: 0; border: 0; background: none; cursor: pointer; }
.bar-stack { display: flex; flex-direction: column; gap: 2px; align-self: end; width: min(100%, 14px); justify-self: center; }
.bar-stack span { flex-basis: 0; min-height: 3px; }
.bar-stack span:first-child { border-radius: 4px 4px 0 0; }
.bar-read { background: var(--series-read); }
.bar-listen { background: var(--series-listen); }
.chart-col.selected .bar-stack { outline: 2px solid var(--color-text-primary); outline-offset: 2px; border-radius: 4px; }
.chart-tick { padding-top: 6px; color: var(--color-text-muted); font-size: .66rem; text-align: center; }
.chart-col.today .chart-tick { color: var(--color-text-primary); font-weight: 700; }
.chart-readout { min-height: 1.4em; margin: 10px 0 0; color: var(--color-text-secondary); font-size: .8rem; }
.chart-readout strong { color: var(--color-text-primary); }

/* Ledger */
.ledger { padding: 6px 18px; }
.ledger-row { display: grid; grid-template-columns: 34px 1fr auto; gap: 12px; align-items: center; padding: 13px 0; }
.ledger-row + .ledger-row { border-top: 1px solid var(--color-border-subtle); }
.ledger-icon { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 10px; background: var(--color-surface-secondary); color: var(--color-text-secondary); font-size: 1rem; }
.ledger-label { display: grid; gap: 2px; font-size: .92rem; }
.ledger-label small { color: var(--color-text-muted); font-size: .74rem; }
.ledger-row strong { font-size: 1.05rem; font-weight: 650; font-variant-numeric: tabular-nums; }

/* Marks */
.marks { display: grid; gap: 16px; }
.mark-block { display: grid; gap: 3px; }
.mark-block + .mark-block { padding-top: 16px; border-top: 1px solid var(--color-border-subtle); }
.mark-kicker { display: flex; align-items: center; gap: 6px; margin: 0 0 2px; color: var(--color-text-muted); font-size: .72rem; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; }
.mark-block strong { font-size: 1.05rem; overflow-wrap: anywhere; }
.mark-block > span { color: var(--color-text-muted); font-size: .8rem; }
.mark-block blockquote { margin: 10px 0 0; padding: 2px 0 2px 12px; border-left: 3px solid var(--series-read); color: var(--color-text-secondary); font-family: Literata, Georgia, serif; font-size: .95rem; font-style: italic; line-height: 1.5; }

.empty-metric { margin: 0; color: var(--color-text-muted); font-size: .87rem; line-height: 1.45; }
.footnote { margin: 18px 2px 0; color: var(--color-text-muted); font-size: .74rem; line-height: 1.5; }
.empty-book { padding: 28px; border: 1px solid var(--color-border-card, #eae8eb); border-radius: 16px; color: var(--color-text-muted, #7a7882); }
@media (max-width: 1024px) and (orientation: portrait), (max-width: 768px) { .desktop-back { display: none; } }
</style>
