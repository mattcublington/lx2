# PRD: Multi-Club Booking

**Module:** `multi_club_booking`
**Phase:** Later
**Status:** Planned
**Last updated:** March 2026

---

## Problem

Society organisers running away days or tour events need to book tee times across multiple clubs. Currently this means calling each club individually, cross-referencing availability, negotiating group rates, and coordinating payment separately with each venue. For a society tour visiting 3 clubs over a weekend, this is hours of phone calls and a spreadsheet nightmare.

Individual golfers visiting a new area face a similar friction: they want to play the best courses available on their dates, but comparing availability and pricing across clubs requires visiting multiple websites.

## Goal

A unified booking interface where society organisers can search, compare, and book tee times at multiple connected clubs in a single transaction. Individual golfers can use the same interface to plan multi-course trips.

## Users

- **Primary:** Society organisers planning an away day or multi-day tour at 2-4 different clubs
- **Secondary:** Individual golfers or small groups booking a golf trip to an unfamiliar area
- **Tertiary:** Club managers setting group rates and availability for visiting societies

## Core requirements

### Must have

- **Multi-course search at `/book/multi` or `/plan`:**
  - Location search: area/region (e.g. "Somerset", "Cotswolds") or specific club names
  - Date range selector: single day, weekend, or custom range
  - Group size: number of players
  - Results: list of available clubs with pricing, course rating, slope rating, and availability

- **Comparison view:**
  - Side-by-side or table view of shortlisted clubs
  - Columns: club name, green fee (per player), course rating, slope rating, availability slots, distance from centre point
  - Sort by: price, rating, availability, distance

- **Multi-club basket:**
  - Add tee times from different clubs to a single booking basket
  - Basket summary: total cost breakdown per club, per day
  - Group rate detection: if booking 12+ players, show society/group rate where available
  - Date conflict detection: warn if two bookings overlap or are too close for travel

- **Group booking:**
  - Organiser books on behalf of the group (specifies total players per slot)
  - Individual players can be assigned to specific tee times later
  - Organiser can split payment: pay full amount or share payment link with players
  - Booking confirmation: single confirmation with all venues, dates, times

- **Single checkout:**
  - Stripe Checkout session covering all venues in one payment
  - LX2 handles payout to individual clubs (Stripe Connect — connected accounts)
  - Itemised receipt showing per-club charges

- **Itinerary view:**
  - After booking, generate a trip itinerary page at `/trips/[id]`
  - Each day: club, tee time, address, directions link, green fee
  - Shareable with the group via link
  - iCal export with all tee times

### Should have

- **Map view:** Show available clubs on a map, radius filter from a centre point
- **Travel time estimates:** Driving time between consecutive courses (via mapping API)
- **Group rates:** Clubs can define tiered pricing (12-15 players: -10%, 16+ players: -15%)
- **Package deals:** Clubs can create bundled offers (e.g. "golf + breakfast" or "2 rounds + 1 night B&B partner")
- **Rebooking:** Swap one club for another without re-creating the entire booking
- **Weather forecast:** Show 5-day forecast for each venue

### Won't have (this phase)

- Accommodation booking integration
- Travel/transport booking
- Automated group rate negotiation
- Custom tour packages marketed by LX2
- Reviews or ratings of clubs
- Course flyover videos

## Data model

```sql
-- New tables:
trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_id uuid REFERENCES users(id),
  name text NOT NULL,                    -- e.g. 'Cotswolds Weekend 2026'
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_players smallint NOT NULL,
  total_pence integer,
  payment_status text DEFAULT 'pending', -- 'pending' | 'partial' | 'paid'
  stripe_checkout_id text,
  created_at timestamptz DEFAULT now()
)

trip_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id),
  booking_id uuid REFERENCES bookings(id),  -- individual tee time booking
  day_number smallint,                       -- 1, 2, 3...
  notes text,
  sort_order smallint DEFAULT 0,
  created_at timestamptz DEFAULT now()
)

-- Existing table extension:
-- clubs add group_rate_config jsonb
-- e.g. {"tiers": [{"min_players": 12, "discount_pct": 10}, {"min_players": 16, "discount_pct": 15}]}

club_group_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES clubs(id),
  min_players smallint NOT NULL,
  discount_pct numeric(4,1) NOT NULL,  -- e.g. 10.0 = 10% off
  valid_days text[],                    -- e.g. ['monday','tuesday','wednesday'] or null = all days
  valid_from date,
  valid_until date,
  created_at timestamptz DEFAULT now()
)
```

## Payment flow (Stripe Connect)

1. Each connected club has a Stripe Connected Account
2. Organiser completes single Stripe Checkout session
3. LX2 receives total payment
4. LX2 transfers respective amounts to each club's connected account (minus platform fee)
5. Platform fee: percentage or per-player per-round charge (TBD)
6. Refund handling: per-booking cancellation, refund goes back via Stripe, club transfer adjusted

## Search and availability

- Availability comes from `tee_sheets` table (same as single-club booking)
- Multi-club search executes parallel queries across clubs in the selected region
- Results cached for 5 minutes to reduce database load during search
- Course data includes: course rating, slope rating, hole count, facilities
- Geographic filtering uses PostGIS `ST_DWithin` or simple lat/lng distance calculation

## Open questions

- [ ] What's the LX2 platform fee for multi-club bookings? (Per player? Percentage? Flat?)
- [ ] How do we handle clubs with different cancellation policies in a single trip?
- [ ] Should the organiser be able to split the payment link (each player pays their share)?
- [ ] Do we need Stripe Connect from day one, or can we start with manual payouts?
- [ ] How do we verify club pricing is current? (Expiry dates on rates?)
- [ ] Should we support non-connected clubs? (Booking via email/phone with LX2 just as itinerary planner)
- [ ] Minimum players for group rate: enforced at booking time or on the day?

## Links

- Tee booking (single club): to be built
- Club admin: `apps/club/` (to be built)
- Related PRD: `docs/prd/tee-booking.md`
- Related PRD: `docs/prd/my-club-dashboard.md`
- Related PRD: `docs/prd/event-creation.md`
