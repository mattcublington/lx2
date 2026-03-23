-- ─────────────────────────────────────────────────────────────────────────────
-- golfer/002_golfer_seed_cumberwell.sql
--
-- Seeds all 14 Cumberwell Park 18-hole course combinations into public.courses.
-- CR/SR values sourced from cumberwell_scorecards_v3.json (March 2026) and
-- USGA NCRDB (CourseIDs 22312–22317). Yellow/standard men tees.
--
-- Safe to re-run: ON CONFLICT (name) DO NOTHING.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.courses
  (name, club, location, holes_count, slope_rating, course_rating, par, source, verified)
values
  ('Cumberwell Park — Red/Yellow',    'Cumberwell Park', 'Bradford-on-Avon, Wiltshire', 18, 126, 71.0, 71, 'manual', true),
  ('Cumberwell Park — Yellow/Red',    'Cumberwell Park', 'Bradford-on-Avon, Wiltshire', 18, 126, 71.0, 71, 'manual', true),
  ('Cumberwell Park — Blue/Orange',   'Cumberwell Park', 'Bradford-on-Avon, Wiltshire', 18, 125, 71.5, 71, 'manual', true),
  ('Cumberwell Park — Orange/Blue',   'Cumberwell Park', 'Bradford-on-Avon, Wiltshire', 18, 125, 71.5, 71, 'manual', true),
  ('Cumberwell Park — Red/Blue',      'Cumberwell Park', 'Bradford-on-Avon, Wiltshire', 18, 126, 72.5, 71, 'manual', true),
  ('Cumberwell Park — Blue/Red',      'Cumberwell Park', 'Bradford-on-Avon, Wiltshire', 18, 126, 72.5, 71, 'manual', true),
  ('Cumberwell Park — Blue/Yellow',   'Cumberwell Park', 'Bradford-on-Avon, Wiltshire', 18, 129, 71.5, 72, 'manual', true),
  ('Cumberwell Park — Yellow/Blue',   'Cumberwell Park', 'Bradford-on-Avon, Wiltshire', 18, 129, 71.5, 72, 'manual', true),
  ('Cumberwell Park — Orange/Yellow', 'Cumberwell Park', 'Bradford-on-Avon, Wiltshire', 18, 125, 70.0, 71, 'manual', true),
  ('Cumberwell Park — Yellow/Orange', 'Cumberwell Park', 'Bradford-on-Avon, Wiltshire', 18, 125, 70.0, 71, 'manual', true),
  ('Cumberwell Park — Red/Orange',    'Cumberwell Park', 'Bradford-on-Avon, Wiltshire', 18, 122, 71.0, 71, 'manual', true),
  ('Cumberwell Park — Orange/Red',    'Cumberwell Park', 'Bradford-on-Avon, Wiltshire', 18, 122, 71.0, 71, 'manual', true),
  ('Cumberwell Park — White/White',   'Cumberwell Park', 'Bradford-on-Avon, Wiltshire', 18, 111, 68.2, 70, 'manual', true),
  ('Cumberwell Park — Par 3/Par 3',   'Cumberwell Park', 'Bradford-on-Avon, Wiltshire', 18,   0,  0.0, 54, 'manual', true)
on conflict (name) do nothing;
