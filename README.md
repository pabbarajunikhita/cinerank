# CineRank

## TL;DR

Picking a movie shouldn't take longer than watching one. But on movie nights with friends, we'd spend ages scrolling, debating, and vetoing, and then end up rewatching something we'd all seen before. Streaming apps don't know what you actually liked, and swipe apps start from zero every time.

CineRank fixes that by learning your real taste. You add movies you've watched, compare them head-to-head, and CineRank builds a ranked list of your favorites (think Beli, but for movies).

Then it puts that taste to work. Plan a **Movie Night** with a friend, and CineRank reads both of your rankings to find movies neither of you has seen that you'll both like, even if your tastes are completely different. You can also follow friends and see what they're watching.

**Live:** [cinerank-dusky.vercel.app](https://cinerank-dusky.vercel.app/)  
**Product Requirements Doc:** [CineRank PRD](CineRank-PRD.pdf)

## How ranking works

1. **Pick a reaction.** Say whether you liked it, thought it was fine, or didn't like it. Liked movies score between 7 and 10, fine ones between 4 and 7, and ones you didn't like between 0 and 4.
2. **Compare it to other movies.** CineRank asks you to choose between the new movie and ones you've already ranked in that group. Each answer cuts the options in half, so even with 100 movies in a group, it takes about 7 questions to find the right spot.
3. **Get your scores.** Scores are based on where each movie sits in your list. Every time you add, move, or remove a movie, CineRank recalculates all the scores so they're spread evenly within each group. A movie you ranked higher will always have a higher score than one below it.

The ranking logic lives in [`src/lib/ranking.ts`](src/lib/ranking.ts) and doesn't depend on the database or UI. When you save a ranking, the API updates your list in a single database transaction and locks your account's rows while it runs, so two quick saves can't overwrite each other and scramble your order.

## How Movie Night works

1. **Taste match.** [`src/lib/tasteMatch.ts`](src/lib/tasteMatch.ts) compares the scores two people gave the movies they've both ranked. If their scores are identical, the match is 100%. If they're 5 or more points apart on average, it's 0%. If they have fewer than 3 movies in common, no score is shown, since there isn't enough data for it to mean anything.
2. **Picks.** CineRank sends both people's ranked lists and watchlists to Claude. Claude sends back a short summary of how their tastes overlap and differ, plus a list of picks. Each pick has a separate reason for each person that refers to movies on their own list. This works even if the two people have never watched the same movies, which is where most recommenders fail.
3. **Checks.** Every pick is looked up on TMDB to confirm the title and poster are real. Anything either person has already seen is removed.
4. **Sharing.** Each Movie Night gets its own private link (`/movie-night/<id>`) that opens without an account, so your friend can see the picks right away.

## Features

### Ranking
- **Movie search:** find any movie through TMDB as you type.
- **Head-to-head ranking:** pick liked / fine / didn't like, then choose between movies until the new one finds its spot.
- **Details:** add a watched date, a short review, vibe tags, and a photo.

### Movie Night (`/movie-night`)
- **Pick a friend** and get a taste match score, a summary of your shared taste, and picks neither of you has seen, with a reason for each of you.
- **Share** the result by link (native share sheet on phones); it opens without logging in.

### Photos
- **Add a selfie or photo** to any ranking, from your camera or library.
- **Smaller uploads:** photos are resized and re-encoded in the browser before upload (a ~4 MB phone photo becomes ~300 KB), which also strips location data.
- **Private storage rules:** you can only upload to or delete from your own folder.

### Friends (`/friends`)
- **Activity feed:** recent rankings from people you follow, with your score next to theirs when you've both seen a movie.
- **Find people:** search by name or username, and follow or unfollow.
- **Following / Followers:** with "Follow back", and a shortcut to start a Movie Night with anyone you follow.

### Dashboard
- **Profile card:** your stats, latest ranking, weekly streak, top vibes, and AI taste profile.
- **Ranked / Watchlist tabs:** your full ranking, plus movies you want to watch with high/medium/low priority.
- **Mark as watched:** moves a watchlist movie straight into ranking.

### Public profile (`/u/<username>`)
- **Profile photo, name, and bio**, editable on your own profile.
- **Cover mosaic** built from your photos and top posters.
- **Top 4** favorites.
- **Last 4 weeks** calendar (number of movies watched each day, hover for the date) and a 12-week activity chart, both by watch date.
- **Follow** and **Movie night with…** buttons on other people's profiles.
- **Recent activity feed** with rank, score, review, and photo.

### AI (Claude, through the Anthropic API)
- **Taste profile:** a short write-up of what you tend to like.
- **Recommendations:** five movies picked from your rankings, each with a reason that cites movies you ranked.
- **Movie Night picks:** see above. This uses a more capable model than the solo features, since reasoning about two people at once is harder and it's the result people share.

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
src/lib/tasteMatch.ts       taste match score between two users
src/lib/movieNight.ts       Movie Night: prompt, structured output, TMDB checks
src/lib/stats.ts            streaks, weekly counts, and other profile math
src/lib/photos.ts           client-side resize and upload (rankings and avatars)
src/app/api/rankings/       save, delete, and re-rank in a transaction
src/app/api/movie-night/    plan and fetch shared Movie Nights
src/app/api/follow/         follow, unfollow, following and followers
src/app/api/feed/           friends' activity
src/app/dashboard/          your rankings and watchlist
src/app/friends/            activity feed, people search, follows
src/app/movie-night/        planner and shared result pages
src/app/u/[username]/       public profile
prisma/schema.prisma        data model
supabase/                   storage bucket and policies
```

## What's next

- Group Movie Nights for three or more people
- Measuring whether a Movie Night worked: did both people rank the pick afterward?
- Unit tests for `ranking.ts`, `tasteMatch.ts`, and `stats.ts`, run in CI
- Learning scores from the comparisons themselves (Bradley–Terry) instead of spacing them evenly, and using that to choose which movie to compare against next
- A recommender built on everyone's rankings, evaluated against the Claude recommendations
