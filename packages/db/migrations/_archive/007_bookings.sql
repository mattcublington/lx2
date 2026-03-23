-- bookings — one row per booking (a golfer + optional guests on a tee slot)
create table if not exists bookings (
  id           uuid primary key default gen_random_uuid(),
  tee_slot_id  uuid not null references tee_slots(id) on delete restrict,
  user_id      uuid not null references auth.users(id) on delete restrict,
  guests       smallint not null default 0,
  status       text not null default 'confirmed'
               check (status in ('confirmed', 'cancelled', 'no_show')),
  payment_id   text,
  notes        text,
  created_at   timestamptz not null default now(),
  cancelled_at timestamptz
);

alter table bookings enable row level security;

create policy "bookings_staff_read" on bookings
  for select using (
    exists (
      select 1 from tee_slots ts
      where ts.id = bookings.tee_slot_id
        and is_club_staff(ts.club_id)
    )
  );

create policy "bookings_staff_update" on bookings
  for update using (
    exists (
      select 1 from tee_slots ts
      where ts.id = bookings.tee_slot_id
        and is_club_staff(ts.club_id)
    )
  );

create policy "bookings_own_read" on bookings
  for select using (auth.uid() = user_id);

create policy "bookings_own_insert" on bookings
  for insert with check (auth.uid() = user_id);

-- Users can only set status to 'cancelled' on their own bookings
create policy "bookings_own_cancel" on bookings
  for update using (auth.uid() = user_id)
  with check (status = 'cancelled');

-- Trigger: keep booked_count in sync (1 + guests = total players)
create or replace function update_tee_slot_booked_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' and NEW.status = 'confirmed' then
    update tee_slots set booked_count = booked_count + 1 + NEW.guests
    where id = NEW.tee_slot_id;
  elsif TG_OP = 'UPDATE' and OLD.status = 'confirmed' and NEW.status = 'cancelled' then
    update tee_slots set booked_count = booked_count - 1 - OLD.guests
    where id = NEW.tee_slot_id;
  end if;
  return NEW;
end;
$$;

create trigger bookings_count_trigger
  after insert or update on bookings
  for each row execute function update_tee_slot_booked_count();
