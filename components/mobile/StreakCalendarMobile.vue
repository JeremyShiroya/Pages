<template>
  <div class="streak-page">
    <MobileSettingsNav title="Reading Streak" back-to="/" aria-label="Streak navigation" />

    <main class="streak-body">
      <!-- Hero: the number is the page. The icon follows Streak settings. -->
      <section class="hero" aria-label="Current streak">
        <span class="hero-icon" aria-hidden="true"><i :class="streakIconClass"></i></span>
        <p class="hero-count">{{ current }}</p>
        <p class="hero-label">Day Streak</p>
        <p class="hero-sub">
          <template v-if="milestone.isPersonalBest && current > 1">Your longest streak yet</template>
          <template v-else>Best: {{ streakStats.longest }} {{ streakStats.longest === 1 ? 'day' : 'days' }}</template>
        </p>
      </section>

      <!-- Next milestone -->
      <section>
        <h2 class="group-title">Next Milestone</h2>
        <div class="group">
          <div class="milestone-row">
            <span class="medal small" :class="`tier-${tierOf(milestone.next.days)}`"><i :class="milestone.next.icon" aria-hidden="true"></i></span>
            <div class="milestone-copy">
              <span class="row-label">{{ milestone.next.name }}</span>
              <span class="row-sub">{{ milestone.remaining }} more {{ milestone.remaining === 1 ? 'day' : 'days' }}<template v-if="milestone.next.shield"> · earns a shield</template></span>
            </div>
            <span class="row-value">{{ current }}/{{ milestone.next.days }}</span>
          </div>
          <div class="progress" role="progressbar" :aria-valuenow="milestone.percent" aria-valuemin="0" aria-valuemax="100" :aria-label="`${milestone.percent}% of the way to ${milestone.next.name}`">
            <span :style="{ width: `${Math.max(3, milestone.percent)}%` }"></span>
          </div>
        </div>
        <p class="footnote">Read a little every day to keep your streak going. Today counts, so come back tomorrow to make it {{ current + 1 }}.</p>
      </section>

      <!-- Calendar: days you read are filled circles. -->
      <section>
        <h2 class="group-title">Activity</h2>
        <div class="group calendar">
          <header class="calendar-header">
            <h3>{{ monthTitle }}</h3>
            <div class="calendar-nav">
              <button type="button" aria-label="Previous month" @click="changeMonth(-1)"><i class="ri-arrow-left-s-line"></i></button>
              <button type="button" aria-label="Next month" :disabled="isCurrentMonth" @click="changeMonth(1)"><i class="ri-arrow-right-s-line"></i></button>
            </div>
          </header>
          <div class="weekday-row" aria-hidden="true">
            <span v-for="(day, index) in weekdays" :key="index">{{ day }}</span>
          </div>
          <div class="calendar-grid">
            <span
              v-for="cell in calendarCells"
              :key="cell.key"
              class="calendar-day"
              :class="{ active: cell.active, shielded: cell.shielded, today: cell.today, muted: !cell.inMonth }"
              :title="cell.shielded ? `${cell.label}: covered by a shield` : cell.active ? `${cell.label}: streak active` : cell.label"
            >
              <span class="day-dot">
                <i v-if="cell.shielded" class="ri-shield-star-fill" aria-hidden="true"></i>
                <template v-else>{{ cell.day }}</template>
              </span>
            </span>
          </div>
        </div>
      </section>

      <!-- Statistics as a plain list: label left, value right. -->
      <section>
        <h2 class="group-title">Statistics</h2>
        <div class="group list">
          <div class="list-row"><span>Longest Streak</span><span class="row-value">{{ streakStats.longest }} {{ streakStats.longest === 1 ? 'day' : 'days' }}</span></div>
          <div class="list-row"><span>Active Days</span><span class="row-value">{{ streakStats.totalActiveDays }}</span></div>
          <div class="list-row"><span>This Month</span><span class="row-value">{{ streakStats.thisMonthConsistency }}%</span></div>
          <div class="list-row"><span>Streak Breaks</span><span class="row-value">{{ streakStats.totalBreaks }}</span></div>
          <div v-if="streakStats.longestMonth" class="list-row"><span>Best Month</span><span class="row-value">{{ streakStats.longestMonth }}</span></div>
        </div>
        <p class="footnote">{{ breakInsight }}</p>
      </section>

      <!-- Awards -->
      <section>
        <h2 class="group-title">Awards · {{ milestone.unlockedCount }} of {{ milestone.badges.length }}</h2>
        <div class="group awards">
          <button
            v-for="badge in milestone.badges"
            :key="badge.days"
            type="button"
            class="badge"
            :class="{ locked: !badge.unlocked }"
            :aria-label="badge.unlocked ? `${badge.name} unlocked` : `${badge.name}: reach a ${badge.days}-day streak`"
            @click="describeBadge(badge)"
          >
            <span class="medal" :class="`tier-${tierOf(badge.days)}`">
              <i :class="badge.unlocked ? badge.icon : 'ri-lock-2-fill'" aria-hidden="true"></i>
            </span>
            <span class="badge-name">{{ badge.name }}</span>
            <span class="badge-days">{{ badge.days }} days</span>
          </button>
        </div>
      </section>

      <!-- Shields -->
      <section>
        <div class="group list">
          <div class="list-row">
            <span class="shield-label"><i class="ri-shield-star-fill" aria-hidden="true"></i>Streak Shields</span>
            <span class="row-value">{{ shields }} of {{ maxShields }}</span>
          </div>
        </div>
        <p class="footnote">
          A shield covers one missed day automatically. You earn one at 7, 30, 100 and 365 days.
          <template v-if="lastShieldUsed"> A shield saved your streak on {{ formatDay(lastShieldUsed) }}.</template>
        </p>
      </section>

      <!-- Previous streaks -->
      <section v-if="streakStats.previousRuns.length">
        <h2 class="group-title">Previous Streaks</h2>
        <div class="group list">
          <div v-for="run in streakStats.previousRuns.slice(0, 8)" :key="`${run.start}-${run.end}`" class="list-row">
            <span>{{ formatRange(run) }}</span>
            <span class="row-value">{{ run.days }} {{ run.days === 1 ? 'day' : 'days' }}</span>
          </div>
        </div>
      </section>

      <section v-if="showStreakSharing">
        <div class="group list">
          <button type="button" class="list-row action" :disabled="actionState !== ''" @click="shareStreak">
            <span>{{ actionState === 'sharing' ? 'Preparing…' : 'Share Streak' }}</span>
            <i :class="actionState === 'sharing' ? 'ri-loader-4-line spinning' : 'ri-share-line'" aria-hidden="true"></i>
          </button>
          <button type="button" class="list-row action" :disabled="actionState !== ''" @click="downloadStreak">
            <span>{{ actionState === 'saving' ? 'Saving…' : 'Save Image' }}</span>
            <i :class="actionState === 'saving' ? 'ri-loader-4-line spinning' : 'ri-download-2-line'" aria-hidden="true"></i>
          </button>
        </div>
      </section>
    </main>

    <!-- Milestone celebration: shown once per milestone per streak. -->
    <Teleport to="body">
      <Transition name="celebrate">
        <div v-if="celebration" class="celebration-layer" role="dialog" aria-modal="true" aria-labelledby="celebration-title">
          <div class="confetti" aria-hidden="true">
            <span v-for="piece in confetti" :key="piece.id" :style="piece.style"></span>
          </div>
          <section class="celebration-card">
            <span class="medal large" :class="`tier-${tierOf(celebration.days)}`"><i :class="celebration.icon" aria-hidden="true"></i></span>
            <p class="celebration-eyebrow">Milestone Unlocked</p>
            <h2 id="celebration-title">{{ celebration.name }}</h2>
            <p class="celebration-copy">{{ celebration.days }} days in a row. That is a real reading habit.</p>
            <p class="celebration-reward">
              <i :class="celebration.shield ? 'ri-shield-star-fill' : 'ri-award-fill'" aria-hidden="true"></i>
              {{ celebration.shield ? 'You earned a streak shield' : 'New award added' }}
            </p>
            <button type="button" class="claim-btn" @click="claimCelebration">Done</button>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { localDateKey, MAX_STREAK_SHIELDS, milestoneProgress, useStreak } from '~/composables/useStreak'
import { useToast } from '~/composables/useToast'
import { useUserProfile } from '~/composables/useUserProfile'
import { isNativeCapacitorPlatform } from '~/composables/useNativePlatform'
import MobileSettingsNav from './MobileSettingsNav.vue'
import { usePagesSettings } from '~/composables/usePagesSettings'

const { activeDates, streakStats, shieldedDates, shields, lastShieldUsed, pendingCelebration, markCelebrated } = useStreak()
const { profile } = useUserProfile()
const { addToast } = useToast()
const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const { settings } = usePagesSettings()
// The hero uses the same icon as the streak pill (Streak settings).
const streakIconClass = computed(() => (settings.value.streakIcon === 'lightning' ? 'ri-flashlight-fill' : 'ri-fire-fill'))
const today = new Date()
const shownMonth = ref(new Date(today.getFullYear(), today.getMonth(), 1))
const actionState = ref('')
const showStreakSharing = false
const maxShields = MAX_STREAK_SHIELDS
const activeSet = computed(() => new Set(activeDates.value))
const shieldSet = computed(() => new Set(shieldedDates.value))

const current = computed(() => Math.max(0, streakStats.value.current))
const milestone = computed(() => milestoneProgress(current.value, Math.max(streakStats.value.longest, current.value)))
const tierOf = (days) => (days >= 100 ? 'gold' : days >= 30 ? 'ember' : days >= 7 ? 'amber' : 'spark')

const celebration = computed(() => pendingCelebration.value)
const claimCelebration = () => {
  if (celebration.value) markCelebrated(celebration.value.days)
}
const confetti = Array.from({ length: 26 }, (_, id) => {
  const colors = ['#ff7a2f', '#ffc44d', '#8a2be2', '#ff4f6d', '#5fd0a5', '#ffe08a']
  return {
    id,
    style: {
      '--x': `${(id * 37) % 100}%`,
      '--delay': `${(id % 9) * 0.11}s`,
      '--spin': `${(id % 2 ? 1 : -1) * (180 + (id * 29) % 360)}deg`,
      '--drift': `${((id * 13) % 60) - 30}px`,
      background: colors[id % colors.length],
    },
  }
})

const describeBadge = (badge) => {
  if (badge.unlocked) addToast(`${badge.name} — unlocked with a ${badge.days}-day streak.`, 'success')
  else addToast(`${badge.name} unlocks at a ${badge.days}-day streak.`, 'info')
}
const formatDay = (key) => new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

const monthTitle = computed(() => shownMonth.value.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }))
const isCurrentMonth = computed(() => shownMonth.value.getFullYear() === today.getFullYear() && shownMonth.value.getMonth() === today.getMonth())
const calendarCells = computed(() => {
  const year = shownMonth.value.getFullYear()
  const month = shownMonth.value.getMonth()
  const first = new Date(year, month, 1)
  const start = new Date(year, month, 1 - first.getDay())
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const key = localDateKey(date)
    const shielded = shieldSet.value.has(key)
    return {
      key,
      day: date.getDate(),
      inMonth: date.getMonth() === month,
      active: activeSet.value.has(key) || shielded,
      shielded,
      today: key === localDateKey(today),
      label: date.toLocaleDateString(undefined, { dateStyle: 'long' }),
    }
  })
  return cells.map((cell, index) => ({
    ...cell,
    activeStart: cell.active && (index % 7 === 0 || !cells[index - 1]?.active),
    activeEnd: cell.active && (index % 7 === 6 || !cells[index + 1]?.active),
  }))
})

const breakInsight = computed(() => streakStats.value.totalBreaks
  ? `${streakStats.value.highestBreakMonth} had the most breaks (${streakStats.value.highestMonthBreaks}). Every return still counts.`
  : 'No streak breaks recorded yet. Your rhythm is intact.')

const changeMonth = (delta) => {
  if (delta > 0 && isCurrentMonth.value) return
  shownMonth.value = new Date(shownMonth.value.getFullYear(), shownMonth.value.getMonth() + delta, 1)
}
const formatRange = (run) => {
  const start = new Date(`${run.start}T12:00:00`)
  const end = new Date(`${run.end}T12:00:00`)
  const startText = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const endText = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  return run.start === run.end ? endText : `${startText} – ${endText}`
}

const loadCanvasImage = (src) => new Promise((resolve, reject) => {
  const image = new Image()
  image.onload = () => resolve(image)
  image.onerror = () => reject(new Error('Could not load the streak artwork.'))
  image.src = src
})

const createStreakImage = async () => {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1350
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Image creation is unavailable.')
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1350)
  gradient.addColorStop(0, '#5f2a87')
  gradient.addColorStop(1, '#17101f')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1080, 1350)
  ctx.fillStyle = 'rgba(255,255,255,.08)'
  ctx.beginPath(); ctx.arc(900, 170, 330, 0, Math.PI * 2); ctx.fill()
  const flame = await loadCanvasImage('/images/Flame.png')
  ctx.drawImage(flame, 790, 70, 190, 190)
  ctx.fillStyle = '#ffffff'
  ctx.font = '600 58px sans-serif'
  ctx.fillText('PAGES READING STREAK', 80, 120)
  ctx.fillStyle = '#d9b7ff'
  ctx.font = '500 34px sans-serif'
  ctx.fillText(profile.value.displayName || 'A Pages reader', 82, 180)
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 270px sans-serif'
  ctx.fillText(String(streakStats.value.current), 75, 500)
  ctx.font = '600 54px sans-serif'
  ctx.fillText('DAY CURRENT STREAK', 85, 580)
  const cards = [
    ['LONGEST', `${streakStats.value.longest} days`],
    ['ACTIVE DAYS', String(streakStats.value.totalActiveDays)],
    ['THIS MONTH', `${streakStats.value.thisMonthConsistency}%`],
    ['STREAK BREAKS', String(streakStats.value.totalBreaks)],
  ]
  cards.forEach(([label, value], index) => {
    const x = 80 + (index % 2) * 470
    const y = 690 + Math.floor(index / 2) * 210
    ctx.fillStyle = 'rgba(255,255,255,.1)'
    ctx.fillRect(x, y, 430, 165)
    ctx.fillStyle = '#d9b7ff'; ctx.font = '500 25px sans-serif'; ctx.fillText(label, x + 30, y + 48)
    ctx.fillStyle = '#ffffff'; ctx.font = '700 52px sans-serif'; ctx.fillText(value, x + 30, y + 118)
  })
  ctx.fillStyle = '#ffffff'; ctx.font = '500 34px sans-serif'
  ctx.fillText(`Best month: ${streakStats.value.longestMonth}`, 82, 1160)
  ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.font = '400 27px sans-serif'
  ctx.fillText('One page at a time.', 82, 1240)
  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not create image.')), 'image/png', 0.95)
  })
}

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
  reader.onerror = () => reject(new Error('Could not prepare the streak image.'))
  reader.readAsDataURL(blob)
})

const nativeMediaPlugin = async () => {
  if (!isNativeCapacitorPlatform()) return null
  const { Capacitor } = await import('@capacitor/core')
  return Capacitor.Plugins?.ApkInstaller || null
}

const downloadBlob = (blob) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `pages-streak-${localDateKey()}.png`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
const downloadStreak = async () => {
  if (actionState.value) return
  actionState.value = 'saving'
  try {
    const blob = await createStreakImage()
    const fileName = `pages-streak-${localDateKey()}.png`
    const nativeMedia = await nativeMediaPlugin()
    if (nativeMedia?.saveImage) {
      await nativeMedia.saveImage({ data: await blobToBase64(blob), fileName })
    } else {
      downloadBlob(blob)
    }
    addToast('Streak image saved to your gallery.', 'success')
  } catch (error) {
    addToast(error?.message || 'Could not save streak image.', 'error')
  } finally {
    actionState.value = ''
  }
}
const shareStreak = async () => {
  if (actionState.value) return
  actionState.value = 'sharing'
  try {
    const blob = await createStreakImage()
    const fileName = `pages-streak-${localDateKey()}.png`
    const nativeMedia = await nativeMediaPlugin()
    if (nativeMedia?.shareImage) {
      await nativeMedia.shareImage({
        data: await blobToBase64(blob),
        fileName,
        title: 'Share reading streak',
        subject: 'My Pages reading streak',
        text: `I am on a ${streakStats.value.current}-day reading streak in Pages.`,
      })
      addToast('Share sheet opened.', 'success')
      return
    }
    const file = new File([blob], fileName, { type: 'image/png' })
    const data = { title: 'My Pages reading streak', text: `I am on a ${streakStats.value.current}-day reading streak in Pages.`, files: [file] }
    if (navigator.share && (!navigator.canShare || navigator.canShare(data))) await navigator.share(data)
    else { downloadBlob(blob); addToast('Streak image saved.', 'success') }
  } catch (error) {
    if (error?.name !== 'AbortError') addToast(error?.message || 'Could not share streak.', 'error')
  } finally {
    actionState.value = ''
  }
}
</script>

<style scoped>
/* Grouped-list layout matching the settings pages: no borders or gradients,
   and one accent (system orange) for everything streak-related. */
.streak-page {
  --streak-accent: #ff9500;
  min-height: 100vh;
  background: var(--color-settings-background);
  color: var(--color-text-primary);
  font-family: var(--mobile-font-family);
}
:global(html[data-theme="dark"] .streak-page) { --streak-accent: #ff9f0a; }

.streak-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--settings-section-gap);
  max-width: 640px;
  margin: 0 auto;
  padding: 8px var(--settings-gutter) 48px;
}

/* ── Hero ── */
.hero { display: grid; justify-items: center; padding: 12px 0 0; text-align: center; }
.hero-icon {
  display: grid;
  width: 64px;
  height: 64px;
  place-items: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--streak-accent) 16%, transparent);
  color: var(--streak-accent);
  font-size: 32px;
}
/* main.css pins p/span to weight 400 with !important; the numbers need weight. */
.hero-count {
  margin: 10px 0 0;
  font-size: 72px;
  font-weight: 700 !important;
  line-height: 1;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
}
.hero-label { margin: 4px 0 0; font-size: 20px; font-weight: 600 !important; }
.hero-sub { margin: 4px 0 0; color: var(--color-text-muted); font-size: 15px; }

/* ── Groups ── */
.group-title {
  margin: 0 0 var(--settings-header-gap) var(--settings-row-inset);
  color: var(--color-text-muted);
  font-size: var(--settings-header-size);
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.group { border-radius: var(--settings-radius); background: var(--color-settings-group); }
.footnote { margin: 10px var(--settings-row-inset) 0; color: var(--color-text-muted); font-size: 14px; line-height: 1.4; }

.list { padding: 0 0 0 var(--settings-row-inset); }
.list-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 52px;
  padding: 12px var(--settings-row-inset) 12px 0;
  border: 0;
  background: transparent;
  color: var(--color-text-primary);
  font: inherit;
  font-size: var(--settings-label-size);
  text-align: left;
}
.list-row + .list-row { border-top: 1px solid var(--color-border-subtle); }
.list-row.action i { color: var(--streak-accent); font-size: 20px; }
.list-row.action:disabled { opacity: 0.6; }
.row-value { flex: none; color: var(--color-text-muted); font-size: var(--settings-label-size); font-variant-numeric: tabular-nums; }
.shield-label { display: inline-flex; align-items: center; gap: 10px; }
.shield-label i { color: #e0a800; font-size: 20px; }

/* ── Milestone ── */
.milestone-row { display: flex; align-items: center; gap: 12px; padding: 16px var(--settings-row-inset) 12px; }
.milestone-copy { display: grid; flex: 1; gap: 2px; min-width: 0; }
.row-label { font-size: var(--settings-label-size); }
.row-sub { color: var(--color-text-muted); font-size: 14px; }
.progress { height: 6px; margin: 0 var(--settings-row-inset) 18px; overflow: hidden; border-radius: 999px; background: color-mix(in srgb, var(--color-text-muted) 20%, transparent); }
.progress span { display: block; height: 100%; border-radius: inherit; background: var(--streak-accent); transition: width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1); }

/* ── Calendar ── */
.calendar { padding: 14px 12px 16px; }
.calendar-header { display: flex; align-items: center; justify-content: space-between; padding: 0 6px 12px; }
.calendar-header h3 { margin: 0; font-size: var(--settings-label-size); font-weight: 600 !important; }
.calendar-nav { display: flex; gap: 4px; }
.calendar-nav button { display: grid; width: 34px; height: 34px; place-items: center; padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--streak-accent); font-size: 24px; cursor: pointer; }
.calendar-nav button:disabled { color: var(--color-text-muted); opacity: 0.4; cursor: default; }
.weekday-row, .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); }
.weekday-row { margin-bottom: 4px; color: var(--color-text-muted); font-size: 12px; text-align: center; }
.calendar-grid { row-gap: 4px; }
.calendar-day { display: grid; place-items: center; aspect-ratio: 1; }
.day-dot { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 50%; color: var(--color-text-primary); font-size: 15px; font-variant-numeric: tabular-nums; }
.calendar-day.muted .day-dot { color: var(--color-text-muted); opacity: 0.35; }
.calendar-day.active .day-dot { background: var(--streak-accent); color: #fff; }
.calendar-day.shielded .day-dot { background: color-mix(in srgb, #e0a800 22%, transparent); color: #c79400; font-size: 16px; }
.calendar-day.today:not(.active) .day-dot { box-shadow: inset 0 0 0 2px var(--streak-accent); color: var(--streak-accent); }

/* ── Awards ── */
.awards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px 4px; padding: 18px 10px; }
.badge { display: grid; justify-items: center; gap: 3px; padding: 0; border: 0; background: none; color: inherit; font: inherit; cursor: pointer; }
.badge-name { font-size: 12px; line-height: 1.2; text-align: center; }
.badge-days { color: var(--color-text-muted); font-size: 11px; }
.badge.locked .medal { background: color-mix(in srgb, var(--color-text-muted) 18%, transparent); color: var(--color-text-muted); }
.badge.locked .badge-name { color: var(--color-text-muted); }
.medal { display: grid; width: 50px; height: 50px; place-items: center; border-radius: 50%; color: #fff; font-size: 22px; }
.medal.small { flex: none; width: 40px; height: 40px; font-size: 19px; }
.medal.large { width: 88px; height: 88px; font-size: 40px; }
.medal.tier-spark { background: #ff9f0a; }
.medal.tier-amber { background: #ff9500; }
.medal.tier-ember { background: #ff6b35; }
.medal.tier-gold { background: #e0a800; }

/* ── Celebration ── */
.celebration-layer { position: fixed; inset: 0; z-index: 4000; display: grid; place-items: center; padding: 24px; background: rgba(0, 0, 0, 0.45); }
.celebration-card { position: relative; z-index: 1; display: grid; justify-items: center; width: min(100%, 320px); padding: 28px 20px 18px; border-radius: 22px; background: var(--color-settings-group); color: var(--color-text-primary); text-align: center; animation: pop 0.45s cubic-bezier(0.2, 1.3, 0.4, 1) both; }
.celebration-card .medal { margin-bottom: 14px; }
.celebration-eyebrow { margin: 0; color: var(--color-text-muted); font-size: 13px; letter-spacing: 0.02em; text-transform: uppercase; }
.celebration-card h2 { margin: 4px 0 6px; font-size: 24px; font-weight: 600 !important; }
.celebration-copy { margin: 0 0 12px; color: var(--color-text-muted); font-size: 15px; }
.celebration-reward { display: inline-flex; align-items: center; gap: 6px; margin: 0 0 18px; color: var(--streak-accent); font-size: 15px; }
.claim-btn { width: 100%; min-height: 50px; border: 0; border-radius: 14px; background: var(--streak-accent); color: #fff; font: inherit; font-size: 17px; cursor: pointer; }
.confetti { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.confetti span { position: absolute; top: -20px; left: var(--x); width: 8px; height: 14px; border-radius: 2px; opacity: 0; animation: fall 2.8s var(--delay) cubic-bezier(0.3, 0.6, 0.6, 1) forwards; }
.celebrate-enter-active, .celebrate-leave-active { transition: opacity 0.25s ease; }
.celebrate-enter-from, .celebrate-leave-to { opacity: 0; }
.spinning { animation: spin 0.8s linear infinite; }

@keyframes pop { from { opacity: 0; transform: translateY(20px) scale(0.94); } to { opacity: 1; transform: none; } }
@keyframes fall { 0% { opacity: 1; transform: translate(0, 0) rotate(0); } 100% { opacity: 0; transform: translate(var(--drift), 105vh) rotate(var(--spin)); } }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .confetti span, .celebration-card { animation: none; } }
</style>
