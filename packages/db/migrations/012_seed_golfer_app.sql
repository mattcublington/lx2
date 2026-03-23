-- ─────────────────────────────────────────────────────────────────────────────
-- 012_seed_golfer_app.sql
--
-- Seeds the Cumberwell Park course data into the golfer app tables
-- (public.courses) so the startRound server action can find/create events.
--
-- Also:
--   • Adds a unique constraint on courses.name (prevents duplicate entries
--     from repeated inserts and makes .single() safe)
--   • Adds an authenticated-user INSERT policy on courses (fallback for any
--     combination not yet seeded)
--
-- CR/SR values sourced from cumberwell_scorecards_v3.json (March 2026) and
-- USGA NCRDB (CourseIDs 22312–22317). These reflect Yellow/standard men tees.
-- Per-tee values (combination_tees) will be added in migration 013 once
-- official WHS submissions for all tee colours are verified.
--
-- Run in Supabase dashboard → SQL Editor, or via `supabase db push`.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Unique constraint on courses.name — prevents duplicate rows and makes
--    the .eq('name', ...).single() lookup in startRound safe.
--    PostgreSQL doesn't support ADD CONSTRAINT IF NOT EXISTS, so use a DO block.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'courses_name_unique'
      and conrelid = 'public.courses'::regclass
  ) then
    alter table public.courses add constraint courses_name_unique unique (name);
  end if;
end $$;

-- 2. INSERT policy — allows authenticated users to create new course records.
--    This acts as a fallback when a combination is not yet pre-seeded.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'courses'
      and policyname = 'Authenticated users can insert courses'
  ) then
    execute $policy$
      create policy "Authenticated users can insert courses"
        on public.courses for insert
        with check (auth.uid() is not null)
    $policy$;
  end if;
end $$;

-- 3. Seed all 14 Cumberwell Park 18-hole combinations.
--    CR/SR = Yellow (standard / men) tees — same values as in courses.ts.
--    Par 3/Par 3 has no WHS rating (0 values), which is correct.
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
