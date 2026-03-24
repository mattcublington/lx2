# PRD: Tee Time Booking

**Module:** `tee_booking`
**Phase:** Soon
**Status:** Planned
**Last updated:** March 2026

---

## Problem

Society organisers currently book tee times by phone or through separate club booking systems. The tee time information is disconnected from the LX2 event — the organiser has to manually tell players their tee times via WhatsApp. For clubs, their existing tee sheet systems don't talk to scoring platforms, creating double data entry.

Individual golfers booking casual rounds have a similar problem: they book on one platform and score on another, with no connection between the two.

## Goal

Integrated tee time booking within LX2 so organisers can book and assign tee times during event creation, and individual golfers can book at connected clubs directly from the player app.

## Users

- **Primary:** Society organisers booking tee times for their group as part of event setup
- **Secondary:** Individual golfers booking a tee time for a casual round
- **Tertiary:** Club professionals managing their tee sheet and seeing LX2 bookings alongside direct bookings

## Core requirements

### Must have

- **Calendar view at `/play/book` or `/book`:**
  - Date picker (calendar widget, scrollable by month)
  - Course selector (search by name from connected clubs)
  - Time slot grid showing available times (typically 7-8 minute intervals)
  - Slot states: available, limited (1-2 spots), booked, blocked

- **Slot selection:**
  - Tap to select a time slot
  - Choose number of players (1-4)
  - Select tee (Yellow/White/Red) if course has multiple tee options
  - 9-hole or 18-hole option where applicable

- **Booking confirmation:**
  - Summary: date, time, course, tee, number of players, total cost
  - Payment via Stripe Checkout (if course charges online)
  - Confirmation screen with booking reference
  - Email confirmation to player
  - Calendar invite download (.ics file)

- **Event integration:**
  - During event creation, organiser can search for available tee times
  - Book multiple consecutive slots for the group (e.g. 4 tee times, 8 minutes apart, for 16 players in 4-balls)
  - Assign players to tee times from the event manage page
  - Players see their tee time on the event landing page

- **My bookings:**
  - List of upcoming bookings on the play dashboard
  - Cancel/modify up to 24 hours before (configurable per club)
  - Booking history

### Should have

- Automatic flight assignment: given player count and group size, suggest tee time slots and assign players to groups
- Waiting list for fully booked time slots
- Twilight rate detection (show reduced rates after certain time)
- Guest green fee vs member rate differentiation

### Won't have (this phase)

- Real-time tee sheet sync with legacy club systems (BRS, iGolf, etc.)
- Dynamic pricing
- Buggy/trolley booking
- Food & beverage pre-ordering
- Multi-course booking in one transaction (see `multi_club_booking` PRD)

## Club integration model

For MVP, clubs opt in to LX2 tee booking. Integration options (phased):

1. **Manual tee sheet** (MVP): Club staff enters available slots via `club.lx2.golf` admin panel. LX2 manages availability. Club receives booking notifications.
2. **API integration** (Phase 2): Connect to club tee sheet APIs (BRS Golf, iGolf, Intelligent Golf) for real-time availability sync.
3. **Full tee sheet** (Phase 3): LX2 becomes the club's primary tee sheet system.

## Data model

```sql
tee_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id),
  date date NOT NULL,
  first_slot time NOT NULL,         -- e.g. '07:00'
  last_slot time NOT NULL,          -- e.g. '16:00'
  interval_minutes smallint DEFAULT 8,
  max_per_slot smallint DEFAULT 4,
  created_at timestamptz DEFAULT now(),
  UNIQUE (course_id, date)
)

tee_sheet_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tee_sheet_id uuid REFERENCES tee_sheets(id),
  start_time time NOT NULL,
  end_time time NOT NULL,
  reason text,                      -- 'competition', 'maintenance', 'reserved'
  created_at timestamptz DEFAULT now()
)

bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tee_sheet_id uuid REFERENCES tee_sheets(id),
  slot_time time NOT NULL,
  booked_by uuid REFERENCES users(id),
  event_id uuid REFERENCES events(id),   -- null for individual bookings
  players smallint NOT NULL,
  tee_id uuid REFERENCES course_tees(id),
  holes smallint DEFAULT 18,
  total_pence integer,
  payment_status text DEFAULT 'pending',  -- 'pending' | 'paid' | 'refunded'
  stripe_checkout_id text,
  booking_ref text NOT NULL,              -- human-readable, e.g. 'LX2-20260401-1430'
  status text DEFAULT 'confirmed',        -- 'confirmed' | 'cancelled'
  cancelled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (tee_sheet_id, slot_time, status) -- one confirmed booking per slot
)

-- Junction for event tee times
event_tee_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id),
  booking_id uuid REFERENCES bookings(id),
  group_number smallint,
  created_at timestamptz DEFAULT now()
)

-- Player-to-tee-time assignment
event_player_tee_times (
  event_player_id uuid REFERENCES event_players(id),
  event_tee_time_id uuid REFERENCES event_tee_times(id),
  PRIMARY KEY (event_player_id, event_tee_time_id)
)
```

## Pricing

- LX2 adds no booking fee for MVP (incentive for club adoption)
- Club sets green fee per tee, per day type (weekday/weekend), per time band (morning/afternoon/twilight)
- Visitor vs member rates (requires club membership verification — Phase 2)

## Open questions

- [ ] How do we handle no-shows? (Cancellation policy per club)
- [ ] Should there be a deposit vs full payment model?
- [ ] How do we verify club membership for member rates?
- [ ] Real-time availability: polling or WebSocket?
- [ ] What booking reference format? (Needs to be phone-friendly for pro shop check-in)
- [ ] Should we allow booking without an LX2 account? (Probably not — unlike event joining, booking involves payment)

## Links

- Club admin app: `apps/club/` (to be built)
- Play dashboard: `apps/web/src/app/play/PlayDashboard.tsx`
- Related PRD: `docs/prd/event-creation.md`
- Related PRD: `docs/prd/multi-club-booking.md`
- Related PRD: `docs/prd/my-club-dashboard.md`
