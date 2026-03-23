-- tee_sheet_rules — defines slot generation for each loop
create table if not exists tee_sheet_rules (
  id                    uuid primary key default gen_random_uuid(),
  club_id               uuid not null references clubs(id) on delete cascade,
  loop_id               uuid not null references course_loops(id) on delete cascade,
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

alter table tee_sheet_rules enable row level security;

create policy "tee_sheet_rules_staff" on tee_sheet_rules
  for all using (is_club_staff(club_id));
