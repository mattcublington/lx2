# PRD: My Club Dashboard

**Module:** `my_club_dashboard`
**Phase:** Soon
**Status:** Planned
**Last updated:** March 2026

---

## Problem

Golfers who are members of a club need a dedicated section in LX2 that reflects their club membership. Currently, a club member using LX2 sees the same generic dashboard as a casual society player. There's no visibility of upcoming club competitions, no way to enter them through LX2, and no connection between their LX2 profile and their club membership status. This makes LX2 feel like a society-only tool rather than a platform that covers all of a golfer's competitive play.

## Goal

A player-facing club section within the LX2 app showing club membership details, upcoming club competitions, booking history, and quick links to enter competitions and book tee times at their home club.

## Users

- **Primary:** A golfer who is a member of a connected LX2 club
- **Secondary:** A member of multiple clubs who wants a unified view
- **Tertiary:** A prospective member exploring what the club offers through LX2

## Core requirements

### Must have

- **Club section at `/play/club` or within the play dashboard:**
  - Club name and logo
  - Membership category (Full, 5-day, Junior, Social, etc.)
  - Membership number (if applicable)
  - Home course details: name, course rating, slope rating per tee

- **Upcoming competitions:**
  - List of club competitions the player is eligible for (filtered by membership category and gender)
  - Each entry: competition name, date, format (Stableford/Medal/Matchplay/Knockout), entry fee, spots remaining
  - Status badges: "Open for entry", "Entered", "Draw published", "In progress", "Results available"
  - Tap to view details or enter (see `club_competition_entry` PRD)

- **My entries:**
  - List of competitions the player has entered
  - Tee time (if draw is published)
  - Playing partners
  - Cancel entry (up to deadline)

- **Booking history:**
  - Recent tee time bookings at the home club
  - Status: upcoming, completed, cancelled
  - Quick re-book action for recurring slots

- **Club notices:**
  - Announcements from the club (course condition, temporary rules, social events)
  - Simple text + date format, newest first
  - Read/unread indicator

### Should have

- **Handicap integration:**
  - Display official WHS handicap index (synced from club system where available)
  - Last 20 qualifying scores table (scores contributing to handicap calculation)
  - Next qualifying competition highlighted

- **Club leaderboards:**
  - Running year-to-date Order of Merit / Eclectic
  - Monthly medal results archive
  - Player's position in club competitions

- **Multi-club support:**
  - Players who are members of multiple clubs see a club switcher
  - Each club has its own section with independent data
  - Primary club marked as default

### Won't have (this phase)

- Club social features (messaging, forums)
- Membership renewal / payment through LX2
- Club governance (AGM voting, committee features)
- Coaching or lesson booking
- Club merchandise shop
- Handicap committee review workflow

## Data model

```sql
-- New tables:
clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_path text,                    -- Supabase Storage
  course_id uuid REFERENCES courses(id),
  address text,
  website text,
  phone text,
  created_at timestamptz DEFAULT now()
)

club_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES clubs(id),
  user_id uuid REFERENCES users(id),
  membership_number text,
  category text NOT NULL,            -- 'full' | '5day' | 'junior' | 'social' | 'honorary'
  gender text,                       -- 'm' | 'f' | null
  is_primary boolean DEFAULT false,
  verified boolean DEFAULT false,    -- club admin has confirmed membership
  joined_date date,
  expires_date date,
  created_at timestamptz DEFAULT now(),
  UNIQUE (club_id, user_id)
)

club_competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES clubs(id),
  event_id uuid REFERENCES events(id),  -- links to LX2 event for scoring
  name text NOT NULL,
  date date NOT NULL,
  format text NOT NULL,
  entry_fee_pence integer,
  max_players smallint,
  entry_deadline timestamptz,
  eligible_categories text[],        -- e.g. ['full', '5day']
  eligible_gender text,              -- 'm' | 'f' | null (null = open)
  is_qualifying boolean DEFAULT true, -- counts for handicap
  status text DEFAULT 'open',        -- 'open' | 'closed' | 'draw_published' | 'in_progress' | 'finalised'
  draw_published_at timestamptz,
  created_at timestamptz DEFAULT now()
)

club_competition_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid REFERENCES club_competitions(id),
  user_id uuid REFERENCES users(id),
  tee_time time,                     -- set when draw is published
  group_number smallint,
  status text DEFAULT 'entered',     -- 'entered' | 'withdrawn' | 'no_show'
  created_at timestamptz DEFAULT now(),
  UNIQUE (competition_id, user_id)
)

club_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES clubs(id),
  title text NOT NULL,
  body text NOT NULL,
  published_at timestamptz DEFAULT now(),
  expires_at timestamptz
)
```

## Club onboarding flow

1. Club registers on `club.lx2.golf` (organiser app)
2. Club admin enters club details, links to course in LX2 database
3. Admin uploads member list (CSV: name, email, membership number, category)
4. LX2 matches members to existing users by email
5. Unmatched members receive email invite to join LX2
6. Members see their club section after matching

## Open questions

- [ ] How do we verify club membership? (Admin approval? Membership number validation?)
- [ ] Should club competitions auto-create LX2 events, or should organiser do it manually?
- [ ] How do we handle the draw? (Manual by club captain, or auto-generate based on handicap?)
- [ ] Do we need a "fixture list" view (calendar of all competitions for the year)?
- [ ] Should club notices support rich text or just plain text?
- [ ] How do we handle temporary members or visitors paying green fees?

## Links

- Play dashboard: `apps/web/src/app/play/PlayDashboard.tsx`
- Club admin app: `apps/club/` (to be built)
- Related PRD: `docs/prd/player-home.md`
- Related PRD: `docs/prd/club-competition-entry.md`
- Related PRD: `docs/prd/tee-booking.md`
