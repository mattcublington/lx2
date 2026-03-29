import { describe, it, expect } from 'vitest'
import { calculateRvB } from '../rvb.js'

describe('calculateRvB', () => {
  it('sums team totals and picks winner', () => {
    const result = calculateRvB({
      players: [
        { playerId: 'r1', team: 'red', stablefordTotal: 30 },
        { playerId: 'r2', team: 'red', stablefordTotal: 28 },
        { playerId: 'b1', team: 'blue', stablefordTotal: 32 },
        { playerId: 'b2', team: 'blue', stablefordTotal: 25 },
      ],
    })
    expect(result.red.total).toBe(58)
    expect(result.blue.total).toBe(57)
    expect(result.winner).toBe('red')
    expect(result.margin).toBe(1)
  })

  it('tied result', () => {
    const result = calculateRvB({
      players: [
        { playerId: 'r1', team: 'red', stablefordTotal: 30 },
        { playerId: 'b1', team: 'blue', stablefordTotal: 30 },
      ],
    })
    expect(result.winner).toBe('tied')
    expect(result.margin).toBe(0)
  })

  it('bestOf counts only top N per team', () => {
    const result = calculateRvB({
      players: [
        { playerId: 'r1', team: 'red', stablefordTotal: 40 },
        { playerId: 'r2', team: 'red', stablefordTotal: 35 },
        { playerId: 'r3', team: 'red', stablefordTotal: 20 }, // not counted
        { playerId: 'b1', team: 'blue', stablefordTotal: 38 },
        { playerId: 'b2', team: 'blue', stablefordTotal: 36 },
        { playerId: 'b3', team: 'blue', stablefordTotal: 22 }, // not counted
      ],
      bestOf: 2,
    })
    expect(result.red.total).toBe(75) // 40+35
    expect(result.blue.total).toBe(74) // 38+36
    expect(result.red.playerCount).toBe(2)
    expect(result.red.countedPlayers).toEqual(['r1', 'r2'])
    expect(result.winner).toBe('red')
  })

  it('calculates average per player', () => {
    const result = calculateRvB({
      players: [
        { playerId: 'r1', team: 'red', stablefordTotal: 30 },
        { playerId: 'r2', team: 'red', stablefordTotal: 32 },
        { playerId: 'b1', team: 'blue', stablefordTotal: 28 },
      ],
    })
    expect(result.red.average).toBe(31)
    expect(result.blue.average).toBe(28)
  })

  it('handles empty teams', () => {
    const result = calculateRvB({
      players: [
        { playerId: 'r1', team: 'red', stablefordTotal: 30 },
      ],
    })
    expect(result.red.total).toBe(30)
    expect(result.blue.total).toBe(0)
    expect(result.blue.playerCount).toBe(0)
    expect(result.winner).toBe('red')
  })
})
