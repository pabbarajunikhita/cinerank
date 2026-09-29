'use client'

import { useState } from 'react'

interface Week { start: Date; count: number }

const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

/** Movies ranked per week. Single series: one accent hue, no legend, hover tooltip per bar. */
export default function ActivityChart({ weeks }: { weeks: Week[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(...weeks.map(w => w.count))
  const top = Math.max(2, max % 2 === 0 ? max : max + 1) // even ceiling so the midline is a whole number
  const gridlines = [top, top / 2, 0]

  return (
    <div>
      <div className="relative h-40 pl-6">
        {/* recessive gridlines + y labels */}
        {gridlines.map(v => (
          <div key={v} className="absolute left-6 right-0 border-t border-neutral-800" style={{ bottom: `${(v / top) * 100}%` }}>
            <span className="absolute -left-6 -translate-y-1/2 w-5 text-right text-[10px] tabular-nums text-neutral-500">{v}</span>
          </div>
        ))}

        {/* bars */}
        <div className="absolute inset-0 left-6 flex items-end gap-[2px]">
          {weeks.map((w, i) => {
            const end = new Date(w.start); end.setDate(end.getDate() + 6)
            return (
              <div
                key={i}
                className="relative flex h-full flex-1 items-end justify-center"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                {w.count > 0 && (
                  <div
                    className={`w-full max-w-7 rounded-t-[4px] transition-colors ${hover === i ? 'bg-orange-400' : 'bg-orange-500'}`}
                    style={{ height: `${(w.count / top) * 100}%` }}
                  />
                )}
                {hover === i && (
                  <div className="pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs shadow-lg">
                    <p className="text-neutral-400">{fmt(w.start)} – {fmt(end)}</p>
                    <p className="font-semibold text-white">{w.count} movie{w.count === 1 ? '' : 's'} ranked</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* x labels: first, middle, last week only */}
      <div className="mt-2 flex pl-6 text-[10px] text-neutral-500">
        {weeks.map((w, i) => (
          <span key={i} className="flex-1 text-center">
            {i === 0 || i === Math.floor(weeks.length / 2) || i === weeks.length - 1 ? fmt(w.start) : ''}
          </span>
        ))}
      </div>

      {/* table view for screen readers */}
      <table className="sr-only">
        <caption>Movies ranked per week</caption>
        <tbody>
          {weeks.map((w, i) => (
            <tr key={i}><th scope="row">Week of {fmt(w.start)}</th><td>{w.count}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
