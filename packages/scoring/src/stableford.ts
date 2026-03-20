import type { StablefordInput, StablefordResult, HoleData } from './types.js'
import { distributeStrokes } from './handicap.js'

const STABLEFORD_POINTS: Record<number, number> = {
  [-3]: 5, // albatross
  [-2]: 4, // eagle
  [-1]: 3, // birdie
  [0]: 2,  // par
  [1]: 1,  // bogey
}

/**
 * Calculate Stableford points for a round.
 * Returns 0 for any hole where grossStrokes is null (pick-up).
 */
export function calculateStableford(input: StablefordInput): StablefordResult {
  const { holes, grossStrokes, playingHandicap } = input
  const strokesPerHole = distributeStrokes(playingHandicap, holes)

  const pointsPerHole: number[] = []
  const netStrokes: (number | null)[] = []

  for (let i = 0; i < holes.length; i++) {
    const hole = holes[i]
    const gross = grossStrokes[i]
    const strokes = strokesPerHole[i] ?? 0

    if (gross === null || gross === undefined || hole === undefined) {
      pointsPerHole.push(0)
      netStrokes.push(null)
      continue
    }

    const net = gross - strokes
    const relativeToPar = net - hole.par
    const points = STABLEFORD_POINTS[relativeToPar] ?? (relativeToPar <= -4 ? 6 : 0)

    pointsPerHole.push(points)
    netStrokes.push(net)
  }

  return {
    pointsPerHole,
    total: pointsPerHole.reduce((sum, p) => sum + p, 0),
    netStrokes,
  }
}
