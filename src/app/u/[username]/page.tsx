'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { getImageUrl } from '@/lib/tmdb'
import Image from 'next/image'
import RecommendationsRow from '@/components/RecommendationsRow'

interface ProfileRanking {
  id: string
  rank: number
  status: string
  score: number | null
  tags: string[]
  priority: string | null
  movie: {
    id: string
    title: string
    posterPath: string | null
    releaseYear: number | null
  }
}

interface Profile {
  username: string
  displayName: string
  bio: string | null
  avatarUrl: string | null
  rankings: ProfileRanking[]
}

export default function ProfilePage() {
  const params = useParams()
  const username = params.username as string
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [loadingRecs, setLoadingRecs] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      const res = await fetch(`/api/profile/${username}`)
      if (res.status === 404) {
        setNotFound(true)
        setLoading(false)
        return
      }
      const data = await res.json()
      setProfile(data)
      setLoading(false)
    }
    fetchProfile()
  }, [username])

  if (loading) {
    return <div className="text-center py-20 text-neutral-400">Loading...</div>
  }

  if (notFound || !profile) {
    return (
      <div className="text-center py-20">
        <p className="text-2xl font-bold mb-2">User not found</p>
        <p className="text-neutral-400">This profile doesn't exist.</p>
      </div>
    )
  }
  const fetchRecommendations = async () => {
    setLoadingRecs(true)
    const res = await fetch('/api/recommendations')
    if (res.ok) {
      const data = await res.json()
      setRecommendations(data.recommendations)
    }
    setLoadingRecs(false)
  }

  const watched = profile.rankings
    .filter(r => r.status === 'WATCHED')
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

  const watchlist = profile.rankings.filter(r => r.status === 'WANT_TO_WATCH')

  const avgScore = watched.length > 0
    ? (watched.reduce((sum, r) => sum + (r.score ?? 0), 0) / watched.length).toFixed(1)
    : 0

  // Calculate favorite tags
  const tagCounts: Record<string, number> = {}
  watched.forEach(r => r.tags.forEach(tag => {
    tagCounts[tag] = (tagCounts[tag] || 0) + 1
  }))
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag)

  return (
    <div className="space-y-8">
      {/* Profile header */}
      {/* Profile header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-neutral-800 flex items-center justify-center text-2xl font-bold flex-shrink-0">
            {profile.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{profile.displayName}</h1>
            <p className="text-neutral-400">@{profile.username}</p>
            {profile.bio && <p className="text-neutral-300 mt-1 text-sm">{profile.bio}</p>}
          </div>
        </div>
        <button
          onClick={fetchRecommendations}
          disabled={loadingRecs}
          className="text-sm bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-2 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex-shrink-0"
        >
          {loadingRecs ? 'Analyzing...' : '✨ My Recommendations'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-neutral-900 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{watched.length}</p>
          <p className="text-neutral-400 text-sm">Watched</p>
        </div>
        <div className="bg-neutral-900 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{avgScore}</p>
          <p className="text-neutral-400 text-sm">Avg Score</p>
        </div>
        <div className="bg-neutral-900 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{watchlist.length}</p>
          <p className="text-neutral-400 text-sm">Watchlist</p>
        </div>
      </div>

      {/* Top tags */}
      {topTags.length > 0 && (
        <div>
          <p className="text-neutral-400 text-sm mb-2">Favorite vibes</p>
          <div className="flex gap-2">
            {topTags.map(tag => (
              <span key={tag} className="text-sm bg-red-500/10 text-red-400 px-3 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {recommendations.length > 0 && (
        <RecommendationsRow recommendations={recommendations} />
      )}
      {/* Watched movies */}
      {watched.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Top Ranked Movies</h2>
          <div className="space-y-3">
            {watched.map((ranking, i) => (
              <div key={ranking.id} className="flex items-center gap-4 p-3 bg-neutral-900 rounded-xl">
                <span className="text-2xl font-bold text-neutral-500 w-8 text-center">
                  {i + 1}
                </span>
                <div className="w-10 h-14 relative flex-shrink-0 rounded overflow-hidden bg-neutral-700">
                  {ranking.movie.posterPath ? (
                    <Image
                      src={getImageUrl(ranking.movie.posterPath)}
                      alt={ranking.movie.title}
                      fill
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{ranking.movie.title}</p>
                  <p className="text-neutral-400 text-sm">{ranking.movie.releaseYear}</p>
                </div>
                {ranking.score && (
                  <span className="text-xl font-bold text-red-400">{ranking.score}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {watched.length === 0 && watchlist.length === 0 && (
        <p className="text-neutral-500 text-center py-12">
          No movies ranked yet.
        </p>
      )}
    </div>
  )
}