-- ─────────────────────────────────────────────────────────────────────────────
-- shared/001_integration.sql
--
-- Bridges the club platform schema and the golfer app schema.
-- Must be applied AFTER both club/001_club_schema.sql and
-- golfer/001_golfer_schema.sql.
--
-- Three nullable FK columns — existing data is fully unaffected:
--
--   courses.club_id          which club owns this course
--   events.club_id           was this event club-organised?
--   club_competitions.event_id   which scoring event maps to this competition
--
-- Combined experience this enables:
--   1. Club staff creates a competition
--   2. App creates a linked events row, sets club_competitions.event_id
--      and events.club_id
--   3. Members see the event in their lx2.golf feed (events.club_id = their club)
--   4. They score normally (hole_scores / scorecards)
--   5. Club dashboard pulls results via:
--        scorecards JOIN events
--        WHERE club_competitions.event_id = events.id
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. courses.club_id — ties a golfer app course back to the owning club
alter table public.courses
  add column if not exists club_id uuid references public.clubs(id) on delete set null;

-- Back-fill Cumberwell Park courses to the seeded club record
update public.courses
   set club_id = '00000000-0000-0000-0000-000000000001'
 where club_id is null
   and club = 'Cumberwell Park';

create index if not exists courses_club_id_idx
  on public.courses(club_id) where club_id is not null;

-- 2. events.club_id — NULL = casual player round, SET = official club event
alter table public.events
  add column if not exists club_id uuid references public.clubs(id) on delete set null;

create index if not exists events_club_id_idx
  on public.events(club_id) where club_id is not null;

-- 3. club_competitions.event_id — links a competition to its scoring event
alter table public.club_competitions
  add column if not exists event_id uuid references public.events(id) on delete set null;

create index if not exists club_competitions_event_id_idx
  on public.club_competitions(event_id) where event_id is not null;
