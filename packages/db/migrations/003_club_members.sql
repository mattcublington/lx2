-- club_members — member roster, importable from intelligentgolf CSV
create table if not exists club_members (
  id              uuid primary key default gen_random_uuid(),
  club_id         uuid not null references clubs(id) on delete cascade,
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
  linked_at       timestamptz,
  created_at      timestamptz not null default now(),
  unique (club_id, email)
);

alter table club_members enable row level security;

create policy "club_members_staff_read" on club_members
  for select using (is_club_staff(club_id));

create policy "club_members_staff_write" on club_members
  for all using (is_club_staff(club_id));

create policy "club_members_own_read" on club_members
  for select using (auth.uid() = user_id);
