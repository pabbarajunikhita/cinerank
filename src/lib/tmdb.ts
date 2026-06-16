const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500'

const headers = {
  Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
  'Content-Type': 'application/json',
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
  const response = await fetch(
    `${TMDB_BASE_URL}/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false`
  )
  const data = await response.json()
  console.log('TMDB response:', JSON.stringify(data).slice(0, 200))
  return data.results || []
}

export async function getMovieDetails(tmdbId: number): Promise<TMDBMovieDetails> {
  const response = await fetch(
    `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${process.env.TMDB_API_KEY}`
  )
  return response.json()
}