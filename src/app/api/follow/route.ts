import { prisma } from '@/lib/prisma'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function currentUserId() {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  return user?.id ?? null
}

// People the signed-in user follows (default, also used by the Movie Night
// friend picker) or, with ?type=followers, people who follow them.
export async function GET(request: Request) {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const followers = new URL(request.url).searchParams.get('type') === 'followers'
  const person = { select: { id: true, username: true, displayName: true, avatarUrl: true } }

  try {
    const people = followers
      ? (await prisma.follow.findMany({
          where: { followingId: userId },
          orderBy: { createdAt: 'desc' },
          select: { follower: person },
        })).map(r => r.follower)
      : (await prisma.follow.findMany({
          where: { followerId: userId },
          orderBy: { createdAt: 'desc' },
          select: { following: person },
        })).map(r => r.following)

    // For followers, mark which ones you follow back.
    const followingBack = followers
      ? new Set((await prisma.follow.findMany({
          where: { followerId: userId, followingId: { in: people.map(p => p.id) } },
          select: { followingId: true },
        })).map(f => f.followingId))
      : null

    return NextResponse.json(people.map(({ id, ...p }) => ({
      ...p,
      isFollowing: followingBack ? followingBack.has(id) : true,
    })))
  } catch (error) {
    console.error('Failed to fetch follows:', error)
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
