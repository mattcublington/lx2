-- ─────────────────────────────────────────────────────────────────────────────
-- 010_course_loops_scoring.sql
--
-- Extends the GOLFER APP schema (001_initial_schema.sql) with loop-based
-- course structure and combination support for scoring.
--
-- This is NOT part of the club platform schema (001_clubs.sql – 009_*).
-- The existing `course_loops` table in 004_course_loops.sql belongs to the
-- club console booking system (tied to club_id). The tables below belong to
-- the golfer app and reference public.courses(id) for venue linkage.
-- ─────────────────────────────────────────────────────────────────────────────

-- loops: a 9-hole circuit (Cumberwell has 6)
-- references public.courses(id) for the venue
create table public.loops (
  id          uuid primary key default uuid_generate_v4(),
  course_id   uuid references public.courses(id) on delete cascade,
  name        text not null,
  holes       int  not null default 9,
  notes       text,
  created_at  timestamptz not null default now(),
  unique(course_id, name)
);

-- loop_holes: per-hole data within a loop
create table public.loop_holes (
  id           uuid primary key default uuid_generate_v4(),
  loop_id      uuid     not null references public.loops(id) on delete cascade,
  hole_number  smallint not null,
  par          smallint not null,
  si_m         smallint,  -- stroke index (men)
  si_w         smallint,  -- stroke index (women)
  unique(loop_id, hole_number)
);

-- loop_hole_tees: yardage per tee colour per hole
create table public.loop_hole_tees (
  id           uuid primary key default uuid_generate_v4(),
  loop_hole_id uuid     not null references public.loop_holes(id) on delete cascade,
  tee_colour   text     not null,
  yards        smallint not null,
  unique(loop_hole_id, tee_colour)
);

-- course_combinations: two loops = one 18-hole round
-- loop_1_id = holes 1–9, loop_2_id = holes 10–18
-- loop_1_id may equal loop_2_id (e.g. White-White played twice)
create table public.course_combinations (
  id          uuid primary key default uuid_generate_v4(),
  course_id   uuid references public.courses(id) on delete cascade,
  name        text     not null,
  par         smallint not null,
  holes       smallint not null default 18,
  loop_1_id   uuid     not null references public.loops(id),
  loop_2_id   uuid     not null references public.loops(id),
  notes       text,
  created_at  timestamptz not null default now(),
  unique(course_id, name)
);

-- combination_tees: WHS slope/rating per tee per combination
create table public.combination_tees (
  id               uuid primary key default uuid_generate_v4(),
  combination_id   uuid    not null references public.course_combinations(id) on delete cascade,
  tee_colour       text    not null,
  gender           text    not null default 'm' check (gender in ('m', 'w')),
  slope_rating     smallint,
  course_rating    numeric(4,1),
  unique(combination_id, tee_colour, gender)
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table public.loops               enable row level security;
alter table public.loop_holes          enable row level security;
alter table public.loop_hole_tees      enable row level security;
alter table public.course_combinations enable row level security;
alter table public.combination_tees    enable row level security;

create policy "Public read access" on public.loops
  for select using (true);

create policy "Public read access" on public.loop_holes
  for select using (true);

create policy "Public read access" on public.loop_hole_tees
  for select using (true);

create policy "Public read access" on public.course_combinations
  for select using (true);

create policy "Public read access" on public.combination_tees
  for select using (true);

-- ─── Alter existing tables ────────────────────────────────────────────────────

-- Add combination + round_type support to events
alter table public.events
  add column if not exists combination_id uuid references public.course_combinations(id),
  add column if not exists round_type     text not null default '18' check (round_type in ('18', '9')),
  add column if not exists loop_id        uuid references public.loops(id);

-- Add round_type + loop_id to scorecards (per-player round info)
alter table public.scorecards
  add column if not exists round_type text not null default '18' check (round_type in ('18', '9')),
  add column if not exists loop_id    uuid references public.loops(id);

-- ─── Grants ───────────────────────────────────────────────────────────────────
-- Postgres 15+ does not auto-grant privileges on manually created tables.
-- service_role needs ALL (for seeding + admin writes).
-- anon + authenticated need SELECT (for public course data queries).

grant all on public.loops               to service_role;
grant all on public.loop_holes          to service_role;
grant all on public.loop_hole_tees      to service_role;
grant all on public.course_combinations to service_role;
grant all on public.combination_tees    to service_role;

grant select on public.loops               to anon, authenticated;
grant select on public.loop_holes          to anon, authenticated;
grant select on public.loop_hole_tees      to anon, authenticated;
grant select on public.course_combinations to anon, authenticated;
grant select on public.combination_tees    to anon, authenticated;
