import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Find people to follow. With ?q=, matches username or display name; without
// it, suggests the most recently joined users. Only public fields are returned.
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = new URL(request.url).searchParams.get('q')?.trim().replace(/^@/, '') ?? ''

  try {
    const users = await prisma.user.findMany({
      where: {
        id: { not: user.id },
        ...(q && {
          OR: [
            { username: { contains: q, mode: 'insensitive' } },
            { displayName: { contains: q, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        _count: { select: { rankings: { where: { status: 'WATCHED' } } } },
      },
    })

    const following = new Set(
      (await prisma.follow.findMany({
        where: { followerId: user.id, followingId: { in: users.map(u => u.id) } },
        select: { followingId: true },
      })).map(f => f.followingId)
    )

    return NextResponse.json(users.map(({ id, _count, ...u }) => ({
      ...u,
      rankedCount: _count.rankings,
      isFollowing: following.has(id),
    })))
  } catch (error) {
    console.error('Failed to search users:', error)
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 })
  }
}
