# PRD: Tee Sheet Configuration

**Module:** `club_teesheet_config`
**Phase:** MVP
**Status:** Planned
**Last updated:** March 2026

---

## Problem

Every golf club has a unique tee sheet setup. Cumberwell Park, our pilot club, has five 9-hole loops (Manor, Dogtooth, Pines, Orchard, Valley) that combine into different 18-hole configurations. Standard courses have a simple 1st tee and optionally a 10th tee shotgun start. Some clubs run two-tee starts, some have par-3 courses alongside the main course, some have winter and summer tee time schedules.

Before a club can accept bookings or manage their tee sheet, they need to configure: what tees they have, what time slots are available, how long between groups, how many players per group, which slots are reserved for competitions or maintenance, and when members vs visitors can book.

Legacy systems make this configuration painful — often requiring a phone call to the software vendor to change slot intervals. LX2 must make tee sheet setup self-service and intuitive.

## Goal

Enable a club administrator to fully configure their tee sheet structure, time slots, and booking rules without technical assistance, supporting both simple single-tee courses and complex multi-loop setups like Cumberwell Park.

## Users

- **Primary:** Club general manager, secretary
- **Secondary:** PGA pro (viewing configuration), front desk (understanding booking rules)

## Core requirements

### Must have

- **Course definition:**
  - Define one or more courses (e.g. "Main Course", "Par 3", "Academy")
  - For multi-loop clubs: define loops (9-hole segments) and valid 18-hole combinations
  - Cumberwell example: 5 loops, configured as 2 or 3 active 18-hole combinations per day
  - Set par, stroke index, yardage per hole per tee colour (white, yellow, red)
- **Tee time slots:**
  - First tee time and last tee time per day
  - Slot interval: 7, 8, 9, 10, or 12 minutes (configurable)
  - Different schedules for weekdays vs weekends vs bank holidays
  - Seasonal schedules (summer: earlier first tee, later last tee; winter: shorter day)
- **Group configuration:**
  - Default maximum group size: 2, 3, or 4 (most UK clubs: 4)
  - Allow twoballs, threeballs as separate booking types
  - Minimum group size (some clubs require minimum 2)
- **Blocked slots:**
  - Block tee times for competitions (link to competition calendar)
  - Block for maintenance (e.g. greens staff from 7:00-7:30 daily)
  - Block for lessons (PGA pro reserved times)
  - Recurring blocks (every Tuesday 9:00-11:00 = ladies' competition)
  - One-off blocks (course closed for event)
- **Booking windows:**
  - Members can book X days in advance (e.g. 14 days)
  - Visitors can book Y days in advance (e.g. 7 days)
  - Competition entries open Z days before event
  - Cancellation deadline: hours before tee time
- **Two-tee start support:**
  - Configure 1st tee and 10th tee simultaneously
  - Shotgun start option for competitions

### Should have

- Schedule templates: create a "Summer Weekday" template and apply it to a date range
- Visual preview of the configured tee sheet (what it will look like with current settings)
- Copy configuration from one day to another
- Holiday calendar (England & Wales bank holidays pre-loaded, editable)
- Per-course configuration for clubs with multiple courses
- Slot capacity overrides (e.g. allow 5-balls for society bookings on certain days)
- Twilight tee time marker (automatically set based on sunset)

### Won't have (this phase)

- Dynamic pricing configuration (see `club_pricing` PRD)
- Automated weather-based adjustments
- Integration with R&A course rating database
- GPS hole mapping

## Multi-loop configuration (Cumberwell Park)

Cumberwell Park has 45 holes across 5 loops. On any given day, 2 or 3 eighteen-hole combinations are active. The configuration must support:

1. **Loop definition:** Name, number of holes, par, SI, yardage per tee
2. **Combination rules:** Which loops pair together (e.g. Manor + Pines, Dogtooth + Valley)
3. **Daily rotation:** Admin sets which combinations are active for each day (or creates a rotation schedule)
4. **Tee sheet per combination:** Each active 18-hole route gets its own tee sheet column with independent time slots
5. **Cross-loop conflict detection:** If Manor is in use by Combination A starting at hole 1, Combination B can't also start Manor at the same time

## Database schema

### `courses` table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| club_id | uuid | FK to `clubs` |
| name | text | Course name |
| type | text | full_18, loop_9, par_3, academy |
| holes | int | Number of holes |
| is_active | boolean | |
| sort_order | int | |

### `course_combinations` table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| club_id | uuid | FK to `clubs` |
| name | text | e.g. "Manor/Pines" |
| front_nine_id | uuid | FK to `courses` (loop) |
| back_nine_id | uuid | FK to `courses` (loop) |
| is_active | boolean | |

### `teesheet_schedules` table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| club_id | uuid | FK to `clubs` |
| course_id | uuid | FK to `courses` or `course_combinations` |
| name | text | e.g. "Summer Weekday" |
| first_tee_time | time | |
| last_tee_time | time | |
| interval_minutes | int | |
| max_group_size | int | |
| min_group_size | int | |
| applies_to | text[] | Array of day names or "bank_holiday" |
| valid_from | date | |
| valid_to | date | |

### `teesheet_blocks` table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| club_id | uuid | FK to `clubs` |
| course_id | uuid | FK to `courses` |
| block_type | text | competition, maintenance, lesson, custom |
| label | text | Display label |
| start_time | time | |
| end_time | time | |
| date | date | Null for recurring |
| recurrence | text | Cron-like: "every tuesday", "first saturday" |
| competition_id | uuid | FK to `competitions` (nullable) |

## Open questions

- [ ] How should we handle the transition between summer and winter schedules — hard cutover or gradual?
- [ ] Do we need to support half-hour offsets (e.g. 7:06 first tee) or only on-the-minute times?
- [ ] For Cumberwell's 5-loop system, should daily rotation be automated or always manually set?
- [ ] How do we handle temporary 9-hole only play (e.g. one loop closed for maintenance)?
- [ ] Should blocked slots be visible to members (shown as "unavailable") or hidden entirely?

## Links

- Component: `apps/club/src/app/(console)/sheet-config/page.tsx`
- Related PRD: `docs/prd/club-teesheet.md`
- Related PRD: `docs/prd/club-booking.md`
- Related PRD: `docs/prd/club-competition-calendar.md`
