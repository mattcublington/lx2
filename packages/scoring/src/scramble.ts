import type { ScrambleInput, ScrambleResult } from './types.js'

/**
 * Default scramble handicap allowance weights by team size.
 *
 * Players sorted by playing handicap (ascending):
 * - 2-person: 35% low + 15% high
 * - 3-person: 20% low + 15% mid + 10% high
 * - 4-person: 20% low + 15% 2nd + 10% 3rd + 5% high
 */
const DEFAULT_ALLOWANCES: Record<2 | 3 | 4, number[]> = {
  2: [0.35, 0.15],
  3: [0.20, 0.15, 0.10],
  4: [0.20, 0.15, 0.10, 0.05],
}

/**
 * Calculate scramble (Texas Scramble) result for a team.
 *
 * Team handicap is a weighted combination of individual playing handicaps.
 * One scorecard per team — grossStrokes is the team's score per hole.
 */
export function calculateScramble(input: ScrambleInput): ScrambleResult {
  const { holes, team, grossStrokes, teamSize, allowanceOverride } = input

  // Calculate team handicap
  const allowances = allowanceOverride ?? DEFAULT_ALLOWANCES[teamSize]
  const sortedHandicaps = [...team.players]
    .map((p) => p.playingHandicap)
    .sort((a, b) => a - b)

  let teamHandicap = 0
  for (let i = 0; i < Math.min(sortedHandicaps.length, allowances.length); i++) {
    teamHandicap += (sortedHandicaps[i] ?? 0) * (allowances[i] ?? 0)
  }
  teamHandicap = Math.round(teamHandicap)

  // Check for NR (any null hole)
  const hasPickUp = grossStrokes.some((s) => s === null || s === undefined)
  if (hasPickUp) {
    return { teamHandicap, grossTotal: null, netTotal: null, relativeToPar: null, nR: true }
  }

  const grossTotal = (grossStrokes as number[]).reduce((sum, s) => sum + s, 0)
  const netTotal = grossTotal - teamHandicap
  const coursePar = holes.reduce((sum, h) => sum + h.par, 0)

  return {
    teamHandicap,
    grossTotal,
    netTotal,
    relativeToPar: netTotal - coursePar,
    nR: false,
  }
}
