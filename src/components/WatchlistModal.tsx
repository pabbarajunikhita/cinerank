'use client'

import { TMDBMovie, getImageUrl } from '@/lib/tmdb'
import Image from 'next/image'
import { X } from 'lucide-react'

interface WatchlistModalProps {
  movie: TMDBMovie
  onSave: (priority: 'HIGH' | 'MEDIUM' | 'LOW') => void
  onClose: () => void
}

export default function WatchlistModal({ movie, onSave, onClose }: WatchlistModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-2xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white"
        >
          <X size={20} />
        </button>

        {/* Movie header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-16 relative flex-shrink-0 rounded overflow-hidden bg-neutral-700">
            {movie.poster_path ? (
              <Image
                src={getImageUrl(movie.poster_path)}
                alt={movie.title}
                fill
                className="object-cover"
              />
            ) : null}
          </div>
          <div>
            <h2 className="font-bold text-lg">{movie.title}</h2>
            <p className="text-neutral-400 text-sm">{movie.release_date?.slice(0, 4)}</p>
          </div>
        </div>

        <h3 className="text-lg font-semibold mb-4">How badly do you want to watch this?</h3>

        <div className="space-y-3">
          <button
            onClick={() => onSave('HIGH')}
            className="w-full p-4 rounded-xl border border-neutral-700 hover:border-red-500 hover:bg-red-500/10 transition-all text-left flex items-center gap-3"
          >
            <span className="text-2xl">🔥</span>
            <div>
              <p className="font-medium">High priority</p>
              <p className="text-neutral-400 text-sm">Need to watch ASAP</p>
            </div>
          </button>

          <button
            onClick={() => onSave('MEDIUM')}
            className="w-full p-4 rounded-xl border border-neutral-700 hover:border-yellow-500 hover:bg-yellow-500/10 transition-all text-left flex items-center gap-3"
          >
            <span className="text-2xl">👀</span>
            <div>
              <p className="font-medium">Medium priority</p>
              <p className="text-neutral-400 text-sm">Want to watch eventually</p>
            </div>
          </button>

          <button
            onClick={() => onSave('LOW')}
            className="w-full p-4 rounded-xl border border-neutral-700 hover:border-neutral-500 hover:bg-neutral-500/10 transition-all text-left flex items-center gap-3"
          >
            <span className="text-2xl">😴</span>
            <div>
              <p className="font-medium">Low priority</p>
              <p className="text-neutral-400 text-sm">Maybe someday</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}