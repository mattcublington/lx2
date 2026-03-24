# PRD: Payments (Event Entry Fees)

**Module:** `payments`
**Phase:** MVP
**Status:** Planned
**Last updated:** March 2026

---

## Problem

Society golf events typically charge an entry fee (commonly 5-20 GBP) that covers competition prizes, nearest-the-pin pots, and sometimes a contribution to the society fund. Currently, collecting these fees is a manual process -- the organiser chases players via WhatsApp, collects cash on the day, or uses personal bank transfers with no tracking. This creates friction, delays, and disputes over who has or has not paid.

LX2 should automate entry fee collection so that players pay when they RSVP, organisers have a clear paid/unpaid view, and the money flows through a proper payment processor.

## Goal

Integrate Stripe Checkout for event entry fee collection at the point of RSVP, with a clear payment status view for organisers and Stripe Connect for club payouts in a later phase.

## Users

- **Primary:** Players paying event entry fees when they confirm attendance
- **Secondary:** Organisers tracking who has paid and managing refunds; clubs receiving payouts via Stripe Connect

## Core requirements

### Must have

- Organiser sets an optional `entry_fee_pence` (integer, GBP pence) when creating an event
- If an entry fee is set, players are redirected to Stripe Checkout when they confirm RSVP
- On successful payment, `event_players.payment_status` is updated to `'paid'`
- Stripe webhook handler verifies payment completion and updates the database
- Organiser sees payment status per player on the manage page (paid / unpaid / refunded / waived)
- Organiser can manually mark a player as "waived" (e.g., paid cash on the day)
- Payment amounts stored in pence (integer) to avoid floating-point issues
- Stripe Checkout session metadata includes `event_id` and `event_player_id` for reliable webhook matching

### Should have

- Refund capability: organiser triggers a refund via the manage page, which calls Stripe Refund API
- Payment reminder: organiser can nudge unpaid players (in-app notification or email)
- Payment summary: total collected, total outstanding, breakdown by status
- Stripe receipt emails sent automatically to players
- Idempotent webhook handling (replay-safe)

### Won't have (this phase)

- **Stripe Connect** for club payouts (Phase 3 -- requires onboarding clubs as Stripe Connected Accounts)
- In-app payment processing (always redirect to Stripe Checkout for PCI compliance)
- Subscription/recurring payments (membership fees)
- Multi-currency support (GBP only for UK societies)
- Split payments (e.g., pay entry fee + dinner separately)
- Payment plans or deposits

## Technical design

### Stripe integration

- **Stripe Checkout (hosted)**: redirect player to Stripe's hosted payment page. No card data touches LX2 servers.
- **Stripe webhooks**: `checkout.session.completed` event triggers payment status update
- **Stripe Refund API**: organiser-triggered refunds via `stripe.refunds.create()`

### Payment flow

1. Organiser creates event with `entry_fee_pence: 1000` (10 GBP)
2. Player clicks "Join" on event page
3. Server action creates `event_players` row with `payment_status: 'unpaid'`
4. Server action creates Stripe Checkout Session with:
   - `line_items`: single item with `entry_fee_pence` as unit amount
   - `metadata`: `{ event_id, event_player_id }`
   - `success_url`: `/events/{id}?payment=success`
   - `cancel_url`: `/events/{id}?payment=cancelled`
5. Player is redirected to Stripe Checkout
6. On payment, Stripe sends `checkout.session.completed` webhook
7. Webhook handler verifies signature, extracts metadata, updates `event_players.payment_status = 'paid'`
8. Player sees confirmation on the event page

### Database (existing schema)

The schema already supports payments:

- `events.entry_fee_pence` (integer, nullable) -- already in schema
- `event_players.payment_status` (text, CHECK constraint: `'unpaid' | 'paid' | 'refunded' | 'waived'`) -- already in schema
- `bookings.payment_id` (text) -- exists for tee-sheet bookings, similar pattern for events

### New additions needed

- Add `stripe_checkout_session_id` to `event_players` or a new `event_payments` table
- Webhook route: `apps/web/src/app/api/webhooks/stripe/route.ts`
- Environment variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`

### Stripe Connect (Phase 3)

In Phase 3, clubs will onboard as Stripe Connected Accounts. Event payments will flow through the club's connected account, with LX2 taking an application fee. This requires:
- Club onboarding flow (Stripe Connect Express or Standard)
- `stripe_account_id` on the `clubs` table
- Application fee configuration
- Payout schedule management

## Refund flow

1. Organiser clicks "Refund" on player row in manage page
2. Server action calls `stripe.refunds.create({ payment_intent: ... })`
3. On success, updates `event_players.payment_status = 'refunded'`
4. Stripe sends refund confirmation email to player

## Open questions

- [ ] Should players who do not pay be automatically removed from the event after a deadline?
- [ ] How to handle the case where a player pays but then the event is cancelled (bulk refund)?
- [ ] Should we support "pay on the day" as a legitimate payment method (organiser marks as paid manually)?
- [ ] What is the Stripe fee structure and who absorbs it -- the society or the player?
- [ ] Should we store Stripe Customer IDs on users for faster repeat checkout?

## Links

- Events schema: `packages/db/migrations/000_initial_schema.sql` (events.entry_fee_pence, event_players.payment_status)
- Webhook route (planned): `apps/web/src/app/api/webhooks/stripe/route.ts`
- Related PRD: `docs/prd/auth.md`
- Related PRD: `docs/prd/org-dashboard.md`
