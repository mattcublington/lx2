# PRD: Stableford Scoring Engine

**Module:** `stableford`
**Phase:** MVP
**Status:** Done
**Last updated:** March 2026

---

## Problem

Stableford is the most popular scoring format in UK society and club golf. Unlike stroke play, Stableford awards points per hole relative to net par, meaning a disastrous hole costs the player nothing beyond zero points rather than blowing up their total. This makes it ideal for social and handicap golf where players of varying abilities compete on an even playing field.

LX2 needs a pure, deterministic scoring engine that calculates Stableford points from raw gross strokes, hole data (par and stroke index), and a playing handicap. The engine must be usable both server-side (leaderboard computation) and client-side (live score entry feedback) without any database dependency.

## Goal

Provide a tested, pure-TypeScript Stableford scoring function that converts gross strokes into per-hole points and a round total, accounting for handicap strokes distributed by stroke index.

## Users

- **Primary:** Players entering scores hole-by-hole during a round via the LX2 PWA
- **Secondary:** Organisers viewing live leaderboards; the leaderboard server component computing final standings

## Core requirements

### Must have

- Calculate Stableford points for each hole: albatross (5), eagle (4), birdie (3), par (2), bogey (1), double bogey or worse (0)
- Support scores better than albatross (condor = 6 points, based on relative-to-par <= -4)
- Accept a pre-calculated `playingHandicap` and distribute strokes across holes via `distributeStrokes()` from the handicap module
- Handle pick-ups (null gross strokes) gracefully: award 0 points, no NR disqualification (Stableford allows pick-ups)
- Return `pointsPerHole` array, `total` points, and `netStrokes` per hole
- Zero external dependencies; pure function with no side effects
- Full vitest test coverage

### Should have

- 95% handicap allowance as default for society Stableford (configured at event level via `handicap_allowance_pct`, not in the engine)
- Support for 9-hole rounds (engine accepts any-length holes array)
- Integration with the offline queue so points display instantly during score entry even without connectivity

### Won't have (this phase)

- Modified Stableford (custom point scales, e.g., PGA Tour format with -3 for double bogey)
- Automatic buffer zone / CSS calculation for handicap adjustment
- Multi-round aggregate Stableford (e.g., 36-hole Stableford total)

## Technical implementation

### Function signature

```typescript
calculateStableford(input: StablefordInput): StablefordResult
```

### Input types

- `StablefordInput`: `{ holes: HoleData[], grossStrokes: (number | null)[], playingHandicap: number }`
- `HoleData`: `{ holeNumber: number, par: number, strokeIndex: number }`

### Output type

- `StablefordResult`: `{ pointsPerHole: number[], total: number, netStrokes: (number | null)[] }`

### Algorithm

1. Distribute `playingHandicap` across holes by stroke index using `distributeStrokes()`
2. For each hole: `net = gross - strokesOnHole`, then `relativeToPar = net - par`
3. Look up points from the scale map; default 0 for double bogey or worse, 6 for condor or better
4. Null gross = 0 points, null net (pick-up recorded)

### Points scale

| Net score relative to par | Points |
|---------------------------|--------|
| -4 or better (condor+)   | 6      |
| -3 (albatross)            | 5      |
| -2 (eagle)                | 4      |
| -1 (birdie)               | 3      |
| 0 (par)                   | 2      |
| +1 (bogey)                | 1      |
| +2 or worse               | 0      |

### Test coverage

- 36 points for all pars at HC 0
- Birdie = 3 points
- Double bogey or worse = 0 points
- Pick-up (null) = 0 points, no NR
- HC 18 player shooting bogey golf = 36 points (net par on every hole)

## Open questions

- [ ] Should we add a `maxScorePerHole` option to auto-pick-up at net double bogey (common in competitions to speed play)?
- [ ] Modified Stableford point scales for future format variants?

## Links

- Component: `packages/scoring/src/stableford.ts`
- Types: `packages/scoring/src/types.ts`
- Tests: `packages/scoring/src/__tests__/stableford.test.ts`
- Related PRD: `docs/prd/handicap.md`
- Related PRD: `docs/prd/strokeplay.md`
