-- ================================================================
-- Migration: 003_users_avatar_url.sql
-- Applied: 2026-03-25
--
-- Adds avatar_url column to users table. This column existed in the
-- live lx2-dev database but was missing from migrations — added here
-- to keep schema reproducible from migrations alone.
-- ================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url text;
