-- course_loops — the bookable loops at a club (Cumberwell has 5 x 9-hole loops)
create table if not exists course_loops (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references clubs(id) on delete cascade,
  name        text not null,
  holes       smallint not null default 9,
  par         smallint,
  colour_hex  text,
  sort_order  smallint not null default 0,
  created_at  timestamptz not null default now()
);

alter table course_loops enable row level security;

create policy "course_loops_public_read" on course_loops
  for select using (true);

create policy "course_loops_staff_write" on course_loops
  for all using (is_club_staff(club_id));
