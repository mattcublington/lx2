# Multi-Round Tournaments + Order of Merit — Design Spec

**Date:** 2026-03-29
**Status:** Approved
**Author:** Claude + Matt

---

## Overview

Two new features layered on top of the existing single-event scoring system:

1. **Tournaments** — group 2+ events (rounds) into a multi-round competition with cumulative scoring. Same format across all rounds. Players ranked by total stableford points or total strokes.

2. **Order of Merit** — season-long points race that consumes finalised tournaments and/or standalone events. An algorithm awards points based on finishing position. Optional "best X of Y" counting.

Both features are **additive** — existing event creation, scoring, leaderboard, groups, and predictions are unchanged.

---

## Layer 1: Tournaments

### Data Model

#### New table: `tournaments`

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid | gen_random_uuid() | PK |
| `created_by` | uuid FK → users | | Organiser |
| `name` | text | | e.g. "Spring Championship" |
| `description` | text | NULL | Optional blurb |
| `format` | text CHECK ('stableford','strokeplay') | | All rounds must match. Matchplay excluded — cumulative matchplay is not meaningful. |
| `status` | text CHECK ('upcoming','in_progress','completed') | 'upcoming' | Transitions: upcoming → in_progress (organiser starts or first round finalised) → completed (organiser finalises tournament) |
| `finalised` | boolean | false | Locks standings |
| `dns_policy` | text CHECK ('exclude','penalty') | 'exclude' | `'exclude'`: skip missed rounds. `'penalty'`: assign 0 stableford pts (stableford) or max observed strokes + 10 (strokeplay). |
| `updated_at` | timestamptz | now() | Updated via trigger on row change |
| `created_at` | timestamptz | now() | |

RLS: Public SELECT. Organiser INSERT/UPDATE/DELETE (created_by = auth.uid()).

#### Existing table changes: `events`

Add two nullable columns:

- `tournament_id` uuid FK → tournaments (ON DELETE SET NULL)
- `round_number` smallint, nullable

Constraint: `CHECK ((tournament_id IS NULL) = (round_number IS NULL))` — both set or both null.

Constraint: `UNIQUE (tournament_id, round_number)` — no duplicate round numbers within a tournament.

Validation (application-level):
- All events in a tournament must have the same `format` as the tournament.
- `addRound` must verify `event.created_by = tournament.created_by` — only the tournament organiser's own events can be linked.
- Matchplay events cannot be added to tournaments (tournament format excludes matchplay).

### Tournament Standings Computation

Computed on the fly — no materialised table needed at current scale.

**Algorithm (stableford):**
1. For each finalised round in the tournament, compute each player's stableford total (sum of stableford points per hole, using existing `@lx2/scoring` package)
2. Group by player — **identity matching**: authenticated players matched by `user_id`. Anonymous/guest players are **excluded from tournament standings** (they get per-round results only). The organiser can link anonymous players to authenticated accounts via the tournament manage page if needed.
3. Sum stableford totals across rounds
4. Rank descending (highest total wins)
5. DNS policy:
   - `'exclude'`: player's total only includes rounds they played
   - `'penalty'`: missed rounds count as 0 stableford points

**Algorithm (strokeplay):**
1. Same as above but sum gross strokes
2. Rank ascending (lowest total wins)
3. DNS policy:
   - `'exclude'`: player's total only includes rounds they played
   - `'penalty'`: missed rounds count as max strokes observed in that round + 10

**Tie-breaking:** number of rounds played (more = better) → best single-round score → alphabetical.

### Tournament Wizard Flow

**Step 1 — Details:**
- Tournament name
- Format: Stableford / Stroke Play
- DNS policy: Exclude missed rounds / Assign max score

**Step 2 — Rounds:**
- Add rounds (minimum 2)
- For each round: date + course/combination (reuses existing course picker)
- Rounds auto-numbered sequentially
- Can reorder via drag or arrows

**Step 3 — Review & Create:**
- Summary of tournament + all rounds
- Single "Create tournament" button
- Server action: INSERT tournament → INSERT events (one per round, with `tournament_id` + `round_number`)
- Redirects to tournament overview page

### Tournament Pages

| Route | Purpose |
|-------|---------|
| `/tournaments` | List page — hero banner, active + past tournaments |
| `/tournaments/new` | Create wizard |
| `/tournaments/[id]` | Overview — round schedule with status badges, cumulative standings, links to each round's event page |
| `/tournaments/[id]/manage` | Add/remove rounds, reorder, finalise tournament |

**Tournament overview page (`/tournaments/[id]`):**
- Hero banner with tournament name (Manrope 800, matching existing hero banner pattern on /events, /rounds, /analysis pages)
- Round schedule: cards for each round showing date, course, status (upcoming/in-progress/finalised)
- Cumulative standings table: position, player name, round-by-round scores, total
- Each round card links to `/events/[eventId]`

**Event page changes:**
- If `event.tournament_id` is set, show a banner/badge: "Round 2 of 3 — Spring Championship" linking to `/tournaments/[tournamentId]`
- No other changes to event pages

### Server Actions

| Action | Location | What it does |
|--------|----------|-------------|
| `createTournament` | `/tournaments/new/actions.ts` | Creates tournament + event rows in one transaction |
| `addRound` | `/tournaments/[id]/manage/actions.ts` | Adds an event with next round_number |
| `removeRound` | same | Removes event + cascades. Does NOT re-number — gaps allowed (e.g. rounds 1, 3 after removing 2). Avoids confusion when players reference round numbers externally. |
| `reorderRounds` | same | Updates round_number for reordering |
| `finaliseTournament` | same | Sets `tournaments.finalised = true`, `status = 'completed'` |
| `unfinaliseTournament` | same | Reopens tournament |

---

## Layer 2: Order of Merit

### Data Model

#### New table: `order_of_merits`

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid | gen_random_uuid() | PK |
| `created_by` | uuid FK → users | | Organiser |
| `name` | text | | e.g. "2026 Society Order of Merit" |
| `season_year` | smallint | | e.g. 2026 |
| `best_of` | smallint | NULL | If set, only top N results count |
| `points_template` | jsonb | | Position → points mapping |
| `participation_points` | smallint | 0 | Bonus points for playing |
| `status` | text CHECK ('active','completed') | 'active' | |
| `updated_at` | timestamptz | now() | Updated via trigger on row change |
| `created_at` | timestamptz | now() | |

RLS: Public SELECT. Organiser INSERT/UPDATE/DELETE (created_by = auth.uid()).

**`points_template` validation (application-level):** Keys must be positive integer strings or `"default"`. Values must be non-negative integers. Validated in the wizard and server actions before insert/update.

#### New table: `order_of_merit_entries`

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid | gen_random_uuid() | PK |
| `merit_id` | uuid FK → order_of_merits (CASCADE) | | |
| `event_id` | uuid FK → events | NULL | Standalone event |
| `tournament_id` | uuid FK → tournaments | NULL | OR a tournament |
| `points_multiplier` | numeric(3,2) | 1.00 | e.g. 1.5 for "majors" |
| `added_at` | timestamptz | now() | |

Constraint: `CHECK ((event_id IS NULL) != (tournament_id IS NULL))` — exactly one must be set.
Constraint: `UNIQUE (merit_id, event_id)` and `UNIQUE (merit_id, tournament_id)` — no duplicates.

### Points Template Format

```json
{
  "1": 25,
  "2": 20,
  "3": 16,
  "4": 13,
  "5": 11,
  "6": 10,
  "7": 9,
  "8": 8,
  "9": 7,
  "10": 6,
  "default": 2
}
```

Positions not explicitly listed fall back to `"default"`. If no default, unranked positions get 0.

### Points Algorithm

When a linked event is finalised (or tournament is finalised):

1. Compute final standings for that event/tournament
2. For each player, look up their finishing position in `points_template`
   - Position has explicit value → award those points
   - Position > last explicit → award `"default"` points
3. Multiply by `points_multiplier` for that entry (allows "majors" worth 1.5x)
4. Add `participation_points` for everyone who finished
5. Store/cache nothing — compute on the fly from finalised results

**Merit standings computation:**
1. For each player across all finalised entries: collect point awards
2. Sort descending per player
3. If `best_of` set: take only top `min(best_of, events_played)` results — a player with fewer events than `best_of` counts all their results
4. Sum → total merit points
5. Rank descending

**Tie-breaking:** number of wins across events → number of 2nd places → alphabetical.

### Points Template Presets

| Preset | 1st | 2nd | 3rd | 4th | 5th | 6–8 | 9–12 | Rest | Participation |
|--------|-----|-----|-----|-----|-----|-----|------|------|---------------|
| Standard | 25 | 20 | 16 | 13 | 11 | 10,9,8 | 7,6,5,4 | 2 | 0 |
| Flat | 10 | 8 | 6 | 5 | 4 | 3 | 2 | 1 | 0 |
| Participation-heavy | 15 | 12 | 10 | 8 | 6 | 5 | 4 | 3 | 5 |
| Custom | Organiser fills in manually | | | | | | | | |

### Order of Merit Wizard Flow

**Step 1 — Details:**
- Name, season year
- Best-of count (optional)
- Participation points (default 0)

**Step 2 — Points template:**
- Pick a preset or customise
- Preview table showing points per position

**Step 3 — Add events/tournaments:**
- List of available finalised and upcoming events/tournaments (owned by this organiser)
- Select which to include
- Set multiplier per entry (default 1.0x, option for 1.5x "major", 2.0x etc.)
- Can add more later from manage page

**Step 4 — Review & Create**

### Order of Merit Pages

| Route | Purpose |
|-------|---------|
| `/merit` | List page — current + past seasons |
| `/merit/new` | Create wizard |
| `/merit/[id]` | Standings — total points, event-by-event breakdown per player |
| `/merit/[id]/manage` | Add/remove events and tournaments, adjust multipliers, edit template |

**Standings page (`/merit/[id]`):**
- Hero banner with merit name + season year
- Standings table: position, player name, per-event points columns, total
- Best-of indicator (shows which results are counted vs dropped)
- Multiplier badges on "major" events (1.5x etc.)

---

## Navigation Changes

The bottom nav "Tournaments" tab currently links to `/events`.

**New structure:**
- **Tournaments tab → `/tournaments`** — hub page with three sections:
  1. Active tournaments (multi-round)
  2. Order of merit (season standings)
  3. Standalone events (one-off competitions, i.e. events without a tournament_id)

This replaces the current `/events` list. Standalone events are still accessible — they appear in the "Standalone events" section and are individually linkable.

**Redirect:** Add a redirect from `/events` to `/tournaments` to avoid breaking existing bookmarks and shared links. Individual event routes (`/events/[id]`, `/events/[id]/leaderboard`, etc.) remain unchanged.

The "Organise a tournament" CTA on the play dashboard links to `/tournaments/new`.

**Scope:** Tournament creation and management is a player-app feature (`apps/web`) for society organisers. Club-app integration (`apps/club`) is out of scope for this spec.

---

## DB Migration Summary

**Migration file:** `packages/db/migrations/011_tournaments.sql`

1. CREATE TABLE `tournaments`
2. ALTER TABLE `events` ADD COLUMN `tournament_id`, ADD COLUMN `round_number`
3. ADD constraints (CHECK, UNIQUE, FK)
4. CREATE TABLE `order_of_merits`
5. CREATE TABLE `order_of_merit_entries`
6. ADD constraints (CHECK, UNIQUE, FKs)
7. RLS policies for all new tables
8. Index: `events(tournament_id)` for fast round lookups
9. Index: `order_of_merit_entries(merit_id)` for fast entry lookups
10. `updated_at` trigger function for `tournaments` and `order_of_merits`

---

## What Doesn't Change

- Event creation (`/events/new`), scoring, leaderboard, groups, predictions — all unchanged
- `/events/[id]`, `/events/[id]/leaderboard`, `/events/[id]/manage` — work as-is
- `@lx2/scoring` package — unchanged (tournaments compute standings from existing scored data)
- Anonymous/guest player support — unchanged
- Club integration — `club_competitions.event_id` still works; clubs can link events that are part of tournaments

---

## Package Impact

| Package | Changes |
|---------|---------|
| `packages/db` | New migration file |
| `apps/web` | New pages: /tournaments/*, /merit/*. Minor changes to event detail page (tournament badge). Navigation update. |
| `packages/scoring` | No changes — standings computed from existing stableford/strokeplay functions |
| `packages/leaderboard` | No changes — per-round leaderboard is existing functionality |
| `apps/architecture` | Update LX2Architecture.tsx with tournament pages |

---

## Open Questions (resolved)

- **Q: Materialised standings table vs compute on the fly?** A: Compute on the fly. A society of 20 players across 12 events is trivial to compute. Materialise later if needed.
- **Q: Can a tournament span different formats?** A: No. All rounds in a tournament must share the same format (stableford or strokeplay). This keeps cumulative scoring meaningful.
- **Q: Can an event belong to multiple tournaments?** A: No. One tournament per event. But an event (or tournament) can belong to multiple orders of merit.
