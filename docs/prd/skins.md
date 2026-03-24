# PRD: Skins Scoring Format

**Module:** `skins`
**Phase:** Soon
**Status:** Planned
**Last updated:** March 2026

---

## Problem

Skins is one of the most popular side-game formats in society golf. Each hole is worth a "skin" (a unit of value, often monetary). The player with the lowest score on a hole wins the skin. If two or more players tie for the lowest score, the skin carries over to the next hole, increasing its value. This creates dramatic tension as carried-over skins accumulate -- a single hole late in the round could be worth 4 or 5 skins.

Currently LX2 supports Stableford, stroke play, and match play as competition formats, but skins games must be tracked manually on paper or WhatsApp. Society organisers consistently request skins as a side game that runs alongside the main competition format.

## Goal

Build a skins scoring engine that determines skin winners hole-by-hole with carryover logic, supporting both gross and net scoring, and integrate it as a side-game option that runs parallel to the main event format.

## Users

- **Primary:** Society golf groups who run skins as a side bet alongside Stableford or stroke play events
- **Secondary:** Organisers who want to add skins as an optional side game during event creation

## Core requirements

### Must have

- Hole-by-hole comparison of all players in the group (or the full field)
- Lowest net score on a hole wins the skin
- Tied holes: skin carries over to the next hole
- Track cumulative skins per player
- Support both gross skins and net skins (handicap-adjusted)
- Handle pick-ups: null gross = does not compete for the skin on that hole
- Report which player won each skin and on which hole
- Track carried skins (how many skins are "in the pot" for the current hole)
- Final hole handling: if the last hole is tied, carried skins can either be split or go unawarded (configurable)

### Should have

- Monetary value per skin (e.g., 2 GBP per skin) for display purposes
- "Super skins" variant where only outright birdies or better win (no pars)
- Integration as a side game on the event leaderboard page
- Real-time skin tracking during live scoring

### Won't have (this phase)

- Automatic payment settlement between players
- Validation skins (must match or beat the par to win)
- Team skins (pairs or teams competing for skins)
- Skins auction format

## Technical design

### Proposed function signature

```typescript
calculateSkins(input: SkinsInput): SkinsResult
```

### Proposed types

```typescript
interface SkinsInput {
  holes: HoleData[]
  players: {
    playerId: string
    grossStrokes: (number | null)[]
    playingHandicap: number
  }[]
  mode: 'net' | 'gross'
  lastHoleCarryover: 'split' | 'unawarded'
}

interface SkinWin {
  holeNumber: number
  playerId: string
  skinsWon: number  // 1 + carried
  netScore: number
}

interface SkinsResult {
  wins: SkinWin[]
  carriedToNext: number  // 0 if all resolved
  skinsByPlayer: Record<string, number>
  unawarded: number  // only if lastHoleCarryover = 'unawarded'
}
```

### Algorithm

1. For each hole, calculate net score for all players (gross - strokes on that hole)
2. Exclude players with null gross (pick-up)
3. Find the minimum net score among remaining players
4. If exactly one player has the minimum: they win the skin (plus any carried skins)
5. If multiple players tie for minimum: skin carries over, increment carry counter
6. On the final hole, if tied: apply the `lastHoleCarryover` rule

### Side game integration

Skins runs as a parallel calculation alongside the main event format. The event model will need a `side_games` array (or separate table) to track enabled side games and their configuration. The leaderboard page shows a "Skins" tab alongside the main leaderboard.

## Database changes

- New column or JSONB field on `events` table: `side_games jsonb DEFAULT '[]'`
- Each side game entry: `{ type: 'skins', mode: 'net', valuePerSkin: 200, lastHoleCarryover: 'split' }`
- No new tables required; skin results computed on-the-fly from existing `hole_scores`

## Open questions

- [ ] Should skins be per-group (4-ball) or across the entire field?
- [ ] How to handle different handicap allowances for skins vs the main competition?
- [ ] Should we support "reverse skins" (highest score loses a skin)?
- [ ] Split carried skins on last hole: split evenly among tied players, or award to all?

## Links

- Engine (planned): `packages/scoring/src/skins.ts`
- Types: `packages/scoring/src/types.ts`
- Related PRD: `docs/prd/stableford.md`
- Related PRD: `docs/prd/handicap.md`
