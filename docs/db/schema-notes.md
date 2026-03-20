# Database schema notes

**Project:** lx2-dev (Supabase)  
**Migration:** `packages/db/migrations/001_initial_schema.sql`

## Key design decisions

### Anonymous-first auth
Players can join an event and score a full round without creating an account. `event_players.user_id` is nullable — it's populated only when the player creates an account or links their anonymous session.

### Realtime enabled tables
`hole_scores` and `scorecards` are added to `supabase_realtime` publication. This enables the live leaderboard to subscribe to changes without polling.

### NTP/LD as arrays on events
`events.ntp_holes` and `events.ld_holes` are stored as `smallint[]` — simple and sufficient for MVP. If contest configuration becomes more complex (multiple prizes per hole, configurable rules), this will need a separate `contests` table.

### Handicap stored on event_players, not users
`event_players.handicap_index` captures the handicap at the time of the event. This is correct — a player's handicap changes over time and we want the historical record to be accurate.

## Tables

| Table | Purpose |
|-------|---------|
| `users` | Extends `auth.users`, stores display name and handicap index |
| `courses` | Golf course metadata, seeded from golfcourseapi.com |
| `course_holes` | Par and stroke index per hole |
| `course_tees` | Tee-specific yardages, slope and course rating |
| `events` | Society event configuration |
| `event_players` | Player registration for an event |
| `scorecards` | One per player per event |
| `hole_scores` | Individual hole scores, null = pick-up |
| `contest_entries` | NTP and Longest Drive results |
