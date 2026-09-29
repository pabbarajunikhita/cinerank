import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Public profile. Only public fields are selected (never email), and `isOwner`
// tells the page whether to show owner-only features like recommendations.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params

  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
        _count: { select: { followers: true, following: true } },
        rankings: {
          select: {
            id: true, rank: true, status: true, sentiment: true, score: true,
            review: true, tags: true, priority: true, photoUrl: true,
            watchedAt: true, createdAt: true,
            movie: { select: { id: true, title: true, posterPath: true, releaseYear: true } },
          },
          orderBy: { rank: 'asc' },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const supabase = await createClient()
    const { data: { user: viewer } } = await supabase.auth.getUser()

    const { id, ...publicProfile } = user
    return NextResponse.json({ ...publicProfile, isOwner: viewer?.id === id })
  } catch (error) {
    console.error('Failed to fetch profile:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}
