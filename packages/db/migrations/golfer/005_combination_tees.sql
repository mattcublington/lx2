-- ─────────────────────────────────────────────────────────────────────────────
-- golfer/005_combination_tees.sql
--
-- 1. Adds the missing White/Par 3 and Par 3/White 18-hole courses.
-- 2. Fixes the White/White course rating and slope (seed had incorrect values).
-- 3. Adds course_combinations for White/Par 3 and Par 3/White.
-- 4. Seeds combination_tees (slope + course rating per tee colour) for all
--    WHS-rated Cumberwell Park 18-hole combinations.
--
-- Source: USGA Course Rating & Slope Database™ (March 2026).
-- Tee colours: Green (longest) > White > Purple > Black (shortest).
-- Par 3/Par 3 is excluded — no WHS rating (par 54).
--
-- Safe to re-run: INSERTs use ON CONFLICT DO NOTHING; UPDATE is idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Add missing White/Par 3 courses ──────────────────────────────────────

insert into public.courses
  (name, club, location, holes_count, slope_rating, course_rating, par, source, verified)
values
  ('Cumberwell Park — White/Par 3', 'Cumberwell Park', 'Bradford-on-Avon, Wiltshire', 18, 100, 61.0, 62, 'manual', true),
  ('Cumberwell Park — Par 3/White', 'Cumberwell Park', 'Bradford-on-Avon, Wiltshire', 18, 100, 61.0, 62, 'manual', true)
on conflict (name) do nothing;

-- ─── 2. Fix incorrect White/White course rating and slope ────────────────────
-- Seed 002 had slope=111 / CR=68.2; USGA shows White tee M = 108 / 67.0.

update public.courses
set    slope_rating  = 108,
       course_rating = 67.0
where  name = 'Cumberwell Park — White/White';

-- ─── 3. Add White/Par 3 course combinations ──────────────────────────────────
-- Loop UUIDs match the fixed IDs from 003_golfer_seed_cumberwell_loops.sql.

insert into public.course_combinations (course_id, name, par, holes, loop_1_id, loop_2_id)
select c.id, v.cname, 62, 18, v.l1::uuid, v.l2::uuid
from   public.courses c
join (values
  ('Cumberwell Park — White/Par 3', '10000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000006'),
  ('Cumberwell Park — Par 3/White', '10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000005')
) as v(cname, l1, l2) on c.name = v.cname
on conflict (course_id, name) do nothing;

-- ─── 4. Combination tees ─────────────────────────────────────────────────────
-- The 6 standard pairings (Red/Yellow/Blue/Orange) each appear twice in
-- course_combinations (forward and reverse). Both rows get the same ratings
-- because it's the same 18 holes regardless of which 9 is played first.
-- White/White has only 3 rated tees (no Green or Black men's from USGA).

insert into public.combination_tees (combination_id, tee_colour, gender, slope_rating, course_rating)
select cc.id, v.tee_colour, v.gender, v.slope_rating, v.course_rating
from   public.course_combinations cc
join   public.courses c on c.id = cc.course_id
join (values

  -- ── Blue & Orange ──────────────────────────────────────────────────────────
  ('Cumberwell Park — Blue/Orange',   'Green',  'm', 127, 73.9),
  ('Cumberwell Park — Blue/Orange',   'White',  'm', 125, 71.5),
  ('Cumberwell Park — Blue/Orange',   'Purple', 'm', 121, 69.3),
  ('Cumberwell Park — Blue/Orange',   'Black',  'm', 115, 65.9),
  ('Cumberwell Park — Blue/Orange',   'Black',  'w', 128, 71.4),
  ('Cumberwell Park — Orange/Blue',   'Green',  'm', 127, 73.9),
  ('Cumberwell Park — Orange/Blue',   'White',  'm', 125, 71.5),
  ('Cumberwell Park — Orange/Blue',   'Purple', 'm', 121, 69.3),
  ('Cumberwell Park — Orange/Blue',   'Black',  'm', 115, 65.9),
  ('Cumberwell Park — Orange/Blue',   'Black',  'w', 128, 71.4),

  -- ── Blue & Red ─────────────────────────────────────────────────────────────
  ('Cumberwell Park — Blue/Red',      'Green',  'm', 131, 74.4),
  ('Cumberwell Park — Blue/Red',      'White',  'm', 126, 72.5),
  ('Cumberwell Park — Blue/Red',      'Purple', 'm', 124, 70.4),
  ('Cumberwell Park — Blue/Red',      'Black',  'm', 117, 67.0),
  ('Cumberwell Park — Blue/Red',      'Black',  'w', 134, 72.7),
  ('Cumberwell Park — Red/Blue',      'Green',  'm', 131, 74.4),
  ('Cumberwell Park — Red/Blue',      'White',  'm', 126, 72.5),
  ('Cumberwell Park — Red/Blue',      'Purple', 'm', 124, 70.4),
  ('Cumberwell Park — Red/Blue',      'Black',  'm', 117, 67.0),
  ('Cumberwell Park — Red/Blue',      'Black',  'w', 134, 72.7),

  -- ── Orange & Yellow ────────────────────────────────────────────────────────
  ('Cumberwell Park — Orange/Yellow', 'Green',  'm', 126, 72.0),
  ('Cumberwell Park — Orange/Yellow', 'White',  'm', 125, 70.0),
  ('Cumberwell Park — Orange/Yellow', 'Purple', 'm', 120, 68.4),
  ('Cumberwell Park — Orange/Yellow', 'Black',  'm', 110, 65.6),
  ('Cumberwell Park — Orange/Yellow', 'Black',  'w', 127, 70.5),
  ('Cumberwell Park — Yellow/Orange', 'Green',  'm', 126, 72.0),
  ('Cumberwell Park — Yellow/Orange', 'White',  'm', 125, 70.0),
  ('Cumberwell Park — Yellow/Orange', 'Purple', 'm', 120, 68.4),
  ('Cumberwell Park — Yellow/Orange', 'Black',  'm', 110, 65.6),
  ('Cumberwell Park — Yellow/Orange', 'Black',  'w', 127, 70.5),

  -- ── Red & Orange ───────────────────────────────────────────────────────────
  ('Cumberwell Park — Red/Orange',    'Green',  'm', 125, 73.1),
  ('Cumberwell Park — Red/Orange',    'White',  'm', 122, 71.0),
  ('Cumberwell Park — Red/Orange',    'Purple', 'm', 119, 69.1),
  ('Cumberwell Park — Red/Orange',    'Black',  'm', 113, 65.5),
  ('Cumberwell Park — Red/Orange',    'Black',  'w', 127, 70.9),
  ('Cumberwell Park — Orange/Red',    'Green',  'm', 125, 73.1),
  ('Cumberwell Park — Orange/Red',    'White',  'm', 122, 71.0),
  ('Cumberwell Park — Orange/Red',    'Purple', 'm', 119, 69.1),
  ('Cumberwell Park — Orange/Red',    'Black',  'm', 113, 65.5),
  ('Cumberwell Park — Orange/Red',    'Black',  'w', 127, 70.9),

  -- ── Red & Yellow ───────────────────────────────────────────────────────────
  ('Cumberwell Park — Red/Yellow',    'Green',  'm', 130, 72.5),
  ('Cumberwell Park — Red/Yellow',    'White',  'm', 126, 71.0),
  ('Cumberwell Park — Red/Yellow',    'Purple', 'm', 123, 69.5),
  ('Cumberwell Park — Red/Yellow',    'Black',  'm', 112, 66.7),
  ('Cumberwell Park — Red/Yellow',    'Black',  'w', 133, 71.8),
  ('Cumberwell Park — Yellow/Red',    'Green',  'm', 130, 72.5),
  ('Cumberwell Park — Yellow/Red',    'White',  'm', 126, 71.0),
  ('Cumberwell Park — Yellow/Red',    'Purple', 'm', 123, 69.5),
  ('Cumberwell Park — Yellow/Red',    'Black',  'm', 112, 66.7),
  ('Cumberwell Park — Yellow/Red',    'Black',  'w', 133, 71.8),

  -- ── Yellow & Blue ──────────────────────────────────────────────────────────
  ('Cumberwell Park — Yellow/Blue',   'Green',  'm', 132, 73.3),
  ('Cumberwell Park — Yellow/Blue',   'White',  'm', 129, 71.5),
  ('Cumberwell Park — Yellow/Blue',   'Purple', 'm', 125, 69.7),
  ('Cumberwell Park — Yellow/Blue',   'Black',  'm', 114, 67.1),
  ('Cumberwell Park — Yellow/Blue',   'Black',  'w', 134, 72.3),
  ('Cumberwell Park — Blue/Yellow',   'Green',  'm', 132, 73.3),
  ('Cumberwell Park — Blue/Yellow',   'White',  'm', 129, 71.5),
  ('Cumberwell Park — Blue/Yellow',   'Purple', 'm', 125, 69.7),
  ('Cumberwell Park — Blue/Yellow',   'Black',  'm', 114, 67.1),
  ('Cumberwell Park — Blue/Yellow',   'Black',  'w', 134, 72.3),

  -- ── White/White ────────────────────────────────────────────────────────────
  -- USGA only rates 3 tees for this combination (same loop played twice).
  ('Cumberwell Park — White/White',   'White',  'm', 108, 67.0),
  ('Cumberwell Park — White/White',   'Purple', 'm', 105, 65.0),
  ('Cumberwell Park — White/White',   'Black',  'w', 114, 68.0),

  -- ── White/Par 3 ────────────────────────────────────────────────────────────
  -- Par 62 (White 35 + Par 3 27). No Green tee rated by USGA.
  ('Cumberwell Park — White/Par 3',   'White',  'm', 100, 61.0),
  ('Cumberwell Park — White/Par 3',   'Purple', 'm',  98, 59.5),
  ('Cumberwell Park — White/Par 3',   'Black',  'm',  92, 58.4),
  ('Cumberwell Park — White/Par 3',   'Purple', 'w', 103, 61.8),
  ('Cumberwell Park — White/Par 3',   'Black',  'w',  99, 60.0),
  ('Cumberwell Park — Par 3/White',   'White',  'm', 100, 61.0),
  ('Cumberwell Park — Par 3/White',   'Purple', 'm',  98, 59.5),
  ('Cumberwell Park — Par 3/White',   'Black',  'm',  92, 58.4),
  ('Cumberwell Park — Par 3/White',   'Purple', 'w', 103, 61.8),
  ('Cumberwell Park — Par 3/White',   'Black',  'w',  99, 60.0)

) as v(cname, tee_colour, gender, slope_rating, course_rating)
  on c.name = v.cname
on conflict (combination_id, tee_colour, gender) do nothing;
