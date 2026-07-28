# CineRank 🎬

A Beli-inspired movie ranking web app where you don't just rate movies — you rank them. Built with Next.js, Supabase, and Claude AI.

---

## What it does

Most movie apps ask you to give a star rating. CineRank makes you *rank* movies against each other using a head-to-head comparison system — the same mechanic that makes Beli so addictive for restaurants.

- 🎯 **Head-to-head ranking** — when you add a movie, you compare it against your existing movies using binary search to find its exact position
- 🤖 **AI taste profile** — Claude analyzes your rankings and generates a personalized description of your movie taste
- 🎥 **AI recommendations** — get 5 movie recommendations with reasoning based on your actual ranking history
- 📋 **Smart watchlist** — prioritize movies you want to watch (High/Medium/Low) and move them to watched with one click
- 👤 **Public profile** — shareable profile page at `/u/username` showing your rankings, stats, and favorite vibes

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL via Supabase |
| ORM | Prisma |
| Auth | Supabase Auth |
| Movie Data | TMDB API |
| AI | Anthropic Claude API |
| Deployment | Vercel |

---

## Features

### Ranking System
- Search any movie via TMDB API with real-time results and posters
- Select sentiment: 👍 Liked / 😐 Fine / 👎 Didn't like
- Head-to-head binary search comparison places the movie in your ranked list
- Score auto-calculated based on sentiment range and position among similar movies
- Add optional review and vibe tags (Mind-bending, Feel-good, Thriller, etc.)

### AI Features (Anthropic Claude)
- **Taste Profile** — analyzes your top-ranked movies, sentiment, and tags to write a personalized paragraph about your movie preferences
- **Recommendations** — suggests 5 movies you haven't seen with specific reasoning tied to your taste, enriched with TMDB poster and plot data

### Watchlist
- Add movies with High / Medium / Low priority
- Color-coded priority badges (red / orange / yellow)
- Sorted by priority automatically
- One-click "Mark as watched" flow that removes from watchlist and opens the ranking modal

### Profile
- Public shareable profile at `/u/username`
- Stats: total watched, average score, watchlist size
- Favorite vibe tags derived from your rankings
- Top ranked movies with scores
- AI recommendations and taste profile

---
## Live Demo

🔗 **[cinerank-dusky.vercel.app](https://cinerank-dusky.vercel.app)**

Create an account to start ranking your movies and get your AI taste profile!
---
## Database Schema

- **User** — auth + profile data
- **Movie** — cached TMDB movie data
- **Ranking** — connects User to Movie with rank, score, sentiment, review, tags, priority
- **Follow** — social graph (coming soon)