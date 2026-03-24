# PRD: Invite & RSVP System

**Module:** `invite`
**Phase:** MVP
**Status:** Done
**Last updated:** March 2026

---

## Problem

Golf societies rely on WhatsApp groups for coordination. The organiser posts "Sunday at Cumberwell, who's in?" and spends the next week chasing replies, collecting handicaps, and working out who's actually confirmed. There's no single source of truth for the player list, and by event day, someone's been missed.

LX2 needs to let anyone join an event from a shared link — even if they've never heard of LX2 and have no account. Requiring sign-up would kill conversion in a WhatsApp group where people just want to tap and confirm.

## Goal

A frictionless invite system where the organiser shares one URL and players join in two taps. No account required. The player list updates in real time for everyone viewing the page.

## Users

- **Primary:** A golfer who receives an event link via WhatsApp and doesn't have an LX2 account
- **Secondary:** A golfer who has an LX2 account and wants their profile data pre-filled
- **Tertiary:** The organiser monitoring RSVPs from the event page

## Core requirements

### Must have

#### Anonymous join flow
- Unauthenticated visitor arrives at `/events/[id]`
- Taps "Join this event" — form expands inline
- Enters display name and handicap index (0-54, 0.1 step)
- Taps "Confirm & join"
- Server action `joinEventAnon` creates `event_players` row with `user_id = null`
- Database generates `join_token` UUID via `DEFAULT gen_random_uuid()`
- Server action sets HttpOnly cookie: `ep_token_<eventId>` = `join_token`, 7-day expiry, `sameSite: lax`, `secure` in production
- Page re-renders showing "You're confirmed" state with link to scorecard

#### Authenticated join flow
- Logged-in user arrives at `/events/[id]`
- Form pre-fills display name from `users.display_name` and handicap from `users.handicap_index`
- Server action `joinEvent` creates `event_players` row with `user_id` set
- Also upserts `users` profile with latest name and handicap
- Scorecard created automatically on join

#### Idempotency
- Re-calling `joinEvent` for same user + event returns existing scorecard
- Re-calling `joinEventAnon` when valid cookie exists is a no-op
- No duplicate `event_players` rows created

#### Real-time player list
- `RealtimeRefresher` client component subscribes to Supabase Realtime `postgres_changes`:
  - Channel: `event-players-<eventId>`
  - Event: `*` (INSERT, UPDATE, DELETE)
  - Table: `event_players`
  - Filter: `event_id=eq.<eventId>`
- On any change, calls `router.refresh()` to re-render server component with fresh data
- 30-second polling fallback via `setInterval` (covers blocked WebSocket environments)
- Cleanup: removes channel and clears interval on unmount

#### Capacity enforcement
- `max_players` checked before insert
- Throws `MAX_PLAYERS_REACHED` if cap hit
- JoinForm displays "This event is full" error message

### Should have

- Sign-in nudge card for anonymous visitors: "Have an LX2 account? Sign in to auto-fill your name and handicap"
- Validation: name required, handicap 0-54 range check
- Loading state on join button ("Joining..." with disabled state)
- Cancel button to collapse form without submitting

### Won't have (this phase)

- Email/SMS invite sending from organiser dashboard
- RSVP states beyond confirmed (e.g. declined, tentative, waitlist management UI)
- Player removal by organiser (admin-only DB operation for now)
- Payment collection on RSVP
- QR code generation for event link

## Database migration (002_anon_join.sql)

```sql
-- 1. join_token column on event_players
ALTER TABLE public.event_players
  ADD COLUMN IF NOT EXISTS join_token uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS event_players_join_token_key
  ON public.event_players (join_token);

-- 2. Anon SELECT on events (public only)
CREATE POLICY "events_anon_select" ON events
  FOR SELECT TO anon
  USING (is_public = true);

-- 3. Anon SELECT on event_players (confirmed, public events)
CREATE POLICY "event_players_anon_select" ON event_players
  FOR SELECT TO anon
  USING (
    rsvp_status = 'confirmed'
    AND EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_players.event_id AND e.is_public = true
    )
  );

-- 4. Realtime — REPLICA IDENTITY FULL + publication
ALTER TABLE public.event_players REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_players;
```

## Security model

- All writes go through server actions using admin (service_role) client — no direct client-side writes
- Anonymous users identified solely by HttpOnly cookie (not readable by JavaScript)
- Cookie is per-event (`ep_token_<eventId>`) to prevent cross-event session leakage
- RLS policies only grant `SELECT` to anon role — no INSERT/UPDATE/DELETE
- Private events (`is_public = false`) redirect to login, blocking anonymous access entirely
- `join_token` is a UUID — not guessable, not sequential

## Open questions

- [ ] Should we support "decline" RSVP status so organisers can see who said no?
- [ ] How long should the join_token cookie last? Currently 7 days — enough for most society events
- [ ] Should anonymous players be able to claim their scores by signing up later?
- [ ] Do we need rate limiting on the join endpoint to prevent abuse?

## Links

- Server actions: `apps/web/src/app/events/[id]/actions.ts`
- Join form: `apps/web/src/app/events/[id]/JoinForm.tsx`
- Realtime: `apps/web/src/app/events/[id]/RealtimeRefresher.tsx`
- Event page: `apps/web/src/app/events/[id]/page.tsx`
- DB migration: `packages/db/migrations/002_anon_join.sql`
- Related PRD: `docs/prd/event-landing.md`
- Related PRD: `docs/prd/event-creation.md`
