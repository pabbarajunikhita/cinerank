// Taste match between two users, computed from movies they've both ranked.
// Pure module, no database or UI code, like ranking.ts.

export interface RankedItem {
  tmdbId: number
  rank: number
}

export type TasteMatch = {
  /** 0–100, or null when there's too little overlap to say anything. */
  percent: number | null
  sharedCount: number
}

const MIN_SHARED = 3

/**
 * Looks only at movies both users ranked, puts each user's order of those
 * movies on a 0–1 scale (0 = favorite of the shared set, 1 = least favorite),
 * and averages how far apart the two users place each movie. Same order
 * scores 100, exactly reversed scores 0.
 */
export function computeTasteMatch(a: RankedItem[], b: RankedItem[]): TasteMatch {
  const inB = new Set(b.map(x => x.tmdbId))
  const sharedIds = new Set(a.filter(x => inB.has(x.tmdbId)).map(x => x.tmdbId))

  if (sharedIds.size < MIN_SHARED) return { percent: null, sharedCount: sharedIds.size }

  const pa = percentiles(a.filter(x => sharedIds.has(x.tmdbId)))
  const pb = percentiles(b.filter(x => sharedIds.has(x.tmdbId)))

  let totalGap = 0
  for (const id of sharedIds) totalGap += Math.abs(pa.get(id)! - pb.get(id)!)

  // The largest possible total gap comes from fully reversed order; scale by it.
  const n = sharedIds.size
  let maxGap = 0
  for (let i = 0; i < n; i++) maxGap += Math.abs((2 * i) / (n - 1) - 1)

  return { percent: Math.round((1 - totalGap / maxGap) * 100), sharedCount: n }
}

function percentiles(items: RankedItem[]): Map<number, number> {
  const sorted = [...items].sort((x, y) => x.rank - y.rank)
  const denom = Math.max(sorted.length - 1, 1)
  return new Map(sorted.map((item, i) => [item.tmdbId, i / denom]))
}
