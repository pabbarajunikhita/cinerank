'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { getImageUrl } from '@/lib/tmdb'
import { Skeleton } from '@/components/ui/skeleton'
import ActivityChart from '@/components/profile/ActivityChart'
import WeekGrid from '@/components/profile/WeekGrid'
import PhotoLightbox from '@/components/PhotoLightbox'
import DiscoverRail from '@/components/dashboard/DiscoverRail'
import {
  averageScore, favoriteDecade, recentDaysGrid, timeAgo, topTags, weeklyCounts,
} from '@/lib/stats'

interface ProfileRanking {
  id: string
  rank: number
  status: string
  sentiment: string | null
  score: number | null
  review: string | null
  tags: string[]
  photoUrl: string | null
  watchedAt: string | null
  createdAt: string
  movie: { id: string; title: string; posterPath: string | null; releaseYear: number | null }
}

interface Profile {
  username: string
  displayName: string
  bio: string | null
  avatarUrl: string | null
  createdAt: string
  isOwner: boolean
  _count: { followers: number; following: number }
  rankings: ProfileRanking[]
}

const SENTIMENT: Record<string, { label: string; cls: string }> = {
  LIKED: { label: 'Liked', cls: 'bg-emerald-500/15 text-emerald-300' },
  FINE: { label: 'Fine', cls: 'bg-amber-500/15 text-amber-300' },
  DISLIKED: { label: "Didn't like", cls: 'bg-neutral-700/60 text-neutral-300' },
}

const TMDB_WIDE = (path: string) => `https://image.tmdb.org/t/p/w780${path}`

function Avatar({ profile, size }: { profile: Profile; size: 'sm' | 'lg' }) {
  const initials = profile.displayName.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const dim = size === 'lg' ? 'h-28 w-28 text-3xl' : 'h-9 w-9 text-xs'
  return (
    <div className={`${dim} relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-red-500 to-orange-400 font-bold`}>
      {profile.avatarUrl
        ? <Image src={profile.avatarUrl} alt={profile.displayName} fill className="object-cover" />
        : initials}
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-neutral-400">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  )
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tab, setTab] = useState<'overview' | 'rankings' | 'photos'>('overview')
  const [lightbox, setLightbox] = useState<{ url: string; caption: string } | null>(null)

  useEffect(() => {
    fetch(`/api/profile/${username}`)
      .then(async res => {
        if (res.status === 404) { setNotFound(true); return }
        const data = await res.json().catch(() => ({}))
        if (res.ok) setProfile(data)
        else setLoadError(data.error ?? `Something went wrong (${res.status})`)
      })
      .catch(() => setLoadError("Couldn't reach the server"))
      .finally(() => setLoading(false))
  }, [username])

  const d = useMemo(() => {
    if (!profile) return null
    const watched = profile.rankings
      .filter(r => r.status === 'WATCHED')
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.rank - b.rank)
    const rankOf = new Map(watched.map((r, i) => [r.id, i + 1]))
    const rankedDates = watched.map(r => new Date(r.createdAt))
    const now = new Date()
    const fourWeeksAgo = new Date(now); fourWeeksAgo.setDate(now.getDate() - 28)
    const recent = watched.filter(r => new Date(r.createdAt) >= fourWeeksAgo)
    const photos = watched.filter(r => r.photoUrl)
    const cover = [
      ...photos.map(r => r.photoUrl!),
      ...watched.filter(r => r.movie.posterPath).map(r => TMDB_WIDE(r.movie.posterPath!)),
    ].slice(0, 6)
    return {
      watched, rankOf, photos, cover,
      watchlistCount: profile.rankings.filter(r => r.status === 'WANT_TO_WATCH').length,
      feed: [...watched].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6),
      weeks: weeklyCounts(rankedDates, 12, now),
      grid: recentDaysGrid(rankedDates, 4, now),
      recentCount: recent.length,
      recentAvg: averageScore(recent),
      avg: averageScore(watched),
      vibes: topTags(watched, 5),
      decade: favoriteDecade(watched.map(r => r.movie.releaseYear)),
      bySentiment: (s: string) => watched.filter(r => (r.sentiment ?? 'LIKED') === s).length,
    }
  }, [profile])

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-52 rounded-2xl bg-neutral-900" />
        <Skeleton className="h-10 w-72 bg-neutral-900" />
        <Skeleton className="h-64 rounded-2xl bg-neutral-900" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="py-20 text-center">
        <p className="mb-2 text-2xl font-bold">Couldn&apos;t load this profile</p>
        <p className="text-neutral-400">{loadError}. Try refreshing.</p>
      </div>
    )
  }

  if (notFound || !profile || !d) {
    return (
      <div className="py-20 text-center">
        <p className="mb-2 text-2xl font-bold">User not found</p>
        <p className="text-neutral-400">This profile doesn&apos;t exist.</p>
      </div>
    )
  }

  type Tab = 'overview' | 'rankings' | 'photos'
  const tabs: [Tab, string, number | null][] = [
    ['overview', 'Overview', null],
    ['rankings', 'Rankings', d.watched.length],
    ...(d.photos.length ? [['photos', 'Photos', d.photos.length] as [Tab, string, number]] : []),
  ]

  const openPhoto = (r: ProfileRanking) => setLightbox({ url: r.photoUrl!, caption: r.movie.title })

  return (
    <div className="mx-auto max-w-6xl">
      {/* Cover mosaic: the user's photos first, then posters of their top movies */}
      <div className="relative h-44 overflow-hidden rounded-2xl bg-gradient-to-br from-red-900/60 via-neutral-900 to-orange-900/40 sm:h-56">
        {d.cover.length > 0 && (
          <div className="grid h-full gap-[2px]" style={{ gridTemplateColumns: `repeat(${d.cover.length}, minmax(0, 1fr))` }}>
            {d.cover.map(src => (
              <div key={src} className="relative h-full">
                <Image src={src} alt="" fill sizes="(max-width: 768px) 33vw, 200px" className="object-cover" />
              </div>
            ))}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent" />
      </div>

      {/* Header */}
      <div className="flex flex-col gap-6 px-2 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div className="flex items-end gap-4">
          <div className="-mt-14 rounded-full ring-4 ring-neutral-950">
            <Avatar profile={profile} size="lg" />
          </div>
          <div className="pb-1">
            <h1 className="text-2xl font-bold leading-tight">{profile.displayName}</h1>
            <p className="text-sm text-neutral-400">
              @{profile.username} · Member since {new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
            </p>
            {profile.bio && <p className="mt-1 text-sm text-neutral-300">{profile.bio}</p>}
          </div>
        </div>

        <div className="flex items-end gap-8 pt-4">
          <div className="text-center">
            <p className="text-xs text-neutral-400">Last 4 weeks</p>
            <p className="text-5xl font-bold tabular-nums leading-none mt-1">{d.recentCount}</p>
            <p className="mt-1 text-xs text-neutral-500">Movies ranked</p>
          </div>
          <WeekGrid grid={d.grid} />
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex gap-6 border-b border-neutral-800 px-2 sm:px-6">
        {tabs.map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 pb-3 text-sm font-semibold transition-colors ${
              tab === key ? 'border-orange-500 text-white' : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            {label}{count != null && <span className="ml-1.5 font-normal text-neutral-500">{count}</span>}
          </button>
        ))}
      </div>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ---------- Main column ---------- */}
        <div className="min-w-0 space-y-8">
          {d.watched.length === 0 && (
            <div className="rounded-2xl border border-dashed border-neutral-800 py-16 text-center text-neutral-400">
              No movies ranked yet.
            </div>
          )}

          {tab === 'overview' && d.watched.length > 0 && (
            <>
              {/* Top 4 */}
              <section>
                <h2 className="mb-3 text-lg font-semibold">Top 4</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {d.watched.slice(0, 4).map((r, i) => (
                    <div key={r.id} className="group relative aspect-[2/3] overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-neutral-800">
                      {r.movie.posterPath && (
                        <Image src={getImageUrl(r.movie.posterPath)} alt={r.movie.title} fill sizes="(max-width: 640px) 50vw, 200px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                      <span className={`absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${i === 0 ? 'bg-orange-500 text-white' : 'bg-black/70 text-white'}`}>
                        {i + 1}
                      </span>
                      <div className="absolute inset-x-0 bottom-0 p-3">
                        <p className="truncate text-sm font-semibold">{r.movie.title}</p>
                        <p className="text-lg font-bold text-red-400 tabular-nums">{r.score}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Photos strip */}
              {d.photos.length > 0 && (
                <section>
                  <h2 className="mb-3 text-lg font-semibold">Photos</h2>
                  <div className="grid grid-cols-4 gap-1 sm:grid-cols-8">
                    {d.photos.slice(0, 8).map((r, i) => {
                      const more = i === 7 && d.photos.length > 8
                      return (
                        <button key={r.id} onClick={() => (more ? setTab('photos') : openPhoto(r))} className="relative aspect-square overflow-hidden rounded-md bg-neutral-900">
                          <Image src={r.photoUrl!} alt={r.movie.title} fill sizes="120px" className="object-cover hover:opacity-80" />
                          {more && <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-semibold">+ More</span>}
                        </button>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* Activity chart */}
              <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
                <div className="mb-4 flex items-baseline justify-between">
                  <h2 className="text-lg font-semibold">Activity</h2>
                  <p className="text-sm text-neutral-400">
                    <span className="font-semibold text-white">{d.weeks.reduce((s, w) => s + w.count, 0)}</span> ranked · last 12 weeks
                  </p>
                </div>
                <ActivityChart weeks={d.weeks} />
              </section>

              {/* Recent activity feed */}
              <section className="space-y-4">
                <h2 className="text-lg font-semibold">Recent activity</h2>
                {d.feed.map(r => {
                  const s = SENTIMENT[r.sentiment ?? 'LIKED'] ?? SENTIMENT.LIKED
                  const when = r.watchedAt
                    ? `Watched ${new Date(r.watchedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`
                    : timeAgo(new Date(r.createdAt))
                  return (
                    <article key={r.id} className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
                      <div className="flex items-center gap-3">
                        <Avatar profile={profile} size="sm" />
                        <div className="text-sm">
                          <p><span className="font-semibold">{profile.displayName}</span> <span className="text-neutral-400">ranked a movie</span></p>
                          <p className="text-xs text-neutral-500">{when}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-4">
                        <div className="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded-md bg-neutral-800">
                          {r.movie.posterPath && <Image src={getImageUrl(r.movie.posterPath)} alt={r.movie.title} fill sizes="64px" className="object-cover" />}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xl font-bold leading-tight">{r.movie.title} <span className="text-base font-normal text-neutral-500">{r.movie.releaseYear}</span></h3>
                          <div className="mt-2 flex gap-6">
                            <div>
                              <p className="text-[11px] text-neutral-500">Rank</p>
                              <p className="text-lg font-semibold tabular-nums">#{d.rankOf.get(r.id)}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-neutral-500">Score</p>
                              <p className="text-lg font-semibold tabular-nums text-red-400">{r.score}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-neutral-500">Verdict</p>
                              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${s.cls}`}>{s.label}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {r.review && <p className="mt-4 text-sm leading-relaxed text-neutral-200">&ldquo;{r.review}&rdquo;</p>}
                      {r.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {r.tags.map(t => <span key={t} className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs text-neutral-300">{t}</span>)}
                        </div>
                      )}
                      {r.photoUrl && (
                        <button onClick={() => openPhoto(r)} className="relative mt-4 block h-72 w-full overflow-hidden rounded-xl bg-neutral-800">
                          <Image src={r.photoUrl} alt={`Photo for ${r.movie.title}`} fill sizes="(max-width: 1024px) 100vw, 700px" className="object-cover" />
                        </button>
                      )}
                    </article>
                  )
                })}
              </section>
            </>
          )}

          {tab === 'rankings' && d.watched.length > 0 && (
            <ol className="space-y-3">
              {d.watched.map((r, i) => {
                const s = SENTIMENT[r.sentiment ?? 'LIKED'] ?? SENTIMENT.LIKED
                return (
                  <li key={r.id} className="flex items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-3 pr-5">
                    <span className={`w-8 text-center text-2xl font-bold tabular-nums ${i < 3 ? 'text-orange-400' : 'text-neutral-600'}`}>{i + 1}</span>
                    <div className="relative h-20 w-14 flex-shrink-0 overflow-hidden rounded-md bg-neutral-800">
                      {r.movie.posterPath && <Image src={getImageUrl(r.movie.posterPath)} alt={r.movie.title} fill sizes="56px" className="object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{r.movie.title}</p>
                      <p className="text-sm text-neutral-400">{r.movie.releaseYear}</p>
                      <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] ${s.cls}`}>{s.label}</span>
                    </div>
                    {r.photoUrl && (
                      <button onClick={() => openPhoto(r)} className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg ring-1 ring-neutral-700 hover:ring-orange-400">
                        <Image src={r.photoUrl} alt="" fill sizes="48px" className="object-cover" />
                      </button>
                    )}
                    <span className="text-2xl font-bold tabular-nums text-red-400">{r.score}</span>
                  </li>
                )
              })}
            </ol>
          )}

          {tab === 'photos' && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {d.photos.map(r => (
                <button key={r.id} onClick={() => openPhoto(r)} className="group relative aspect-square overflow-hidden rounded-xl bg-neutral-900">
                  <Image src={r.photoUrl!} alt={r.movie.title} fill sizes="(max-width: 640px) 50vw, 250px" className="object-cover transition-transform group-hover:scale-105" />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-left text-xs font-medium">{r.movie.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ---------- Sidebar ---------- */}
        <aside className="space-y-6">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <h3 className="mb-3 font-semibold">Social</h3>
            <div className="flex gap-8">
              <div><p className="text-xs text-neutral-400">Following</p><p className="text-xl font-bold tabular-nums">{profile._count.following}</p></div>
              <div><p className="text-xs text-neutral-400">Followers</p><p className="text-xl font-bold tabular-nums">{profile._count.followers}</p></div>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <h3 className="font-semibold">Stats</h3>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">Last 4 weeks</p>
            <div className="divide-y divide-neutral-800">
              <StatRow label="Movies ranked" value={d.recentCount} />
              <StatRow label="Per week" value={(d.recentCount / 4).toFixed(1)} />
              <StatRow label="Avg score" value={d.recentAvg ?? '–'} />
            </div>

            <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-neutral-500">All-time</p>
            <div className="divide-y divide-neutral-800">
              <StatRow label="Movies ranked" value={d.watched.length} />
              <StatRow label="Avg score" value={d.avg ?? '–'} />
              <StatRow label="Liked · Fine · Didn't like" value={`${d.bySentiment('LIKED')} · ${d.bySentiment('FINE')} · ${d.bySentiment('DISLIKED')}`} />
              <StatRow label="Watchlist" value={d.watchlistCount} />
              {d.decade && <StatRow label="Favorite decade" value={d.decade} />}
            </div>

            {d.vibes.length > 0 && (
              <>
                <p className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Vibes</p>
                <div className="flex flex-wrap gap-1.5">
                  {d.vibes.map(v => <span key={v} className="rounded-full bg-neutral-800 px-2.5 py-1 text-xs text-neutral-200">{v}</span>)}
                </div>
              </>
            )}
          </div>

          {/* Recommendations + share: only on your own profile */}
          {profile.isOwner && <DiscoverRail username={profile.username} rankedCount={d.watched.length} />}
        </aside>
      </div>

      {lightbox && <PhotoLightbox url={lightbox.url} caption={lightbox.caption} onClose={() => setLightbox(null)} />}
    </div>
  )
}
