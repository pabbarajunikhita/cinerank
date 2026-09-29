'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Link2, Sparkles, Users } from 'lucide-react'
import { getImageUrl } from '@/lib/tmdb'

interface Recommendation {
  title: string
  reason: string
  tmdbId: number
  posterPath: string | null
  releaseDate: string
}

export default function DiscoverRail({ username, rankedCount }: { username: string | null; rankedCount: number }) {
  const [recs, setRecs] = useState<Recommendation[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  const loadRecs = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/recommendations')
      const data = await res.json()
      if (!res.ok) setError(data.error ?? 'Could not get recommendations')
      else setRecs(data.recommendations)
    } catch {
      setError('Could not get recommendations')
    } finally {
      setLoading(false)
    }
  }

  const copyProfile = async () => {
    if (!username) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/u/${username}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked; ignore */ }
  }

  return (
    <div className="space-y-6">
      {/* Recommendations */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-neutral-700 text-orange-400">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="font-semibold">For you</h3>
            <p className="text-sm text-neutral-400">Picks based on how you rank, not just what you watch.</p>
          </div>
        </div>

        {recs ? (
          <ul className="mt-4 space-y-3">
            {recs.map(rec => (
              <li key={rec.tmdbId}>
                <button
                  onClick={() => setOpenId(openId === rec.tmdbId ? null : rec.tmdbId)}
                  className="flex w-full gap-3 text-left group"
                >
                  <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded bg-neutral-800">
                    {rec.posterPath && (
                      <Image src={getImageUrl(rec.posterPath)} alt={rec.title} fill className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium group-hover:text-orange-300 truncate">{rec.title}</p>
                    <p className="text-xs text-neutral-500">{rec.releaseDate?.slice(0, 4)}</p>
                    <p className={`mt-1 text-xs text-neutral-300 ${openId === rec.tmdbId ? '' : 'line-clamp-2'}`}>
                      {rec.reason}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <button
              onClick={loadRecs}
              disabled={loading || rankedCount < 3}
              className="mt-4 text-sm font-semibold text-orange-400 hover:text-orange-300 disabled:text-neutral-500"
            >
              {loading ? 'Finding movies…' : 'Get recommendations'}
            </button>
            {rankedCount < 3 && (
              <p className="mt-1 text-xs text-neutral-500">Rank {3 - rankedCount} more to unlock.</p>
            )}
          </>
        )}
        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      </div>

      {/* Share / friends */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-neutral-700 text-orange-400">
            <Users size={18} />
          </div>
          <div>
            <h3 className="font-semibold">Friends</h3>
            <p className="text-sm text-neutral-400">
              See how your rankings stack up. Share your profile to compare taste.
            </p>
          </div>
        </div>
        <button
          onClick={copyProfile}
          disabled={!username}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-400 hover:text-orange-300 disabled:text-neutral-500"
        >
          <Link2 size={15} /> {copied ? 'Link copied!' : 'Copy profile link'}
        </button>
      </div>
    </div>
  )
}
