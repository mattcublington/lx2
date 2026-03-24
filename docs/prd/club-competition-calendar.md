# PRD: Competition Calendar & Management

**Module:** `club_competition_calendar`
**Phase:** MVP
**Status:** Planned
**Last updated:** March 2026

---

## Problem

UK golf clubs run dozens of competitions throughout the year — monthly medals, stableford qualifiers, knockout matchplay, the club championship, captain's day, charity events, inter-club matches, and more. Each competition has specific rules: format, handicap allowances, entry requirements (e.g. must be full member, minimum handicap), tee allocations, and draw generation.

Currently, the competition secretary manages this with a combination of their legacy system, noticeboard sign-up sheets, and manual handicap verification. Drawing the competition (allocating players to tee times and groups) is done manually or with a basic tool that doesn't account for club preferences. Publishing results requires manual data entry after the round, cross-referencing scorecards with the handicap system.

LX2 already handles society-style scoring in the player app. The club competition module bridges the gap — allowing clubs to create official competitions that integrate with the tee sheet, draw generation, and result publication.

## Goal

Enable a club to manage their full annual competition calendar from creation through to published results, with automated draw generation and seamless integration with the tee sheet and player scoring app.

## Users

- **Primary:** Competition secretary, club secretary
- **Secondary:** PGA pro, captain (approving competition results), members (viewing via player app)

## Core requirements

### Must have

- **Competition calendar view:**
  - Monthly calendar showing all competitions
  - List view with filters: upcoming, past, by format, by eligibility
  - Quick-add for common formats (monthly medal, stableford)
- **Competition creation:**
  - Name, date, format (medal, stableford, matchplay, better ball, texas scramble, greensomes, foursomes, etc.)
  - WHS qualifying status (qualifying / non-qualifying)
  - Course and tee selection (which combination, which tees)
  - Handicap allowance percentage (e.g. 95% for singles stableford, 90% for foursomes)
  - Entry requirements: membership categories allowed, handicap range, gender, age restrictions
  - Entry fee amount
  - Entry open/close dates
  - Maximum entries
  - Tee time allocation on tee sheet (auto-blocks slots for competition)
  - Two-tee start option
  - Shotgun start option with hole assignments
- **Entry management:**
  - Members enter via player app or front desk enters on their behalf
  - Entry list showing all entrants with handicap, entry time, payment status
  - Withdraw entry (with deadline enforcement)
  - Reserve list if competition is full
  - Entry fee collection tracking
- **Draw generation:**
  - Automatic draw: allocate players to tee times and groups
  - Draw algorithms:
    - Random (club social events)
    - Handicap ordered (lowest off first or last)
    - Seeded (club championship — based on qualifying scores)
    - Grouped by handicap range (for balanced groups)
  - Manual override: drag players between groups after auto-draw
  - Publish draw to player app and club noticeboard (printable)
- **Results processing:**
  - Import scores from LX2 player app (auto-populated from live scoring)
  - Manual score entry for players who submit paper cards
  - Countback resolution (last 9, last 6, last 3, last 1) per R&A rules
  - Disqualification handling (NR, DQ, WD)
  - Prize list generation: 1st, 2nd, 3rd, nearest the pin, longest drive
  - Publish results to player app
  - Results printable for noticeboard
- **Competition types support:**
  - Stroke play (medal)
  - Stableford
  - Matchplay (bracket generation, round-by-round progression)
  - Team events (better ball, foursomes, greensomes, texas scramble, ambrose)
  - Multi-round events (e.g. 36-hole club championship over two days)
  - Eclectic (running best-score-per-hole over a season)
  - Order of Merit (points accumulation across multiple competitions)

### Should have

- Annual competition schedule template (copy from previous year, adjust dates)
- Integration with WHS: qualifying competition scores automatically update handicap index
- CSS allocation per competition (Competition Standard Scratch)
- Competition history: view past results, repeat winners
- Statistics: average scores, participation rates, most improved
- Inter-club match management: team selection, home/away, result recording
- Sponsor branding on competition pages
- Email notification to eligible members when entries open

### Won't have (this phase)

- Live leaderboard streaming (already exists in player app for societies)
- Automated prize fund distribution
- England Golf competition entry integration (county events)
- Handicap committee review workflow

## Competition lifecycle

```
Draft → Published (entries open) → Entries Closed → Draw Generated → In Progress → Results Published → Archived
```

## Database schema

### `competitions` table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| club_id | uuid | FK to `clubs` |
| name | text | Competition name |
| date | date | Competition date |
| end_date | date | For multi-day events |
| format | text | medal, stableford, matchplay, etc. |
| is_qualifying | boolean | WHS qualifying status |
| course_id | uuid | FK to `courses` |
| tee_colour | text | white, yellow, red |
| handicap_allowance | int | Percentage (e.g. 95) |
| entry_fee | numeric | |
| max_entries | int | |
| entry_open_date | timestamptz | |
| entry_close_date | timestamptz | |
| eligible_categories | text[] | Membership categories allowed |
| eligible_genders | text[] | |
| min_handicap | numeric | |
| max_handicap | numeric | |
| start_type | text | 1st_tee, two_tee, shotgun |
| first_tee_time | time | |
| interval_minutes | int | |
| draw_type | text | random, handicap, seeded, grouped |
| status | text | draft, published, closed, drawn, in_progress, results, archived |
| notes | text | |
| created_by | uuid | FK to `auth.users` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `competition_entries` table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| competition_id | uuid | FK to `competitions` |
| member_id | uuid | FK to `club_members` |
| handicap_index | numeric(3,1) | At time of entry |
| playing_handicap | int | Calculated from index + allowance |
| tee_time | time | Assigned after draw |
| group_number | int | Assigned after draw |
| gross_score | int | After round |
| net_score | int | After round |
| stableford_points | int | If stableford format |
| status | text | entered, withdrawn, playing, finished, dq, nr |
| entry_fee_paid | boolean | |
| created_at | timestamptz | |

### `competition_results` table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| competition_id | uuid | FK to `competitions` |
| entry_id | uuid | FK to `competition_entries` |
| position | int | Final position |
| prize | text | e.g. "1st", "NTP 7th", "LD 12th" |
| countback_detail | text | If countback was needed |

## Open questions

- [ ] How do we handle handicap index changes between entry and competition day?
- [ ] Should we support "supplementary scores" for WHS (scores submitted outside competitions)?
- [ ] How do we manage competitions that span multiple weeks (e.g. knockout matchplay over a month)?
- [ ] Do we need to support mixed-tee competitions (men off yellow, women off red with adjusted CSS)?
- [ ] How should the draw handle late entries or withdrawals on the morning of the competition?

## Links

- Component: `apps/club/src/app/(console)/competitions/page.tsx`
- Related PRD: `docs/prd/club-teesheet.md`
- Related PRD: `docs/prd/club-teesheet-config.md`
- Related PRD: `docs/prd/club-members.md`
- Related PRD: `docs/prd/score-entry.md`
