-- ─────────────────────────────────────────────────────────────────────────────
-- 015_schema_integration.sql
--
-- Adds the structural bridges between the club platform schema and the golfer
-- app schema. All columns are NULLABLE so existing data is fully unaffected.
--
-- SAFE TO RUN in any order relative to the club platform migrations
-- (001_clubs.sql – 009_club_competitions.sql). Each block checks whether the
-- referenced table exists before attempting the ALTER — so this migration
-- succeeds whether or not the club schema has been applied yet. When the club
-- migrations are applied later, the FKs will be added at that point by running
-- this migration again (or via 016_club_fk_backfill.sql if needed).
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

do $$
begin

  -- ── 1. courses.club_id ──────────────────────────────────────────────────────
  -- Ties a course record (golfer app) back to the club that owns the course.
  -- NULL = not yet linked (e.g. public/visitor courses added by players).
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'clubs') then

    if not exists (select 1 from information_schema.columns
                   where table_schema = 'public'
                     and table_name   = 'courses'
                     and column_name  = 'club_id') then
      alter table public.courses
        add column club_id uuid references public.clubs(id) on delete set null;
    end if;

    -- Back-fill Cumberwell Park courses → Cumberwell Park club
    update public.courses
       set club_id = '00000000-0000-0000-0000-000000000001'
     where club_id is null
       and club = 'Cumberwell Park';

    -- ── 2. events.club_id ─────────────────────────────────────────────────────
    -- Marks an event as club-organised (SET) vs a casual player round (NULL).
    if not exists (select 1 from information_schema.columns
                   where table_schema = 'public'
                     and table_name   = 'events'
                     and column_name  = 'club_id') then
      alter table public.events
        add column club_id uuid references public.clubs(id) on delete set null;
    end if;

    -- Grant SELECT on clubs so golfer app can resolve club names
    grant select on public.clubs to authenticated, anon;

  else
    raise notice '015: clubs table not found — skipping courses.club_id, events.club_id, and club grant. Re-run after applying club platform migrations.';
  end if;

  -- ── 3. club_competitions.event_id ───────────────────────────────────────────
  -- Links a club competition to its corresponding scoring event. Players score
  -- against the event; results pull back to the club dashboard via this FK.
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'club_competitions') then

    if not exists (select 1 from information_schema.columns
                   where table_schema = 'public'
                     and table_name   = 'club_competitions'
                     and column_name  = 'event_id') then
      alter table public.club_competitions
        add column event_id uuid references public.events(id) on delete set null;
    end if;

  else
    raise notice '015: club_competitions table not found — skipping event_id FK. Re-run after applying club platform migrations.';
  end if;

end $$;

-- Indexes — created outside the DO block so IF NOT EXISTS works cleanly
create index if not exists courses_club_id_idx
  on public.courses(club_id)
  where club_id is not null;

create index if not exists events_club_id_idx
  on public.events(club_id)
  where club_id is not null;
