# PRD: Player Home (Play Dashboard)

**Module:** `player_home`
**Phase:** MVP
**Status:** Done
**Last updated:** March 2026

---

## Problem

After signing in, a golfer needs a home screen that answers three questions: "What's my handicap?", "What have I played recently?", and "What do I do next?". Without a clear dashboard, players bounce between pages trying to find their scorecard or figure out how to start a round.

## Goal

A mobile-first player dashboard at `/play` that shows the user's identity, handicap, recent rounds, and provides a single prominent action to start or resume a round.

## Users

- **Primary:** An authenticated golfer who has signed in via Google OAuth
- **Secondary:** A returning player checking their round history

## Core requirements

### Must have

- Protected route: requires authentication, redirects to `/auth/login` if unauthenticated
- Dark hero header with background image (`/hero.png`), gradient overlay, player identity:
  - Time-of-day greeting ("Good morning/afternoon/evening")
  - Full display name in `DM Serif Display` 400, large (`2.875rem` mobile, `clamp(2.25rem, 5vw, 3.75rem)` desktop)
  - Avatar circle with initials (derived from display name, split on spaces and `@`)
  - Handicap index badge (pill, `HCP` label + value, shown only if set)
  - Round count stat
- Primary action button:
  - "Start a new round" (green, links to `/play/new`) when no active round
  - "Join ongoing round" (white outline variant, links to `/rounds/[id]/score`) when `activeRoundId` is set
- Recent rounds list in a card with shadow:
  - Each row: colour bar (format-coded: green Stableford, blue Stroke Play, amber Match Play), event name, format tag, course name, date, chevron
  - Links to `/rounds/[id]/score`
  - Empty state: "No rounds yet" with prompt to start first round
- Profile link in header pill (links to `/profile`)
- Sign-out: button in header (desktop), bottom nav (mobile)
- Mobile bottom navigation bar: Home (active), History, Play (centred, elevated green circle), Stats, Profile
- Desktop: bottom nav hidden, sign-out in header, hover effects on round rows

### Should have

- Rise animation on main content cards (`opacity 0->1`, `translateY(18px->0)`, cubic-bezier easing)
- Format-specific accent colours on round list bars and tags
- Responsive layout: single column, `max-width: 720px` body

### Won't have (this phase)

- Handicap history chart (see `player_profile` PRD)
- Stats tab content (bottom nav button present but inactive)
- History tab with filtering/search
- Society membership list
- Upcoming events section

## Data flow

Server component (`/play/page.tsx`) fetches:
1. Authenticated user via `createClient().auth.getUser()`
2. User profile from `users` table (display_name, handicap_index)
3. Recent rounds: `scorecards` joined to `events` joined to `courses` and `course_combinations`, ordered by `created_at` desc, limited to recent entries
4. Active round detection: checks for unfinished scorecard

Props passed to `PlayDashboard` client component:
```typescript
interface Props {
  userId: string
  displayName: string
  rounds: RoundRow[]
  handicapIndex?: number | null
  roundsCount?: number
  activeRoundId?: string | null
}
```

## Data model

```sql
-- Read from:
users (id, display_name, handicap_index)

scorecards (id, event_id, event_player_id, created_at, submitted_at)
  -> events (name, date, format, course_id, combination_id)
     -> courses (name)
     -> course_combinations (name)
```

## Design tokens

| Token | Value |
|-------|-------|
| Heading font | `DM Serif Display` 400 via `--font-dm-serif` |
| Body font | `DM Sans` 300-700 via `--font-dm-sans` |
| Header dark | `#0a1f0a` |
| Accent green | `#0D631B` |
| Hover green | `#0a4f15` |
| App background | `#F2F5F0` |
| Card border | `#E0EBE0` |
| Muted text | `#6B8C6B` |
| Body text | `#1A2E1A` |
| Card radius | `20px` |
| Button radius (app) | `12px` / `16px` |

## Open questions

- [ ] Should the dashboard show upcoming events the player has joined?
- [ ] When do we activate the History and Stats bottom nav tabs?
- [ ] Should we show a "Join event" input on the dashboard (like the homepage code input)?

## Links

- Component: `apps/web/src/app/play/PlayDashboard.tsx`
- Server page: `apps/web/src/app/play/page.tsx`
- Related PRD: `docs/prd/player-profile.md`
- Related PRD: `docs/prd/score-entry.md`
