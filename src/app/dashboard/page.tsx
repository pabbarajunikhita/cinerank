'use client'

import { useState, useEffect } from 'react'
import MovieSearch from '@/components/MovieSearch'
import MovieCardMenu from '@/components/MovieCardMenu'
import AddMovieModal from '@/components/AddMovieModal'
import { X } from 'lucide-react'
import { TMDBMovie, getImageUrl } from '@/lib/tmdb'
import Image from 'next/image'
import WatchlistModal from '@/components/WatchlistModal'
import ProfileCard from '@/components/dashboard/ProfileCard'
import DiscoverRail from '@/components/dashboard/DiscoverRail'
import { Skeleton } from '@/components/ui/skeleton'


interface Ranking {
  id: string
  rank: number
  status: string
  sentiment: string | null
  score: number | null
  review: string | null
  tags: string[]
  priority: string | null
  createdAt: string
  watchedAt: string | null
  photoUrl: string | null
  movie: {
    id: string
    title: string
    posterPath: string | null
    releaseYear: number | null
  }
}

const SENTIMENT_STYLE: Record<string, { label: string; dot: string; badge: string }> = {
  LIKED: { label: 'Liked', dot: 'bg-emerald-400', badge: 'bg-emerald-500/15 text-emerald-300' },
  FINE: { label: 'Fine', dot: 'bg-amber-400', badge: 'bg-amber-500/15 text-amber-300' },
  DISLIKED: { label: "Didn't like", dot: 'bg-neutral-500', badge: 'bg-neutral-700/60 text-neutral-300' },
}

/** "Watched Sep 29, 2026", or "Ranked …" for rankings saved before watch dates existed. */
function formatWatched(r: { watchedAt: string | null; createdAt: string }) {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
  if (r.watchedAt) return `Watched ${new Date(r.watchedAt).toLocaleDateString(undefined, { ...opts, timeZone: 'UTC' })}`
  return `Ranked ${new Date(r.createdAt).toLocaleDateString(undefined, opts)}`
}

function Poster({ path, title, size = 'md' }: { path: string | null; title: string; size?: 'md' | 'lg' }) {
  return (
  <div className={`${size === 'lg' ? 'w-14 h-20' : 'w-11 h-16'} relative flex-shrink-0 rounded-md overflow-hidden bg-neutral-800`}>
    {path ? (
      <Image src={getImageUrl(path)} alt={title} fill className="object-cover" />
    ) : (
      <div className="w-full h-full flex items-center justify-center text-neutral-500 text-[10px]">No img</div>
    )}
  </div>
  )
}


export default function DashboardPage() {
  const [rankings, setRankings] = useState<Ranking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMovie, setSelectedMovie] = useState<TMDBMovie | null>(null)
  const [editingRanking, setEditingRanking] = useState<Ranking | null>(null)
  const [watchlistMovie, setWatchlistMovie] = useState<TMDBMovie | null>(null)
  const [addingToWatchlist, setAddingToWatchlist] = useState(false)
  const [editingWatchlistId, setEditingWatchlistId] = useState<string | null>(null)
  const [tasteProfile, setTasteProfile] = useState<string | null>(null)
  const [loadingTasteProfile, setLoadingTasteProfile] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [tasteError, setTasteError] = useState<string | null>(null)
  const [me, setMe] = useState<{ displayName: string; username: string; avatarUrl: string | null } | null>(null)
  const [tab, setTab] = useState<'ranked' | 'watchlist'>('ranked')
  const [lightbox, setLightbox] = useState<{ url: string; title: string } | null>(null)


  const fetchRankings = async () => {
    const res = await fetch('/api/rankings')
    const data = await res.json()
    if (!res.ok || !Array.isArray(data)) {
      setSaveError(data?.error ?? 'Could not load your rankings')
      setLoading(false)
      return
    }
    setRankings(data)
    setLoading(false)
  }

  const fetchTasteProfile = async () => {
    setLoadingTasteProfile(true)
    setTasteError(null)
    try {
      const res = await fetch('/api/taste-profile')
      const data = await res.json()
      if (res.ok) setTasteProfile(data.tasteProfile)
      else setTasteError(data.error ?? 'Could not generate your taste profile')
    } catch {
      setTasteError('Could not generate your taste profile')
    }
    setLoadingTasteProfile(false)
  }


  useEffect(() => {
    fetchRankings()
    fetch('/api/me')
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (data) setMe(data) })
      .catch(() => {})
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
    review: string
    tags: string[]
    position: number
    watchedAt: string
    photoUrl: string | null
  }) => {
    if (!selectedMovie) return
    setSaveError(null)
  
    const res = await fetch('/api/rankings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        movie: selectedMovie,
        status: 'WATCHED',
        ...data
      })
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setSaveError(`Couldn't save "${selectedMovie.title}": ${body.error ?? res.statusText}`)
      setSelectedMovie(null)
      return
    }
  
    // "Mark as watched" needs no cleanup: the watchlist row itself was updated to WATCHED.
    setEditingWatchlistId(null)
    setEditingRanking(null)
  
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
    setSaveError(null)
    const res = await fetch('/api/rankings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movie: watchlistMovie, status: 'WANT_TO_WATCH', priority })
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setSaveError(`Couldn't add "${watchlistMovie.title}" to watchlist: ${body.error ?? res.statusText}`)
      setWatchlistMovie(null)
      return
    }
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
    // same order the server uses to place new movies (score, then rank as tiebreak)
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.rank - b.rank)

  const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
  const watchlist = rankings
    .filter(r => r.status === 'WANT_TO_WATCH')
    .sort((a, b) => {
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3
      return aPriority - bPriority
    })

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)_280px] items-start">
        {/* Left: profile */}
        <aside className="lg:sticky lg:top-6">
          <ProfileCard
            user={me}
            watched={watched}
            watchlistCount={watchlist.length}
            tasteProfile={tasteProfile}
            tasteError={tasteError}
            loadingTasteProfile={loadingTasteProfile}
            onTasteProfile={fetchTasteProfile}
          />
        </aside>

        {/* Center: rankings */}
        <section className="min-w-0 space-y-5">
          <div>
            <h1 className="text-3xl font-bold">My Rankings</h1>
            <p className="text-neutral-400 mt-1 mb-4">Search a movie, then rank it head-to-head against ones you&apos;ve seen.</p>
            <MovieSearch onAddMovie={handleAddMovie} />
          </div>

          {saveError && (
            <div className="flex items-start justify-between gap-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <span>{saveError}</span>
              <button onClick={() => setSaveError(null)} className="text-red-300 hover:text-white">✕</button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-6 border-b border-neutral-800">
            {([
              ['ranked', `Ranked`, watched.length],
              ['watchlist', `Watchlist`, watchlist.length],
            ] as const).map(([key, label, count]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`-mb-px border-b-2 pb-3 text-sm font-semibold transition-colors ${
                  tab === key ? 'border-orange-500 text-white' : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                {label} <span className="ml-1 text-neutral-500 font-normal">{count}</span>
              </button>
            ))}
          </div>

          {loading && (
            <div className="space-y-3">
              {[0, 1, 2].map(i => <Skeleton key={i} className="h-24 rounded-2xl bg-neutral-900" />)}
            </div>
          )}

          {/* Ranked list */}
          {!loading && tab === 'ranked' && (
            watched.length > 0 ? (
              <ol className="space-y-3">
                {watched.map((ranking, i) => {
                  const style = SENTIMENT_STYLE[ranking.sentiment ?? 'LIKED'] ?? SENTIMENT_STYLE.LIKED
                  return (
                    <li
                      key={ranking.id}
                      className="flex items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-3 pr-2 hover:border-neutral-700 transition-colors"
                    >
                      <span className={`w-8 text-center text-2xl font-bold tabular-nums ${i < 3 ? 'text-orange-400' : 'text-neutral-600'}`}>
                        {i + 1}
                      </span>
                      <Poster path={ranking.movie.posterPath} title={ranking.movie.title} size="lg" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{ranking.movie.title}</p>
                        <p className="text-sm text-neutral-400">
                          {ranking.movie.releaseYear}
                          <span className="text-neutral-600"> · </span>
                          {formatWatched(ranking)}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${style.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} /> {style.label}
                          </span>
                          {ranking.tags.slice(0, 2).map(t => (
                            <span key={t} className="rounded-full bg-neutral-800 px-2 py-0.5 text-[11px] text-neutral-300">{t}</span>
                          ))}
                        </div>
                      </div>
                      {ranking.photoUrl && (
                        <button
                          onClick={() => setLightbox({ url: ranking.photoUrl!, title: ranking.movie.title })}
                          className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg ring-1 ring-neutral-700 hover:ring-orange-400 transition"
                          aria-label={`View photo for ${ranking.movie.title}`}
                        >
                          <Image src={ranking.photoUrl} alt="" fill sizes="48px" className="object-cover" />
                        </button>
                      )}
                      {ranking.score != null && (
                        <span className="text-2xl font-bold tabular-nums text-red-400">{ranking.score}</span>
                      )}
                      <MovieCardMenu
                        onDelete={() => handleDelete(ranking.id)}
                        onEdit={() => handleEdit(ranking)}
                      />
                    </li>
                  )
                })}
              </ol>
            ) : (
              <div className="rounded-2xl border border-dashed border-neutral-800 px-6 py-12 text-center">
                <p className="text-lg font-semibold">Rank your first movie</p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-400">
                  Search for a movie you&apos;ve seen above. Tell us if you liked it, then pick between it and your other
                  movies. CineRank finds its exact spot and scores it for you.
                </p>
              </div>
            )
          )}

          {/* Watchlist */}
          {!loading && tab === 'watchlist' && (
            watchlist.length > 0 ? (
              <ul className="space-y-3">
                {watchlist.map((ranking) => (
                  <li key={ranking.id} className="flex items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-3 pr-2">
                    <Poster path={ranking.movie.posterPath} title={ranking.movie.title} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{ranking.movie.title}</p>
                      <p className="text-sm text-neutral-400">{ranking.movie.releaseYear}</p>
                    </div>
                    {ranking.priority && (
                      <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                        ranking.priority === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                        ranking.priority === 'MEDIUM' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {ranking.priority === 'HIGH' ? 'High' : ranking.priority === 'MEDIUM' ? 'Medium' : 'Low'}
                      </span>
                    )}
                    <MovieCardMenu
                      editLabel="Change priority"
                      onDelete={() => handleDelete(ranking.id)}
                      onEdit={() => handleEditPriority(ranking)}
                      onMarkWatched={() => handleMarkAsWatched(ranking)}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl border border-dashed border-neutral-800 px-6 py-12 text-center">
                <p className="font-semibold">Your watchlist is empty</p>
                <p className="mt-2 text-sm text-neutral-400">Search a movie and choose &ldquo;Want to watch&rdquo; to save it for later.</p>
              </div>
            )
          )}
        </section>

        {/* Right: discovery */}
        <aside className="lg:sticky lg:top-6">
          <DiscoverRail username={me?.username ?? null} rankedCount={watched.length} />
        </aside>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-h-[85vh] w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-10 right-0 text-neutral-300 hover:text-white"
              aria-label="Close"
            >
              <X size={24} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox.url} alt={lightbox.title} className="mx-auto max-h-[80vh] rounded-xl object-contain" />
            <p className="mt-3 text-center text-sm text-neutral-300">{lightbox.title}</p>
          </div>
        </div>
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
      tags: editingRanking.tags ?? [],
      watchedAt: editingRanking.watchedAt?.slice(0, 10) ?? undefined,
      photoUrl: editingRanking.photoUrl
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