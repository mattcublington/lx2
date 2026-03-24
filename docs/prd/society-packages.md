# PRD: Society Day Packages

**Module:** `society_packages`
**Phase:** Later
**Status:** Planned
**Last updated:** March 2026

---

## Problem

Society golf days are a major revenue stream for UK clubs — a group of 20-40 golfers paying for golf, food, and sometimes prizes. Currently, organising a society day involves weeks of email exchanges between the society organiser and the club: negotiating a package, confirming numbers, choosing menus, arranging tee times, and managing payments. The club's sales team (often just the secretary or manager) juggles multiple society enquiries with no standardised workflow.

Society organisers want a simple process: see what's available, choose a package, customise the details, confirm numbers, and pay. Clubs want to fill mid-week tee times with high-value group bookings while minimising admin overhead.

## Goal

Enable clubs to create and publish configurable society day packages that organisers can browse, customise, and book online, with integrated tee time allocation, catering orders, and payment collection.

## Users

- **Primary:** Club manager/secretary (creating packages), society organiser (browsing/booking)
- **Secondary:** Front desk (managing on the day), catering team (food orders), PGA pro (if lessons included)

## Core requirements

### Must have

- **Package builder:**
  - Create named packages (e.g. "Classic Society Day", "Premium Experience", "Winter Warmer")
  - Components: golf (9 or 18 holes), food (breakfast, lunch, dinner, BBQ), drinks reception, prizes, on-course refreshments
  - Price per head per package
  - Minimum and maximum group size
  - Available days (typically Mon-Fri, with weekend premium)
  - Seasonal availability and pricing
  - Package includes/excludes list for clarity
- **Menu configuration:**
  - Define menu options per food component (e.g. 3 starters, 4 mains, 3 desserts)
  - Dietary options: vegetarian, vegan, gluten-free, dairy-free
  - Menu selection deadline: X days before event
  - Per-person menu choices or group menu selection
  - Drinks packages: pay bar, limited tab, full open bar
- **Booking workflow:**
  - Society organiser visits club website or LX2 booking page
  - Selects date (availability calendar showing open dates)
  - Chooses package
  - Enters group size (provisional — can be adjusted until deadline)
  - Customises food options
  - Receives quote with breakdown
  - Confirms booking with deposit (configurable: 20-50% of total)
  - Balance due date: configurable (typically 14 days before event)
- **Tee time allocation:**
  - Auto-allocate consecutive tee times based on group size (e.g. 24 players = 6 fourballs)
  - Shotgun start option for larger groups
  - Two-tee start option
  - Tee times blocked on the main tee sheet with "Society" label
- **Player management:**
  - Organiser submits player list with names and handicaps
  - Deadline for final names: configurable
  - Handle late additions and dropouts
  - Scoring via LX2 player app (create a society event linked to the booking)
- **Payment:**
  - Deposit collection at booking
  - Balance collection by deadline
  - Per-player or bulk payment options
  - Invoice generation
  - Refund policy for cancellations and reduced numbers

### Should have

- Online package browser: public-facing page showing available packages with photos
- Enquiry form for bespoke packages (events that don't fit standard offerings)
- Automated follow-up: email organiser at key milestones (menu deadline, balance due, player list due)
- On-the-day management: check-in sheet, scorecard allocation, prize list
- Post-event: results email to organiser, thank-you email, feedback survey
- Repeat booking discount for returning societies
- Corporate vs social society pricing tiers
- CRM: track society organisers and their booking history

### Won't have (this phase)

- Full event management (non-golf events)
- Marquee/equipment hire
- Photography/videography booking
- Multi-course society tours (visiting multiple clubs)

## Open questions

- [ ] Should society bookings be confirmed automatically (with deposit) or require club approval?
- [ ] How do we handle societies that want to bring their own prizes — do we deduct from the package price?
- [ ] What is the right deposit policy — fixed amount or percentage of total?
- [ ] Should the organiser be able to collect payments from individual players via LX2 (like the existing society scoring event payment)?
- [ ] How do we handle dietary requirements that aren't submitted by the deadline?

## Links

- Component: `apps/club/src/app/(console)/societies/` (future)
- Related PRD: `docs/prd/club-booking.md`
- Related PRD: `docs/prd/club-pricing.md`
- Related PRD: `docs/prd/club-teesheet.md`
- Related PRD: `docs/prd/event-creation.md`
