# CineRank 🎬

A Beli-inspired movie ranking web app where you don't just rate movies — you rank them. Built with Next.js, Supabase, and Claude AI.

**[Live Demo](your-vercel-url-here)** · **[My Profile](your-vercel-url/u/your-username)**

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

## Running Locally

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) account
- A [TMDB](https://www.themoviedb.org) API key
- An [Anthropic](https://console.anthropic.com) API key

### Setup

1. Clone the repo
```bash
git clone https://github.com/pabbarajunikhita/cinerank.git
cd cinerank
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env.local` file in the root:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_database_url
DIRECT_URL=your_direct_url
TMDB_API_KEY=your_tmdb_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

4. Generate Prisma client
```bash
npx prisma generate
```

5. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## Architecture
src/
├── app/
│   ├── api/              # Backend API routes
│   │   ├── rankings/     # CRUD for movie rankings
│   │   ├── movies/       # TMDB movie search
│   │   ├── profile/      # Public profile data
│   │   ├── recommendations/ # AI recommendations
│   │   ├── taste-profile/   # AI taste profile
│   │   └── me/           # Current user data
│   ├── dashboard/        # Main rankings page
│   ├── login/            # Auth pages
│   ├── signup/
│   └── u/[username]/     # Public profile pages
├── components/
│   ├── MovieSearch.tsx   # Debounced TMDB search
│   ├── AddMovieModal.tsx # Rating + binary search flow
│   ├── WatchlistModal.tsx # Priority selection
│   ├── MovieCardMenu.tsx # Edit/delete/mark watched
│   ├── RecommendationsRow.tsx # AI recommendations UI
│   └── Navbar.tsx
└── lib/
├── tmdb.ts           # TMDB API wrapper
├── prisma.ts         # Prisma client
└── supabase/         # Supabase client (server + browser)

---

## Database Schema

- **User** — auth + profile data
- **Movie** — cached TMDB movie data
- **Ranking** — connects User to Movie with rank, score, sentiment, review, tags, priority
- **Follow** — social graph (coming soon)