# PRD: Live Tee Sheet

**Module:** `club_teesheet`
**Phase:** MVP
**Status:** Planned
**Last updated:** March 2026

---

## Problem

The tee sheet is the single most-used screen in any golf club management system. Front desk staff, the pro, and the manager live on this screen all day. It needs to show at a glance who is playing, when, where, and what type of booking it is. Legacy tee sheets are slow to load, difficult to modify, and visually cluttered. Drag-and-drop editing is either absent or unreliable. Printing the tee sheet for the pro shop noticeboard is a daily requirement that most systems handle poorly.

The tee sheet must be real-time — when a booking is made online or by phone, every screen viewing the tee sheet should update without a manual refresh.

## Goal

Deliver a fast, visually clear, real-time tee sheet view that club staff can read at a glance, modify with drag-and-drop, and print cleanly.

## Users

- **Primary:** Front desk staff, PGA pro
- **Secondary:** Club manager, secretary (overview), greenkeeping team (checking blocked times)

## Core requirements

### Must have

- **Calendar grid layout:**
  - Vertical axis: tee times (every interval as configured)
  - Horizontal axis: tee positions (1st tee, 10th tee if two-tee start; multiple course combinations for multi-loop)
  - Each cell represents one tee time slot
- **Slot display:**
  - Player names (up to 4 per slot)
  - Booking type indicator
  - Player count badge (e.g. "3/4" for a threeball in a fourball slot)
  - Handicap index next to each player name
  - Notes icon if booking has notes
- **Colour coding by booking type:**
  - Member booking: green tint
  - Visitor/green fee: blue tint
  - Society/group: purple tint
  - Competition: orange tint
  - Blocked/maintenance: grey, hatched pattern
  - Available: white/empty
- **Date navigation:**
  - Date picker to jump to any date
  - Previous/next day arrows
  - "Today" quick button
  - Week view toggle showing 7 days in compressed columns
- **Real-time updates:**
  - Supabase Realtime subscription on bookings table
  - New bookings appear instantly
  - Cancelled bookings disappear instantly
  - Conflict indicator if two users try to book the same slot
- **Drag and drop:**
  - Drag a booking to a different time slot
  - Drag to a different tee/course
  - Confirmation dialog before completing the move
  - Undo option for 10 seconds after move
- **Click to view/edit:**
  - Click a booking to open detail panel (slide-in from right)
  - View all player details, booking source, payment status
  - Edit player names, add/remove players
  - Add notes
  - Cancel booking (with optional reason)
- **Quick booking:**
  - Click an empty slot to open a quick booking form
  - Autocomplete member name search
  - Add visitor by name (no account required)
- **Print view:**
  - Print-optimised CSS: removes sidebar, navigation, interactive elements
  - One page per day per tee
  - Club logo, date, course name in header
  - Tee time, player names, handicaps, booking type in clean table format
  - Compact enough to fit A4 landscape for a full day

### Should have

- Filtering: show only member bookings, only visitor bookings, only available slots
- Search across the day: find a player by name, highlight their slot
- Check-in toggle: mark players as arrived (green checkmark)
- No-show marking after tee time has passed
- Starter sheet view: next 30 minutes of tee times, large font, suitable for tablet at the 1st tee
- Weather summary for the day (integrate with OpenWeather API)
- Slot utilisation indicator: percentage of slots filled for the day
- Export day's bookings as CSV

### Won't have (this phase)

- Player GPS tracking on course
- Pace-of-play monitoring
- Automated tee time reminders (see `club_communications` PRD)
- Revenue per slot display (see `club_reporting` PRD)
- Player self-service check-in kiosk

## Realtime architecture

```
Client (browser)
  |
  |--- Supabase Realtime channel: `teesheet:{club_id}:{date}`
  |
  |--- On INSERT/UPDATE/DELETE to `bookings` table
  |     where club_id matches and date matches
  |
  |--- Update local state → re-render affected slots only
```

- Use Supabase Realtime with PostgreSQL changes (not broadcast) for consistency
- Client subscribes to the specific date being viewed
- Unsubscribe and resubscribe when changing dates
- Optimistic UI: show changes immediately, rollback if server rejects

## Performance requirements

- Initial tee sheet load: < 500ms for a full day (approx 70-80 slots)
- Real-time update propagation: < 200ms from database write to UI update
- Drag-and-drop: 60fps animation during drag, no jank
- Print rendering: < 2 seconds

## Open questions

- [ ] Should the tee sheet support multi-day views (e.g. weekend view showing Saturday + Sunday)?
- [ ] How do we handle 2-tee starts visually — side-by-side columns or tabbed?
- [ ] For Cumberwell's multi-course setup, do we show all combinations on one screen or allow switching?
- [ ] Should the starter sheet be a separate route or a mode toggle on the main tee sheet?
- [ ] Do we need to support touch/swipe gestures for tablet use at the front desk?

## Links

- Component: `apps/club/src/app/(console)/tee-sheet/page.tsx`
- Related PRD: `docs/prd/club-teesheet-config.md`
- Related PRD: `docs/prd/club-booking.md`
- Related PRD: `docs/prd/club-app-scaffold.md`
