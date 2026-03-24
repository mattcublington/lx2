# PRD: Club Communications

**Module:** `club_communications`
**Phase:** Soon
**Status:** Planned
**Last updated:** March 2026

---

## Problem

Golf clubs communicate with members through a patchwork of channels: mass email via Mailchimp or similar, text messages for urgent course closures, noticeboard notices, social media posts, and word of mouth. There is no unified communications tool within their club management system, meaning the secretary drafts emails externally, manually exports member email lists, and has no tracking of who received or read what.

Time-sensitive communications — course closed due to frost, temporary greens in play, competition cancelled — need to reach members quickly. Competition announcements, results, and social events need targeted distribution. A club sending "Ladies' Captain's Day" details to the entire membership wastes attention and annoys male members who can't enter.

## Goal

Provide an integrated communications module that allows clubs to send targeted emails and push notifications to members, with templates for common messages and delivery tracking.

## Users

- **Primary:** Club secretary, office administrator
- **Secondary:** Competition secretary, club captain, PGA pro

## Core requirements

### Must have

- **Email composition:**
  - Rich text editor (bold, italic, lists, links, images)
  - Club-branded email template with logo, colours, footer
  - Subject line and preview text
  - Attach files (PDF, images — e.g. competition entry forms)
- **Recipient targeting:**
  - All active members
  - By membership category (e.g. all full members, all juniors)
  - By gender
  - By competition eligibility
  - By custom filter (e.g. members who haven't played in 90 days)
  - Individual member selection
  - Saved audience segments for reuse
- **Message types with templates:**
  - Competition announcement (auto-populated from competition details)
  - Competition results (auto-populated from results)
  - Course status update (frost delay, temporary greens, course closed, GUR)
  - Membership renewal reminder
  - General club newsletter
  - Event invitation
  - Custom (blank template)
- **Delivery:**
  - Send immediately or schedule for a specific date/time
  - Test send to the sender's own email before bulk send
  - Rate limiting to avoid spam classification
  - Unsubscribe link in every email (GDPR/PECR compliance)
- **Push notifications:**
  - Send push notification to members who have the LX2 player app installed
  - Notification categories: course status, competition, general
  - Members can manage notification preferences in the player app
- **Delivery tracking:**
  - Sent count, delivered count, bounced count, opened count
  - Per-message delivery report
  - Bounce handling: soft bounces retried, hard bounces flagged for email update
- **Message history:**
  - Log of all sent communications
  - View message content, recipients, delivery stats
  - Search and filter by date, type, sender

### Should have

- SMS messaging for urgent course status updates (via Twilio or similar)
- Email A/B testing (two subject lines, best performer sent to remainder)
- Personalisation tokens: {first_name}, {membership_number}, {handicap_index}
- Recurring messages: weekly newsletter, monthly competition calendar
- Competition draw notification: auto-send draw to all entrants when published
- Results notification: auto-send to all participants when results are published
- Member communication preferences: email frequency caps, opt-out by category
- Analytics dashboard: open rates over time, best send times, engagement trends

### Won't have (this phase)

- Social media posting (Facebook, Instagram, X)
- Printed mail merge for postal communications
- In-app messaging / chat between members
- WhatsApp Business integration
- Marketing automation (drip campaigns, lead nurturing)

## Email infrastructure

- Use a transactional email provider (Resend, Postmark, or SendGrid) for reliable delivery
- Club-specific sender: `clubname@notifications.lx2.golf` or custom domain
- SPF, DKIM, DMARC configured for deliverability
- Bounce and complaint webhooks updating member email status
- Unsubscribe webhook updating member communication preferences

## Compliance

- **GDPR:** Members must have opted in to marketing communications. Transactional messages (booking confirmations, renewal invoices) do not require marketing consent. Every marketing email includes an unsubscribe link.
- **PECR (Privacy and Electronic Communications Regulations):** Applies to email and SMS marketing in the UK. Soft opt-in is acceptable for existing members. Clear opt-out mechanism required.

## Open questions

- [ ] Should we support a shared inbox for inbound member replies, or direct replies to the club's own email?
- [ ] How do we handle clubs that want to use their own email domain (e.g. `news@cumberwellpark.com`)?
- [ ] Do we need to support multi-language communications for clubs with international members?
- [ ] Should course status updates be a separate, simpler interface (quick button: "course closed today")?
- [ ] What is the right email sending limit per club per month to manage costs?

## Links

- Component: `apps/club/src/app/(console)/communications/` (future)
- Related PRD: `docs/prd/club-members.md`
- Related PRD: `docs/prd/club-competition-calendar.md`
- Related PRD: `docs/prd/club-admin-dashboard.md`
