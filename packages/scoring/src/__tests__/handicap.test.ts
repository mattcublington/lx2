import { describe, it, expect } from 'vitest'
import { calculateHandicap, distributeStrokes } from '../handicap.js'
import type { HoleData } from '../types.js'

const STANDARD_HOLES: HoleData[] = Array.from({ length: 18 }, (_, i) => ({
  holeNumber: i + 1,
  par: 4,
  strokeIndex: i + 1,
}))

describe('calculateHandicap', () => {
  it('standard slope (113) returns handicap index unchanged', () => {
    const { playingHandicap } = calculateHandicap(
      { handicapIndex: 18, slopeRating: 113, courseRating: 72, par: 72 },
      STANDARD_HOLES
    )
    expect(playingHandicap).toBe(18)
  })

  it('higher slope increases playing handicap', () => {
    const { playingHandicap } = calculateHandicap(
      { handicapIndex: 18, slopeRating: 130, courseRating: 72, par: 72 },
      STANDARD_HOLES
    )
    expect(playingHandicap).toBeGreaterThan(18)
  })
})

describe('distributeStrokes', () => {
  it('HC 18 gives exactly 1 stroke per hole', () => {
    const strokes = distributeStrokes(18, STANDARD_HOLES)
    expect(strokes.every((s) => s === 1)).toBe(true)
  })

  it('HC 19 gives 2 strokes on SI 1, 1 on rest', () => {
    const strokes = distributeStrokes(19, STANDARD_HOLES)
    const si1Hole = STANDARD_HOLES.findIndex((h) => h.strokeIndex === 1)
    expect(strokes[si1Hole]).toBe(2)
    expect(strokes.filter((s) => s === 1).length).toBe(17)
  })

  it('HC 0 gives no strokes', () => {
    const strokes = distributeStrokes(0, STANDARD_HOLES)
    expect(strokes.every((s) => s === 0)).toBe(true)
  })
})
