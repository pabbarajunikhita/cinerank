import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
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
        error: 'Rank at least 3 movies to get your taste profile'
      }, { status: 400 })
    }

    // Build a description of their movies for Claude
    const movieList = rankings
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .map(r => `${r.movie.title} (${r.movie.releaseYear}) - Score: ${r.score}/10, Sentiment: ${r.sentiment}, Tags: ${r.tags.join(', ') || 'none'}${r.review ? `, Review: "${r.review}"` : ''}`)
      .join('\n')

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Based on this person's ranked movies (highest to lowest score), write a fun, insightful 2-3 sentence "taste profile" describing their movie preferences. Be specific and personal, not generic. Mention patterns you notice in genres, themes, or vibes. Write it as if speaking directly to them ("You gravitate toward...").

Movies:
${movieList}

Write only the taste profile paragraph, nothing else.`
      }]
    })

    const textBlock = message.content.find(block => block.type === 'text')
    const tasteProfile = textBlock && 'text' in textBlock ? textBlock.text : ''

    return NextResponse.json({ tasteProfile })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to generate taste profile' }, { status: 500 })
  }
}