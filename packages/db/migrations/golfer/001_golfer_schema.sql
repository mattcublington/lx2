-- ─────────────────────────────────────────────────────────────────────────────
-- golfer/001_golfer_schema.sql
--
-- Complete golfer app schema: tables, RLS policies, grants, realtime.
-- Consolidates legacy: 001_initial_schema, 010_course_loops_scoring,
--                      011_rls_write_policies, 013_user_search_policy,
--                      014_golfer_app_grants.
--
-- Apply order: run this before shared/001_integration.sql
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";

-- ─── Users ───────────────────────────────────────────────────────────────────
-- Extends Supabase auth.users. Created on first sign-in via upsert.

create table public.users (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text not null unique,
  display_name   text,
  handicap_index numeric(4,1),
  created_at     timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Authenticated users can search other users"
  on public.users for select
  using (auth.uid() is not null);

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- ─── Courses ─────────────────────────────────────────────────────────────────
-- One row per named 18-hole combination (e.g. "Cumberwell Park — Red/Yellow").
-- Seeded for known courses; new ones created on first use by players.

create table public.courses (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  club          text,
  location      text,
  holes_count   smallint not null default 18,
  slope_rating  smallint,
  course_rating numeric(4,1),
  par           smallint,
  source        text not null default 'manual',
  verified      boolean not null default false,
  created_at    timestamptz not null default now(),
  constraint courses_name_unique unique (name)
);

create table public.course_holes (
  id           uuid primary key default uuid_generate_v4(),
  course_id    uuid not null references public.courses(id) on delete cascade,
  hole_number  smallint not null,
  par          smallint not null,
  stroke_index smallint not null,
  unique(course_id, hole_number)
);

create table public.course_tees (
  id            uuid primary key default uuid_generate_v4(),
  course_id     uuid not null references public.courses(id) on delete cascade,
  tee_name      text not null,
  yardages      smallint[] not null,
  total_yards   smallint,
  slope_rating  smallint,
  course_rating numeric(4,1),
  unique(course_id, tee_name)
);

alter table public.courses     enable row level security;
alter table public.course_holes enable row level security;
alter table public.course_tees  enable row level security;

create policy "Courses are publicly readable"
  on public.courses for select using (true);

create policy "Authenticated users can insert courses"
  on public.courses for insert
  with check (auth.uid() is not null);

create policy "Course holes are publicly readable"
  on public.course_holes for select using (true);

create policy "Course tees are publicly readable"
  on public.course_tees for select using (true);

-- ─── Loops & combinations (WHS scoring structure) ────────────────────────────
-- loops: a 9-hole circuit (Cumberwell has 6: Red, Yellow, Blue, Orange, White, Par3)
-- course_combinations: two loops = one 18-hole round

create table public.loops (
  id         uuid primary key default uuid_generate_v4(),
  course_id  uuid references public.courses(id) on delete cascade,
  name       text not null,
  holes      int not null default 9,
  notes      text,
  created_at timestamptz not null default now(),
  unique(course_id, name)
);

create table public.loop_holes (
  id          uuid primary key default uuid_generate_v4(),
  loop_id     uuid not null references public.loops(id) on delete cascade,
  hole_number smallint not null,
  par         smallint not null,
  si_m        smallint,  -- stroke index (men)
  si_w        smallint,  -- stroke index (women)
  unique(loop_id, hole_number)
);

create table public.loop_hole_tees (
  id           uuid primary key default uuid_generate_v4(),
  loop_hole_id uuid not null references public.loop_holes(id) on delete cascade,
  tee_colour   text not null,
  yards        smallint not null,
  unique(loop_hole_id, tee_colour)
);

create table public.course_combinations (
  id         uuid primary key default uuid_generate_v4(),
  course_id  uuid references public.courses(id) on delete cascade,
  name       text not null,
  par        smallint not null,
  holes      smallint not null default 18,
  loop_1_id  uuid not null references public.loops(id),
  loop_2_id  uuid not null references public.loops(id),
  notes      text,
  created_at timestamptz not null default now(),
  unique(course_id, name)
);

create table public.combination_tees (
  id             uuid primary key default uuid_generate_v4(),
  combination_id uuid not null references public.course_combinations(id) on delete cascade,
  tee_colour     text not null,
  gender         text not null default 'm' check (gender in ('m', 'w')),
  slope_rating   smallint,
  course_rating  numeric(4,1),
  unique(combination_id, tee_colour, gender)
);

alter table public.loops               enable row level security;
alter table public.loop_holes          enable row level security;
alter table public.loop_hole_tees      enable row level security;
alter table public.course_combinations enable row level security;
alter table public.combination_tees    enable row level security;

create policy "Public read access" on public.loops               for select using (true);
create policy "Public read access" on public.loop_holes          for select using (true);
create policy "Public read access" on public.loop_hole_tees      for select using (true);
create policy "Public read access" on public.course_combinations for select using (true);
create policy "Public read access" on public.combination_tees    for select using (true);

-- ─── Events ──────────────────────────────────────────────────────────────────
-- A round organised by a player or (when club_id is set) by club staff.
-- combination_id / round_type / loop_id support 9- and 18-hole WHS rounds.
-- club_id is set by shared/001_integration.sql once the club schema exists.

create table public.events (
  id                    uuid primary key default uuid_generate_v4(),
  created_by            uuid not null references public.users(id),
  course_id             uuid not null references public.courses(id),
  combination_id        uuid references public.course_combinations(id),
  tee_id                uuid references public.course_tees(id),
  name                  text not null,
  date                  date not null,
  format                text not null check (format in ('stableford', 'strokeplay', 'matchplay')),
  round_type            text not null default '18' check (round_type in ('18', '9')),
  loop_id               uuid references public.loops(id),  -- set for 9-hole rounds
  handicap_allowance_pct numeric(3,2) not null default 0.95,
  entry_fee_pence       integer,
  max_players           smallint,
  group_size            smallint not null default 4,
  ntp_holes             smallint[] not null default '{}',
  ld_holes              smallint[] not null default '{}',
  is_public             boolean not null default false,
  finalised             boolean not null default false,
  created_at            timestamptz not null default now()
);

alter table public.events enable row level security;

create policy "Events readable by anyone"
  on public.events for select using (true);

create policy "Organisers can create events"
  on public.events for insert
  with check (auth.uid() = created_by);

create policy "Organisers can update own events"
  on public.events for update
  using (auth.uid() = created_by);

-- ─── Event players ───────────────────────────────────────────────────────────

create table public.event_players (
  id             uuid primary key default uuid_generate_v4(),
  event_id       uuid not null references public.events(id) on delete cascade,
  user_id        uuid references public.users(id),
  display_name   text not null,
  handicap_index numeric(4,1) not null,
  rsvp_status    text not null default 'invited'
                 check (rsvp_status in ('invited','confirmed','declined','waitlisted')),
  payment_status text not null default 'unpaid'
                 check (payment_status in ('unpaid','paid','refunded','waived')),
  flight_number  smallint,
  created_at     timestamptz not null default now()
);

alter table public.event_players enable row level security;

create policy "Event players readable by anyone"
  on public.event_players for select using (true);

create policy "Organisers can add event players"
  on public.event_players for insert
  with check (
    exists (
      select 1 from public.events
      where id = event_players.event_id
        and created_by = auth.uid()
    )
  );

-- ─── Scorecards ──────────────────────────────────────────────────────────────

create table public.scorecards (
  id              uuid primary key default uuid_generate_v4(),
  event_id        uuid not null references public.events(id) on delete cascade,
  event_player_id uuid not null references public.event_players(id) on delete cascade,
  round_type      text not null default '18' check (round_type in ('18', '9')),
  loop_id         uuid references public.loops(id),
  created_at      timestamptz not null default now(),
  submitted_at    timestamptz,
  unique(event_id, event_player_id)
);

alter table public.scorecards enable row level security;

create policy "Scorecards readable by anyone"
  on public.scorecards for select using (true);

create policy "Organisers can create scorecards"
  on public.scorecards for insert
  with check (
    exists (
      select 1 from public.events
      where id = scorecards.event_id
        and created_by = auth.uid()
    )
  );

-- ─── Hole scores ─────────────────────────────────────────────────────────────

create table public.hole_scores (
  id            uuid primary key default uuid_generate_v4(),
  scorecard_id  uuid not null references public.scorecards(id) on delete cascade,
  hole_number   smallint not null,
  gross_strokes smallint,  -- null = pick-up
  created_at    timestamptz not null default now(),
  unique(scorecard_id, hole_number)
);

alter table public.hole_scores enable row level security;

create policy "Hole scores readable by anyone"
  on public.hole_scores for select using (true);

create policy "Players can insert own hole scores"
  on public.hole_scores for insert
  with check (
    exists (
      select 1 from public.scorecards sc
      join public.event_players ep on ep.id = sc.event_player_id
      where sc.id = hole_scores.scorecard_id
        and ep.user_id = auth.uid()
    )
  );

create policy "Players can update own hole scores"
  on public.hole_scores for update
  using (
    exists (
      select 1 from public.scorecards sc
      join public.event_players ep on ep.id = sc.event_player_id
      where sc.id = hole_scores.scorecard_id
        and ep.user_id = auth.uid()
    )
  );

-- ─── Contest entries (NTP / LD) ───────────────────────────────────────────────

create table public.contest_entries (
  id              uuid primary key default uuid_generate_v4(),
  event_id        uuid not null references public.events(id) on delete cascade,
  hole_number     smallint not null,
  type            text not null check (type in ('ntp', 'ld')),
  event_player_id uuid not null references public.event_players(id),
  distance_cm     integer,
  created_at      timestamptz not null default now()
);

alter table public.contest_entries enable row level security;

create policy "Contest entries readable by anyone"
  on public.contest_entries for select using (true);

-- ─── Realtime ────────────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.hole_scores;
alter publication supabase_realtime add table public.scorecards;

-- ─── Grants ──────────────────────────────────────────────────────────────────
-- Explicit grants required on Postgres 15+ (no auto-grant to non-superuser roles).

grant all on public.users           to service_role;
grant all on public.courses         to service_role;
grant all on public.course_holes    to service_role;
grant all on public.course_tees     to service_role;
grant all on public.loops           to service_role;
grant all on public.loop_holes      to service_role;
grant all on public.loop_hole_tees  to service_role;
grant all on public.course_combinations to service_role;
grant all on public.combination_tees    to service_role;
grant all on public.events          to service_role;
grant all on public.event_players   to service_role;
grant all on public.scorecards      to service_role;
grant all on public.hole_scores     to service_role;
grant all on public.contest_entries to service_role;

-- authenticated: minimum write access needed for the golfer app
grant select, insert, update on public.users           to authenticated;
grant select, insert         on public.courses         to authenticated;
grant select                 on public.course_holes    to authenticated;
grant select                 on public.course_tees     to authenticated;
grant select                 on public.loops               to authenticated;
grant select                 on public.loop_holes          to authenticated;
grant select                 on public.loop_hole_tees      to authenticated;
grant select                 on public.course_combinations to authenticated;
grant select                 on public.combination_tees    to authenticated;
grant select, insert, update on public.events          to authenticated;
grant select, insert         on public.event_players   to authenticated;
grant select, insert, update on public.scorecards      to authenticated;
grant select, insert, update on public.hole_scores     to authenticated;
grant select, insert, update on public.contest_entries to authenticated;

-- anon: public read (matches "readable by anyone" SELECT policies)
grant select on public.courses             to anon;
grant select on public.course_holes        to anon;
grant select on public.course_tees         to anon;
grant select on public.loops               to anon;
grant select on public.loop_holes          to anon;
grant select on public.loop_hole_tees      to anon;
grant select on public.course_combinations to anon;
grant select on public.combination_tees    to anon;
grant select on public.events              to anon;
grant select on public.event_players       to anon;
grant select on public.scorecards          to anon;
grant select on public.hole_scores         to anon;
grant select on public.contest_entries     to anon;
