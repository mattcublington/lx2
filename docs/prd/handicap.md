# PRD: Handicap Calculation Engine

**Module:** `handicap`
**Phase:** MVP
**Status:** Done
**Last updated:** March 2026

---

## Problem

The World Handicap System (WHS) defines how a player's handicap index translates into a course-specific playing handicap. This conversion depends on the course's slope rating, course rating, and par for the specific tees being played. Without accurate handicap calculation, competitions cannot fairly compare players of different abilities. Additionally, handicap strokes must be distributed across specific holes according to the stroke index (SI) -- a harder hole (SI 1) gets the first stroke, SI 2 gets the second, and so on.

LX2 needs a handicap engine that performs the WHS formula conversion, distributes strokes per hole, and supports both positive and plus (negative) handicaps. This engine is consumed by all three scoring formats (Stableford, stroke play, match play) and must have zero database dependency.

## Goal

Provide pure-TypeScript functions that convert a handicap index to a playing handicap using the WHS formula and distribute strokes across holes by stroke index, supporting any handicap allowance percentage.

## Users

- **Primary:** The scoring engines (Stableford, stroke play, match play) which consume handicap allocation as input
- **Secondary:** The event setup UI which shows calculated playing handicaps; players viewing their playing handicap for the round

## Core requirements

### Must have

- **WHS formula**: `Playing HC = round(Handicap Index * (Slope / 113) + (Course Rating - Par)) * allowancePct`
- Support configurable allowance percentage (default 100%, Stableford typically 95%)
- **Stroke distribution** by stroke index (SI 1-18):
  - HC 18 = 1 stroke per hole
  - HC 20 = 2 strokes on SI 1 and SI 2, 1 stroke on all others
  - HC 36 = 2 strokes per hole
  - HC 0 = 0 strokes everywhere
  - Negative (plus) handicap = -1 stroke on lowest SI holes
- Support for 9-hole playing handicap calculation (50% of full playing handicap, rounded)
- Fallback mode when slope/course rating are unavailable: `round(handicapIndex * allowancePct)`
- Full `calculateHandicap()` function returning both `playingHandicap` and `strokesPerHole` array
- Simplified `calculatePlayingHandicap()` for quick round setup without stroke distribution

### Should have

- Handle edge cases: very high handicaps (54 max under WHS), very low plus handicaps
- Support both 18-hole and 9-hole hole arrays

### Won't have (this phase)

- Handicap index calculation from score history (8 best of last 20 differentials)
- Exceptional Score Reduction (ESR) detection
- Soft cap / hard cap adjustments
- WHS API integration for pulling official index (see `docs/prd/whs.md`)

## Technical implementation

### Exported functions

#### `calculateHandicap(input, holes) -> HandicapAllocation`

Full calculation with stroke distribution. Used by match play (which needs per-player stroke allocation).

#### `calculatePlayingHandicap(handicapIndex, roundType, opts?) -> number`

Quick calculation returning just the playing handicap number. Used by event setup and round creation.

#### `distributeStrokes(playingHandicap, holes) -> number[]`

Internal but exported. Distributes strokes across holes by stroke index. Handles multi-pass allocation for handicaps above 18 (e.g., HC 20 gets a second pass for SI 1 and SI 2).

### Types

- `PlayingHandicapInput`: `{ handicapIndex, slopeRating, courseRating, par, allowancePct? }`
- `HandicapAllocation`: `{ playingHandicap: number, strokesPerHole: number[] }`

### Stroke distribution algorithm

1. Sort holes by stroke index (ascending)
2. For positive handicap: iterate through sorted holes, assigning 1 stroke per pass. Multiple passes for HC > 18
3. For negative (plus) handicap: assign -1 to lowest SI holes, one pass only
4. Return array indexed by original hole order

### Allowance percentages by format

| Format | Default allowance | Notes |
|--------|------------------|-------|
| Stableford | 95% | Standard society/club play |
| Stroke play | 100% | Medal competitions |
| Match play | 100% of difference | Applied to the handicap difference, not individual handicaps |
| Better ball | 90% | Standard for fourball better ball |
| Scramble | Varies | Typically 10% of low + 40% of high |

## Open questions

- [ ] Should we pre-compute stroke distribution for the full 0-54 handicap range and cache it for performance?
- [ ] How to handle courses with non-standard SI (e.g., Par 3 course where SI = hole number)?
- [ ] 9-hole SI distribution when only 9 holes have SI 1-9 -- current implementation works but should we validate?

## Links

- Component: `packages/scoring/src/handicap.ts`
- Types: `packages/scoring/src/types.ts`
- Tests: `packages/scoring/src/__tests__/handicap.test.ts`
- Related PRD: `docs/prd/stableford.md`
- Related PRD: `docs/prd/strokeplay.md`
- Related PRD: `docs/prd/matchplay.md`
- Related PRD: `docs/prd/whs.md`
