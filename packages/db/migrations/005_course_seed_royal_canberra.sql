-- ================================================================
-- Migration: 005_course_seed_royal_canberra.sql
-- Purpose:   Seed Royal Canberra Golf Club into the generic
--            courses / course_holes / course_tees tables so that
--            scoring and handicap lookups work from the DB for
--            non-Cumberwell courses.
--
--            Also adds a `metres` column to course_tees for
--            metric distance storage (used by the distance_unit
--            profile preference).
--
--            Cumberwell-specific loops / combinations tables are
--            unchanged — they remain the source of truth for the
--            Cumberwell tee sheet.
-- ================================================================

-- ================================================================
-- SCHEMA: add metres column to course_tees
-- ================================================================
ALTER TABLE public.course_tees
  ADD COLUMN IF NOT EXISTS metres smallint[];

-- ================================================================
-- SEED: Royal Canberra Golf Club — Westbourne Course (A + B)
-- ================================================================
DO $$
DECLARE
  v_course_id uuid;
BEGIN

-- ── Westbourne ─────────────────────────────────────────────────
INSERT INTO public.courses (id, name, club, location, holes_count, slope_rating, course_rating, par, source, verified)
VALUES (
  '11111111-0001-0000-0000-000000000001',
  'Royal Canberra — Westbourne',
  'Royal Canberra Golf Club',
  'Yarralumla, ACT',
  18, 121, 71.6, 72, 'manual', true
)
ON CONFLICT (name) DO UPDATE SET
  slope_rating  = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  par           = EXCLUDED.par,
  verified      = true;

SELECT id INTO v_course_id FROM public.courses WHERE name = 'Royal Canberra — Westbourne';

-- holes
INSERT INTO public.course_holes (course_id, hole_number, par, stroke_index) VALUES
  (v_course_id,  1, 5, 11),
  (v_course_id,  2, 4,  7),
  (v_course_id,  3, 3,  5),
  (v_course_id,  4, 4, 13),
  (v_course_id,  5, 4,  9),
  (v_course_id,  6, 5,  1),
  (v_course_id,  7, 4, 15),
  (v_course_id,  8, 3, 17),
  (v_course_id,  9, 4,  3),
  (v_course_id, 10, 4,  8),
  (v_course_id, 11, 4, 16),
  (v_course_id, 12, 4,  2),
  (v_course_id, 13, 3, 12),
  (v_course_id, 14, 4,  4),
  (v_course_id, 15, 5, 18),
  (v_course_id, 16, 4,  6),
  (v_course_id, 17, 3, 14),
  (v_course_id, 18, 5, 10)
ON CONFLICT (course_id, hole_number) DO UPDATE SET
  par          = EXCLUDED.par,
  stroke_index = EXCLUDED.stroke_index;

-- tees: White (default)
INSERT INTO public.course_tees (course_id, tee_name, yardages, metres, total_yards, slope_rating, course_rating)
VALUES (
  v_course_id, 'White',
  ARRAY[492,343,186,460,338,422,280,138,375,366,341,370,170,380,428,387,166,485]::smallint[],
  ARRAY[506,355,200,425,364,489,289,149,392,371,352,358,173,399,449,410,217,502]::smallint[],
  6157, 121, 71.6
)
ON CONFLICT (course_id, tee_name) DO UPDATE SET
  yardages     = EXCLUDED.yardages,
  metres       = EXCLUDED.metres,
  total_yards  = EXCLUDED.total_yards,
  slope_rating = EXCLUDED.slope_rating,
  course_rating= EXCLUDED.course_rating;

-- tees: Blue
INSERT INTO public.course_tees (course_id, tee_name, yardages, metres, total_yards, slope_rating, course_rating)
VALUES (
  v_course_id, 'Blue',
  ARRAY[492,343,186,460,338,422,280,138,375,366,341,370,170,380,428,387,166,485]::smallint[],
  NULL,
  6157, 123, 73.1
)
ON CONFLICT (course_id, tee_name) DO UPDATE SET
  slope_rating = EXCLUDED.slope_rating,
  course_rating= EXCLUDED.course_rating;


-- ── Yarralumla ─────────────────────────────────────────────────
INSERT INTO public.courses (id, name, club, location, holes_count, slope_rating, course_rating, par, source, verified)
VALUES (
  '11111111-0002-0000-0000-000000000001',
  'Royal Canberra — Yarralumla',
  'Royal Canberra Golf Club',
  'Yarralumla, ACT',
  18, 127, 71.8, 72, 'manual', true
)
ON CONFLICT (name) DO UPDATE SET
  slope_rating  = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  par           = EXCLUDED.par,
  verified      = true;

SELECT id INTO v_course_id FROM public.courses WHERE name = 'Royal Canberra — Yarralumla';

-- holes (B loop front 9: SI missing = 0; C loop back 9)
INSERT INTO public.course_holes (course_id, hole_number, par, stroke_index) VALUES
  (v_course_id,  1, 4,  0),
  (v_course_id,  2, 4,  0),
  (v_course_id,  3, 4,  0),
  (v_course_id,  4, 3,  0),
  (v_course_id,  5, 4,  0),
  (v_course_id,  6, 5,  0),
  (v_course_id,  7, 4,  0),
  (v_course_id,  8, 3,  0),
  (v_course_id,  9, 5,  0),
  (v_course_id, 10, 4,  7),
  (v_course_id, 11, 3, 15),
  (v_course_id, 12, 4, 17),
  (v_course_id, 13, 4,  3),
  (v_course_id, 14, 4,  1),
  (v_course_id, 15, 5, 11),
  (v_course_id, 16, 4,  5),
  (v_course_id, 17, 3, 13),
  (v_course_id, 18, 5,  9)
ON CONFLICT (course_id, hole_number) DO UPDATE SET
  par          = EXCLUDED.par,
  stroke_index = EXCLUDED.stroke_index;

-- tees: White
INSERT INTO public.course_tees (course_id, tee_name, yardages, metres, total_yards, slope_rating, course_rating)
VALUES (
  v_course_id, 'White',
  ARRAY[366,341,370,170,380,428,387,166,485,361,145,273,338,381,477,321,152,465]::smallint[],
  ARRAY[371,352,358,173,399,449,410,217,502,380,168,284,362,405,506,361,162,480]::smallint[],
  6207, 127, 71.8
)
ON CONFLICT (course_id, tee_name) DO UPDATE SET
  yardages     = EXCLUDED.yardages,
  metres       = EXCLUDED.metres,
  total_yards  = EXCLUDED.total_yards,
  slope_rating = EXCLUDED.slope_rating,
  course_rating= EXCLUDED.course_rating;

-- tees: Blue
INSERT INTO public.course_tees (course_id, tee_name, yardages, metres, total_yards, slope_rating, course_rating)
VALUES (
  v_course_id, 'Blue',
  ARRAY[366,341,370,170,380,428,387,166,485,361,145,273,338,381,477,321,152,465]::smallint[],
  NULL,
  6207, 131, 73.6
)
ON CONFLICT (course_id, tee_name) DO UPDATE SET
  slope_rating = EXCLUDED.slope_rating,
  course_rating= EXCLUDED.course_rating;


-- ── Brindabella ────────────────────────────────────────────────
INSERT INTO public.courses (id, name, club, location, holes_count, slope_rating, course_rating, par, source, verified)
VALUES (
  '11111111-0003-0000-0000-000000000001',
  'Royal Canberra — Brindabella',
  'Royal Canberra Golf Club',
  'Yarralumla, ACT',
  18, 127, 71.0, 72, 'manual', true
)
ON CONFLICT (name) DO UPDATE SET
  slope_rating  = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating,
  par           = EXCLUDED.par,
  verified      = true;

SELECT id INTO v_course_id FROM public.courses WHERE name = 'Royal Canberra — Brindabella';

-- holes (C loop front 9; A loop back 9 with Brindabella SI)
INSERT INTO public.course_holes (course_id, hole_number, par, stroke_index) VALUES
  (v_course_id,  1, 4,  5),
  (v_course_id,  2, 3, 15),
  (v_course_id,  3, 4, 17),
  (v_course_id,  4, 4,  3),
  (v_course_id,  5, 4,  1),
  (v_course_id,  6, 5, 11),
  (v_course_id,  7, 4,  7),
  (v_course_id,  8, 3, 13),
  (v_course_id,  9, 5,  9),
  (v_course_id, 10, 5, 12),
  (v_course_id, 11, 4, 10),
  (v_course_id, 12, 3,  8),
  (v_course_id, 13, 4, 14),
  (v_course_id, 14, 4,  6),
  (v_course_id, 15, 5,  2),
  (v_course_id, 16, 4, 18),
  (v_course_id, 17, 3, 16),
  (v_course_id, 18, 4,  4)
ON CONFLICT (course_id, hole_number) DO UPDATE SET
  par          = EXCLUDED.par,
  stroke_index = EXCLUDED.stroke_index;

-- tees: White
INSERT INTO public.course_tees (course_id, tee_name, yardages, metres, total_yards, slope_rating, course_rating)
VALUES (
  v_course_id, 'White',
  ARRAY[361,145,273,338,381,477,321,152,465,492,343,186,460,338,422,280,138,375]::smallint[],
  ARRAY[380,168,284,362,405,506,361,162,480,506,355,200,425,364,489,289,149,392]::smallint[],
  5947, 127, 71.0
)
ON CONFLICT (course_id, tee_name) DO UPDATE SET
  yardages     = EXCLUDED.yardages,
  metres       = EXCLUDED.metres,
  total_yards  = EXCLUDED.total_yards,
  slope_rating = EXCLUDED.slope_rating,
  course_rating= EXCLUDED.course_rating;

-- tees: Blue
INSERT INTO public.course_tees (course_id, tee_name, yardages, metres, total_yards, slope_rating, course_rating)
VALUES (
  v_course_id, 'Blue',
  ARRAY[361,145,273,338,381,477,321,152,465,492,343,186,460,338,422,280,138,375]::smallint[],
  NULL,
  5947, 131, 72.9
)
ON CONFLICT (course_id, tee_name) DO UPDATE SET
  slope_rating = EXCLUDED.slope_rating,
  course_rating= EXCLUDED.course_rating;

END $$;
