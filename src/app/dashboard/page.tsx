'use client'

import { useState, useEffect } from 'react'
import MovieSearch from '@/components/MovieSearch'
import { TMDBMovie, getImageUrl } from '@/lib/tmdb'
import Image from 'next/image'

interface Ranking {
  id: string
  rank: number
  status: string
  movie: {
    id: string
    title: string
    posterPath: string | null
    releaseYear: number | null
  }
}

export default function DashboardPage() {
  const [rankings, setRankings] = useState<Ranking[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRankings = async () => {
    const res = await fetch('/api/rankings')
    const data = await res.json()
    setRankings(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchRankings()
  }, [])

  const handleAddMovie = async (movie: TMDBMovie, status: 'WATCHED' | 'WANT_TO_WATCH') => {
    await fetch('/api/rankings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movie, status })
    })
    fetchRankings()
  }

  const watched = rankings.filter(r => r.status === 'WATCHED')
  const watchlist = rankings.filter(r => r.status === 'WANT_TO_WATCH')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">My Rankings</h1>
        <p className="text-neutral-400 mb-6">Search for movies to add to your list</p>
        <MovieSearch onAddMovie={handleAddMovie} />
      </div>

      {/* Watched / Ranked movies */}
      {watched.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Watched</h2>
          <div className="space-y-3">
            {watched.map((ranking) => (
              <div key={ranking.id} className="flex items-center gap-4 p-3 bg-neutral-900 rounded-xl">
                <span className="text-2xl font-bold text-neutral-500 w-8 text-center">
                  {ranking.rank}
                </span>
                <div className="w-10 h-14 relative flex-shrink-0 rounded overflow-hidden bg-neutral-700">
                  {ranking.movie.posterPath ? (
                    <Image
                      src={getImageUrl(ranking.movie.posterPath)}
                      alt={ranking.movie.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-500 text-xs">
                      No img
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium">{ranking.movie.title}</p>
                  <p className="text-neutral-400 text-sm">{ranking.movie.releaseYear}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Watchlist */}
      {watchlist.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Watchlist</h2>
          <div className="space-y-3">
            {watchlist.map((ranking) => (
              <div key={ranking.id} className="flex items-center gap-4 p-3 bg-neutral-900 rounded-xl">
                <div className="w-10 h-14 relative flex-shrink-0 rounded overflow-hidden bg-neutral-700">
                  {ranking.movie.posterPath ? (
                    <Image
                      src={getImageUrl(ranking.movie.posterPath)}
                      alt={ranking.movie.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-500 text-xs">
                      No img
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium">{ranking.movie.title}</p>
                  <p className="text-neutral-400 text-sm">{ranking.movie.releaseYear}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && watched.length === 0 && watchlist.length === 0 && (
        <p className="text-neutral-500 text-center py-12">
          Search for a movie above to get started!
        </p>
      )}
    </div>
  )
}