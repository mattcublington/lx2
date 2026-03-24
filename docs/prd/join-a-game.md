# PRD: Join a Game

**Module:** `join_a_game`
**Phase:** Soon
**Status:** Planned
**Last updated:** March 2026

---

## Problem

Currently, the only way to join an LX2 event is via a direct link shared by the organiser. There's no way for a golfer to discover public events — if you're a single player looking for a game on Saturday, or a two-ball wanting to join an existing group, you're out of luck. Golf is inherently social, and many clubs and societies would benefit from open events that anyone can browse and join.

## Goal

A searchable directory of public events that lets golfers discover, filter, and join games near them. One-tap join for authenticated users.

## Users

- **Primary:** A golfer looking for a game — either a solo player or a small group wanting to join an existing event
- **Secondary:** Society organisers who want to fill remaining spots in their event
- **Tertiary:** New LX2 users exploring what's available before creating their own event

## Core requirements

### Must have

- **Browse page at `/events` or `/play/find`**
- **Event listing:** card-based grid showing public events (`events.is_public = true`) that haven't reached `max_players` and have a future date
- **Event card contents:**
  - Event name
  - Date (formatted: day, date month)
  - Course name
  - Format badge (Stableford / Stroke Play / Match Play)
  - Player count / max players ("8/16 players")
  - Entry fee (or "Free")
  - Available spots count
- **Filters:**
  - Date range (today, this week, this month, custom)
  - Course / location (text search)
  - Format (Stableford, Stroke Play, Match Play, Any)
  - Entry fee (free only, paid only, any)
  - Available spots (has spots, any)
- **Sort options:**
  - Date (soonest first — default)
  - Distance from user (requires geolocation permission)
  - Most spots available
- **Search:** free-text search across event name and course name
- **One-tap join:** authenticated users see "Join" button directly on the card. Tapping opens inline confirm dialog (pre-filled name + handicap), then calls `joinEvent` server action
- **Empty state:** "No events found" with prompt to create your own

### Should have

- Geolocation-based "Near me" default sort (with fallback to date sort if permission denied)
- Map view toggle showing event locations on a map (course coordinates from course database)
- "Notify me" for events at a specific course (email notification when new event is created there)
- Saved searches / favourite courses

### Won't have (this phase)

- Event recommendations based on past play history
- Social graph ("your friends are playing")
- In-app messaging between players before the event
- Ratings or reviews of events/organisers
- Multi-event packages or season passes

## Data model

```sql
-- Read from:
events (
  id, name, date, format, entry_fee_pence, max_players,
  group_size, is_public, combination_id, created_by,
  course_combinations(name, courses(name, latitude, longitude))
)

-- Aggregate:
event_players (event_id, rsvp_status)
  -> COUNT WHERE rsvp_status = 'confirmed' as player_count

-- Filter:
WHERE is_public = true
  AND date >= CURRENT_DATE
  AND (max_players IS NULL OR player_count < max_players)
ORDER BY date ASC
```

## Search implementation

- Full-text search using Postgres `tsvector` on `events.name` and course name (via join)
- Alternatively, `ILIKE` pattern match for simple substring search in MVP
- Course location search: match against `courses.name` or future `courses.postcode` / `courses.region` columns

## Page layout

- Header: "Find a game" title with search input
- Filter bar: horizontal scrolling pills for quick filters (This week, Free, Stableford, etc.)
- Advanced filters: expandable panel with date range, format, fee range
- Results: responsive card grid (1 column mobile, 2 columns tablet, 3 columns desktop)
- Pagination: "Load more" button or infinite scroll (limit 20 per page)

## Open questions

- [ ] Should we show the organiser's name on the event card? (Privacy consideration)
- [ ] Do we need a "request to join" flow for semi-private events?
- [ ] How do we prevent spam events in the public directory?
- [ ] Should courses have verified locations, or do we use the course database coordinates?
- [ ] Do we show events from the past 24 hours that are still in progress?

## Links

- Event landing page: `apps/web/src/app/events/[id]/page.tsx`
- Join actions: `apps/web/src/app/events/[id]/actions.ts`
- Related PRD: `docs/prd/event-landing.md`
- Related PRD: `docs/prd/invite.md`
- Related PRD: `docs/prd/event-creation.md`
