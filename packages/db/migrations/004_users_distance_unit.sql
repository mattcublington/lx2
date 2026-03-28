-- Migration: 004_users_distance_unit.sql
-- Adds distance_unit preference to users table.
-- Controls whether distances are shown in yards or metres throughout the app.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS distance_unit text NOT NULL DEFAULT 'yards'
    CONSTRAINT users_distance_unit_check CHECK (distance_unit IN ('yards', 'metres'));
