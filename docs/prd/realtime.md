# PRD: Realtime Subscriptions

**Module:** `realtime`
**Phase:** MVP
**Status:** Done
**Last updated:** March 2026

---

## Problem

Golf scoring is inherently live. When a player enters a score on the 7th hole, their playing partners, the organiser watching from the clubhouse, and anyone viewing the leaderboard should see the update within seconds. Polling the database every few seconds is wasteful and creates unnecessary load. LX2 needs a real-time data pipeline that pushes score updates and player list changes to all connected clients instantly.

However, real-time WebSocket connections are not always reliable on a golf course. Players may be in areas with poor connectivity, behind corporate firewalls that block WebSockets, or on networks that aggressively terminate idle connections. The system needs a graceful fallback.

## Goal

Use Supabase Realtime's `postgres_changes` channel to push live updates to score entry, event landing pages, and leaderboards, with a polling fallback for environments where WebSockets are blocked.

## Users

- **Primary:** Players viewing live group leaderboards during score entry; spectators on the event leaderboard
- **Secondary:** Organisers monitoring live scoring from the manage page; event landing page showing live player list

## Core requirements

### Must have

- **Supabase Realtime** subscription using `postgres_changes` channel type
- Subscribe to `INSERT` and `UPDATE` events on `hole_scores` table (filtered by event or scorecard)
- Subscribe to `INSERT`, `UPDATE`, `DELETE` events on `event_players` table (filtered by event_id) for live player list
- `RealtimeRefresher` client component that wraps event pages and triggers a `router.refresh()` on relevant changes, causing server components to re-render with fresh data
- **Polling fallback**: 30-second interval polling using `setInterval` + `router.refresh()` for environments where WebSockets fail to connect
- Automatic fallback detection: if the Realtime channel enters an error or closed state, switch to polling
- Clean subscription cleanup on component unmount (prevent memory leaks)

### Should have

- Optimistic UI updates in score entry (show the score immediately, confirm via Realtime echo)
- Connection status indicator (green dot = live, yellow = polling, red = offline)
- Debounced refresh to avoid re-rendering on every keystroke when multiple scores arrive rapidly
- Presence tracking (show which players are currently online/scoring)

### Won't have (this phase)

- Supabase Realtime Broadcast (direct client-to-client messaging)
- Conflict resolution for simultaneous edits to the same hole score
- Push notifications (native or web push) for score updates
- Realtime audio/visual alerts for notable events (eagle, hole-in-one)

## Technical implementation

### RealtimeRefresher component

Located at `apps/web/src/app/events/[id]/RealtimeRefresher.tsx`. This is a `'use client'` component that:

1. Creates a Supabase Realtime channel subscribed to `postgres_changes` on the relevant table(s)
2. Filters by `event_id` to receive only relevant changes
3. On receiving a change, calls `router.refresh()` to trigger a server-side re-render of the page
4. Falls back to 30-second polling if the channel fails to connect or enters an error state
5. Cleans up the channel subscription on unmount

### Usage pattern

```tsx
// In a server component page:
<RealtimeRefresher eventId={event.id} table="event_players">
  {/* Server-rendered content that will refresh on changes */}
</RealtimeRefresher>
```

### Subscribed pages

| Page | Table(s) | Events | Purpose |
|------|----------|--------|---------|
| Score entry (`ScoreEntryLive`) | `hole_scores` | INSERT, UPDATE | Live group leaderboard during scoring |
| Event landing (`/events/[id]`) | `event_players` | INSERT, UPDATE, DELETE | Live player list / RSVP count |
| Leaderboard (`/events/[id]/leaderboard`) | `hole_scores` | INSERT, UPDATE | Live leaderboard updates |

### Fallback strategy

WebSockets can be blocked by:
- Corporate firewalls and proxy servers
- Some mobile carriers on cellular networks
- Hotel/airport WiFi captive portals

When the Supabase Realtime channel reports a connection error or times out, the component switches to a 30-second `setInterval` polling loop that calls `router.refresh()`. This ensures the page stays reasonably up-to-date even without WebSockets.

### RLS considerations

Realtime respects RLS policies. The subscription only receives changes that the authenticated user is allowed to see. This means:
- Players in an event see score updates for all players in that event (via `event_players_select` policy)
- The organiser sees all updates including anonymous players
- Users not in the event do not receive any updates (unless the event is public)

## Open questions

- [ ] Should we add Supabase Realtime Presence to show which players are currently online?
- [ ] Is 30 seconds the right polling interval for the fallback? Too frequent = battery drain on mobile, too slow = stale data
- [ ] Should we use Realtime Broadcast for "nudge" features (e.g., organiser pings a slow group)?
- [ ] How to handle the case where a player's connection drops mid-hole and they miss an update?

## Links

- RealtimeRefresher: `apps/web/src/app/events/[id]/RealtimeRefresher.tsx`
- ScoreEntryLive: `apps/web/src/app/rounds/[id]/score/ScoreEntryLive.tsx`
- LeaderboardClient: `apps/web/src/app/events/[id]/leaderboard/LeaderboardClient.tsx`
- Supabase client: `apps/web/src/lib/supabase/client.ts`
- Related PRD: `docs/prd/pwa.md` (offline queue for when connectivity is lost entirely)
