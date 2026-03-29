import { describe, it, expect } from 'vitest'
import { computeTournamentStandings } from './standings'
import type { TournamentRoundResult } from './standings'

describe('computeTournamentStandings', () => {
  const baseRounds: TournamentRoundResult[] = [
    {
      roundNumber: 1,
      finalised: true,
      results: [
        { userId: 'alice', displayName: 'Alice', stablefordTotal: 36, grossTotal: 72 },
        { userId: 'bob', displayName: 'Bob', stablefordTotal: 30, grossTotal: 78 },
      ],
    },
    {
      roundNumber: 2,
      finalised: true,
      results: [
        { userId: 'alice', displayName: 'Alice', stablefordTotal: 34, grossTotal: 74 },
        { userId: 'bob', displayName: 'Bob', stablefordTotal: 38, grossTotal: 70 },
      ],
    },
  ]

  it('sums stableford totals and ranks descending', () => {
    const standings = computeTournamentStandings(baseRounds, 'stableford', 'exclude')
    expect(standings).toHaveLength(2)
    expect(standings[0]!.displayName).toBe('Alice')
    expect(standings[0]!.total).toBe(70) // 36 + 34
    expect(standings[1]!.displayName).toBe('Bob')
    expect(standings[1]!.total).toBe(68) // 30 + 38
  })

  it('sums strokeplay totals and ranks ascending', () => {
    const standings = computeTournamentStandings(baseRounds, 'strokeplay', 'exclude')
    expect(standings[0]!.displayName).toBe('Alice')
    expect(standings[0]!.total).toBe(146) // 72 + 74
    expect(standings[1]!.displayName).toBe('Bob')
    expect(standings[1]!.total).toBe(148) // 78 + 70
  })

  it('excludes unfinalised rounds', () => {
    const rounds: TournamentRoundResult[] = [
      { ...baseRounds[0]!, finalised: true },
      { ...baseRounds[1]!, finalised: false },
    ]
    const standings = computeTournamentStandings(rounds, 'stableford', 'exclude')
    expect(standings[0]!.total).toBe(36)
    expect(standings[0]!.roundsPlayed).toBe(1)
  })

  it('dns_policy exclude: skips missed rounds', () => {
    const rounds: TournamentRoundResult[] = [
      {
        roundNumber: 1,
        finalised: true,
        results: [
          { userId: 'alice', displayName: 'Alice', stablefordTotal: 36, grossTotal: 72 },
          { userId: 'bob', displayName: 'Bob', stablefordTotal: 30, grossTotal: 78 },
        ],
      },
      {
        roundNumber: 2,
        finalised: true,
        results: [
          { userId: 'alice', displayName: 'Alice', stablefordTotal: 34, grossTotal: 74 },
        ],
      },
    ]
    const standings = computeTournamentStandings(rounds, 'stableford', 'exclude')
    expect(standings[0]!.displayName).toBe('Alice')
    expect(standings[0]!.total).toBe(70)
    expect(standings[1]!.displayName).toBe('Bob')
    expect(standings[1]!.total).toBe(30)
    expect(standings[1]!.roundsPlayed).toBe(1)
  })

  it('dns_policy penalty (stableford): 0 for missed rounds', () => {
    const rounds: TournamentRoundResult[] = [
      {
        roundNumber: 1,
        finalised: true,
        results: [
          { userId: 'alice', displayName: 'Alice', stablefordTotal: 36, grossTotal: 72 },
          { userId: 'bob', displayName: 'Bob', stablefordTotal: 30, grossTotal: 78 },
        ],
      },
      {
        roundNumber: 2,
        finalised: true,
        results: [
          { userId: 'alice', displayName: 'Alice', stablefordTotal: 34, grossTotal: 74 },
        ],
      },
    ]
    const standings = computeTournamentStandings(rounds, 'stableford', 'penalty')
    expect(standings[0]!.total).toBe(70)
    expect(standings[1]!.total).toBe(30)
    expect(standings[1]!.roundsPlayed).toBe(1)
  })

  it('dns_policy penalty (strokeplay): max+10 for missed rounds', () => {
    const rounds: TournamentRoundResult[] = [
      {
        roundNumber: 1,
        finalised: true,
        results: [
          { userId: 'alice', displayName: 'Alice', stablefordTotal: 0, grossTotal: 72 },
          { userId: 'bob', displayName: 'Bob', stablefordTotal: 0, grossTotal: 78 },
        ],
      },
      {
        roundNumber: 2,
        finalised: true,
        results: [
          { userId: 'alice', displayName: 'Alice', stablefordTotal: 0, grossTotal: 74 },
        ],
      },
    ]
    const standings = computeTournamentStandings(rounds, 'strokeplay', 'penalty')
    expect(standings[0]!.displayName).toBe('Alice')
    expect(standings[0]!.total).toBe(146)
    expect(standings[1]!.displayName).toBe('Bob')
    expect(standings[1]!.total).toBe(162)
  })

  it('tie-breaking: more rounds played wins', () => {
    const rounds: TournamentRoundResult[] = [
      {
        roundNumber: 1,
        finalised: true,
        results: [
          { userId: 'alice', displayName: 'Alice', stablefordTotal: 36, grossTotal: 72 },
        ],
      },
      {
        roundNumber: 2,
        finalised: true,
        results: [
          { userId: 'alice', displayName: 'Alice', stablefordTotal: 0, grossTotal: 72 },
          { userId: 'bob', displayName: 'Bob', stablefordTotal: 36, grossTotal: 72 },
        ],
      },
    ]
    const standings = computeTournamentStandings(rounds, 'stableford', 'exclude')
    expect(standings[0]!.displayName).toBe('Alice')
    expect(standings[1]!.displayName).toBe('Bob')
  })

  it('returns empty array for no finalised rounds', () => {
    const standings = computeTournamentStandings([], 'stableford', 'exclude')
    expect(standings).toEqual([])
  })

  it('excludes players with null userId (anonymous/guest)', () => {
    const rounds: TournamentRoundResult[] = [
      {
        roundNumber: 1,
        finalised: true,
        results: [
          { userId: 'alice', displayName: 'Alice', stablefordTotal: 36, grossTotal: 72 },
          { userId: null, displayName: 'Guest Player', stablefordTotal: 40, grossTotal: 68 },
        ],
      },
    ]
    const standings = computeTournamentStandings(rounds, 'stableford', 'exclude')
    expect(standings).toHaveLength(1)
    expect(standings[0]!.displayName).toBe('Alice')
  })
})
