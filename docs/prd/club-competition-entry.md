# PRD: Club Competition Entry

**Module:** `club_competition_entry`
**Phase:** Soon
**Status:** Planned
**Last updated:** March 2026

---

## Problem

Entering a club competition typically requires visiting the pro shop, signing a sheet on the notice board, or using a clunky legacy system. Players forget to enter, the deadline passes, and the competition secretary has to chase people. There's no way to see who else has entered, check your tee time from your phone, or pay online.

LX2 can streamline this by letting club members enter competitions directly from their phone, see the draw when it's published, and pay if required — all within the same app they use for scoring.

## Goal

Allow club members to browse eligible competitions, enter with one tap, view the draw and their tee time, and manage their entry — all from the LX2 player app.

## Users

- **Primary:** A club member wanting to enter a weekend medal or monthly Stableford
- **Secondary:** The competition secretary managing entries and publishing the draw
- **Tertiary:** A member checking who else has entered before deciding to play

## Core requirements

### Must have

- **Competition detail page at `/club/competitions/[id]`:**
  - Competition name, date, format, entry fee
  - Course and tee being used
  - Entry deadline (with countdown)
  - Eligibility: membership categories, gender restrictions
  - Whether it's a qualifying competition (counts for WHS handicap)
  - Current entry count / max players
  - Entry status for the logged-in player

- **Entry flow:**
  - "Enter competition" button (visible only if eligible and entries are open)
  - Confirm dialog: shows entry fee, format, date
  - Payment via Stripe Checkout if entry fee is set
  - Server action creates `club_competition_entries` row
  - Confirmation state: "You're entered" with withdrawal option

- **Withdrawal:**
  - "Withdraw" button available up to entry deadline
  - After deadline: requires contacting competition secretary
  - Refund handling: automatic if withdrawn before deadline, manual after

- **Player list:**
  - List of entered players (name, handicap index)
  - Sorted by entry time
  - Count of entries vs max spots
  - "Waiting list" indicator when full

- **Draw view (after draw is published):**
  - Grouped by tee time
  - Each group: tee time, player names, handicaps
  - Player's own group highlighted
  - "Your tee time: 09:24" prominent at top

- **Integration with scoring:**
  - When competition starts, entry is linked to an LX2 event (`club_competitions.event_id`)
  - Player's scorecard is pre-created
  - "Go to scorecard" button appears on competition page
  - Scores feed into the club competition leaderboard and results

### Should have

- Push notification when draw is published ("Your tee time is 09:24 with Smith J. and Jones R.")
- Reserve list: if a player withdraws, next on waiting list is auto-promoted (with notification)
- Pre-round checklist: player confirms attendance on the day (helps competition secretary manage no-shows)
- Playing partner preferences: "I'd like to play with [name]" submitted during entry

### Won't have (this phase)

- Knockout draw bracket management
- Team competition entry (fourball better ball, foursomes)
- Supplementary score card submission (for non-competition qualifying rounds)
- Competition scheduling by the secretary (done via `club.lx2.golf` admin)
- Automated handicap adjustment from competition results

## Entry eligibility rules

A player can enter if ALL of the following are true:
1. Player has a verified `club_memberships` row for the competition's club
2. Player's membership `category` is in `club_competitions.eligible_categories`
3. Player's `gender` matches `club_competitions.eligible_gender` (or competition is open)
4. Current time is before `entry_deadline`
5. Competition `status` is `'open'`
6. Player hasn't already entered (no existing `club_competition_entries` row)
7. Entry count is below `max_players` (or player is added to waiting list)

## Data model

Relies on tables defined in `my_club_dashboard` PRD:

```sql
-- Read from:
club_competitions (id, club_id, event_id, name, date, format,
                   entry_fee_pence, max_players, entry_deadline,
                   eligible_categories, eligible_gender, is_qualifying,
                   status, draw_published_at)

club_competition_entries (id, competition_id, user_id, tee_time,
                          group_number, status)

club_memberships (club_id, user_id, category, gender, verified)

-- Write to:
club_competition_entries (insert on entry, update on withdrawal)
```

## Draw publication

The competition secretary publishes the draw via `club.lx2.golf`:
1. Secretary opens competition manage page
2. Auto-generate draw: groups players by handicap or random, assigns tee times from first slot at configured interval
3. Manual adjustment: drag players between groups, swap tee times
4. Publish: sets `status = 'draw_published'`, `draw_published_at = now()`
5. All entered players receive notification with their tee time
6. Player app shows draw view

## Open questions

- [ ] Should we support ballot entries? (When entries exceed spots, random selection rather than first-come-first-served)
- [ ] How do we handle handicap cuts/category changes between entry and competition day?
- [ ] Should the entry fee go through LX2 Stripe or the club's own payment system?
- [ ] Reserve list auto-promotion: how long does a promoted player have to confirm?
- [ ] Do we need separate entry for 9-hole and 18-hole versions of the same competition?
- [ ] Should casual visitors be able to enter club competitions? (Guest entry with green fee)

## Links

- Club dashboard: `apps/web/src/app/play/club/` (to be created)
- Club admin: `apps/club/` (to be built)
- Related PRD: `docs/prd/my-club-dashboard.md`
- Related PRD: `docs/prd/tee-booking.md`
- Related PRD: `docs/prd/score-entry.md`
- Related PRD: `docs/prd/leaderboard-live.md`
