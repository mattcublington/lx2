-- Extended hole stats: additional columns for detailed per-hole statistics.
-- All nullable — existing scoring flows continue unchanged.
-- Stats can be entered manually or via voice input.

ALTER TABLE hole_scores
  ADD COLUMN IF NOT EXISTS bunker_shots smallint,       -- number of bunker shots on this hole
  ADD COLUMN IF NOT EXISTS penalties smallint,           -- number of penalty strokes
  ADD COLUMN IF NOT EXISTS up_and_down boolean,          -- saved par (or better) from off the green
  ADD COLUMN IF NOT EXISTS sand_save boolean;            -- saved par (or better) from a bunker
