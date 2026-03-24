# PRD: Reporting Dashboard

**Module:** `club_reporting`
**Phase:** Soon
**Status:** Planned
**Last updated:** March 2026

---

## Problem

Golf club managers and committees need data to make informed decisions — about pricing, staffing, investment, and member engagement. Legacy systems offer basic reports (often just member lists and competition results) but lack meaningful analytics. Managers cobble together spreadsheets from multiple exports to understand revenue trends, tee sheet utilisation, or member retention. Committee meetings rely on anecdotal evidence rather than data.

Clubs that understand their utilisation patterns can optimise pricing, target marketing, and improve member satisfaction. A club that knows Wednesday afternoons are 40% utilised can create a promotion, while one that sees 90% of juniors lapse at age 18 can design a retention programme.

## Goal

Provide a comprehensive reporting dashboard with pre-built reports for common club metrics, customisable date ranges, and export capability for committee presentations.

## Users

- **Primary:** Club manager, treasurer, secretary
- **Secondary:** Committee members, PGA pro (lesson/competition reports)

## Core requirements

### Must have

- **Revenue reports:**
  - Revenue by period (daily, weekly, monthly, annual)
  - Revenue by category: green fees, memberships, competitions, lessons, shop, F&B
  - Revenue by player type: member, visitor, society, corporate
  - Comparison: this period vs same period last year
  - Average revenue per round
- **Tee sheet utilisation:**
  - Utilisation percentage by day of week
  - Utilisation by time of day (heatmap: rows = hours, columns = days)
  - Utilisation by month (seasonal trends)
  - Peak vs off-peak fill rates
  - Average group size
  - No-show rate
- **Member reports:**
  - Total active members by category with trend
  - New members by month
  - Leavers by month with reasons (if captured)
  - Retention rate: percentage of members renewing
  - Activity: rounds per member per month
  - Inactive members: haven't played in X days
  - Demographic breakdown: age, gender
- **Competition reports:**
  - Competitions run by month
  - Average entries per competition
  - Participation rate (entries / eligible members)
  - Competition revenue (entry fees collected)
  - Most popular competition formats
- **Visitor reports:**
  - Visitor rounds by month
  - Visitor revenue by month
  - Repeat visitor rate
  - Visitor source breakdown (direct, society, third-party, app)
  - Average visitor green fee
- **Date range selection:**
  - Preset ranges: today, this week, this month, this quarter, this year, last year
  - Custom date range picker
  - Comparison period toggle
- **Export:**
  - CSV export for all tabular data
  - PDF export with charts and branding for committee presentations
  - Scheduled reports: email a specific report to a distribution list on the 1st of each month

### Should have

- Custom report builder: select metrics, dimensions, filters, chart type
- Dashboard widgets: pin favourite reports to the admin dashboard
- Drill-down: click a revenue bar to see the individual bookings that make it up
- Benchmarking: compare metrics against anonymised averages from other LX2 clubs
- Forecasting: simple trend-based projection for next month/quarter
- Weather correlation: overlay weather data on utilisation to understand impact
- Per-course reporting for multi-course clubs

### Won't have (this phase)

- Real-time BI tool integration (Looker, Tableau, Power BI)
- Financial accounting reports (P&L, balance sheet)
- Staff performance reporting
- Course maintenance cost tracking
- Advanced statistical analysis

## Report data architecture

- Use Supabase materialised views or scheduled aggregation functions for performance
- Pre-aggregate daily summaries (bookings count, revenue total, member activity) via a nightly job
- Reports query aggregated tables, not raw booking/payment rows
- Cache rendered reports for 1 hour; invalidate on data change for today's data
- Historical data immutable after end-of-day aggregation

## Open questions

- [ ] Should reports be accessible to all staff roles or restricted to admin/manager?
- [ ] How far back should historical reporting go — since club joined LX2, or do we support importing historical data?
- [ ] Do we need a "data warehouse" approach or can we report directly from the operational database?
- [ ] Should the scheduled report email include the full report or a link to the dashboard?
- [ ] How do we handle reporting for clubs that join mid-year — partial year comparisons?

## Links

- Component: `apps/club/src/app/(console)/reporting/` (future)
- Related PRD: `docs/prd/club-admin-dashboard.md`
- Related PRD: `docs/prd/club-membership-billing.md`
- Related PRD: `docs/prd/club-pricing.md`
- Related PRD: `docs/prd/club-teesheet.md`
