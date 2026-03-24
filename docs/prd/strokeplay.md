# PRD: Stroke Play Scoring Engine

**Module:** `strokeplay`
**Phase:** MVP
**Status:** Done
**Last updated:** March 2026

---

## Problem

Stroke play (medal play) is the foundational format of competitive golf. Every stroke counts towards the total, and the player with the lowest net score wins. Unlike Stableford, a single bad hole can ruin a round -- there is no pick-up safety net. If a player records a null (pick-up) on any hole, the entire round is NR (No Return) and does not count for the competition.

LX2 needs a stroke play engine that computes gross total, net total (gross minus playing handicap), and score relative to par. It must handle NR rounds cleanly for leaderboard ranking (NR players sort below all completing players).

## Goal

Provide a pure-TypeScript stroke play scoring function that totals gross strokes, subtracts the playing handicap for net score, and flags NR rounds when any hole has a pick-up.

## Users

- **Primary:** Players competing in medal/stroke play events
- **Secondary:** Organisers running monthly medals, qualifiers, or club championships

## Core requirements

### Must have

- Sum all 18 (or 9) gross strokes into `grossTotal`
- Calculate `netTotal = grossTotal - playingHandicap`
- Calculate `relativeToPar = netTotal - coursePar`
- If any hole has null gross strokes (pick-up), the round is NR: `grossTotal`, `netTotal`, and `relativeToPar` all return null, `nR` flag is true
- Accept pre-calculated `playingHandicap` (100% allowance is standard for stroke play, configured at event level)
- Zero external dependencies; pure function

### Should have

- Clear NR handling so leaderboards can sort NR rounds to the bottom
- Integration with real-time score entry so players see running total and relative-to-par during the round

### Won't have (this phase)

- Eclectic (best score per hole across multiple rounds)
- Cut lines (e.g., top 40 and ties proceed)
- Multi-round stroke play aggregation
- Countback tiebreakers (last 9, last 6, last 3 hole comparison)

## Technical implementation

### Function signature

```typescript
calculateStrokePlay(input: StrokePlayInput): StrokePlayResult
```

### Input types

- `StrokePlayInput`: `{ holes: HoleData[], grossStrokes: (number | null)[], playingHandicap: number }`

### Output type

- `StrokePlayResult`: `{ grossTotal: number | null, netTotal: number | null, relativeToPar: number | null, nR: boolean }`

### Algorithm

1. Check for any null in `grossStrokes` -- if found, return NR result
2. Sum all gross strokes
3. `netTotal = grossTotal - playingHandicap`
4. `coursePar = sum of all hole pars`
5. `relativeToPar = netTotal - coursePar`

### Key differences from Stableford

| Aspect | Stableford | Stroke play |
|--------|-----------|-------------|
| Pick-up handling | 0 points, round continues | Entire round is NR |
| Default allowance | 95% | 100% |
| Scoring direction | Higher is better | Lower is better |
| Bad hole impact | Capped at 0 points | Full damage to total |

## Open questions

- [ ] Should we implement countback tiebreaker logic in the engine or as a separate utility?
- [ ] Do we need per-hole net scores for stroke play (currently only Stableford returns `netStrokes`)?

## Links

- Component: `packages/scoring/src/strokeplay.ts`
- Types: `packages/scoring/src/types.ts`
- Related PRD: `docs/prd/stableford.md`
- Related PRD: `docs/prd/handicap.md`
