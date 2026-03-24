# PRD: Player Profile

**Module:** `player_profile`
**Phase:** Soon
**Status:** Planned
**Last updated:** March 2026

---

## Problem

Golfers care deeply about their handicap and scoring trends. Today LX2 shows a handicap number on the dashboard but provides no context — how it's changed, what rounds contributed, or how the player is performing over time. Players need a profile page that serves as their personal golf record and gives them a reason to keep using LX2 between events.

## Goal

A player profile page showing handicap history, round history, and key stats. Editable personal details. Privacy controls for what other players can see.

## Users

- **Primary:** The golfer viewing their own profile to track progress
- **Secondary:** Other players viewing a competitor's profile (with privacy controls)
- **Tertiary:** The organiser checking a player's handicap before an event

## Core requirements

### Must have

- **Profile page at `/profile` (own) and `/players/[id]` (public view)**

- **Identity section:**
  - Display name (editable)
  - Avatar (initials-based, with optional photo upload later)
  - Member since date
  - Email (visible to self only)

- **Handicap section:**
  - Current handicap index displayed prominently
  - Editable handicap index field (manual override until automated calculation is built)
  - Handicap history chart: line graph showing handicap index over time
  - Data points: one per round played, x-axis = date, y-axis = handicap index
  - Tooltip on hover: date, event name, handicap at that point

- **Round history:**
  - List of all rounds played on LX2, newest first
  - Each row: event name, course, date, format, gross score, net score, Stableford points
  - Tap to navigate to full scorecard
  - Pagination or infinite scroll for long histories

- **Stats section:**
  - Scoring average (gross and net, last 20 rounds)
  - Best gross score
  - Best net score / highest Stableford points
  - Rounds played (total and per format)
  - Average Stableford points per round
  - Most played course

- **Edit profile:**
  - Display name: text input, saves to `users.display_name`
  - Handicap index: numeric input (0-54, 0.1 step), saves to `users.handicap_index`
  - Server action for save (optimistic update in UI)

- **Privacy controls:**
  - Toggle: "Show my profile to other players" (default: on)
  - Toggle: "Show my handicap on leaderboards" (default: on)
  - When profile is private, `/players/[id]` shows "This profile is private"

### Should have

- Stats breakdown by format (Stableford average, Stroke Play average separately)
- GIR (greens in regulation) percentage — requires per-hole GIR tracking in score entry
- Average putts per round — requires putts tracking in score entry
- Fairways hit percentage
- Scoring distribution chart (histogram of scores relative to par)

### Won't have (this phase)

- Official WHS handicap calculation (requires minimum 54-hole history and specific differential formula)
- Handicap certificate generation
- Social features (follow players, activity feed)
- Achievement badges or gamification
- Photo gallery of rounds

## Data model

```sql
-- Existing:
users (
  id uuid PRIMARY KEY,
  email text,
  display_name text,
  handicap_index numeric(4,1),
  created_at timestamptz
)

-- New:
user_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id),
  profile_public boolean DEFAULT true,
  show_handicap boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
)

handicap_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  handicap_index numeric(4,1) NOT NULL,
  scorecard_id uuid REFERENCES scorecards(id),
  recorded_at timestamptz DEFAULT now()
)

-- Read from:
scorecards (id, event_id, event_player_id, created_at, submitted_at)
hole_scores (scorecard_id, hole_number, gross_strokes)
events (id, name, date, format, course_id)
courses (id, name)
```

## Handicap history tracking

On scorecard submission:
1. Calculate new handicap index (manual for MVP; WHS-compliant later)
2. Insert row into `handicap_history` with current index, linked to scorecard
3. Update `users.handicap_index` with latest value

For the chart, query `handicap_history` ordered by `recorded_at` and plot as a time series.

## Open questions

- [ ] Should we implement WHS differential calculation now or defer? (WHS requires slope rating, course rating, and playing conditions calculation — complex)
- [ ] Profile photos: Supabase Storage upload or pull from Google OAuth avatar?
- [ ] Should stats include all rounds or only LX2 society rounds? (Players may want to log casual rounds too)
- [ ] Do we need an "export my data" feature for GDPR compliance?
- [ ] Should the profile link in the bottom nav be active now or wait for this feature?

## Links

- Play dashboard (links to profile): `apps/web/src/app/play/PlayDashboard.tsx`
- Users table: `packages/db/migrations/001_initial_schema.sql`
- Auth callback (profile creation): `apps/web/src/app/auth/callback/route.ts`
- Related PRD: `docs/prd/player-home.md`
- Related PRD: `docs/prd/score-entry.md`
