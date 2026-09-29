'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { TMDBMovie, getImageUrl } from '@/lib/tmdb'
import Image from 'next/image'
import { Camera, X } from 'lucide-react'
import { uploadRankingPhoto } from '@/lib/photos'

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
    existingData?: {
      sentiment: 'LIKED' | 'FINE' | 'DISLIKED'
      review: string
      tags: string[]
      watchedAt?: string // YYYY-MM-DD
      photoUrl?: string | null
    }
    onSave: (data: {
      sentiment: 'LIKED' | 'FINE' | 'DISLIKED'
      review: string
      tags: string[]
      position: number // 0-based slot within the sentiment group; the server derives rank + score
      watchedAt: string // YYYY-MM-DD
      photoUrl: string | null
    }) => void
    onClose: () => void
  }

const VIBE_TAGS = [
  'Mind-bending', 'Feel-good', 'Thriller', 'Emotional',
  'Action-packed', 'Slow burn', 'Funny', 'Scary',
  'Inspiring', 'Dark', 'Romantic', 'Thought-provoking'
]

/** YYYY-MM-DD in the user's local timezone (what <input type="date"> uses). */
function localDateString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function AddMovieModal({
  movie,
  existingRankings,
  existingData,
  onSave,
  onClose,
}: AddMovieModalProps) {
    const [step, setStep] = useState<'sentiment' | 'compare' | 'details'>('sentiment')
    const [sentiment, setSentiment] = useState<'LIKED' | 'FINE' | 'DISLIKED' | null>(
        existingData?.sentiment ?? null
    )
    const [review, setReview] = useState(existingData?.review ?? '')
    const [selectedTags, setSelectedTags] = useState<string[]>(existingData?.tags ?? [])
    const today = localDateString(new Date())
    const [watchedAt, setWatchedAt] = useState(existingData?.watchedAt ?? today)
    // photo: either the already-saved URL, or a newly picked file (uploaded on save)
    const [photoUrl, setPhotoUrl] = useState<string | null>(existingData?.photoUrl ?? null)
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const [photoPreview, setPhotoPreview] = useState<string | null>(existingData?.photoUrl ?? null)
    const [saving, setSaving] = useState(false)
    const [photoError, setPhotoError] = useState<string | null>(null)

  // Binary search state over bucketMovies (best-to-worst). Invariant: the new movie
  // belongs somewhere in [low, high]; each comparison halves that range.
  const [low, setLow] = useState(0)
  const [high, setHigh] = useState(0)
  const [mid, setMid] = useState(0)
  const [bucketMovies, setBucketMovies] = useState<ExistingRanking[]>([])
  const [finalPosition, setFinalPosition] = useState(0)
  const [comparisonCount, setComparisonCount] = useState(1)

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
      setComparisonCount(1)
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
      setComparisonCount(c => c + 1)
    }
  }

  const handlePhotoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose an image file')
      return
    }
    setPhotoError(null)
    setPhotoFile(file)
    if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const removePhoto = () => {
    if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
    setPhotoFile(null)
    setPhotoPreview(null)
    setPhotoUrl(null)
  }

  const handleSave = async () => {
    if (!sentiment || saving) return
    setSaving(true)
    setPhotoError(null)

    let finalPhotoUrl = photoUrl
    if (photoFile) {
      try {
        finalPhotoUrl = await uploadRankingPhoto(photoFile)
      } catch (err) {
        setPhotoError(err instanceof Error ? err.message : 'Photo upload failed')
        setSaving(false)
        return
      }
    }

    onSave({
      sentiment,
      review,
      tags: selectedTags,
      position: finalPosition,
      watchedAt,
      photoUrl: finalPhotoUrl,
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
              Comparison {comparisonCount} of ~{Math.ceil(Math.log2(bucketMovies.length + 1))} comparisons
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

            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="text-neutral-400">Watched on</span>
              <input
                type="date"
                value={watchedAt}
                max={today}
                onChange={(e) => setWatchedAt(e.target.value || today)}
                className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-white [color-scheme:dark] focus:outline-none focus:border-neutral-500"
              />
            </label>

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

            <div>
              <p className="text-sm text-neutral-400 mb-2">Photo (optional)</p>
              {photoPreview ? (
                <div className="relative w-full h-48 rounded-xl overflow-hidden bg-neutral-800">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                  <img src={photoPreview} alt="Your photo" className="w-full h-full object-cover" />
                  <button
                    onClick={removePhoto}
                    className="absolute top-2 right-2 rounded-full bg-black/70 p-1.5 text-white hover:bg-black"
                    aria-label="Remove photo"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-700 text-sm text-neutral-400 hover:border-neutral-500 hover:text-white transition-colors">
                  <Camera size={20} />
                  Add a selfie or photo
                  <input type="file" accept="image/*" onChange={handlePhotoPick} className="hidden" />
                </label>
              )}
              {photoError && <p className="mt-2 text-xs text-red-300">{photoError}</p>}
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-red-500 hover:bg-red-600"
            >
              {saving ? 'Saving…' : 'Save to my rankings'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}