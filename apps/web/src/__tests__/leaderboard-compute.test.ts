import { describe, it, expect } from 'vitest'
import { computeLeaderboard, countback } from '@lx2/leaderboard'
import type { PlayerData, LeaderboardConfig } from '@lx2/leaderboard'
import type { HoleData } from '@lx2/scoring'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** 9 par-4 holes, SI 1–9. */
function makeHoles(count: number): HoleData[] {
  return Array.from({ length: count }, (_, i) => ({
    holeNumber: i + 1,
    par: 4,
    strokeIndex: i + 1,
  }))
}

const HOLES_18 = makeHoles(18)

const STABLEFORD_CONFIG: LeaderboardConfig = {
  format: 'stableford',
  roundType: '18',
  allowancePct: 1.0,
}

const STROKEPLAY_CONFIG: LeaderboardConfig = {
  format: 'strokeplay',
  roundType: '18',
  allowancePct: 1.0,
}

function makePlayer(
  id: string,
  displayName: string,
  handicapIndex: number,
  grossStrokes: (number | null)[],
): PlayerData {
  return {
    eventPlayerId: id,
    scorecardId: id,
    displayName,
    handicapIndex,
    grossStrokes,
    badges: [],
  }
}

/** Fill an array with `value` for `count` entries. */
function fill(count: number, value: number | null): (number | null)[] {
  return new Array(count).fill(value)
}

// ─── computeLeaderboard — stableford ─────────────────────────────────────────

describe('computeLeaderboard — stableford', () => {
  it('places the higher-scoring player first', () => {
    // Player A: all pars → 2pts × 18 = 36pts (scratch)
    // Player B: all bogeys → 1pt × 18 = 18pts (scratch)
    const players = [
      makePlayer('b', 'Bogey Bob', 0, fill(18, 5)),
      makePlayer('a', 'Par Alice', 0, fill(18, 4)),
    ]
    const lb = computeLeaderboard(players, new Map(), HOLES_18, STABLEFORD_CONFIG)
    expect(lb[0]!.player.displayName).toBe('Par Alice')
    expect(lb[0]!.score).toBe(36)
    expect(lb[0]!.positionLabel).toBe('1')
    expect(lb[0]!.isFirst).toBe(true)
    expect(lb[1]!.positionLabel).toBe('2')
    expect(lb[1]!.isFirst).toBe(false)
  })

  it('assigns T1 labels for a tie', () => {
    const players = [
      makePlayer('a', 'Alice', 0, fill(18, 4)), // 36pts
      makePlayer('b', 'Bob', 0, fill(18, 4)),   // 36pts
    ]
    const lb = computeLeaderboard(players, new Map(), HOLES_18, STABLEFORD_CONFIG)
    expect(lb[0]!.positionLabel).toBe('T1')
    expect(lb[1]!.positionLabel).toBe('T1')
    expect(lb[0]!.isFirst).toBe(true)
    expect(lb[1]!.isFirst).toBe(true)
  })

  it('shows "–" position for player who has not started', () => {
    const players = [
      makePlayer('a', 'Alice', 0, fill(18, 4)),
      makePlayer('b', 'Bob', 0, fill(18, null)), // no scores yet
    ]
    const lb = computeLeaderboard(players, new Map(), HOLES_18, STABLEFORD_CONFIG)
    const bob = lb.find(r => r.player.displayName === 'Bob')!
    expect(bob.positionLabel).toBe('–')
    expect(bob.thru).toBe(0)
  })

  it('uses liveScores map when provided', () => {
    const players = [
      makePlayer('a', 'Alice', 0, fill(18, null)), // no initial scores
    ]
    // Live scores: all pars
    const liveScores = new Map<string, (number | null)[]>([['a', fill(18, 4)]])
    const lb = computeLeaderboard(players, liveScores, HOLES_18, STABLEFORD_CONFIG)
    expect(lb[0]!.score).toBe(36)
    expect(lb[0]!.thru).toBe(18)
  })

  it('counts thru as number of non-null scores', () => {
    const players = [makePlayer('a', 'Alice', 0, [...fill(9, 4), ...fill(9, null)])]
    const lb = computeLeaderboard(players, new Map(), HOLES_18, STABLEFORD_CONFIG)
    expect(lb[0]!.thru).toBe(9)
  })

  it('active players rank above not-yet-started players', () => {
    const players = [
      makePlayer('b', 'Bob', 0, fill(18, null)),    // not started
      makePlayer('a', 'Alice', 0, fill(18, 4)),      // 36pts, full round
    ]
    const lb = computeLeaderboard(players, new Map(), HOLES_18, STABLEFORD_CONFIG)
    expect(lb[0]!.player.displayName).toBe('Alice')
  })

  it('applies allowancePct to playing handicap', () => {
    // hc=18, 75% allowance → playing hc = 14 (round(18×0.75))
    // with hc=18 full → 1 shot per hole → par nets birdie (3pts) → 3×18=54pts
    // with hc=14 → only 14 shots → not all holes get extra shot
    const config: LeaderboardConfig = { format: 'stableford', roundType: '18', allowancePct: 0.75 }
    const fullConfig: LeaderboardConfig = { format: 'stableford', roundType: '18', allowancePct: 1.0 }
    const players = [makePlayer('a', 'Alice', 18, fill(18, 4))]
    const lbFull = computeLeaderboard(players, new Map(), HOLES_18, fullConfig)
    const lbReduced = computeLeaderboard(players, new Map(), HOLES_18, config)
    // reduced allowance → fewer shots → lower stableford score
    expect(lbReduced[0]!.score).toBeLessThan(lbFull[0]!.score)
  })
})

// ─── computeLeaderboard — strokeplay ─────────────────────────────────────────

describe('computeLeaderboard — strokeplay', () => {
  it('places the lower-scoring player first', () => {
    const players = [
      makePlayer('b', 'Bogey Bob', 0, fill(18, 5)), // 90 gross
      makePlayer('a', 'Par Alice', 0, fill(18, 4)), // 72 gross
    ]
    const lb = computeLeaderboard(players, new Map(), HOLES_18, STROKEPLAY_CONFIG)
    expect(lb[0]!.player.displayName).toBe('Par Alice')
    expect(lb[0]!.score).toBe(72)
  })

  it('marks NR (no return) when player has a pickup', () => {
    const scores = fill(18, 4)
    scores[5] = null // pickup on hole 6
    const players = [makePlayer('a', 'Alice', 0, scores)]
    const lb = computeLeaderboard(players, new Map(), HOLES_18, STROKEPLAY_CONFIG)
    expect(lb[0]!.nR).toBe(true)
    expect(lb[0]!.positionLabel).toBe('NR')
  })

  it('places active players first, NR and not-started afterwards', () => {
    const nrScores = fill(18, 4)
    nrScores[0] = null // pickup on hole 1
    const players = [
      makePlayer('c', 'Charlie', 0, fill(18, null)), // never started (all null → also nR=true internally)
      makePlayer('b', 'Bob NR', 0, nrScores),         // played 17 holes then pickup → nR=true
      makePlayer('a', 'Alice', 0, fill(18, 4)),        // complete round, active
    ]
    const lb = computeLeaderboard(players, new Map(), HOLES_18, STROKEPLAY_CONFIG)
    // Active players always sort first
    expect(lb[0]!.player.displayName).toBe('Alice')
    // Position labels reflect the distinction (even if sort order between NR and – is undefined)
    const alice = lb.find(r => r.player.displayName === 'Alice')!
    const bob = lb.find(r => r.player.displayName === 'Bob NR')!
    const charlie = lb.find(r => r.player.displayName === 'Charlie')!
    expect(alice.positionLabel).toBe('1')
    expect(bob.positionLabel).toBe('NR')
    expect(charlie.positionLabel).toBe('–')
  })
})

// ─── countback ────────────────────────────────────────────────────────────────

describe('countback', () => {
  it('resolves a tie by last-9 (desc = stableford)', () => {
    // a: 2 on all holes
    // b: better on back 9 (3 on last 9, 1 on first 9)
    const a = fill(18, 2) as number[]
    const b = [...fill(9, 1), ...fill(9, 3)] as number[]
    const gross = fill(18, 4) as (number | null)[]
    // desc direction: higher wins → b should come before a
    expect(countback(a, b, gross, gross, 'desc')).toBeGreaterThan(0) // b > a
  })

  it('resolves a tie by last-9 (asc = strokeplay)', () => {
    // lower score wins in strokeplay
    const a = fill(18, 5) as number[] // worse
    const b = [...fill(9, 5), ...fill(9, 4)] as number[] // better back 9
    const gross = fill(18, 4) as (number | null)[]
    // asc direction: lower wins → a vs b, b has lower back 9
    expect(countback(a, b, gross, gross, 'asc')).toBeGreaterThan(0) // a > b (a is worse)
  })

  it('returns 0 when all countback slices are equal', () => {
    const scores = fill(18, 2) as number[]
    const gross = fill(18, 4) as (number | null)[]
    expect(countback(scores, scores, gross, gross, 'desc')).toBe(0)
  })

  it('excludes null-gross holes from the slice sum, favouring the player with more played', () => {
    // Both players have 2pts per hole in perHole.
    // grossA[17] = null (pickup on 18th) → not counted in last-9 slice.
    // sumA for last-9 = 2×8 = 16; sumB for last-9 = 2×9 = 18 → b wins.
    const a = fill(18, 2) as number[]
    const b = fill(18, 2) as number[]
    const grossA = fill(18, 4) as (number | null)[]
    const grossB = fill(18, 4) as (number | null)[]
    grossA[17] = null // pickup on 18th
    // desc direction (stableford): higher sum wins → b's 18 > a's 16 → b wins → result > 0
    expect(countback(a, b, grossA, grossB, 'desc')).toBeGreaterThan(0)
  })
})
