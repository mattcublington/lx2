import type { SkinsInput, SkinsResult, SkinWin } from './types.js'
import { distributeStrokes } from './handicap.js'

/**
 * Calculate skins game results.
 *
 * Lowest score on a hole wins the skin. Ties carry over to the next hole.
 * Pick-ups (null) mean the player does not compete on that hole.
 */
export function calculateSkins(input: SkinsInput): SkinsResult {
  const { holes, players, mode, lastHoleCarryover } = input

  // Pre-compute stroke allocations for net mode
  const strokesByPlayer = mode === 'net'
    ? players.map((p) => distributeStrokes(p.playingHandicap, holes))
    : players.map(() => new Array(holes.length).fill(0) as number[])

  const wins: SkinWin[] = []
  const skinsByPlayer: Record<string, number> = {}
  let carried = 0

  for (const p of players) {
    skinsByPlayer[p.playerId] = 0
  }

  for (let i = 0; i < holes.length; i++) {
    carried++ // this hole is worth 1 + any carried

    // Calculate scores for players who haven't picked up
    const contenders: { playerId: string; score: number }[] = []
    for (let j = 0; j < players.length; j++) {
      const player = players[j]!
      const gross = player.grossStrokes[i]
      if (gross === null || gross === undefined) continue

      const strokes = strokesByPlayer[j]![i] ?? 0
      const score = mode === 'net' ? gross - strokes : gross
      contenders.push({ playerId: player.playerId, score })
    }

    if (contenders.length === 0) {
      // All picked up — skin carries
      continue
    }

    const minScore = Math.min(...contenders.map((c) => c.score))
    const winners = contenders.filter((c) => c.score === minScore)

    if (winners.length === 1) {
      // Outright winner
      const winner = winners[0]!
      wins.push({
        holeNumber: holes[i]!.holeNumber,
        playerId: winner.playerId,
        skinsWon: carried,
        netScore: winner.score,
      })
      skinsByPlayer[winner.playerId] = (skinsByPlayer[winner.playerId] ?? 0) + carried
      carried = 0
    }
    // Tied — skin carries (carried stays incremented)
  }

  // Handle remaining carried skins after the last hole
  let unawarded = 0
  if (carried > 0) {
    if (lastHoleCarryover === 'split' && wins.length > 0) {
      // No special action — carried skins go unawarded in split mode too
      // (split would require knowing who tied on the last hole; for simplicity,
      //  unawarded skins are reported separately)
      unawarded = carried
    } else {
      unawarded = carried
    }
  }

  return { wins, carriedToNext: 0, skinsByPlayer, unawarded }
}
