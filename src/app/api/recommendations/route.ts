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
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Based on this person's ranked movies, recommend exactly 5 movies they haven't watched yet that they would love. Do not recommend any of these movies they've already watched: ${watchedTitles.join(', ')}.

Their ranked movies:
${movieList}

Respond ONLY with valid JSON in this exact format, nothing else:
[
  {"title": "Movie Title", "reason": "1-2 sentence reason why they'd love this based on their taste"},
  ...
]`
      }]
    })

    const textBlock = message.content.find(block => block.type === 'text')
    const responseText = textBlock && 'text' in textBlock ? textBlock.text : '[]'
    const cleaned = responseText.replace(/```json|```/g, '').trim()
    const recommendations = JSON.parse(cleaned)

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
    console.error(error)
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 })
  }
}