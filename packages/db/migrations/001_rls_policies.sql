-- ================================================================
-- Migration: 001_rls_policies.sql
-- Applied: 2026-03-23
--
-- Replaces broad "readable by anyone" policies with properly
-- scoped policies on all core event/scoring tables.
--
-- Tables NOT touched (already have correct policies):
--   clubs, club_user_roles, club_members, tee_sheet_rules,
--   tee_slots, bookings, club_competitions, course_loops
--
-- Reference data (SELECT true, no write policies needed):
--   loops, loop_holes, loop_hole_tees,
--   course_combinations, combination_tees
-- ================================================================


-- ================================================================
-- USERS — own-row only; search via SECURITY DEFINER function
-- ================================================================
DROP POLICY IF EXISTS "Authenticated users can search other users" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Own row only (profile page, play page, new round page)
CREATE POLICY "users_own_select" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Own row update only (profile action)
CREATE POLICY "users_own_update" ON users
  FOR UPDATE TO authenticated
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- No INSERT policy: upserts happen server-side via service_role
-- in auth/callback/route.ts and play/new/actions.ts

-- SECURITY DEFINER function: exposes only id, display_name, handicap_index
-- for player search. Runs as function owner (bypasses RLS on users)
-- but enforces auth check and column restriction internally.
CREATE OR REPLACE FUNCTION search_user_profiles(search_query text)
RETURNS TABLE (id uuid, display_name text, handicap_index numeric)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.display_name, u.handicap_index
  FROM users u
  WHERE u.display_name ILIKE '%' || search_query || '%'
    AND u.id != auth.uid()
    AND auth.uid() IS NOT NULL
  ORDER BY u.display_name
  LIMIT 8;
$$;

REVOKE ALL ON FUNCTION search_user_profiles(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION search_user_profiles(text) TO authenticated;


-- ================================================================
-- EVENTS
-- Authenticated users only. is_public=true events visible to any
-- logged-in user; is_public=false events visible to organiser and
-- linked participants only.
-- ================================================================
DROP POLICY IF EXISTS "Events readable by anyone" ON events;
DROP POLICY IF EXISTS "Organisers can create events" ON events;
DROP POLICY IF EXISTS "Organisers can update own events" ON events;

CREATE POLICY "events_select" ON events
  FOR SELECT TO authenticated
  USING (
    is_public = true
    OR auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM event_players ep
      WHERE ep.event_id = events.id
        AND ep.user_id = auth.uid()
    )
  );

CREATE POLICY "events_insert" ON events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "events_update" ON events
  FOR UPDATE TO authenticated
  USING  (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);


-- ================================================================
-- EVENT_PLAYERS
-- Organiser: sees all players including anonymous (user_id IS NULL).
-- Linked player: sees only other linked (non-anonymous) players
--   in the same event.
-- ================================================================
DROP POLICY IF EXISTS "Event players readable by anyone" ON event_players;
DROP POLICY IF EXISTS "Organisers can add event players" ON event_players;

CREATE POLICY "event_players_select" ON event_players
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_players.event_id
        AND e.created_by = auth.uid()
    )
    OR (
      event_players.user_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM event_players ep2
        WHERE ep2.event_id = event_players.event_id
          AND ep2.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "event_players_insert" ON event_players
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_players.event_id
        AND e.created_by = auth.uid()
    )
  );

CREATE POLICY "event_players_update" ON event_players
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_players.event_id
        AND e.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_players.event_id
        AND e.created_by = auth.uid()
    )
  );

CREATE POLICY "event_players_delete" ON event_players
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_players.event_id
        AND e.created_by = auth.uid()
    )
  );


-- ================================================================
-- SCORECARDS
-- Visible to: organiser, or any linked participant in the event.
-- ================================================================
DROP POLICY IF EXISTS "Scorecards readable by anyone" ON scorecards;
DROP POLICY IF EXISTS "Organisers can create scorecards" ON scorecards;

CREATE POLICY "scorecards_select" ON scorecards
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = scorecards.event_id
        AND e.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM event_players ep
      WHERE ep.event_id = scorecards.event_id
        AND ep.user_id = auth.uid()
    )
  );

CREATE POLICY "scorecards_insert" ON scorecards
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = scorecards.event_id
        AND e.created_by = auth.uid()
    )
  );

CREATE POLICY "scorecards_update" ON scorecards
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = scorecards.event_id
        AND e.created_by = auth.uid()
    )
  );


-- ================================================================
-- HOLE_SCORES
-- Read: organiser or any linked participant in the event.
-- Write (insert/update): linked player for own scorecard,
--   OR organiser for any scorecard in their event (marker mode).
-- Anonymous player scoring goes through server actions using
-- service_role — direct anon-key writes are NOT permitted.
-- ================================================================
DROP POLICY IF EXISTS "Hole scores readable by anyone" ON hole_scores;
DROP POLICY IF EXISTS "Organisers can insert hole scores for their event" ON hole_scores;
DROP POLICY IF EXISTS "Organisers can update hole scores for their event" ON hole_scores;
DROP POLICY IF EXISTS "Players can insert own hole scores" ON hole_scores;
DROP POLICY IF EXISTS "Players can update own hole scores" ON hole_scores;

CREATE POLICY "hole_scores_select" ON hole_scores
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM scorecards sc
      JOIN events e ON e.id = sc.event_id
      WHERE sc.id = hole_scores.scorecard_id
        AND (
          e.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM event_players ep
            WHERE ep.event_id = e.id
              AND ep.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "hole_scores_insert_player" ON hole_scores
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM scorecards sc
      JOIN event_players ep ON ep.id = sc.event_player_id
      WHERE sc.id = hole_scores.scorecard_id
        AND ep.user_id = auth.uid()
    )
  );

CREATE POLICY "hole_scores_insert_organiser" ON hole_scores
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM scorecards sc
      JOIN events e ON e.id = sc.event_id
      WHERE sc.id = hole_scores.scorecard_id
        AND e.created_by = auth.uid()
    )
  );

CREATE POLICY "hole_scores_update_player" ON hole_scores
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM scorecards sc
      JOIN event_players ep ON ep.id = sc.event_player_id
      WHERE sc.id = hole_scores.scorecard_id
        AND ep.user_id = auth.uid()
    )
  );

CREATE POLICY "hole_scores_update_organiser" ON hole_scores
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM scorecards sc
      JOIN events e ON e.id = sc.event_id
      WHERE sc.id = hole_scores.scorecard_id
        AND e.created_by = auth.uid()
    )
  );


-- ================================================================
-- COURSES / COURSE_HOLES / COURSE_TEES
-- Reference data. Players request additions via a support ticket.
-- Writes restricted to service_role (server-side admin actions only).
-- ================================================================
DROP POLICY IF EXISTS "Authenticated users can insert courses" ON courses;

CREATE POLICY "courses_service_write" ON courses
  FOR ALL
  USING  (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "course_holes_service_write" ON course_holes
  FOR ALL
  USING  (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "course_tees_service_write" ON course_tees
  FOR ALL
  USING  (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ================================================================
-- CONTEST_ENTRIES (NTP / LD)
-- Visible to organiser or linked participants. Write by organiser only.
-- ================================================================
DROP POLICY IF EXISTS "Contest entries readable by anyone" ON contest_entries;

CREATE POLICY "contest_entries_select" ON contest_entries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = contest_entries.event_id
        AND e.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM event_players ep
      WHERE ep.event_id = contest_entries.event_id
        AND ep.user_id = auth.uid()
    )
  );

CREATE POLICY "contest_entries_insert" ON contest_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = contest_entries.event_id
        AND e.created_by = auth.uid()
    )
  );

CREATE POLICY "contest_entries_update" ON contest_entries
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = contest_entries.event_id
        AND e.created_by = auth.uid()
    )
  );
