// Pure ranking logic: no database or React, so it can be unit-tested directly.
//
// Model: a user's watched movies form ONE ordered list, grouped by sentiment
// (all LIKED first, then FINE, then DISLIKED). The order is the source of truth;
// rank and score are both derived from it, so they can never contradict the
// head-to-head comparisons the user made.

export type Sentiment = 'LIKED' | 'FINE' | 'DISLIKED'

export const SENTIMENT_ORDER: Sentiment[] = ['LIKED', 'FINE', 'DISLIKED']

// Score band for each sentiment. Bands don't overlap: LIKED scores are always > 7,
// FINE scores are in (4, 7], DISLIKED in (0, 4].
export const SENTIMENT_RANGES: Record<Sentiment, { min: number; max: number }> = {
  LIKED: { min: 7, max: 10 },
  FINE: { min: 4, max: 7 },
  DISLIKED: { min: 0, max: 4 },
}

export function isSentiment(s: unknown): s is Sentiment {
  return typeof s === 'string' && (SENTIMENT_ORDER as string[]).includes(s)
}

/**
 * Score for the movie at `position` (0 = best) in a sentiment group of `size` movies.
 * Scores are spread evenly from the band's max down toward (but never reaching) its min:
 *   size 1 -> [10]; size 2 -> [10, 8.5]; size 3 -> [10, 9, 8]  (for LIKED)
 */
export function scoreForPosition(position: number, size: number, sentiment: Sentiment): number {
  if (size <= 0 || position < 0 || position >= size) {
    throw new RangeError(`position ${position} out of range for group of size ${size}`)
  }
  const { min, max } = SENTIMENT_RANGES[sentiment]
  const step = (max - min) / size
  return Math.round((max - position * step) * 10) / 10
}

export interface RankedItem {
  id: string
  sentiment: Sentiment
}

export interface RankAssignment {
  id: string
  sentiment: Sentiment
  rank: number // 1-based position in the user's full list
  score: number
}

/**
 * Group items by sentiment, preserving their relative order within each group.
 * `items` must already be in the user's current best-to-worst order.
 */
export function groupBySentiment<T extends RankedItem>(items: T[]): Record<Sentiment, T[]> {
  const groups: Record<Sentiment, T[]> = { LIKED: [], FINE: [], DISLIKED: [] }
  for (const item of items) groups[item.sentiment].push(item)
  return groups
}

/**
 * Insert (or move) `item` to `position` within its sentiment group.
 * Any existing entry with the same id is removed first, so this also handles
 * re-ranking a movie and changing its sentiment. Position is clamped to the group.
 */
export function insertAt<T extends RankedItem>(ordered: T[], item: T, position: number): T[] {
  const groups = groupBySentiment(ordered.filter(x => x.id !== item.id))
  const group = groups[item.sentiment]
  const clamped = Math.max(0, Math.min(Math.floor(position), group.length))
  group.splice(clamped, 0, item)
  return SENTIMENT_ORDER.flatMap(s => groups[s])
}

/** Remove an item and return the remaining order. */
export function removeItem<T extends RankedItem>(ordered: T[], id: string): T[] {
  return ordered.filter(x => x.id !== id)
}

/** Derive rank and score for every item from the order. */
export function assignRanksAndScores(ordered: RankedItem[]): RankAssignment[] {
  const groups = groupBySentiment(ordered)
  const result: RankAssignment[] = []
  let rank = 1
  for (const sentiment of SENTIMENT_ORDER) {
    const group = groups[sentiment]
    group.forEach((item, i) => {
      result.push({ id: item.id, sentiment, rank: rank++, score: scoreForPosition(i, group.length, sentiment) })
    })
  }
  return result
}
