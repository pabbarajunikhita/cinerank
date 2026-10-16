'use client'

import { use, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Popcorn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import MovieNightResults, { MovieNight } from '@/components/MovieNightResults'
import ShareMovieNightButton from '@/components/ShareMovieNightButton'
import MovieNightLoading, { type LoadingPerson } from '@/components/MovieNightLoading'

interface Friend {
  username: string
  displayName: string
  avatarUrl: string | null
}

export default function MovieNightPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const initial = use(searchParams).with
  const [username, setUsername] = useState(typeof initial === 'string' ? initial : '')
  const [result, setResult] = useState<MovieNight | null>(null)
  // Arriving from a profile's "Movie night" button starts planning right away.
  const [loading, setLoading] = useState(typeof initial === 'string' && initial !== '')
  const [error, setError] = useState<string | null>(null)
  const [friends, setFriends] = useState<Friend[] | null>(null)
  const [me, setMe] = useState<LoadingPerson | null>(null)
  // Who the current plan is with, for the loading screen.
  const [planningWith, setPlanningWith] = useState(typeof initial === 'string' ? initial : '')

  const plan = (name: string) => {
    if (!name.trim()) return
    setPlanningWith(name)
    setLoading(true)
    setError(null)
    setResult(null)
    request(name)
  }

  const request = async (name: string) => {
    try {
      const res = await fetch('/api/movie-night', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name }),
      })
      const data = await res.json()
      if (res.ok) setResult(data)
      else setError(data.error ?? 'Could not plan movie night')
    } catch {
      setError('Could not plan movie night')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetch('/api/follow')
      .then(res => (res.ok ? res.json() : []))
      .then(setFriends)
      .catch(() => setFriends([]))
    fetch('/api/me')
      .then(res => (res.ok ? res.json() : null))
      .then(u => u && setMe({ displayName: u.displayName, avatarUrl: u.avatarUrl }))
      .catch(() => {})
    if (typeof initial === 'string' && initial) request(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-2">
        <Popcorn className="text-red-500" size={28} />
        <h1 className="text-3xl font-bold">Movie Night</h1>
      </div>
      <p className="text-neutral-400 mb-8">
        Pick a friend. CineRank compares both of your rankings and finds movies neither of you has seen that you&apos;ll both like.
      </p>

      {friends && friends.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-neutral-400 mb-3">Friends</p>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {friends.map(f => {
              const selected = username.replace(/^@/, '') === f.username && (loading || !!result)
              return (
                <button
                  key={f.username}
                  onClick={() => { setUsername(f.username); plan(f.username) }}
                  disabled={loading}
                  className="flex w-16 flex-shrink-0 flex-col items-center gap-1.5 disabled:opacity-60"
                >
                  <div className={`relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-red-500 to-orange-400 text-sm font-bold ring-2 transition ${selected ? 'ring-red-400' : 'ring-transparent hover:ring-neutral-600'}`}>
                    {f.avatarUrl
                      ? <Image src={f.avatarUrl} alt={f.displayName} fill className="object-cover" />
                      : f.displayName.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <span className="w-full truncate text-center text-xs text-neutral-300">{f.displayName.split(' ')[0]}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {friends && friends.length === 0 && (
        <p className="mb-6 text-sm text-neutral-500">
          Friends you follow show up here.{' '}
          <Link href="/friends" className="font-medium text-red-400 hover:text-red-300">Find friends</Link>
          {' '}or type a username below.
        </p>
      )}

      <form
        onSubmit={e => { e.preventDefault(); plan(username) }}
        className="flex gap-2 mb-10"
      >
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">@</span>
          <Input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="friend's username"
            className="pl-7"
          />
        </div>
        <Button type="submit" disabled={loading || !username.trim()} className="bg-red-500 hover:bg-red-600">
          {loading ? 'Finding picks…' : 'Find a movie'}
        </Button>
      </form>

      {error && (
        <p className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
      )}

      {loading && (() => {
        const handle = planningWith.trim().replace(/^@/, '')
        const f = friends?.find(x => x.username.toLowerCase() === handle.toLowerCase())
        return <MovieNightLoading me={me} friend={f ? { displayName: f.displayName, avatarUrl: f.avatarUrl } : { displayName: handle || 'Friend', avatarUrl: null }} />
      })()}

      {result && (
        <div className="space-y-6">
          <MovieNightResults night={result} viewer="planner" />
          <div className="flex justify-center">
            <ShareMovieNightButton id={result.id} friendName={result.friend.displayName.split(' ')[0]} />
          </div>
        </div>
      )}
    </div>
  )
}
