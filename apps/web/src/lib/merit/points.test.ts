import { describe, it, expect } from 'vitest'
import { computeMeritStandings } from './points'
import type { MeritEventResult, MeritConfig } from './points'

describe('computeMeritStandings', () => {
  const config: MeritConfig = {
    pointsTemplate: { '1': 25, '2': 20, '3': 16, default: 2 },
    participationPoints: 0,
    bestOf: null,
  }

  const events: MeritEventResult[] = [
    {
      entryId: 'e1',
      multiplier: 1.0,
      standings: [
        { userId: 'alice', displayName: 'Alice', position: 1 },
        { userId: 'bob', displayName: 'Bob', position: 2 },
        { userId: 'carol', displayName: 'Carol', position: 3 },
      ],
    },
    {
      entryId: 'e2',
      multiplier: 1.0,
      standings: [
        { userId: 'bob', displayName: 'Bob', position: 1 },
        { userId: 'alice', displayName: 'Alice', position: 2 },
      ],
    },
  ]

  it('awards points based on position and sums across events', () => {
    const standings = computeMeritStandings(events, config)
    expect(standings[0]!.total).toBe(45)
    expect(standings[1]!.total).toBe(45)
    expect(standings[2]!.total).toBe(16)
  })

  it('tie-break: number of wins then alphabetical', () => {
    const standings = computeMeritStandings(events, config)
    expect(standings[0]!.displayName).toBe('Alice')
    expect(standings[1]!.displayName).toBe('Bob')
  })

  it('applies multiplier to position points only', () => {
    const majorEvents: MeritEventResult[] = [
      {
        entryId: 'e1',
        multiplier: 1.5,
        standings: [
          { userId: 'alice', displayName: 'Alice', position: 1 },
        ],
      },
    ]
    const standings = computeMeritStandings(majorEvents, config)
    expect(standings[0]!.total).toBe(38)
  })

  it('adds participation points without multiplier', () => {
    const withParticipation = { ...config, participationPoints: 5 }
    const singleEvent: MeritEventResult[] = [
      {
        entryId: 'e1',
        multiplier: 1.0,
        standings: [
          { userId: 'alice', displayName: 'Alice', position: 1 },
          { userId: 'bob', displayName: 'Bob', position: 2 },
        ],
      },
    ]
    const standings = computeMeritStandings(singleEvent, withParticipation)
    expect(standings[0]!.total).toBe(30)
    expect(standings[1]!.total).toBe(25)
  })

  it('best_of: only counts top N results', () => {
    const bestOfConfig = { ...config, bestOf: 1 }
    const standings = computeMeritStandings(events, bestOfConfig)
    expect(standings[0]!.total).toBe(25)
    expect(standings[1]!.total).toBe(25)
  })

  it('default points for positions beyond template', () => {
    const singleEvent: MeritEventResult[] = [
      {
        entryId: 'e1',
        multiplier: 1.0,
        standings: [
          { userId: 'alice', displayName: 'Alice', position: 1 },
          { userId: 'dave', displayName: 'Dave', position: 10 },
        ],
      },
    ]
    const standings = computeMeritStandings(singleEvent, config)
    expect(standings[1]!.total).toBe(2)
  })

  it('returns empty array for no events', () => {
    expect(computeMeritStandings([], config)).toEqual([])
  })
})
