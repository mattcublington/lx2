"use client"
import { useState } from "react"

// ─── Module registry ──────────────────────────────────────────────────────────

const GITHUB = "https://github.com/mattcublington/lx2/blob/main"

const modules: Record<string, Module> = {

  // ── Player — on-course PWA ──────────────────────────────────────────────────

  score_entry: {
    id: "score_entry", name: "Score entry", phase: "mvp", tier: "player_app", status: "building",
    sub: "Hole-by-hole, mobile-first",
    desc: "The core on-course interaction. One-tap score entry per hole, running Stableford points and Match Play status shown live. Must work offline with automatic sync on reconnect.",
    deps: ["handicap", "course_db", "realtime", "auth"],
    data: ["hole_scores", "scorecards"],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/score-entry.md`, codeUrl: `${GITHUB}/apps/web/src/app/score`,
    features: [
      "One-tap entry per hole, large 48px targets",
      "Running Stableford points after each hole",
      "Match Play status — '2 up with 5 to play'",
      "Offline queue — IndexedDB → sync on reconnect",
      "Visual sync status: green = synced, amber = pending",
      "NTP/LD result entry on contest holes",
      "Auto-advance to next hole on entry",
      "Undo last hole",
    ],
    tech: "Next.js page + Supabase Realtime. Service worker for app shell. IndexedDB for offline score queue.",
  },

  ntp_ld: {
    id: "ntp_ld", name: "NTP / Longest Drive", phase: "mvp", tier: "player_app", status: "building",
    sub: "Side contest tracking",
    desc: "Nearest-to-pin and Longest Drive contests run alongside the main round. Organisers nominate holes; players submit results on-course. Shareable winner announcement at close.",
    deps: ["score_entry", "event_create"],
    data: ["contests", "contest_results"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Organiser nominates NTP and LD holes at setup",
      "Player submits result inline during score entry",
      "Live contest leaderboard visible to all players",
      "Multiple contests per event",
      "Winner announced on results page",
      "Sponsor branding surface on contest holes",
    ],
    tech: "contests and contest_results tables. Extends score entry UI with contest input on designated holes.",
  },

  leaderboard: {
    id: "leaderboard", name: "Live leaderboard", phase: "mvp", tier: "player_app", status: "planned",
    sub: "Real-time, shareable, TV mode",
    desc: "Auto-updating leaderboard pushed via WebSocket as scores arrive. Shareable URL requires no login. TV/full-screen display mode for clubhouse screens. Score hiding on final holes preserves competition drama. Projected team results keep Reds vs Blues and team formats exciting.",
    deps: ["score_entry", "realtime", "scoring_stableford", "scoring_stroke", "scoring_matchplay"],
    data: ["scorecards", "hole_scores"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "WebSocket-pushed rankings — no polling",
      "Shareable public URL — no login needed",
      "TV / full-screen display mode for clubhouse",
      "Score hiding on final holes (anti-spoiler)",
      "Projected team scores for team formats",
      "Countback tiebreaker display",
      "NTP / LD contest results panel",
      "Results locked and permanent at close",
    ],
    tech: "Supabase Realtime (postgres_changes). Client recalculates on each event. Public row-level security for shareable URLs.",
  },

  event_landing: {
    id: "event_landing", name: "Event landing page", phase: "mvp", tier: "player_app", status: "building",
    sub: "Player entry point via invite link",
    desc: "The page a player lands on when they tap their invite link. Shows event details, allows RSVP and payment without creating an account. Entry point to the scoring PWA on the day.",
    deps: ["invite", "payments", "auth"],
    data: ["events", "rsvps"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Event details: format, date, course, organiser",
      "RSVP: yes / no / maybe",
      "Payment via Stripe Checkout inline",
      "No account required to join",
      "Tee time and flight assignment shown",
      "Link to scoring PWA on event day",
      "Shareable — works in WhatsApp and iMessage",
    ],
    tech: "Next.js dynamic route /events/[id]. Supabase anon auth. Stripe Checkout redirect.",
  },

  branded_event_site: {
    id: "branded_event_site", name: "Branded event site", phase: "soon", tier: "player_app", status: "planned",
    sub: "Sponsor logos, custom colours, sharable recap",
    desc: "Upgrade the event landing page into a fully branded tournament microsite. Organiser uploads sponsor logos, picks accent colour, gets a shareable URL for pre-event marketing and post-event recap. Key commercial surface for corporate days and club competitions.",
    deps: ["event_landing", "event_create"],
    data: ["events", "brand_assets"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Custom colour theme per event",
      "Sponsor logo placement (header, leaderboard, contest holes)",
      "Pre-event landing page for marketing",
      "Post-event recap page with results, photos, highlights",
      "Shareable URL — works without login",
      "PDF results export for prize-giving",
    ],
    tech: "Event brand_assets table. CSS custom property injection per event. Vercel edge for fast shareable URLs.",
  },

  // ── Player — web & stats ────────────────────────────────────────────────────

  player_home: {
    id: "player_home", name: "Player home (/play)", phase: "soon", tier: "player_web", status: "planned",
    sub: "Stats dashboard, golfer web entry point",
    desc: "The authenticated golfer's home screen on the web. Shows recent rounds, handicap trend, upcoming events, and quick links to stats. Strava-style feed of golfing activity.",
    deps: ["auth", "score_entry", "results"],
    data: ["users", "scorecards", "events"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Recent rounds with scores and formats",
      "Handicap index trend chart",
      "Upcoming events with RSVP status",
      "Quick stats: fairways, GIR, putts, scoring average",
      "Friends' recent rounds feed",
      "Link to book or join events",
    ],
    tech: "Next.js /play route. Supabase RLS — own data only. Recharts for handicap trend.",
  },

  player_profile: {
    id: "player_profile", name: "Player profile", phase: "soon", tier: "player_web", status: "planned",
    sub: "Public stats page",
    desc: "Public-facing golfer profile. Shows career stats, best rounds, courses played, and season performance. Shareable — the golfer's identity on the platform.",
    deps: ["player_home", "auth"],
    data: ["users", "scorecards"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Handicap index history",
      "Best gross and net rounds",
      "Courses played log",
      "Win and podium count by format",
      "Season performance summary",
      "Privacy controls — public / friends / private",
    ],
    tech: "Next.js /players/[id]. Public by default with RLS privacy flag.",
  },

  results: {
    id: "results", name: "Results & history", phase: "mvp", tier: "player_web", status: "planned",
    sub: "Permanent shareable results page",
    desc: "Every event produces a permanent results page. Shareable without login. Shows final leaderboard, winner, NTP/LD results, and scorecard breakdown. The post-round social object.",
    deps: ["leaderboard", "score_entry"],
    data: ["scorecards", "events", "contest_results"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Permanent URL per event",
      "Full leaderboard with countback",
      "Individual scorecard breakdown",
      "NTP / LD contest winners",
      "Shareable — WhatsApp, iMessage, X",
      "PDF download for club records",
    ],
    tech: "Static generation at event close. Supabase public RLS for results.",
  },

  join_a_game: {
    id: "join_a_game", name: "Join a game", phase: "later", tier: "player_web", status: "planned",
    sub: "Browse and join open rounds",
    desc: "Discovery surface for open events and rounds. Players can find and join events with available slots — society days open to visitors, club competition entries, group rounds with space. Fill-rate mechanic for organisers; discovery mechanic for players.",
    deps: ["event_create", "invite", "payments", "event_landing"],
    data: ["events", "rsvps"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Browse public events by date, course, format",
      "Filter by format, distance, handicap range",
      "Join with one tap + payment",
      "Organiser controls: open / invite-only / closed",
      "Fill-rate notifications to organiser",
      "Club-promoted events given priority placement",
    ],
    tech: "Supabase PostGIS for location-based search. Event visibility enum: public / invite / private.",
  },

  gps: {
    id: "gps", name: "GPS / rangefinder", phase: "future", tier: "player_web", status: "planned",
    sub: "Distances on 40k+ courses",
    desc: "On-course GPS distances to front, middle, and back of green. Shot measurement and sharing. 40,000+ courses via golfcourseapi.com dataset. Key daily-use utility that drives habitual engagement outside of events — the gap between LX2 and Golf GameBook's player-side product.",
    deps: ["course_db"],
    data: ["courses", "course_gps"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Front / middle / back distance to green",
      "Hazard distances",
      "Shot measurement — tap start and end",
      "Share shot distance to social feed",
      "Works offline via cached course map",
      "40,000+ courses globally",
    ],
    tech: "Browser Geolocation API. Course GPS data from golfcourseapi.com. IndexedDB cache for offline use.",
  },

  // ── Organiser tools ─────────────────────────────────────────────────────────

  event_create: {
    id: "event_create", name: "Event creation", phase: "mvp", tier: "organiser", status: "building",
    sub: "Set up new event — 3-step form",
    desc: "Three-step wizard: define the event (name, format, date, course), configure scoring (handicap allowance, NTP/LD holes, tee colours), set payment and entry. Produces invite link and event landing page.",
    deps: ["auth", "course_db", "payments"],
    data: ["events", "courses"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Step 1: name, format, date, course, max players",
      "Step 2: handicap allowance, tee colour, NTP/LD holes",
      "Step 3: entry fee (optional), payment split",
      "Instant invite link on completion",
      "Event landing page auto-generated",
      "Draft save — resume later",
    ],
    tech: "Multi-step Next.js form. Supabase events table. Stripe Connect for payment routing.",
  },

  invite: {
    id: "invite", name: "Invite & RSVP", phase: "mvp", tier: "organiser", status: "planned",
    sub: "No account needed to join",
    desc: "Organiser sends invite link via WhatsApp or email. Players RSVP without creating an account — anonymous session upgrades to full account later. Organiser sees live RSVP list and can chase non-responders.",
    deps: ["event_create", "auth"],
    data: ["rsvps", "events", "users"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Shareable invite link — one tap to RSVP",
      "No account required for players",
      "Anonymous session → account upgrade flow",
      "Organiser RSVP dashboard with counts",
      "WhatsApp-optimised link preview",
      "Re-send nudge to non-responders",
    ],
    tech: "Supabase anonymous auth. RSVP table. Open Graph meta for WhatsApp link previews.",
  },

  payments: {
    id: "payments", name: "Payments", phase: "mvp", tier: "organiser", status: "planned",
    sub: "Stripe Checkout, live tracker",
    desc: "Entry fee collection via Stripe Checkout. Organiser sets the fee; players pay on RSVP. Live payment tracker in organiser dashboard. Automatic reconciliation at event close.",
    deps: ["invite", "auth"],
    data: ["payments", "events"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Entry fee at RSVP — Stripe Checkout",
      "Organiser sets fee and optional split (e.g. prize fund vs admin)",
      "Live payment status per player",
      "Automatic payout to organiser at event close",
      "Refund handling for withdrawals",
      "Receipt emails via Stripe",
    ],
    tech: "Stripe Checkout + webhooks. Stripe Connect for organiser payouts. payments table.",
  },

  organiser_dash: {
    id: "organiser_dash", name: "Organiser dashboard", phase: "mvp", tier: "organiser", status: "planned",
    sub: "Flights, payments, proxy scoring",
    desc: "The organiser's control centre on event day. Shows flight assignments, payment status, live scoring, and allows proxy score entry for players without phones. Override and close tools.",
    deps: ["event_create", "invite", "payments", "leaderboard"],
    data: ["events", "rsvps", "payments", "scorecards"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Flight assignment — drag-and-drop groups",
      "Payment status per player (paid / unpaid / refunded)",
      "Proxy score entry on behalf of players",
      "Live leaderboard view with organiser controls",
      "Force-close event and lock results",
      "Export start list to PDF",
    ],
    tech: "Supabase RLS — organiser role. Real-time dashboard using Supabase Realtime.",
  },

  // ── Scoring engines ─────────────────────────────────────────────────────────

  scoring_stableford: {
    id: "scoring_stableford", name: "Stableford engine", phase: "mvp", tier: "scoring", status: "done",
    sub: "Points from net score vs par",
    desc: "Pure TypeScript scoring function. Input: strokes[], par[], strokeIndex[], playingHandicap. Output: points[], total, position. Zero database dependency — fully tested.",
    deps: ["handicap"],
    data: [],
    liveUrl: null, prdUrl: null, codeUrl: `${GITHUB}/packages/scoring/src/stableford.ts`,
    features: [
      "Net score = gross minus handicap strokes on hole",
      "0/1/2/3/4/5 points (double-bogey to albatross)",
      "Pick-up handling (0 points for incomplete holes)",
      "Countback tiebreaker: back 9, 6, 3, last hole",
      "95% handicap allowance (configurable)",
    ],
    tech: "Pure TypeScript. packages/scoring/src/stableford.ts. 100% test coverage.",
  },

  scoring_stroke: {
    id: "scoring_stroke", name: "Stroke play engine", phase: "mvp", tier: "scoring", status: "done",
    sub: "Gross and net totals",
    desc: "Gross and net stroke play scoring. Relative-to-par display. NR handling for incomplete rounds.",
    deps: ["handicap"],
    data: [],
    liveUrl: null, prdUrl: null, codeUrl: `${GITHUB}/packages/scoring/src/strokeplay.ts`,
    features: [
      "Gross total = sum of strokes",
      "Net total = gross minus playing handicap",
      "Relative to par display (+3, -1, E)",
      "NR (No Return) for incomplete rounds",
      "Countback tiebreaker on net scores",
    ],
    tech: "Pure TypeScript. Shares handicap allocation logic with Stableford.",
  },

  scoring_matchplay: {
    id: "scoring_matchplay", name: "Match play engine", phase: "mvp", tier: "scoring", status: "done",
    sub: "Holes up/down, early close",
    desc: "Hole-by-hole match play scoring. Tracks holes up/down, dormie, and early close. Supports net match play with stroke index allocation.",
    deps: ["handicap"],
    data: [],
    liveUrl: null, prdUrl: null, codeUrl: `${GITHUB}/packages/scoring/src/matchplay.ts`,
    features: [
      "Hole winner determination (net or gross)",
      "Running status: 2 UP, AS, 3 DOWN",
      "Early close: 4&3, dormie detection",
      "Net match play via stroke index",
      "Supports singles and better ball pairs",
    ],
    tech: "Pure TypeScript. packages/scoring/src/matchplay.ts.",
  },

  handicap: {
    id: "handicap", name: "Handicap engine", phase: "mvp", tier: "scoring", status: "done",
    sub: "Index → playing HC via slope",
    desc: "Converts a WHS handicap index to a course playing handicap using slope rating and course rating. Allocates strokes to holes via stroke index.",
    deps: [],
    data: [],
    liveUrl: null, prdUrl: null, codeUrl: `${GITHUB}/packages/scoring/src/handicap.ts`,
    features: [
      "Playing HC = (index × slope / 113) + (CR − par)",
      "Stroke allocation per hole via SI",
      "Configurable allowance percentage",
      "Supports multiple tee colours",
    ],
    tech: "Pure TypeScript. WHS formula.",
  },

  scoring_skins: {
    id: "scoring_skins", name: "Skins engine", phase: "soon", tier: "scoring", status: "planned",
    sub: "Carry-over pot per hole",
    desc: "Hole-by-hole prize logic. Tied holes carry the skin to the next. Works as an overlay on any format — net or gross. Great engagement loop for social rounds.",
    deps: ["handicap"],
    data: [],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Net or gross skins",
      "Tied hole carries skin to next",
      "Running pot value display",
      "Works as overlay on stroke play or Stableford",
      "Multi-player support",
    ],
    tech: "Pure TypeScript. Zero DB dependency.",
  },

  scoring_reds_blues: {
    id: "scoring_reds_blues", name: "Reds vs Blues", phase: "soon", tier: "scoring", status: "planned",
    sub: "Ryder Cup team format",
    desc: "Ryder Cup-style team match play. Two teams, multiple matches (singles, pairs, foursomes) across sessions. Aggregate points table. Supports up to 72 players. Hero feature for golf trips.",
    deps: ["scoring_matchplay", "handicap"],
    data: [],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Two teams, customisable names and colours",
      "Singles, better ball, and foursome sessions",
      "Aggregate points table updated live",
      "Projected final result",
      "Up to 72 players",
      "Dramatic reveal mode for final standings",
    ],
    tech: "Pure TypeScript. Extends match play engine with team aggregation.",
  },

  scoring_scramble: {
    id: "scoring_scramble", name: "Scramble engine", phase: "soon", tier: "scoring", status: "planned",
    sub: "Team scramble format",
    desc: "One of the most common corporate and charity event formats. All players hit, best shot selected, all play from there. Supports 2-, 3-, and 4-person scrambles. Net scramble via team handicap calculation.",
    deps: ["handicap"],
    data: [],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "2, 3, and 4-player scramble",
      "Best shot selection per hole",
      "Net scramble via composite team handicap",
      "Stroke play and Stableford scramble variants",
      "Works with any number of teams",
    ],
    tech: "Pure TypeScript. Team handicap = 20% low + 15% 2nd + 10% 3rd + 5% 4th.",
  },

  scoring_betterball: {
    id: "scoring_betterball", name: "Better ball stableford", phase: "soon", tier: "scoring", status: "planned",
    sub: "Pair points — best score counts",
    desc: "Pair format where the best Stableford score from each pair counts per hole. One of the most common society and club competition formats. Essential for away days and charity events.",
    deps: ["scoring_stableford", "handicap"],
    data: [],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Pair-level best Stableford score per hole",
      "Individual scores visible within pair",
      "Net scoring via handicap allocation",
      "Stroke play variant (best ball gross/net)",
      "Countback at pair level",
    ],
    tech: "Pure TypeScript. Composes Stableford engine with pair reduction.",
  },

  // ── Course & handicap data ──────────────────────────────────────────────────

  course_db: {
    id: "course_db", name: "Course database", phase: "mvp", tier: "course", status: "planned",
    sub: "Par, SI, yardage, slope, rating",
    desc: "UK course database with par, stroke index, yardage per tee, slope rating, and course rating. Sourced via golfcourseapi.com bulk import. Required for all scoring and GPS features.",
    deps: [],
    data: ["courses", "holes"],
    liveUrl: null, prdUrl: null, codeUrl: `${GITHUB}/packages/db/migrations`,
    features: [
      "Par and stroke index per hole",
      "Multiple tee colours (yellow, white, red)",
      "Slope and course rating per tee",
      "Yardages per hole",
      "UK-first coverage, global expansion",
      "Manual override for club-specific data",
    ],
    tech: "Supabase PostgreSQL. Bulk import from golfcourseapi.com JSON export.",
  },

  whs: {
    id: "whs", name: "WHS integration", phase: "later", tier: "course", status: "planned",
    sub: "Live handicap lookup",
    desc: "Live WHS handicap index lookup via England Golf / DotGolf API. Requires ISV licence. Qualifying round submission. Manual entry remains as permanent fallback.",
    deps: ["handicap", "auth"],
    data: ["users"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Handicap index lookup by CDH number",
      "Auto-populate on player record",
      "Submit qualifying round results",
      "ISV licence required from England Golf",
      "Manual entry fallback always available",
    ],
    tech: "DotGolf API. ISV licence required.",
  },

  // ── Platform infrastructure ─────────────────────────────────────────────────

  auth: {
    id: "auth", name: "Authentication", phase: "mvp", tier: "infra", status: "building",
    sub: "Magic links + anonymous play",
    desc: "Email magic link authentication. Anonymous play: score first, create account later. Row-level security on all tables.",
    deps: [],
    data: ["users"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Email magic link (no password)",
      "Anonymous session — score first, account later",
      "Google and Apple OAuth (P2)",
      "Row-level security on all tables",
    ],
    tech: "Supabase Auth. Anonymous session with progressive account creation.",
  },

  realtime: {
    id: "realtime", name: "Realtime layer", phase: "mvp", tier: "infra", status: "planned",
    sub: "WebSocket subscriptions",
    desc: "Live score updates pushed to leaderboard clients the moment a hole is saved. Presence shows which players are currently scoring.",
    deps: ["auth"],
    data: ["hole_scores", "scorecards"],
    liveUrl: null, prdUrl: null, codeUrl: `${GITHUB}/packages/db/migrations/001_initial_schema.sql`,
    features: [
      "Supabase Realtime on hole_scores and scorecards",
      "Client-side recalculation on each change",
      "Presence: show which players are scoring",
      "Reconnection with state reconciliation",
    ],
    tech: "Supabase Realtime (postgres_changes).",
  },

  brand: {
    id: "brand", name: "Brand system", phase: "mvp", tier: "infra", status: "building",
    sub: "Fairway Editorial design tokens",
    desc: "Design token system covering colour, typography, spacing, and component variants. Shared across player PWA, organiser console, and club admin surfaces.",
    deps: [],
    data: [],
    liveUrl: null, prdUrl: null, codeUrl: `${GITHUB}/packages/ui`,
    features: [
      "CSS custom properties for all colour tokens",
      "Player surface: sage green theme",
      "Organiser surface: clean white theme",
      "Club surface: navy authority theme",
      "Shared shadcn/ui component library",
    ],
    tech: "Tailwind CSS + shadcn/ui. packages/ui shared component library.",
  },

  pwa: {
    id: "pwa", name: "PWA / offline mode", phase: "soon", tier: "infra", status: "planned",
    sub: "Add to home screen, offline scoring",
    desc: "Service worker caches the scoring PWA. Scores written to IndexedDB offline, synced on reconnect. Add-to-home-screen prompt on first event day visit.",
    deps: ["score_entry", "auth"],
    data: [],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Service worker for offline scorecard",
      "IndexedDB buffering of scores",
      "Background sync on reconnect",
      "Add to home screen prompt",
      "iOS Safari and Android Chrome",
    ],
    tech: "next-pwa. Workbox. IndexedDB via idb library.",
  },

  // ── Club management ─────────────────────────────────────────────────────────

  club_erp: {
    id: "club_erp", name: "Club ERP layer", phase: "later", tier: "club", status: "planned",
    sub: "Unified club management — Cumberwell first",
    desc: "Top-level orchestration layer for all club-facing modules. Designed to replace intelligentgolf + golfbook/255it as a unified platform. Pilot target: Cumberwell Park. Single login for staff and members; role-based access for committee, pro, secretary.",
    deps: ["club_member_mgmt", "club_tee_sheet", "club_competitions", "club_admin_dash", "auth", "payments"],
    data: ["clubs", "club_members", "events"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Unified club admin portal",
      "Import from intelligentgolf CSV export",
      "Replaces golfbook / 255it tee sheet",
      "Single login for staff and members",
      "Role-based access: committee, pro, secretary, member",
      "Full audit trail on all changes",
    ],
    tech: "Extended Supabase schema. clubs, club_members, roles tables with RLS. intelligentgolf import format.",
  },

  club_member_mgmt: {
    id: "club_member_mgmt", name: "Member management", phase: "later", tier: "club", status: "planned",
    sub: "Roster, categories, CDH numbers",
    desc: "Full member record management. Handles member categories (full, senior, 5-day, junior, social), handicap indexes, contact details, and subscription status. Entry point for the Cumberwell pilot.",
    deps: ["auth", "whs"],
    data: ["club_members", "users"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Import from intelligentgolf CSV",
      "Member categories: full, senior, 5-day, junior, social",
      "CDH number storage for WHS lookup",
      "Contact directory",
      "Lapsed / resigned / suspended states",
      "Sanctions: block reservations for bad debt",
      "Family unit grouping",
      "Bulk email / SMS to member segments",
    ],
    tech: "club_members with category enum. Supabase RLS — club admins see all, members see own. CSV import via Papa Parse.",
  },

  club_tee_sheet: {
    id: "club_tee_sheet", name: "Tee sheet", phase: "later", tier: "club", status: "planned",
    sub: "Booking and slot management",
    desc: "Full tee time booking system replacing golfbook and 255it. Members book online; staff manage slot configuration, pricing, and capacity. Designed around Cumberwell's 18-hole layout.",
    deps: ["club_member_mgmt", "auth", "payments"],
    data: ["tee_times", "bookings"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Daily grid — 10-minute intervals",
      "Member online booking — 72hr advance window",
      "Visitor booking with payment",
      "Priority windows for full members",
      "Block booking for society days",
      "Waiting list for full slots",
      "Check-in / no-show tracking",
      "Dynamic pricing by time and day",
    ],
    tech: "tee_times and bookings tables. Stripe for visitor payments. Supabase Realtime for live slot availability.",
  },

  club_competitions: {
    id: "club_competitions", name: "Competitions calendar", phase: "later", tier: "club", status: "planned",
    sub: "Draw management, WHS submission",
    desc: "Manage the club's annual competition calendar. Entry lists, draw management, starting sheet generation, WHS results submission, and historical archive. Bridges LX2 event scoring with formal club competitions.",
    deps: ["club_member_mgmt", "event_create", "scoring_stableford", "scoring_stroke", "whs"],
    data: ["events", "scorecards"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Annual competition calendar",
      "Entry list and draw management",
      "Starting sheet PDF generation",
      "WHS qualifying round submission via DotGolf",
      "Historical results archive",
      "Club championship and knockout formats",
    ],
    tech: "Extends event and scoring modules. DotGolf API for WHS submission (ISV licence required).",
  },

  club_admin_dash: {
    id: "club_admin_dash", name: "Club admin dashboard", phase: "later", tier: "club", status: "planned",
    sub: "Committee reporting and financials",
    desc: "Central dashboard for club secretary, treasurer, and captain. Membership numbers, revenue, rounds played, competition participation. Replaces manual committee reporting spreadsheets.",
    deps: ["club_member_mgmt", "club_tee_sheet", "club_competitions", "payments"],
    data: ["clubs", "club_members", "bookings", "events"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "Live membership numbers by category",
      "Monthly revenue from bookings and visitors",
      "Rounds played by month and year",
      "Competition entry rates",
      "Overdue subscription report",
      "Export to CSV for committee meetings",
    ],
    tech: "Supabase views and aggregation queries. Recharts. PDF export for committee packs.",
  },

  // ── Partner API & integrations ──────────────────────────────────────────────

  partner_api: {
    id: "partner_api", name: "Partner API", phase: "later", tier: "api", status: "planned",
    sub: "Multi-tenant REST API with API keys",
    desc: "Documented gap vs Golfmanager (competitor analysis, March 2026). Golfmanager's primary moat is its integrator-facing API: explicit multi-tenancy (tenant + key headers), consumer vs admin API surfaces, and webhooks. LX2 needs a comparable surface for club system integrations, OTA booking, and future partner channels. Design the data model now — build in P3.",
    deps: ["auth", "club_erp", "club_tee_sheet"],
    data: ["api_keys", "webhooks"],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "API key per club (club = tenant)",
      "Scoped keys: read-only / read-write / admin",
      "Consumer API: booking surface for OTAs",
      "Admin API: member and competition records",
      "Webhooks: round completed, booking confirmed, member joined",
      "Rate limiting per key",
      "Key rotation and revocation",
      "Usage dashboard",
    ],
    tech: "PostgREST (Supabase) + custom auth middleware. Webhooks via Edge Functions + pg_net. Mirrors Golfmanager V3 tenant+key model.",
  },

  api_docs: {
    id: "api_docs", name: "Developer portal", phase: "later", tier: "api", status: "planned",
    sub: "Public API documentation",
    desc: "Public documentation for the LX2 partner API. OpenAPI 3.0 spec auto-generated from Supabase schema. Interactive explorer, webhook reference, and integration guides.",
    deps: ["partner_api"],
    data: [],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: [
      "OpenAPI 3.0 spec (auto-generated)",
      "Interactive API explorer",
      "Authentication guide (API key model)",
      "Webhook payload reference",
      "Integration guides: tee sheet, WHS, accounting",
      "Changelog",
    ],
    tech: "Mintlify or Scalar. OpenAPI from Supabase PostgREST introspection.",
  },
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Module {
  id: string; name: string; phase: string; tier: string; status: string
  sub: string; desc: string; deps: string[]; data: string[]
  liveUrl: string | null; prdUrl: string | null; codeUrl: string | null
  features: string[]; tech: string
}

// ─── Config ───────────────────────────────────────────────────────────────────

const tierOrder = ["player_app", "player_web", "organiser", "scoring", "course", "infra", "club", "api"]

const tierLabels: Record<string, string> = {
  player_app:  "Player — on-course PWA",
  player_web:  "Player — web & stats",
  organiser:   "Organiser tools",
  scoring:     "Scoring engines",
  course:      "Course & handicap data",
  infra:       "Platform infrastructure",
  club:        "Club management (phase 3)",
  api:         "Partner API & integrations (phase 3)",
}

const tierNotes: Record<string, string> = {
  player_app:  "Mobile-first. Sage green player theme. Offline-capable.",
  player_web:  "Strava-style stats dashboard. Desktop + mobile. Fairway Editorial design.",
  organiser:   "Desktop-first event management. Clean white organiser theme.",
  scoring:     "Pure TypeScript in @lx2/scoring — zero database dependency. Fully tested.",
  infra:       "Shared by all surfaces above.",
  club:        "Cumberwell Park pilot target. Designed to replace intelligentgolf + golfbook/255it.",
  api:         "Documented gap vs Golfmanager (March 2026). Design data model now; build in P3.",
}

const phaseColors: Record<string, { bg: string; text: string; label: string }> = {
  mvp:    { bg: "#E8F5EE", text: "#1D9E75", label: "MVP" },
  soon:   { bg: "#E6F1FB", text: "#185FA5", label: "P2"  },
  later:  { bg: "#FAEEDA", text: "#854F0B", label: "P3"  },
  future: { bg: "#F1EFE8", text: "#5F5E5A", label: "P4"  },
}

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  done:     { color: "#1D9E75", bg: "#E8F5EE", label: "Done"     },
  building: { color: "#B8660B", bg: "#FEF3E2", label: "Building" },
  planned:  { color: "#9CA3AF", bg: "#F3F4F6", label: "Planned"  },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LX2Architecture() {
  const [selected, setSelected] = useState<string | null>(null)
  const [view, setView] = useState<"modules" | "surfaces" | "deps">("modules")

  const mod = selected ? modules[selected] : null

  const byTier = tierOrder.reduce<Record<string, Module[]>>((acc, t) => {
    acc[t] = Object.values(modules).filter(m => m.tier === t)
    return acc
  }, {})

  const allMods   = Object.values(modules)
  const doneMods  = allMods.filter(m => m.status === "done").length
  const buildMods = allMods.filter(m => m.status === "building").length
  const mvpMods   = allMods.filter(m => m.phase === "mvp").length
  const totalMods = allMods.length

  const surfaces: Record<string, string[]> = {
    "Player app (PWA)":    ["player_app"],
    "Player web & stats":  ["player_web"],
    "Organiser console":   ["organiser"],
    "Club admin":          ["club"],
    "Shared platform":     ["scoring", "course", "infra", "api"],
  }

  const surfaceColors: Record<string, string> = {
    "Player app (PWA)":    "#1D9E75",
    "Player web & stats":  "#185FA5",
    "Organiser console":   "#854F0B",
    "Club admin":          "#3B3577",
    "Shared platform":     "#5F5E5A",
  }

  function selectMod(id: string) {
    setSelected(prev => prev === id ? null : id)
  }

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", maxWidth: 1100, margin: "0 auto", padding: "0 24px 80px" }}>

      {/* ── Header ── */}
      <div style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: 20, marginBottom: 28, paddingTop: 32 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
          <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, color: "#111" }}>LX2</span>
          <span style={{ fontSize: 13, color: "#9ca3af" }}>Platform architecture</span>
          <span style={{ fontSize: 11, color: "#d1d5db", marginLeft: "auto" }}>v0.3 · March 2026</span>
        </div>

        {/* Stats bar */}
        <div style={{ display: "flex", gap: 24, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { label: "MVP progress", value: `${doneMods + buildMods} of ${mvpMods} modules` },
            { label: "Done",         value: String(doneMods),     color: "#1D9E75" },
            { label: "Building",     value: String(buildMods),    color: "#B8660B" },
            { label: "Planned",      value: String(totalMods - doneMods - buildMods), color: "#9ca3af" },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color ?? "#111" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* View toggle */}
        <div style={{ display: "flex", gap: 4 }}>
          {(["modules", "surfaces", "deps"] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "5px 14px", fontSize: 12, borderRadius: 6, border: "1px solid",
              cursor: "pointer", fontWeight: view === v ? 600 : 400,
              background: view === v ? "#111" : "transparent",
              borderColor: view === v ? "#111" : "#e5e7eb",
              color: view === v ? "#fff" : "#6b7280",
            }}>
              {v === "modules" ? "All modules" : v === "surfaces" ? "Surfaces" : "Dependencies"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Modules view ── */}
      {view === "modules" && (
        <div>
          {tierOrder.map(tier => {
            const mods = byTier[tier]
            if (!mods?.length) return null
            return (
              <div key={tier} style={{ marginBottom: 36 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "#6b7280" }}>
                    {tierLabels[tier]}
                  </span>
                  <div style={{ flex: 1, height: 1, background: "#f3f4f6" }} />
                  <span style={{ fontSize: 11, color: "#d1d5db",
                    background: tier === "player_app" ? "#f0fdf4" :
                                tier === "player_web" ? "#eff6ff" :
                                tier === "organiser"  ? "#fefce8" :
                                tier === "scoring"    ? "#f0fdf4" :
                                tier === "club"       ? "#f5f3ff" :
                                tier === "api"        ? "#fef3c7" : "#f9fafb",
                    padding: "2px 8px", borderRadius: 10
                  }}>
                    {tier === "player_app" || tier === "player_web" || tier === "organiser" || tier === "infra" || tier === "scoring" || tier === "course" ? "Core" :
                     tier === "club" || tier === "api" ? "Phase 3" : ""}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                  {mods.map(m => {
                    const ph = phaseColors[m.phase]
                    const st = statusConfig[m.status]
                    const isSelected = selected === m.id
                    return (
                      <button key={m.id} onClick={() => selectMod(m.id)} style={{
                        textAlign: "left", padding: "12px 14px", borderRadius: 8, cursor: "pointer",
                        border: isSelected ? "2px solid #111" : "1px solid #e5e7eb",
                        background: isSelected ? "#fafafa" : "#fff",
                        transition: "all 0.12s",
                        boxShadow: isSelected ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                            background: ph.bg, color: ph.text,
                          }}>{ph.label}</span>
                          <span style={{
                            fontSize: 10, padding: "2px 6px", borderRadius: 4,
                            background: st.bg, color: st.color, fontWeight: 500,
                          }}>{st.label}</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#111", marginBottom: 2, lineHeight: 1.3 }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.4 }}>{m.sub}</div>
                      </button>
                    )
                  })}
                </div>

                {tierNotes[tier] && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#9ca3af" }}>↑ {tierNotes[tier]}</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Surfaces view ── */}
      {view === "surfaces" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {Object.entries(surfaces).map(([surface, tiers]) => {
            const mods = Object.values(modules).filter(m => tiers.includes(m.tier))
            const color = surfaceColors[surface]
            return (
              <div key={surface} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, borderTop: `3px solid ${color}` }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 2 }}>{surface}</div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 12 }}>{mods.length} modules</div>
                {mods.map(m => (
                  <button key={m.id} onClick={() => { setSelected(m.id); setView("modules") }} style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%",
                    textAlign: "left", padding: "5px 0", background: "none", border: "none",
                    cursor: "pointer", borderBottom: "1px solid #f9fafb",
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                      background: statusConfig[m.status].color,
                    }} />
                    <span style={{ fontSize: 12, color: "#374151", flex: 1 }}>{m.name}</span>
                    <span style={{
                      fontSize: 10, padding: "1px 5px", borderRadius: 3,
                      background: phaseColors[m.phase].bg, color: phaseColors[m.phase].text,
                    }}>{phaseColors[m.phase].label}</span>
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Dependencies view ── */}
      {view === "deps" && (
        <div>
          {Object.values(modules).filter(m => m.deps.length > 0).map(m => (
            <div key={m.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ minWidth: 180 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, marginRight: 6,
                  background: phaseColors[m.phase].bg, color: phaseColors[m.phase].text,
                }}>{phaseColors[m.phase].label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>{m.name}</span>
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>depends on →</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {m.deps.map(dep => {
                  const d = modules[dep]
                  return d ? (
                    <button key={dep} onClick={() => selectMod(dep)} style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 4, cursor: "pointer",
                      background: phaseColors[d.phase].bg, color: phaseColors[d.phase].text,
                      border: "none", fontWeight: 500,
                    }}>{d.name}</button>
                  ) : (
                    <span key={dep} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "#f3f4f6", color: "#9ca3af" }}>{dep}</span>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Detail panel ── */}
      {mod && view === "modules" && (
        <div style={{
          position: "sticky", bottom: 24, marginTop: 24,
          background: "#fff", border: "1px solid #e5e7eb",
          borderRadius: 12, padding: 20, boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                  background: phaseColors[mod.phase].bg, color: phaseColors[mod.phase].text,
                }}>{phaseColors[mod.phase].label}</span>
                <span style={{
                  fontSize: 11, padding: "2px 8px", borderRadius: 4,
                  background: statusConfig[mod.status].bg, color: statusConfig[mod.status].color,
                }}>{statusConfig[mod.status].label}</span>
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#111" }}>{mod.name}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{mod.sub}</div>
            </div>
            <button onClick={() => setSelected(null)} style={{
              background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#9ca3af", padding: 4,
            }}>✕</button>
          </div>

          <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, marginBottom: 14 }}>{mod.desc}</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Key features</div>
              <ul style={{ margin: 0, paddingLeft: 14, fontSize: 12, color: "#374151", lineHeight: 1.7 }}>
                {mod.features.map(f => <li key={f}>{f}</li>)}
              </ul>
            </div>
            <div>
              {mod.deps.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Depends on</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                    {mod.deps.map(dep => {
                      const d = modules[dep]
                      return d ? (
                        <button key={dep} onClick={() => setSelected(dep)} style={{
                          fontSize: 11, padding: "3px 8px", borderRadius: 4, cursor: "pointer",
                          background: phaseColors[d.phase].bg, color: phaseColors[d.phase].text,
                          border: "none", fontWeight: 500,
                        }}>{d.name}</button>
                      ) : null
                    })}
                  </div>
                </>
              )}
              {mod.data.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Data tables</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                    {mod.data.map(t => (
                      <span key={t} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: "#f3f4f6", color: "#374151", fontFamily: "monospace" }}>{t}</span>
                    ))}
                  </div>
                </>
              )}
              <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Technical approach</div>
              <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{mod.tech}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, borderTop: "1px solid #f3f4f6", paddingTop: 12 }}>
            {mod.liveUrl && <a href={mod.liveUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, padding: "6px 12px", borderRadius: 6, background: "#1D9E75", color: "#fff", textDecoration: "none", fontWeight: 500 }}>↗ Live</a>}
            {mod.prdUrl  && <a href={mod.prdUrl}  target="_blank" rel="noreferrer" style={{ fontSize: 12, padding: "6px 12px", borderRadius: 6, background: "#f3f4f6", color: "#374151", textDecoration: "none" }}>PRD</a>}
            {mod.codeUrl && <a href={mod.codeUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, padding: "6px 12px", borderRadius: 6, background: "#f3f4f6", color: "#374151", textDecoration: "none" }}>Code ↗</a>}
            <button onClick={() => setSelected(null)} style={{ marginLeft: "auto", fontSize: 12, padding: "6px 12px", borderRadius: 6, background: "none", border: "1px solid #e5e7eb", color: "#6b7280", cursor: "pointer" }}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
