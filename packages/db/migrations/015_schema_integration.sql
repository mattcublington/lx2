-- ─────────────────────────────────────────────────────────────────────────────
-- 015_schema_integration.sql
--
-- Adds the structural bridges between the club platform schema and the golfer
-- app schema. All columns are NULLABLE so existing data is fully unaffected.
--
-- Without these, the two systems are completely orphaned:
--   • A golfer course has no idea which club it belongs to
--   • An event has no idea whether it was club-organised or player-created
--   • A club competition has no corresponding event for players to score against
--
-- With these three FKs in place, the combined experience becomes possible:
--
--   club staff creates competition
--       → sets club_competitions.event_id → events.id
--           → players see it in their golfer app dashboard (events.club_id = their club)
--               → they score against it (scorecards / hole_scores)
--                   → results surface back to club dashboard
--
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. courses.club_id
--    Ties a course record (golfer app) back to the club that owns the course.
--    Allows the club console to show "rounds played at your course", surface
--    leaderboards, and feed scoring data into club competitions.
--    NULL = course not yet linked to a club (e.g. public/visitor courses added
--    by players manually).
alter table public.courses
  add column if not exists club_id uuid references public.clubs(id) on delete set null;

-- Back-fill Cumberwell Park courses → Cumberwell Park club
update public.courses
   set club_id = '00000000-0000-0000-0000-000000000001'
 where club_id is null
   and club = 'Cumberwell Park';

-- Index for reverse lookup: "all golfer-app courses owned by club X"
create index if not exists courses_club_id_idx on public.courses(club_id);

-- 2. events.club_id
--    Marks an event as club-organised (vs a casual player-created round).
--    NULL = informal round started by a player.
--    SET = official club competition visible to all linked club members.
--    RLS already allows anyone to SELECT events, so linked members will
--    automatically see club events in their golfer app feed once this is set.
alter table public.events
  add column if not exists club_id uuid references public.clubs(id) on delete set null;

create index if not exists events_club_id_idx on public.events(club_id);

-- 3. club_competitions.event_id
--    When a club staff member publishes a competition, they (or the app)
--    creates a corresponding event row and sets this FK. Players then score
--    against that event via the normal scoring flow. Results feed back to the
--    club dashboard by querying scorecards JOIN events WHERE
--    club_competitions.event_id = events.id.
alter table club_competitions
  add column if not exists event_id uuid references public.events(id) on delete set null;

create index if not exists club_competitions_event_id_idx on club_competitions(event_id);

-- ─── Grants ───────────────────────────────────────────────────────────────────
-- authenticated users need to read clubs (for profile, course lookup etc.)
-- service_role already has ALL via 014.
grant select on public.clubs to authenticated, anon;
