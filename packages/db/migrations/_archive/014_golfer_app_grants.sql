-- ─────────────────────────────────────────────────────────────────────────────
-- 014_golfer_app_grants.sql
--
-- Postgres 15+ does not auto-grant write privileges on manually created tables
-- to non-superuser roles. Migration 010 handles this for its own tables, but
-- the golfer app core tables (from 001_initial_schema.sql) were left without
-- explicit INSERT/UPDATE grants for the `authenticated` role.
--
-- Without these, the `authenticated` role can SELECT (RLS policies allow it)
-- but cannot INSERT or UPDATE — producing "permission denied for table X".
--
-- Affected operations:
--   startRound server action:  INSERT events, event_players, scorecards, courses
--   score entry:               INSERT/UPDATE hole_scores
--   profile / sign-in upsert:  INSERT/UPDATE users
--
-- service_role needs ALL so admin/seed scripts continue to work.
-- Grants are idempotent — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── service_role — full access for admin / seed scripts ─────────────────────
grant all on public.users          to service_role;
grant all on public.courses        to service_role;
grant all on public.course_holes   to service_role;
grant all on public.course_tees    to service_role;
grant all on public.events         to service_role;
grant all on public.event_players  to service_role;
grant all on public.scorecards     to service_role;
grant all on public.hole_scores    to service_role;
grant all on public.contest_entries to service_role;

-- ─── authenticated — write access needed for the golfer app ──────────────────

-- users: upsert own profile on sign-in; update handicap when starting a round
grant select, insert, update on public.users         to authenticated;

-- courses: insert new course record if one doesn't exist yet (fallback path)
grant select, insert            on public.courses    to authenticated;

-- course_holes / course_tees: read-only for WHS calculations
grant select on public.course_holes  to authenticated;
grant select on public.course_tees   to authenticated;

-- events: organisers create and update their own events
grant select, insert, update on public.events        to authenticated;

-- event_players: organiser adds players to their own event
grant select, insert         on public.event_players to authenticated;

-- scorecards: organiser creates scorecard rows; player can update (submit)
grant select, insert, update on public.scorecards    to authenticated;

-- hole_scores: players insert and update their own scores (upsert)
grant select, insert, update on public.hole_scores   to authenticated;

-- contest_entries: players record NTP / LD entries
grant select, insert, update on public.contest_entries to authenticated;

-- ─── anon — public read (matches the "readable by anyone" SELECT policies) ───
grant select on public.courses         to anon;
grant select on public.course_holes    to anon;
grant select on public.course_tees     to anon;
grant select on public.events          to anon;
grant select on public.event_players   to anon;
grant select on public.scorecards      to anon;
grant select on public.hole_scores     to anon;
grant select on public.contest_entries to anon;
