# PRD: Golf Simulator Booking

**Module:** `simulator_booking`
**Phase:** Later
**Status:** Planned
**Last updated:** March 2026

---

## Problem

Golf simulators are a growing revenue stream for UK clubs, particularly during winter when course conditions limit play. Clubs investing in Trackman, Foresight, or Full Swing simulators need a booking system to manage hourly slots across multiple bays. Currently, simulator bookings are often managed on a separate paper diary or Google Calendar, disconnected from the main club system.

Without integrated booking, clubs struggle to maximise bay utilisation, manage peak-time demand, and report on simulator revenue alongside golf revenue. Corporate groups wanting simulator sessions must be managed manually, and there is no self-service booking for members.

## Goal

Provide an integrated simulator bay booking system supporting hourly slots, multiple bays, member and visitor bookings, and corporate group management.

## Users

- **Primary:** Front desk staff, club manager
- **Secondary:** Members (self-service booking), corporate clients

## Core requirements

### Must have

- **Bay configuration:**
  - Define number of simulator bays (e.g. Bay 1, Bay 2, Bay 3)
  - Set operating hours per bay (may differ from course hours)
  - Slot duration: 1 hour default, configurable (30 min, 1 hr, 1.5 hr, 2 hr)
  - Max players per bay per slot (typically 4-6)
  - Bay-specific features (e.g. Bay 1: Trackman, Bay 2: Foresight)
- **Booking management:**
  - Calendar view: bays as columns, time slots as rows
  - Click to book: select bay, time, duration, number of players
  - Member booking: search and select members
  - Visitor booking: name, email, phone
  - Corporate booking: company name, organiser, attendee count
  - Recurring booking (e.g. league night every Thursday)
- **Pricing:**
  - Rate per hour per bay
  - Member vs visitor rates
  - Peak (evenings, weekends) vs off-peak pricing
  - Corporate/group rates
  - Package deals (e.g. 10-hour block at discount)
- **Simulator league support:**
  - Create leagues (weekly competition on simulator)
  - Track scores and standings
  - Automated fixture scheduling
- **Payment:**
  - Payment at time of booking or at the desk
  - Prepaid bay credits / simulator membership
  - Cancellation: refund or credit based on policy

### Should have

- Integration with simulator software (Trackman, Foresight): pull session data, scores
- Food and drink pre-ordering for simulator sessions
- Corporate event packages: simulator + meeting room + catering
- Automated bay unlock (smart lock integration for after-hours member access)
- Utilisation reporting: bay usage by day/time, revenue per bay

### Won't have (this phase)

- Remote play (simulator-to-simulator online matchplay)
- Virtual course content management
- Simulator hardware monitoring
- Integration with club handicap system for simulator scores

## Open questions

- [ ] Should simulator bookings appear on the main tee sheet or have their own dedicated view?
- [ ] How do we handle walk-in simulator use — is there a kiosk mode?
- [ ] Do we need to support different game modes (practice, course play, closest to pin) in the booking?
- [ ] Should simulator memberships be a separate category or an add-on to golf membership?

## Links

- Component: `apps/club/src/app/(console)/simulators/` (future)
- Related PRD: `docs/prd/club-booking.md`
- Related PRD: `docs/prd/club-pricing.md`
- Related PRD: `docs/prd/function-rooms.md`
