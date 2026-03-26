# PRD: Round Summary

**Module:** `round_summary`
**Phase:** MVP
**Status:** Done
**Last updated:** March 2026

---

## Problem

After finishing a round, players had no way to review their scorecard or see how they performed hole-by-hole outside of the live scoring screen. The "Finish round" button returned them to the dashboard, losing all context. There was no permanent record a player could revisit later.

## Goal

A persistent per-player round summary page at `/rounds/[id]` that shows the full scorecard, a hole-by-hole performance chart, and the group standings. Accessible from the round list, from the "Finish round" banner in scoring, and bookmarkable.

## Users

- **Primary:** A golfer reviewing their round immediately after finishing
- **Secondary:** A golfer revisiting a past round from the rounds list
- **Tertiary:** The event organiser checking any player's scorecard

## Core requirements

### Must have (done)

- **Route:** `/rounds/[id]` — auth-gated (own scorecard OR event organiser)
- **Hero section:**
  - Big total score — Stableford points (pts) or gross strokes depending on format
  - vs-par label (e.g. "+5" or "−2")
  - Course name + format badge + date
- **Hole-by-hole SVG line chart:**
  - Score vs par for each hole
  - Colour-coded dots: birdie green, par grey, bogey amber, double+ red
  - Dashed par baseline
  - Auto-scaled Y axis (min/max of actual scores + par)
  - Gaps in the polyline at pickups/NR holes (null gross_strokes)
  - Hole number labels on X axis
  - Pure server-side SVG — zero client JS, no chart library dependency
- **Full scorecard table:**
  - Front 9 / back 9 sections (or all 9 for 9-hole rounds)
  - Hole number, par, SI rows
  - Gross strokes row with colour-coded cells (birdie, par, bogey, double+)
  - Stableford points row (for Stableford format)
  - Front / back subtotals and grand total footer
- **Group leaderboard** (when event has 2+ players):
  - All event players sorted by running score
  - Highlights current player's row
- **"Continue scoring" CTA** when round is incomplete (hole_scores count < total holes)
- Same hole resolution logic as score entry (combination_id → two loops for 18-hole, loop_id → single loop for 9-hole)

### Should have (Phase 2)

- Share button — native share sheet or copy link
- OG meta tags for social sharing
- Print-friendly CSS
- Handicap strokes highlighted in scorecard cells
- "Best hole of the round" callout

### Won't have (this phase)

- Score editing from the summary (use scoring page)
- Comparison with handicap or previous rounds
- Detailed stats (fairways hit, GIR, putts)

## Data model

```sql
-- Read from:
scorecards (id, event_id, loop_id, round_type, event_players!inner(display_name, handicap_index))
events (name, date, format, handicap_allowance_pct, combination_id, loop_id, round_type, created_by)
course_combinations (loop_1_id, loop_2_id)
loop_holes (id, loop_id, hole_number, par, si_m, si_w)
loop_hole_tees (loop_hole_id, tee_colour, yards)
hole_scores (scorecard_id, hole_number, gross_strokes)  -- null = pickup
event_players (id, user_id, display_name, handicap_index, scorecards(id, hole_scores))
```

## Chart implementation

Pure SVG, server-rendered, no dependencies:

- `viewBox="0 0 320 128"` with responsive width via CSS
- Y axis: `min = Math.min(...scores, ...pars) - 1`, `max = Math.max(...scores, ...pars) + 1`
- Points mapped to SVG coordinates, polyline breaks at null scores
- Dashed `<line>` for par baseline
- `<circle>` per hole with fill based on score relative to par
- Hole number `<text>` labels below X axis

## Open questions

- [ ] Should the round summary be public (shareable link) for completed rounds?
- [ ] Add `submitted_at` to scorecards to distinguish "in progress" from "abandoned"?
- [ ] Show round stats summary (avg score, best hole, number of birdies)?

## Links

- Server component: `apps/web/src/app/rounds/[id]/page.tsx`
- Score entry: `apps/web/src/app/rounds/[id]/score/ScoreEntryLive.tsx`
- Rounds list: `apps/web/src/app/rounds/page.tsx`
- Related PRD: `docs/prd/score-entry.md`
- Related PRD: `docs/prd/results.md`
