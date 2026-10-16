import { prisma } from '@/lib/prisma'
import { searchMovies } from '@/lib/tmdb'
import { computeTasteMatch } from '@/lib/tasteMatch'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const MIN_RANKED = 3

type Person = NonNullable<Awaited<ReturnType<typeof loadPerson>>>

async function loadPerson(where: { id: string } | { username: string }) {
  return prisma.user.findUnique({
    where,
    select: {
      id: true,
      displayName: true,
      username: true,
      rankings: {
        select: {
          rank: true, status: true, score: true, tags: true, review: true, priority: true,
          movie: { select: { tmdbId: true, title: true, releaseYear: true } },
        },
        orderBy: { rank: 'asc' },
      },
    },
  })
}

function describe(p: Person) {
  const watched = p.rankings
    .filter(r => r.status === 'WATCHED')
    .map(r => `${r.movie.title} (${r.movie.releaseYear}) - ${r.score?.toFixed(1)}/10${r.tags.length ? `, tags: ${r.tags.join(', ')}` : ''}${r.review ? `, review: "${r.review.slice(0, 200)}"` : ''}`)
  const watchlist = p.rankings
    .filter(r => r.status === 'WANT_TO_WATCH')
    .map(r => `${r.movie.title} (${r.movie.releaseYear})${r.priority ? ` - ${r.priority.toLowerCase()} priority` : ''}`)
  return `${p.displayName}'s ranked movies (favorite first):
${watched.join('\n')}

${p.displayName}'s watchlist:
${watchlist.length ? watchlist.join('\n') : '(empty)'}`
}

const PICKS_SCHEMA = {
  type: 'object',
  properties: {
    sharedTaste: {
      type: 'string',
      description: 'One or two sentences on what these two people have in common, and where they differ.',
    },
    picks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          year: { type: 'integer' },
          forA: { type: 'string', description: 'Why person A will like it, citing movies they ranked. Written to person A as "you", never by name.' },
          forB: { type: 'string', description: 'Why person B will like it, citing movies they ranked. Written to person B as "you", never by name.' },
        },
        required: ['title', 'year', 'forA', 'forB'],
        additionalProperties: false,
      },
    },
  },
  required: ['sharedTaste', 'picks'],
  additionalProperties: false,
}

interface Picks {
  sharedTaste: string
  picks: { title: string; year: number; forA: string; forB: string }[]
}

/** Plans a movie night for the signed-in user and a friend. Returns an HTTP status and JSON body. */
export async function planMovieNight(userId: string, friendUsername: string) {
  const [me, friend] = await Promise.all([
    loadPerson({ id: userId }),
    loadPerson({ username: friendUsername.trim().replace(/^@/, '') }),
  ])

  if (!me) return { status: 404, body: { error: 'User not found' } }
  if (!friend) return { status: 404, body: { error: `No one on CineRank is called @${friendUsername}` } }
  if (friend.username === me.username) {
    return { status: 400, body: { error: 'Pick someone other than yourself' } }
  }

  const watchedOf = (p: Person) => p.rankings.filter(r => r.status === 'WATCHED')
  for (const p of [me, friend]) {
    if (watchedOf(p).length < MIN_RANKED) {
      const who = p === me ? 'You need' : `@${p.username} needs`
      return { status: 400, body: { error: `${who} at least ${MIN_RANKED} ranked movies for Movie Night` } }
    }
  }

  const match = computeTasteMatch(
    watchedOf(me).map(r => ({ tmdbId: r.movie.tmdbId, score: r.score })),
    watchedOf(friend).map(r => ({ tmdbId: r.movie.tmdbId, score: r.score })),
  )

  // Anything either person has already seen is off the table.
  const seen = new Set([...watchedOf(me), ...watchedOf(friend)].map(r => r.movie.tmdbId))
  const seenTitles = [...watchedOf(me), ...watchedOf(friend)].map(r => r.movie.title)

  const message = await anthropic.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: PICKS_SCHEMA } },
    messages: [{
      role: 'user',
      content: `Two friends want to watch a movie together tonight. Person A is ${me.displayName}, person B is ${friend.displayName}. Using their rankings, pick 4 movies neither has seen that both are likely to enjoy.

Rankings come from head-to-head comparisons, so the order is the strongest signal of taste; scores are derived from that order.

Guidelines:
- Look for real overlap: movies, directors, genres, tones or themes that both people rank highly.
- Avoid what either person ranks near the bottom. A pick one person would hate fails.
- If something on either watchlist fits both people, include it; it's a movie someone already wants to see.
- In forA and forB, name specific movies from that person's list. Avoid generic praise.
- Write forA and forB in the second person, speaking directly to that person ("You ranked Divergent 8.1, so..."). Never use their name or "he"/"she"/"they" there; each note is shown under a "For <name>" heading.
- Neither has seen any of these, so don't pick them: ${seenTitles.join('; ')}

${describe(me)}

${describe(friend)}`,
    }],
  })

  if (message.stop_reason === 'refusal') {
    return { status: 502, body: { error: 'Could not generate picks for this pair' } }
  }

  const textBlock = message.content.find(block => block.type === 'text')
  const result: Picks = JSON.parse(textBlock && 'text' in textBlock ? textBlock.text : '{}')

  const watchlistOwner = (tmdbId: number) => {
    const onMine = me.rankings.some(r => r.status === 'WANT_TO_WATCH' && r.movie.tmdbId === tmdbId)
    const onTheirs = friend.rankings.some(r => r.status === 'WANT_TO_WATCH' && r.movie.tmdbId === tmdbId)
    return onMine && onTheirs ? 'both' : onMine ? 'you' : onTheirs ? 'friend' : null
  }

  // Look each pick up on TMDB so posters and IDs are real, and drop anything
  // that turns out to be a movie one of them has seen.
  const enriched = await Promise.all(
    (result.picks ?? []).map(async pick => {
      const results = await searchMovies(pick.title)
      const movie = results.find(m => m.release_date?.startsWith(String(pick.year))) ?? results[0]
      if (!movie || seen.has(movie.id)) return null
      return {
        title: movie.title,
        tmdbId: movie.id,
        posterPath: movie.poster_path,
        releaseDate: movie.release_date,
        overview: movie.overview,
        forYou: pick.forA,
        forFriend: pick.forB,
        onWatchlist: watchlistOwner(movie.id),
      }
    })
  )

  const saved = {
    tasteMatch: match,
    sharedTaste: result.sharedTaste,
    picks: enriched.filter(p => p !== null).slice(0, 3),
  }

  // Saved so the planner can share the result with their friend by link.
  const night = await prisma.movieNight.create({
    data: { plannerId: me.id, friendId: friend.id, result: saved },
  })

  return {
    status: 200,
    body: {
      id: night.id,
      planner: { username: me.username, displayName: me.displayName },
      friend: { username: friend.username, displayName: friend.displayName },
      ...saved,
    },
  }
}

/** A saved Movie Night, in the same shape planMovieNight returns. */
export async function getMovieNight(id: string) {
  const night = await prisma.movieNight.findUnique({
    where: { id },
    select: {
      id: true,
      result: true,
      planner: { select: { username: true, displayName: true } },
      friend: { select: { username: true, displayName: true } },
    },
  })
  if (!night) return null
  const { result, ...rest } = night
  return { ...rest, ...(result as object) }
}
