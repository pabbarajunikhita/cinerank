// Pure helpers for dashboard stats (no React / DB), easy to unit test.

export interface StatRanking {
  status: string
  score: number | null
  tags: string[]
  createdAt: string
}

export function averageScore(watched: StatRanking[]): number | null {
  const scores = watched.map(r => r.score).filter((s): s is number => s != null)
  if (scores.length === 0) return null
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
}

export function topTags(watched: StatRanking[], n = 3): string[] {
  const counts = new Map<string, number>()
  for (const r of watched) for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([t]) => t)
}

/** Index of the Monday-starting week containing `d` (local time). */
export function weekIndex(d: Date): number {
  const localMs = d.getTime() - d.getTimezoneOffset() * 60_000
  const days = Math.floor(localMs / 86_400_000) // day 0 = Thu 1 Jan 1970
  return Math.floor((days + 3) / 7)
}

/**
 * Consecutive weeks (ending this week, or last week if nothing yet this week)
 * with at least one movie ranked. Like Strava's weekly streak.
 */
export function weeklyStreak(dates: Date[], now = new Date()): number {
  const weeks = new Set(dates.map(weekIndex))
  let w = weekIndex(now)
  if (!weeks.has(w)) w -= 1
  let streak = 0
  while (weeks.has(w)) { streak++; w-- }
  return streak
}

export function timeAgo(date: Date, now = new Date()): string {
  const s = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Local midnight on the Monday of `d`'s week. */
export function startOfWeek(d: Date): Date {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7))
  return s
}

/** Count of `dates` per week for the last `weeks` weeks, oldest first. */
export function weeklyCounts(dates: Date[], weeks: number, now = new Date()): { start: Date; count: number }[] {
  const current = weekIndex(now)
  const counts = new Map<number, number>()
  for (const d of dates) counts.set(weekIndex(d), (counts.get(weekIndex(d)) ?? 0) + 1)
  const thisMonday = startOfWeek(now)
  return Array.from({ length: weeks }, (_, i) => {
    const offset = weeks - 1 - i
    const start = new Date(thisMonday)
    start.setDate(start.getDate() - 7 * offset)
    return { start, count: counts.get(current - offset) ?? 0 }
  })
}

export interface DayCell { date: Date; count: number; isToday: boolean; isFuture: boolean }

/** Monday-first grid of the last `weeks` weeks (rows), like Strava's activity calendar. */
export function recentDaysGrid(dates: Date[], weeks = 4, now = new Date()): DayCell[][] {
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  const counts = new Map<string, number>()
  for (const d of dates) counts.set(key(d), (counts.get(key(d)) ?? 0) + 1)
  const todayKey = key(now)
  const first = startOfWeek(now)
  first.setDate(first.getDate() - 7 * (weeks - 1))
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, day) => {
      const date = new Date(first)
      date.setDate(first.getDate() + w * 7 + day)
      return { date, count: counts.get(key(date)) ?? 0, isToday: key(date) === todayKey, isFuture: date > now && key(date) !== todayKey }
    })
  )
}

/** Most common release decade, e.g. "2010s". */
export function favoriteDecade(years: (number | null)[]): string | null {
  const counts = new Map<number, number>()
  for (const y of years) if (y) counts.set(Math.floor(y / 10) * 10, (counts.get(Math.floor(y / 10) * 10) ?? 0) + 1)
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]
  return best ? `${best[0]}s` : null
}
