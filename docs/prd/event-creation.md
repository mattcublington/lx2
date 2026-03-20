# PRD: Event Creation

**Module:** `event_create`  
**Phase:** MVP  
**Status:** Building  
**Last updated:** March 2026

---

## Problem

A society organiser currently manages everything via WhatsApp, spreadsheets, and cash on the day. Setting up a competition means manually tracking who's coming, what they owe, their handicaps, and what format you're playing. There's no single place that holds all of this — and by the time you tee off, someone's handicap is wrong and two people haven't paid.

## Goal

An organiser can create an event in under 3 minutes, get a shareable link, and send it to their group. Players tap the link, confirm their attendance and pay if required. The organiser arrives on the day with everything sorted.

## Users

- **Primary:** The society organiser — typically the most organised person in the group, comfortable with basic technology
- **Secondary:** Club competition secretary (Phase 3)

## User journey

1. Organiser logs in (or creates account via magic link)
2. Clicks "New event"
3. Fills in event details (name, date, course, format)
4. Optionally sets entry fee and NTP/LD holes
5. Clicks "Create" — gets a shareable link
6. Sends link via WhatsApp to the group
7. Players RSVP and pay via the link (covered in Invite & RSVP PRD)
8. On the day, organiser opens the dashboard, manages flights, starts the round

## Core requirements

### Must have (MVP)
- Event name (free text)
- Date picker
- Course selection — typeahead search from UK course database
- 9-hole loop selection for courses like Cumberwell (Red, Yellow, Blue, Orange, Par 3)
- Format selection: Stableford, Stroke Play, Match Play
- Handicap allowance (defaults: 95% Stableford, 100% Stroke Play, difference-based Match Play)
- Entry fee — amount in £, or free
- NTP hole designation — select holes from the course layout
- LD hole designation — select holes from the course layout
- Max players cap (optional)
- Generate unique shareable invite link on save
- Edit event after creation (before it starts)
- Duplicate event for recurring fixtures

### Should have (MVP)
- Default NTP/LD holes pre-populated from course conventions
- Group size setting (2, 3, or 4-ball)
- Event visibility: private (invite only) vs public

### Won't have (MVP)
- Tee time booking
- Multiple rounds / multi-day events
- Team event setup (Reds vs Blues) — Phase 2
- Stripe Connect / club payout splitting — Phase 3

## Form design

### Step 1: Basics
- Event name (placeholder: "Sunday Stableford", "Club Monthly Medal")
- Date (native date picker)
- Course search (typeahead — minimum 3 chars to search)
- Tee selection (once course is selected: Yellow, White, Red etc.)
- 9-hole loop (if course has multiple loops — e.g. Cumberwell)

### Step 2: Format & scoring
- Format (radio: Stableford / Stroke Play / Match Play)
- Handicap allowance (pre-filled based on format, editable)
- Group size (2 / 3 / 4 — default 4)
- Max players (optional, numeric)

### Step 3: Side contests & fees
- NTP holes (multi-select from course hole list — par 3s highlighted)
- LD holes (multi-select — par 4s and 5s highlighted)
- Entry fee toggle (free / paid)
- Entry fee amount if paid (£ input)

### Review & create
- Summary of all settings
- "Create event" button
- Generates event record + unique invite URL

## URL structure

```
/events/[id]           → Event landing page (public — RSVP here)
/events/[id]/score     → Score entry (players)
/events/[id]/leaderboard → Live leaderboard (public)
/events/[id]/results   → Results (permanent)
/events/[id]/manage    → Organiser dashboard (auth required)
```

## Data model

```sql
events (
  id uuid,
  created_by uuid → users,
  course_id uuid → courses,
  tee_id uuid → course_tees,
  name text,
  date date,
  format text (stableford | strokeplay | matchplay),
  handicap_allowance_pct numeric,
  entry_fee_pence integer (null = free),
  max_players smallint,
  group_size smallint,
  ntp_holes smallint[],
  ld_holes smallint[],
  is_public boolean,
  finalised boolean,
  created_at timestamptz
)
```

## Cumberwell Park specifics

Cumberwell has 5 nine-hole loops (Red, Yellow, Blue, Orange, Par 3). A full 18-hole event combines two loops. The course selector must:
- Recognise Cumberwell as a multi-loop course
- Allow organiser to select which two loops they're playing
- Combine the hole data from both loops into a single 18-hole course for scoring
- Default NTP holes: suggest par 3s on each loop
- Default LD holes: suggest hole 1 or longest par 5 on each loop

## Open questions

- [ ] How do we handle 9-hole-only events? (Just select one Cumberwell loop)
- [ ] Should the organiser be able to set different handicap allowances per player? (Edge case — skip for MVP)
- [ ] Do we need a "template" system for recurring events? (Duplicate event covers this for MVP)
- [ ] Payment timing — pay on RSVP or pay on the day? (Default: pay on RSVP, organiser can override to cash)

## Dependencies

- Course database must be seeded before event creation is useful
- Auth must be in place (organiser must be logged in)
- Payments (Stripe Checkout) for paid events

## Links

- Route: `apps/web/src/app/events/new/page.tsx` (to be created)
- DB migration: `packages/db/migrations/001_initial_schema.sql`
- Related PRD: `docs/prd/invite-rsvp.md` (to be written)
