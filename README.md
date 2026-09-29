# CineRank

## TL;DR

I'm a big fan of apps like Beli and Strava, where you can rank, track, and share the things you've done. So I built the same thing for movies! In CineRank, you add movies you've watched, compare them head-to-head, and CineRank figures out where each one ranks based on your taste.

**Live:** [cinerank-dusky.vercel.app](https://cinerank-dusky.vercel.app/)

## How ranking works

1. **Pick a verdict.** Liked, fine, or didn't like. This puts the movie in one of three groups, and each group owns a score band: 7–10, 4–7, and 0–4.
2. **Compare head-to-head.** The app binary-searches the group you picked. Each "which did you prefer?" halves the remaining range, so placing a movie in a group of *n* takes about log₂(*n*) comparisons: 7 for a group of 100.
3. **Scores come from the order.** Your list is the source of truth. After every insert, move, or delete, the server re-derives every rank and score from it, spreading scores evenly across each band (three liked movies score 10, 9, 8; add a fourth and they shift). A movie you preferred can never score below one it beat.

The rules are all in [`src/lib/ranking.ts`](src/lib/ranking.ts), a pure module with no database or UI code. The API route does the insert and re-rank in one Postgres transaction and takes a row lock on the user first, so two quick saves can't interleave and corrupt the order.

## Features

### Ranking
- **Movie search:** find any movie through TMDB as you type.
- **Head-to-head ranking:** pick liked / fine / didn't like, then choose between movies until the new one finds its spot.
- **Details:** add a watched date, a short review, vibe tags, and a photo.

### Photos
- **Add a selfie or photo** to any ranking, from your camera or library.
- **Smaller uploads:** photos are resized and re-encoded in the browser before upload (a ~4 MB phone photo becomes ~300 KB), which also strips location data.
- **Private storage rules:** you can only upload to or delete from your own folder.

### Dashboard
- **Profile card:** your stats, latest ranking, weekly streak, top vibes, and AI taste profile.
- **Ranked / Watchlist tabs:** your full ranking, plus movies you want to watch with high/medium/low priority.
- **Mark as watched:** moves a watchlist movie straight into ranking.

### Public profile (`/u/<username>`)
- **Cover mosaic** built from your photos and top posters.
- **Top 4** favorites.
- **Last 4 weeks** calendar and a weekly activity chart.
- **Recent activity feed** with rank, score, review, and photo.

### AI (Claude)
- **Taste profile:** a short write-up of what you tend to like.
- **Recommendations:** five movies picked from your rankings, with a reason for each.

### Reliability
- **Health check** at `/api/health`, pinged daily by a Vercel cron so the Supabase free tier doesn't pause the database.

## Stack

Next.js 16 (App Router) and TypeScript, Tailwind with shadcn/ui, PostgreSQL on Supabase through Prisma, Supabase Auth and Storage, TMDB for movie data, the Anthropic API for the AI features, deployed on Vercel.

## Running it locally

You'll need a Supabase project, a [TMDB API key](https://www.themoviedb.org/settings/api) (either the v3 key or the v4 read token works), and an Anthropic API key.

```bash
git clone https://github.com/pabbarajunikhita/cinerank.git
cd cinerank
npm install
cp .env.example .env    # then fill in the values
npx prisma db push      # create the tables
npm run dev
```

For photo uploads, run [`supabase/ranking-photos.sql`](supabase/ranking-photos.sql) once in the Supabase SQL editor. It creates the storage bucket and its access policies.

`DATABASE_URL` should use Supabase's transaction pooler (port 6543, with `?pgbouncer=true`). `DIRECT_URL` should use the session pooler (port 5432). Prisma needs the second one for schema changes and will hang on 6543.

## Project layout

```
src/lib/ranking.ts          ranking rules: insert, re-rank, scoring
src/lib/stats.ts            streaks, weekly counts, and other profile math
src/lib/photos.ts           client-side resize and upload
src/app/api/rankings/       save, delete, and re-rank in a transaction
src/app/dashboard/          your rankings and watchlist
src/app/u/[username]/       public profile
prisma/schema.prisma        data model
supabase/                   storage bucket and policies
```

## What's next

- Following other people, and a feed of their rankings
- Unit tests for `ranking.ts` and `stats.ts`, run in CI
- Learning scores from the comparisons themselves (Bradley–Terry) instead of spacing them evenly, and using that to choose which movie to compare against next
- A recommender built on everyone's rankings, evaluated against the Claude recommendations
