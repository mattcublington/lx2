# PRD: Reds vs Blues Team Format

**Module:** `rvb`
**Phase:** Soon
**Status:** Planned
**Last updated:** March 2026

---

## Problem

Reds vs Blues is a staple team format for society away days and inter-club matches. Players are divided into two teams (traditionally "Reds" and "Blues"), each player plays individual Stableford, and the team score is the aggregate of all individual Stableford totals. The team with the higher combined Stableford score wins. It creates a compelling team dynamic without changing the individual scoring format -- every point matters for the team.

LX2 currently supports individual scoring formats but has no team aggregation layer. Society organisers running Reds vs Blues events have to manually add up team totals from the individual leaderboard, which is tedious and error-prone, especially when tracking live scores during the round.

## Goal

Build a team aggregation engine for Reds vs Blues that divides players into two teams, computes team Stableford totals in real time, and displays a team leaderboard alongside the individual one.

## Users

- **Primary:** Society organisers running away days or inter-society matches
- **Secondary:** Players who want to see how their team is performing during the round

## Core requirements

### Must have

- Divide event players into two teams (Red and Blue)
- Each player plays individual Stableford with standard handicap allowance (95%)
- Team score = sum of all players' Stableford points on that team
- Live team total updates as individual scores are entered
- Team leaderboard showing: team name, total points, player count, average points per player
- Individual leaderboard annotated with team colour
- Organiser assigns teams during event setup (manual assignment or random draw)

### Should have

- "Best N of M" variant: only count the top N scores from each team (e.g., best 8 of 12)
- Team captain designation for each team
- Head-to-head hole-by-hole comparison (which team won each hole in aggregate)
- Historical Reds vs Blues results for recurring society events
- Balanced team generation based on handicap (auto-balance so teams are fair)

### Won't have (this phase)

- More than two teams (see future multi-team format)
- Mixed format (e.g., some players playing stroke play within the team event)
- Per-hole team scoring (like a Ryder Cup session) -- this is aggregate individual
- Automatic team selection based on society membership history

## Technical design

### Proposed types

```typescript
interface RvBInput {
  players: {
    playerId: string
    team: 'red' | 'blue'
    stablefordTotal: number
  }[]
  bestOf?: number  // if set, only count top N per team
}

interface RvBResult {
  red: { total: number; playerCount: number; average: number; countedPlayers: string[] }
  blue: { total: number; playerCount: number; average: number; countedPlayers: string[] }
  winner: 'red' | 'blue' | 'tied'
  margin: number
}
```

### Algorithm

1. Separate players by team
2. Sort each team's Stableford totals descending
3. If `bestOf` is set, take only the top N from each team
4. Sum the counted totals for each team
5. Compare totals; determine winner and margin

### Database changes

- Add `team` column to `event_players` table: `text CHECK (team IN ('red', 'blue'))`, nullable (null for non-team events)
- Add `team_format` column to `events` table or use existing `format` with new enum value
- Alternative: use a JSONB `team_config` field on events for flexible team format configuration

### UI components

- Event creation: team format toggle, team assignment UI (drag players between teams)
- Leaderboard: team summary bar at top (Red: 312 pts vs Blue: 298 pts), individual table with team colour indicators
- Score entry: unchanged (players enter individual Stableford as normal)

## Open questions

- [ ] Should team assignment be stored on `event_players.team` or in a separate `event_teams` / `team_members` table?
- [ ] How to handle late arrivals who join after teams are assigned?
- [ ] Should the "best of N" configuration be per-event or hardcoded?
- [ ] Do we need a "captain's pick" feature where captains choose their own teams?

## Links

- Engine (planned): `packages/scoring/src/rvb.ts`
- Stableford engine: `packages/scoring/src/stableford.ts`
- Related PRD: `docs/prd/stableford.md`
- Related PRD: `docs/prd/handicap.md`
