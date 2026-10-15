import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Recent rankings from people the signed-in user follows, newest first.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const follows = await prisma.follow.findMany({
      where: { followerId: user.id },
      select: { followingId: true },
    })
    if (follows.length === 0) return NextResponse.json({ following: 0, items: [] })

    const items = await prisma.ranking.findMany({
      where: { userId: { in: follows.map(f => f.followingId) } },
      orderBy: { createdAt: 'desc' },
      take: 40,
      select: {
        id: true, status: true, sentiment: true, score: true, review: true,
        tags: true, photoUrl: true, watchedAt: true, createdAt: true,
        user: { select: { username: true, displayName: true, avatarUrl: true } },
        movie: { select: { id: true, title: true, posterPath: true, releaseYear: true } },
      },
    })

    // Flag movies the viewer has already ranked, so the feed can show "you ranked it too".
    const mine = await prisma.ranking.findMany({
      where: { userId: user.id, movieId: { in: [...new Set(items.map(i => i.movie.id))] }, status: 'WATCHED' },
      select: { movieId: true, score: true },
    })
    const myScore = new Map(mine.map(m => [m.movieId, m.score]))

    return NextResponse.json({
      following: follows.length,
      items: items.map(i => ({ ...i, myScore: myScore.get(i.movie.id) ?? null })),
    })
  } catch (error) {
    console.error('Failed to fetch feed:', error)
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
  }
}
