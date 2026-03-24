# PRD: Lesson Booking

**Module:** `lesson_booking`
**Phase:** Later
**Status:** Planned
**Last updated:** March 2026

---

## Problem

PGA professionals at UK golf clubs manage their lesson diary manually — a paper diary, a shared Google Calendar, or a basic scheduling tool. Members and visitors wanting to book a lesson must phone the pro shop, often getting voicemail. The pro has no visibility on demand patterns, can't easily offer different lesson types, and has no system for tracking student progress over time.

Online lesson booking is increasingly expected by members, especially younger ones. A pro who can fill their diary efficiently earns more and provides better service to the club. Integration with the club system means lesson bookings appear alongside tee sheet bookings, avoiding conflicts.

## Goal

Enable PGA professionals to manage their lesson availability online, allow members and visitors to self-book lessons, and provide tools for tracking student progress.

## Users

- **Primary:** PGA professional
- **Secondary:** Members and visitors (booking lessons), front desk (managing bookings on behalf of pro)

## Core requirements

### Must have

- **Pro availability calendar:**
  - Weekly recurring availability (e.g. Mon-Fri 9am-5pm, Sat 9am-1pm)
  - Block out times for personal commitments, competitions, meetings
  - Holiday/absence management
  - Multiple pros supported (clubs may have a head pro and assistants)
- **Lesson types:**
  - Individual lesson (30 min, 45 min, 60 min — configurable)
  - Group lesson (max participants configurable, typically 4-6)
  - Playing lesson (on-course, 9 holes — blocks a tee time)
  - Junior group coaching
  - Beginner course (series of lessons, e.g. 6x 1-hour)
  - Club fitting appointment
  - Video analysis session
- **Booking flow:**
  - Select lesson type
  - View available slots for selected pro
  - Select slot
  - Enter details (or auto-filled for logged-in members)
  - Payment (if online payment enabled) or pay at pro shop
  - Confirmation email with date, time, location, what to bring
- **Pricing:**
  - Price per lesson type
  - Member vs non-member rates
  - Package pricing (e.g. 6 lessons for the price of 5)
  - Junior rates
- **Pro dashboard:**
  - Today's lessons at a glance
  - Upcoming week view
  - Booking notifications (new booking, cancellation)
  - Student history: past lessons, notes, areas worked on
- **Cancellation policy:**
  - Configurable cancellation window (e.g. 24 hours)
  - Late cancellation fee (configurable)
  - Rescheduling option instead of cancellation
- **Tee sheet integration:**
  - Playing lessons automatically block a tee time
  - Practice ground lessons shown separately (don't affect tee sheet)

### Should have

- Student progress tracking: notes per session, goals, areas of focus, video attachments
- Lesson packages: buy a package of 5/10 lessons at a discount
- Recurring lessons: weekly slot with the same student
- Waiting list for fully booked popular time slots
- Gift lesson vouchers (integrated with voucher module)
- Automated reminder: SMS/email 24 hours before lesson
- Review/feedback collection after lesson
- Pro profile page: bio, qualifications, specialisms, photo

### Won't have (this phase)

- Video lesson platform (remote coaching)
- Launch monitor data integration
- Custom coaching app/portal
- Automated scheduling optimisation

## Open questions

- [ ] How do we handle pros who are self-employed (retain their own fees) vs employed by the club?
- [ ] Should lesson revenue appear in the club's reporting module, or is it treated as the pro's private income?
- [ ] Do we need to support multiple lesson locations (driving range bay, short game area, on-course)?
- [ ] How do we handle playing lessons that require a buggy — is buggy reservation automatic?
- [ ] Should the pro be able to set their own prices, or does the club control lesson pricing?

## Links

- Component: `apps/club/src/app/(console)/lessons/` (future)
- Related PRD: `docs/prd/club-teesheet.md`
- Related PRD: `docs/prd/club-vouchers.md`
- Related PRD: `docs/prd/club-pricing.md`
