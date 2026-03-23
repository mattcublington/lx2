-- ─────────────────────────────────────────────────────────────────────────────
-- club/001_club_schema.sql
--
-- Complete club platform schema: tables, RLS policies, helper functions,
-- triggers, grants.
-- Consolidates legacy: 001_clubs, 002_club_user_roles, 003_club_members,
--                      004_course_loops, 005_tee_sheet_rules, 006_tee_slots,
--                      007_bookings, 009_club_competitions.
--
-- Apply order: run before shared/001_integration.sql
-- Note: First club admin must be inserted via Supabase SQL Editor (bypasses RLS)
--       because club_user_roles policies require an existing admin row.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Clubs ───────────────────────────────────────────────────────────────────

create table public.clubs (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  address    text,
  logo_url   text,
  created_at timestamptz not null default now()
);

alter table public.clubs enable row level security;

-- Anyone can read club info (name, logo) — needed for golfer app
create policy "clubs_public_read"
  on public.clubs for select using (true);

-- Only service_role can create/update clubs (done via SQL editor or admin tool)
create policy "clubs_service_write"
  on public.clubs for all using (auth.role() = 'service_role');

-- ─── Club user roles (staff access control) ──────────────────────────────────

create table public.club_user_roles (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references public.clubs(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('admin', 'secretary', 'bar_staff', 'pro_shop')),
  created_at timestamptz not null default now(),
  unique (club_id, user_id, role)
);

alter table public.club_user_roles enable row level security;

-- A user can read their own roles
create policy "club_user_roles_own_read"
  on public.club_user_roles for select
  using (auth.uid() = user_id);

-- A club admin can read all roles for their club
create policy "club_user_roles_admin_read"
  on public.club_user_roles for select
  using (
    exists (
      select 1 from public.club_user_roles cur
      where cur.club_id = club_user_roles.club_id
        and cur.user_id = auth.uid()
        and cur.role = 'admin'
    )
  );

-- A club admin can add roles for their club
create policy "club_user_roles_admin_write"
  on public.club_user_roles for insert
  with check (
    exists (
      select 1 from public.club_user_roles cur
      where cur.club_id = club_user_roles.club_id
        and cur.user_id = auth.uid()
        and cur.role = 'admin'
    )
  );

-- Helper: is the current user a staff member of a given club?
create or replace function public.is_club_staff(p_club_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.club_user_roles
    where club_id = p_club_id and user_id = auth.uid()
  );
$$;

-- Helper: does the current user have a specific role?
create or replace function public.has_club_role(p_club_id uuid, p_role text)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.club_user_roles
    where club_id = p_club_id and user_id = auth.uid() and role = p_role
  );
$$;

-- ─── Club members ─────────────────────────────────────────────────────────────
-- Importable from intelligentgolf CSV. user_id is set when a member claims
-- their lx2.golf account (links club record to golfer app identity).

create table public.club_members (
  id              uuid primary key default gen_random_uuid(),
  club_id         uuid not null references public.clubs(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete set null,
  email           text not null,
  display_name    text not null,
  membership_type text not null default 'full'
                  check (membership_type in ('full', 'junior', 'senior', 'associate', 'visitor', 'five_day')),
  handicap_index  numeric(4,1),
  status          text not null default 'active'
                  check (status in ('active', 'suspended', 'lapsed')),
  cdh_number      text,
  imported_at     timestamptz,
  linked_at       timestamptz,  -- set when user_id is assigned
  created_at      timestamptz not null default now(),
  unique (club_id, email)
);

alter table public.club_members enable row level security;

create policy "club_members_staff_read"
  on public.club_members for select
  using (public.is_club_staff(club_id));

create policy "club_members_staff_write"
  on public.club_members for all
  using (public.is_club_staff(club_id));

-- Members can read their own record (e.g. to see membership type, status)
create policy "club_members_own_read"
  on public.club_members for select
  using (auth.uid() = user_id);

-- ─── Course loops (tee sheet booking units) ───────────────────────────────────
-- NOTE: distinct from public.loops in the golfer schema.
-- These are the bookable units for the tee sheet system.

create table public.course_loops (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references public.clubs(id) on delete cascade,
  name       text not null,
  holes      smallint not null default 9,
  par        smallint,
  colour_hex text,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

alter table public.course_loops enable row level security;

create policy "course_loops_public_read"
  on public.course_loops for select using (true);

create policy "course_loops_staff_write"
  on public.course_loops for all
  using (public.is_club_staff(club_id));

-- ─── Tee sheet rules ──────────────────────────────────────────────────────────

create table public.tee_sheet_rules (
  id                    uuid primary key default gen_random_uuid(),
  club_id               uuid not null references public.clubs(id) on delete cascade,
  loop_id               uuid not null references public.course_loops(id) on delete cascade,
  slot_interval_minutes smallint not null default 10,
  capacity_per_slot     smallint not null default 4,
  open_time             time not null default '07:00',
  close_time            time not null default '17:00',
  member_only_until     time,
  applies_weekdays      boolean not null default true,
  applies_weekends      boolean not null default true,
  valid_from            date not null default current_date,
  valid_to              date,
  created_at            timestamptz not null default now()
);

alter table public.tee_sheet_rules enable row level security;

create policy "tee_sheet_rules_staff"
  on public.tee_sheet_rules for all
  using (public.is_club_staff(club_id));

-- ─── Tee slots (generated inventory) ─────────────────────────────────────────

create table public.tee_slots (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid not null references public.clubs(id) on delete cascade,
  loop_id      uuid not null references public.course_loops(id) on delete cascade,
  slot_date    date not null,
  slot_time    time not null,
  capacity     smallint not null default 4,
  booked_count smallint not null default 0,
  slot_type    text not null default 'member'
               check (slot_type in ('member', 'visitor', 'society', 'blocked')),
  price_pence  integer not null default 0,
  created_at   timestamptz not null default now(),
  unique (loop_id, slot_date, slot_time)
);

alter table public.tee_slots enable row level security;

create policy "tee_slots_staff"
  on public.tee_slots for all
  using (public.is_club_staff(club_id));

-- Authenticated users can read available slots (for golfer booking UI)
create policy "tee_slots_public_read"
  on public.tee_slots for select
  using (
    slot_type in ('member', 'visitor')
    and booked_count < capacity
  );

-- ─── Bookings ─────────────────────────────────────────────────────────────────

create table public.bookings (
  id           uuid primary key default gen_random_uuid(),
  tee_slot_id  uuid not null references public.tee_slots(id) on delete restrict,
  user_id      uuid not null references auth.users(id) on delete restrict,
  guests       smallint not null default 0,
  status       text not null default 'confirmed'
               check (status in ('confirmed', 'cancelled', 'no_show')),
  payment_id   text,
  notes        text,
  created_at   timestamptz not null default now(),
  cancelled_at timestamptz
);

alter table public.bookings enable row level security;

create policy "bookings_staff_read"
  on public.bookings for select
  using (
    exists (
      select 1 from public.tee_slots ts
      where ts.id = bookings.tee_slot_id
        and public.is_club_staff(ts.club_id)
    )
  );

create policy "bookings_staff_update"
  on public.bookings for update
  using (
    exists (
      select 1 from public.tee_slots ts
      where ts.id = bookings.tee_slot_id
        and public.is_club_staff(ts.club_id)
    )
  );

create policy "bookings_own_read"
  on public.bookings for select
  using (auth.uid() = user_id);

create policy "bookings_own_insert"
  on public.bookings for insert
  with check (auth.uid() = user_id);

-- Users can only cancel their own bookings
create policy "bookings_own_cancel"
  on public.bookings for update
  using (auth.uid() = user_id)
  with check (status = 'cancelled');

-- Trigger: keep tee_slots.booked_count in sync
create or replace function public.update_tee_slot_booked_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' and NEW.status = 'confirmed' then
    update public.tee_slots
       set booked_count = booked_count + 1 + NEW.guests
     where id = NEW.tee_slot_id;
  elsif TG_OP = 'UPDATE' and OLD.status = 'confirmed' and NEW.status = 'cancelled' then
    update public.tee_slots
       set booked_count = booked_count - 1 - OLD.guests
     where id = NEW.tee_slot_id;
  end if;
  return NEW;
end;
$$;

create trigger bookings_count_trigger
  after insert or update on public.bookings
  for each row execute function public.update_tee_slot_booked_count();

-- ─── Club competitions ────────────────────────────────────────────────────────
-- event_id is set by shared/001_integration.sql — links to the golfer app
-- event so members can score against it on lx2.golf.

create table public.club_competitions (
  id               uuid primary key default gen_random_uuid(),
  club_id          uuid not null references public.clubs(id) on delete cascade,
  name             text not null,
  competition_date date not null,
  format           text not null default 'stableford'
                   check (format in ('stableford', 'strokeplay', 'matchplay', 'texas_scramble', 'pairs_betterball')),
  loop_ids         uuid[] not null default '{}',
  entry_fee_pence  integer not null default 0,
  max_entries      integer,
  entries_count    integer not null default 0,
  notes            text,
  status           text not null default 'scheduled'
                   check (status in ('scheduled', 'entries_open', 'closed', 'in_progress', 'completed', 'cancelled')),
  created_at       timestamptz not null default now()
);

alter table public.club_competitions enable row level security;

create policy "club_competitions_staff"
  on public.club_competitions for all
  using (public.is_club_staff(club_id));

-- Public read for golfer app — members can see open/completed competitions
create policy "club_competitions_public_read"
  on public.club_competitions for select
  using (status in ('entries_open', 'completed'));

-- ─── Grants ──────────────────────────────────────────────────────────────────

grant all on public.clubs              to service_role;
grant all on public.club_user_roles    to service_role;
grant all on public.club_members       to service_role;
grant all on public.course_loops       to service_role;
grant all on public.tee_sheet_rules    to service_role;
grant all on public.tee_slots          to service_role;
grant all on public.bookings           to service_role;
grant all on public.club_competitions  to service_role;

-- authenticated: staff read/write via RLS; members read own record + book slots
grant select        on public.clubs              to authenticated;
grant select        on public.club_user_roles    to authenticated;
grant select        on public.club_members       to authenticated;
grant select        on public.course_loops       to authenticated;
grant select        on public.tee_sheet_rules    to authenticated;
grant select        on public.tee_slots          to authenticated;
grant select, insert, update on public.bookings  to authenticated;
grant select        on public.club_competitions  to authenticated;

-- Staff write is controlled entirely by RLS (is_club_staff), not grants
grant insert, update, delete on public.club_user_roles   to authenticated;
grant insert, update, delete on public.club_members      to authenticated;
grant insert, update, delete on public.course_loops      to authenticated;
grant insert, update, delete on public.tee_sheet_rules   to authenticated;
grant insert, update, delete on public.tee_slots         to authenticated;
grant insert, update, delete on public.club_competitions to authenticated;

-- anon: public read only
grant select on public.clubs             to anon;
grant select on public.course_loops      to anon;
grant select on public.tee_slots         to anon;
grant select on public.club_competitions to anon;
