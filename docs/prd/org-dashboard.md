# PRD: Organiser Dashboard

**Module:** `org_dashboard`
**Phase:** Soon
**Status:** Planned
**Last updated:** March 2026

---

## Problem

Society golf organisers are the backbone of LX2's user base. They create events, invite players, set up scoring formats, manage payments, and run the day itself. Currently, there is no centralised view for an organiser to see all their events, track aggregate statistics, or quickly perform common actions like duplicating a past event or starting the round on the day. Organisers must navigate to each event individually, which is inefficient when managing a society with 10-20 events per year.

## Goal

Build a dedicated organiser dashboard that aggregates all of an organiser's events, provides quick stats and actions, and serves as the primary landing page for users who create events.

## Users

- **Primary:** Society organisers who create and manage multiple events
- **Secondary:** Club secretaries managing club competitions via the club console

## Core requirements

### Must have

- **Event list**: all events created by the organiser, sorted by date (upcoming first, past events below)
- **Event status badges**: upcoming, in progress, finalised, cancelled
- **Quick stats per event**: player count, confirmed/invited breakdown, paid/unpaid count (if entry fee set), format
- **Aggregate stats**: total events created, total unique players across all events, total revenue collected
- **Quick actions per event**:
  - View event page
  - Edit event details
  - Duplicate event (pre-fill a new event with the same course, format, settings)
  - Start round (transition event to "in progress", generate scorecards)
  - View leaderboard
  - Manage players (add/remove, assign flights)
- **Create new event** button (links to event creation wizard)
- Responsive layout following the app design system (DM Serif headings, DM Sans body, green palette)

### Should have

- **Flight/tee time management**: assign players to flights (groups of 2-4), set tee times, drag-and-drop reordering
- **Event duplication**: copy all settings from a previous event including course, format, handicap allowance, NTP/LD holes, entry fee
- **Player search across events**: find a player and see all events they have participated in
- **Revenue summary**: total collected, total outstanding, per-event breakdown (requires payments module)
- **Notification centre**: pending RSVPs, unpaid players, incomplete scorecards
- **Calendar view**: events plotted on a month calendar for society planning

### Won't have (this phase)

- Multi-organiser collaboration (shared event management)
- Automated event scheduling (recurring events on a schedule)
- Society membership management (separate from event-by-event player tracking)
- Financial reporting beyond simple payment summaries
- Email/SMS blast to all society members

## Technical design

### Page structure

```
/play (existing player dashboard)
  - Shows upcoming events the player is in
  - "Organiser" tab or section for users who have created events

/organise (new organiser dashboard)
  - All events created by auth.uid()
  - Stats summary
  - Quick actions
```

### Data fetching

Server component that queries:

```sql
SELECT e.*,
  COUNT(ep.id) as player_count,
  COUNT(ep.id) FILTER (WHERE ep.rsvp_status = 'confirmed') as confirmed_count,
  COUNT(ep.id) FILTER (WHERE ep.payment_status = 'paid') as paid_count
FROM events e
LEFT JOIN event_players ep ON ep.event_id = e.id
WHERE e.created_by = auth.uid()
GROUP BY e.id
ORDER BY e.date DESC
```

RLS ensures only the organiser's own events are returned (via `events_select` policy).

### Flight management

Flights are groups of 2-4 players who play together. The existing `event_players.flight_number` column (smallint, nullable) supports this:

- Organiser assigns `flight_number` to each player
- Players with the same `flight_number` are in the same group
- Tee times can be derived from flight number and a start time + interval
- Drag-and-drop UI for reordering players between flights

### Event duplication

1. Organiser clicks "Duplicate" on a past event
2. System creates a new event with:
   - Same `course_id`, `combination_id`, `tee_id`
   - Same `format`, `round_type`, `handicap_allowance_pct`
   - Same `ntp_holes`, `ld_holes`, `entry_fee_pence`, `group_size`, `max_players`
   - New `date` (set to next available date or left blank for organiser to fill)
   - New `name` (previous name with "(copy)" appended)
   - No players copied (fresh event)

### "Start round" action

When the organiser clicks "Start round":

1. Generate scorecards for all confirmed players (one scorecard per event_player)
2. Assign flight numbers if not already set (auto-group by handicap or random)
3. Mark event as in-progress (future: `status` column on events)
4. Show the manage page with live scoring status per flight

### UI components

- `OrganiserDashboard.tsx` -- main dashboard page component
- `EventCard.tsx` -- card showing event summary with quick action buttons
- `StatsBar.tsx` -- aggregate statistics row
- `FlightManager.tsx` -- drag-and-drop flight assignment interface
- All using CSS-in-JSX with the app design system (DM Serif/DM Sans, green palette, card borders)

## Database changes

- Consider adding `status` enum to `events` table: `'draft' | 'open' | 'in_progress' | 'finalised' | 'cancelled'` (currently using `finalised` boolean)
- Consider adding `tee_time` (time) to `event_players` for per-flight tee time assignment
- No new tables required; existing schema supports all core requirements

## Open questions

- [ ] Should the organiser dashboard be at `/organise` or integrated as a tab within `/play`?
- [ ] How to handle the transition from "organiser view" to "player view" for users who are both?
- [ ] Should event duplication copy the player list (for recurring society events with the same members)?
- [ ] Do we need role-based access within a society (admin organiser vs assistant organiser)?
- [ ] Should flights be auto-generated based on handicap banding, or always manual?

## Links

- Player dashboard: `apps/web/src/app/play/PlayDashboard.tsx`
- Events schema: `packages/db/migrations/000_initial_schema.sql`
- Event players: `packages/db/migrations/000_initial_schema.sql` (event_players.flight_number)
- RLS policies: `packages/db/migrations/001_rls_policies.sql`
- Related PRD: `docs/prd/payments.md`
- Related PRD: `docs/prd/realtime.md`
