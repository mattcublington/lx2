-- tee_slots — generated inventory; one row per slot per date per loop
create table if not exists tee_slots (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid not null references clubs(id) on delete cascade,
  loop_id      uuid not null references course_loops(id) on delete cascade,
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

alter table tee_slots enable row level security;

create policy "tee_slots_staff" on tee_slots
  for all using (is_club_staff(club_id));

-- Authenticated users can read available slots (for golfer booking UI in Phase 2)
create policy "tee_slots_public_read" on tee_slots
  for select using (
    slot_type in ('member', 'visitor')
    and booked_count < capacity
  );
