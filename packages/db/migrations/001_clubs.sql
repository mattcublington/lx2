-- clubs
create table if not exists clubs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  address     text,
  logo_url    text,
  created_at  timestamptz not null default now()
);

alter table clubs enable row level security;

-- Anyone can read club info (name, logo) — needed for lx2.golf golfer app
create policy "clubs_public_read" on clubs
  for select using (true);

-- Only service role can insert/update clubs
create policy "clubs_service_write" on clubs
  for all using (auth.role() = 'service_role');
