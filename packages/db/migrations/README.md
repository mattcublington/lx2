# Database Migrations

## Philosophy

**Two tiers of files:**

| Tier | Files | Purpose |
|------|-------|---------|
| **Baseline** | `NNN = 001–003` | Complete schema + seed for a fresh project. Stable once applied — never edit these against a live DB. |
| **Incremental** | `NNN ≥ 004` | Additive changes (new policies, new columns, new tables) that run on top of an existing DB. Each file is self-contained and idempotent via DO blocks checking `pg_policies`, `information_schema`, etc. |

The goal is to **keep incremental files rare and meaningful**. Don't create a new file for every small fix — if the DB hasn't been deployed to production yet, update the baseline instead. Create a numbered incremental file when:
- A live DB needs a change that can't recreate from scratch
- It's a genuinely new feature/policy, not a fix to something already in the baseline

---

## Apply order (fresh project)

```
1. club/001_club_schema.sql
2. golfer/001_golfer_schema.sql
3. shared/001_integration.sql
4. club/002_club_seed_cumberwell.sql
5. golfer/002_golfer_seed_cumberwell.sql
6. golfer/003_golfer_seed_cumberwell_loops.sql
```

Steps 1 and 2 are independent and can be applied in either order.
Step 3 requires both to be applied first.
Seed files (4, 5, 6) are safe to re-run (ON CONFLICT DO NOTHING).

### Then apply incremental migrations (in order):
```
7. golfer/004_organiser_group_scoring.sql
8. golfer/005_combination_tees.sql
```

---

## club/

Powers `apps/club` (club.lx2.golf) — tee sheets, bookings, member rosters, competitions.

| File | What it does |
|------|-------------|
| `001_club_schema.sql` | All club tables, RLS, helper functions (`is_club_staff`, `has_club_role`), booking trigger, grants |
| `002_club_seed_cumberwell.sql` | Cumberwell Park club record + 5 bookable tee sheet loops |

**Tables:** `clubs`, `club_user_roles`, `club_members`, `course_loops`, `tee_sheet_rules`, `tee_slots`, `bookings`, `club_competitions`

**First admin:** Must be inserted directly via Supabase SQL Editor (bypasses RLS), because the write policy requires an existing admin row to authorise the insert.

---

## golfer/

Powers `apps/web` (lx2.golf) — round creation, hole-by-hole scoring, handicap, history.

| File | What it does |
|------|-------------|
| `001_golfer_schema.sql` | All golfer tables, RLS, realtime publication, grants |
| `002_golfer_seed_cumberwell.sql` | 14 Cumberwell Park course rows (named combinations only — no hole data) |
| `003_golfer_seed_cumberwell_loops.sql` | 6 loops, 54 loop_holes, 54 loop_hole_tees (Yellow/Purple), 14 course_combinations — **required for scoring page to load** |
| `004_organiser_group_scoring.sql` | Adds RLS policies allowing the event organiser to insert/update hole_scores for any player in their event (enables marker mode — one person scores for the group) |
| `005_combination_tees.sql` | Adds White/Par 3 + Par 3/White courses and combinations (missing from baseline); fixes White/White course rating/slope; seeds all `combination_tees` rows with USGA-certified slope and course ratings for every tee colour — **required for WHS course handicap calculation** |

**Tables:** `users`, `courses`, `course_holes`, `course_tees`, `loops`, `loop_holes`, `loop_hole_tees`, `course_combinations`, `combination_tees`, `events`, `event_players`, `scorecards`, `hole_scores`, `contest_entries`

**Course data model:**
```
loops (6 Cumberwell circuits)
  └── loop_holes (9 holes each, par + si_m)
        └── loop_hole_tees (yards by tee colour)

course_combinations (16 named 18-hole pairings — 14 baseline + White/Par 3 + Par 3/White from 005)
  ├── loop_1_id → holes 1–9
  └── loop_2_id → holes 10–18
```

**RLS summary:**
- `events`, `event_players`, `scorecards`, `hole_scores`: readable by anyone
- `hole_scores` write: player who owns the scorecard **OR** event organiser (`events.created_by = auth.uid()`)
- Guest players (`user_id = null`) can only be scored by the organiser

---

## shared/

Integration bridges between the two systems. Apply after both schemas.

| File | What it does |
|------|-------------|
| `001_integration.sql` | Adds `courses.club_id`, `events.club_id`, `club_competitions.event_id` — the three nullable FKs that connect club-organised rounds to the golfer scoring flow |

---

## How the two systems connect

```
clubs ──────────────────────────── club_members
  │  club_id                           │ user_id
  │                                    ▼
  ├──── courses ◄── events ◄────── users (auth)
  │  club_id           │ club_id        ▲
  │                    │                │ user_id
  │              club_competitions      │
  │                    │ event_id  event_players
  │                    ▼                │
  │               scorecards ──────────┘
  │                    │
  └──── course_loops  hole_scores
         (tee sheets)
```

**Key flows:**

1. **Member claims account** — Staff imports member (email, handicap, CDH). Member signs in to lx2.golf → `club_members.user_id` is linked.

2. **Club creates competition** — Staff creates `club_competitions` row. App creates linked `events` row, sets `club_competitions.event_id` and `events.club_id`. Members see the event in their lx2.golf feed.

3. **Members score the round** — Normal scoring flow on lx2.golf. Results land in `hole_scores`. Club dashboard queries `scorecards JOIN events WHERE club_competitions.event_id = events.id`.

4. **Casual round stays casual** — Player creates a round without a club → `events.club_id` is NULL. Club platform never sees it.

---

## _archive/

The 15 original incremental migration files (001–015) are kept here for reference. They were applied to the initial Supabase project before this consolidation. Do not re-run them against a fresh project — use the files above instead.

---

## Naming convention for future migrations

```
club/NNN_<description>.sql
golfer/NNN_<description>.sql
shared/NNN_<description>.sql
```
