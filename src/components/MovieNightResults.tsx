import Image from 'next/image'
import Link from 'next/link'
import { getImageUrl } from '@/lib/tmdb'

export interface MovieNightPick {
  title: string
  tmdbId: number
  posterPath: string | null
  releaseDate: string
  overview: string
  forYou: string
  forFriend: string
  onWatchlist: 'you' | 'friend' | 'both' | null
}

export interface MovieNight {
  id: string
  planner: { username: string; displayName: string }
  friend: { username: string; displayName: string }
  tasteMatch: { percent: number | null; sharedCount: number }
  sharedTaste: string
  picks: MovieNightPick[]
}

const firstName = (name: string) => name.split(' ')[0]

/**
 * Taste match, shared-taste summary and picks. `viewer` decides the labels:
 * the planner sees "For you", anyone else sees both people's names.
 */
export default function MovieNightResults({ night, viewer }: { night: MovieNight; viewer: 'planner' | 'guest' }) {
  const plannerLabel = viewer === 'planner' ? 'you' : firstName(night.planner.displayName)
  const friendLabel = firstName(night.friend.displayName)

  const watchlistTag = (on: MovieNightPick['onWatchlist']) => {
    if (on === 'both') return 'On both watchlists'
    if (on === 'you') return viewer === 'planner' ? 'On your watchlist' : `On ${plannerLabel}'s watchlist`
    if (on === 'friend') return `On ${friendLabel}'s watchlist`
    return null
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 flex flex-col sm:flex-row gap-6 sm:items-center">
        <div className="text-center sm:w-36 flex-shrink-0">
          {night.tasteMatch.percent !== null ? (
            <>
              <p className="text-5xl font-bold tabular-nums text-red-400">{night.tasteMatch.percent}%</p>
              <p className="text-xs text-neutral-400 mt-1">
                taste match · {night.tasteMatch.sharedCount} movies in common
              </p>
            </>
          ) : (
            <p className="text-xs text-neutral-400">
              Only {night.tasteMatch.sharedCount} movie{night.tasteMatch.sharedCount === 1 ? '' : 's'} in common, so no taste match score yet
            </p>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold text-neutral-400 mb-1">
            {viewer === 'planner' ? 'You' : <Link href={`/u/${night.planner.username}`} className="hover:text-white">{night.planner.displayName}</Link>}
            {' & '}
            <Link href={`/u/${night.friend.username}`} className="hover:text-white">{night.friend.displayName}</Link>
          </p>
          <p className="text-neutral-200">{night.sharedTaste}</p>
        </div>
      </div>

      {night.picks.length === 0 && (
        <p className="text-neutral-400 text-sm">No picks this time. Try again in a moment.</p>
      )}

      {night.picks.map((pick, i) => (
        <div key={pick.tmdbId} className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 flex gap-5">
          <div className="w-24 h-36 relative flex-shrink-0 rounded-lg overflow-hidden bg-neutral-800">
            {pick.posterPath && (
              <Image src={getImageUrl(pick.posterPath)} alt={pick.title} fill className="object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-sm font-semibold text-red-400">#{i + 1}</span>
              <h3 className="font-bold text-lg">{pick.title}</h3>
              <span className="text-sm text-neutral-400">{pick.releaseDate?.slice(0, 4)}</span>
            </div>
            {watchlistTag(pick.onWatchlist) && (
              <span className="inline-block mt-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">
                {watchlistTag(pick.onWatchlist)}
              </span>
            )}
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl bg-neutral-800/60 p-3">
                <p className="text-xs font-semibold text-neutral-400 mb-1">For {plannerLabel}</p>
                <p className="text-sm text-neutral-200">{pick.forYou}</p>
              </div>
              <div className="rounded-xl bg-neutral-800/60 p-3">
                <p className="text-xs font-semibold text-neutral-400 mb-1">For {friendLabel}</p>
                <p className="text-sm text-neutral-200">{pick.forFriend}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
