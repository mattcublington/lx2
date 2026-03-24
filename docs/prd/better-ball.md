# PRD: Better Ball (Fourball) Format

**Module:** `better_ball`
**Phase:** Soon
**Status:** Planned
**Last updated:** March 2026

---

## Problem

Better ball (also called fourball or fourball better ball) is a pairs format where each player plays their own ball throughout the round, and the better net score of the two partners counts on each hole. It is used extensively in Ryder Cup (fourball sessions), society events, and club inter-team matches. Unlike scramble, each player plays independently -- strategy comes from which player to rely on for each hole based on handicap strokes received.

LX2 needs a better ball engine that compares two partners' net scores per hole and takes the better one, supporting both Stableford (better points) and stroke play (lower net score) modes.

## Goal

Build a better ball scoring engine that pairs players, compares their per-hole results, and produces a combined pair score for both Stableford and stroke play variants.

## Users

- **Primary:** Society organisers running fourball better ball competitions (very common in UK golf)
- **Secondary:** Players competing in Ryder Cup style events with fourball sessions

## Core requirements

### Must have

- Pair two players as partners
- Each player plays their own ball with individual handicap strokes (90% allowance is standard for better ball)
- Per hole: take the better of the two net scores
  - Stableford mode: higher Stableford points count
  - Stroke play mode: lower net score counts
- Handle pick-ups: if one player picks up, use the other player's score; if both pick up, score is 0 points (Stableford) or NR for that hole
- Pair total = sum of the better scores across all holes
- Both partners' individual scorecards are still maintained (for individual prizes)
- Leaderboard ranked by pair total

### Should have

- Support both Stableford better ball and stroke play (medal) better ball
- Highlight which partner's score was used on each hole (in the scorecard view)
- Combined pair scorecard showing both players' scores and the selected one
- 90% handicap allowance as the default (configurable by organiser)
- Support for greensome variant (both tee off, pick best drive, alternate from there)

### Won't have (this phase)

- Aggregate better ball (combining better ball with other formats in a multi-session event)
- Three-ball better ball (best of three)
- Match play better ball (pair vs pair hole-by-hole, as in Ryder Cup fourball matches)
- Automatic pair assignment based on handicap

## Technical design

### Proposed types

```typescript
interface BetterBallInput {
  holes: HoleData[]
  playerA: {
    grossStrokes: (number | null)[]
    playingHandicap: number
  }
  playerB: {
    grossStrokes: (number | null)[]
    playingHandicap: number
  }
  mode: 'stableford' | 'strokeplay'
}

interface BetterBallHole {
  holeNumber: number
  selectedPlayer: 'A' | 'B' | 'both_pickup'
  pairScore: number  // points (stableford) or net strokes (strokeplay)
  playerANet: number | null
  playerBNet: number | null
}

interface BetterBallResult {
  holes: BetterBallHole[]
  pairTotal: number
  playerATotalUsed: number  // how many holes player A's score was used
  playerBTotalUsed: number
}
```

### Algorithm (Stableford mode)

1. Calculate individual Stableford results for both players using `calculateStableford()` with 90% playing handicap
2. For each hole: compare `pointsPerHole[i]` for A and B
3. Take the higher value; if tied, either counts (track as A by convention)
4. If one player picked up (0 points), use the other's score
5. If both picked up, pair gets 0 for that hole
6. Sum the selected points for the pair total

### Algorithm (stroke play mode)

1. Calculate individual net scores per hole for both players
2. For each hole: take the lower net score
3. If one player picked up (null), use the other's net score
4. If both picked up: NR for the pair on that hole (or the entire round, depending on rules)
5. Sum the selected net scores for pair gross/net total

### Database changes

- New `event_pairs` table: `{ id, event_id, player_a_id (event_player), player_b_id (event_player), pair_name? }`
- Events table: add 'better_ball' to format CHECK constraint
- Alternatively, add `pair_id` to `event_players` and group by pair
- Leaderboard queries join through pairs to get combined results

### Handicap allowance

Standard better ball allowance is 90% per England Golf / R&A guidelines. The higher-handicap player typically receives more strokes relative to the lower-handicap player (strokes are distributed individually, not as a pair handicap).

## Open questions

- [ ] Should pairs be stored as a separate entity or as a grouping on `event_players`?
- [ ] How to handle the case where one partner DNF/withdraws mid-round (does the other continue as individual)?
- [ ] Should we support "combined Stableford" as an alternative to true better ball (sum both players' points)?
- [ ] How does better ball interact with skins as a side game?

## Links

- Engine (planned): `packages/scoring/src/better-ball.ts`
- Stableford engine: `packages/scoring/src/stableford.ts`
- Handicap engine: `packages/scoring/src/handicap.ts`
- Related PRD: `docs/prd/stableford.md`
- Related PRD: `docs/prd/matchplay.md`
- Related PRD: `docs/prd/scramble.md`
