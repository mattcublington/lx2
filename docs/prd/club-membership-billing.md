# PRD: Membership Billing

**Module:** `club_membership_billing`
**Phase:** Soon
**Status:** Planned
**Last updated:** March 2026

---

## Problem

UK golf club memberships typically range from GBP 500 to GBP 2,500+ per year. Collecting these payments is a major administrative burden. Most clubs use a combination of direct debit (via providers like GoCardless or SmartDebit), bank transfers, cheques, and cash. The membership secretary spends significant time chasing arrears, processing renewals, and reconciling payments against the member database.

Legacy systems often have basic billing modules that are disconnected from the member database, leading to manual cross-referencing. Monthly payment plans are increasingly popular (spreading annual fees over 12 months), but managing these alongside annual payers adds complexity. Clubs also need to handle mid-year joiners (pro-rata fees), category changes, and leavers (potential refunds or notice periods).

## Goal

Automate membership subscription billing with support for annual and monthly payment plans, integrated directly with the member database, reducing manual reconciliation and arrears chasing.

## Users

- **Primary:** Club secretary, office administrator, treasurer
- **Secondary:** Club manager (financial oversight), members (receiving invoices)

## Core requirements

### Must have

- **Subscription plans:**
  - Define plans per membership category (e.g. Full = GBP 1,800/year or GBP 160/month)
  - Annual payment: single invoice, due by renewal date
  - Monthly payment: 12 equal instalments, due on a fixed day each month
  - Quarterly payment option
  - Pro-rata calculation for mid-year joiners
- **Invoice generation:**
  - Automatic invoice generation at renewal (configurable: 30/60/90 days before due date)
  - PDF invoice with club branding, member details, amount breakdown
  - Email invoice to member
  - Manual invoice creation for ad-hoc charges
- **Payment recording:**
  - Record payment received (cash, bank transfer, cheque, card, direct debit)
  - Partial payment support
  - Payment allocation against specific invoices
  - Overpayment handling (credit on account)
- **Direct debit integration:**
  - GoCardless integration for UK direct debit collection
  - Set up mandate via email link to member
  - Automatic collection on due dates
  - Failed payment handling: retry logic, notification to member and club
  - Mandate management: view, cancel, update
- **Renewal workflow:**
  - Annual renewal process: generate renewal notices X days before expiry
  - Renewal reminder sequence: 60 days, 30 days, 14 days, 7 days, overdue
  - Member confirms renewal or notifies intention to leave
  - Auto-renew option for direct debit payers
  - Lapsed membership handling: grace period, then deactivation
- **Arrears management:**
  - Arrears report: members with overdue payments
  - Automated arrears reminders (configurable frequency)
  - Escalation: flag to committee after X days overdue
  - Suspend playing rights after Y days overdue (configurable)
  - Write-off bad debt (with approval workflow)
- **Payment history:**
  - Full payment history per member
  - Club-wide payment ledger
  - Reconciliation view: match bank statement entries to recorded payments

### Should have

- Stripe integration as alternative to GoCardless
- Credit/debit card payment via secure payment link
- Standing order tracking (manual reconciliation with bank feed)
- Family billing: single invoice covering multiple family members
- Joining fee handling: one-time charge on initial membership
- Discount codes for early renewal (e.g. 5% discount if paid by 31 December)
- Tax handling: VAT on subscriptions where applicable
- Year-end financial summary per member (for tax purposes)

### Won't have (this phase)

- Full accounting integration (Xero, QuickBooks)
- Automated bank feed import
- Green fee billing (see `club_pricing` PRD)
- Bar/shop billing
- Payroll

## Payment lifecycle

```
Subscription Active → Invoice Generated → Sent to Member → Payment Due
                                                          ↓
                                           Paid → Allocated → Reconciled
                                           ↓
                                           Overdue → Reminder 1 → Reminder 2 → Escalation
                                                                                 ↓
                                                              Playing Rights Suspended
                                                                                 ↓
                                                              Paid → Reinstated
                                                              ↓
                                                              Written Off
```

## Open questions

- [ ] Should we support Bacs direct debit natively or only via GoCardless/Stripe?
- [ ] How do we handle clubs that collect subs via the county union (some counties batch-collect)?
- [ ] What is the right approach for mid-year category changes — pro-rata refund + new charge, or difference only?
- [ ] Do we need to support payment plans for green fees (pay-as-you-play memberships)?
- [ ] How do we handle joint/family memberships where one person pays for multiple members?

## Links

- Component: `apps/club/src/app/(console)/billing/` (future)
- Related PRD: `docs/prd/club-members.md`
- Related PRD: `docs/prd/club-reporting.md`
- Related PRD: `docs/prd/club-communications.md`
