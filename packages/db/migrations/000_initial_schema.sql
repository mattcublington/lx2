-- ================================================================
-- Migration: 000_initial_schema.sql
-- Purpose:   Complete initial schema — safe to re-run (IF NOT EXISTS
--            guards throughout). Exactly reproduces the live lx2-dev
--            schema as of 2026-03-23. Run this on an empty database
--            before applying numbered migrations.
--
-- Tables (22):
--   users, clubs, club_user_roles, club_members,
--   courses, course_holes, course_tees,
--   loops, loop_holes, loop_hole_tees,
--   course_combinations, combination_tees,
--   course_loops, tee_sheet_rules, tee_slots, bookings,
--   events, club_competitions,
--   event_players, scorecards, hole_scores, contest_entries
--
-- Functions (4): is_club_staff, has_club_role,
--                update_tee_slot_booked_count, search_user_profiles
-- Trigger   (1): bookings_count_trigger
-- ================================================================


-- ================================================================
-- EXTENSIONS
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


-- ================================================================
-- USERS
-- Mirror of auth.users with profile data. Own-row access only;
-- cross-user search goes through search_user_profiles().
-- INSERT is handled server-side via service_role (auth callback,
-- startRound action); no client INSERT policy exists.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id             uuid        NOT NULL,
  email          text        NOT NULL,
  display_name   text,
  handicap_index numeric,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON public.users (email);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- CLUBS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.clubs (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  slug       text        NOT NULL,
  address    text,
  logo_url   text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS clubs_slug_key ON public.clubs (slug);

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- CLUB_USER_ROLES
-- ================================================================
CREATE TABLE IF NOT EXISTS public.club_user_roles (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  club_id    uuid        NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text        NOT NULL
             CHECK (role = ANY (ARRAY['admin'::text, 'secretary'::text, 'bar_staff'::text, 'pro_shop'::text])),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS club_user_roles_club_id_user_id_role_key
  ON public.club_user_roles (club_id, user_id, role);

ALTER TABLE public.club_user_roles ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- CLUB_MEMBERS
-- Imported or linked members. user_id nullable until linked.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.club_members (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  club_id         uuid        NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  email           text        NOT NULL,
  display_name    text        NOT NULL,
  membership_type text        NOT NULL DEFAULT 'full'::text
                  CHECK (membership_type = ANY (ARRAY['full'::text, 'junior'::text, 'senior'::text,
                                                      'associate'::text, 'visitor'::text, 'five_day'::text])),
  handicap_index  numeric,
  status          text        NOT NULL DEFAULT 'active'::text
                  CHECK (status = ANY (ARRAY['active'::text, 'suspended'::text, 'lapsed'::text])),
  cdh_number      text,
  imported_at     timestamptz,
  linked_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS club_members_club_id_email_key
  ON public.club_members (club_id, email);

ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- COURSES
-- Reference data sourced from courses.ts. Writes restricted to
-- service_role (server-side admin actions only).
-- ================================================================
CREATE TABLE IF NOT EXISTS public.courses (
  id            uuid        NOT NULL DEFAULT extensions.uuid_generate_v4(),
  name          text        NOT NULL,
  club          text,
  location      text,
  holes_count   smallint    NOT NULL DEFAULT 18,
  slope_rating  smallint,
  course_rating numeric,
  par           smallint,
  source        text        NOT NULL DEFAULT 'manual'::text,
  verified      boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  club_id       uuid        REFERENCES public.clubs(id) ON DELETE SET NULL,
  PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS courses_name_unique
  ON public.courses (name);

CREATE INDEX IF NOT EXISTS courses_club_id_idx
  ON public.courses (club_id) WHERE (club_id IS NOT NULL);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- COURSE_HOLES
-- ================================================================
CREATE TABLE IF NOT EXISTS public.course_holes (
  id           uuid     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  course_id    uuid     NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  hole_number  smallint NOT NULL,
  par          smallint NOT NULL,
  stroke_index smallint NOT NULL,
  PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS course_holes_course_id_hole_number_key
  ON public.course_holes (course_id, hole_number);

ALTER TABLE public.course_holes ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- COURSE_TEES
-- Per-course tee box data (yardages + ratings).
-- ================================================================
CREATE TABLE IF NOT EXISTS public.course_tees (
  id            uuid       NOT NULL DEFAULT extensions.uuid_generate_v4(),
  course_id     uuid       NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  tee_name      text       NOT NULL,
  yardages      smallint[] NOT NULL,
  total_yards   smallint,
  slope_rating  smallint,
  course_rating numeric,
  PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS course_tees_course_id_tee_name_key
  ON public.course_tees (course_id, tee_name);

ALTER TABLE public.course_tees ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- LOOPS
-- A 9-hole routing. Two loops compose a course_combination.
-- course_id nullable: loops may exist before a course DB row.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.loops (
  id         uuid        NOT NULL DEFAULT extensions.uuid_generate_v4(),
  course_id  uuid        REFERENCES public.courses(id) ON DELETE SET NULL,
  name       text        NOT NULL,
  holes      integer     NOT NULL DEFAULT 9,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS loops_course_id_name_key
  ON public.loops (course_id, name);

ALTER TABLE public.loops ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- LOOP_HOLES
-- ================================================================
CREATE TABLE IF NOT EXISTS public.loop_holes (
  id          uuid     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  loop_id     uuid     NOT NULL REFERENCES public.loops(id) ON DELETE CASCADE,
  hole_number smallint NOT NULL,
  par         smallint NOT NULL,
  si_m        smallint,
  si_w        smallint,
  PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS loop_holes_loop_id_hole_number_key
  ON public.loop_holes (loop_id, hole_number);

ALTER TABLE public.loop_holes ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- LOOP_HOLE_TEES
-- Yardage per hole per tee colour.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.loop_hole_tees (
  id           uuid     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  loop_hole_id uuid     NOT NULL REFERENCES public.loop_holes(id) ON DELETE CASCADE,
  tee_colour   text     NOT NULL,
  yards        smallint NOT NULL,
  PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS loop_hole_tees_loop_hole_id_tee_colour_key
  ON public.loop_hole_tees (loop_hole_id, tee_colour);

ALTER TABLE public.loop_hole_tees ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- COURSE_COMBINATIONS
-- An 18-hole combination built from two 9-hole loops.
-- course_id nullable: combinations may exist before a course DB row.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.course_combinations (
  id         uuid        NOT NULL DEFAULT extensions.uuid_generate_v4(),
  course_id  uuid        REFERENCES public.courses(id) ON DELETE SET NULL,
  name       text        NOT NULL,
  par        smallint    NOT NULL,
  holes      smallint    NOT NULL DEFAULT 18,
  loop_1_id  uuid        NOT NULL REFERENCES public.loops(id),
  loop_2_id  uuid        NOT NULL REFERENCES public.loops(id),
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS course_combinations_course_id_name_key
  ON public.course_combinations (course_id, name);

ALTER TABLE public.course_combinations ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- COMBINATION_TEES
-- WHS slope/course ratings for each combination × tee colour × gender.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.combination_tees (
  id             uuid     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  combination_id uuid     NOT NULL REFERENCES public.course_combinations(id) ON DELETE CASCADE,
  tee_colour     text     NOT NULL,
  gender         text     NOT NULL DEFAULT 'm'::text
                 CHECK (gender = ANY (ARRAY['m'::text, 'w'::text])),
  slope_rating   smallint,
  course_rating  numeric,
  PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS combination_tees_combination_id_tee_colour_gender_key
  ON public.combination_tees (combination_id, tee_colour, gender);

ALTER TABLE public.combination_tees ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- COURSE_LOOPS  (tee-sheet routing — club management)
-- Separate from the scoring "loops" above. Represents a 9-hole
-- routing used for tee-sheet slot generation.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.course_loops (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  club_id    uuid        NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  holes      smallint    NOT NULL DEFAULT 9,
  par        smallint,
  colour_hex text,
  sort_order smallint    NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.course_loops ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- TEE_SHEET_RULES
-- Defines slot generation rules per loop per date range.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.tee_sheet_rules (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid(),
  club_id               uuid        NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  loop_id               uuid        NOT NULL REFERENCES public.course_loops(id) ON DELETE CASCADE,
  slot_interval_minutes smallint    NOT NULL DEFAULT 10,
  capacity_per_slot     smallint    NOT NULL DEFAULT 4,
  open_time             time        NOT NULL DEFAULT '07:00:00'::time,
  close_time            time        NOT NULL DEFAULT '17:00:00'::time,
  member_only_until     time,
  applies_weekdays      boolean     NOT NULL DEFAULT true,
  applies_weekends      boolean     NOT NULL DEFAULT true,
  valid_from            date        NOT NULL DEFAULT CURRENT_DATE,
  valid_to              date,
  created_at            timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.tee_sheet_rules ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- TEE_SLOTS
-- Generated tee-time slots for a specific date.
-- booked_count maintained by bookings_count_trigger.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.tee_slots (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  club_id      uuid        NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  loop_id      uuid        NOT NULL REFERENCES public.course_loops(id) ON DELETE CASCADE,
  slot_date    date        NOT NULL,
  slot_time    time        NOT NULL,
  capacity     smallint    NOT NULL DEFAULT 4,
  booked_count smallint    NOT NULL DEFAULT 0,
  slot_type    text        NOT NULL DEFAULT 'member'::text
               CHECK (slot_type = ANY (ARRAY['member'::text, 'visitor'::text, 'society'::text, 'blocked'::text])),
  price_pence  integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS tee_slots_loop_id_slot_date_slot_time_key
  ON public.tee_slots (loop_id, slot_date, slot_time);

ALTER TABLE public.tee_slots ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- BOOKINGS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  tee_slot_id  uuid        NOT NULL REFERENCES public.tee_slots(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guests       smallint    NOT NULL DEFAULT 0,
  status       text        NOT NULL DEFAULT 'confirmed'::text
               CHECK (status = ANY (ARRAY['confirmed'::text, 'cancelled'::text, 'no_show'::text])),
  payment_id   text,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  PRIMARY KEY (id)
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- EVENTS
-- A round or competition. organiser = created_by.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.events (
  id                     uuid        NOT NULL DEFAULT extensions.uuid_generate_v4(),
  created_by             uuid        NOT NULL REFERENCES public.users(id),
  course_id              uuid        NOT NULL REFERENCES public.courses(id),
  combination_id         uuid        REFERENCES public.course_combinations(id),
  tee_id                 uuid        REFERENCES public.course_tees(id),
  name                   text        NOT NULL,
  date                   date        NOT NULL,
  format                 text        NOT NULL
                         CHECK (format = ANY (ARRAY['stableford'::text, 'strokeplay'::text, 'matchplay'::text])),
  round_type             text        NOT NULL DEFAULT '18'::text
                         CHECK (round_type = ANY (ARRAY['18'::text, '9'::text])),
  loop_id                uuid        REFERENCES public.loops(id),
  handicap_allowance_pct numeric     NOT NULL DEFAULT 0.95,
  entry_fee_pence        integer,
  max_players            smallint,
  group_size             smallint    NOT NULL DEFAULT 4,
  ntp_holes              smallint[]  NOT NULL DEFAULT '{}'::smallint[],
  ld_holes               smallint[]  NOT NULL DEFAULT '{}'::smallint[],
  is_public              boolean     NOT NULL DEFAULT false,
  finalised              boolean     NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now(),
  club_id                uuid        REFERENCES public.clubs(id),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS events_club_id_idx
  ON public.events (club_id) WHERE (club_id IS NOT NULL);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- CLUB_COMPETITIONS
-- A club-managed competition that may link to an event.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.club_competitions (
  id               uuid        NOT NULL DEFAULT gen_random_uuid(),
  club_id          uuid        NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  competition_date date        NOT NULL,
  format           text        NOT NULL DEFAULT 'stableford'::text
                   CHECK (format = ANY (ARRAY['stableford'::text, 'strokeplay'::text, 'matchplay'::text,
                                              'texas_scramble'::text, 'pairs_betterball'::text])),
  loop_ids         uuid[]      NOT NULL DEFAULT '{}'::uuid[],
  entry_fee_pence  integer     NOT NULL DEFAULT 0,
  max_entries      integer,
  entries_count    integer     NOT NULL DEFAULT 0,
  notes            text,
  status           text        NOT NULL DEFAULT 'scheduled'::text
                   CHECK (status = ANY (ARRAY['scheduled'::text, 'entries_open'::text, 'closed'::text,
                                              'in_progress'::text, 'completed'::text, 'cancelled'::text])),
  created_at       timestamptz NOT NULL DEFAULT now(),
  event_id         uuid        REFERENCES public.events(id) ON DELETE SET NULL,
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS club_competitions_event_id_idx
  ON public.club_competitions (event_id) WHERE (event_id IS NOT NULL);

ALTER TABLE public.club_competitions ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- EVENT_PLAYERS
-- user_id is nullable: NULL = anonymous (guest) player.
-- Anonymous player writes go through server actions (service_role).
-- ================================================================
CREATE TABLE IF NOT EXISTS public.event_players (
  id             uuid        NOT NULL DEFAULT extensions.uuid_generate_v4(),
  event_id       uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id        uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  display_name   text        NOT NULL,
  handicap_index numeric     NOT NULL,
  rsvp_status    text        NOT NULL DEFAULT 'invited'::text
                 CHECK (rsvp_status = ANY (ARRAY['invited'::text, 'confirmed'::text,
                                                 'declined'::text, 'waitlisted'::text])),
  payment_status text        NOT NULL DEFAULT 'unpaid'::text
                 CHECK (payment_status = ANY (ARRAY['unpaid'::text, 'paid'::text,
                                                    'refunded'::text, 'waived'::text])),
  flight_number  smallint,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.event_players ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- SCORECARDS
-- One scorecard per player per event.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.scorecards (
  id              uuid        NOT NULL DEFAULT extensions.uuid_generate_v4(),
  event_id        uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  event_player_id uuid        NOT NULL REFERENCES public.event_players(id) ON DELETE CASCADE,
  round_type      text        NOT NULL DEFAULT '18'::text
                  CHECK (round_type = ANY (ARRAY['18'::text, '9'::text])),
  loop_id         uuid        REFERENCES public.loops(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  submitted_at    timestamptz,
  PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS scorecards_event_id_event_player_id_key
  ON public.scorecards (event_id, event_player_id);

ALTER TABLE public.scorecards ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- HOLE_SCORES
-- One row per hole per scorecard. Upserted as player scores each hole.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.hole_scores (
  id            uuid        NOT NULL DEFAULT extensions.uuid_generate_v4(),
  scorecard_id  uuid        NOT NULL REFERENCES public.scorecards(id) ON DELETE CASCADE,
  hole_number   smallint    NOT NULL,
  gross_strokes smallint,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS hole_scores_scorecard_id_hole_number_key
  ON public.hole_scores (scorecard_id, hole_number);

ALTER TABLE public.hole_scores ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- CONTEST_ENTRIES
-- NTP (nearest the pin) and LD (longest drive) results.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.contest_entries (
  id              uuid        NOT NULL DEFAULT extensions.uuid_generate_v4(),
  event_id        uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  hole_number     smallint    NOT NULL,
  type            text        NOT NULL
                  CHECK (type = ANY (ARRAY['ntp'::text, 'ld'::text])),
  event_player_id uuid        NOT NULL REFERENCES public.event_players(id) ON DELETE CASCADE,
  distance_cm     integer,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.contest_entries ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- FUNCTIONS
-- ================================================================

-- Returns true if the current user has any staff role at the club.
CREATE OR REPLACE FUNCTION public.is_club_staff(p_club_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_user_roles
    WHERE club_id = p_club_id
      AND user_id = auth.uid()
  );
$$;

-- Returns true if the current user holds a specific role at the club.
CREATE OR REPLACE FUNCTION public.has_club_role(p_club_id uuid, p_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_user_roles
    WHERE club_id = p_club_id
      AND user_id = auth.uid()
      AND role = p_role
  );
$$;

-- Maintains tee_slots.booked_count on booking insert/cancel.
CREATE OR REPLACE FUNCTION public.update_tee_slot_booked_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
    UPDATE public.tee_slots
       SET booked_count = booked_count + 1 + NEW.guests
     WHERE id = NEW.tee_slot_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND NEW.status = 'cancelled' THEN
    UPDATE public.tee_slots
       SET booked_count = booked_count - 1 - OLD.guests
     WHERE id = NEW.tee_slot_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Safe user search: exposes only id/display_name/handicap_index to
-- authenticated users. Bypasses RLS on users but enforces auth check
-- and column restriction internally. See also: 001_rls_policies.sql.
CREATE OR REPLACE FUNCTION public.search_user_profiles(search_query text)
RETURNS TABLE (id uuid, display_name text, handicap_index numeric)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.display_name, u.handicap_index
  FROM users u
  WHERE u.display_name ILIKE '%' || search_query || '%'
    AND u.id != auth.uid()
    AND auth.uid() IS NOT NULL
  ORDER BY u.display_name
  LIMIT 8;
$$;

REVOKE ALL ON FUNCTION public.search_user_profiles(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_user_profiles(text) TO authenticated;


-- ================================================================
-- TRIGGERS
-- ================================================================
DROP TRIGGER IF EXISTS bookings_count_trigger ON public.bookings;
CREATE TRIGGER bookings_count_trigger
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_tee_slot_booked_count();
