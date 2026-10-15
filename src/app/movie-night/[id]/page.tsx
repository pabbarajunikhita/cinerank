'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Popcorn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import MovieNightResults, { MovieNight } from '@/components/MovieNightResults'

// The page a friend lands on from a shared link. Works without an account.
export default function SharedMovieNightPage() {
  const { id } = useParams<{ id: string }>()
  const [night, setNight] = useState<MovieNight | null>(null)
  const [me, setMe] = useState<string | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/movie-night/${id}`)
      .then(async res => {
        const data = await res.json()
        if (res.ok) setNight(data)
        else setError(data.error ?? 'Movie night not found')
      })
      .catch(() => setError('Movie night not found'))

    fetch('/api/me')
      .then(res => (res.ok ? res.json() : null))
      .then(data => setMe(data?.username ?? null))
      .catch(() => setMe(null))
  }, [id])

  const isPlanner = !!night && me === night.planner.username
  const isFriend = !!night && me === night.friend.username

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-2">
        <Popcorn className="text-red-500" size={28} />
        <h1 className="text-3xl font-bold">Movie Night</h1>
      </div>

      {error && <p className="text-neutral-400 mt-6">{error}</p>}

      {!night && !error && (
        <div className="space-y-4 mt-8">
          <Skeleton className="h-28 w-full rounded-2xl" />
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-44 w-full rounded-2xl" />)}
        </div>
      )}

      {night && (
        <>
          <p className="text-neutral-400 mb-8">
            {isPlanner
              ? `Your picks for a movie night with ${night.friend.displayName}.`
              : `${night.planner.displayName} found movies you'll both like, based on both of your rankings.`}
          </p>

          <MovieNightResults night={night} viewer={isPlanner ? 'planner' : 'guest'} />

          {me !== undefined && !isPlanner && (
            <div className="mt-10 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-500/10 to-orange-500/10 p-6 text-center">
              {me === null ? (
                <>
                  <p className="font-semibold mb-1">Want picks that fit your taste too?</p>
                  <p className="text-sm text-neutral-400 mb-4">Rank a few movies on CineRank and plan your own movie nights.</p>
                  <Link href="/signup"><Button className="bg-red-500 hover:bg-red-600">Join CineRank</Button></Link>
                </>
              ) : (
                <>
                  <p className="font-semibold mb-4">
                    {isFriend ? `Plan the next one with ${night.planner.displayName.split(' ')[0]}` : 'Plan your own movie night'}
                  </p>
                  <Link href={isFriend ? `/movie-night?with=${encodeURIComponent(night.planner.username)}` : '/movie-night'}>
                    <Button className="bg-red-500 hover:bg-red-600">Start a movie night</Button>
                  </Link>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
