# PRD: Match Play Scoring Engine

**Module:** `matchplay`
**Phase:** MVP
**Status:** Done
**Last updated:** March 2026

---

## Problem

Match play is a head-to-head format where two players (or teams) compete hole-by-hole. The player who wins the most individual holes wins the match, regardless of total stroke count. It is central to Ryder Cup, society knockout competitions, and club match play championships. The handicap system works differently in match play: strokes are based on the difference between the two players' playing handicaps, and only the higher-handicap player receives strokes.

LX2 needs a match play engine that tracks hole-by-hole results, detects when a match is mathematically over (the lead exceeds remaining holes), reports dormie status, and handles the difference-based handicap allocation.

## Goal

Provide a pure-TypeScript match play scoring function that compares two players hole-by-hole with difference-based handicap strokes, tracks match status, and detects match completion.

## Users

- **Primary:** Players in head-to-head or knockout format events
- **Secondary:** Organisers running club match play championships, Ryder Cup style team events

## Core requirements

### Must have

- Hole-by-hole comparison of two players (Player A vs Player B)
- Difference-based handicap allocation: calculate each player's playing handicap via full WHS formula, then distribute the difference to the higher-handicap player by stroke index
- Track `holesUp` (positive = A leads, negative = B leads)
- Detect match completion: match is over when the lead exceeds the number of remaining holes
- Report match status in standard golf notation: "2 up", "all square", "A wins 3&2", "A wins 1 up"
- Detect dormie status (leading by exactly as many holes as remain)
- Handle pending holes (null gross strokes) for live scoring
- Fill remaining holes as "pending" once match is decided (no need to play out)
- Return winner ('A', 'B', or null if match ongoing/tied)

### Should have

- Support for conceded holes (player picks up, opponent wins the hole)
- Real-time match status updates during live play

### Won't have (this phase)

- Four-ball match play (best ball of a pair vs best ball of a pair)
- Foursome match play (alternate shot)
- Multi-match aggregate (e.g., Ryder Cup overall score tracking)
- Bracket/knockout tournament management

## Technical implementation

### Function signature

```typescript
calculateMatchPlay(input: MatchPlayInput): MatchPlayResult
```

### Input types

- `MatchPlayInput`: `{ holes: HoleData[], playerA: { grossStrokes, handicapIndex }, playerB: { grossStrokes, handicapIndex }, slopeRating, courseRating, par }`

### Output types

- `HoleResult`: `'A' | 'B' | 'halved' | 'pending'`
- `MatchPlayResult`: `{ holeResults: HoleResult[], matchStatus: string, holesUp: number, matchOver: boolean, winner: 'A' | 'B' | null }`

### Handicap difference algorithm

1. Calculate playing handicap for each player using `calculateHandicap()` (full WHS formula with slope/course rating)
2. `diff = hcA - hcB`
3. If diff > 0: Player A is higher handicap, receives `diff` strokes distributed by stroke index
4. If diff < 0: Player B is higher handicap, receives `|diff|` strokes distributed by stroke index
5. If diff = 0: No strokes given

### Match completion detection

After each hole scored, check: `|holesUp| > holesRemaining`. If true, the match is over. The result is reported as "{winner} wins {holesUp}&{holesRemaining}" (e.g., "A wins 3&2"). If the match goes to the 18th hole, the result is "{winner} wins 1 up".

### Dormie detection

When `holesRemaining === |holesUp|`, append "(dormie)" to the match status. This means the trailing player must win every remaining hole to halve or win the match.

## Open questions

- [ ] How to handle extra holes (19th, 20th) if the match is all square after 18?
- [ ] Should conceded holes be represented as a special gross_strokes value (e.g., -1) or a separate field?
- [ ] Team match play formats (fourball, foursome) -- separate engines or extensions of this one?

## Links

- Component: `packages/scoring/src/matchplay.ts`
- Types: `packages/scoring/src/types.ts`
- Handicap engine: `packages/scoring/src/handicap.ts`
- Related PRD: `docs/prd/handicap.md`
- Related PRD: `docs/prd/better-ball.md`
