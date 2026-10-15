import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function currentUserId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

// People the signed-in user follows, for the Movie Night friend picker.
export async function GET() {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const follows = await prisma.follow.findMany({
      where: { followerId: userId },
      orderBy: { createdAt: 'desc' },
      select: { following: { select: { username: true, displayName: true, avatarUrl: true } } },
    })
    return NextResponse.json(follows.map(f => f.following))
  } catch (error) {
    console.error('Failed to fetch following:', error)
    return NextResponse.json({ error: 'Failed to fetch friends' }, { status: 500 })
  }
}

// Follow ({ username }) or, with DELETE, unfollow.
async function setFollow(request: Request, follow: boolean) {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { username } = await request.json().catch(() => ({}))
  if (typeof username !== 'string') {
    return NextResponse.json({ error: 'Missing username' }, { status: 400 })
  }

  try {
    const target = await prisma.user.findUnique({ where: { username }, select: { id: true } })
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (target.id === userId) return NextResponse.json({ error: 'You can\'t follow yourself' }, { status: 400 })

    const key = { followerId: userId, followingId: target.id }
    if (follow) {
      await prisma.follow.upsert({ where: { followerId_followingId: key }, create: key, update: {} })
    } else {
      await prisma.follow.deleteMany({ where: key })
    }
    return NextResponse.json({ following: follow })
  } catch (error) {
    console.error('Failed to update follow:', error)
    return NextResponse.json({ error: 'Failed to update follow' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return setFollow(request, true)
}

export async function DELETE(request: Request) {
  return setFollow(request, false)
}
