'use client'

import { useState, useEffect } from 'react'
import MovieSearch from '@/components/MovieSearch'
import MovieCardMenu from '@/components/MovieCardMenu'
import AddMovieModal from '@/components/AddMovieModal'
import { X } from 'lucide-react'
import { TMDBMovie, getImageUrl } from '@/lib/tmdb'
import Image from 'next/image'
import WatchlistModal from '@/components/WatchlistModal'


interface Ranking {
  id: string
  rank: number
  status: string
  sentiment: string | null
  score: number | null
  review: string | null
  tags: string[]
  priority: string | null
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
  const [selectedMovie, setSelectedMovie] = useState<TMDBMovie | null>(null)
  const [editingRanking, setEditingRanking] = useState<Ranking | null>(null)
  const [watchlistMovie, setWatchlistMovie] = useState<TMDBMovie | null>(null)
  const [addingToWatchlist, setAddingToWatchlist] = useState(false)
  const [editingWatchlistId, setEditingWatchlistId] = useState<string | null>(null)


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
    if (status === 'WATCHED') {
      setSelectedMovie(movie)
    } else {
      setWatchlistMovie(movie)
    }
  }

  const handleModalSave = async (data: {
    sentiment: 'LIKED' | 'FINE' | 'DISLIKED'
    score: number
    review: string
    tags: string[]
    rank: number
  }) => {
    if (!selectedMovie) return
  
    await fetch('/api/rankings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        movie: selectedMovie,
        status: 'WATCHED',
        ...data
      })
    })
  
    // If this came from "mark as watched" on a watchlist item, remove the old watchlist entry
    if (editingWatchlistId) {
      await fetch('/api/rankings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rankingId: editingWatchlistId })
      })
      setEditingWatchlistId(null)
    }
  
    setSelectedMovie(null)
    fetchRankings()
  }

  const handleDelete = async (rankingId: string) => {
    await fetch('/api/rankings', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rankingId })
    })
    fetchRankings()
  }

  const handleWatchlistSave = async (priority: 'HIGH' | 'MEDIUM' | 'LOW') => {
    if (!watchlistMovie) return
    await fetch('/api/rankings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movie: watchlistMovie, status: 'WANT_TO_WATCH', priority })
    })
    setWatchlistMovie(null)
    setEditingWatchlistId(null)
    fetchRankings()
  }
  
  const handleEdit = (ranking: Ranking) => {
    setEditingRanking(ranking)
    setSelectedMovie({
      id: parseInt(ranking.movie.id),
      title: ranking.movie.title,
      poster_path: ranking.movie.posterPath,
      release_date: ranking.movie.releaseYear?.toString() ?? '',
      overview: '',
      genre_ids: []
    })
  }


  const handleEditPriority = (ranking: Ranking) => {
    setWatchlistMovie({
      id: parseInt(ranking.movie.id),
      title: ranking.movie.title,
      poster_path: ranking.movie.posterPath,
      release_date: ranking.movie.releaseYear?.toString() ?? '',
      overview: '',
      genre_ids: []
    })
    setEditingWatchlistId(ranking.id)
  }
  
  const handleMarkAsWatched = (ranking: Ranking) => {
    setEditingWatchlistId(ranking.id) // remember which watchlist item to delete later
    setSelectedMovie({
      id: parseInt(ranking.movie.id),
      title: ranking.movie.title,
      poster_path: ranking.movie.posterPath,
      release_date: ranking.movie.releaseYear?.toString() ?? '',
      overview: '',
      genre_ids: []
    })
  }

  const watched = rankings
    .filter(r => r.status === 'WATCHED')
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

  const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
  const watchlist = rankings
    .filter(r => r.status === 'WANT_TO_WATCH')
    .sort((a, b) => {
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3
      return aPriority - bPriority
    })

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
                  {watched.indexOf(ranking) + 1}
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
                  {ranking.priority && (
                    <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                      ranking.priority === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                      ranking.priority === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-neutral-700 text-neutral-400'
                    }`}>
                      {ranking.priority === 'HIGH' ? '🔥 High priority' :
                       ranking.priority === 'MEDIUM' ? '👀 Medium priority' :
                       '😴 Low priority'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-auto">
                  {ranking.score && (
                    <span className="text-2xl font-bold text-red-400">{ranking.score}</span>
                  )}
                  <MovieCardMenu
                    onDelete={() => handleDelete(ranking.id)}
                    onEdit={() => handleEdit(ranking)}
                  />
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
              <div className="flex-1">
                <p className="font-medium">{ranking.movie.title}</p>
                <p className="text-neutral-400 text-sm">{ranking.movie.releaseYear}</p>
              </div>
              <div className="flex items-center gap-3 ml-auto">
                {ranking.priority && (
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                    ranking.priority === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                    ranking.priority === 'MEDIUM' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {ranking.priority === 'HIGH' ? 'High priority' :
                     ranking.priority === 'MEDIUM' ? 'Medium priority' :
                     'Low priority'}
                  </span>
                )}
                <MovieCardMenu
                  editLabel="Change priority"
                  onDelete={() => handleDelete(ranking.id)}
                  onEdit={() => handleEditPriority(ranking)}
                  onMarkWatched={() => handleMarkAsWatched(ranking)}
                />
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

      {/* Modal */}
      {selectedMovie && (
  <AddMovieModal
    movie={selectedMovie}
    existingRankings={watched
      .filter(r => !editingRanking || r.id !== editingRanking.id)
      .map(r => ({
        id: r.id,
        rank: r.rank,
        score: r.score ?? 5,
        sentiment: r.sentiment ?? 'LIKED',
        movie: r.movie
      }))}
    existingData={editingRanking ? {
      sentiment: (editingRanking.sentiment as 'LIKED' | 'FINE' | 'DISLIKED') ?? 'LIKED',
      review: editingRanking.review ?? '',
      tags: editingRanking.tags ?? []
    } : undefined}
    onSave={handleModalSave}
    onClose={() => {
      setSelectedMovie(null)
      setEditingRanking(null)
      setEditingWatchlistId(null)
    }}
  />
)}
      {watchlistMovie && (
        <WatchlistModal
          movie={watchlistMovie}
          onSave={handleWatchlistSave}
          onClose={() => setWatchlistMovie(null)}
        />
        )}
    </div>
  )
}