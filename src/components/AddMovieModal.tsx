'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { TMDBMovie, getImageUrl } from '@/lib/tmdb'
import Image from 'next/image'
import { X } from 'lucide-react'

interface ExistingRanking {
  id: string
  rank: number
  score: number
  sentiment: string
  movie: {
    id: string
    title: string
    posterPath: string | null
    releaseYear: number | null
  }
}

interface AddMovieModalProps {
  movie: TMDBMovie
  existingRankings: ExistingRanking[]
  onSave: (data: {
    sentiment: 'LIKED' | 'FINE' | 'DISLIKED'
    score: number
    review: string
    tags: string[]
    rank: number
  }) => void
  onClose: () => void
}

const VIBE_TAGS = [
  'Mind-bending', 'Feel-good', 'Thriller', 'Emotional',
  'Action-packed', 'Slow burn', 'Funny', 'Scary',
  'Inspiring', 'Dark', 'Romantic', 'Thought-provoking'
]

const SENTIMENT_RANGES = {
  LIKED: { min: 7, max: 10 },
  FINE: { min: 4, max: 7 },
  DISLIKED: { min: 0, max: 4 },
}

// Binary search algorithm to find the right rank
function calculateScoreFromPosition(
  position: number,
  totalInBucket: number,
  min: number,
  max: number
): number {
  if (totalInBucket === 0) return (min + max) / 2
  const range = max - min
  const score = max - (position / (totalInBucket + 1)) * range
  return Math.round(score * 10) / 10
}

export default function AddMovieModal({
  movie,
  existingRankings,
  onSave,
  onClose,
}: AddMovieModalProps) {
  const [step, setStep] = useState<'sentiment' | 'compare' | 'details'>('sentiment')
  const [sentiment, setSentiment] = useState<'LIKED' | 'FINE' | 'DISLIKED' | null>(null)
  const [review, setReview] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // Binary search state
  const [low, setLow] = useState(0)
  const [high, setHigh] = useState(0)
  const [mid, setMid] = useState(0)
  const [bucketMovies, setBucketMovies] = useState<ExistingRanking[]>([])
  const [finalPosition, setFinalPosition] = useState(0)

  const handleSentimentSelect = (s: 'LIKED' | 'FINE' | 'DISLIKED') => {
    setSentiment(s)

    // Filter existing movies in same sentiment bucket
    const bucket = existingRankings.filter(r => r.sentiment === s)
    setBucketMovies(bucket)

    if (bucket.length === 0) {
      // No comparisons needed, go straight to details
      setFinalPosition(0)
      setStep('details')
    } else {
      // Start binary search
      const newLow = 0
      const newHigh = bucket.length
      const newMid = Math.floor((newLow + newHigh) / 2)
      setLow(newLow)
      setHigh(newHigh)
      setMid(newMid)
      setStep('compare')
    }
  }

  const handleComparison = (newMovieBetter: boolean) => {
    let newLow = low
    let newHigh = high

    if (newMovieBetter) {
      newHigh = mid
    } else {
      newLow = mid + 1
    }

    setLow(newLow)
    setHigh(newHigh)

    if (newLow >= newHigh) {
      // Found the position!
      setFinalPosition(newLow)
      setStep('details')
    } else {
      const newMid = Math.floor((newLow + newHigh) / 2)
      setMid(newMid)
    }
  }

  const handleSave = () => {
    if (!sentiment) return

    const { min, max } = SENTIMENT_RANGES[sentiment]
    const score = calculateScoreFromPosition(finalPosition, bucketMovies.length, min, max)

    onSave({
      sentiment,
      score,
      review,
      tags: selectedTags,
      rank: finalPosition,
    })
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-2xl w-full max-w-md p-6 relative">
        {/* Close button */}
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

        {/* Step 1: Sentiment */}
        {step === 'sentiment' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">How was it?</h3>
            <div className="space-y-3">
              <button
                onClick={() => handleSentimentSelect('LIKED')}
                className="w-full p-4 rounded-xl border border-neutral-700 hover:border-green-500 hover:bg-green-500/10 transition-all text-left flex items-center gap-3"
              >
                <span className="text-2xl">👍</span>
                <div>
                  <p className="font-medium">I liked it</p>
                </div>
              </button>
              <button
                onClick={() => handleSentimentSelect('FINE')}
                className="w-full p-4 rounded-xl border border-neutral-700 hover:border-yellow-500 hover:bg-yellow-500/10 transition-all text-left flex items-center gap-3"
              >
                <span className="text-2xl">😐</span>
                <div>
                  <p className="font-medium">It was fine</p>
                </div>
              </button>
              <button
                onClick={() => handleSentimentSelect('DISLIKED')}
                className="w-full p-4 rounded-xl border border-neutral-700 hover:border-red-500 hover:bg-red-500/10 transition-all text-left flex items-center gap-3"
              >
                <span className="text-2xl">👎</span>
                <div>
                  <p className="font-medium">I didn't like it</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Head to head comparison */}
        {step === 'compare' && bucketMovies[mid] && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center">Which did you prefer?</h3>
            <p className="text-neutral-400 text-sm text-center">
              Comparing {finalPosition + 1} of ~{Math.ceil(Math.log2(bucketMovies.length + 1))} comparisons
            </p>
            <div className="grid grid-cols-2 gap-3">
              {/* New movie */}
              <button
                onClick={() => handleComparison(true)}
                className="p-4 rounded-xl border border-neutral-700 hover:border-red-500 hover:bg-red-500/10 transition-all flex flex-col items-center gap-2"
              >
                <div className="w-16 h-24 relative rounded overflow-hidden bg-neutral-700">
                  {movie.poster_path ? (
                    <Image
                      src={getImageUrl(movie.poster_path)}
                      alt={movie.title}
                      fill
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <p className="text-sm font-medium text-center">{movie.title}</p>
                <span className="text-xs text-neutral-400">NEW</span>
              </button>

              {/* Existing movie */}
              <button
                onClick={() => handleComparison(false)}
                className="p-4 rounded-xl border border-neutral-700 hover:border-red-500 hover:bg-red-500/10 transition-all flex flex-col items-center gap-2"
              >
                <div className="w-16 h-24 relative rounded overflow-hidden bg-neutral-700">
                  {bucketMovies[mid].movie.posterPath ? (
                    <Image
                      src={getImageUrl(bucketMovies[mid].movie.posterPath)}
                      alt={bucketMovies[mid].movie.title}
                      fill
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <p className="text-sm font-medium text-center">{bucketMovies[mid].movie.title}</p>
                <span className="text-xs text-neutral-400">{bucketMovies[mid].movie.releaseYear}</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {step === 'details' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Any thoughts?</h3>

            <textarea
              placeholder="Write a short review... (optional)"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-sm text-white placeholder:text-neutral-500 resize-none h-24 focus:outline-none focus:border-neutral-500"
            />

            <div>
              <p className="text-sm text-neutral-400 mb-2">Vibe tags (optional)</p>
              <div className="flex flex-wrap gap-2">
                {VIBE_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`text-xs px-3 py-1 rounded-full border transition-all ${
                      selectedTags.includes(tag)
                        ? 'border-red-500 bg-red-500/20 text-white'
                        : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleSave}
              className="w-full bg-red-500 hover:bg-red-600"
            >
              Save to my rankings
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}