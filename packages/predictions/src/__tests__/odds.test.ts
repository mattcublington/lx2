import { describe, it, expect } from 'vitest'
import {
  normalCdf,
  probABeatsB,
  calculateWinProbabilities,
  generateOutrightMarket,
  generateH2HMarket,
  probabilityToFractionalOdds,
  calculatePayout,
  settleBets,
} from '../index'
import type { PlayerForm, OddsConfig } from '../index'

const DEFAULT_CONFIG: OddsConfig = { overroundPct: 115, h2hOverroundPct: 108 }

function makePlayer(overrides: Partial<PlayerForm> & { eventPlayerId: string }): PlayerForm {
  return {
    displayName: 'Player',
    handicapIndex: 18,
    currentScore: 0,
    holesPlayed: 0,
    totalHoles: 18,
    ...overrides,
  }
}

describe('normalCdf', () => {
  it('returns 0.5 at x=0', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 5)
  })

  it('returns ~0.8413 at x=1', () => {
    expect(normalCdf(1)).toBeCloseTo(0.8413, 3)
  })

  it('returns ~0.0228 at x=-2', () => {
    expect(normalCdf(-2)).toBeCloseTo(0.0228, 3)
  })
})

describe('probABeatsB', () => {
  it('returns 0.5 when gap is 0 and equal variance', () => {
    expect(probABeatsB(0, 10, 10)).toBeCloseTo(0.5, 3)
  })

  it('returns > 0.5 when A is favoured', () => {
    expect(probABeatsB(3, 10, 10)).toBeGreaterThan(0.5)
  })

  it('returns < 0.5 when B is favoured', () => {
    expect(probABeatsB(-3, 10, 10)).toBeLessThan(0.5)
  })
})

describe('calculateWinProbabilities', () => {
  it('returns 1.0 for a single player', () => {
    const probs = calculateWinProbabilities([makePlayer({ eventPlayerId: 'a' })])
    expect(probs.get('a')).toBe(1.0)
  })

  it('probabilities sum to 1.0 for multiple players', () => {
    const players = [
      makePlayer({ eventPlayerId: 'a', handicapIndex: 10 }),
      makePlayer({ eventPlayerId: 'b', handicapIndex: 18 }),
      makePlayer({ eventPlayerId: 'c', handicapIndex: 28 }),
    ]
    const probs = calculateWinProbabilities(players)
    const sum = Array.from(probs.values()).reduce((s, v) => s + v, 0)
    expect(sum).toBeCloseTo(1.0, 5)
  })

  it('lower handicap has higher win probability (pre-play)', () => {
    const players = [
      makePlayer({ eventPlayerId: 'scratch', handicapIndex: 0 }),
      makePlayer({ eventPlayerId: 'high', handicapIndex: 36 }),
    ]
    const probs = calculateWinProbabilities(players)
    expect(probs.get('scratch')!).toBeGreaterThan(probs.get('high')!)
  })
})

describe('generateOutrightMarket', () => {
  it('generates selections sorted by favourite first', () => {
    const players = [
      makePlayer({ eventPlayerId: 'a', displayName: 'Alice', handicapIndex: 5 }),
      makePlayer({ eventPlayerId: 'b', displayName: 'Bob', handicapIndex: 20 }),
      makePlayer({ eventPlayerId: 'c', displayName: 'Charlie', handicapIndex: 36 }),
    ]
    const market = generateOutrightMarket(players, DEFAULT_CONFIG)

    expect(market.marketType).toBe('outright')
    expect(market.title).toBe('Outright Winner')
    expect(market.selections.length).toBe(3)
    // Favourite (lowest decimal odds) should be first
    expect(market.selections[0]!.decimalOdds).toBeLessThanOrEqual(market.selections[1]!.decimalOdds)
  })
})

describe('generateH2HMarket', () => {
  it('generates two selections', () => {
    const a = makePlayer({ eventPlayerId: 'a', displayName: 'Alice', handicapIndex: 12 })
    const b = makePlayer({ eventPlayerId: 'b', displayName: 'Bob', handicapIndex: 12 })
    const market = generateH2HMarket(a, b, DEFAULT_CONFIG)

    expect(market.selections.length).toBe(2)
    expect(market.title).toContain('vs')
  })

  it('equal players have near-equal odds', () => {
    const a = makePlayer({ eventPlayerId: 'a', displayName: 'Alice', handicapIndex: 18 })
    const b = makePlayer({ eventPlayerId: 'b', displayName: 'Bob', handicapIndex: 18 })
    const market = generateH2HMarket(a, b, DEFAULT_CONFIG)

    const oddsA = market.selections[0]!.decimalOdds
    const oddsB = market.selections[1]!.decimalOdds
    // Should be close to each other
    expect(Math.abs(oddsA - oddsB)).toBeLessThan(0.5)
  })
})

describe('probabilityToFractionalOdds', () => {
  it('high probability returns short odds', () => {
    const odds = probabilityToFractionalOdds(0.8)
    expect(odds.numerator / odds.denominator).toBeLessThan(1)
  })

  it('low probability returns long odds', () => {
    const odds = probabilityToFractionalOdds(0.05)
    expect(odds.numerator / odds.denominator).toBeGreaterThan(5)
  })
})

describe('calculatePayout', () => {
  it('calculates 5/1 correctly', () => {
    const payout = calculatePayout(100, { numerator: 5, denominator: 1 })
    expect(payout).toBe(600) // 100 stake + 500 winnings
  })

  it('applies dead heat divisor', () => {
    const payout = calculatePayout(100, { numerator: 4, denominator: 1 }, 2)
    expect(payout).toBe(300) // 100 + (400/2)
  })
})

describe('settleBets', () => {
  it('settles winning and losing bets', () => {
    const bets = [
      { betId: '1', selectionId: 'win', stake: 100, oddsNumerator: 3, oddsDenominator: 1 },
      { betId: '2', selectionId: 'lose', stake: 50, oddsNumerator: 2, oddsDenominator: 1 },
    ]
    const results = [
      { selectionId: 'win', isWinner: true, deadHeatDivisor: 1 },
      { selectionId: 'lose', isWinner: false, deadHeatDivisor: 1 },
    ]

    const settled = settleBets(bets, results)
    expect(settled[0]!.status).toBe('won')
    expect(settled[0]!.payout).toBe(400) // 100 + 300
    expect(settled[1]!.status).toBe('lost')
    expect(settled[1]!.payout).toBe(0)
  })
})
