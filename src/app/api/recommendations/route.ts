import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { searchMovies } from '@/lib/tmdb'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rankings = await prisma.ranking.findMany({
      where: { userId: user.id, status: 'WATCHED' },
      include: { movie: true },
      orderBy: { rank: 'asc' }
    })

    if (rankings.length < 3) {
      return NextResponse.json({
        error: 'Rank at least 3 movies to get recommendations'
      }, { status: 400 })
    }

    const watchedTitles = rankings.map(r => r.movie.title)

    const movieList = rankings
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .map(r => `${r.movie.title} (${r.movie.releaseYear}) - Score: ${r.score}/10, Tags: ${r.tags.join(', ') || 'none'}`)
      .join('\n')

    const message = await anthropic.messages.create({
      // Fast, inexpensive model: this runs for one person and needs to feel instant.
      model: 'claude-haiku-4-5',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `Based on this person's ranked movies, recommend exactly 5 movies they haven't watched yet that they would love. Do not recommend any of these movies they've already watched: ${watchedTitles.join(', ')}.

Their ranked movies:
${movieList}

Respond ONLY with valid JSON in this exact format, nothing else:
[
  {"title": "Movie Title", "reason": "one short sentence, written to the person as \"you\" (e.g. \"You ranked X highly...\"), never \"they\" or \"their\""},
  ...
]`
      }]
    })

    const textBlock = message.content.find(block => block.type === 'text')
    const responseText = textBlock && 'text' in textBlock ? textBlock.text : '[]'
    // Take just the JSON array, in case the model adds a sentence or code fence around it.
    const start = responseText.indexOf('[')
    const end = responseText.lastIndexOf(']')
    const recommendations = JSON.parse(start >= 0 && end > start ? responseText.slice(start, end + 1) : '[]')

    // Fetch TMDB data for each recommended movie
    const enriched = await Promise.all(
      recommendations.map(async (rec: { title: string; reason: string }) => {
        const results = await searchMovies(rec.title)
        const movie = results[0]
        return {
          ...rec,
          tmdbId: movie?.id,
          posterPath: movie?.poster_path,
          releaseDate: movie?.release_date,
          overview: movie?.overview,
        }
      })
    )

    return NextResponse.json({ recommendations: enriched.filter(r => r.tmdbId) })
  } catch (error) {
    console.error('Recommendations failed:', error)
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 })
  }
}