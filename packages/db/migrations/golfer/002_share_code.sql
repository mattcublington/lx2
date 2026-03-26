-- ─────────────────────────────────────────────────────────────────────────────
-- golfer/002_share_code.sql
--
-- Adds a short human-readable share code to events so players can link
-- their group to an existing round (multiplayer group joining feature).
--
-- share_code: 6-char uppercase alphanumeric (e.g. "AB3K7M"), generated
-- server-side when the event is created. Indexed for fast lookup.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.events
  add column if not exists share_code text unique;

create index if not exists events_share_code_idx
  on public.events (share_code)
  where share_code is not null;
