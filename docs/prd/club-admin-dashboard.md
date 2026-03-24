# PRD: Club Admin Dashboard

**Module:** `club_admin_dashboard`
**Phase:** MVP
**Status:** Planned
**Last updated:** March 2026

---

## Problem

A club manager arriving in the morning needs a single view to understand the state of the club: how busy is it today, are there any issues, what's coming up this week, and what needs their attention. Currently this means checking the tee sheet, the till, the competition board, and possibly a spreadsheet or two. There is no consolidated "at a glance" view in most legacy systems — just a collection of module-specific screens.

A well-designed dashboard reduces the time from "opening the laptop" to "knowing what's going on" from several minutes of clicking around to a single screen load.

## Goal

Provide a real-time dashboard that gives club administrators an immediate understanding of today's operations, upcoming events, and key metrics, with quick actions to handle common tasks.

## Users

- **Primary:** Club general manager, secretary
- **Secondary:** PGA pro (limited view), front desk (shift overview)

## Core requirements

### Must have

- **Today's tee sheet summary:**
  - Total bookings / total available slots (e.g. "47/72 slots filled — 65%")
  - Breakdown: member bookings, visitor bookings, society bookings, competition slots
  - Next available tee time
  - Number of players currently on course (checked in but not completed)
- **Upcoming competitions:**
  - Next 3 competitions with name, date, format, entries count
  - Entry deadline warnings (closing within 48 hours)
  - Link to manage each competition
- **Quick actions:**
  - "New booking" — opens quick booking form
  - "Block tee times" — opens tee sheet config
  - "Send member email" — opens communications
  - "View tee sheet" — jumps to today's full tee sheet
- **Alerts and notifications:**
  - Pending bookings requiring approval
  - Overdue payments
  - Members with expiring memberships this month
  - No-show flags from recent days
  - System notifications (e.g. CDH sync status)
- **Member activity:**
  - Total active members by category
  - New members this month
  - Members who haven't played in 90+ days
  - Membership renewal rate (if billing module active)
- **Weather widget:**
  - Today's weather summary for the club's location
  - Rain forecast for the next 6 hours
  - Temperature and wind speed
  - Source: OpenWeather API using club's postcode

### Should have

- Revenue summary: today, this week, this month (green fees + membership + shop)
- Comparison to same period last year
- Tee sheet utilisation chart: daily trend for the last 30 days
- Competition participation trend
- Customisable widget layout (drag to rearrange dashboard cards)
- Role-based dashboard: pro sees lessons and competitions; front desk sees tee sheet and bookings
- Morning briefing: auto-generated summary of the day's key info (printable one-pager)

### Won't have (this phase)

- Financial forecasting
- Staff rota management
- Till/EPOS integration
- Marketing analytics (email open rates, etc.)
- Course condition updates (greenkeeper module)

## Dashboard layout

```
+---------------------------------------------------+
|  [Weather] [Quick Actions Row]                     |
+---------------------------------------------------+
|  Today's Tee Sheet    |  Alerts & Notifications    |
|  Summary              |  (pending items)            |
|  [chart/stats]        |  [list]                     |
+------------------------+---------------------------+
|  Upcoming Competitions |  Member Activity           |
|  [3 cards]             |  [stats + trend]           |
+------------------------+---------------------------+
|  Revenue (if enabled)  |                            |
+------------------------+---------------------------+
```

- Two-column grid on desktop, single column on mobile
- Cards with white background, `#E0EBE0` border, 16px border-radius
- Real-time data via Supabase Realtime subscriptions
- Dashboard data fetched server-side with ISR, real-time overlays for live counts

## Performance requirements

- Dashboard initial load: < 1 second
- Widget data should be pre-aggregated where possible (materialised views or cached queries)
- Weather API call cached for 30 minutes
- Real-time updates for booking counts: < 500ms propagation

## Open questions

- [ ] Should the dashboard be the default landing page after login, or should it be configurable?
- [ ] How much historical data should the dashboard surface — last 7 days, 30 days, 12 months?
- [ ] Do we need a "morning briefing" print mode that formats the dashboard for A4?
- [ ] Should alerts be dismissible or persistent until resolved?
- [ ] How do we handle clubs that don't use all modules — show empty widgets or hide them?

## Links

- Component: `apps/club/src/app/(console)/dashboard/page.tsx`
- Related PRD: `docs/prd/club-app-scaffold.md`
- Related PRD: `docs/prd/club-teesheet.md`
- Related PRD: `docs/prd/club-competition-calendar.md`
- Related PRD: `docs/prd/club-reporting.md`
