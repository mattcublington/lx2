# PRD: Function Room Booking

**Module:** `function_rooms`
**Phase:** Later
**Status:** Planned
**Last updated:** March 2026

---

## Problem

Many UK golf clubs have function rooms, clubhouses, and event spaces that host weddings, corporate events, birthday parties, Christmas functions, and wakes. Managing these bookings is typically separate from the golf operation — a diary in the bar, a spreadsheet, or a standalone events system. There is no integration with the club's member database, catering operation, or financial reporting.

Function room revenue can represent 20-40% of a club's total income, yet it receives the least systematic management. Double-bookings, missed follow-ups on enquiries, and last-minute catering chaos are common.

## Goal

Provide an integrated function room booking system for managing event enquiries, room allocation, catering coordination, and payment collection within the club console.

## Users

- **Primary:** Club manager, events coordinator/secretary
- **Secondary:** Catering manager, front desk staff, clients (viewing availability)

## Core requirements

### Must have

- **Room configuration:**
  - Define function rooms/spaces (e.g. "Main Lounge", "Terrace", "Private Dining", "Boardroom")
  - Capacity per room per layout (theatre, classroom, banquet, reception, boardroom)
  - Amenities: projector, screen, microphone, Wi-Fi, dance floor, bar access
  - Availability: operating hours, blackout dates (club events, maintenance)
  - Minimum booking duration
  - Photos and description per room
- **Event booking:**
  - Select room, date, time (start and end)
  - Event type: wedding, corporate, party, funeral/wake, AGM, club social
  - Client details: name, company, email, phone, address
  - Estimated and confirmed guest count
  - Room layout preference
  - Catering requirements (link to menu options)
  - Special requirements: accessibility, parking, equipment hire
  - Booking status: enquiry, provisional, confirmed, deposit paid, completed, cancelled
- **Availability calendar:**
  - Room-by-room calendar view
  - Day, week, and month views
  - Provisional bookings shown in different colour to confirmed
  - Clash detection: prevent double-booking
- **Catering integration:**
  - Select from predefined menus or request bespoke
  - Per-head pricing for food and drink packages
  - Dietary requirements tracking
  - Catering order sent to kitchen/catering team with timeline
- **Payment management:**
  - Deposit amount (configurable: percentage or fixed)
  - Deposit due date and balance due date
  - Payment tracking: deposit, interim payments, final balance
  - Invoice generation with event details and breakdown
  - Refund/cancellation policy enforcement
- **Event timeline:**
  - Create a running order for the event (setup time, arrival, speeches, food service, bar close, event end)
  - Share timeline with client and staff
  - On-the-day checklist for events team

### Should have

- Online enquiry form embeddable on club website
- Automated follow-up: if enquiry not responded to within 48 hours, alert manager
- Client CRM: track all communications, quotes, and past events per client
- Room hire pricing by day of week, time of year
- Bundled packages: room + golf (e.g. corporate golf day with evening dinner)
- Post-event feedback collection
- Repeat booking management (e.g. annual Christmas party, weekly yoga class)
- Table plan builder (seat allocation for banquet events)

### Won't have (this phase)

- External supplier management (florists, DJs, photographers)
- Wedding planning portal (client-facing)
- Virtual tours / 3D room visualisation
- Integration with external event platforms (Bridebook, Hitched)

## Open questions

- [ ] Should function room bookings affect the tee sheet (e.g. large wedding may reduce available tee times)?
- [ ] How do we handle rooms that can be partitioned (e.g. divider creates two smaller rooms)?
- [ ] Do we need to support external catering (client brings own caterer)?
- [ ] Should there be a public-facing page showing room availability, or enquiry-only?
- [ ] How do we handle VAT on room hire vs catering vs drinks (different VAT treatments)?

## Links

- Component: `apps/club/src/app/(console)/events/` (future)
- Related PRD: `docs/prd/club-pricing.md`
- Related PRD: `docs/prd/fb-management.md`
- Related PRD: `docs/prd/society-packages.md`
