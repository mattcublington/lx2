create table if not exists club_competitions (
  id               uuid primary key default gen_random_uuid(),
  club_id          uuid not null references clubs(id) on delete cascade,
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

alter table club_competitions enable row level security;

create policy "club_competitions_staff" on club_competitions
  for all using (is_club_staff(club_id));

-- Public read for golfer app (Phase 2 — golfer competition entry)
create policy "club_competitions_public_read" on club_competitions
  for select using (status in ('entries_open', 'completed'));
