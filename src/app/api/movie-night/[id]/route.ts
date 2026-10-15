import { NextResponse } from 'next/server'
import { getMovieNight } from '@/lib/movieNight'

// Public: anyone with the link can view a shared Movie Night, so a friend
// without an account can still see the picks.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const night = await getMovieNight(id)
    if (!night) {
      return NextResponse.json({ error: 'Movie night not found' }, { status: 404 })
    }
    return NextResponse.json(night)
  } catch (error) {
    console.error('Failed to fetch movie night:', error)
    return NextResponse.json({ error: 'Movie night not found' }, { status: 404 })
  }
}
