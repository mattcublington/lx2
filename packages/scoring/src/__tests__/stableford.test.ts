import { describe, it, expect } from 'vitest'
import { calculateStableford } from '../stableford.js'
import type { HoleData } from '../types.js'

const PAR4_HOLES: HoleData[] = Array.from({ length: 18 }, (_, i) => ({
  holeNumber: i + 1,
  par: 4,
  strokeIndex: i + 1,
}))

describe('calculateStableford', () => {
  it('scores par on every hole with zero handicap = 36 points', () => {
    const result = calculateStableford({
      holes: PAR4_HOLES,
      grossStrokes: new Array(18).fill(4),
      playingHandicap: 0,
    })
    expect(result.total).toBe(36)
    expect(result.pointsPerHole.every((p) => p === 2)).toBe(true)
  })

  it('scores a birdie = 3 points', () => {
    const strokes = new Array(18).fill(4)
    strokes[0] = 3 // birdie on hole 1
    const result = calculateStableford({
      holes: PAR4_HOLES,
      grossStrokes: strokes,
      playingHandicap: 0,
    })
    expect(result.pointsPerHole[0]).toBe(3)
    expect(result.total).toBe(37)
  })

  it('double bogey or worse = 0 points', () => {
    const strokes = new Array(18).fill(4)
    strokes[0] = 6 // double bogey
    const result = calculateStableford({
      holes: PAR4_HOLES,
      grossStrokes: strokes,
      playingHandicap: 0,
    })
    expect(result.pointsPerHole[0]).toBe(0)
  })

  it('pick-up (null) = 0 points, no NR', () => {
    const strokes: (number | null)[] = new Array(18).fill(4)
    strokes[5] = null
    const result = calculateStableford({
      holes: PAR4_HOLES,
      grossStrokes: strokes,
      playingHandicap: 0,
    })
    expect(result.pointsPerHole[5]).toBe(0)
    expect(result.netStrokes[5]).toBeNull()
  })

  it('18 handicap receives 1 stroke per hole, bogey = 2pts', () => {
    // Bogey (5) on every hole with 18 handicap → net par → 2pts per hole
    const result = calculateStableford({
      holes: PAR4_HOLES,
      grossStrokes: new Array(18).fill(5),
      playingHandicap: 18,
    })
    expect(result.total).toBe(36)
    expect(result.pointsPerHole.every((p) => p === 2)).toBe(true)
  })
})
