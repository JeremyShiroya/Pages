<template>
  <div class="streak-page">
    <MobileSettingsNav title="Streak History" back-to="/" aria-label="Streak navigation" />

    <main class="streak-body">
      <section class="streak-hero">
        <img src="/images/Flame.png" alt="" />
        <strong>{{ streakStats.current }}</strong>
        <span>{{ streakStats.current === 1 ? 'day streak' : 'days streak' }}</span>
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
              'active-start': cell.activeStart,
              'active-end': cell.activeEnd,
              today: cell.today,
              muted: !cell.inMonth,
            }"
            :title="cell.active ? `${cell.label}: streak active` : cell.label"
          >
            {{ cell.day }}
          </span>
        </div>
      </section>

      <section class="streak-summary">
        <article><strong>{{ streakStats.longest }}</strong><span>Longest streak</span></article>
        <article><strong>{{ streakStats.totalActiveDays }}</strong><span>Active days</span></article>
        <article><strong>{{ streakStats.thisMonthConsistency }}%</strong><span>This month</span></article>
        <article><strong>{{ streakStats.totalBreaks }}</strong><span>Streak breaks</span></article>
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
          <span>{{ formatRange(run) }}</span><strong>{{ run.days }} day{{ run.days === 1 ? '' : 's' }}</strong>
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
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { localDateKey, useStreak } from '~/composables/useStreak'
import { useToast } from '~/composables/useToast'
import { useUserProfile } from '~/composables/useUserProfile'
import { isNativeCapacitorPlatform } from '~/composables/useNativePlatform'
import MobileSettingsNav from './MobileSettingsNav.vue'

const { activeDates, streakStats } = useStreak()
const { profile } = useUserProfile()
const { addToast } = useToast()
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const today = new Date()
const shownMonth = ref(new Date(today.getFullYear(), today.getMonth(), 1))
const actionState = ref('')
const showStreakSharing = false
const activeSet = computed(() => new Set(activeDates.value))

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
    return {
      key,
      day: date.getDate(),
      inMonth: date.getMonth() === month,
      active: activeSet.value.has(key),
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
.streak-page { min-height: 100vh; background: var(--color-background-app); color: var(--color-text-primary); font-family: var(--mobile-font-family); }
.streak-body { display: grid; gap: 18px; max-width: 760px; margin: 0 auto; padding: 6px 20px 34px; }
.streak-hero { display: flex; flex-direction: column; align-items: center; padding: 6px 0 14px; text-align: center; }
.streak-hero img { width: 82px; height: 82px; object-fit: contain; }
.streak-hero strong { margin-top: -2px; font-size: 56px; font-weight: 400; line-height: 1; }.streak-hero span { margin-top: 5px; font-size: 23px; font-weight: 300; }
.calendar-card,.insights-card,.history-card,.share-card { padding: 18px; border: 1px solid var(--color-border-card); border-radius: 18px; background: var(--color-surface-primary); box-shadow: var(--shadow-card); }
.calendar-card { padding: 20px 17px 22px; border: 1px solid var(--color-raised-surface-border); border-radius: 26px; box-shadow: none; }
.calendar-header { display: grid; grid-template-columns: 40px 1fr 40px; align-items: center; margin-bottom: 14px; }.calendar-header h2 { margin: 0; text-align: center; font-size: 18px; }.calendar-header button { display: grid; width: 38px; height: 38px; place-items: center; border: 1px solid var(--color-border-card); border-radius: 10px; background: var(--color-surface-secondary); color: inherit; }.calendar-header button:disabled { opacity: .3; }
.weekday-row,.calendar-grid { display: grid; grid-template-columns: repeat(7,1fr); column-gap: 0; row-gap: 8px; }.weekday-row { margin-bottom: 6px; color: var(--color-text-muted); font-size: 11px; text-align: center; }.calendar-day { position: relative; display: grid; aspect-ratio: 1; place-items: center; border-radius: 0; color: var(--color-text-secondary); font-size: 13px; }.calendar-day.muted { opacity: .25; }.calendar-day.active { background: var(--color-brand-primary-muted); color: var(--color-brand-primary); font-weight: 500; }.calendar-day.active-start { border-radius: 7px 0 0 7px; }.calendar-day.active-end { border-radius: 0 7px 7px 0; }.calendar-day.active-start.active-end { border-radius: 7px; }.calendar-day.today { box-shadow: inset 0 0 0 2px var(--color-brand-primary); border-radius: 7px; }
.streak-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }.streak-summary article { display: grid; gap: 3px; padding: 15px; border: 1px solid var(--color-border-card); border-radius: 15px; background: var(--color-surface-primary); }.streak-summary strong { color: var(--color-brand-primary); font-size: 25px; }.streak-summary span { color: var(--color-text-muted); font-size: 12px; }
.insights-card h2,.history-card h2,.share-card h2 { margin: 0 0 12px; font-size: 17px; }.insights-card p { display: grid; grid-template-columns: 24px 1fr; gap: 10px; margin: 12px 0; color: var(--color-text-secondary); font-size: 13px; line-height: 1.45; }.insights-card i { color: var(--color-brand-primary); font-size: 18px; }
.history-row { display: flex; justify-content: space-between; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--color-border-subtle); font-size: 13px; }.history-row:last-child { border-bottom: 0; }.history-row span { color: var(--color-text-muted); }
.share-card { display: grid; gap: 14px; }.share-card h2 { margin-bottom: 3px; }.share-card p { margin: 0; color: var(--color-text-muted); font-size: 13px; }.share-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }.share-actions button { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; gap: 7px; border: 1px solid var(--color-brand-primary); border-radius: 12px; background: var(--color-brand-primary); color: #fff; font-weight: 600; }.share-actions button.secondary { background: transparent; color: var(--color-brand-primary); }.share-actions button:disabled { opacity: .65; cursor: wait; }.spinning { animation: spin .8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }
</style>
