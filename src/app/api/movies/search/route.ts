import { searchMovies } from '@/lib/tmdb'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  console.log('Search query:', query)
  console.log('TMDB API KEY exists:', !!process.env.TMDB_API_KEY)
  console.log('TMDB API KEY preview:', process.env.TMDB_API_KEY?.slice(0, 20))

  if (!query || query.trim() === '') {
    return NextResponse.json({ results: [] })
  }

  try {
    const results = await searchMovies(query)
    console.log('Results count:', results.length)
    return NextResponse.json({ results })
  } catch (error) {
    console.log('Error:', error)
    return NextResponse.json(
      { error: 'Failed to search movies' },
      { status: 500 }
    )
  }
}