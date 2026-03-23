# LX2 Club Platform Design

**Date:** 2026-03-23
**Status:** Approved
**Author:** Matt Johnson + Claude

---

## Vision

**"Golf, all in one place."**

LX2 is not a scoring app with a club bolt-on, and not a club management tool with a scoring feature. It is the single app a golfer lives in — to score any round, enter competitions, book tee times, track their handicap, and share results. The club console is the management layer that powers it behind the scenes.

The breakthrough: a golfer at Cumberwell Park books their tee time, enters the monthly medal, scores hole-by-hole, sees the live leaderboard, and checks their results — all from lx2.golf. The club admin manages the tee sheet, runs the draw, and views the financials from club.lx2.golf. **Same data. Two views. One identity.**

---

## Product Structure

### Two apps, one platform

| App | URL | Audience | Purpose |
|-----|-----|----------|---------|
| Golfer app | lx2.golf | Golfers, society organisers | Score, book, stats, compete |
| Club console | club.lx2.golf | Club admins, competition secretaries, staff | Manage, operate, report |

**Architecture:** Option A — separate Next.js app (`apps/club`) in the monorepo, deployed to `club.lx2.golf`. Shares `@lx2/scoring`, `@lx2/db`, and `@lx2/ui` packages with `apps/web`. One Supabase project, same database, role-based RLS policies separating club admin access from golfer access.

**Homepage copy changes:**
- lx2.golf: **"Golf, all in one place."** — replaces society-only positioning
- club.lx2.golf: **"Run your club better."** — the B2B entry point

---

## Pilot Target: Cumberwell Park

**Location:** Bradford-on-Avon, Wiltshire (near Bath)
**Courses:** 45 holes — 5 × 9-hole loops: Red, Yellow, Blue, Orange, Par 3
**Facilities:** Pro shop, simulators, driving range (20 bays), Wraxall Bar & Cafe, 4 function rooms (capacity 150)
**Current stack:** intelligentgolf (member portal + competitions) + golfbook.255it.com (tee sheet) — two fragmented systems
**Pain:** Fragmented booking, dated UX, no golfer engagement layer, no mobile-first scoring

**The switch pitch:** Replace both systems with one. Better competition experience for members. Real-time scoring. Golfer profiles that travel with the member. Tee sheet that lives in the same platform as competitions.

---

## Module Roadmap

### Phase 1 — MVP (Build now)

**Golfer app additions (lx2.golf):**
Already-planned modules continue: score entry, live leaderboard, event creation, invite & RSVP, results & history, payments.

**Club console — new app (club.lx2.golf):**

| Module | Description |
|--------|-------------|
| `club_auth` | Multi-role auth: club admin, competition secretary, bar staff, pro shop. Requires new `club_user_roles` junction table (see Data Model). Supabase RLS policies per role. |
| `club_members` | Member roster with import from intelligentgolf CSV export. Each member linked to their lx2.golf golfer profile via email matching. See Open Questions for join flow design. |
| `club_teesheet_config` | Tee sheet rules: daily slot generation, interval (e.g. 10-min), capacity per slot, loop-level open/close windows, member-only vs visitor windows. Prerequisite for `club_teesheet`. |
| `club_teesheet` | Tee sheet management for all 5 Cumberwell loops. View, create, move, cancel bookings. Replaces golfbook.255it.com. |
| `club_booking` | Self-service online booking for members and visitors. Loop selection, member/visitor pricing. Phase 1: members-only, cash/invoice; Phase 1b adds online payment once Stripe Connect is resolved (see Open Questions). |
| `club_competition_calendar` | Full season competition schedule. Monthly medals, club championships, opens, charity days. Admin-side entry management. Note: golfer-facing competition entry is Phase 2 — members continue to enter via intelligentgolf until then. |
| `club_admin_dashboard` | Command centre: today's tee sheet, live competition status, payment totals, entries outstanding. |

> **Scope note:** If timeline is tight, consider splitting Phase 1 into 1a (competitions + admin dashboard — where LX2 beats intelligentgolf most visibly) and 1b (tee sheet — high-stakes daily operation, warrants more runway). Win Cumberwell on scoring and competition UX first.

**Infrastructure:**

| Module | Description |
|--------|-------------|
| `club_app_scaffold` | New `apps/club` Next.js app. Shared packages wired up. Deployed to club.lx2.golf via Vercel. |

---

### Phase 2 — Connected Experience

**The golfer app gains club superpowers:**

| Module | Description |
|--------|-------------|
| `tee_booking` | Golfers book tee times at their club from lx2.golf. Foundation for multi-club network. |
| `club_competition_entry` | Browse club competition calendar, enter, pay — from lx2.golf. |
| `player_profile` | Handicap trend, round history, scoring averages. Spans clubs and societies. |
| `my_club_dashboard` | Golfer's view: upcoming bookings, entered competitions, member status. |

**Club console additions:**

| Module | Description |
|--------|-------------|
| `club_membership_billing` | Subscription types (full, junior, senior, associate). Direct debit, renewal reminders, payment history. |
| `club_pricing` | Member / visitor / society / junior pricing rules per loop, time of day, season. |
| `club_communications` | Email and SMS to member segments. Competition results, upcoming events, news. |
| `club_vouchers` | Gift vouchers, discount codes, loyalty rewards. |
| `club_reporting` | Revenue, rounds played, member retention, competition entries. Xero export. |
| `club_waitlist` | Automatic waitlist for full tee times. Notify on cancellation. |
| `club_proshop_epos` | Pro shop EPOS. Callaway, Ping, TaylorMade, Titleist stock. Transaction linked to member account. |
| `club_bar_epos` | Wraxall Bar & Cafe. Tab management, member account charging. |

**Platform:**

| Module | Description |
|--------|-------------|
| `booking_api` | Club publishes tee availability → lx2.golf golfer app consumes. Foundation for multi-club booking network. |

---

### Phase 3 — Full Facilities

| Module | Surface | Description |
|--------|---------|-------------|
| `multi_club_booking` | lx2.golf | Browse and book at any LX2-powered club from lx2.golf. |
| `lesson_booking` | club | PGA pro lesson scheduling, packages, cancellation policy, payment. |
| `simulator_booking` | club | Simulator bay booking, hourly rates, member discounts, winter packages. |
| `driving_range` | club | 20 bays (10 covered + 10 outside). Ball token system, usage tracking. |
| `society_packages` | club | Society day builder: format, catering, prizes. Quote generator. Up to 150 players. |
| `function_rooms` | club | 4 rooms, corporate packages, delegate packages, catering coordination. |
| `extended_formats` | lx2.golf | Reds vs Blues, Skins, Scramble — full Golf GameBook-style format library. |

---

### Phase 4 — Full OS

| Module | Surface | Description |
|--------|---------|-------------|
| `whs_integration` | both | Live handicap lookup + qualifying round submission. ISV licence from England Golf required. |
| `fb_management` | club | Kitchen workflows, Wraxall table booking, Sunday lunch capacity, Christmas packages. |
| `stock_management` | club | Pro shop inventory, reorder alerts, supplier management. |
| `gps_on_course` | lx2.golf | Yardages, course maps during play. Native app milestone. |
| `multi_club_resort` | club | Single admin login for multiple venues (resort groups). |

---

## Architecture Decisions

### Data model

New tables (all in the existing Supabase project):

```sql
clubs (id, name, slug, address, logo_url, created_at)

club_user_roles (id, club_id → clubs, user_id → users,
  role text CHECK (role IN ('admin','secretary','bar_staff','pro_shop')),
  created_at)

club_members (id, club_id → clubs, user_id → users (nullable until linked),
  email text,                  -- from intelligentgolf import
  membership_type text,        -- full / junior / senior / associate / visitor
  handicap_index numeric,      -- manual until WHS Phase 4
  status text,                 -- active / suspended / lapsed
  imported_at timestamptz, linked_at timestamptz, created_at)

tee_sheet_rules (id, club_id → clubs, loop_id → course_loops,
  slot_interval_minutes smallint,  -- e.g. 10
  capacity_per_slot smallint,      -- e.g. 4 (4-ball)
  open_time time, close_time time,
  member_only_until time,          -- e.g. 09:00 on weekends
  valid_from date, valid_to date)  -- seasonal rules

tee_slots (id, club_id → clubs, loop_id → course_loops,
  slot_date date, slot_time time,
  capacity smallint, booked_count smallint default 0,
  slot_type text CHECK (slot_type IN ('member','visitor','society','blocked')),
  price_pence integer, created_at)
  -- Generated daily by a scheduled function from tee_sheet_rules

bookings (id, tee_slot_id → tee_slots, user_id → users,
  guests smallint default 0,
  status text CHECK (status IN ('confirmed','cancelled','no_show')),
  payment_id text,   -- Stripe payment intent
  created_at, cancelled_at)
```

**Key decisions:**
- `tee_slots` and `bookings` are independent of the `events` table — inventory models are conceptually similar but share no schema
- `club_members.user_id` is nullable — imported members without lx2.golf accounts are linked via email match when the golfer creates an account (or via invitation email)
- Multi-loop rounds at Cumberwell (e.g. Red+Blue for 18 holes) are represented as two `tee_slot` bookings in sequence, or by a `course_combinations` table linking two `course_loops` — to be resolved before tee sheet build (see Open Questions)

**One golfer identity:** `users` table is shared. A Cumberwell member IS the same person as their lx2.golf account. `club_members` is the entitlement layer on top.

### Monorepo structure
```
lx2/
├── apps/
│   ├── web/          # lx2.golf — golfer app
│   ├── club/         # club.lx2.golf — club console (NEW)
│   └── architecture/ # architecture.lx2.golf
├── packages/
│   ├── scoring/      # Pure TS engines (shared)
│   ├── db/           # Supabase types + migrations (shared)
│   ├── ui/           # Shared React components (shared)
│   └── config/       # Module registry (shared)
```

### The club–golfer connection
```
Golfer books tee time on lx2.golf
  → booking_api writes to tee_slots / bookings in Supabase
  → club tee sheet in club.lx2.golf reflects booking instantly (Realtime)

Club creates competition in club.lx2.golf
  → event appears on golfer's "My Club" dashboard in lx2.golf
  → golfer enters, pays, gets placed in draw
  → day of: golfer scores in lx2.golf → live leaderboard visible to all
  → results saved to golfer's permanent history in lx2.golf profile
```

---

## Competing with intelligentgolf

| Capability | intelligentgolf | LX2 |
|------------|----------------|-----|
| Competition management | ✅ | ✅ Better (real-time, mobile-first) |
| Tee sheet | ✅ (Cumberwell uses separate tool) | ✅ Phase 1 |
| Online booking | ✅ | ✅ Phase 1 |
| Member management | ✅ | ✅ Phase 1 |
| EPOS | ✅ | ✅ Phase 2 |
| Reporting | ✅ (Claritee — vague) | ✅ Phase 2 |
| Membership billing | ✅ | ✅ Phase 2 |
| On-course scoring (golfer UX) | ❌ Poor | ✅ Core product |
| Golfer app (booking + scoring) | ❌ Fragmented | ✅ Phase 2 |
| Multi-club network | ❌ | ✅ Phase 3 |
| GPS / on-course | ❌ | ✅ Phase 4 |

**Wedge:** Win on competition + scoring UX first. Golfers advocate to their clubs. Clubs adopt the console. Booking network grows.

---

## Architecture Dashboard Updates

The `packages/config/src/modules.ts` registry needs:

1. **New tier: `club_console`** — distinct from the existing `club` tier which was a placeholder
2. **Expanded `club` tier renamed** to reflect the golfer-facing club features (tee booking, club entry)
3. **New modules added** across Phase 1–4 per the roadmap above
4. **`club_erp` stub replaced** with the specific modules above
5. **lx2.golf-side club modules** added to `player` tier (tee_booking, club_competition_entry, my_club_dashboard)

---

## Open Questions (Pre-build)

- [ ] Who is our contact at Cumberwell? Do we have a champion there for the pilot?
- [ ] What format does intelligentgolf export member data in? (CSV fields needed for import design)
- [ ] Does Cumberwell want to keep golfbook.255it.com running in parallel during transition, or hard cutover?
- [ ] Membership types at Cumberwell — full list needed to design billing module
- [ ] EPOS: does Phase 1 need it, or can bar/pro shop stay on their current till during initial rollout?
- [ ] **Member join flow:** When a Cumberwell member first opens lx2.golf, how do they get their `club_members` entitlements attached? Email matching on sign-up? Or a club-sent invitation link?
- [ ] **Multi-loop round representation:** Which loop combinations constitute a valid 18-hole qualifying round at Cumberwell (e.g. Red+Yellow, Red+Blue, etc.)? Are all combinations valid or only specific pairs? This gates the tee sheet and events data model for the pilot.
- [ ] **Stripe Connect structure:** For visitor tee time payments, does Cumberwell want money collected to their own Stripe account (requires Stripe Connect setup) or an interim arrangement (e.g. invoice/BACS)? This gates online payment at `club_booking`.
- [ ] **Phase 1 scope split:** Should Phase 1 be 1a (competitions + admin dashboard) and 1b (tee sheet)? Recommend validating with Cumberwell which would deliver most immediate value.
