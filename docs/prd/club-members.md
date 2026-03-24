# PRD: Member Management

**Module:** `club_members`
**Phase:** MVP
**Status:** Planned
**Last updated:** March 2026

---

## Problem

UK golf clubs maintain detailed member records — personal details, membership category, handicap index, subscription status, competition eligibility, and more. Most clubs manage this across a combination of their legacy club system, England Golf CDH (Central Database of Handicaps), spreadsheets, and paper forms. Member data is frequently out of date, duplicated, or inconsistent between systems.

When a member joins, changes category, or leaves, multiple systems need updating. Front desk staff waste time cross-referencing records. The handicap secretary spends hours before competitions verifying eligibility and current indices. A modern, single-source-of-truth member database integrated with WHS (World Handicap System) would save clubs significant administrative overhead.

## Goal

Provide a comprehensive member management module where club staff can add, view, edit, search, and deactivate members, with accurate handicap tracking and support for UK golf club membership structures.

## Users

- **Primary:** Club secretary, office administrator
- **Secondary:** Front desk staff (viewing/check-in), PGA pro (handicap viewing), handicap secretary

## Core requirements

### Must have

- Member list view with search (name, membership number, email) and filters (category, status, gender)
- Sortable columns: name, membership number, category, handicap index, join date, status
- Pagination (50 members per page default) with total count
- Add new member form:
  - Personal: title, first name, surname, date of birth, gender, email, phone, address
  - Membership: category, membership number (auto-generated or manual), join date
  - Handicap: CDH number, current handicap index, home club indicator
  - Emergency contact: name, phone, relationship
- Edit member details (all fields)
- Deactivate member (soft delete — retains record, removes from active lists)
- Reactivate previously deactivated member
- Member detail page showing full profile, membership history, competition record
- Membership categories:
  - Full (7-day)
  - 5-Day
  - Junior (under 18)
  - Colt (18-25)
  - Intermediate (25-30)
  - Senior (65+)
  - Social (non-playing)
  - Honorary
  - Life
  - Country (lives 50+ miles away)
  - Temporary / Flexible
- CSV import tool for bulk member upload (map columns to fields, preview before import, validation report)
- CSV export of current member list with configurable columns
- Member count by category on the members list page

### Should have

- England Golf CDH integration: pull handicap index from CDH API
- WHS handicap tracking: display current index, low index, 20-score rolling history
- Member photo upload
- Membership history log (category changes, join/leave dates)
- Duplicate detection on import and manual entry (matching on name + DOB or email)
- Bulk actions: email selected members, change category, export selected
- Notes field per member (visible to admin only)
- QR code per member for check-in at front desk
- Family/household linking (e.g. Mr & Mrs Smith share an address, linked accounts)
- GDPR compliance: data export per member, right-to-erasure workflow

### Won't have (this phase)

- Self-service member portal (members edit their own details via player app)
- Automated membership renewal
- Direct debit setup (see `club_membership_billing` PRD)
- Voting/AGM functionality
- Club-branded membership cards (physical)

## Database schema

### `club_members` table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| club_id | uuid | FK to `clubs` |
| user_id | uuid | FK to `auth.users` (nullable — not all members use the app) |
| membership_number | text | Club-specific membership number |
| title | text | Mr, Mrs, Ms, Dr, etc. |
| first_name | text | |
| surname | text | |
| date_of_birth | date | |
| gender | text | Male, Female, Non-binary |
| email | text | |
| phone | text | |
| address_line_1 | text | |
| address_line_2 | text | |
| city | text | |
| county | text | |
| postcode | text | |
| category | text | FK to `membership_categories` |
| cdh_number | text | England Golf CDH number |
| handicap_index | numeric(3,1) | Current WHS handicap index |
| join_date | date | |
| leaving_date | date | Null if active |
| status | text | active, inactive, suspended, deceased |
| emergency_contact_name | text | |
| emergency_contact_phone | text | |
| emergency_contact_relationship | text | |
| photo_url | text | |
| notes | text | Admin-only notes |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `membership_categories` table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| club_id | uuid | FK to `clubs` |
| name | text | Category name |
| code | text | Short code (e.g. "FULL", "5DAY") |
| description | text | |
| is_playing | boolean | Whether this category has playing rights |
| annual_fee | numeric | Standard annual subscription |
| sort_order | int | Display order |

## Open questions

- [ ] How do we handle the CDH integration — is there a public API or do we need to go through England Golf?
- [ ] Should membership number format be configurable per club (some use numbers, some use letters + numbers)?
- [ ] How do we handle reciprocal membership arrangements with other clubs?
- [ ] Do we need to store previous handicap indices or just the current one?
- [ ] What is the right approach for GDPR data retention — how long after a member leaves do we keep their record?

## Links

- Component: `apps/club/src/app/(console)/members/page.tsx`
- Related PRD: `docs/prd/club-auth.md`
- Related PRD: `docs/prd/club-membership-billing.md`
- Related PRD: `docs/prd/club-communications.md`
