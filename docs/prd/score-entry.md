# PRD: Score Entry

**Module:** `score_entry`  
**Phase:** MVP  
**Status:** Done
**Last updated:** March 2026

---

## Problem

Golfers need to record scores hole-by-hole during play. Existing solutions (paper cards, generic apps) are slow, error-prone, and don't calculate Stableford points in real time. On-course conditions — wet hands, bright sunlight, time pressure — make complex UIs fail.

## Goal

A mobile-first score entry screen that feels faster than writing on a card. One tap to record a score. Zero friction for the common case (par ± 2). Automatic Stableford calculation after every hole.

## Users

- **Primary:** The golfer entering their own score during a round
- **Secondary:** A playing partner entering scores on behalf of the group (proxy scoring)
- **Tertiary:** The organiser monitoring progress from the clubhouse or friends and family monitoring progress from home

## Core requirements

### Delivered (MVP — done)
- Hole-by-hole score entry for up to 4 players in a group
- Quick-tap buttons for par −1, par, par +1, par +2, par +3
- Stepper (+ / −) for unusual scores (max 15)
- Running Stableford points total after each hole
- Handicap strokes displayed per hole (95% allowance)
- Pick up / No Return for any hole (null gross_strokes in DB)
- Undo last entry
- NTP and Longest Drive result capture on designated holes
- Full scorecard view (tap to review all holes, scores, points)
- Live group leaderboard — inline panel overlay, real-time via Supabase postgres_changes
- Marker mode — organiser can score for any player in the event
- Offline queue — IndexedDB, auto-synced on reconnect
- **Share code chip** — 6-char alphanumeric in header, tap to copy (✓ Copied feedback)
- **"Finish round" → /rounds/[id]** — "View summary →" CTA links to persistent round summary

### Should have (Phase 2)
- Flash feedback showing points scored (birdie, par, blob etc.)
- Hole navigation: prev/next arrows + direct hole select
- Completion indicators (✓ when all players have scored)
- NTP/LD hole indicators (orange/blue dots)

### Won't have (this phase)
- Match Play status display
- GPS yardage (native app only)

## Scoring logic

Uses `@lx2/scoring` package:
- `calculateHandicap()` — converts handicap index to playing handicap, distributes strokes by SI
- `calculateStableford()` — points per hole from gross strokes, par, handicap strokes

Handicap allowance: 95% for Stableford (configurable per event).

## UX principles

1. **Thumb-first** — all primary actions reachable with one thumb, bottom half of screen
2. **Confirm-free** — tapping a score saves it immediately, no confirm dialog
3. **Recoverable** — undo available for 1 hole back, scorecard editable at any point
4. **Informative** — player always knows their running total and handicap shots on current hole

## Data model

```
scorecards: id, event_id, event_player_id, created_at, submitted_at
hole_scores: id, scorecard_id, hole_number, gross_strokes (null = pickup), created_at
contest_entries: id, event_id, hole_number, type (ntp|ld), event_player_id, distance_cm
```

## Open questions

- [ ] Should auto-advance be configurable? Some players prefer to review before moving on
- [ ] How do we handle 9-hole rounds at Cumberwell? (Red 9 only, Yellow 9 only etc.)
- [ ] Voice input — record "five" and have it parsed? (Phase 2 candidate)

## Links

- Server page: `apps/web/src/app/rounds/[id]/score/page.tsx`
- Client component: `apps/web/src/app/rounds/[id]/score/ScoreEntryLive.tsx`
- Join flow: `apps/web/src/app/play/join/`
- Scoring engine: `packages/scoring/src/stableford.ts`
- DB migration: `packages/db/migrations/golfer/001_initial_schema.sql`
- DB migration (share codes): `packages/db/migrations/golfer/002_share_code.sql`
- Related PRD: `docs/prd/group-joining.md`
- Related PRD: `docs/prd/round-summary.md`
