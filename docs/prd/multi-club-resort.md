# PRD: Multi-Club / Resort Management

**Module:** `multi_club_resort`
**Phase:** Future
**Status:** Planned
**Last updated:** March 2026

---

## Problem

Golf resort groups and management companies operate multiple venues — The Club Company runs 14 clubs, Crown Golf manages 20+, and many independent operators run 2-5 courses. Each venue currently operates as a silo with its own member database, tee sheet, pricing, and reporting. Group managers have no consolidated view without manually aggregating data from each site.

Members of multi-club groups often have reciprocal playing rights but must re-register or call each venue to book. There is no cross-venue booking system, no shared member recognition, and no group-level reporting. The management company's head office wants a single dashboard showing all venues, but the club-level staff need their own focused view.

## Goal

Extend the LX2 club console to support multi-venue groups with a consolidated management layer, shared member database, cross-venue booking, and group-level reporting.

## Users

- **Primary:** Group operations director, regional manager
- **Secondary:** Individual club managers (accessing group features), members (cross-venue booking)

## Core requirements

### Must have

- **Group hierarchy:**
  - Define a group (e.g. "Cumberwell Golf Group")
  - Add clubs/venues to the group
  - Group-level admin role with access to all venues
  - Venue-level admin role limited to their own club
  - Group dashboard: aggregated metrics across all venues
- **Consolidated reporting:**
  - Revenue across all venues: total, per venue, by category
  - Member count across all venues
  - Tee sheet utilisation across all venues
  - Competition participation aggregated
  - Comparison: venue vs venue performance
  - Exportable group-level reports for board meetings
- **Shared member database:**
  - Members belong to a "home club" but are recognised across the group
  - Single member profile visible at all venues
  - Cross-venue playing history
  - Group-wide membership categories (some groups offer "group membership" covering all venues)
- **Cross-venue booking:**
  - Members can book at any venue in the group via the player app
  - Reciprocal rate automatically applied (or free for group members)
  - Booking visible at the destination venue's tee sheet
  - Guest rate for non-group members at partner venues
- **Centralised configuration:**
  - Group-wide pricing templates (apply base pricing across venues, override per venue)
  - Shared communication templates
  - Group-wide competition calendar (inter-club events)
  - Centralised user/staff management (assign staff to multiple venues)

### Should have

- Group loyalty programme: earn points at any venue, redeem at any venue
- Centralised voucher system: vouchers valid across all group venues
- Group-level waiting list: member can request to transfer home club within the group
- Benchmark reporting: compare each venue against group averages
- Bulk operations: send a communication to all members across all venues
- Group billing: consolidated invoicing for multi-venue memberships
- Data segregation controls: venue staff can only see their own venue's financial data

### Won't have (this phase)

- White-label branding per venue
- Franchise management (independent clubs sharing software but not data)
- Multi-country support (currency, language, regulatory differences)
- Custom data schemas per venue

## Open questions

- [ ] How do we handle inter-club revenue sharing (member plays away, who gets the revenue)?
- [ ] Should group-level data be stored in a separate schema/database or aggregated from venue-level data?
- [ ] How do we handle venues with different Supabase projects — or must all venues share one project?
- [ ] What happens to a venue's data if they leave the group?
- [ ] How do we manage different tee sheet configurations across venues (some may have very different setups)?

## Links

- Component: `apps/club/src/app/(console)/group/` (future)
- Related PRD: `docs/prd/club-app-scaffold.md`
- Related PRD: `docs/prd/club-members.md`
- Related PRD: `docs/prd/club-reporting.md`
