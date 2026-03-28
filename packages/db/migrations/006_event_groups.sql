-- event_groups: one row per group/flight within an event
-- Allows organisers to set tee times, start holes, and assign players to groups.
-- Players are linked via event_players.flight_number (smallint, nullable).

CREATE TABLE IF NOT EXISTS event_groups (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  flight_number smallint    NOT NULL,          -- 1-based; matches event_players.flight_number
  tee_time      time,                          -- local tee time, e.g. 08:30
  start_hole    smallint    NOT NULL DEFAULT 1,
  label         text,                          -- e.g. "Group 1" or "Morning wave"
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, flight_number)
);

ALTER TABLE event_groups ENABLE ROW LEVEL SECURITY;

-- Anyone who can see the event can see its groups
CREATE POLICY "event_groups_select" ON event_groups
  FOR SELECT USING (true);

-- Only the event organiser can create groups
CREATE POLICY "event_groups_insert" ON event_groups
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid())
  );

-- Only the event organiser can update groups
CREATE POLICY "event_groups_update" ON event_groups
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid())
  );

-- Only the event organiser can delete groups
CREATE POLICY "event_groups_delete" ON event_groups
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM events WHERE id = event_id AND created_by = auth.uid())
  );
