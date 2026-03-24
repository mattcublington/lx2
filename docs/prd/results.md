# PRD: Results Page

**Module:** `results`
**Phase:** MVP
**Status:** Planned
**Last updated:** March 2026

---

## Problem

After a society golf day, the results live in someone's memory, a crumpled scorecard, or a WhatsApp photo of a handwritten leaderboard. Within a week, no one can remember who won the NTP on hole 12 or what the winning Stableford score was. There's no permanent, shareable record of the competition.

The live leaderboard serves the during-round experience. The results page is the permanent post-round record — something the organiser can share, players can revisit, and the society can reference for their annual awards.

## Goal

A permanent, shareable results page at `/events/[id]/results` showing the final leaderboard, side contest winners, and individual scorecards. Designed for sharing on WhatsApp with a rich OG preview.

## Users

- **Primary:** The organiser sharing results with the group after the round
- **Secondary:** Players revisiting their scores and position
- **Tertiary:** Society members who weren't at the event, catching up on results

## Core requirements

### Must have

- **URL:** `/events/[id]/results` — public for `is_public` events
- **Event header:**
  - Event name, date, course, format
  - "Final Results" badge (distinct from live leaderboard)
  - Total players, total holes

- **Final leaderboard:**
  - Ranked standings calculated identically to live leaderboard but frozen (no Realtime subscription)
  - Position, display name, score (Stableford points or net strokes), through holes
  - Winner highlighted (gold/green accent, position 1)
  - Podium display for top 3 (optional visual treatment)
  - Tied positions handled correctly (T1, T2, etc.)
  - Countback tiebreaker for Stableford: back 9 points, then back 6, back 3, last hole
  - Countback tiebreaker for Stroke Play: back 9 net, then back 6, back 3, last hole

- **NTP/LD winners section:**
  - Per designated hole: winner name, distance (yards), hole number
  - "Nearest the Pin" and "Longest Drive" sections with appropriate icons
  - Show "No entries" for holes with no recorded results

- **Individual scorecards:**
  - Expandable per player: tap name to see hole-by-hole scores
  - Hole number, par, SI, gross strokes, net strokes, Stableford points per hole
  - Front 9 subtotal, back 9 subtotal, total
  - Handicap strokes highlighted on each hole

- **Sharing:**
  - OG meta tags: `og:title` = event name + "Results", `og:description` = winner + winning score, `og:image` = auto-generated share card
  - Share card: event name, date, course, top 3 standings, LX2 branding (generated server-side or via OG image API)
  - "Share results" button with native share sheet (mobile) or copy-to-clipboard (desktop)
  - WhatsApp-friendly: URL preview shows event name, winner, and share image

- **Finalisation:**
  - Results page only available after organiser marks event as "finalised" (`events.finalised = true`)
  - Before finalisation, `/events/[id]/results` redirects to leaderboard
  - Finalisation locks scores — no further edits allowed

### Should have

- Prize summary: if entry fee was set, show prize pot and distribution
- "Best score of the day" highlight (lowest gross round)
- Course stats: average score per hole across all players, hardest/easiest holes
- Print-friendly CSS (`@media print`)

### Won't have (this phase)

- PDF export with branding (see `branded_event_site` PRD)
- Photo gallery from the day
- Player comments or reactions
- Automated prize money distribution
- Year-end Order of Merit aggregation

## OG Image generation

Server-rendered share card at `/api/og/results/[eventId]`:
- Dimensions: 1200x630px (standard OG image)
- Content: event name, date, course, top 3 with scores, LX2 logo
- Background: dark green (`#0a1f0a`) with subtle texture
- Fonts: Manrope for headings, DM Sans for body (loaded via `@vercel/og` or `satori`)
- Cached: generated once on first request after finalisation, stored in Supabase Storage or edge cache

## Data model

```sql
-- Read from (same as leaderboard, but no Realtime):
events (id, name, date, format, round_type, handicap_allowance_pct,
        ntp_holes, ld_holes, created_by, is_public, finalised,
        entry_fee_pence, combination_id)
course_combinations (name, loop_1_id, loop_2_id)
loop_holes (loop_id, hole_number, par, si_m)
event_players (id, event_id, display_name, handicap_index, rsvp_status)
scorecards (id, event_id, event_player_id)
hole_scores (scorecard_id, hole_number, gross_strokes)
contest_entries (event_id, hole_number, type, event_player_id, distance_cm)
```

## Countback tiebreaker logic

When two or more players have the same total score:

**Stableford:**
1. Highest Stableford points on back 9 (holes 10-18)
2. If still tied: highest points on last 6 holes (13-18)
3. If still tied: highest points on last 3 holes (16-18)
4. If still tied: highest points on hole 18
5. If still tied: shared position

**Stroke Play:**
1. Lowest net score on back 9
2. If still tied: lowest net on last 6
3. If still tied: lowest net on last 3
4. If still tied: lowest net on 18
5. If still tied: shared position

## Open questions

- [ ] When should the organiser be prompted to finalise? (After all scorecards submitted? Manual only?)
- [ ] Should results be editable after finalisation? (Score correction by organiser)
- [ ] Do we need a "provisional results" state before final confirmation?
- [ ] OG image: server-rendered via Vercel OG or pre-generated and stored?
- [ ] Should 9-hole events use a different countback (back 6, back 3, last hole)?

## Links

- Results page: `apps/web/src/app/events/[id]/results/page.tsx` (to be created)
- Leaderboard (shared scoring logic): `apps/web/src/app/events/[id]/leaderboard/LeaderboardClient.tsx`
- Scoring package: `packages/scoring/src/stableford.ts`
- Related PRD: `docs/prd/leaderboard-live.md`
- Related PRD: `docs/prd/ntp-ld.md`
- Related PRD: `docs/prd/branded-event-site.md`
