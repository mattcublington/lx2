import { describe, it, expect } from 'vitest'
import { calculateSkins } from '../skins.js'
import type { HoleData } from '../types.js'

const HOLES_9: HoleData[] = Array.from({ length: 9 }, (_, i) => ({
  holeNumber: i + 1,
  par: 4,
  strokeIndex: i + 1,
}))

describe('calculateSkins', () => {
  it('outright winner on every hole = 1 skin each', () => {
    // Player A always scores 3 (birdie), Player B always scores 5 (bogey)
    const result = calculateSkins({
      holes: HOLES_9,
      players: [
        { playerId: 'a', grossStrokes: new Array(9).fill(3), playingHandicap: 0 },
        { playerId: 'b', grossStrokes: new Array(9).fill(5), playingHandicap: 0 },
      ],
      mode: 'gross',
      lastHoleCarryover: 'unawarded',
    })
    expect(result.wins.length).toBe(9)
    expect(result.skinsByPlayer['a']).toBe(9)
    expect(result.skinsByPlayer['b']).toBe(0)
    expect(result.unawarded).toBe(0)
  })

  it('tied holes carry skins to next', () => {
    // Holes 1-2: both par (tie), Hole 3: A birdies
    const strokesA = [4, 4, 3, 4, 4, 4, 4, 4, 4]
    const strokesB = [4, 4, 4, 4, 4, 4, 4, 4, 4]

    const result = calculateSkins({
      holes: HOLES_9,
      players: [
        { playerId: 'a', grossStrokes: strokesA, playingHandicap: 0 },
        { playerId: 'b', grossStrokes: strokesB, playingHandicap: 0 },
      ],
      mode: 'gross',
      lastHoleCarryover: 'unawarded',
    })

    // Holes 1-2 carry (2 skins), Hole 3 wins 3 skins total
    const hole3Win = result.wins.find((w) => w.holeNumber === 3)
    expect(hole3Win).toBeDefined()
    expect(hole3Win!.skinsWon).toBe(3)
    expect(hole3Win!.playerId).toBe('a')
  })

  it('unawarded skins when last hole ties', () => {
    // All holes tie
    const result = calculateSkins({
      holes: HOLES_9,
      players: [
        { playerId: 'a', grossStrokes: new Array(9).fill(4), playingHandicap: 0 },
        { playerId: 'b', grossStrokes: new Array(9).fill(4), playingHandicap: 0 },
      ],
      mode: 'gross',
      lastHoleCarryover: 'unawarded',
    })
    expect(result.wins.length).toBe(0)
    expect(result.unawarded).toBe(9)
  })

  it('net mode applies handicap strokes', () => {
    // A: gross 5 every hole, HC 9 (gets 1 stroke on SI 1-9) → net 4 on all
    // B: gross 4 every hole, HC 0 → net 4 on all → all ties
    const result = calculateSkins({
      holes: HOLES_9,
      players: [
        { playerId: 'a', grossStrokes: new Array(9).fill(5), playingHandicap: 9 },
        { playerId: 'b', grossStrokes: new Array(9).fill(4), playingHandicap: 0 },
      ],
      mode: 'net',
      lastHoleCarryover: 'unawarded',
    })
    // All net scores are 4 → all ties
    expect(result.wins.length).toBe(0)
    expect(result.unawarded).toBe(9)
  })

  it('pick-up means player does not compete', () => {
    const strokesA: (number | null)[] = [null, 4, 4, 4, 4, 4, 4, 4, 4]
    const strokesB = new Array(9).fill(4) as number[]

    const result = calculateSkins({
      holes: HOLES_9,
      players: [
        { playerId: 'a', grossStrokes: strokesA, playingHandicap: 0 },
        { playerId: 'b', grossStrokes: strokesB, playingHandicap: 0 },
      ],
      mode: 'gross',
      lastHoleCarryover: 'unawarded',
    })
    // Hole 1: only B competes → B wins
    expect(result.wins[0]!.playerId).toBe('b')
    expect(result.wins[0]!.holeNumber).toBe(1)
  })

  it('three-player game with mixed results', () => {
    const result = calculateSkins({
      holes: HOLES_9,
      players: [
        { playerId: 'a', grossStrokes: [3, 4, 4, 4, 4, 4, 4, 4, 4], playingHandicap: 0 },
        { playerId: 'b', grossStrokes: [4, 3, 4, 4, 4, 4, 4, 4, 4], playingHandicap: 0 },
        { playerId: 'c', grossStrokes: [4, 4, 3, 4, 4, 4, 4, 4, 4], playingHandicap: 0 },
      ],
      mode: 'gross',
      lastHoleCarryover: 'unawarded',
    })
    expect(result.skinsByPlayer['a']).toBe(1)
    expect(result.skinsByPlayer['b']).toBe(1)
    expect(result.skinsByPlayer['c']).toBe(1)
    // Holes 4-9 all tied → 6 unawarded
    expect(result.unawarded).toBe(6)
  })
})
