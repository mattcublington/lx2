-- ─────────────────────────────────────────────────────────────────────────────
-- golfer/003_golfer_seed_cumberwell_loops.sql
--
-- Seeds the 6 Cumberwell Park 9-hole loops, their hole data, yardages
-- (Yellow/Purple tee — from cumberwell_scorecards_v3.json), and all 14
-- 18-hole course_combinations that link pairs of loops.
--
-- Without this, events are created with combination_id = null and the scoring
-- page cannot resolve hole data ("Course data unavailable").
--
-- Safe to re-run: all inserts use ON CONFLICT DO NOTHING.
--
-- Loop UUIDs are fixed (10000000-...) so the combinations can reference them
-- reliably across environments.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  -- Fixed loop UUIDs — stable across environments
  loop_red    constant uuid := '10000000-0000-0000-0000-000000000001';
  loop_yellow constant uuid := '10000000-0000-0000-0000-000000000002';
  loop_blue   constant uuid := '10000000-0000-0000-0000-000000000003';
  loop_orange constant uuid := '10000000-0000-0000-0000-000000000004';
  loop_white  constant uuid := '10000000-0000-0000-0000-000000000005';
  loop_par3   constant uuid := '10000000-0000-0000-0000-000000000006';

begin

-- ─── 1. Loops ─────────────────────────────────────────────────────────────────
-- course_id = null: loops are shared physical entities at Cumberwell, not
-- tied to any single 18-hole combination.

insert into public.loops (id, course_id, name, holes, notes) values
  (loop_red,    null, 'Red',    9, 'Cumberwell Park — Red loop'),
  (loop_yellow, null, 'Yellow', 9, 'Cumberwell Park — Yellow loop'),
  (loop_blue,   null, 'Blue',   9, 'Cumberwell Park — Blue loop'),
  (loop_orange, null, 'Orange', 9, 'Cumberwell Park — Orange loop'),
  (loop_white,  null, 'White',  9, 'Cumberwell Park — White loop'),
  (loop_par3,   null, 'Par 3',  9, 'Cumberwell Park — Par 3 loop')
on conflict (id) do nothing;

-- ─── 2. Loop holes ────────────────────────────────────────────────────────────
-- si_m = within-combination stroke index (1-18) as recorded on the scorecard.
-- Source: cumberwell_scorecards_v3.json via courses.ts.

-- Red loop (holes 1-9 of Red/Yellow, Red/Blue, Red/Orange combos)
insert into public.loop_holes (loop_id, hole_number, par, si_m) values
  (loop_red, 1, 4,  9),
  (loop_red, 2, 4,  5),
  (loop_red, 3, 3, 17),
  (loop_red, 4, 4, 11),
  (loop_red, 5, 4, 13),
  (loop_red, 6, 4,  3),
  (loop_red, 7, 3, 15),
  (loop_red, 8, 4,  1),
  (loop_red, 9, 5,  7)
on conflict (loop_id, hole_number) do nothing;

-- Yellow loop (holes 10-18 of Red/Yellow i.e. holes 1-9 of Yellow/Red)
insert into public.loop_holes (loop_id, hole_number, par, si_m) values
  (loop_yellow, 1, 4, 18),
  (loop_yellow, 2, 5, 10),
  (loop_yellow, 3, 5,  6),
  (loop_yellow, 4, 3, 16),
  (loop_yellow, 5, 4,  4),
  (loop_yellow, 6, 4,  2),
  (loop_yellow, 7, 3, 12),
  (loop_yellow, 8, 4, 14),
  (loop_yellow, 9, 4,  8)
on conflict (loop_id, hole_number) do nothing;

-- Blue loop (holes 1-9 of Blue/Orange, Blue/Red, Blue/Yellow combos)
insert into public.loop_holes (loop_id, hole_number, par, si_m) values
  (loop_blue, 1, 5,  5),
  (loop_blue, 2, 4,  1),
  (loop_blue, 3, 4, 15),
  (loop_blue, 4, 4, 13),
  (loop_blue, 5, 4,  3),
  (loop_blue, 6, 3, 17),
  (loop_blue, 7, 4,  7),
  (loop_blue, 8, 3,  9),
  (loop_blue, 9, 5, 11)
on conflict (loop_id, hole_number) do nothing;

-- Orange loop (holes 10-18 of Blue/Orange i.e. holes 1-9 of Orange/Blue)
insert into public.loop_holes (loop_id, hole_number, par, si_m) values
  (loop_orange, 1, 4, 18),
  (loop_orange, 2, 4, 10),
  (loop_orange, 3, 4,  6),
  (loop_orange, 4, 3, 16),
  (loop_orange, 5, 4, 12),
  (loop_orange, 6, 4, 14),
  (loop_orange, 7, 4,  4),
  (loop_orange, 8, 3,  8),
  (loop_orange, 9, 5,  2)
on conflict (loop_id, hole_number) do nothing;

-- White loop (holes 1-9 of White/White)
insert into public.loop_holes (loop_id, hole_number, par, si_m) values
  (loop_white, 1, 4, 15),
  (loop_white, 2, 5,  3),
  (loop_white, 3, 4,  7),
  (loop_white, 4, 3, 11),
  (loop_white, 5, 4,  9),
  (loop_white, 6, 4,  1),
  (loop_white, 7, 4, 13),
  (loop_white, 8, 4,  5),
  (loop_white, 9, 3, 17)
on conflict (loop_id, hole_number) do nothing;

-- Par 3 loop (holes 1-9 of Par 3/Par 3 — SI = hole number, no WHS rating)
insert into public.loop_holes (loop_id, hole_number, par, si_m) values
  (loop_par3, 1, 3, 1),
  (loop_par3, 2, 3, 2),
  (loop_par3, 3, 3, 3),
  (loop_par3, 4, 3, 4),
  (loop_par3, 5, 3, 5),
  (loop_par3, 6, 3, 6),
  (loop_par3, 7, 3, 7),
  (loop_par3, 8, 3, 8),
  (loop_par3, 9, 3, 9)
on conflict (loop_id, hole_number) do nothing;

-- ─── 3. Loop hole tees (Yellow/Purple yardages) ───────────────────────────────
-- Single tee colour from courses.ts. Additional tee colours (Green, White,
-- Red/Black) can be added later once per-tee yardage data is collected.

insert into public.loop_hole_tees (loop_hole_id, tee_colour, yards)
select lh.id, 'Yellow/Purple', v.yards
from public.loop_holes lh
join (values
  (loop_red, 1, 380), (loop_red, 2, 432), (loop_red, 3, 142),
  (loop_red, 4, 376), (loop_red, 5, 318), (loop_red, 6, 390),
  (loop_red, 7, 132), (loop_red, 8, 397), (loop_red, 9, 561)
) as v(lid, hnum, yards) on lh.loop_id = v.lid and lh.hole_number = v.hnum
on conflict (loop_hole_id, tee_colour) do nothing;

insert into public.loop_hole_tees (loop_hole_id, tee_colour, yards)
select lh.id, 'Yellow/Purple', v.yards
from public.loop_holes lh
join (values
  (loop_yellow, 1, 285), (loop_yellow, 2, 478), (loop_yellow, 3, 492),
  (loop_yellow, 4, 164), (loop_yellow, 5, 356), (loop_yellow, 6, 450),
  (loop_yellow, 7, 144), (loop_yellow, 8, 283), (loop_yellow, 9, 343)
) as v(lid, hnum, yards) on lh.loop_id = v.lid and lh.hole_number = v.hnum
on conflict (loop_hole_id, tee_colour) do nothing;

insert into public.loop_hole_tees (loop_hole_id, tee_colour, yards)
select lh.id, 'Yellow/Purple', v.yards
from public.loop_holes lh
join (values
  (loop_blue, 1, 526), (loop_blue, 2, 396), (loop_blue, 3, 331),
  (loop_blue, 4, 306), (loop_blue, 5, 383), (loop_blue, 6, 135),
  (loop_blue, 7, 391), (loop_blue, 8, 172), (loop_blue, 9, 440)
) as v(lid, hnum, yards) on lh.loop_id = v.lid and lh.hole_number = v.hnum
on conflict (loop_hole_id, tee_colour) do nothing;

insert into public.loop_hole_tees (loop_hole_id, tee_colour, yards)
select lh.id, 'Yellow/Purple', v.yards
from public.loop_holes lh
join (values
  (loop_orange, 1, 285), (loop_orange, 2, 380), (loop_orange, 3, 432),
  (loop_orange, 4, 142), (loop_orange, 5, 376), (loop_orange, 6, 318),
  (loop_orange, 7, 390), (loop_orange, 8, 132), (loop_orange, 9, 397)
) as v(lid, hnum, yards) on lh.loop_id = v.lid and lh.hole_number = v.hnum
on conflict (loop_hole_id, tee_colour) do nothing;

insert into public.loop_hole_tees (loop_hole_id, tee_colour, yards)
select lh.id, 'Yellow/Purple', v.yards
from public.loop_holes lh
join (values
  (loop_white, 1, 267), (loop_white, 2, 477), (loop_white, 3, 380),
  (loop_white, 4, 179), (loop_white, 5, 347), (loop_white, 6, 465),
  (loop_white, 7, 306), (loop_white, 8, 355), (loop_white, 9, 159)
) as v(lid, hnum, yards) on lh.loop_id = v.lid and lh.hole_number = v.hnum
on conflict (loop_hole_id, tee_colour) do nothing;

insert into public.loop_hole_tees (loop_hole_id, tee_colour, yards)
select lh.id, 'Yellow/Purple', v.yards
from public.loop_holes lh
join (values
  (loop_par3, 1, 109), (loop_par3, 2, 165), (loop_par3, 3, 141),
  (loop_par3, 4, 186), (loop_par3, 5, 180), (loop_par3, 6, 164),
  (loop_par3, 7, 172), (loop_par3, 8, 144), (loop_par3, 9, 150)
) as v(lid, hnum, yards) on lh.loop_id = v.lid and lh.hole_number = v.hnum
on conflict (loop_hole_id, tee_colour) do nothing;

-- ─── 4. Course combinations ───────────────────────────────────────────────────
-- Links pairs of loops to the 14 named 18-hole courses already in public.courses.

insert into public.course_combinations (course_id, name, par, holes, loop_1_id, loop_2_id)
select c.id, c.name, c.par, 18, v.l1, v.l2
from public.courses c
join (values
  ('Cumberwell Park — Red/Yellow',    loop_red,    loop_yellow, 71),
  ('Cumberwell Park — Yellow/Red',    loop_yellow, loop_red,    71),
  ('Cumberwell Park — Blue/Orange',   loop_blue,   loop_orange, 71),
  ('Cumberwell Park — Orange/Blue',   loop_orange, loop_blue,   71),
  ('Cumberwell Park — Red/Blue',      loop_red,    loop_blue,   71),
  ('Cumberwell Park — Blue/Red',      loop_blue,   loop_red,    71),
  ('Cumberwell Park — Blue/Yellow',   loop_blue,   loop_yellow, 72),
  ('Cumberwell Park — Yellow/Blue',   loop_yellow, loop_blue,   72),
  ('Cumberwell Park — Orange/Yellow', loop_orange, loop_yellow, 71),
  ('Cumberwell Park — Yellow/Orange', loop_yellow, loop_orange, 71),
  ('Cumberwell Park — Red/Orange',    loop_red,    loop_orange, 71),
  ('Cumberwell Park — Orange/Red',    loop_orange, loop_red,    71),
  ('Cumberwell Park — White/White',   loop_white,  loop_white,  70),
  ('Cumberwell Park — Par 3/Par 3',   loop_par3,   loop_par3,   54)
) as v(cname, l1, l2, par) on c.name = v.cname
on conflict (course_id, name) do nothing;

end $$;
