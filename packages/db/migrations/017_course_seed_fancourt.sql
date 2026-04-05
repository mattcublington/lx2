-- ================================================================
-- Migration: 017_course_seed_fancourt.sql
-- Purpose:   Seed Fancourt (George, Western Cape, South Africa)
--            into courses / course_holes / course_tees.
--
--            Four courses under one club:
--              1. Outeniqua (18 holes, par 72)
--              2. The Links (18 holes, par 73)
--              3. The Links Experience (9 holes, par 34)
--              4. The Links Experience (Par 3) (9 holes, par 27)
--
--            All scorecard distances are in metres.
--            yardages[] = converted (metres × 1.09361, rounded).
--            metres[]   = original from scorecard.
--
-- NOTE: The Links Experience (Par 3) Blue and Green tee distances
--       could not be reliably read from the scorecard PDF. They are
--       inserted as best-guess values with verified = false.
--
-- Safe to re-run: ON CONFLICT ... DO UPDATE.
-- ================================================================

DO $$
DECLARE
  v_course_id uuid;
BEGIN

-- ════════════════════════════════════════════════════════════════
-- 1. OUTENIQUA — 18 holes, par 72
-- ════════════════════════════════════════════════════════════════
INSERT INTO public.courses (id, name, club, location, holes_count, par, source, verified, distance_unit, lat, lng)
VALUES (
  '33333333-0001-0000-0000-000000000001',
  'Fancourt — Outeniqua',
  'Fancourt',
  'George, Western Cape, South Africa',
  18, 72, 'manual', true, 'metres',
  -33.9940, 22.4460
)
ON CONFLICT (name) DO UPDATE SET
  club          = EXCLUDED.club,
  location      = EXCLUDED.location,
  holes_count   = EXCLUDED.holes_count,
  par           = EXCLUDED.par,
  verified      = true,
  distance_unit = EXCLUDED.distance_unit,
  lat           = EXCLUDED.lat,
  lng           = EXCLUDED.lng;

SELECT id INTO v_course_id FROM public.courses WHERE name = 'Fancourt — Outeniqua';

-- holes
INSERT INTO public.course_holes (course_id, hole_number, par, stroke_index) VALUES
  (v_course_id,  1, 4, 17),
  (v_course_id,  2, 5, 15),
  (v_course_id,  3, 4,  3),
  (v_course_id,  4, 3,  7),
  (v_course_id,  5, 4,  5),
  (v_course_id,  6, 4, 13),
  (v_course_id,  7, 3,  9),
  (v_course_id,  8, 5, 11),
  (v_course_id,  9, 4,  1),
  (v_course_id, 10, 4, 12),
  (v_course_id, 11, 5,  8),
  (v_course_id, 12, 3, 14),
  (v_course_id, 13, 4,  6),
  (v_course_id, 14, 4,  2),
  (v_course_id, 15, 3, 16),
  (v_course_id, 16, 4,  4),
  (v_course_id, 17, 5, 18),
  (v_course_id, 18, 4, 10)
ON CONFLICT (course_id, hole_number) DO UPDATE SET
  par          = EXCLUDED.par,
  stroke_index = EXCLUDED.stroke_index;

-- tees: Protea (men) — professional
INSERT INTO public.course_tees (course_id, tee_name, gender, yardages, metres, total_yards, slope_rating, course_rating)
VALUES (
  v_course_id, 'Protea', 'men',
  ARRAY[334,544,435,201,329,392,177,579,433, 354,554,189,407,460,163,427,537,376]::smallint[],
  ARRAY[305,497,398,184,301,358,162,529,396, 324,507,173,372,421,149,390,491,344]::smallint[],
  6891, 131, 73.9
)
ON CONFLICT (course_id, tee_name, gender) DO UPDATE SET
  yardages      = EXCLUDED.yardages,
  metres        = EXCLUDED.metres,
  total_yards   = EXCLUDED.total_yards,
  slope_rating  = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating;

-- tees: Springbok (men) — 0-9 handicap
INSERT INTO public.course_tees (course_id, tee_name, gender, yardages, metres, total_yards, slope_rating, course_rating)
VALUES (
  v_course_id, 'Springbok', 'men',
  ARRAY[330,525,412,197,312,362,175,544,421, 335,536,175,404,420,156,390,505,348]::smallint[],
  ARRAY[302,480,377,180,285,331,160,497,385, 306,490,160,369,384,143,357,462,318]::smallint[],
  6547, 132, 71.4
)
ON CONFLICT (course_id, tee_name, gender) DO UPDATE SET
  yardages      = EXCLUDED.yardages,
  metres        = EXCLUDED.metres,
  total_yards   = EXCLUDED.total_yards,
  slope_rating  = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating;

-- tees: Galjoen (men) — 10-17 handicap
INSERT INTO public.course_tees (course_id, tee_name, gender, yardages, metres, total_yards, slope_rating, course_rating)
VALUES (
  v_course_id, 'Galjoen', 'men',
  ARRAY[304,518,386,175,292,337,147,512,395, 307,506,173,392,396,141,365,460,322]::smallint[],
  ARRAY[278,474,353,160,267,308,134,468,361, 281,463,158,358,362,129,334,421,294]::smallint[],
  6128, 127, 69.6
)
ON CONFLICT (course_id, tee_name, gender) DO UPDATE SET
  yardages      = EXCLUDED.yardages,
  metres        = EXCLUDED.metres,
  total_yards   = EXCLUDED.total_yards,
  slope_rating  = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating;

-- tees: Yellowwood (men) — 18-24 handicap
INSERT INTO public.course_tees (course_id, tee_name, gender, yardages, metres, total_yards, slope_rating, course_rating)
VALUES (
  v_course_id, 'Yellowwood', 'men',
  ARRAY[304,518,366,147,292,337,133,464,339, 307,472,173,385,360,141,315,460,315]::smallint[],
  ARRAY[278,474,335,134,267,308,122,424,310, 281,432,158,352,329,129,288,421,288]::smallint[],
  5828, 123, 68.2
)
ON CONFLICT (course_id, tee_name, gender) DO UPDATE SET
  yardages      = EXCLUDED.yardages,
  metres        = EXCLUDED.metres,
  total_yards   = EXCLUDED.total_yards,
  slope_rating  = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating;

-- tees: Blue Crane (men) — 25-36 handicap
INSERT INTO public.course_tees (course_id, tee_name, gender, yardages, metres, total_yards, slope_rating, course_rating)
VALUES (
  v_course_id, 'Blue Crane', 'men',
  ARRAY[289,475,365,133,234,318,104,463,338, 261,471,154,354,359,121,315,398,291]::smallint[],
  ARRAY[264,434,334,122,214,291,95,423,309, 239,431,141,324,328,111,288,364,266]::smallint[],
  5443, 116, 66.3
)
ON CONFLICT (course_id, tee_name, gender) DO UPDATE SET
  yardages      = EXCLUDED.yardages,
  metres        = EXCLUDED.metres,
  total_yards   = EXCLUDED.total_yards,
  slope_rating  = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating;

-- tees: Galjoen (ladies) — professional
INSERT INTO public.course_tees (course_id, tee_name, gender, yardages, metres, total_yards, slope_rating, course_rating)
VALUES (
  v_course_id, 'Galjoen', 'ladies',
  ARRAY[304,518,386,175,292,337,147,512,395, 307,506,173,392,396,141,365,460,322]::smallint[],
  ARRAY[278,474,353,160,267,308,134,468,361, 281,463,158,358,362,129,334,421,294]::smallint[],
  6128, 131, 76.1
)
ON CONFLICT (course_id, tee_name, gender) DO UPDATE SET
  yardages      = EXCLUDED.yardages,
  metres        = EXCLUDED.metres,
  total_yards   = EXCLUDED.total_yards,
  slope_rating  = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating;

-- tees: Yellowwood (ladies) — 0-9 handicap
INSERT INTO public.course_tees (course_id, tee_name, gender, yardages, metres, total_yards, slope_rating, course_rating)
VALUES (
  v_course_id, 'Yellowwood', 'ladies',
  ARRAY[304,518,366,147,292,337,133,464,339, 307,472,173,385,360,141,315,460,315]::smallint[],
  ARRAY[278,474,335,134,267,308,122,424,310, 281,432,158,352,329,129,288,421,288]::smallint[],
  5828, 130, 73.8
)
ON CONFLICT (course_id, tee_name, gender) DO UPDATE SET
  yardages      = EXCLUDED.yardages,
  metres        = EXCLUDED.metres,
  total_yards   = EXCLUDED.total_yards,
  slope_rating  = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating;

-- tees: Blue Crane (ladies) — 10+ handicap
INSERT INTO public.course_tees (course_id, tee_name, gender, yardages, metres, total_yards, slope_rating, course_rating)
VALUES (
  v_course_id, 'Blue Crane', 'ladies',
  ARRAY[289,475,365,133,234,318,104,463,338, 261,471,154,354,359,121,315,398,291]::smallint[],
  ARRAY[264,434,334,122,214,291,95,423,309, 239,431,141,324,328,111,288,364,266]::smallint[],
  5443, 126, 71.7
)
ON CONFLICT (course_id, tee_name, gender) DO UPDATE SET
  yardages      = EXCLUDED.yardages,
  metres        = EXCLUDED.metres,
  total_yards   = EXCLUDED.total_yards,
  slope_rating  = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating;


-- ════════════════════════════════════════════════════════════════
-- 2. THE LINKS — 18 holes, par 73
-- ════════════════════════════════════════════════════════════════
INSERT INTO public.courses (id, name, club, location, holes_count, par, source, verified, distance_unit, lat, lng)
VALUES (
  '33333333-0002-0000-0000-000000000001',
  'Fancourt — The Links',
  'Fancourt',
  'George, Western Cape, South Africa',
  18, 73, 'manual', true, 'metres',
  -33.9940, 22.4460
)
ON CONFLICT (name) DO UPDATE SET
  club          = EXCLUDED.club,
  location      = EXCLUDED.location,
  holes_count   = EXCLUDED.holes_count,
  par           = EXCLUDED.par,
  verified      = true,
  distance_unit = EXCLUDED.distance_unit,
  lat           = EXCLUDED.lat,
  lng           = EXCLUDED.lng;

SELECT id INTO v_course_id FROM public.courses WHERE name = 'Fancourt — The Links';

-- holes (with separate men's/ladies' stroke indices and hole names)
INSERT INTO public.course_holes (course_id, hole_number, par, stroke_index, stroke_index_ladies, name) VALUES
  (v_course_id,  1, 4, 16,  4, 'On Ye Go'),
  (v_course_id,  2, 3,  6, 16, 'Lang Drop'),
  (v_course_id,  3, 4,  2,  2, 'Calamity'),
  (v_course_id,  4, 4,  8, 10, 'Tranquility'),
  (v_course_id,  5, 5, 18,  8, 'Wetland'),
  (v_course_id,  6, 4, 14, 14, 'Five Penny Piece'),
  (v_course_id,  7, 4,  4, 12, 'Wide'),
  (v_course_id,  8, 3, 12, 18, 'Bonnie View'),
  (v_course_id,  9, 5, 10,  6, 'Long'),
  (v_course_id, 10, 4,  3,  3, 'Kilimanjaro'),
  (v_course_id, 11, 3, 17, 17, 'Valley'),
  (v_course_id, 12, 4,  1,  1, 'Sheer Murrrder'),
  (v_course_id, 13, 5, 13, 13, 'Outeniqua'),
  (v_course_id, 14, 4, 15, 15, 'Wee Wrecker'),
  (v_course_id, 15, 4,  5,  5, 'Roon the Bend'),
  (v_course_id, 16, 5,  7,  7, 'Westward Hol'),
  (v_course_id, 17, 3,  9,  9, 'Prayer'),
  (v_course_id, 18, 5, 11, 11, 'Near the Dram')
ON CONFLICT (course_id, hole_number) DO UPDATE SET
  par                  = EXCLUDED.par,
  stroke_index         = EXCLUDED.stroke_index,
  stroke_index_ladies  = EXCLUDED.stroke_index_ladies,
  name                 = EXCLUDED.name;

-- tees: Black (men)
INSERT INTO public.course_tees (course_id, tee_name, gender, yardages, metres, total_yards, slope_rating, course_rating)
VALUES (
  v_course_id, 'Black', 'men',
  ARRAY[396,236,469,494,549,341,476,202,609, 408,161,481,533,361,477,584,186,616]::smallint[],
  ARRAY[362,216,429,452,502,312,435,185,557, 373,147,440,487,330,436,534,170,563]::smallint[],
  7579, 149, 77.8
)
ON CONFLICT (course_id, tee_name, gender) DO UPDATE SET
  yardages      = EXCLUDED.yardages,
  metres        = EXCLUDED.metres,
  total_yards   = EXCLUDED.total_yards,
  slope_rating  = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating;

-- tees: Yellow (men)
INSERT INTO public.course_tees (course_id, tee_name, gender, yardages, metres, total_yards, slope_rating, course_rating)
VALUES (
  v_course_id, 'Yellow', 'men',
  ARRAY[364,214,388,436,501,325,421,156,569, 390,148,458,512,324,376,572,163,528]::smallint[],
  ARRAY[333,196,355,399,458,297,385,143,520, 357,135,419,468,296,344,523,149,483]::smallint[],
  6845, 141, 74.1
)
ON CONFLICT (course_id, tee_name, gender) DO UPDATE SET
  yardages      = EXCLUDED.yardages,
  metres        = EXCLUDED.metres,
  total_yards   = EXCLUDED.total_yards,
  slope_rating  = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating;

-- tees: White (men)
INSERT INTO public.course_tees (course_id, tee_name, gender, yardages, metres, total_yards, slope_rating, course_rating)
VALUES (
  v_course_id, 'White', 'men',
  ARRAY[331,171,367,412,459,308,387,139,538, 331,130,417,492,306,353,492,137,484]::smallint[],
  ARRAY[303,156,336,377,420,282,354,127,492, 303,119,381,450,280,323,450,125,443]::smallint[],
  6254, 137, 70.9
)
ON CONFLICT (course_id, tee_name, gender) DO UPDATE SET
  yardages      = EXCLUDED.yardages,
  metres        = EXCLUDED.metres,
  total_yards   = EXCLUDED.total_yards,
  slope_rating  = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating;

-- tees: White (ladies) — same physical tee, different CR/SR
INSERT INTO public.course_tees (course_id, tee_name, gender, yardages, metres, total_yards, slope_rating, course_rating)
VALUES (
  v_course_id, 'White', 'ladies',
  ARRAY[331,171,367,412,459,308,387,139,538, 331,130,417,492,306,353,492,137,484]::smallint[],
  ARRAY[303,156,336,377,420,282,354,127,492, 303,119,381,450,280,323,450,125,443]::smallint[],
  6254, 146, 77.5
)
ON CONFLICT (course_id, tee_name, gender) DO UPDATE SET
  yardages      = EXCLUDED.yardages,
  metres        = EXCLUDED.metres,
  total_yards   = EXCLUDED.total_yards,
  slope_rating  = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating;

-- tees: Red (ladies)
INSERT INTO public.course_tees (course_id, tee_name, gender, yardages, metres, total_yards, slope_rating, course_rating)
VALUES (
  v_course_id, 'Red', 'ladies',
  ARRAY[308,131,347,389,399,289,359,101,503, 313,105,336,469,289,334,446,113,374]::smallint[],
  ARRAY[282,120,317,356,365,264,328,92,460, 286,96,307,429,264,305,408,103,342]::smallint[],
  5605, 133, 73.3
)
ON CONFLICT (course_id, tee_name, gender) DO UPDATE SET
  yardages      = EXCLUDED.yardages,
  metres        = EXCLUDED.metres,
  total_yards   = EXCLUDED.total_yards,
  slope_rating  = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating;


-- ════════════════════════════════════════════════════════════════
-- 3. THE LINKS EXPERIENCE — 9 holes, par 34
-- ════════════════════════════════════════════════════════════════
INSERT INTO public.courses (id, name, club, location, holes_count, par, source, verified, distance_unit, lat, lng)
VALUES (
  '33333333-0003-0000-0000-000000000001',
  'Fancourt — The Links Experience',
  'Fancourt',
  'George, Western Cape, South Africa',
  9, 34, 'manual', true, 'metres',
  -33.9940, 22.4460
)
ON CONFLICT (name) DO UPDATE SET
  club          = EXCLUDED.club,
  location      = EXCLUDED.location,
  holes_count   = EXCLUDED.holes_count,
  par           = EXCLUDED.par,
  verified      = true,
  distance_unit = EXCLUDED.distance_unit,
  lat           = EXCLUDED.lat,
  lng           = EXCLUDED.lng;

SELECT id INTO v_course_id FROM public.courses WHERE name = 'Fancourt — The Links Experience';

-- holes (stroke index has duplicated values — verified against scorecard)
INSERT INTO public.course_holes (course_id, hole_number, par, stroke_index, name) VALUES
  (v_course_id, 1, 4, 9, 'Wamkelekile'),
  (v_course_id, 2, 4, 1, 'Down the hill'),
  (v_course_id, 3, 3, 7, 'It''ll be a skoosh'),
  (v_course_id, 4, 4, 3, 'Devil''s elbow'),
  (v_course_id, 5, 4, 4, 'Low land'),
  (v_course_id, 6, 3, 3, 'Beag'),
  (v_course_id, 7, 4, 7, 'Wide'),
  (v_course_id, 8, 3, 8, 'Mulligan'),
  (v_course_id, 9, 5, 9, 'Up the hill')
ON CONFLICT (course_id, hole_number) DO UPDATE SET
  par          = EXCLUDED.par,
  stroke_index = EXCLUDED.stroke_index,
  name         = EXCLUDED.name;

-- tees: Full Course (men)
INSERT INTO public.course_tees (course_id, tee_name, gender, yardages, metres, total_yards, slope_rating, course_rating)
VALUES (
  v_course_id, 'Full Course', 'men',
  ARRAY[375,395,115,396,362,141,411,186,529]::smallint[],
  ARRAY[343,361,105,362,331,129,376,170,484]::smallint[],
  2910, 128, 66.6
)
ON CONFLICT (course_id, tee_name, gender) DO UPDATE SET
  yardages      = EXCLUDED.yardages,
  metres        = EXCLUDED.metres,
  total_yards   = EXCLUDED.total_yards,
  slope_rating  = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating;

-- tees: Full Course (ladies)
INSERT INTO public.course_tees (course_id, tee_name, gender, yardages, metres, total_yards, slope_rating, course_rating)
VALUES (
  v_course_id, 'Full Course', 'ladies',
  ARRAY[375,395,115,396,362,141,411,186,529]::smallint[],
  ARRAY[343,361,105,362,331,129,376,170,484]::smallint[],
  2910, 131, 74.2
)
ON CONFLICT (course_id, tee_name, gender) DO UPDATE SET
  yardages      = EXCLUDED.yardages,
  metres        = EXCLUDED.metres,
  total_yards   = EXCLUDED.total_yards,
  slope_rating  = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating;

-- tees: White (men)
INSERT INTO public.course_tees (course_id, tee_name, gender, yardages, metres, total_yards, slope_rating, course_rating)
VALUES (
  v_course_id, 'White', 'men',
  ARRAY[366,372,115,363,339,131,388,171,494]::smallint[],
  ARRAY[335,340,105,332,310,120,355,156,452]::smallint[],
  2739, 124, 65.0
)
ON CONFLICT (course_id, tee_name, gender) DO UPDATE SET
  yardages      = EXCLUDED.yardages,
  metres        = EXCLUDED.metres,
  total_yards   = EXCLUDED.total_yards,
  slope_rating  = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating;

-- tees: White (ladies)
INSERT INTO public.course_tees (course_id, tee_name, gender, yardages, metres, total_yards, slope_rating, course_rating)
VALUES (
  v_course_id, 'White', 'ladies',
  ARRAY[366,372,115,363,339,131,388,171,494]::smallint[],
  ARRAY[335,340,105,332,310,120,355,156,452]::smallint[],
  2739, 121, 71.8
)
ON CONFLICT (course_id, tee_name, gender) DO UPDATE SET
  yardages      = EXCLUDED.yardages,
  metres        = EXCLUDED.metres,
  total_yards   = EXCLUDED.total_yards,
  slope_rating  = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating;

-- tees: Red (men)
INSERT INTO public.course_tees (course_id, tee_name, gender, yardages, metres, total_yards, slope_rating, course_rating)
VALUES (
  v_course_id, 'Red', 'men',
  ARRAY[322,308,102,348,308,120,326,128,381]::smallint[],
  ARRAY[294,282,93,318,282,110,298,117,348]::smallint[],
  2343, 110, 63.0
)
ON CONFLICT (course_id, tee_name, gender) DO UPDATE SET
  yardages      = EXCLUDED.yardages,
  metres        = EXCLUDED.metres,
  total_yards   = EXCLUDED.total_yards,
  slope_rating  = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating;

-- tees: Red (ladies)
INSERT INTO public.course_tees (course_id, tee_name, gender, yardages, metres, total_yards, slope_rating, course_rating)
VALUES (
  v_course_id, 'Red', 'ladies',
  ARRAY[322,308,102,348,308,120,326,128,381]::smallint[],
  ARRAY[294,282,93,318,282,110,298,117,348]::smallint[],
  2343, 115, 68.0
)
ON CONFLICT (course_id, tee_name, gender) DO UPDATE SET
  yardages      = EXCLUDED.yardages,
  metres        = EXCLUDED.metres,
  total_yards   = EXCLUDED.total_yards,
  slope_rating  = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating;


-- ════════════════════════════════════════════════════════════════
-- 4. THE LINKS EXPERIENCE (PAR 3) — 9 holes, par 27
--    VERIFY: Blue and Green tee distances are best-guess values
--    from a low-resolution scorecard image.
-- ════════════════════════════════════════════════════════════════
INSERT INTO public.courses (id, name, club, location, holes_count, par, source, verified, distance_unit, lat, lng)
VALUES (
  '33333333-0004-0000-0000-000000000001',
  'Fancourt — The Links Experience (Par 3)',
  'Fancourt',
  'George, Western Cape, South Africa',
  9, 27, 'manual', false, 'metres',
  -33.9940, 22.4460
)
ON CONFLICT (name) DO UPDATE SET
  club          = EXCLUDED.club,
  location      = EXCLUDED.location,
  holes_count   = EXCLUDED.holes_count,
  par           = EXCLUDED.par,
  verified      = false,
  distance_unit = EXCLUDED.distance_unit,
  lat           = EXCLUDED.lat,
  lng           = EXCLUDED.lng;

SELECT id INTO v_course_id FROM public.courses WHERE name = 'Fancourt — The Links Experience (Par 3)';

-- holes (same physical holes as The Links Experience, all par 3)
INSERT INTO public.course_holes (course_id, hole_number, par, stroke_index, name) VALUES
  (v_course_id, 1, 3, 9, 'Wamkelekile'),
  (v_course_id, 2, 3, 1, 'Down the hill'),
  (v_course_id, 3, 3, 7, 'It''ll be a skoosh'),
  (v_course_id, 4, 3, 3, 'Devil''s elbow'),
  (v_course_id, 5, 3, 4, 'Low land'),
  (v_course_id, 6, 3, 3, 'Beag'),
  (v_course_id, 7, 3, 7, 'Wide'),
  (v_course_id, 8, 3, 8, 'Mulligan'),
  (v_course_id, 9, 3, 9, 'Up the hill')
ON CONFLICT (course_id, hole_number) DO UPDATE SET
  par          = EXCLUDED.par,
  stroke_index = EXCLUDED.stroke_index,
  name         = EXCLUDED.name;

-- tees: Blue (men) — VERIFY: distances are best-guess
INSERT INTO public.course_tees (course_id, tee_name, gender, yardages, metres, total_yards, slope_rating, course_rating)
VALUES (
  v_course_id, 'Blue', 'men',
  ARRAY[124,162,102,145,173,120,114,128,116]::smallint[],
  ARRAY[113,148,93,133,158,110,104,117,106]::smallint[],
  1184, NULL, NULL
)
ON CONFLICT (course_id, tee_name, gender) DO UPDATE SET
  yardages      = EXCLUDED.yardages,
  metres        = EXCLUDED.metres,
  total_yards   = EXCLUDED.total_yards,
  slope_rating  = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating;

-- tees: Blue (ladies) — VERIFY: same distances, CR/SR unknown
INSERT INTO public.course_tees (course_id, tee_name, gender, yardages, metres, total_yards, slope_rating, course_rating)
VALUES (
  v_course_id, 'Blue', 'ladies',
  ARRAY[124,162,102,145,173,120,114,128,116]::smallint[],
  ARRAY[113,148,93,133,158,110,104,117,106]::smallint[],
  1184, NULL, NULL
)
ON CONFLICT (course_id, tee_name, gender) DO UPDATE SET
  yardages      = EXCLUDED.yardages,
  metres        = EXCLUDED.metres,
  total_yards   = EXCLUDED.total_yards,
  slope_rating  = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating;

-- tees: Green (men) — VERIFY: distances are best-guess
INSERT INTO public.course_tees (course_id, tee_name, gender, yardages, metres, total_yards, slope_rating, course_rating)
VALUES (
  v_course_id, 'Green', 'men',
  ARRAY[93,130,90,106,129,90,85,100,90]::smallint[],
  ARRAY[85,119,82,97,118,82,78,91,82]::smallint[],
  913, NULL, NULL
)
ON CONFLICT (course_id, tee_name, gender) DO UPDATE SET
  yardages      = EXCLUDED.yardages,
  metres        = EXCLUDED.metres,
  total_yards   = EXCLUDED.total_yards,
  slope_rating  = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating;

-- tees: Green (ladies) — VERIFY: same distances, CR/SR unknown
INSERT INTO public.course_tees (course_id, tee_name, gender, yardages, metres, total_yards, slope_rating, course_rating)
VALUES (
  v_course_id, 'Green', 'ladies',
  ARRAY[93,130,90,106,129,90,85,100,90]::smallint[],
  ARRAY[85,119,82,97,118,82,78,91,82]::smallint[],
  913, NULL, NULL
)
ON CONFLICT (course_id, tee_name, gender) DO UPDATE SET
  yardages      = EXCLUDED.yardages,
  metres        = EXCLUDED.metres,
  total_yards   = EXCLUDED.total_yards,
  slope_rating  = EXCLUDED.slope_rating,
  course_rating = EXCLUDED.course_rating;

END $$;
