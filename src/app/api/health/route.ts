import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// Health check. Also called daily by a Vercel cron (see vercel.json) so the
// Supabase free-tier database never sits idle long enough to be paused.
export const dynamic = 'force-dynamic'

export async function GET() {
  const started = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'ok', db: 'up', latencyMs: Date.now() - started })
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json({ status: 'error', db: 'down' }, { status: 503 })
  }
}
