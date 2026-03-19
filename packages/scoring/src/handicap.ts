import type { PlayingHandicapInput, HandicapAllocation, HoleData } from './types.js'

/**
 * Convert a handicap index to a playing handicap using WHS formula,
 * then distribute strokes across holes by stroke index.
 *
 * Playing HC = floor(Handicap Index × (Slope / 113) + (Course Rating − Par)) × allowance
 */
export function calculateHandicap(
  input: PlayingHandicapInput,
  holes: HoleData[]
): HandicapAllocation {
  const { handicapIndex, slopeRating, courseRating, par, allowancePct = 1.0 } = input

  const raw = handicapIndex * (slopeRating / 113) + (courseRating - par)
  const playingHandicap = Math.round(raw * allowancePct)

  const strokesPerHole = distributeStrokes(playingHandicap, holes)

  return { playingHandicap, strokesPerHole }
}

/**
 * Distribute playing handicap across 18 holes by stroke index.
 * HC 18 → 1 stroke per hole
 * HC 20 → 2 strokes on SI 1 & 2, 1 on rest
 * HC 0  → 0 strokes everywhere
 * Negative HC (plus-handicap) → -1 stroke on low stroke-index holes
 */
export function distributeStrokes(playingHandicap: number, holes: HoleData[]): number[] {
  const result = new Array<number>(holes.length).fill(0)

  if (playingHandicap === 0) return result

  const sorted = [...holes].sort((a, b) => a.strokeIndex - b.strokeIndex)

  if (playingHandicap > 0) {
    let remaining = playingHandicap
    let pass = 1
    while (remaining > 0) {
      for (const hole of sorted) {
        if (remaining <= 0) break
        const idx = holes.indexOf(hole)
        if (result[idx] !== undefined) {
          result[idx] = pass
        }
        remaining--
      }
      pass++
    }
  } else {
    // Plus handicap: subtract strokes from lowest SI holes
    let remaining = Math.abs(playingHandicap)
    for (const hole of sorted) {
      if (remaining <= 0) break
      const idx = holes.indexOf(hole)
      if (result[idx] !== undefined) {
        result[idx] = -1
      }
      remaining--
    }
  }

  return result
}
