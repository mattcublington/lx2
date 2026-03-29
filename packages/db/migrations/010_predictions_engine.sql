-- ═══════════════════════════════════════════════════════════════════════════════
-- 010: Predictions engine tables
-- Virtual currency betting on golf events
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Events predictions config ────────────────────────────────────────────────
CREATE TABLE prediction_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  starting_credits INTEGER NOT NULL DEFAULT 1000,
  max_bet_pct INTEGER NOT NULL DEFAULT 20,
  overround_pct INTEGER NOT NULL DEFAULT 115,
  h2h_overround_pct INTEGER NOT NULL DEFAULT 108,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id)
);

-- ── Player bankrolls ─────────────────────────────────────────────────────────
CREATE TABLE prediction_bankrolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits INTEGER NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- ── Markets ──────────────────────────────────────────────────────────────────
CREATE TYPE prediction_market_type AS ENUM (
  'outright', 'head_to_head', 'top_3', 'over_under', 'group_winner', 'last_place'
);
CREATE TYPE prediction_market_status AS ENUM ('open', 'suspended', 'closed', 'settled');

CREATE TABLE prediction_markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  market_type prediction_market_type NOT NULL,
  status prediction_market_status NOT NULL DEFAULT 'open',
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at TIMESTAMPTZ
);
CREATE INDEX idx_prediction_markets_event ON prediction_markets(event_id);

-- ── Selections ───────────────────────────────────────────────────────────────
CREATE TABLE prediction_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES prediction_markets(id) ON DELETE CASCADE,
  event_player_id UUID REFERENCES event_players(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  odds_numerator INTEGER NOT NULL,
  odds_denominator INTEGER NOT NULL DEFAULT 1,
  is_winner BOOLEAN,
  dead_heat_divisor INTEGER DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_prediction_selections_market ON prediction_selections(market_id);

-- ── Bets ─────────────────────────────────────────────────────────────────────
CREATE TYPE prediction_bet_status AS ENUM ('placed', 'won', 'lost', 'void');

CREATE TABLE prediction_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES prediction_markets(id) ON DELETE CASCADE,
  selection_id UUID NOT NULL REFERENCES prediction_selections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  stake INTEGER NOT NULL,
  odds_numerator INTEGER NOT NULL,
  odds_denominator INTEGER NOT NULL DEFAULT 1,
  potential_payout INTEGER NOT NULL,
  status prediction_bet_status NOT NULL DEFAULT 'placed',
  payout INTEGER DEFAULT 0,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at TIMESTAMPTZ
);
CREATE INDEX idx_prediction_bets_user ON prediction_bets(user_id, event_id);
CREATE INDEX idx_prediction_bets_market ON prediction_bets(market_id);
CREATE INDEX idx_prediction_bets_selection ON prediction_bets(selection_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE prediction_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_bankrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY prediction_configs_read ON prediction_configs FOR SELECT USING (true);
CREATE POLICY prediction_configs_write ON prediction_configs FOR ALL
  USING (event_id IN (SELECT id FROM events WHERE created_by = auth.uid()));

CREATE POLICY bankrolls_read_own ON prediction_bankrolls FOR SELECT USING (user_id = auth.uid());
CREATE POLICY bankrolls_insert ON prediction_bankrolls FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY bankrolls_update_own ON prediction_bankrolls FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY markets_read ON prediction_markets FOR SELECT USING (true);
CREATE POLICY selections_read ON prediction_selections FOR SELECT USING (true);
CREATE POLICY markets_write ON prediction_markets FOR ALL
  USING (event_id IN (SELECT id FROM events WHERE created_by = auth.uid()));
CREATE POLICY selections_write ON prediction_selections FOR ALL
  USING (market_id IN (
    SELECT id FROM prediction_markets WHERE event_id IN (
      SELECT id FROM events WHERE created_by = auth.uid()
    )
  ));

CREATE POLICY bets_read_own ON prediction_bets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY bets_insert ON prediction_bets FOR INSERT WITH CHECK (user_id = auth.uid());

-- ── Realtime ─────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE prediction_markets;
ALTER PUBLICATION supabase_realtime ADD TABLE prediction_selections;
ALTER PUBLICATION supabase_realtime ADD TABLE prediction_bankrolls;
