import { createClient, getAuthUser } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { planMovieNight } from '@/lib/movieNight'

export async function POST(request: Request) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { username } = await request.json().catch(() => ({}))
  if (typeof username !== 'string' || !username.trim()) {
    return NextResponse.json({ error: 'Enter a friend\'s username' }, { status: 400 })
  }

  try {
    const { status, body } = await planMovieNight(user.id, username)
    return NextResponse.json(body, { status })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to plan movie night' }, { status: 500 })
  }
}
