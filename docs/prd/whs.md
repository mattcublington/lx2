# PRD: World Handicap System Integration

**Module:** `whs`
**Phase:** Later
**Status:** Planned
**Last updated:** March 2026

---

## Problem

The World Handicap System (WHS) is administered in England by England Golf (formerly CONGU). Under WHS, every qualifying round played by a registered golfer must be submitted to the central system, which recalculates the player's handicap index based on the best 8 of their last 20 scoring differentials. Currently, players must manually submit their scores via the England Golf "MyEG" portal or their club's handicap system -- a friction point that many society golfers skip, meaning their official index drifts from their actual playing ability.

LX2 aims to auto-submit qualifying scores directly to the WHS system and pull the player's current official handicap index, eliminating manual data entry and keeping handicaps accurate.

## Goal

Integrate with the WHS API (via England Golf / CONGU) to automatically submit qualifying scores from LX2 events and retrieve players' official handicap index, so that LX2 handicaps are always in sync with the governing body.

## Users

- **Primary:** Players with an official WHS handicap who play qualifying rounds through LX2 events
- **Secondary:** Organisers who want their events to count as qualifying rounds; club secretaries who manage handicap records

## Core requirements

### Must have

- Pull a player's current WHS handicap index by CDH number (Central Database of Handicaps)
- Auto-submit qualifying round scores to WHS after an event is finalised
- Submit the required data: player CDH number, course (identified by USGA Course ID), tee, date, gross score, format, playing conditions calculation (PCC)
- Organiser marks an event as "qualifying" at creation time
- Player links their CDH number to their LX2 profile (one-time setup)
- Handle "not found" CDH numbers gracefully (player may not be registered)
- Submission confirmation / failure feedback to the organiser

### Should have

- Automatic handicap index refresh after submission (pull updated index)
- PCC (Playing Conditions Calculation) awareness: submit the correct PCC adjustment if available
- Support for 9-hole qualifying rounds (half handicap differential)
- Batch submission for all players in an event at once
- Audit trail of submitted scores (what was sent, when, response)

### Won't have (this phase)

- Full handicap index calculation within LX2 (8 best of 20 differentials) -- rely on WHS as source of truth
- Exceptional Score Reduction (ESR) computation
- Low Handicap Index tracking
- Integration with non-England Golf federations (Golf Ireland, Scottish Golf, etc.)
- Handicap committee review workflows

## Technical design

### API access

England Golf provides API access for approved software providers. Requirements:
- Apply for England Golf Technology Partner status
- Obtain API credentials (OAuth2 client credentials flow)
- API endpoints: player lookup, score submission, handicap index retrieval
- Rate limits and data protection compliance (GDPR)

### Proposed flow

1. **Player setup**: Player enters CDH number in LX2 profile. LX2 validates against WHS API (lookup by CDH number, confirm name match).
2. **Event creation**: Organiser toggles "WHS qualifying" on the event. System validates: course must have USGA Course ID, tee must have slope/course rating.
3. **Score submission**: After organiser finalises the event, LX2 submits each player's adjusted gross score to WHS via API. Only players with a linked CDH number are submitted.
4. **Index update**: After submission, LX2 polls for updated handicap index and updates the player's `handicap_index` in the `users` table.

### Database changes

- Add `cdh_number` to `users` table (already exists on `club_members`, needs to be on `users` for society players)
- Add `whs_qualifying` boolean to `events` table
- New `whs_submissions` table: `{ id, event_id, user_id, cdh_number, course_usga_id, tee, gross_score, net_score, differential, submitted_at, response_status, response_body }`
- Add `usga_course_id` to `courses` table (already implicitly available for Cumberwell via NCRDB IDs 22312-22317)

### Error handling

- CDH not found: warn player, allow them to correct
- API timeout: queue for retry, notify organiser
- Score rejected by WHS (invalid course/tee/data): log rejection reason, surface to organiser
- Duplicate submission: idempotent -- WHS deduplicates by player/date/course

## Dependencies

- England Golf Technology Partner approval (business dependency, not technical)
- Accurate course data with USGA Course IDs in the course database
- Accurate slope/course ratings per tee and gender in `combination_tees`

## Open questions

- [ ] What is the timeline for England Golf API partner approval?
- [ ] Should LX2 submit scores in real-time (as each scorecard is submitted) or in batch (after event finalisation)?
- [ ] How to handle players who play at clubs not yet in the LX2 course database?
- [ ] Do we need to support non-England-Golf federations for Scottish/Welsh/Irish societies?
- [ ] Should LX2 compute the scoring differential locally as a preview, or wait for WHS to return it?

## Links

- Handicap engine: `packages/scoring/src/handicap.ts`
- Course database: `apps/web/src/lib/courses.ts`
- Combination tees migration: `packages/db/migrations/golfer/005_combination_tees.sql`
- Related PRD: `docs/prd/handicap.md`
- Related PRD: `docs/prd/course-db.md`
