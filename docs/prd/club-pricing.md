# PRD: Dynamic Pricing Rules

**Module:** `club_pricing`
**Phase:** Soon
**Status:** Planned
**Last updated:** March 2026

---

## Problem

Green fee pricing at UK golf clubs varies by day of the week, time of day, season, player type (member, visitor, junior, senior), and group type (individual, society, corporate). Most clubs have a printed rate card that becomes outdated, and front desk staff must memorise or look up the correct rate for each booking scenario. Discounts and promotions (twilight rates, winter specials, loyalty offers) add further complexity.

Without systematic pricing rules, clubs either leave money on the table (undercharging visitors at peak times) or deter bookings (not offering competitive off-peak rates). Dynamic pricing, widely used in hospitality, is barely present in UK golf.

## Goal

Enable clubs to define flexible pricing rules that automatically calculate the correct green fee for any booking based on day, time, season, player type, and group size, with support for promotions and discounts.

## Users

- **Primary:** Club manager, secretary (setting pricing rules)
- **Secondary:** Front desk staff (seeing auto-calculated prices), visitors (seeing prices when booking online)

## Core requirements

### Must have

- **Base rate configuration:**
  - Green fee per round per player type: member guest, visitor, junior, senior
  - Weekday vs weekend/bank holiday rates
  - 9-hole and 18-hole rates
- **Seasonal pricing:**
  - Define seasons: peak (May-September), shoulder (March-April, October), off-peak (November-February)
  - Custom date ranges per season
  - Different rates per season
- **Time-of-day pricing:**
  - Twilight rate: automatically applies after a configurable time (e.g. 2pm summer, 12pm winter)
  - Early bird rate: before a configurable time
  - Super twilight: last 2 hours before sunset
- **Group/society rates:**
  - Tiered pricing by group size (e.g. 12-19 players, 20-29 players, 30+ players)
  - Society rates separate from individual visitor rates
  - Package pricing (see `society_packages` PRD for bundles)
- **Discounts:**
  - Junior discount: percentage off standard rate for under-18s
  - Senior discount: percentage off for 65+
  - County card holders: reciprocal rate
  - Member guest discount: reduced rate when accompanied by a member
  - Loyalty discount: returning visitors
- **Pricing engine:**
  - Given a booking (date, time, player type, group size), calculate the correct green fee
  - Show breakdown to front desk staff: "Visitor weekend rate: GBP 55, less 10% twilight = GBP 49.50"
  - Override capability: staff can manually adjust the auto-calculated price with a reason
- **Rate card display:**
  - Publishable rate card generated from pricing rules
  - Embeddable on club website
  - Visible in player app when booking
  - Automatic updates when rules change

### Should have

- Yield management: increase prices when utilisation exceeds threshold (e.g. > 80% for the day)
- Promotional codes: create time-limited discount codes for marketing campaigns
- Bundled pricing: round + buggy, round + range balls
- Corporate account rates: special pricing for named corporate accounts
- Competition entry fee management
- Price comparison: show how your rates compare to nearby clubs (manual benchmark input)
- A/B testing support for pricing strategies

### Won't have (this phase)

- Fully automated demand-based pricing (AI-driven)
- Integration with third-party pricing optimisation platforms
- Multi-currency support
- Membership subscription pricing (see `club_membership_billing` PRD)

## Pricing rule evaluation order

When multiple rules could apply to a booking, evaluate in this order (most specific wins):

1. Manual override (staff-set price)
2. Promotional code
3. Corporate account rate
4. Society/group rate (by size tier)
5. Time-of-day modifier (twilight, early bird)
6. Player type rate (junior, senior, county card)
7. Seasonal rate
8. Base rate (weekday/weekend)

## Open questions

- [ ] Should pricing rules be versioned so we can see what rate applied at the time of booking?
- [ ] How do we handle pricing for Cumberwell's multi-loop setup — is the rate the same regardless of which 18-hole combination?
- [ ] Do we need to support "dynamic" weekend pricing where Saturday differs from Sunday?
- [ ] Should twilight times be manually set or calculated from sunset data?
- [ ] How do we handle VAT — are green fees VAT-exempt for members but VATable for visitors?

## Links

- Component: `apps/club/src/app/(console)/pricing/` (future)
- Related PRD: `docs/prd/club-booking.md`
- Related PRD: `docs/prd/club-teesheet.md`
- Related PRD: `docs/prd/society-packages.md`
- Related PRD: `docs/prd/club-reporting.md`
