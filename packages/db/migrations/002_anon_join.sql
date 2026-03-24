-- ================================================================
-- Migration: 002_anon_join.sql
-- Applied: 2026-03-24
--
-- Enables the anonymous / invite-link RSVP flow:
--
--  1. join_token — UUID stored on each event_player row so anonymous
--     (unauthenticated) players can be identified via a cookie rather
--     than a Supabase auth session.
--
--  2. Anon RLS policies — allow unauthenticated visitors (anon key)
--     to VIEW is_public events and their confirmed player list.
--     Writes still require service_role (existing pattern).
--
--  3. Realtime — set REPLICA IDENTITY FULL on event_players so that
--     Supabase Realtime can broadcast full row data on changes, and
--     ensure the table is in the supabase_realtime publication.
-- ================================================================


-- ================================================================
-- 1. ADD join_token TO event_players
-- ================================================================
ALTER TABLE public.event_players
  ADD COLUMN IF NOT EXISTS join_token uuid NOT NULL DEFAULT gen_random_uuid();

-- Unique index — used in WHERE ep_token_<id> cookie lookups
CREATE UNIQUE INDEX IF NOT EXISTS event_players_join_token_key
  ON public.event_players (join_token);


-- ================================================================
-- 2. ANON SELECT ON events (is_public only)
-- Allows unauthenticated visitors with the share link to view the
-- event landing page without logging in.
-- ================================================================
DROP POLICY IF EXISTS "events_anon_select" ON events;

CREATE POLICY "events_anon_select" ON events
  FOR SELECT TO anon
  USING (is_public = true);


-- ================================================================
-- 3. ANON SELECT ON event_players (confirmed players in public events)
-- Players confirm their names by joining; those names are public so
-- other invited players can see who is coming.
-- ================================================================
DROP POLICY IF EXISTS "event_players_anon_select" ON event_players;

CREATE POLICY "event_players_anon_select" ON event_players
  FOR SELECT TO anon
  USING (
    rsvp_status = 'confirmed'
    AND EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_players.event_id
        AND e.is_public = true
    )
  );


-- ================================================================
-- 4. REALTIME — event_players
-- REPLICA IDENTITY FULL ensures the full row is available in change
-- events (needed for proper RLS filtering on the old row in UPDATEs).
-- Only add to the publication if not already present.
-- ================================================================
ALTER TABLE public.event_players REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_publication_tables
    WHERE  pubname    = 'supabase_realtime'
      AND  schemaname = 'public'
      AND  tablename  = 'event_players'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.event_players;
  END IF;
END $$;
