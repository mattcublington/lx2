-- LX2 initial schema
-- Run via Supabase dashboard > SQL editor, or `supabase db push`

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Users (extends Supabase auth.users) ─────────────────────────────────────
create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  display_name text,
  handicap_index numeric(4,1),
  created_at  timestamptz not null default now()
);

alter table public.users enable row level security;
create policy "Users can read own profile" on public.users for select using (auth.uid() = id);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);

-- ─── Courses ─────────────────────────────────────────────────────────────────
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
  created_at    timestamptz not null default now()
);

create table public.course_holes (
  id            uuid primary key default uuid_generate_v4(),
  course_id     uuid not null references public.courses(id) on delete cascade,
  hole_number   smallint not null,
  par           smallint not null,
  stroke_index  smallint not null,
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

-- Public read for courses (no auth needed to search)
alter table public.courses enable row level security;
create policy "Courses are publicly readable" on public.courses for select using (true);
alter table public.course_holes enable row level security;
create policy "Course holes are publicly readable" on public.course_holes for select using (true);
alter table public.course_tees enable row level security;
create policy "Course tees are publicly readable" on public.course_tees for select using (true);

-- ─── Events ──────────────────────────────────────────────────────────────────
create table public.events (
  id                    uuid primary key default uuid_generate_v4(),
  created_by            uuid not null references public.users(id),
  course_id             uuid not null references public.courses(id),
  tee_id                uuid references public.course_tees(id),
  name                  text not null,
  date                  date not null,
  format                text not null check (format in ('stableford', 'strokeplay', 'matchplay')),
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
create policy "Events readable by anyone" on public.events for select using (true);
create policy "Organisers can create events" on public.events for insert with check (auth.uid() = created_by);
create policy "Organisers can update own events" on public.events for update using (auth.uid() = created_by);

-- ─── Event players ───────────────────────────────────────────────────────────
create table public.event_players (
  id              uuid primary key default uuid_generate_v4(),
  event_id        uuid not null references public.events(id) on delete cascade,
  user_id         uuid references public.users(id),
  display_name    text not null,
  handicap_index  numeric(4,1) not null,
  rsvp_status     text not null default 'invited' check (rsvp_status in ('invited','confirmed','declined','waitlisted')),
  payment_status  text not null default 'unpaid' check (payment_status in ('unpaid','paid','refunded','waived')),
  flight_number   smallint,
  created_at      timestamptz not null default now()
);

alter table public.event_players enable row level security;
create policy "Event players readable by anyone" on public.event_players for select using (true);

-- ─── Scorecards & hole scores ────────────────────────────────────────────────
create table public.scorecards (
  id              uuid primary key default uuid_generate_v4(),
  event_id        uuid not null references public.events(id) on delete cascade,
  event_player_id uuid not null references public.event_players(id) on delete cascade,
  created_at      timestamptz not null default now(),
  submitted_at    timestamptz,
  unique(event_id, event_player_id)
);

alter table public.scorecards enable row level security;
create policy "Scorecards readable by anyone" on public.scorecards for select using (true);

create table public.hole_scores (
  id              uuid primary key default uuid_generate_v4(),
  scorecard_id    uuid not null references public.scorecards(id) on delete cascade,
  hole_number     smallint not null,
  gross_strokes   smallint,  -- null = pick-up
  created_at      timestamptz not null default now(),
  unique(scorecard_id, hole_number)
);

alter table public.hole_scores enable row level security;
create policy "Hole scores readable by anyone" on public.hole_scores for select using (true);

-- Enable realtime on live tables
alter publication supabase_realtime add table public.hole_scores;
alter publication supabase_realtime add table public.scorecards;

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
create policy "Contest entries readable by anyone" on public.contest_entries for select using (true);
