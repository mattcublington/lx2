# PRD: Membership Waiting List

**Module:** `club_waitlist`
**Phase:** Soon
**Status:** Planned
**Last updated:** March 2026

---

## Problem

Many established UK golf clubs have waiting lists for full membership, sometimes lasting several years. Managing this process is often entirely manual — a paper list, a spreadsheet, or at best a basic database entry. When a spot opens, the secretary contacts applicants in order, often by phone or letter. There is no transparency for applicants on their position or expected wait time. Some clubs also require a proposer and seconder from existing membership, adding another layer of manual coordination.

For clubs without a waiting list, new member applications still need a structured process: application form, verification, category assignment, payment setup, and onboarding. This is typically handled by a sequence of emails and paper forms.

## Goal

Digitise the membership waiting list and application process, providing transparency for applicants and reducing administrative overhead for the club.

## Users

- **Primary:** Club secretary, membership committee
- **Secondary:** Prospective members (applicants)

## Core requirements

### Must have

- **Application form:**
  - Online application form accessible via club website or direct link
  - Fields: personal details, golfing experience, current club (if any), CDH number, preferred category, how they heard about the club
  - Proposer and seconder fields (name, membership number) — configurable per club
  - Declaration and consent checkboxes (data processing, club rules)
  - Submission confirmation email to applicant
- **Waiting list management:**
  - View all applicants in priority order
  - Priority ranking: typically date of application, but configurable (some clubs prioritise juniors, family connections, or local residents)
  - Status per applicant: applied, on waiting list, offered, accepted, declined, withdrawn
  - Estimated wait time based on current position and historical turnover
  - Notes field per applicant (committee comments, interview notes)
- **Offer workflow:**
  - When a membership spot opens, system identifies the next applicant(s) on the waiting list
  - Secretary sends offer email/letter via the system
  - Applicant has a configurable response window (e.g. 14 days)
  - Applicant accepts: moves to onboarding
  - Applicant declines or doesn't respond: moves to next on list, applicant can choose to remain on list or withdraw
- **Onboarding workflow:**
  - Accepted applicant receives onboarding checklist:
    - Set up payment (direct debit mandate)
    - Provide photo for membership card
    - Confirm emergency contact
    - Acknowledge club rules and code of conduct
  - Staff can track checklist completion
  - Once complete: applicant converted to full member in the members module
  - Welcome email with key information (tee booking instructions, app download, club contacts)
- **Auto-notification:**
  - Notify applicant when they move up the list (configurable: every move, or at milestones)
  - Notify secretary when an offer response deadline is approaching
  - Notify committee when new applications are received

### Should have

- Applicant portal: applicants can log in to check their position and update their details
- Committee review workflow: applications flagged for committee review before being added to the waiting list
- Interview scheduling: some clubs require a meeting with the captain or committee
- Multiple waiting lists: separate lists per category (full, 5-day, junior)
- Lapsed member re-application: streamlined process for former members returning
- Annual confirmation: email waiting list members annually to confirm they still wish to remain on the list
- Analytics: average wait time, conversion rate (offered to accepted), common decline reasons

### Won't have (this phase)

- Application fee payment processing
- Automated reference checking
- Public-facing waiting list position display
- Integration with England Golf membership platform

## Open questions

- [ ] How do we handle clubs that don't have a waiting list but still want a structured application process?
- [ ] Should the proposer/seconder be verified against the member database, or is a name sufficient?
- [ ] How do we handle priority overrides (e.g. committee decides to fast-track a specific applicant)?
- [ ] What happens if an applicant on the waiting list moves to a different area — do they get offered a "country" membership instead?
- [ ] Should the waiting list be visible to existing members (some clubs post it on the noticeboard)?

## Links

- Component: `apps/club/src/app/(console)/waitlist/` (future)
- Related PRD: `docs/prd/club-members.md`
- Related PRD: `docs/prd/club-membership-billing.md`
- Related PRD: `docs/prd/club-communications.md`
