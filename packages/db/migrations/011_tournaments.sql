-- ═══════════════════════════════════════════════════════════════════════════════
-- 011: Multi-round tournaments + Order of Merit
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Tournaments table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tournaments (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by  uuid        NOT NULL REFERENCES public.users(id),
  name        text        NOT NULL,
  description text,
  format      text        NOT NULL CHECK (format IN ('stableford', 'strokeplay')),
  status      text        NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'completed')),
  finalised   boolean     NOT NULL DEFAULT false,
  dns_policy  text        NOT NULL DEFAULT 'exclude' CHECK (dns_policy IN ('exclude', 'penalty')),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournaments_select" ON tournaments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "tournaments_insert" ON tournaments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "tournaments_update" ON tournaments
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "tournaments_delete" ON tournaments
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- ── Add tournament columns to events ────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'tournament_id'
  ) THEN
    ALTER TABLE events ADD COLUMN tournament_id uuid REFERENCES tournaments(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'round_number'
  ) THEN
    ALTER TABLE events ADD COLUMN round_number smallint;
  END IF;
END $$;

-- Both set or both null
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_tournament_round_check;
ALTER TABLE events ADD CONSTRAINT events_tournament_round_check
  CHECK ((tournament_id IS NULL) = (round_number IS NULL));

-- No duplicate round numbers within a tournament
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'events_tournament_round_unique'
  ) THEN
    CREATE UNIQUE INDEX events_tournament_round_unique ON events(tournament_id, round_number)
      WHERE tournament_id IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_events_tournament ON events(tournament_id) WHERE tournament_id IS NOT NULL;

-- ── Order of Merits table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_of_merits (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by            uuid        NOT NULL REFERENCES public.users(id),
  name                  text        NOT NULL,
  season_year           smallint    NOT NULL,
  best_of               smallint,
  points_template       jsonb       NOT NULL,
  participation_points  smallint    NOT NULL DEFAULT 0,
  status                text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE order_of_merits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_of_merits_select" ON order_of_merits
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "order_of_merits_insert" ON order_of_merits
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "order_of_merits_update" ON order_of_merits
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "order_of_merits_delete" ON order_of_merits
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- ── Order of Merit Entries ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_of_merit_entries (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  merit_id          uuid        NOT NULL REFERENCES order_of_merits(id) ON DELETE CASCADE,
  event_id          uuid        REFERENCES events(id) ON DELETE CASCADE,
  tournament_id     uuid        REFERENCES tournaments(id) ON DELETE CASCADE,
  points_multiplier numeric(3,2) NOT NULL DEFAULT 1.00,
  added_at          timestamptz NOT NULL DEFAULT now(),
  CHECK ((event_id IS NULL) != (tournament_id IS NULL))
);

ALTER TABLE order_of_merit_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "oom_entries_select" ON order_of_merit_entries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "oom_entries_insert" ON order_of_merit_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM order_of_merits WHERE id = merit_id AND created_by = auth.uid())
  );

CREATE POLICY "oom_entries_update" ON order_of_merit_entries
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM order_of_merits WHERE id = merit_id AND created_by = auth.uid())
  );

CREATE POLICY "oom_entries_delete" ON order_of_merit_entries
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM order_of_merits WHERE id = merit_id AND created_by = auth.uid())
  );

-- Unique constraints: no duplicate entries per merit
CREATE UNIQUE INDEX IF NOT EXISTS oom_entries_merit_event_unique
  ON order_of_merit_entries(merit_id, event_id) WHERE event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS oom_entries_merit_tournament_unique
  ON order_of_merit_entries(merit_id, tournament_id) WHERE tournament_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_oom_entries_merit ON order_of_merit_entries(merit_id);

-- ── updated_at trigger ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION lx2_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tournaments_updated_at ON tournaments;
CREATE TRIGGER tournaments_updated_at
  BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION lx2_update_updated_at();

DROP TRIGGER IF EXISTS order_of_merits_updated_at ON order_of_merits;
CREATE TRIGGER order_of_merits_updated_at
  BEFORE UPDATE ON order_of_merits
  FOR EACH ROW EXECUTE FUNCTION lx2_update_updated_at();

-- ── Realtime ────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE order_of_merits;
ALTER PUBLICATION supabase_realtime ADD TABLE order_of_merit_entries;
