import { computed, onMounted } from 'vue'
import { useState } from '#app'

export const STREAK_STORAGE_KEY = 'bookish:usage-streak'

export const localDateKey = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const dateFromKey = (dateKey) => {
  const [year, month, day] = String(dateKey || '').split('-').map(Number)
  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day, 12)
  return Number.isNaN(date.getTime()) ? null : date
}

const dayNumber = (dateKey) => {
  const date = dateFromKey(dateKey)
  return date ? Math.floor(date.getTime() / 86400000) : null
}

const shiftDateKey = (dateKey, delta) => {
  const date = dateFromKey(dateKey)
  if (!date) return null
  date.setDate(date.getDate() + delta)
  return localDateKey(date)
}

const cleanDates = (dates) => [...new Set((Array.isArray(dates) ? dates : [])
  .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value))))]
  .sort()

const legacyDates = (stored) => {
  const end = stored?.lastUsedDate
  const count = Math.max(0, Number(stored?.count) || 0)
  if (!end || !count) return []
  return Array.from({ length: count }, (_, index) => shiftDateKey(end, index - count + 1)).filter(Boolean)
}

export const buildStreakRuns = (activeDates) => {
  const dates = cleanDates(activeDates)
  const runs = []
  for (const date of dates) {
    const last = runs.at(-1)
    if (last && dayNumber(date) - dayNumber(last.end) === 1) {
      last.end = date
      last.days += 1
      last.dates.push(date)
    } else {
      runs.push({ start: date, end: date, days: 1, dates: [date] })
    }
  }
  return runs
}

const monthLabel = (key) => {
  if (!key) return 'No month yet'
  const date = dateFromKey(`${key}-01`)
  return date?.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) || key
}

// shieldedDates: missed days a streak shield covered. They keep a run joined
// (so the streak survives) but never count as days actually read.
export const calculateStreakStats = (activeDates, referenceDate = new Date(), { shieldedDates = [] } = {}) => {
  const dates = cleanDates(activeDates)
  const runs = buildStreakRuns([...dates, ...cleanDates(shieldedDates)])
  const today = localDateKey(referenceDate)
  const yesterday = shiftDateKey(today, -1)
  const currentRun = [...runs].reverse().find((run) => run.end === today || run.end === yesterday) || null
  const previousRuns = currentRun ? runs.filter((run) => run !== currentRun) : runs
  const longest = runs.reduce((best, run) => !best || run.days > best.days ? run : best, null)
  const shortest = runs.reduce((best, run) => !best || run.days < best.days ? run : best, null)

  const months = new Map()
  for (const date of dates) {
    const key = date.slice(0, 7)
    const entry = months.get(key) || { key, activeDays: 0, breaks: 0, longest: 0, dates: [] }
    entry.activeDays += 1
    entry.dates.push(date)
    months.set(key, entry)
  }
  for (const entry of months.values()) {
    const monthRuns = buildStreakRuns(entry.dates)
    entry.longest = Math.max(0, ...monthRuns.map((run) => run.days))
    for (let index = 1; index < entry.dates.length; index += 1) {
      if (dayNumber(entry.dates[index]) - dayNumber(entry.dates[index - 1]) > 1) entry.breaks += 1
    }
  }
  const monthList = [...months.values()].sort((a, b) => a.key.localeCompare(b.key))
  const longestMonth = monthList.reduce((best, item) => !best || item.longest > best.longest ? item : best, null)
  const shortestMonth = monthList.filter((item) => item.activeDays > 0)
    .reduce((best, item) => !best || item.longest < best.longest ? item : best, null)
  const highestBreakMonth = monthList.reduce((best, item) => !best || item.breaks > best.breaks ? item : best, null)
  const thisMonth = months.get(today.slice(0, 7)) || { activeDays: 0, breaks: 0 }
  const elapsedDays = Math.max(1, referenceDate.getDate())

  return {
    current: currentRun?.days || 0,
    longest: longest?.days || 0,
    shortest: shortest?.days || 0,
    totalActiveDays: dates.length,
    totalBreaks: runs.length > 0 ? Math.max(0, runs.length - 1) : 0,
    previousRuns: [...previousRuns].reverse(),
    longestMonth: longestMonth ? monthLabel(longestMonth.key) : 'No month yet',
    shortestMonth: shortestMonth ? monthLabel(shortestMonth.key) : 'No month yet',
    highestBreakMonth: highestBreakMonth?.breaks ? monthLabel(highestBreakMonth.key) : 'No breaks yet',
    highestMonthBreaks: highestBreakMonth?.breaks || 0,
    thisMonthActiveDays: thisMonth.activeDays,
    thisMonthConsistency: Math.round((thisMonth.activeDays / elapsedDays) * 100),
  }
}

// ── Milestones and rewards ──────────────────────────────────────────────────
//
// A ladder of streak lengths, each with a named badge. Badges unlock against the
// PERSONAL BEST, so a broken streak never takes one away. Some milestones also
// pay out a streak shield: held shields quietly cover a single missed day, so
// one busy day does not wipe out weeks of reading.

export const STREAK_MILESTONES = Object.freeze([
  { days: 3, name: 'First Spark', icon: 'ri-fire-line', shield: false },
  { days: 7, name: 'Full Week', icon: 'ri-calendar-check-line', shield: true },
  { days: 14, name: 'Fortnight', icon: 'ri-bookmark-3-line', shield: false },
  { days: 30, name: 'Month of Pages', icon: 'ri-book-open-line', shield: true },
  { days: 50, name: 'Half Century', icon: 'ri-medal-line', shield: false },
  { days: 100, name: 'Centurion', icon: 'ri-trophy-line', shield: true },
  { days: 180, name: 'Half a Year', icon: 'ri-sun-line', shield: false },
  { days: 365, name: 'Year of Reading', icon: 'ri-vip-crown-line', shield: true },
])
export const MAX_STREAK_SHIELDS = 3

// The milestone a streak of `days` is heading for. Past the ladder it keeps
// going in hundreds, so there is always a next target.
export const nextMilestoneFor = (days) => {
  const found = STREAK_MILESTONES.find((milestone) => milestone.days > days)
  if (found) return found
  const target = (Math.floor(days / 100) + 1) * 100
  return { days: target, name: `${target} Days`, icon: 'ri-star-line', shield: true }
}

export const previousMilestoneFor = (days) => {
  const last = STREAK_MILESTONES.at(-1)
  if (days >= last.days) {
    const hundred = Math.floor(days / 100) * 100
    return { days: Math.max(last.days, hundred) }
  }
  return [...STREAK_MILESTONES].reverse().find((milestone) => milestone.days <= days) || { days: 0 }
}

export const milestoneProgress = (current = 0, best = 0) => {
  const next = nextMilestoneFor(current)
  const previous = previousMilestoneFor(current)
  const span = Math.max(1, next.days - previous.days)
  return {
    next,
    previous,
    remaining: Math.max(0, next.days - current),
    percent: Math.max(0, Math.min(100, Math.round(((current - previous.days) / span) * 100))),
    badges: STREAK_MILESTONES.map((milestone) => ({ ...milestone, unlocked: best >= milestone.days })),
    unlockedCount: STREAK_MILESTONES.filter((milestone) => best >= milestone.days).length,
    isPersonalBest: current > 0 && current >= best,
  }
}

// One step of the shield logic, pure so it can be tested: given the stored
// dates and today, cover a gap of exactly ONE missed day with a held shield.
export const applyStreakShield = ({ activeDates = [], shieldedDates = [], shields = 0 }, today) => {
  const known = cleanDates([...activeDates, ...shieldedDates]).filter((date) => date < today)
  const last = known.at(-1)
  const missed = shiftDateKey(today, -1)
  if (!last || shields <= 0 || activeDates.includes(today)) return { shieldedDates, shields, used: null }
  if (shiftDateKey(last, 1) !== missed) return { shieldedDates, shields, used: null }
  return { shieldedDates: cleanDates([...shieldedDates, missed]), shields: shields - 1, used: missed }
}

// Shields are paid once per milestone per streak: the key is the run's start
// date plus the milestone, so a fresh streak can earn them again.
export const grantStreakShields = ({ runStart, current, shields = 0, granted = [] }) => {
  let nextShields = shields
  const nextGranted = [...granted]
  const earned = []
  for (const milestone of STREAK_MILESTONES) {
    if (!milestone.shield || current < milestone.days) continue
    const key = `${runStart}:${milestone.days}`
    if (nextGranted.includes(key)) continue
    nextGranted.push(key)
    if (nextShields < MAX_STREAK_SHIELDS) {
      nextShields += 1
      earned.push(milestone.days)
    }
  }
  return { shields: nextShields, granted: nextGranted.slice(-40), earned }
}

const initialState = () => ({
  count: 1,
  lastUsedDate: localDateKey(),
  activeDates: [],
  shieldedDates: [],
  shields: 0,
  shieldGrants: [],
  celebrated: [],
  lastShieldUsed: null,
})

export const useStreak = () => {
  const streakState = useState('bookish:usage-streak', initialState)

  const save = () => {
    if (!import.meta.client) return
    localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(streakState.value))
  }

  const registerUsage = () => {
    if (!import.meta.client) return
    const today = localDateKey()
    let stored = null
    try {
      stored = JSON.parse(localStorage.getItem(STREAK_STORAGE_KEY) || 'null')
    } catch {}

    const dates = cleanDates(stored?.activeDates?.length ? stored.activeDates : legacyDates(stored))
    // A first open after exactly one missed day spends a held shield on it.
    const shielding = applyStreakShield({
      activeDates: dates,
      shieldedDates: cleanDates(stored?.shieldedDates),
      shields: Math.max(0, Number(stored?.shields) || 0),
    }, today)
    if (!dates.includes(today)) dates.push(today)
    const normalizedDates = cleanDates(dates)
    const runs = buildStreakRuns([...normalizedDates, ...shielding.shieldedDates])
    const lastRun = runs.at(-1)
    const current = lastRun?.end === today ? lastRun.days : 1
    const granted = grantStreakShields({
      runStart: lastRun?.start || today,
      current,
      shields: shielding.shields,
      granted: Array.isArray(stored?.shieldGrants) ? stored.shieldGrants : [],
    })
    streakState.value = {
      count: current,
      lastUsedDate: today,
      activeDates: normalizedDates,
      shieldedDates: shielding.shieldedDates,
      shields: granted.shields,
      shieldGrants: granted.granted,
      celebrated: Array.isArray(stored?.celebrated) ? stored.celebrated : [],
      lastShieldUsed: shielding.used || stored?.lastShieldUsed || null,
    }
    save()
  }

  // Milestone celebrations are shown once per streak run.
  const celebrationKey = (milestoneDays) => {
    const runs = buildStreakRuns([...cleanDates(streakState.value.activeDates), ...cleanDates(streakState.value.shieldedDates)])
    return `${runs.at(-1)?.start || ''}:${milestoneDays}`
  }
  const pendingCelebration = computed(() => {
    const current = Math.max(0, Number(streakState.value.count) || 0)
    const done = new Set(streakState.value.celebrated || [])
    const reached = [...STREAK_MILESTONES].reverse().find((milestone) => current >= milestone.days)
    if (!reached || done.has(celebrationKey(reached.days))) return null
    return reached
  })
  const markCelebrated = (milestoneDays) => {
    // Celebrating one milestone also settles every lower one in the same run.
    const keys = STREAK_MILESTONES.filter((milestone) => milestone.days <= milestoneDays)
      .map((milestone) => celebrationKey(milestone.days))
    streakState.value = {
      ...streakState.value,
      celebrated: [...new Set([...(streakState.value.celebrated || []), ...keys])].slice(-60),
    }
    save()
  }

  onMounted(registerUsage)

  return {
    streakCount: computed(() => Math.max(1, Number(streakState.value.count) || 1)),
    activeDates: computed(() => cleanDates(streakState.value.activeDates)),
    streakStats: computed(() => calculateStreakStats(streakState.value.activeDates, new Date(), {
      shieldedDates: streakState.value.shieldedDates,
    })),
    shieldedDates: computed(() => cleanDates(streakState.value.shieldedDates)),
    shields: computed(() => Math.max(0, Number(streakState.value.shields) || 0)),
    lastShieldUsed: computed(() => streakState.value.lastShieldUsed || null),
    pendingCelebration,
    markCelebrated,
    registerUsage,
  }
}
