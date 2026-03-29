import { describe, it, expect } from 'vitest'
import { calculateBetterBall } from '../better-ball.js'
import type { HoleData } from '../types.js'

const PAR4_HOLES: HoleData[] = Array.from({ length: 18 }, (_, i) => ({
  holeNumber: i + 1,
  par: 4,
  strokeIndex: i + 1,
}))

describe('calculateBetterBall', () => {
  describe('stableford mode', () => {
    it('both par on every hole, zero HC = 36 pair points', () => {
      const result = calculateBetterBall({
        holes: PAR4_HOLES,
        playerA: { grossStrokes: new Array(18).fill(4), playingHandicap: 0 },
        playerB: { grossStrokes: new Array(18).fill(4), playingHandicap: 0 },
        mode: 'stableford',
      })
      expect(result.pairTotal).toBe(36)
      expect(result.nR).toBe(false)
    })

    it('takes the better score per hole', () => {
      const strokesA = new Array(18).fill(4) as number[] // par = 2pts
      const strokesB = new Array(18).fill(4) as number[]
      strokesB[0] = 3 // birdie on hole 1 = 3pts
      strokesA[1] = 3 // birdie on hole 2 = 3pts

      const result = calculateBetterBall({
        holes: PAR4_HOLES,
        playerA: { grossStrokes: strokesA, playingHandicap: 0 },
        playerB: { grossStrokes: strokesB, playingHandicap: 0 },
        mode: 'stableford',
      })
      // Hole 1: B's 3pts, Hole 2: A's 3pts, rest: 2pts each = 3+3+16*2 = 38
      expect(result.pairTotal).toBe(38)
    })

    it('uses other player score when one picks up', () => {
      const strokesA: (number | null)[] = new Array(18).fill(4)
      strokesA[0] = null // A picks up hole 1

      const result = calculateBetterBall({
        holes: PAR4_HOLES,
        playerA: { grossStrokes: strokesA, playingHandicap: 0 },
        playerB: { grossStrokes: new Array(18).fill(4), playingHandicap: 0 },
        mode: 'stableford',
      })
      // B's par used on hole 1 = 2pts, rest normal
      expect(result.pairTotal).toBe(36)
      expect(result.holes[0]!.selectedPlayer).toBe('B')
    })

    it('both pick up = 0 for that hole', () => {
      const strokesA: (number | null)[] = new Array(18).fill(4)
      const strokesB: (number | null)[] = new Array(18).fill(4)
      strokesA[0] = null
      strokesB[0] = null

      const result = calculateBetterBall({
        holes: PAR4_HOLES,
        playerA: { grossStrokes: strokesA, playingHandicap: 0 },
        playerB: { grossStrokes: strokesB, playingHandicap: 0 },
        mode: 'stableford',
      })
      expect(result.holes[0]!.selectedPlayer).toBe('both_pickup')
      expect(result.holes[0]!.pairScore).toBe(0)
      expect(result.pairTotal).toBe(34) // 17 holes * 2pts
    })

    it('tracks which player was used per hole', () => {
      const strokesA = new Array(18).fill(5) as number[] // bogey
      const strokesB = new Array(18).fill(4) as number[] // par

      const result = calculateBetterBall({
        holes: PAR4_HOLES,
        playerA: { grossStrokes: strokesA, playingHandicap: 0 },
        playerB: { grossStrokes: strokesB, playingHandicap: 0 },
        mode: 'stableford',
      })
      // B is better on every hole (2pts vs 1pt)
      expect(result.playerBTotalUsed).toBe(18)
      expect(result.playerATotalUsed).toBe(0)
    })

    it('tie goes to A by convention', () => {
      const result = calculateBetterBall({
        holes: PAR4_HOLES,
        playerA: { grossStrokes: new Array(18).fill(4), playingHandicap: 0 },
        playerB: { grossStrokes: new Array(18).fill(4), playingHandicap: 0 },
        mode: 'stableford',
      })
      expect(result.playerATotalUsed).toBe(18)
      expect(result.playerBTotalUsed).toBe(0)
    })
  })

  describe('strokeplay mode', () => {
    it('takes lower net score per hole', () => {
      const strokesA = new Array(18).fill(4) as number[] // par
      const strokesB = new Array(18).fill(5) as number[] // bogey
      strokesB[0] = 3 // birdie on hole 1

      const result = calculateBetterBall({
        holes: PAR4_HOLES,
        playerA: { grossStrokes: strokesA, playingHandicap: 0 },
        playerB: { grossStrokes: strokesB, playingHandicap: 0 },
        mode: 'strokeplay',
      })
      // Hole 1: B's 3, rest: A's 4 each = 3 + 17*4 = 71
      expect(result.pairTotal).toBe(71)
      expect(result.holes[0]!.selectedPlayer).toBe('B')
    })

    it('both pick up sets nR flag', () => {
      const strokesA: (number | null)[] = new Array(18).fill(4)
      const strokesB: (number | null)[] = new Array(18).fill(4)
      strokesA[5] = null
      strokesB[5] = null

      const result = calculateBetterBall({
        holes: PAR4_HOLES,
        playerA: { grossStrokes: strokesA, playingHandicap: 0 },
        playerB: { grossStrokes: strokesB, playingHandicap: 0 },
        mode: 'strokeplay',
      })
      expect(result.nR).toBe(true)
    })

    it('applies handicap strokes correctly', () => {
      // Both bogey every hole. A has 18 HC (1 stroke per hole), B has 0
      // A net = 5-1 = 4 per hole; B net = 5 per hole
      // A is always better
      const result = calculateBetterBall({
        holes: PAR4_HOLES,
        playerA: { grossStrokes: new Array(18).fill(5), playingHandicap: 18 },
        playerB: { grossStrokes: new Array(18).fill(5), playingHandicap: 0 },
        mode: 'strokeplay',
      })
      expect(result.playerATotalUsed).toBe(18)
      expect(result.pairTotal).toBe(72) // net 4 * 18
    })
  })
})
