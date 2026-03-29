import type { RvBInput, RvBResult, RvBTeamResult } from './types.js'

/**
 * Calculate Reds vs Blues team aggregate result.
 *
 * Each player plays individual Stableford; team score = sum of players' totals.
 * Optional bestOf: only count the top N scores per team.
 */
export function calculateRvB(input: RvBInput): RvBResult {
  const { players, bestOf } = input

  const reds = players.filter((p) => p.team === 'red')
  const blues = players.filter((p) => p.team === 'blue')

  const red = computeTeam(reds, bestOf)
  const blue = computeTeam(blues, bestOf)

  const margin = Math.abs(red.total - blue.total)
  let winner: RvBResult['winner']
  if (red.total > blue.total) winner = 'red'
  else if (blue.total > red.total) winner = 'blue'
  else winner = 'tied'

  return { red, blue, winner, margin }
}

function computeTeam(
  players: RvBInput['players'],
  bestOf?: number
): RvBTeamResult {
  // Sort descending by score
  const sorted = [...players].sort((a, b) => b.stablefordTotal - a.stablefordTotal)

  const counted = bestOf !== undefined ? sorted.slice(0, bestOf) : sorted
  const total = counted.reduce((sum, p) => sum + p.stablefordTotal, 0)
  const playerCount = counted.length

  return {
    total,
    playerCount,
    average: playerCount > 0 ? Math.round((total / playerCount) * 10) / 10 : 0,
    countedPlayers: counted.map((p) => p.playerId),
  }
}
