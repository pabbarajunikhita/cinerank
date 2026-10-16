import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isOwnPhotoUrl } from '@/lib/photos'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id }
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(dbUser)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

// Update your own profile: any of displayName, bio, avatarUrl (null removes the photo).
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const data: { displayName?: string; bio?: string | null; avatarUrl?: string | null } = {}

  if ('displayName' in body) {
    const name = typeof body.displayName === 'string' ? body.displayName.trim() : ''
    if (!name || name.length > 50) return NextResponse.json({ error: 'Name must be 1–50 characters' }, { status: 400 })
    data.displayName = name
  }
  if ('bio' in body) {
    const bio = typeof body.bio === 'string' ? body.bio.trim() : ''
    if (bio.length > 160) return NextResponse.json({ error: 'Bio must be 160 characters or fewer' }, { status: 400 })
    data.bio = bio || null
  }
  if ('avatarUrl' in body) {
    const url = body.avatarUrl
    if (url !== null && (typeof url !== 'string' || !isOwnPhotoUrl(url, user.id))) {
      return NextResponse.json({ error: 'Invalid photo' }, { status: 400 })
    }
    data.avatarUrl = url
  }

  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: { displayName: true, bio: true, avatarUrl: true },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to update profile:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
