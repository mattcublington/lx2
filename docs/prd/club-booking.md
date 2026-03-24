# PRD: Booking Management

**Module:** `club_booking`
**Phase:** MVP
**Status:** Planned
**Last updated:** March 2026

---

## Problem

Golf club bookings come from multiple channels: phone calls, walk-ins, the club website, third-party platforms (GolfNow, TeeOfTimes), and the LX2 player app. The front desk needs a single place to manage all bookings regardless of source. They need to accept or reject pending bookings, manually enter phone/walk-in bookings, handle group/society bookings, manage cancellations, and track no-shows.

Currently, most clubs use a combination of a paper diary and their legacy system. Phone bookings go in the diary first, then get entered into the system later — creating double-handling and the risk of double-booking. Society bookings are managed entirely via email and spreadsheet, with the organiser and the club going back and forth for weeks.

## Goal

Provide a unified booking management interface where all bookings — regardless of source — are visible, editable, and trackable, with efficient workflows for common front-desk operations.

## Users

- **Primary:** Front desk staff
- **Secondary:** Club secretary (society bookings), PGA pro (lesson-related bookings), club manager (oversight)

## Core requirements

### Must have

- **Booking creation (manual):**
  - Select date and tee time from available slots
  - Add players: search members by name/number, or enter visitor details (name, email, phone)
  - Set booking type: member, visitor, society, corporate, junior
  - Add notes (e.g. "buggy required", "has a bad back, needs flat route")
  - Set green fee amount (auto-populated from pricing rules, editable override)
  - Confirm booking — slot immediately reserved
- **Booking acceptance/rejection:**
  - Pending bookings from online sources shown in a queue
  - Accept: confirms booking, sends confirmation to booker
  - Reject: with reason (full, competition, course closed), sends rejection notification
  - Auto-accept rules: member bookings auto-accepted if within booking window
- **Booking modification:**
  - Change date/time (checks availability)
  - Add/remove players from a group
  - Change booking type
  - Update notes
  - All modifications logged with timestamp and staff user
- **Booking cancellation:**
  - Cancel with reason (member request, weather, club decision)
  - Cancellation notification sent to all players in the group
  - Slot released back to available
  - Cancellation logged for reporting
- **Society/group bookings:**
  - Create a block booking across multiple consecutive tee times
  - Set group name and organiser contact details
  - Allocate a set number of slots (e.g. 20 players = 5 fourball slots)
  - Flexible: allow organiser to fill names later, set a deadline
  - Package linking: associate with a society package (golf + food)
  - Deposit tracking: mark deposit received, balance due date
- **Waiting list:**
  - When a requested time is full, offer to add to waiting list
  - If a cancellation opens a slot, notify the first person on the waiting list
  - Waiting list visible per date, sortable by request time
  - Manual promotion from waiting list to confirmed booking
- **No-show tracking:**
  - After tee time passes, unconfirmed players can be marked as no-show
  - No-show count tracked per member
  - Configurable threshold: after X no-shows, flag member for review
- **Booking sources:**
  - Manual (front desk / phone)
  - LX2 player app
  - Club website widget
  - Third-party API (GolfNow, etc.)
  - Walk-in
  - Each booking tagged with its source for reporting

### Should have

- Booking confirmation emails/SMS with tee time, course, and club details
- Recurring bookings (e.g. "Every Wednesday 10:00, Smith fourball")
- Booking search: find bookings by player name, date range, booking reference
- Payment status tracking per booking (unpaid, deposit paid, fully paid, refunded)
- Automatic conflict detection: warn if a member is already booked at another time on the same day
- Buggy/trolley reservation linked to booking
- Visitor handicap capture (self-declared, verified at check-in)

### Won't have (this phase)

- Online payment processing at booking time (see `club_membership_billing` PRD)
- Dynamic pricing adjustments (see `club_pricing` PRD)
- Third-party platform sync (GolfNow integration — see `booking_api` PRD)
- Automated weather cancellation

## Booking lifecycle

```
Created → Pending → Confirmed → Checked In → Completed
                  ↘ Rejected         ↘ No-show
                  ↘ Cancelled
                  ↘ Waitlisted → Confirmed (when slot opens)
```

## Database schema

### `bookings` table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| club_id | uuid | FK to `clubs` |
| reference | text | Human-readable booking ref (e.g. "BK-20260324-001") |
| date | date | Booking date |
| tee_time | time | Allocated tee time |
| course_id | uuid | FK to `courses` |
| tee | text | "1st" or "10th" |
| booking_type | text | member, visitor, society, corporate, junior |
| status | text | pending, confirmed, cancelled, completed, no_show |
| source | text | manual, app, website, api, walkin |
| group_name | text | Society/corporate name (nullable) |
| notes | text | |
| green_fee_total | numeric | Total green fees for this booking |
| payment_status | text | unpaid, deposit, paid, refunded |
| created_by | uuid | FK to `auth.users` (staff who created) |
| cancelled_by | uuid | FK to `auth.users` (nullable) |
| cancellation_reason | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `booking_players` table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| booking_id | uuid | FK to `bookings` |
| member_id | uuid | FK to `club_members` (nullable — visitors) |
| visitor_name | text | For non-member players |
| visitor_email | text | |
| visitor_phone | text | |
| handicap_index | numeric(3,1) | |
| checked_in | boolean | Default false |
| checked_in_at | timestamptz | |
| no_show | boolean | Default false |
| green_fee | numeric | Individual fee |

### `booking_waitlist` table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| club_id | uuid | FK to `clubs` |
| date | date | Requested date |
| preferred_time | time | |
| member_id | uuid | FK to `club_members` (nullable) |
| contact_name | text | |
| contact_email | text | |
| contact_phone | text | |
| players | int | Number of players |
| notes | text | |
| status | text | waiting, offered, converted, expired |
| created_at | timestamptz | |

## Open questions

- [ ] Should we support "provisional" bookings that auto-cancel if not confirmed within 24 hours?
- [ ] How do we handle ballot/lottery systems for oversubscribed weekend tee times?
- [ ] What is the policy on booking on behalf of non-members — do we collect full visitor details at booking or at check-in?
- [ ] Should cancellation penalties (e.g. late cancellation fee) be enforced automatically or left to club discretion?
- [ ] How do we handle the handoff when a society organiser fills in player names after the initial block booking?

## Links

- Component: `apps/club/src/app/(console)/tee-sheet/page.tsx`
- Related PRD: `docs/prd/club-teesheet.md`
- Related PRD: `docs/prd/club-teesheet-config.md`
- Related PRD: `docs/prd/club-pricing.md`
- Related PRD: `docs/prd/society-packages.md`
