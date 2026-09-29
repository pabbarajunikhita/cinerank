'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Flame, Sparkles } from 'lucide-react'
import { averageScore, timeAgo, topTags, weeklyStreak } from '@/lib/stats'

interface ProfileCardProps {
  user: { displayName: string; username: string; avatarUrl: string | null } | null
  watched: { score: number | null; tags: string[]; createdAt: string; status: string; movie: { title: string } }[]
  watchlistCount: number
  tasteProfile: string | null
  tasteError: string | null
  loadingTasteProfile: boolean
  onTasteProfile: () => void
}

export default function ProfileCard({
  user, watched, watchlistCount, tasteProfile, tasteError, loadingTasteProfile, onTasteProfile,
}: ProfileCardProps) {
  const avg = averageScore(watched)
  const vibes = topTags(watched)
  const streak = weeklyStreak(watched.map(r => new Date(r.createdAt)))
  const latest = [...watched].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  const initials = (user?.displayName || user?.username || '?')
    .split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden">
      {/* identity */}
      <div className="px-5 pt-6 pb-5 text-center">
        <div className="mx-auto h-20 w-20 rounded-full p-[3px] bg-gradient-to-br from-red-500 to-orange-400">
          <div className="relative h-full w-full rounded-full overflow-hidden bg-neutral-900 flex items-center justify-center">
            {user?.avatarUrl ? (
              <Image src={user.avatarUrl} alt={user.displayName} fill className="object-cover" />
            ) : (
              <span className="text-2xl font-bold">{initials}</span>
            )}
          </div>
        </div>
        <h2 className="mt-3 text-lg font-bold leading-tight">{user?.displayName ?? ' '}</h2>
        {user && (
          <Link href={`/u/${user.username}`} className="text-sm text-neutral-400 hover:text-white">
            @{user.username}
          </Link>
        )}
      </div>

      {/* stats */}
      <div className="grid grid-cols-3 border-y border-neutral-800 text-center">
        {[
          { label: 'Ranked', value: watched.length },
          { label: 'Avg score', value: avg ?? '–' },
          { label: 'Watchlist', value: watchlistCount },
        ].map((s, i) => (
          <div key={s.label} className={`py-3 ${i > 0 ? 'border-l border-neutral-800' : ''}`}>
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">{s.label}</p>
            <p className="text-xl font-bold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="divide-y divide-neutral-800">
        {/* latest */}
        <div className="px-5 py-4">
          <p className="text-xs text-neutral-500">Latest ranking</p>
          {latest ? (
            <p className="mt-1 text-sm">
              <span className="font-semibold">{latest.movie.title}</span>
              <span className="text-neutral-500"> · {timeAgo(new Date(latest.createdAt))}</span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-neutral-400">Nothing yet. Rank your first movie!</p>
          )}
        </div>

        {/* streak */}
        <div className="px-5 py-4 flex items-center gap-3">
          <div className={`flex h-11 w-11 flex-col items-center justify-center rounded-full ${streak > 0 ? 'bg-orange-500/15 text-orange-400' : 'bg-neutral-800 text-neutral-500'}`}>
            <Flame size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold">
              {streak > 0 ? `${streak} week${streak === 1 ? '' : 's'} streak` : 'No streak yet'}
            </p>
            <p className="text-xs text-neutral-400">
              {streak > 0 ? 'Rank a movie this week to keep it going.' : 'Rank a movie each week to build one.'}
            </p>
          </div>
        </div>

        {/* vibes */}
        {vibes.length > 0 && (
          <div className="px-5 py-4">
            <p className="text-xs text-neutral-500 mb-2">Your vibes</p>
            <div className="flex flex-wrap gap-1.5">
              {vibes.map(v => (
                <span key={v} className="rounded-full bg-neutral-800 px-2.5 py-1 text-xs text-neutral-200">{v}</span>
              ))}
            </div>
          </div>
        )}

        {/* taste profile */}
        <div className="px-5 py-4">
          {tasteProfile ? (
            <>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-orange-400 mb-1.5">
                <Sparkles size={13} /> Your taste profile
              </p>
              <p className="text-sm leading-relaxed text-neutral-200">{tasteProfile}</p>
            </>
          ) : (
            <button
              onClick={onTasteProfile}
              disabled={loadingTasteProfile}
              className="w-full rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loadingTasteProfile ? 'Analyzing your taste…' : '✨ Generate taste profile'}
            </button>
          )}
          {tasteError && <p className="mt-2 text-xs text-neutral-400">{tasteError}</p>}
        </div>
      </div>
    </div>
  )
}
