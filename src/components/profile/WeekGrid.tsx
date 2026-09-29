import type { DayCell } from '@/lib/stats'

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/** Strava-style "last 4 weeks" calendar: one dot per day, filled on days a movie was ranked. */
export default function WeekGrid({ grid }: { grid: DayCell[][] }) {
  return (
    <div className="inline-grid grid-cols-7 gap-x-3 gap-y-2 text-center">
      {DAYS.map((d, i) => (
        <span key={i} className="text-[11px] font-medium text-neutral-500">{d}</span>
      ))}
      {grid.flat().map(cell => (
        <div key={cell.date.toISOString()} className="flex h-4 w-4 items-center justify-center" title={
          `${cell.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${cell.count} ranked`
        }>
          {cell.isToday ? (
            <span className={`text-[11px] font-bold underline underline-offset-2 ${cell.count ? 'text-orange-400' : 'text-white'}`}>
              {cell.date.getDate()}
            </span>
          ) : (
            <span className={`rounded-full ${
              cell.isFuture ? 'h-1 w-1 bg-transparent'
              : cell.count ? 'h-3 w-3 bg-orange-500'
              : 'h-1 w-1 bg-neutral-600'
            }`} />
          )}
        </div>
      ))}
    </div>
  )
}
