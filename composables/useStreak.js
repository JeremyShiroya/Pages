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

export const calculateStreakStats = (activeDates, referenceDate = new Date()) => {
  const dates = cleanDates(activeDates)
  const runs = buildStreakRuns(dates)
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

const initialState = () => ({ count: 1, lastUsedDate: localDateKey(), activeDates: [] })

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
    if (!dates.includes(today)) dates.push(today)
    const normalizedDates = cleanDates(dates)
    const runs = buildStreakRuns(normalizedDates)
    const current = runs.at(-1)?.end === today ? runs.at(-1).days : 1
    streakState.value = { count: current, lastUsedDate: today, activeDates: normalizedDates }
    save()
  }

  onMounted(registerUsage)

  return {
    streakCount: computed(() => Math.max(1, Number(streakState.value.count) || 1)),
    activeDates: computed(() => cleanDates(streakState.value.activeDates)),
    streakStats: computed(() => calculateStreakStats(streakState.value.activeDates)),
    registerUsage,
  }
}
