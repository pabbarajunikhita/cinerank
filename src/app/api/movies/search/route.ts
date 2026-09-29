import { searchMovies } from '@/lib/tmdb'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query || query.trim() === '') {
    return NextResponse.json({ results: [] })
  }

  try {
    const results = await searchMovies(query)
    return NextResponse.json({ results })
  } catch (error) {
    console.error('Movie search failed:', error)
    return NextResponse.json(
      { error: 'Failed to search movies', results: [] },
      { status: 500 }
    )
  }
}