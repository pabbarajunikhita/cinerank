const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500'

// TMDB issues two kinds of credentials: a 32-char v3 "API key" (sent as ?api_key=)
// and a long v4 "Read Access Token" (sent as a Bearer header). Support both.
async function tmdbFetch(path: string, params: Record<string, string> = {}) {
  const key = process.env.TMDB_API_KEY?.trim().replace(/^"|"$/g, '')
  if (!key) throw new Error('TMDB_API_KEY is not set')

  const isV4Token = key.length > 40
  const url = new URL(`${TMDB_BASE_URL}${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  if (!isV4Token) url.searchParams.set('api_key', key)

  const response = await fetch(url, {
    headers: isV4Token ? { Authorization: `Bearer ${key}`, accept: 'application/json' } : { accept: 'application/json' },
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(`TMDB ${response.status}: ${data?.status_message ?? 'request failed'}`)
  }
  return data
}

export interface TMDBMovie {
  id: number
  title: string
  poster_path: string | null
  release_date: string
  overview: string
  genre_ids: number[]
}

export interface TMDBMovieDetails {
  id: number
  title: string
  poster_path: string | null
  release_date: string
  overview: string
  genres: { id: number; name: string }[]
}

export function getImageUrl(posterPath: string | null): string {
  if (!posterPath) return '/no-poster.png'
  return `${TMDB_IMAGE_BASE_URL}${posterPath}`
}

export async function searchMovies(query: string): Promise<TMDBMovie[]> {
  const data = await tmdbFetch('/search/movie', { query, include_adult: 'false' })
  return data.results || []
}

export async function getMovieDetails(tmdbId: number): Promise<TMDBMovieDetails> {
  return tmdbFetch(`/movie/${tmdbId}`)
}
