-- ================================================================
-- Migration: 016_fancourt_schema.sql
-- Purpose:   Schema additions required for Fancourt course data:
--            1. gender on course_tees (men/ladies sharing physical
--               tees with different CR/SR)
--            2. distance_unit on courses (metres vs yards)
--            3. name on course_holes (hole names)
--            4. stroke_index_ladies on course_holes (The Links has
--               separate men's/ladies' stroke indices)
-- ================================================================

-- ── 1. gender on course_tees ───────────────────────────────────
ALTER TABLE public.course_tees
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'men'
  CHECK (gender IN ('men', 'ladies'));

-- Replace unique index (course_id, tee_name) with (course_id, tee_name, gender)
DROP INDEX IF EXISTS public.course_tees_course_id_tee_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS course_tees_course_id_tee_name_gender_key
  ON public.course_tees (course_id, tee_name, gender);

-- ── 2. distance_unit on courses ────────────────────────────────
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS distance_unit text NOT NULL DEFAULT 'yards'
  CHECK (distance_unit IN ('yards', 'metres'));

-- ── 3. name on course_holes ────────────────────────────────────
ALTER TABLE public.course_holes
  ADD COLUMN IF NOT EXISTS name text;

-- ── 4. stroke_index_ladies on course_holes ─────────────────────
-- Nullable — falls back to stroke_index when NULL
ALTER TABLE public.course_holes
  ADD COLUMN IF NOT EXISTS stroke_index_ladies smallint;
