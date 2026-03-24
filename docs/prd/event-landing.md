# PRD: Event Landing Page

**Module:** `event_landing`
**Phase:** MVP
**Status:** Done
**Last updated:** March 2026

---

## Problem

When a society organiser shares an event link over WhatsApp, the person who taps it needs to immediately understand what the event is, when it is, and how to join. Many recipients won't have an LX2 account and shouldn't need one. If the landing page is confusing or requires sign-up, players will drop off and the organiser is back to chasing RSVPs manually.

## Goal

A public event page that loads instantly, shows all event details at a glance, and lets anyone join with two taps — no account required. Authenticated users get their name and handicap pre-filled.

## Users

- **Primary:** A golfer who received an event link via WhatsApp and may or may not have an LX2 account
- **Secondary:** The event organiser checking the page to see who has joined
- **Tertiary:** A spectator viewing the event details and player list

## Core requirements

### Must have

- Public URL at `/events/[id]` — accessible without authentication for `is_public` events
- Event details card: name, date (formatted `weekday day month year`), course/combination name, format badge (Stableford/Stroke Play/Match Play) with colour coding, handicap allowance percentage, player count (with max if set), group size, entry fee, NTP and LD hole designations
- Live player list showing confirmed players with display name, handicap index, organiser badge, and guest badge for anonymous players — numbered by join order
- Join form (inline, expands on "Join this event" tap): name input + handicap index input (0-54, 0.1 step), confirm/cancel buttons
- Authenticated user flow: pre-fills name and handicap from `users` profile, calls `joinEvent` server action, stores `user_id` on `event_players` row
- Anonymous user flow: calls `joinEventAnon` server action, creates `event_player` with `null` user_id, sets `join_token` UUID in HttpOnly cookie (`ep_token_<eventId>`, 7-day expiry, `sameSite: lax`)
- "Already joined" state: shows confirmation checkmark and "Go to my scorecard" link (routes to `/rounds/[scorecardId]/score`)
- Idempotent join: re-joining returns existing scorecard; cookie-based de-duplication for anon users
- Max players enforcement: returns `MAX_PLAYERS_REACHED` error when cap is hit
- Private event guard: redirects unauthenticated visitors to `/auth/login?redirect=/events/[id]`
- Real-time player list updates via `RealtimeRefresher` component (Supabase Realtime `postgres_changes` on `event_players` filtered by `event_id`, plus 30-second polling fallback)
- Sign-in nudge card for anonymous visitors who haven't joined yet
- Organiser link: "Manage event" visible only to `created_by` user
- Leaderboard link: visible for Stableford and Stroke Play events

### Should have

- Staggered card entry animation (`opacity 0->1`, `translateY(14px->0)`, 0.06s delay per card)
- Error card component for missing/invalid event IDs
- Format-specific colour coding (green for Stableford, blue for Stroke Play, amber for Match Play)

### Won't have (this phase)

- OG meta image / social sharing preview (see `results` PRD)
- Payment collection on join (Stripe Checkout integration — Phase 2)
- Waiting list management UI (error message only for now)
- Event chat or comments

## Page architecture

Server component (`page.tsx`) fetches all data using admin client (bypasses RLS for anon visitors). Auth state checked via `createClient()` + `getUser()`. Join status determined by `user_id` match (authenticated) or `ep_token_<id>` cookie match (anonymous).

Client components:
- `JoinForm` — handles form state, validation, calls `joinEvent` or `joinEventAnon` server actions, triggers `router.refresh()` on success
- `RealtimeRefresher` — invisible component, subscribes to Supabase Realtime channel, calls `router.refresh()` on any event_players change

## Data model

```sql
-- Read from:
events (id, name, date, format, handicap_allowance_pct, group_size,
        max_players, ntp_holes, ld_holes, entry_fee_pence, created_by,
        combination_id, is_public, course_combinations(name))

event_players (id, event_id, user_id, display_name, handicap_index,
               rsvp_status, join_token, created_at)

scorecards (id, event_id, event_player_id)

users (id, display_name, handicap_index)
```

## Open questions

- [ ] Should we show a countdown or "starts in X days" on the event card?
- [ ] Do we need a "share this event" button with native share sheet?
- [ ] Should anonymous players be able to edit their name/handicap after joining?

## Links

- Component: `apps/web/src/app/events/[id]/page.tsx`
- Join form: `apps/web/src/app/events/[id]/JoinForm.tsx`
- Realtime: `apps/web/src/app/events/[id]/RealtimeRefresher.tsx`
- Server actions: `apps/web/src/app/events/[id]/actions.ts`
- DB migration: `packages/db/migrations/002_anon_join.sql`
- Related PRD: `docs/prd/invite.md`
- Related PRD: `docs/prd/event-creation.md`
