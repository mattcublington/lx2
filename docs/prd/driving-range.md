# PRD: Driving Range Management

**Module:** `driving_range`
**Phase:** Later
**Status:** Planned
**Last updated:** March 2026

---

## Problem

Driving ranges at UK golf clubs are often managed separately from the main club system. Ball dispensing machines (Range Servant, Power Tee) have their own payment systems — coin-operated, token-based, or card readers. There is no integration between range usage and the club member database, meaning clubs cannot track member practice habits, offer loyalty rewards, or report on range revenue alongside golf revenue.

Clubs with covered/floodlit bays can charge premium rates for specific bays, but allocation is first-come-first-served with no reservation system. Bay reservations, particularly for lesson groups or corporate events, require manual management.

## Goal

Integrate driving range management into the club console, connecting ball dispensing with the member database, enabling bay reservation, and providing unified revenue reporting.

## Users

- **Primary:** Front desk staff, range attendant
- **Secondary:** Members (self-service range access), PGA pro (range lesson management), club manager (reporting)

## Core requirements

### Must have

- **Bay configuration:**
  - Define total bays (covered, uncovered, grass tees)
  - Bay types: standard, premium (covered), teaching (with camera setup)
  - Operating hours (may differ by season: floodlights extend winter hours)
  - Bay status: available, occupied, reserved, out of service
- **Ball dispensing integration:**
  - Support token/credit-based dispensing linked to member account
  - Member RFID/card/QR scan triggers ball dispense from their credit balance
  - Visitor pay-per-bucket: card payment or token purchase from front desk
  - Bucket sizes: small (25 balls), medium (50), large (100), jumbo (150) — configurable
  - Pricing per bucket by player type and time of day
- **Bay reservation:**
  - Reserve specific bays for lessons, groups, or members who prefer a particular bay
  - Time-limited reservations (e.g. 30 min, 1 hour)
  - Automated release: unreserved after 10 minutes past start time if member hasn't checked in
- **Member range credits:**
  - Buy range credits in bulk (e.g. 500 balls for GBP 40 vs GBP 0.10/ball pay-as-you-go)
  - Credit balance visible in player app
  - Auto top-up option (when balance drops below X, charge Y)
  - Credits included with certain membership categories (e.g. full members get 100 free balls/month)
- **Loyalty programme:**
  - Track balls hit per member
  - Loyalty card: buy 9 buckets, get 10th free
  - Monthly range pass: unlimited balls for a fixed fee

### Should have

- Range occupancy display (live screen showing which bays are available)
- Peak/off-peak pricing for range use
- Range lesson integration: pro reserves bays for teaching, member credits used for balls
- Revenue reporting: range revenue by day, week, month
- Hardware integration API: connect to Range Servant, Power Tee, or other dispensing systems
- Maintenance scheduling: flag bays for mat replacement, ball collection times
- Grass tee rotation tracking (which bays are on grass tees today)

### Won't have (this phase)

- Launch monitor data capture from range bays
- Automated ball collection robot scheduling
- Range ball inventory tracking (brand, condition)
- Virtual range scoring (closest to pin competitions)

## Open questions

- [ ] Which ball dispensing hardware systems are most common in UK clubs, and what are their APIs?
- [ ] Should range access be gated (turnstile with card scan) or open with honour system?
- [ ] How do we handle mixed-use bays (sometimes driving range, sometimes short game practice)?
- [ ] Is there demand for a "range only" membership for non-golf members who just want to hit balls?

## Links

- Component: `apps/club/src/app/(console)/range/` (future)
- Related PRD: `docs/prd/club-pricing.md`
- Related PRD: `docs/prd/lesson-booking.md`
- Related PRD: `docs/prd/club-members.md`
