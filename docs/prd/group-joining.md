# PRD: Group Joining

**Module:** `group_joining`
**Phase:** MVP
**Status:** Done
**Last updated:** March 2026

---

## Problem

Golf is frequently played in larger groups than can be accommodated in a single 4-ball. Two groups may tee off together in a 2-tee start, or a second group may join a society day mid-round after the organiser has already created the event. Without a way for the second group to join the same event, their scores can't appear on the shared live leaderboard, and the final results are incomplete.

## Goal

Allow a second (or third) group of players to join an existing event by entering a short share code. Once joined, all groups are event_players on the same event — the live leaderboard updates automatically to include everyone.

## Users

- **Primary:** The organiser of the first group who wants to include a second group's scores
- **Secondary:** A player in the second group who receives the code and joins on behalf of their group

## Core requirements

### Must have (done)

**Share code generation:**
- 6-character alphanumeric code generated server-side at event creation via `crypto.randomBytes(6)`
- Character set excludes confusable chars: `0`, `O`, `1`, `I`, `L` → uses `ABCDEFGHJKMNPQRSTUVWXYZ23456789`
- Stored as `events.share_code TEXT UNIQUE` with index on non-null values
- DB migration: `packages/db/migrations/golfer/002_share_code.sql`

**Share code chip in score entry:**
- 6-char code rendered as a tappable chip in the score entry header bar
- Tap copies code to clipboard; shows `✓ Copied` for 2 seconds then reverts
- Only shown when `shareCode` prop is set (events without codes are unaffected)

**Join flow at `/play/join`:**
1. Code entry step: 6-character input field with auto-uppercase, `lookupRound(code)` server action on submit
2. Event preview step: shows course name, format, date, existing player count; player rows for new group with name inputs (current user pre-filled) and handicap inputs; add/remove player rows
3. `joinRound(eventId, roundType, players)` server action: inserts `event_players` + `scorecards` for each new player, returns the current user's scorecard URL → redirect to scoring
4. Auth-guarded: requires sign-in, redirects to `/auth/login` if unauthenticated
5. User profile pre-fills name and handicap for the first row

**Player home CTA:**
- "Join a group's round" ghost button below the primary CTA — shown only when no active round
- Links to `/play/join`

**Live leaderboard is automatic:**
- No additional code required — second group's players are event_players on the same event, so the existing Supabase Realtime subscription in ScoreEntryLive already includes all 8 players

### Should have (Phase 2)

- Deep link: `/play/join?code=XXXXXX` pre-fills the code input (homepage "Join event" already sends this format)
- Validation: reject codes for events >24h old (prevent joining stale rounds)
- Per-player scorecard URLs surfaced in the join confirmation step

### Won't have (this phase)

- Group size limits (max players per event)
- Organiser approval flow before join takes effect
- QR code for the share code

## Data model

```sql
-- Schema addition:
alter table public.events
  add column if not exists share_code text unique;

create index if not exists events_share_code_idx
  on public.events (share_code)
  where share_code is not null;

-- Written by joinRound():
event_players (event_id, user_id, display_name, handicap_index, round_type)
scorecards (event_id, event_player_id, round_type, loop_id)
```

## Server actions

```typescript
// lookupRound(code: string): Promise<RoundPreview | null>
// Returns: { eventId, courseName, format, date, existingPlayerCount }

// joinRound(eventId, roundType, players): Promise<string>
// Returns: scorecard URL for the current user (/rounds/[id]/score)
```

## Open questions

- [ ] Should share codes expire after the round ends (or 24h)?
- [ ] Can the organiser regenerate a code if it gets shared accidentally?
- [ ] Should the joining player be asked which tees they're playing?

## Links

- Join page: `apps/web/src/app/play/join/page.tsx`
- Join flow: `apps/web/src/app/play/join/JoinRoundFlow.tsx`
- Server actions: `apps/web/src/app/play/join/actions.ts`
- Event creation (code generation): `apps/web/src/app/play/new/actions.ts`
- Score entry (chip): `apps/web/src/app/rounds/[id]/score/ScoreEntryLive.tsx`
- DB migration: `packages/db/migrations/golfer/002_share_code.sql`
- Related PRD: `docs/prd/score-entry.md`
- Related PRD: `docs/prd/player-home.md`
