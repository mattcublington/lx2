# PRD: Nearest the Pin & Longest Drive

**Module:** `ntp_ld`
**Phase:** MVP
**Status:** Planned
**Last updated:** March 2026

---

## Problem

Side contests — nearest the pin (NTP) and longest drive (LD) — are a staple of society golf days. Currently organisers manage these on paper: someone measures with a laser, writes it on a piece of card stuck in the ground, and the results get announced in the bar. Measurements go missing, disputes arise, and the results are never recorded permanently.

LX2 already lets organisers designate NTP and LD holes at event creation. Now we need the scoring flow that lets players record their results on those holes and surfaces winners on the leaderboard.

## Goal

Players can record NTP and LD results during their round on designated holes. Results are stored, ranked by distance, and displayed on the leaderboard with winner badges.

## Users

- **Primary:** The golfer entering their NTP/LD result on the course
- **Secondary:** The organiser reviewing contest results
- **Tertiary:** Spectators viewing the leaderboard

## Core requirements

### Must have

- **Hole designation at event creation** (already implemented in `event_create`):
  - NTP holes: organiser selects from hole list (par 3s highlighted as suggestions)
  - LD holes: organiser selects from hole list (par 4s and 5s highlighted)
  - Stored as `events.ntp_holes smallint[]` and `events.ld_holes smallint[]`

- **Score entry integration**:
  - On NTP/LD designated holes, show a contest entry section below the score input
  - NTP: "Nearest the Pin" prompt with distance input in yards (decimal, e.g. 4.2 yards)
  - LD: "Longest Drive" prompt with distance input in yards (whole number, e.g. 285 yards)
  - Entry is optional — player may skip if they didn't hit the green (NTP) or fairway (LD)
  - Visual indicators on hole navigation: orange dot for NTP holes, blue dot for LD holes

- **Distance storage**:
  - Store in `contest_entries` table as `distance_cm` (centimetres) for precision
  - Convert yards to cm on save, cm to yards on display
  - NTP: typically 0.5 to 50 yards — display to 1 decimal place
  - LD: typically 150 to 350 yards — display as whole number

- **Leaderboard integration**:
  - NTP section on leaderboard: ranked list per NTP hole, closest distance wins
  - LD section on leaderboard: ranked list per LD hole, longest distance wins
  - Winner badge next to player name on main leaderboard
  - Show "no entries yet" when no one has recorded a result

- **Result editing**:
  - Player can update their entry by returning to that hole in the scorer
  - Latest entry overwrites previous (upsert pattern)
  - Organiser can edit any entry from manage page

### Should have

- Auto-suggest: when a player scores on an NTP hole, prompt "Did you hit the green?" before showing distance input
- Unit display: show both yards and metres (yards primary for UK societies)
- Contest summary card on the score entry completion screen

### Won't have (this phase)

- Photo proof upload (players taking photos of their ball position)
- Multiple NTP/LD prizes per hole (e.g. "nearest in 2")
- Automated measurement via GPS
- Two-club rule or other qualifying conditions

## Data model

```sql
contest_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id),
  hole_number smallint NOT NULL,
  type text NOT NULL CHECK (type IN ('ntp', 'ld')),
  event_player_id uuid REFERENCES event_players(id),
  distance_cm integer NOT NULL,  -- centimetres for precision
  created_at timestamptz DEFAULT now(),
  UNIQUE (event_id, hole_number, type, event_player_id)
)
```

The `UNIQUE` constraint ensures one entry per player per contest per hole (upsert-safe).

## UX flow

1. Player reaches hole 7 (designated NTP hole)
2. Enters gross score as normal via quick-tap buttons
3. Below the score, sees orange "Nearest the Pin" section
4. Taps "I hit the green" or skips
5. If hit: enters distance (e.g. "4.2 yards")
6. Distance saved to `contest_entries`
7. On leaderboard, hole 7 NTP shows rankings

## Conversion notes

| Display | Storage |
|---------|---------|
| 1 yard | 91.44 cm |
| 1 foot | 30.48 cm |
| 1 metre | 100 cm |

Always store in cm. Display in yards for UK societies (configurable later for metric markets).

## Open questions

- [ ] Should we support feet+inches input for NTP? (e.g. "12 feet 6 inches" instead of "4.2 yards")
- [ ] How do we handle ties? (Currently: shared position, both get credit)
- [ ] Should NTP only count if the ball is on the green? (Common rule but hard to enforce digitally)
- [ ] Do we need a "mark as measured" flag for organiser verification?

## Links

- Contest entries table: `packages/db/migrations/001_initial_schema.sql`
- Score entry component: `apps/web/src/app/score/ScoreEntry.tsx`
- Leaderboard: `apps/web/src/app/events/[id]/leaderboard/LeaderboardClient.tsx`
- Event creation (hole designation): `apps/web/src/app/events/new/NewEventWizard.tsx`
- Related PRD: `docs/prd/score-entry.md`
- Related PRD: `docs/prd/leaderboard-live.md`
- Related PRD: `docs/prd/results.md`
