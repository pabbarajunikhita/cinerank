'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { Popcorn, Search, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import FriendsFeed, { PersonAvatar } from '@/components/FriendsFeed'

interface Person {
  username: string
  displayName: string
  avatarUrl: string | null
  isFollowing: boolean
  rankedCount?: number
}

type Tab = 'activity' | 'find' | 'following' | 'followers'

export default function FriendsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // Open on a specific tab when linked from a profile (?tab=followers).
  const initialTab = use(searchParams).tab
  const [tab, setTab] = useState<Tab>(initialTab === 'find' || initialTab === 'following' || initialTab === 'followers' ? initialTab : 'activity')
  const [query, setQuery] = useState('')
  const [people, setPeople] = useState<Person[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load the list for the current tab; searches are debounced while typing.
  useEffect(() => {
    if (tab === 'activity') return
    let cancelled = false
    const url = tab === 'find'
      ? `/api/users/search?q=${encodeURIComponent(query)}`
      : `/api/follow${tab === 'followers' ? '?type=followers' : ''}`
    const timer = setTimeout(() => {
      setError(null)
      fetch(url)
        .then(async res => {
          const data = await res.json().catch(() => null)
          if (cancelled) return
          if (res.ok) setPeople(data)
          else { setPeople([]); setError(data?.error ?? 'Something went wrong') }
        })
        .catch(() => { if (!cancelled) { setPeople([]); setError("Couldn't reach the server") } })
    }, tab === 'find' && query ? 250 : 0)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [tab, query])

  const switchTab = (t: Tab) => {
    if (t === tab) return
    setPeople(null)
    setError(null)
    setTab(t)
  }

  // Optimistic follow/unfollow; reverts if the request fails.
  const toggleFollow = async (person: Person) => {
    const follow = !person.isFollowing
    const apply = (on: boolean) =>
      setPeople(ps => ps && ps.map(p => (p.username === person.username ? { ...p, isFollowing: on } : p)))
    apply(follow)
    const res = await fetch('/api/follow', {
      method: follow ? 'POST' : 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: person.username }),
    }).catch(() => null)
    if (!res?.ok) apply(!follow)
  }

  const tabs: [Tab, string][] = [['activity', 'Activity'], ['find', 'Find people'], ['following', 'Following'], ['followers', 'Followers']]

  const empty = {
    activity: '',
    find: query ? `No one matches “${query}”.` : 'No other users yet. Invite a friend to sign up!',
    following: "You're not following anyone yet. Find people to follow.",
    followers: 'No followers yet. Share your profile so friends can find you.',
  }[tab]

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-2 flex items-center gap-3">
        <Users className="text-red-500" size={28} />
        <h1 className="text-3xl font-bold">Friends</h1>
      </div>
      <p className="mb-8 text-neutral-400">
        See what your friends are watching, and plan a Movie Night together.
      </p>

      <div className="mb-6 flex gap-6 border-b border-neutral-800">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            className={`-mb-px border-b-2 pb-3 text-sm font-semibold transition-colors ${
              tab === key ? 'border-orange-500 text-white' : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'find' && (
        <div className="relative mb-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <Input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or username"
            className="h-11 pl-9"
          />
        </div>
      )}

      {tab === 'find' && !query && people && people.length > 0 && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">New on CineRank</p>
      )}

      {error && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
      )}

      {tab === 'activity' ? (
        <FriendsFeed onFindPeople={() => switchTab('find')} />
      ) : people === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl bg-neutral-900" />)}
        </div>
      ) : people.length === 0 ? (
        !error && (
          <div className="rounded-2xl border border-dashed border-neutral-800 py-14 text-center text-neutral-400">
            <p>{empty}</p>
            {tab === 'following' && (
              <button onClick={() => switchTab('find')} className="mt-3 text-sm font-medium text-red-400 hover:text-red-300">
                Find people →
              </button>
            )}
          </div>
        )
      ) : (
        <ul className="space-y-3">
          {people.map(p => (
            <li key={p.username} className="flex items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
              <Link href={`/u/${p.username}`} className="flex min-w-0 flex-1 items-center gap-4 hover:opacity-90">
                <PersonAvatar person={p} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{p.displayName}</p>
                  <p className="truncate text-sm text-neutral-400">
                    @{p.username}
                    {p.rankedCount != null && <> · {p.rankedCount} ranked</>}
                  </p>
                </div>
              </Link>
              <div className="flex flex-shrink-0 items-center gap-2">
                {p.isFollowing && (
                  <Link
                    href={`/movie-night?with=${encodeURIComponent(p.username)}`}
                    title={`Movie night with ${p.displayName.split(' ')[0]}`}
                    className="rounded-full p-2 text-red-400 hover:bg-red-500/10"
                  >
                    <Popcorn size={18} />
                  </Link>
                )}
                <button
                  onClick={() => toggleFollow(p)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    p.isFollowing
                      ? 'border border-neutral-700 text-neutral-300 hover:border-red-500/50 hover:text-red-300'
                      : 'bg-white text-neutral-950 hover:bg-neutral-200'
                  }`}
                >
                  {p.isFollowing ? 'Following' : tab === 'followers' ? 'Follow back' : 'Follow'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
