# PRD: Partner Integration API

**Module:** `partner_api`
**Phase:** Later
**Status:** Planned
**Last updated:** March 2026

---

## Problem

As LX2 grows, clubs and their technology partners need programmatic access to club data beyond just tee time bookings. A club's website developer needs to display competition results. Their handicap system needs to pull member data. A county golf union needs to access competition results for inter-club events. A third-party CRM or marketing tool needs member segments for targeted campaigns.

The booking API (see `booking_api` PRD) covers tee time distribution. The partner API is a broader integration layer covering the full LX2 data model — members, competitions, events, communications, and reporting. It enables LX2 to be the system of record while allowing clubs to use best-of-breed tools for specific functions.

## Goal

Provide a comprehensive, multi-tenant API with full CRUD access to the LX2 data model, scoped API keys per club, rate limiting, and webhook delivery for real-time event notifications.

## Users

- **Primary:** Technology partners building integrations, club website developers
- **Secondary:** County golf unions, handicap system providers, third-party CRM/marketing tools

## Core requirements

### Must have

- **Multi-tenant architecture:**
  - Each club is a tenant
  - API keys scoped to a single club (cannot access another club's data)
  - Club ID included in all requests as path parameter or inferred from API key
- **Resource endpoints:**
  - **Members:** `GET /POST /PATCH /DELETE /api/v1/clubs/{club_id}/members`
    - List, create, update, deactivate members
    - Filter by category, status, activity
    - Includes handicap index, membership details
  - **Competitions:** `GET /POST /PATCH /api/v1/clubs/{club_id}/competitions`
    - List, create, update competitions
    - Entries: list, add, withdraw
    - Results: publish, retrieve
    - Draw: generate, retrieve
  - **Events:** `GET /POST /PATCH /api/v1/clubs/{club_id}/events`
    - Society events, club events
    - Entries and scoring data
  - **Bookings:** full CRUD (extends booking API)
  - **Courses:** `GET /api/v1/clubs/{club_id}/courses`
    - Course details, hole data, tee information
  - **Communications:** `POST /api/v1/clubs/{club_id}/communications`
    - Trigger email or push notification via API
    - Template-based or custom content
- **Authentication and authorisation:**
  - API keys generated per integration per club
  - Key scopes: define which resources a key can access (e.g. read-only members, read-write competitions)
  - OAuth 2.0 client credentials flow for server-to-server integrations
  - Personal access tokens for developer testing
  - All keys manageable from club console (create, view, revoke, rotate)
- **Rate limiting:**
  - Per-key rate limits (configurable per tier)
  - Default: 100 requests/minute for standard, 1000/minute for premium
  - Rate limit headers in response: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
  - 429 Too Many Requests with retry-after header when exceeded
- **Webhook delivery:**
  - Register webhook endpoints per event type per integration
  - Event types: member.created, member.updated, booking.created, booking.cancelled, competition.results_published, etc.
  - Signed payloads (HMAC-SHA256 with shared secret)
  - Delivery retry: 3 attempts with exponential backoff (1min, 5min, 30min)
  - Webhook logs: delivery status, response code, payload (viewable in console)
  - Test webhook: send a test event to verify endpoint configuration
- **Data consistency:**
  - ETags for optimistic concurrency control on updates
  - Pagination: cursor-based for stable iteration over large datasets
  - Filtering: query parameters for common filters (date range, status, category)
  - Sorting: configurable sort order on list endpoints
  - Partial responses: `fields` parameter to request specific fields only

### Should have

- Bulk operations: batch create/update members, batch booking creation
- Search endpoint: full-text search across members and bookings
- API versioning strategy: v1, v2 with deprecation timeline
- SDK packages: JavaScript/TypeScript and Python client libraries
- Changelog feed: RSS/Atom feed of API changes
- Usage analytics per key: requests by endpoint, error rates, response times
- IP allowlisting per API key (security restriction)

### Won't have (this phase)

- GraphQL API
- Real-time streaming (WebSocket/SSE) — use webhooks instead
- File upload/download via API (photos, documents)
- Multi-club aggregate endpoints (see `multi_club_resort` PRD)
- OAuth 2.0 authorization code flow (for user-delegated access)

## API conventions

- Base URL: `https://api.lx2.golf/v1/`
- JSON request and response bodies
- HTTP methods: GET (read), POST (create), PATCH (update), DELETE (remove)
- Status codes: 200 (OK), 201 (Created), 204 (No Content), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 409 (Conflict), 422 (Unprocessable Entity), 429 (Too Many Requests), 500 (Internal Server Error)
- Error response format: `{ "error": { "code": "MEMBER_NOT_FOUND", "message": "...", "details": {...} } }`
- Timestamps: ISO 8601 with timezone (UTC)
- Currency: amounts in pence (integer), currency code in a separate field

## Open questions

- [ ] Should the API be a separate service (e.g. Supabase Edge Function or standalone Node service) or part of the club app?
- [ ] How do we handle rate limit tiers — is it per club subscription plan or per integration?
- [ ] Do we need a partner onboarding/approval process or can any developer request API access?
- [ ] How do we handle GDPR data subject requests via API (member requests data deletion)?
- [ ] Should we charge for API access (per-request or per-integration fee)?

## Links

- Component: `apps/club/src/app/api/v1/` (future) or separate service
- Related PRD: `docs/prd/booking-api.md`
- Related PRD: `docs/prd/api-docs.md`
- Related PRD: `docs/prd/club-auth.md`
