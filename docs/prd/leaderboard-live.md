# PRD: Live Leaderboard

**Module:** `leaderboard_live`
**Phase:** MVP
**Status:** Planned
**Last updated:** March 2026

---

## Problem

During a society day, everyone wants to know who's winning. Currently someone has to manually tally scores in the bar, or the organiser shouts across the car park. There's no live view of standings, which kills the competitive buzz — especially for groups still out on the course who want to know if they're in contention.

LX2 already captures scores hole-by-hole in real time. The leaderboard needs to process those scores, apply handicap calculations, and display ranked standings that update automatically as cards come in.

## Goal

A real-time, format-aware leaderboard at `/events/[id]/leaderboard` that updates automatically via Supabase Realtime and can be displayed on a TV screen in the clubhouse.

## Users

- **Primary:** Players on the course checking standings on their phone between holes
- **Secondary:** The organiser monitoring progress from the clubhouse
- **Tertiary:** Spectators in the bar watching a TV/projector displaying the leaderboard

## Core requirements

### Must have

- **URL:** `/events/[id]/leaderboard` — public for `is_public` events, auth-required for private
- **Format-aware scoring:**
  - **Stableford:** Display points total. Rank highest first. Calculate points per hole using `@lx2/scoring` package: gross strokes vs par, adjusted for handicap strokes on that hole (by stroke index). 95% handicap allowance default.
  - **Stroke Play:** Display total gross strokes and net strokes (gross minus playing handicap). Rank lowest net first. Show "to par" differential (e.g. +4, -2, E).
  - **Match Play:** No ranked leaderboard (show error page with explanation)

- **Playing handicap calculation:**
  - Convert handicap index to course handicap using slope rating: `CH = HI x (SR / 113)`
  - Apply handicap allowance percentage (e.g. 95% for Stableford)
  - Distribute strokes across holes by stroke index (SI)
  - A player with playing handicap 18 gets 1 stroke on every hole; handicap 24 gets 2 strokes on holes SI 1-6

- **Player row display:**
  - Position number (with tied positions: T1, T2, etc.)
  - Display name
  - Score (points for Stableford, net strokes for Stroke Play)
  - "Through X holes" indicator showing progress (count of non-null hole scores)
  - NTP/LD winner badges where applicable
  - Visual distinction for completed cards vs in-progress

- **Real-time updates:**
  - Subscribe to Supabase Realtime `postgres_changes` on `hole_scores` table
  - On any score change, re-fetch and recalculate standings
  - Smooth re-ordering animation when positions change
  - Polling fallback (30 seconds) for environments where WebSocket is blocked

- **Hole data integration:**
  - Fetch hole pars and stroke indexes from `loop_holes` table via course combination
  - Support 9-hole and 18-hole rounds (combine two loops for 18)
  - Fallback: par 4 / SI = hole number when no course data linked

- **Event header:**
  - Sticky top bar with event name, date, format, course
  - Back link to event page
  - Manage link for organiser

### Should have

- **TV / full-screen mode:** Toggle to hide browser chrome, enlarge fonts, auto-scroll through player list. Suitable for clubhouse TV display.
- **Score hiding on final holes:** Option to hide scores for players on holes 17-18 to preserve suspense (organiser toggle)
- **NTP/LD contest results section:** Below main leaderboard, show per-hole NTP and LD rankings with distances
- **Shareable URL:** The leaderboard URL is already shareable; add copy-to-clipboard button
- **Auto-refresh indicator:** Pulsing dot showing "Live" status when Realtime is connected

### Won't have (this phase)

- Hole-by-hole scorecard expansion per player (Phase 2)
- Historical comparison ("vs last month")
- Push notifications for position changes
- Embedded chat or reactions
- Print-friendly leaderboard layout

## Scoring engine

Uses `@lx2/scoring` package with these key functions:

```typescript
// From packages/scoring
interface HoleData {
  holeNumber: number
  par: number
  strokeIndex: number
}

// Calculate Stableford points for one hole
function calculateStableford(
  grossStrokes: number,
  par: number,
  handicapStrokes: number  // extra strokes on this hole
): number

// Distribute playing handicap across holes by SI
function distributeHandicapStrokes(
  playingHandicap: number,
  holeData: HoleData[]
): Map<number, number>  // holeNumber -> extraStrokes
```

## Data flow

1. Server component fetches: event, course combination, loop holes, event players, scorecards, hole scores, contest entries (all via admin client, parallel queries)
2. Builds `PlayerData[]` with gross strokes array per player
3. Passes to `LeaderboardClient` (client component) with hole data and scoring parameters
4. Client component:
   - Calculates playing handicaps and Stableford points / net scores
   - Ranks players
   - Subscribes to Realtime for live updates
   - Re-calculates on each score change

## Data model

```sql
-- Read from:
events (id, name, date, format, round_type, handicap_allowance_pct,
        ntp_holes, ld_holes, created_by, is_public, combination_id)

course_combinations (name, loop_1_id, loop_2_id)

loop_holes (loop_id, hole_number, par, si_m)  -- si_m = stroke index men's

event_players (id, event_id, display_name, handicap_index, rsvp_status)

scorecards (id, event_id, event_player_id)

hole_scores (scorecard_id, hole_number, gross_strokes)

contest_entries (event_id, hole_number, type, event_player_id, distance_cm)
```

## Open questions

- [ ] Should we support women's stroke index (`si_l`) as well as men's (`si_m`)?
- [ ] TV mode: auto-advance scroll speed — should it be configurable?
- [ ] Do we show "DNF" or hide players who have picked up on multiple holes?
- [ ] Should the leaderboard URL include a sharing preview (OG image)?
- [ ] Cut line display for larger fields (e.g. top 10 highlighted)?

## Links

- Leaderboard page: `apps/web/src/app/events/[id]/leaderboard/page.tsx`
- Leaderboard client: `apps/web/src/app/events/[id]/leaderboard/LeaderboardClient.tsx`
- Scoring package: `packages/scoring/src/stableford.ts`
- Related PRD: `docs/prd/score-entry.md`
- Related PRD: `docs/prd/ntp-ld.md`
- Related PRD: `docs/prd/results.md`
