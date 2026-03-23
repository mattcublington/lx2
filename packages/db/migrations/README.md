# Database Migrations

Two systems share one Supabase project. Migrations are numbered globally to
preserve apply-order, but logically belong to one of two domains:

---

## Club Platform
_Powers `apps/club` (club.lx2.golf). Tee sheets, bookings, member rosters, competitions._

| # | File | What it does |
|---|------|-------------|
| — | `001_clubs.sql` | `clubs` table — base record for each club |
| — | `002_club_user_roles.sql` | Staff roles per club (`admin`, `secretary`, `pro_shop`, `bar_staff`). Defines `is_club_staff()` + `has_club_role()` helpers used by all club RLS policies |
| — | `003_club_members.sql` | Member roster. Importable from intelligentgolf CSV. `user_id` links a member to their golfer app account (nullable — set when member claims their profile) |
| — | `004_course_loops.sql` | Bookable 9-hole loops at a club. Used by the tee sheet system (NOT the same as the scoring `loops` table in migration 010) |
| — | `005_tee_sheet_rules.sql` | Slot-generation rules per loop (interval, capacity, member-only window, valid date range) |
| — | `006_tee_slots.sql` | Individual bookable tee time slots. `booked_count` maintained by trigger |
| — | `007_bookings.sql` | One booking per golfer + guests per slot. Triggers maintain `tee_slots.booked_count` |
| — | `008_seed_cumberwell.sql` | Seeds Cumberwell Park club record + 5 bookable loops |
| — | `009_club_competitions.sql` | Club competition records. Has a public read policy for `entries_open`/`completed` states so the golfer app can surface them |

---

## Golfer App
_Powers `apps/web` (lx2.golf). Round creation, hole-by-hole scoring, handicap, history._

| # | File | What it does |
|---|------|-------------|
| — | `001_initial_schema.sql` | Core tables: `users`, `courses`, `course_holes`, `course_tees`, `events`, `event_players`, `scorecards`, `hole_scores`, `contest_entries`. RLS SELECT policies. Realtime enabled on `hole_scores` + `scorecards` |
| — | `010_course_loops_scoring.sql` | Loop-based course structure for WHS scoring: `loops`, `loop_holes`, `loop_hole_tees`, `course_combinations`, `combination_tees`. Also adds `combination_id` + `round_type` + `loop_id` to `events` and `scorecards`. Explicit grants for `authenticated`/`anon`/`service_role` |
| — | `011_rls_write_policies.sql` | RLS INSERT/UPDATE policies for `event_players`, `scorecards`, `hole_scores`, `users` |
| — | `012_seed_golfer_app.sql` | Seeds all 14 Cumberwell Park 18-hole combinations. Adds unique constraint on `courses.name`. Adds `authenticated` INSERT policy on `courses` |
| — | `013_user_search_policy.sql` | Allows authenticated users to search other users by `display_name` (used by playing partner picker in round wizard) |
| — | `014_golfer_app_grants.sql` | Explicit `GRANT INSERT/UPDATE` on golfer app core tables (`events`, `event_players`, `scorecards`, `hole_scores`, `courses`, `users`) for the `authenticated` role. Required on Postgres 15+ where privileges are not auto-granted |

---

## Integration Bridge
_The joins that allow one combined experience._

| # | File | What it does |
|---|------|-------------|
| — | `015_schema_integration.sql` | Three nullable FKs: `courses.club_id` (which club owns this course), `events.club_id` (was this event club-organised?), `club_competitions.event_id` (which scoring event does this competition map to). Back-fills Cumberwell Park courses to the Cumberwell club record |

---

## How the two systems connect

```
clubs ──────────────────────────── club_members
  │                                    │ user_id
  │ club_id                            ▼
  ├──── courses ◄── events ◄────── users (auth)
  │       │            │               ▲
  │       │            │ club_id       │ user_id
  │       ▼            │               │
  │  course_combinations          event_players
  │       │                            │
  │  club_competitions                 │
  │       │ event_id ──────────────────┘
  │                                scorecards
  │                                    │
  └──── course_loops              hole_scores
         (tee sheets)
```

**Key integration flows:**

1. **Member claims their account** — Club staff imports member (email, handicap, CDH).
   Member signs in to lx2.golf → `club_members.user_id` is set → they see their
   club in the app.

2. **Club creates a competition** — Staff creates `club_competitions` record, app
   creates a linked `events` row, sets `club_competitions.event_id` and
   `events.club_id`. Members with `club_members.user_id` set see the event in
   their golfer app feed.

3. **Members score the round** — Normal scoring flow on lx2.golf. Scores land in
   `hole_scores`. Club dashboard queries `scorecards JOIN events WHERE
   club_competitions.event_id = events.id` to pull results.

4. **Casual round stays casual** — A player creates a round without a club →
   `events.club_id` is NULL. Club platform never sees it.

---

## Naming convention for future migrations

```
NNN_<domain>_<description>.sql

e.g.
016_club_member_linking.sql     — club platform feature
016_golfer_handicap_history.sql — golfer app feature
016_integration_leaderboard.sql — spans both
```
