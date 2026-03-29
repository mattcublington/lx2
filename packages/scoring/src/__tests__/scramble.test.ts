import { describe, it, expect } from 'vitest'
import { calculateScramble } from '../scramble.js'
import type { HoleData } from '../types.js'

const PAR4_HOLES: HoleData[] = Array.from({ length: 18 }, (_, i) => ({
  holeNumber: i + 1,
  par: 4,
  strokeIndex: i + 1,
}))

describe('calculateScramble', () => {
  it('4-person team: weighted handicap with default allowances', () => {
    const result = calculateScramble({
      holes: PAR4_HOLES,
      team: {
        teamId: 't1',
        teamName: 'Team A',
        players: [
          { playerId: 'p1', playingHandicap: 10 }, // low
          { playerId: 'p2', playingHandicap: 15 }, // 2nd
          { playerId: 'p3', playingHandicap: 20 }, // 3rd
          { playerId: 'p4', playingHandicap: 28 }, // high
        ],
      },
      grossStrokes: new Array(18).fill(4), // par on every hole
      teamSize: 4,
    })
    // HC = round(10*0.20 + 15*0.15 + 20*0.10 + 28*0.05)
    //     = round(2 + 2.25 + 2 + 1.4)
    //     = round(7.65) = 8
    expect(result.teamHandicap).toBe(8)
    expect(result.grossTotal).toBe(72)
    expect(result.netTotal).toBe(64)
    expect(result.relativeToPar).toBe(-8) // 64 - 72
    expect(result.nR).toBe(false)
  })

  it('3-person team uses correct allowances', () => {
    const result = calculateScramble({
      holes: PAR4_HOLES,
      team: {
        teamId: 't1',
        teamName: 'Team B',
        players: [
          { playerId: 'p1', playingHandicap: 10 },
          { playerId: 'p2', playingHandicap: 20 },
          { playerId: 'p3', playingHandicap: 30 },
        ],
      },
      grossStrokes: new Array(18).fill(4),
      teamSize: 3,
    })
    // HC = round(10*0.20 + 20*0.15 + 30*0.10) = round(2+3+3) = 8
    expect(result.teamHandicap).toBe(8)
  })

  it('2-person team uses correct allowances', () => {
    const result = calculateScramble({
      holes: PAR4_HOLES,
      team: {
        teamId: 't1',
        teamName: 'Team C',
        players: [
          { playerId: 'p1', playingHandicap: 10 },
          { playerId: 'p2', playingHandicap: 20 },
        ],
      },
      grossStrokes: new Array(18).fill(4),
      teamSize: 2,
    })
    // HC = round(10*0.35 + 20*0.15) = round(3.5+3) = round(6.5) = 7
    expect(result.teamHandicap).toBe(7)
  })

  it('null hole score = NR', () => {
    const strokes: (number | null)[] = new Array(18).fill(4)
    strokes[9] = null

    const result = calculateScramble({
      holes: PAR4_HOLES,
      team: {
        teamId: 't1',
        teamName: 'Team D',
        players: [{ playerId: 'p1', playingHandicap: 10 }],
      },
      grossStrokes: strokes,
      teamSize: 2,
    })
    expect(result.nR).toBe(true)
    expect(result.grossTotal).toBeNull()
    expect(result.netTotal).toBeNull()
  })

  it('supports custom allowance override', () => {
    const result = calculateScramble({
      holes: PAR4_HOLES,
      team: {
        teamId: 't1',
        teamName: 'Custom',
        players: [
          { playerId: 'p1', playingHandicap: 10 },
          { playerId: 'p2', playingHandicap: 20 },
          { playerId: 'p3', playingHandicap: 30 },
          { playerId: 'p4', playingHandicap: 40 },
        ],
      },
      grossStrokes: new Array(18).fill(4),
      teamSize: 4,
      allowanceOverride: [0.25, 0.20, 0.15, 0.10],
    })
    // HC = round(10*0.25 + 20*0.20 + 30*0.15 + 40*0.10)
    //    = round(2.5+4+4.5+4) = round(15) = 15
    expect(result.teamHandicap).toBe(15)
  })

  it('sorts players by handicap regardless of input order', () => {
    const result = calculateScramble({
      holes: PAR4_HOLES,
      team: {
        teamId: 't1',
        teamName: 'Unsorted',
        players: [
          { playerId: 'p1', playingHandicap: 28 }, // high, input first
          { playerId: 'p2', playingHandicap: 10 }, // low, input second
        ],
      },
      grossStrokes: new Array(18).fill(4),
      teamSize: 2,
    })
    // Should sort: 10 (low) * 0.35 + 28 (high) * 0.15 = 3.5+4.2 = 7.7 → 8
    expect(result.teamHandicap).toBe(8)
  })
})
