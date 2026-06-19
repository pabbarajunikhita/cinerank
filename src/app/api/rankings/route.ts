import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { movie, status, sentiment, score, review, tags, rank, priority } = await request.json()

  try {
    // Save movie to our database if it doesn't exist yet
    await prisma.movie.upsert({
      where: { tmdbId: movie.id },
      update: {},
      create: {
        id: movie.id.toString(),
        tmdbId: movie.id,
        title: movie.title,
        posterPath: movie.poster_path,
        releaseYear: movie.release_date ? parseInt(movie.release_date.slice(0, 4)) : null,
        overview: movie.overview,
        genres: [],
      }
    })

    // Get current highest rank for this user
    const highestRanking = await prisma.ranking.findFirst({
      where: { userId: user.id },
      orderBy: { rank: 'desc' }
    })

    const newRank = rank !== undefined ? rank : (highestRanking?.rank ?? 0) + 1

    // Create or update the ranking
    const ranking = await prisma.ranking.upsert({
      where: {
        userId_movieId: {
          userId: user.id,
          movieId: movie.id.toString()
        }
      },
      update: { status, sentiment, score, review, tags, priority },
      create: {
        userId: user.id,
        movieId: movie.id.toString(),
        rank: newRank,
        status,
        sentiment,
        score,
        review,
        tags: tags || [],
        priority,
      }
    })

    return NextResponse.json(ranking)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to add movie' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rankings = await prisma.ranking.findMany({
      where: { userId: user.id },
      include: { movie: true },
      orderBy: { rank: 'asc' }
    })

    return NextResponse.json(rankings)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch rankings' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
  
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  
    const { rankingId } = await request.json()
  
    try {
      await prisma.ranking.delete({
        where: { id: rankingId }
      })
      return NextResponse.json({ success: true })
    } catch (error) {
      return NextResponse.json({ error: 'Failed to delete ranking' }, { status: 500 })
    }
  }