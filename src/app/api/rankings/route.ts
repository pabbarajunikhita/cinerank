import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { User as AuthUser } from '@supabase/supabase-js'
import type { Prisma } from '@prisma/client'
import { isOwnPhotoUrl } from '@/lib/photos'
import { assignRanksAndScores, insertAt, isSentiment, type RankedItem, type Sentiment } from '@/lib/ranking'

async function ensureDbUser(user: AuthUser) {
  const existing = await prisma.user.findUnique({ where: { id: user.id } })
  if (existing) return

  // A row with this email but a different id means the Supabase auth account was
  // recreated. Supabase guarantees emails are unique, so the old auth account is gone:
  // re-link the row to the current id (cascades to Ranking.userId, keeping old rankings).
  if (user.email) {
    const byEmail = await prisma.user.findUnique({ where: { email: user.email } })
    if (byEmail) {
      await prisma.user.update({ where: { id: byEmail.id }, data: { id: user.id } })
      return
    }
  }

  const meta = user.user_metadata ?? {}
  const emailPrefix = (user.email ?? 'user').split('@')[0]
  let username: string = meta.username || emailPrefix
  // usernames are unique; add a suffix if this one is taken
  if (await prisma.user.findUnique({ where: { username } })) {
    username = `${username}-${user.id.slice(0, 6)}`
  }

  await prisma.user.create({
    data: {
      id: user.id,
      email: user.email ?? `${user.id}@unknown`,
      username,
      displayName: meta.displayName || username,
    },
  })
}

/**
 * Recompute rank and score for all of a user's watched movies from their current order,
 * optionally inserting/moving one movie to `position` within its sentiment group first.
 * Only rows whose values actually change are written.
 */
async function rerank(
  tx: Prisma.TransactionClient,
  userId: string,
  insert?: { id: string; sentiment: Sentiment; position: number }
) {
  // Current best-to-worst order. Scores are derived from the order, so sorting by score
  // reproduces it (rank breaks ties; also handles rows saved before this logic existed).
  const rows = await tx.ranking.findMany({
    where: { userId, status: 'WATCHED' },
    orderBy: [{ score: { sort: 'desc', nulls: 'last' } }, { rank: 'asc' }],
  })

  let order: RankedItem[] = rows.map(r => ({
    id: r.id,
    sentiment: isSentiment(r.sentiment) ? r.sentiment : 'LIKED',
  }))
  if (insert) order = insertAt(order, { id: insert.id, sentiment: insert.sentiment }, insert.position)

  const current = new Map(rows.map(r => [r.id, r]))
  for (const a of assignRanksAndScores(order)) {
    const row = current.get(a.id)
    if (row && row.rank === a.rank && row.score === a.score && row.sentiment === a.sentiment) continue
    await tx.ranking.update({
      where: { id: a.id },
      data: { rank: a.rank, score: a.score, sentiment: a.sentiment },
    })
  }
}

/** Serialize ranking writes per user so two quick saves can't interleave and corrupt the order. */
async function lockUser(tx: Prisma.TransactionClient, userId: string) {
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`
}

const TX_OPTIONS = { timeout: 15000 }

function parseWatchedDate(value: unknown): Date | 'invalid' {
  if (value == null || value === '') return new Date()
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'invalid'
  const date = new Date(`${value}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) return 'invalid'
  // allow up to a day ahead for timezone differences, but no future dates beyond that
  if (date.getTime() > Date.now() + 36 * 3600_000) return 'invalid'
  if (date.getUTCFullYear() < 1900) return 'invalid'
  return date
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { movie, status, sentiment, review, tags, priority } = body
  // `position` = 0-based slot within the sentiment group, chosen by the head-to-head comparisons
  const position = Number(body.position ?? 0)
  // watchedAt: 'YYYY-MM-DD' from a date picker. Stored at noon UTC so it shows as the
  // same calendar day in every timezone. Defaults to today.
  const watchedAt = parseWatchedDate(body.watchedAt)

  if (!movie?.id || !movie?.title) {
    return NextResponse.json({ error: 'Missing movie' }, { status: 400 })
  }
  if (status !== 'WATCHED' && status !== 'WANT_TO_WATCH') {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  if (status === 'WATCHED' && !isSentiment(sentiment)) {
    return NextResponse.json({ error: 'Invalid sentiment' }, { status: 400 })
  }
  // photoUrl: must be in this user's folder of our bucket (null removes the photo)
  const photoUrl: string | null = typeof body.photoUrl === 'string' ? body.photoUrl : null
  if (photoUrl && !isOwnPhotoUrl(photoUrl, user.id)) {
    return NextResponse.json({ error: 'Invalid photo' }, { status: 400 })
  }
  if (watchedAt === 'invalid') {
    return NextResponse.json({ error: 'Invalid watched date' }, { status: 400 })
  }
  if (!Number.isFinite(position) || position < 0) {
    return NextResponse.json({ error: 'Invalid position' }, { status: 400 })
  }

  try {
    // Make sure this auth user has a row in our User table (the Ranking foreign key needs it).
    await ensureDbUser(user)

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

    const movieId = movie.id.toString()
    const key = { userId_movieId: { userId: user.id, movieId } }

    if (status === 'WANT_TO_WATCH') {
      // Watchlist entries aren't part of the ranked list. If the movie is already
      // watched, only its priority is updated (it stays ranked).
      const ranking = await prisma.ranking.upsert({
        where: key,
        update: { priority },
        create: { userId: user.id, movieId, rank: 0, status, priority, tags: [] },
      })
      return NextResponse.json(ranking)
    }

    // WATCHED: save the row, then place it and re-derive everyone's rank + score atomically.
    // Also covers "mark as watched": the watchlist row becomes the watched row.
    const ranking = await prisma.$transaction(async (tx) => {
      await lockUser(tx, user.id)
      const saved = await tx.ranking.upsert({
        where: key,
        update: { status: 'WATCHED', sentiment, review, tags: tags ?? [], priority: null, watchedAt, photoUrl },
        create: {
          userId: user.id, movieId, rank: 0, status: 'WATCHED',
          sentiment, review, tags: tags ?? [], watchedAt, photoUrl,
        },
      })
      await rerank(tx, user.id, { id: saved.id, sentiment, position })
      return tx.ranking.findUniqueOrThrow({ where: { id: saved.id } })
    }, TX_OPTIONS)

    return NextResponse.json(ranking)
  } catch (error) {
    console.error('Failed to save ranking:', error)
    const detail = process.env.NODE_ENV !== 'production' && error instanceof Error
      ? `: ${error.message.split('\n').filter(Boolean).slice(-3).join(' ')}`
      : ''
    return NextResponse.json({ error: `Failed to add movie${detail}` }, { status: 500 })
  }
}

export async function GET() {
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
    console.error('Failed to fetch rankings:', error)
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
    const deleted = await prisma.$transaction(async (tx) => {
      await lockUser(tx, user.id)
      // deleteMany scoped to userId so users can only delete their own rankings
      const { count } = await tx.ranking.deleteMany({
        where: { id: rankingId, userId: user.id }
      })
      // close the gap: later movies move up and the group's scores re-spread
      if (count > 0) await rerank(tx, user.id)
      return count
    }, TX_OPTIONS)

    if (deleted === 0) {
      return NextResponse.json({ error: 'Ranking not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete ranking:', error)
    return NextResponse.json({ error: 'Failed to delete ranking' }, { status: 500 })
  }
}
