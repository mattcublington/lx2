# PRD: Vouchers & Gift Cards

**Module:** `club_vouchers`
**Phase:** Soon
**Status:** Planned
**Last updated:** March 2026

---

## Problem

Golf vouchers and gift cards are a significant revenue stream for UK clubs, particularly around Christmas, Father's Day, and birthdays. Most clubs sell paper vouchers from the pro shop or front desk, handwritten with the recipient's name and value. Tracking redemption is manual — often just a tick in a ledger. Unredeemed vouchers (breakage) represent pure profit, but clubs have no data on redemption rates.

Some clubs have moved to third-party voucher platforms, but these charge high commissions (10-15%) and don't integrate with the booking system. A member buying a gift voucher for a friend should be able to buy it online, send it digitally, and the recipient should be able to redeem it when booking a tee time through LX2.

## Goal

Provide a voucher and gift card system that clubs can sell online and in-person, with digital delivery, secure redemption against bookings, and full tracking of issuance, redemption, and expiry.

## Users

- **Primary:** Front desk staff (issuing and redeeming), club manager (reporting)
- **Secondary:** Members and public (purchasing online), gift recipients (redeeming)

## Core requirements

### Must have

- **Voucher creation:**
  - Generate unique voucher codes (8-character alphanumeric, URL-safe)
  - Set monetary value (GBP 25, 50, 75, 100, custom)
  - Set expiry date (default: 12 months from purchase, configurable)
  - Voucher type: monetary (spend on anything), specific (e.g. "1x 18-hole round")
  - Purchaser details: name, email, phone
  - Recipient details: name, email (for digital delivery)
  - Personal message field
- **Digital delivery:**
  - Branded email to recipient with voucher code, value, expiry, personal message
  - PDF voucher attachment (printable, branded with club logo)
  - QR code encoding the voucher code for easy scanning at redemption
- **Redemption:**
  - Enter voucher code at point of redemption (front desk or online booking)
  - Validate: code exists, not expired, has remaining balance
  - Partial redemption: deduct amount, retain balance for future use
  - Full redemption: mark as fully used
  - Record what the voucher was redeemed against (booking reference, pro shop item)
- **Voucher management dashboard:**
  - List all vouchers with status (active, redeemed, expired, cancelled)
  - Search by code, purchaser, recipient
  - Filter by status, date range, value
  - View voucher detail: issuance info, redemption history, remaining balance
  - Cancel/void a voucher (with reason)
  - Extend expiry date
- **Reporting:**
  - Total vouchers sold by period
  - Total value issued vs redeemed vs expired (breakage)
  - Outstanding liability (active unredeemed vouchers)
  - Revenue attribution: which bookings/purchases used vouchers

### Should have

- Online purchase via club website or LX2 player app (with Stripe payment)
- Bulk voucher generation for corporate gifts (e.g. 50x GBP 50 vouchers for a company)
- Top-up: add value to an existing voucher/gift card
- Transfer: change recipient of an unused voucher
- Promotional vouchers: issue free vouchers for marketing (flagged differently from purchased)
- Physical gift card support: link a card number to a digital voucher record
- Automated expiry reminder: email recipient 30 days before voucher expires

### Won't have (this phase)

- Loyalty points programme (earn points per round)
- Multi-club voucher acceptance
- Resale marketplace
- Integration with third-party voucher platforms (Groupon, etc.)

## Open questions

- [ ] Should vouchers be redeemable for pro shop purchases or only for golf (green fees, lessons)?
- [ ] How do we handle refunds — if a voucher is purchased online and the buyer wants a refund, do we refund to original payment method?
- [ ] Should there be a minimum purchase value for vouchers?
- [ ] Do we need to handle VAT on voucher sales (single-purpose vs multi-purpose voucher rules)?
- [ ] How do we prevent voucher code guessing or brute-force redemption?

## Links

- Component: `apps/club/src/app/(console)/vouchers/` (future)
- Related PRD: `docs/prd/club-booking.md`
- Related PRD: `docs/prd/club-pricing.md`
- Related PRD: `docs/prd/club-reporting.md`
