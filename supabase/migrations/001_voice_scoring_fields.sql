-- Voice scoring: add rich detail columns to hole_scores
-- These are all nullable — existing tap-based scoring continues to work unchanged.
-- Only the marker's own holes will populate putts/fairway/GIR via voice input.

ALTER TABLE hole_scores
  ADD COLUMN IF NOT EXISTS putts smallint,
  ADD COLUMN IF NOT EXISTS fairway_hit boolean,
  ADD COLUMN IF NOT EXISTS green_in_regulation boolean,
  ADD COLUMN IF NOT EXISTS miss_direction text,        -- 'left', 'right', 'short', 'long'
  ADD COLUMN IF NOT EXISTS input_method text DEFAULT 'manual',  -- 'manual' | 'voice'
  ADD COLUMN IF NOT EXISTS voice_transcript text;       -- raw transcript for debugging
