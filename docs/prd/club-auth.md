# PRD: Club Authentication & Authorisation

**Module:** `club_auth`
**Phase:** MVP
**Status:** Planned
**Last updated:** March 2026

---

## Problem

A golf club has multiple staff roles with different responsibilities and access needs. The general manager needs full access to financials and settings. The front desk needs to manage the tee sheet and check members in. The PGA pro needs to manage lessons and view bookings but shouldn't modify membership fees. Without role-based access, either everyone gets full admin (risky) or the system is limited to a single administrator (impractical).

Additionally, club staff turnover is common — seasonal front desk staff, temporary assistants, new committee members each year. The system needs a secure way to invite staff, manage permissions, and revoke access when people leave.

## Goal

Provide secure, role-based authentication for club staff so that each person sees only the features and data relevant to their role, with a simple invitation workflow for onboarding new staff.

## Users

- **Primary:** Club general manager or secretary (manages staff access)
- **Secondary:** All club staff (PGA pro, front desk, committee members)

## Core requirements

### Must have

- Role definitions stored in Supabase with the following default roles:
  - **Owner** — full access, can manage roles and billing, cannot be removed
  - **Admin** — full access to all modules except billing and role management
  - **Pro** — lessons, competitions, tee sheet view, member handicaps
  - **Secretary** — competitions, members, communications, reporting
  - **Front Desk** — tee sheet, bookings, member check-in, till operations
- Staff invitation via email — invitee receives a link to set up their account
- Invitation management: view pending invites, resend, revoke
- Staff list: view all staff with roles, last active date
- Edit staff roles (owner and admin only)
- Deactivate staff accounts (preserves audit trail, prevents login)
- Club membership verification: link a staff user to their `clubs` record
- Session management: auto-logout after 8 hours of inactivity
- Supabase Row Level Security (RLS) policies enforcing role permissions at the database level

### Should have

- Custom role creation (e.g. "Bar Manager" with specific module access)
- Activity log showing who did what and when (audit trail)
- Two-factor authentication option for owner and admin roles
- Password policy enforcement (minimum length, complexity)
- "Switch club" for users who are staff at multiple clubs

### Won't have (this phase)

- SSO/SAML integration for large resort groups
- Biometric authentication
- IP-based access restrictions
- API key management for staff (see `partner_api` PRD)

## Role permission matrix

| Module | Owner | Admin | Pro | Secretary | Front Desk |
|--------|-------|-------|-----|-----------|------------|
| Dashboard | Full | Full | Limited | Limited | Limited |
| Tee Sheet | Full | Full | View | View | Full |
| Members | Full | Full | View | Full | View |
| Competitions | Full | Full | Full | Full | View |
| Sheet Config | Full | Full | No | No | No |
| Billing | Full | No | No | No | No |
| Communications | Full | Full | No | Full | No |
| Reporting | Full | Full | Limited | Full | No |
| Staff Management | Full | No | No | No | No |
| Settings | Full | Full | No | No | No |

## Database schema

### `club_staff` table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| club_id | uuid | FK to `clubs` |
| user_id | uuid | FK to `auth.users` |
| role | text | Role identifier |
| invited_by | uuid | FK to `auth.users` |
| invited_at | timestamptz | When invitation was sent |
| accepted_at | timestamptz | When user accepted invite |
| deactivated_at | timestamptz | Null if active |
| last_active_at | timestamptz | Updated on each authenticated request |

### `club_invitations` table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| club_id | uuid | FK to `clubs` |
| email | text | Invited email address |
| role | text | Assigned role |
| token | text | Unique invitation token |
| invited_by | uuid | FK to `auth.users` |
| created_at | timestamptz | When invitation was created |
| expires_at | timestamptz | 7-day expiry |
| accepted_at | timestamptz | Null until accepted |

## Open questions

- [ ] Should we use Supabase custom claims (JWT) or database lookups for role checking?
- [ ] How do we handle the initial "owner" setup — is it tied to the club creation flow?
- [ ] Do committee members (e.g. handicap secretary, captain) need distinct roles or are they covered by "secretary"?
- [ ] Should role permissions be configurable per club or fixed globally?

## Links

- Component: `apps/club/src/middleware.ts`
- Component: `apps/club/src/app/auth/`
- Related PRD: `docs/prd/club-app-scaffold.md`
- Related PRD: `docs/prd/club-members.md`
