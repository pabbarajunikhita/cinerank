'use client'

import { useState } from 'react'
import { getImageUrl } from '@/lib/tmdb'
import Image from 'next/image'
import { X } from 'lucide-react'

interface Recommendation {
  title: string
  reason: string
  tmdbId: number
  posterPath: string | null
  releaseDate: string
  overview: string
}

interface RecommendationsRowProps {
  recommendations: Recommendation[]
}

export default function RecommendationsRow({ recommendations }: RecommendationsRowProps) {
  const [selected, setSelected] = useState<Recommendation | null>(null)

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Your Recommendations</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {recommendations.map((rec) => (
          <button
            key={rec.tmdbId}
            onClick={() => setSelected(rec)}
            className="flex-shrink-0 w-32 text-left group"
          >
            <div className="w-32 h-48 relative rounded-lg overflow-hidden bg-neutral-800 group-hover:opacity-80 transition-opacity">
              {rec.posterPath ? (
                <Image
                  src={getImageUrl(rec.posterPath)}
                  alt={rec.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-500 text-xs">
                  No img
                </div>
              )}
            </div>
            <p className="text-sm font-medium mt-2 truncate">{rec.title}</p>
            <p className="text-xs text-neutral-400">{rec.releaseDate?.slice(0, 4)}</p>
          </button>
        ))}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-2xl w-full max-w-md p-6 relative max-h-[80vh] overflow-y-auto">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="flex gap-4 mb-4">
              <div className="w-24 h-36 relative flex-shrink-0 rounded-lg overflow-hidden bg-neutral-800">
                {selected.posterPath ? (
                  <Image
                    src={getImageUrl(selected.posterPath)}
                    alt={selected.title}
                    fill
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div>
                <h3 className="font-bold text-lg">{selected.title}</h3>
                <p className="text-neutral-400 text-sm">{selected.releaseDate?.slice(0, 4)}</p>
              </div>
            </div>

            <div className="mb-4 p-3 bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-xl">
              <p className="text-xs font-semibold text-red-400 mb-1">Why you'll love this</p>
              <p className="text-sm text-neutral-200">{selected.reason}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-neutral-400 mb-1">Plot summary</p>
              <p className="text-sm text-neutral-300 leading-relaxed">{selected.overview}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}