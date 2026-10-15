'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Bookmark, Popcorn } from 'lucide-react'
import { getImageUrl } from '@/lib/tmdb'
import { timeAgo } from '@/lib/stats'
import { Skeleton } from '@/components/ui/skeleton'
import PhotoLightbox from '@/components/PhotoLightbox'

interface FeedItem {
  id: string
  status: string
  sentiment: string | null
  score: number | null
  review: string | null
  tags: string[]
  photoUrl: string | null
  watchedAt: string | null
  createdAt: string
  myScore: number | null
  user: { username: string; displayName: string; avatarUrl: string | null }
  movie: { id: string; title: string; posterPath: string | null; releaseYear: number | null }
}

const SENTIMENT: Record<string, { label: string; cls: string }> = {
  LIKED: { label: 'Liked', cls: 'bg-emerald-500/15 text-emerald-300' },
  FINE: { label: 'Fine', cls: 'bg-amber-500/15 text-amber-300' },
  DISLIKED: { label: "Didn't like", cls: 'bg-neutral-700/60 text-neutral-300' },
}

export function PersonAvatar({ person, size = 'md' }: { person: { displayName: string; avatarUrl: string | null }; size?: 'sm' | 'md' }) {
  const initials = person.displayName.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const dim = size === 'sm' ? 'h-9 w-9 text-xs' : 'h-12 w-12 text-sm'
  return (
    <div className={`${dim} relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-red-500 to-orange-400 font-bold`}>
      {person.avatarUrl
        ? <Image src={person.avatarUrl} alt={person.displayName} fill className="object-cover" />
        : initials}
    </div>
  )
}

/** Recent rankings from the people you follow. */
export default function FriendsFeed({ onFindPeople }: { onFindPeople: () => void }) {
  const [feed, setFeed] = useState<{ following: number; items: FeedItem[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<{ url: string; caption: string } | null>(null)

  useEffect(() => {
    fetch('/api/feed')
      .then(async res => {
        const data = await res.json().catch(() => null)
        if (res.ok) setFeed(data)
        else setError(data?.error ?? 'Something went wrong')
      })
      .catch(() => setError("Couldn't reach the server"))
  }, [])

  if (error) {
    return <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
  }

  if (!feed) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map(i => <Skeleton key={i} className="h-40 w-full rounded-2xl bg-neutral-900" />)}
      </div>
    )
  }

  if (feed.items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-800 px-6 py-14 text-center">
        <p className="font-semibold">
          {feed.following === 0 ? 'Your feed is empty' : 'Nothing here yet'}
        </p>
        <p className="mt-1 text-sm text-neutral-400">
          {feed.following === 0
            ? 'Follow friends to see what they’re watching and how they rank it.'
            : 'The people you follow haven’t ranked anything yet.'}
        </p>
        <button onClick={onFindPeople} className="mt-4 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-neutral-950 hover:bg-neutral-200">
          Find people
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {feed.items.map(r => {
        const watchlist = r.status === 'WANT_TO_WATCH'
        const s = SENTIMENT[r.sentiment ?? 'LIKED'] ?? SENTIMENT.LIKED
        const first = r.user.displayName.split(' ')[0]
        return (
          <article key={r.id} className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <div className="flex items-center gap-3">
              <Link href={`/u/${r.user.username}`}><PersonAvatar person={r.user} size="sm" /></Link>
              <div className="min-w-0 flex-1 text-sm">
                <p>
                  <Link href={`/u/${r.user.username}`} className="font-semibold hover:underline">{r.user.displayName}</Link>{' '}
                  <span className="text-neutral-400">{watchlist ? 'wants to watch' : 'ranked'}</span>{' '}
                  <span className="font-medium">{r.movie.title}</span>
                </p>
                <p className="text-xs text-neutral-500">{timeAgo(new Date(r.createdAt))}</p>
              </div>
              <Link
                href={`/movie-night?with=${encodeURIComponent(r.user.username)}`}
                title={`Movie night with ${first}`}
                className="rounded-full p-2 text-neutral-500 hover:bg-red-500/10 hover:text-red-400"
              >
                <Popcorn size={18} />
              </Link>
            </div>

            <div className="mt-4 flex gap-4">
              <div className="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded-md bg-neutral-800">
                {r.movie.posterPath && <Image src={getImageUrl(r.movie.posterPath)} alt={r.movie.title} fill sizes="64px" className="object-cover" />}
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold leading-tight">
                  {r.movie.title} <span className="text-sm font-normal text-neutral-500">{r.movie.releaseYear}</span>
                </h3>
                {watchlist ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-neutral-400"><Bookmark size={14} /> On {first}&apos;s watchlist</p>
                ) : (
                  <div className="mt-2 flex flex-wrap items-end gap-6">
                    <div>
                      <p className="text-[11px] text-neutral-500">{first}&apos;s score</p>
                      <p className="text-lg font-semibold tabular-nums text-red-400">{r.score ?? '–'}</p>
                    </div>
                    {r.myScore != null && (
                      <div>
                        <p className="text-[11px] text-neutral-500">Your score</p>
                        <p className="text-lg font-semibold tabular-nums">{r.myScore}</p>
                      </div>
                    )}
                    <span className={`mb-1 inline-block rounded-full px-2 py-0.5 text-xs ${s.cls}`}>{s.label}</span>
                  </div>
                )}
              </div>
            </div>

            {r.review && <p className="mt-4 text-sm leading-relaxed text-neutral-200">&ldquo;{r.review}&rdquo;</p>}
            {r.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {r.tags.map(t => <span key={t} className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs text-neutral-300">{t}</span>)}
              </div>
            )}
            {r.photoUrl && (
              <button onClick={() => setLightbox({ url: r.photoUrl!, caption: r.movie.title })} className="relative mt-4 block h-64 w-full overflow-hidden rounded-xl bg-neutral-800">
                <Image src={r.photoUrl} alt={`Photo for ${r.movie.title}`} fill sizes="(max-width: 768px) 100vw, 700px" className="object-cover" />
              </button>
            )}
          </article>
        )
      })}
      {lightbox && <PhotoLightbox url={lightbox.url} caption={lightbox.caption} onClose={() => setLightbox(null)} />}
    </div>
  )
}
