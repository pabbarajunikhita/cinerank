'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { TMDBMovie, getImageUrl } from '@/lib/tmdb'
import Image from 'next/image'
import { Search, Plus, Eye } from 'lucide-react'
import { Button } from './ui/button'

interface MovieSearchProps {
  onAddMovie: (movie: TMDBMovie, status: 'WATCHED' | 'WANT_TO_WATCH') => void
}

export default function MovieSearch({ onAddMovie }: MovieSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TMDBMovie[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)


  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setOpen(false)
      return
    }

    // Debounce — wait 400ms after user stops typing before searching
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const res = await fetch(`/api/movies/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(data.results.slice(0, 6))
      setOpen(true)
      setLoading(false)
    }, 400)

    return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        }
  }, [query])

  return (
    <div className="relative w-full max-w-xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
        <Input
          placeholder="Search for a movie..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-500"
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden z-50 shadow-xl">
          {results.map((movie) => (
            <div
              key={movie.id}
              className="flex items-center gap-3 p-3 hover:bg-neutral-800 transition-colors"
            >
              {/* Movie poster */}
              <div className="w-10 h-14 relative flex-shrink-0 rounded overflow-hidden bg-neutral-700">
                {movie.poster_path ? (
                  <Image
                    src={getImageUrl(movie.poster_path)}
                    alt={movie.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-500 text-xs">
                    No img
                  </div>
                )}
              </div>

              {/* Movie info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{movie.title}</p>
                <p className="text-neutral-400 text-xs">
                  {movie.release_date?.slice(0, 4) || 'Unknown year'}
                </p>
              </div>

              {/* Add buttons */}
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs border-neutral-600 text-neutral-300 hover:text-white h-7 px-2"
                  onClick={() => {
                    onAddMovie(movie, 'WANT_TO_WATCH')
                    setQuery('')
                    setOpen(false)
                  }}
                >
                  <Eye size={12} className="mr-1" /> Watchlist
                </Button>
                <Button
                  size="sm"
                  className="text-xs bg-red-500 hover:bg-red-600 h-7 px-2"
                  onClick={() => {
                    onAddMovie(movie, 'WATCHED')
                    setQuery('')
                    setOpen(false)
                  }}
                >
                  <Plus size={12} className="mr-1" /> Watched
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="absolute top-full mt-2 w-full bg-neutral-900 border border-neutral-700 rounded-xl p-4 text-center text-neutral-400 text-sm">
          Searching...
        </div>
      )}
    </div>
  )
}