// Taste match between two users, computed from movies they've both ranked.
// Pure module, no database or UI code, like ranking.ts.

export interface RankedItem {
  tmdbId: number
  /** 0–10 score derived from the user's verdict and order (see ranking.ts). */
  score: number | null
}

export type TasteMatch = {
  /** 0–100, or null when there's too little overlap to say anything. */
  percent: number | null
  sharedCount: number
}

const MIN_SHARED = 3
/** An average score gap this large (or more) counts as no match at all. */
const MAX_GAP = 5

/**
 * Looks only at movies both users ranked and compares their scores. Scores
 * already combine the verdict (liked / fine / didn't like) with the order
 * inside it, so two people who both liked a movie stay close even if they
 * placed it a few spots apart. Identical scores give 100; an average gap of
 * 5 points or more gives 0.
 *
 * (Comparing order alone was too blunt with few shared movies: three movies
 * both people liked, ranked in opposite order, scored 0%.)
 */
export function computeTasteMatch(a: RankedItem[], b: RankedItem[]): TasteMatch {
  const scoreB = new Map(b.filter(x => x.score != null).map(x => [x.tmdbId, x.score!]))
  const gaps = a
    .filter(x => x.score != null && scoreB.has(x.tmdbId))
    .map(x => Math.abs(x.score! - scoreB.get(x.tmdbId)!))

  if (gaps.length < MIN_SHARED) return { percent: null, sharedCount: gaps.length }

  const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length
  return {
    percent: Math.round(Math.max(0, 1 - avgGap / MAX_GAP) * 100),
    sharedCount: gaps.length,
  }
}
