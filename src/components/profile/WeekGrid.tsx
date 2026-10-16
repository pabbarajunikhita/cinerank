import type { DayCell } from '@/lib/stats'

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/** "Oct 2026", or "Sep – Oct 2026" / "Dec 2026 – Jan 2027" when the grid spans two months. */
function monthLabel(first: Date, last: Date) {
  const m = (d: Date) => d.toLocaleDateString(undefined, { month: 'short' })
  if (first.getFullYear() !== last.getFullYear()) return `${m(first)} ${first.getFullYear()} – ${m(last)} ${last.getFullYear()}`
  if (first.getMonth() !== last.getMonth()) return `${m(first)} – ${m(last)} ${last.getFullYear()}`
  return `${m(last)} ${last.getFullYear()}`
}

/**
 * Strava-style "last 4 weeks" calendar by watch date: a dot on empty days, the
 * number of movies watched on busy ones, and today in orange. Hover (or tap) a day for its date.
 */
export default function WeekGrid({ grid }: { grid: DayCell[][] }) {
  const cells = grid.flat()
  return (
    <div>
      <p className="mb-2 text-right text-xs font-semibold text-neutral-300">
        {monthLabel(cells[0].date, cells[cells.length - 1].date)}
      </p>
      <div className="inline-grid grid-cols-7 gap-x-2 gap-y-1.5 text-center">
        {DAYS.map((d, i) => (
          <span key={i} className="text-[11px] font-medium text-neutral-500">{d}</span>
        ))}
        {cells.map(cell => {
          const label = cell.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
          const detail = cell.isFuture ? label
            : `${label}${cell.isToday ? ' (today)' : ''} · ${cell.count} ${cell.count === 1 ? 'movie' : 'movies'}`
          return (
            <div
              key={cell.date.toISOString()}
              tabIndex={cell.isFuture ? -1 : 0}
              aria-label={detail}
              className="group relative flex h-6 w-6 items-center justify-center rounded-full outline-none focus-visible:ring-1 focus-visible:ring-neutral-500"
            >
              {cell.isFuture ? null : cell.count > 0 ? (
                <span className={`text-sm font-bold tabular-nums ${cell.isToday ? 'text-orange-400' : 'text-white'}`}>
                  {cell.count}
                </span>
              ) : (
                <span className={`rounded-full ${cell.isToday ? 'h-2.5 w-2.5 bg-orange-500' : 'h-1 w-1 bg-neutral-600'}`} />
              )}
              {!cell.isFuture && (
                <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-800 px-2 py-1 text-[11px] font-medium text-neutral-100 opacity-0 shadow-lg ring-1 ring-neutral-700 transition-opacity group-hover:opacity-100 group-focus:opacity-100">
                  {detail}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
