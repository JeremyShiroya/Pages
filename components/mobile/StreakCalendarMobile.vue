<template>
  <div class="streak-page">
    <MobileSettingsNav title="Streak" back-to="/" aria-label="Streak navigation" />

    <main class="streak-body">
      <!-- Ember hero: the flame grows a little with each milestone reached. -->
      <section class="ember-hero" :style="{ '--flame-scale': flameScale }">
        <div class="ember-glow" aria-hidden="true"></div>
        <div class="hero-top">
          <span class="hero-kicker">Reading streak</span>
          <span class="shield-pill" :class="{ empty: !shields }" :title="`${shields} streak shield${shields === 1 ? '' : 's'}`">
            <i class="ri-shield-star-fill" aria-hidden="true"></i>{{ shields }}
          </span>
        </div>

        <div class="flame-wrap" aria-hidden="true">
          <svg class="flame" viewBox="0 0 120 150">
            <defs>
              <linearGradient id="flameOuter" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0" stop-color="#ff5a1f" />
                <stop offset=".55" stop-color="#ff8a2a" />
                <stop offset="1" stop-color="#ffc44d" />
              </linearGradient>
              <linearGradient id="flameInner" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0" stop-color="#ffd76a" />
                <stop offset="1" stop-color="#fff4c9" />
              </linearGradient>
            </defs>
            <path class="flame-outer" d="M60 4c6 22 30 34 36 62 7 33-12 78-36 78S16 120 22 88c3-17 14-24 14-40 9 8 10 18 10 18 2-24 6-44 14-62z" fill="url(#flameOuter)" />
            <path class="flame-inner" d="M61 58c4 14 20 24 20 46 0 18-9 32-21 32s-21-12-19-28c1-10 7-15 8-25 5 5 6 10 6 10 1-14 3-24 6-35z" fill="url(#flameInner)" />
          </svg>
          <strong class="hero-count">{{ current }}</strong>
        </div>

        <p class="hero-label">{{ current === 1 ? 'day in a row' : 'days in a row' }}</p>
        <div class="best-chip" :class="{ record: milestone.isPersonalBest && current > 1 }">
          <i :class="milestone.isPersonalBest && current > 1 ? 'ri-vip-crown-2-fill' : 'ri-vip-crown-2-line'" aria-hidden="true"></i>
          <span v-if="milestone.isPersonalBest && current > 1">Personal best — keep it burning</span>
          <span v-else>Personal best: {{ streakStats.longest }} {{ streakStats.longest === 1 ? 'day' : 'days' }}</span>
        </div>
      </section>

      <!-- Next milestone -->
      <section class="milestone-card" aria-labelledby="next-milestone-title">
        <div class="milestone-head">
          <span class="medal small" :class="`tier-${tierOf(milestone.next.days)}`"><i :class="milestone.next.icon" aria-hidden="true"></i></span>
          <div>
            <p class="eyebrow">Next milestone</p>
            <h2 id="next-milestone-title">{{ milestone.next.name }} <span>· {{ milestone.next.days }} days</span></h2>
          </div>
        </div>
        <div class="ember-track" role="progressbar" :aria-valuenow="milestone.percent" aria-valuemin="0" aria-valuemax="100" :aria-label="`${milestone.percent}% of the way to ${milestone.next.name}`">
          <div class="ember-fill" :style="{ width: `${Math.max(6, milestone.percent)}%` }"><span class="ember-tip"></span></div>
          <span class="track-start">{{ milestone.previous.days }}</span>
          <span class="track-end">{{ milestone.next.days }}</span>
        </div>
        <p class="milestone-copy">
          <strong>{{ milestone.remaining }} more {{ milestone.remaining === 1 ? 'day' : 'days' }}</strong> to unlock {{ milestone.next.name }}
          <span v-if="milestone.next.shield" class="reward-tag"><i class="ri-shield-star-line" aria-hidden="true"></i>+1 shield</span>
        </p>
        <p class="tomorrow-line"><i class="ri-checkbox-circle-fill" aria-hidden="true"></i> Today counts. Come back tomorrow to make it {{ current + 1 }}.</p>
      </section>

      <!-- The whole ladder, as a trail you can scroll along. -->
      <section class="trail-card" aria-label="Milestone trail">
        <div class="trail" ref="trailRef">
          <div
            v-for="badge in milestone.badges"
            :key="badge.days"
            class="trail-stop"
            :class="{ reached: current >= badge.days, next: badge.days === milestone.next.days, unlocked: badge.unlocked }"
          >
            <span class="trail-node"><i :class="current >= badge.days ? 'ri-check-line' : badge.icon" aria-hidden="true"></i></span>
            <strong>{{ badge.days }}</strong>
            <span>{{ badge.name }}</span>
          </div>
        </div>
      </section>

      <!-- Rewards -->
      <section class="rewards-card" aria-labelledby="rewards-title">
        <header class="section-head">
          <h2 id="rewards-title">Rewards</h2>
          <span>{{ milestone.unlockedCount }} / {{ milestone.badges.length }} badges</span>
        </header>
        <div class="badge-shelf">
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
              <i :class="badge.unlocked ? badge.icon : 'ri-lock-2-line'" aria-hidden="true"></i>
            </span>
            <span class="badge-name">{{ badge.name }}</span>
            <span class="badge-days">{{ badge.days }} days</span>
          </button>
        </div>
        <div class="shield-explainer">
          <span class="shield-stack" aria-hidden="true">
            <i v-for="slot in maxShields" :key="slot" :class="slot <= shields ? 'ri-shield-star-fill' : 'ri-shield-line'"></i>
          </span>
          <p>
            <strong>Streak shields</strong>
            A shield covers one missed day automatically. Earn one at 7, 30, 100 and 365 days; hold up to {{ maxShields }}.
            <span v-if="lastShieldUsed" class="shield-saved">A shield saved your streak on {{ formatDay(lastShieldUsed) }}.</span>
          </p>
        </div>
      </section>

      <section class="calendar-card">
        <header class="calendar-header">
          <button type="button" aria-label="Previous month" @click="changeMonth(-1)"><i class="ri-arrow-left-s-line"></i></button>
          <h2>{{ monthTitle }}</h2>
          <button type="button" aria-label="Next month" :disabled="isCurrentMonth" @click="changeMonth(1)"><i class="ri-arrow-right-s-line"></i></button>
        </header>
        <div class="weekday-row" aria-hidden="true">
          <span v-for="day in weekdays" :key="day">{{ day }}</span>
        </div>
        <div class="calendar-grid">
          <span
            v-for="cell in calendarCells"
            :key="cell.key"
            class="calendar-day"
            :class="{
              active: cell.active,
              shielded: cell.shielded,
              'active-start': cell.activeStart,
              'active-end': cell.activeEnd,
              today: cell.today,
              muted: !cell.inMonth,
            }"
            :title="cell.shielded ? `${cell.label}: covered by a shield` : cell.active ? `${cell.label}: streak active` : cell.label"
          >
            <i v-if="cell.shielded" class="ri-shield-star-fill" aria-hidden="true"></i>
            <template v-else>{{ cell.day }}</template>
          </span>
        </div>
      </section>

      <section class="streak-summary">
        <article><i class="ri-vip-crown-2-line" aria-hidden="true"></i><strong>{{ streakStats.longest }}</strong><span>Longest streak</span></article>
        <article><i class="ri-calendar-check-line" aria-hidden="true"></i><strong>{{ streakStats.totalActiveDays }}</strong><span>Active days</span></article>
        <article><i class="ri-pulse-line" aria-hidden="true"></i><strong>{{ streakStats.thisMonthConsistency }}%</strong><span>This month</span></article>
        <article><i class="ri-scissors-cut-line" aria-hidden="true"></i><strong>{{ streakStats.totalBreaks }}</strong><span>Streak breaks</span></article>
      </section>

      <section class="insights-card">
        <h2>Your streak story</h2>
        <p><i class="ri-trophy-line"></i><span>Your longest streak is <strong>{{ streakStats.longest }} days</strong>, led by {{ streakStats.longestMonth }}.</span></p>
        <p><i class="ri-seedling-line"></i><span>Your shortest completed streak is <strong>{{ streakStats.shortest }} day{{ streakStats.shortest === 1 ? '' : 's' }}</strong>, in {{ streakStats.shortestMonth }}.</span></p>
        <p><i class="ri-calendar-check-line"></i><span>You have shown up on <strong>{{ streakStats.totalActiveDays }} days</strong> in total.</span></p>
        <p><i class="ri-line-chart-line"></i><span>This month has {{ streakStats.thisMonthActiveDays }} active day{{ streakStats.thisMonthActiveDays === 1 ? '' : 's' }} and {{ streakStats.thisMonthConsistency }}% consistency.</span></p>
        <p><i class="ri-heart-pulse-line"></i><span>{{ breakInsight }}</span></p>
      </section>

      <section v-if="streakStats.previousRuns.length" class="history-card">
        <h2>Previous streaks</h2>
        <div v-for="run in streakStats.previousRuns.slice(0, 8)" :key="`${run.start}-${run.end}`" class="history-row">
          <span>{{ formatRange(run) }}</span>
          <span class="history-bar"><span :style="{ width: `${Math.max(8, Math.round(run.days / Math.max(1, streakStats.longest) * 100))}%` }"></span></span>
          <strong>{{ run.days }} day{{ run.days === 1 ? '' : 's' }}</strong>
        </div>
      </section>

      <section v-if="showStreakSharing" class="share-card">
        <div><h2>Celebrate your progress</h2><p>Create a personalized streak card to save or share.</p></div>
        <div class="share-actions">
          <button type="button" :disabled="actionState !== ''" @click="shareStreak">
            <i :class="actionState === 'sharing' ? 'ri-loader-4-line spinning' : 'ri-share-line'"></i>
            {{ actionState === 'sharing' ? 'Preparing…' : 'Share' }}
          </button>
          <button type="button" class="secondary" :disabled="actionState !== ''" @click="downloadStreak">
            <i :class="actionState === 'saving' ? 'ri-loader-4-line spinning' : 'ri-download-2-line'"></i>
            {{ actionState === 'saving' ? 'Saving…' : 'Save image' }}
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
            <p class="eyebrow">Milestone unlocked</p>
            <h2 id="celebration-title">{{ celebration.name }}</h2>
            <p class="celebration-copy">{{ celebration.days }} days in a row. That is a real reading habit.</p>
            <p v-if="celebration.shield" class="celebration-reward"><i class="ri-shield-star-fill" aria-hidden="true"></i> You earned a streak shield</p>
            <p v-else class="celebration-reward"><i class="ri-award-fill" aria-hidden="true"></i> New badge on your shelf</p>
            <button type="button" class="claim-btn" @click="claimCelebration">Claim reward</button>
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

const { activeDates, streakStats, shieldedDates, shields, lastShieldUsed, pendingCelebration, markCelebrated } = useStreak()
const { profile } = useUserProfile()
const { addToast } = useToast()
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const today = new Date()
const shownMonth = ref(new Date(today.getFullYear(), today.getMonth(), 1))
const actionState = ref('')
const showStreakSharing = false
const maxShields = MAX_STREAK_SHIELDS
const trailRef = ref(null)
const activeSet = computed(() => new Set(activeDates.value))
const shieldSet = computed(() => new Set(shieldedDates.value))

const current = computed(() => Math.max(0, streakStats.value.current))
const milestone = computed(() => milestoneProgress(current.value, Math.max(streakStats.value.longest, current.value)))
// The flame grows with the milestones reached — subtle, capped.
const flameScale = computed(() => (1 + Math.min(milestone.value.unlockedCount, 8) * 0.035).toFixed(3))
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
.streak-page { --ember-1: #ff5a1f; --ember-2: #ff8a2a; --ember-3: #ffc44d; min-height: 100vh; background: var(--color-background-app); color: var(--color-text-primary); font-family: var(--mobile-font-family); }
.streak-body { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; max-width: 760px; margin: 0 auto; padding: 6px 18px 40px; }

/* ── Ember hero ── */
.ember-hero { position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; padding: 18px 18px 22px; border-radius: 28px; background: radial-gradient(120% 70% at 50% 108%, #7a2a12 0%, #3a1430 46%, #1b1024 100%); color: #fff7ee; text-align: center; isolation: isolate; }
.ember-glow { position: absolute; inset: auto -20% -45% -20%; height: 75%; background: radial-gradient(closest-side, rgba(255, 138, 42, .55), transparent); filter: blur(8px); z-index: -1; animation: glow 3.2s ease-in-out infinite; }
.hero-top { display: flex; width: 100%; align-items: center; justify-content: space-between; }
.hero-kicker { color: rgba(255, 236, 214, .72); font-size: 11px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }
.shield-pill { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px 4px 8px; border-radius: 999px; background: rgba(255, 255, 255, .12); color: #ffe2a8; font-size: 13px; font-weight: 700; }
.shield-pill.empty { color: rgba(255, 255, 255, .5); }
.flame-wrap { position: relative; display: grid; width: 150px; height: 178px; margin-top: 4px; place-items: center; transform: scale(var(--flame-scale, 1)); transform-origin: 50% 90%; }
.flame { position: absolute; inset: 0; width: 100%; height: 100%; filter: drop-shadow(0 10px 26px rgba(255, 106, 31, .55)); }
.flame-outer { transform-origin: 50% 95%; animation: flicker 2.6s ease-in-out infinite; }
.flame-inner { transform-origin: 50% 95%; animation: flicker 1.9s ease-in-out infinite reverse; opacity: .92; }
.hero-count { position: relative; margin-top: 54px; color: #4a1a06; font-size: 52px; font-weight: 800; line-height: 1; letter-spacing: -.04em; font-variant-numeric: tabular-nums; }
.hero-label { margin: 6px 0 12px; font-size: 20px; font-weight: 600; letter-spacing: -.01em; }
.best-chip { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 999px; background: rgba(255, 255, 255, .1); color: rgba(255, 244, 230, .86); font-size: 13px; }
.best-chip i { color: var(--ember-3); }
.best-chip.record { background: linear-gradient(90deg, rgba(255, 196, 77, .28), rgba(255, 90, 31, .28)); color: #fff; font-weight: 600; }

/* ── Next milestone ── */
.milestone-card, .trail-card, .rewards-card, .calendar-card, .insights-card, .history-card, .share-card { padding: 18px; border-radius: 22px; background: var(--color-surface-primary); }
.milestone-card, .rewards-card, .insights-card, .history-card, .share-card { border: 1px solid var(--color-border-card); }
.milestone-head { display: flex; align-items: center; gap: 12px; }
.eyebrow { margin: 0 0 2px; color: var(--color-text-muted); font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
.milestone-head h2 { margin: 0; font-size: 18px; letter-spacing: -.01em; }
.milestone-head h2 span { color: var(--color-text-muted); font-weight: 500; }
.ember-track { position: relative; height: 16px; margin: 18px 0 22px; border-radius: 999px; background: color-mix(in srgb, var(--ember-2) 14%, var(--color-surface-secondary)); }
.ember-fill { position: relative; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--ember-1), var(--ember-2) 60%, var(--ember-3)); box-shadow: 0 4px 14px rgba(255, 106, 31, .35); transition: width .6s cubic-bezier(.2, .8, .2, 1); }
.ember-tip { position: absolute; top: 50%; right: -2px; width: 22px; height: 22px; border: 4px solid #fff; border-radius: 50%; background: var(--ember-2); box-shadow: 0 2px 8px rgba(0, 0, 0, .18); transform: translateY(-50%); }
.track-start, .track-end { position: absolute; top: calc(100% + 5px); color: var(--color-text-muted); font-size: 11px; font-weight: 600; }
.track-start { left: 2px; } .track-end { right: 2px; }
.milestone-copy { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0; color: var(--color-text-secondary); font-size: 14px; }
.milestone-copy strong { color: var(--color-text-primary); }
.reward-tag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; background: color-mix(in srgb, var(--ember-3) 22%, transparent); color: #a2560a; font-size: 12px; font-weight: 700; }
.tomorrow-line { display: flex; align-items: center; gap: 6px; margin: 12px 0 0; color: var(--color-text-muted); font-size: 13px; }
.tomorrow-line i { color: #2fb67c; font-size: 16px; }

/* ── Trail ── */
.trail-card { padding: 14px 0 12px; border: 1px solid var(--color-raised-surface-border); }
.trail { display: flex; overflow-x: auto; padding: 4px 18px 2px; scrollbar-width: none; scroll-snap-type: x proximity; }
.trail::-webkit-scrollbar { display: none; }
.trail-stop { position: relative; display: grid; flex: 0 0 82px; justify-items: center; gap: 3px; scroll-snap-align: center; text-align: center; }
.trail-stop::before { content: ''; position: absolute; top: 17px; left: -50%; width: 100%; height: 3px; background: var(--color-border-card); z-index: 0; }
.trail-stop:first-child::before { display: none; }
.trail-stop.reached::before { background: linear-gradient(90deg, var(--ember-1), var(--ember-2)); }
.trail-node { position: relative; z-index: 1; display: grid; width: 36px; height: 36px; place-items: center; border: 2px solid var(--color-border-card); border-radius: 50%; background: var(--color-surface-primary); color: var(--color-text-muted); font-size: 16px; }
.trail-stop.reached .trail-node { border-color: transparent; background: linear-gradient(140deg, var(--ember-3), var(--ember-1)); color: #fff; }
.trail-stop.next .trail-node { border-color: var(--ember-2); color: var(--ember-1); animation: beacon 1.8s ease-out infinite; }
.trail-stop strong { margin-top: 2px; font-size: 14px; }
.trail-stop span:last-child { color: var(--color-text-muted); font-size: 10.5px; line-height: 1.2; }

/* ── Rewards ── */
.section-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12px; }
.section-head h2 { margin: 0; font-size: 17px; }
.section-head span { color: var(--color-text-muted); font-size: 12px; }
.badge-shelf { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px 6px; }
.badge { display: grid; justify-items: center; gap: 3px; padding: 0; border: 0; background: none; color: inherit; font: inherit; cursor: pointer; }
.badge-name { font-size: 11.5px; font-weight: 600; line-height: 1.2; text-align: center; }
.badge-days { color: var(--color-text-muted); font-size: 10.5px; }
.badge.locked .medal { background: var(--color-surface-secondary); color: var(--color-text-muted); box-shadow: inset 0 0 0 1.5px var(--color-border-card); }
.badge.locked .badge-name { color: var(--color-text-muted); font-weight: 500; }
.medal { display: grid; width: 52px; height: 52px; place-items: center; border-radius: 50%; color: #fff; font-size: 22px; box-shadow: inset 0 -3px 0 rgba(0, 0, 0, .14), 0 6px 14px rgba(0, 0, 0, .12); }
.medal.small { flex: 0 0 auto; width: 44px; height: 44px; font-size: 20px; }
.medal.large { width: 92px; height: 92px; font-size: 42px; }
.medal.tier-spark { background: linear-gradient(145deg, #ffb27a, #ff6a3d); }
.medal.tier-amber { background: linear-gradient(145deg, #ffd36b, #f08a1c); }
.medal.tier-ember { background: linear-gradient(145deg, #ff8a5c, #c2185b); }
.medal.tier-gold { background: linear-gradient(145deg, #fff0a8, #d9a400 55%, #a87400); color: #5a3d00; }
.shield-explainer { display: grid; grid-template-columns: auto 1fr; gap: 12px; align-items: start; margin-top: 16px; padding: 12px; border-radius: 14px; background: var(--color-surface-secondary); }
.shield-stack { display: flex; gap: 2px; color: #d9a400; font-size: 20px; }
.shield-stack .ri-shield-line { color: var(--color-text-muted); opacity: .6; }
.shield-explainer p { margin: 0; color: var(--color-text-secondary); font-size: 12.5px; line-height: 1.45; }
.shield-explainer strong { display: block; margin-bottom: 2px; color: var(--color-text-primary); font-size: 13.5px; }
.shield-saved { display: block; margin-top: 4px; color: #2fb67c; font-weight: 600; }

/* ── Calendar ── */
.calendar-card { padding: 20px 17px 22px; border: 1px solid var(--color-raised-surface-border); border-radius: 22px; }
.calendar-header { display: grid; grid-template-columns: 40px 1fr 40px; align-items: center; margin-bottom: 14px; }.calendar-header h2 { margin: 0; text-align: center; font-size: 17px; }.calendar-header button { display: grid; width: 38px; height: 38px; place-items: center; border: 0; border-radius: 12px; background: var(--color-surface-secondary); color: inherit; }.calendar-header button:disabled { opacity: .3; }
.weekday-row,.calendar-grid { display: grid; grid-template-columns: repeat(7,1fr); column-gap: 0; row-gap: 8px; }.weekday-row { margin-bottom: 6px; color: var(--color-text-muted); font-size: 11px; text-align: center; }.calendar-day { position: relative; display: grid; aspect-ratio: 1; place-items: center; border-radius: 0; color: var(--color-text-secondary); font-size: 13px; }.calendar-day.muted { opacity: .25; }
.calendar-day.active { background: color-mix(in srgb, var(--ember-2) 20%, transparent); color: #b4470f; font-weight: 600; }
.calendar-day.shielded { color: #c79400; font-size: 15px; }
.calendar-day.active-start { border-radius: 9px 0 0 9px; }.calendar-day.active-end { border-radius: 0 9px 9px 0; }.calendar-day.active-start.active-end { border-radius: 9px; }
.calendar-day.today { box-shadow: inset 0 0 0 2px var(--ember-1); border-radius: 9px; }

/* ── Stats + story ── */
.streak-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.streak-summary article { display: grid; grid-template-columns: auto 1fr; grid-template-rows: auto auto; column-gap: 10px; align-items: center; padding: 14px; border: 1px solid var(--color-border-card); border-radius: 18px; background: var(--color-surface-primary); }
.streak-summary i { grid-row: span 2; display: grid; width: 36px; height: 36px; place-items: center; border-radius: 11px; background: color-mix(in srgb, var(--ember-2) 14%, transparent); color: var(--ember-1); font-size: 18px; }
.streak-summary strong { font-size: 22px; line-height: 1.1; letter-spacing: -.02em; }
.streak-summary span { color: var(--color-text-muted); font-size: 12px; }
.insights-card h2,.history-card h2,.share-card h2 { margin: 0 0 12px; font-size: 17px; }.insights-card p { display: grid; grid-template-columns: 24px 1fr; gap: 10px; margin: 12px 0; color: var(--color-text-secondary); font-size: 13px; line-height: 1.45; }.insights-card i { color: var(--ember-1); font-size: 18px; }
.history-row { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--color-border-subtle); font-size: 13px; }.history-row:last-child { border-bottom: 0; }.history-row > span:first-child { color: var(--color-text-muted); }
.history-bar { height: 6px; border-radius: 999px; background: var(--color-surface-secondary); overflow: hidden; }
.history-bar span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--ember-3), var(--ember-1)); }
.share-card { display: grid; gap: 14px; }.share-card h2 { margin-bottom: 3px; }.share-card p { margin: 0; color: var(--color-text-muted); font-size: 13px; }.share-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }.share-actions button { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; gap: 7px; border: 1px solid var(--color-brand-primary); border-radius: 12px; background: var(--color-brand-primary); color: #fff; font-weight: 600; }.share-actions button.secondary { background: transparent; color: var(--color-brand-primary); }.share-actions button:disabled { opacity: .65; cursor: wait; }.spinning { animation: spin .8s linear infinite; }

/* ── Celebration ── */
.celebration-layer { position: fixed; inset: 0; z-index: 4000; display: grid; place-items: center; padding: 24px; background: rgba(20, 8, 24, .72); }
.celebration-card { position: relative; z-index: 1; display: grid; justify-items: center; width: min(100%, 340px); padding: 30px 22px 22px; border-radius: 28px; background: var(--color-surface-primary); color: var(--color-text-primary); text-align: center; box-shadow: 0 30px 60px rgba(0, 0, 0, .35); animation: pop .5s cubic-bezier(.2, 1.4, .4, 1) both; }
.celebration-card .medal { margin-bottom: 14px; animation: medal-in .7s .1s cubic-bezier(.2, 1.4, .4, 1) both; }
.celebration-card h2 { margin: 0 0 6px; font-size: 26px; letter-spacing: -.02em; }
.celebration-copy { margin: 0 0 14px; color: var(--color-text-secondary); font-size: 14px; }
.celebration-reward { display: inline-flex; align-items: center; gap: 6px; margin: 0 0 18px; padding: 7px 12px; border-radius: 999px; background: color-mix(in srgb, var(--ember-3) 24%, transparent); color: #a2560a; font-size: 13px; font-weight: 700; }
.claim-btn { width: 100%; min-height: 50px; border: 0; border-radius: 16px; background: linear-gradient(90deg, var(--ember-1), var(--ember-2)); color: #fff; font: inherit; font-size: 16px; font-weight: 700; cursor: pointer; box-shadow: 0 10px 22px rgba(255, 106, 31, .35); }
.confetti { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.confetti span { position: absolute; top: -20px; left: var(--x); width: 8px; height: 14px; border-radius: 2px; opacity: 0; animation: fall 2.8s var(--delay) cubic-bezier(.3, .6, .6, 1) forwards; }
.celebrate-enter-active, .celebrate-leave-active { transition: opacity .25s ease; }
.celebrate-enter-from, .celebrate-leave-to { opacity: 0; }

@keyframes flicker { 0%, 100% { transform: scale(1, 1) skewX(0); } 30% { transform: scale(.97, 1.03) skewX(-1.5deg); } 60% { transform: scale(1.02, .98) skewX(1deg); } }
@keyframes glow { 0%, 100% { opacity: .75; } 50% { opacity: 1; } }
@keyframes beacon { 0% { box-shadow: 0 0 0 0 rgba(255, 138, 42, .45); } 100% { box-shadow: 0 0 0 12px rgba(255, 138, 42, 0); } }
@keyframes pop { from { opacity: 0; transform: translateY(24px) scale(.92); } to { opacity: 1; transform: none; } }
@keyframes medal-in { from { transform: scale(.2) rotate(-30deg); } to { transform: none; } }
@keyframes fall { 0% { opacity: 1; transform: translate(0, 0) rotate(0); } 100% { opacity: 0; transform: translate(var(--drift), 105vh) rotate(var(--spin)); } }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .flame-outer, .flame-inner, .ember-glow, .trail-stop.next .trail-node, .confetti span { animation: none; } }
</style>
