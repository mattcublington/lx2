# PRD: Booking API

**Module:** `booking_api`
**Phase:** Later
**Status:** Planned
**Last updated:** March 2026

---

## Problem

Golf clubs want to distribute their tee time inventory beyond their own website and the LX2 player app. Third-party platforms like GolfNow, TeeOfTimes, 18Birdies, and regional aggregators drive significant visitor traffic to clubs. Currently, these platforms either scrape the club's website, receive availability via email, or manage a separate allocation of tee times — leading to double-booking risk and manual reconciliation.

Clubs also want to embed booking widgets on their own website, allow tour operators to check availability programmatically, and enable corporate partners to book on behalf of their clients. All of these use cases require a standardised API for tee time availability and booking.

## Goal

Provide a RESTful API that allows authorised third-party platforms to query tee time availability, create bookings, modify bookings, and receive cancellation notifications — all reflected in real-time on the club's main tee sheet.

## Users

- **Primary:** Third-party booking platforms (GolfNow, TeeOfTimes, etc.)
- **Secondary:** Club website developers (embedding booking), tour operators, corporate partners

## Core requirements

### Must have

- **Availability endpoint:**
  - `GET /api/v1/availability` — returns available tee times for a date range
  - Parameters: date, course_id, players (group size), player_type (member, visitor)
  - Response: array of available slots with time, price, remaining capacity
  - Respects all booking rules (booking window, blocked times, competition slots)
  - Rate limited: configurable per API key
- **Booking creation:**
  - `POST /api/v1/bookings` — create a new booking
  - Payload: date, tee_time, course_id, players (name, email, handicap per player)
  - Validates availability at time of request (avoids race conditions via row-level locking)
  - Returns booking reference, confirmation status
  - Booking appears immediately on club's tee sheet
- **Booking modification:**
  - `PATCH /api/v1/bookings/{id}` — modify date, time, or player details
  - Subject to availability check
  - Change audit logged
- **Booking cancellation:**
  - `DELETE /api/v1/bookings/{id}` — cancel a booking
  - Cancellation policy enforced (deadline, penalty)
  - Slot released back to available inventory
- **Authentication:**
  - API keys per partner (issued by club via console)
  - API key scoped to specific club
  - Key includes permissions: read-only (availability) or read-write (booking)
  - API key rotation support
  - All requests authenticated via `Authorization: Bearer {api_key}` header
- **Webhook notifications:**
  - Club configures webhook URLs per partner
  - Events: booking_confirmed, booking_modified, booking_cancelled, availability_changed
  - Signed payloads (HMAC-SHA256) for verification
  - Retry logic: 3 attempts with exponential backoff
  - Webhook delivery log viewable in console
- **Inventory control:**
  - Club defines how many slots per day are available via API vs direct booking
  - "Channel allocation": e.g. 20% of slots available to GolfNow, 80% direct
  - Dynamic release: unsold API-allocated slots released to direct booking X hours before tee time
  - Per-partner allocation if multiple API partners

### Should have

- Sandbox environment for partner testing (mock data, no real bookings)
- Rate card endpoint: `GET /api/v1/pricing` — returns current prices for a date/time
- Course information endpoint: `GET /api/v1/courses` — returns course details, par, facilities
- Booking status endpoint: `GET /api/v1/bookings/{id}` — check current status
- Batch availability query: multiple dates in one request
- Idempotency keys on booking creation to prevent duplicate bookings on network retry
- Usage dashboard: API calls per partner, bookings created, revenue generated
- OpenAPI/Swagger specification (see `api_docs` PRD)

### Won't have (this phase)

- Payment processing via API (partner handles payment, club invoices partner)
- Member booking via API (members book direct through LX2 app)
- Real-time streaming availability (WebSocket)
- Marketplace / distribution management platform
- Commission calculation and settlement

## API design principles

- RESTful JSON API
- Versioned: `/api/v1/` prefix, breaking changes only in new major versions
- UTC timestamps in ISO 8601 format
- GBP currency amounts as integers (pence) to avoid floating-point issues
- Pagination via `cursor` parameter for list endpoints
- Error responses: standard format with `code`, `message`, `details`
- CORS configured per partner origin

## Open questions

- [ ] Should the API be hosted at `api.lx2.golf` or as a route within the club app?
- [ ] How do we handle commission/revenue share with third-party platforms — is this in-scope or handled externally?
- [ ] Should we support GraphQL as an alternative to REST for flexible querying?
- [ ] How do we handle third-party cancellations after the club's cancellation deadline?
- [ ] What SLA (uptime, response time) do we commit to for API partners?

## Links

- Component: `apps/club/src/app/api/v1/` (future)
- Related PRD: `docs/prd/club-teesheet.md`
- Related PRD: `docs/prd/club-booking.md`
- Related PRD: `docs/prd/club-pricing.md`
- Related PRD: `docs/prd/partner-api.md`
- Related PRD: `docs/prd/api-docs.md`
