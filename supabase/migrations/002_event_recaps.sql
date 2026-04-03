-- Post-round storytelling: store AI-generated recaps per event.
-- One recap per event (UNIQUE constraint), no regeneration.

CREATE TABLE event_recaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  commentary_group text NOT NULL,
  commentary_players jsonb NOT NULL DEFAULT '[]',
  banter_group text NOT NULL,
  banter_players jsonb NOT NULL DEFAULT '[]',
  stats_group text NOT NULL,
  stats_players jsonb NOT NULL DEFAULT '[]',
  config jsonb NOT NULL DEFAULT '{}',
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid REFERENCES auth.users(id),
  recap_slug text,
  UNIQUE(event_id)
);

ALTER TABLE event_recaps ENABLE ROW LEVEL SECURITY;

-- Organiser can create and read recaps
CREATE POLICY "Organiser can manage recaps" ON event_recaps
  FOR ALL USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_recaps.event_id AND events.created_by = auth.uid())
  );

-- Players in the event can read recaps
CREATE POLICY "Event players can read recaps" ON event_recaps
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM event_players WHERE event_players.event_id = event_recaps.event_id AND event_players.user_id = auth.uid())
  );

-- Index for slug lookups (public recap page)
CREATE INDEX idx_event_recaps_slug ON event_recaps(recap_slug) WHERE recap_slug IS NOT NULL;
