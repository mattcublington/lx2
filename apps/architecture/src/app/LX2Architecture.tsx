import { useState } from "react";

const modules = {
  score_entry: {
    name: "Score entry",
    phase: "mvp",
    tier: "player",
    sub: "Hole-by-hole, offline-first",
    desc: "Mobile-first hole-by-hole score input. The core interaction during a round. Must work offline with automatic sync when connectivity returns.",
    deps: ["Handicap engine", "Course database", "Realtime layer", "Offline / PWA", "Auth"],
    data: ["hole_scores", "scorecards"],
    features: [
      "One-tap score entry per hole with large targets (48px min)",
      "Running total and Stableford points shown after each hole",
      "Match Play status display (\"2 up with 5 to play\")",
      "Offline queue — scores saved to IndexedDB, synced on reconnect",
      "Visual sync status indicator (green = synced, amber = pending)",
      "Undo last hole entry",
      "NTP/LD result entry on designated contest holes",
      "Auto-advance to next hole on entry",
    ],
    tech: "Next.js page with Supabase Realtime subscription. Service worker caches app shell. IndexedDB stores pending scores. Sync manager batches uploads on reconnect.",
  },
  leaderboard: {
    name: "Live leaderboard",
    phase: "mvp",
    tier: "player",
    sub: "Real-time, TV mode",
    desc: "Real-time ranking page that auto-updates as scores arrive via WebSocket. Shareable URL. TV/full-screen display mode for clubhouse screens.",
    deps: ["Scoring engines (all)", "Realtime layer", "Course database"],
    data: ["scorecards", "hole_scores", "events", "event_players"],
    features: [
      "Auto-updating positions as scores arrive (sub-second latency)",
      "Format-aware: points for Stableford, net strokes for Stroke Play, match status for Match Play",
      "\"Through X holes\" indicator per player",
      "NTP/LD results shown alongside main leaderboard",
      "TV mode: full-screen, auto-scroll through flights, large typography",
      "Shareable URL with Open Graph preview (event name, date, course)",
      "Player highlighting — tap to see hole-by-hole breakdown",
      "Countback tiebreaker display",
    ],
    tech: "Next.js page subscribing to Supabase Realtime on scorecards table. Client-side scoring engine recalculates positions on each change. CSS media queries for TV mode (1920×1080 optimised).",
  },
  results: {
    name: "Results & history",
    phase: "mvp",
    tier: "player",
    sub: "Permanent shareable page",
    desc: "Permanent results page that persists at a stable URL after the event. Final standings, NTP/LD winners, prize info. The thing players share and come back to.",
    deps: ["Scoring engines", "Event creation", "Course database"],
    data: ["events", "scorecards", "contest_results"],
    features: [
      "Final standings with positions, scores/points, handicap used",
      "NTP/LD contest winners with distances",
      "Full scorecard view per player (hole-by-hole breakdown)",
      "Share buttons (WhatsApp, copy link) with rich preview",
      "Persistent URL (e.g. /events/{id}/results) — never expires",
      "Photo gallery from event feed (Phase 2)",
    ],
    tech: "Static generation with ISR (Incremental Static Regeneration) once event is finalised. Cached at edge for fast loading.",
  },
  profiles: {
    name: "Player profiles",
    phase: "soon",
    tier: "player",
    sub: "Stats across events",
    desc: "Cumulative statistics across all events a player has participated in. The hook for repeat engagement — players want to see their history and improvement.",
    deps: ["Auth", "Scoring engines", "Results & history"],
    data: ["users", "scorecards", "events"],
    features: [
      "Win/loss/draw record across events",
      "Average Stableford points, scoring average",
      "Best round, worst round, most recent",
      "Events played list with links to results",
      "Head-to-head record against other players (Phase 3)",
      "Handicap trend over time (when WHS integration available)",
    ],
    tech: "Server-rendered page with aggregation queries. Consider materialised views for stats if query performance degrades.",
  },
  event_create: {
    name: "Event creation",
    phase: "mvp",
    tier: "organiser",
    sub: "Date, course, format, fee, NTP/LD holes",
    desc: "The organiser creates an event by selecting a date, course, format, entry fee, and configuring side contests. This is the top of the funnel — everything flows from here.",
    deps: ["Course database", "Auth", "Payments"],
    data: ["events", "courses"],
    features: [
      "Select or search from imported UK course database",
      "Choose format: Stableford, Stroke Play, Match Play",
      "Set entry fee (or free event)",
      "Designate NTP/LD holes from the course scorecard",
      "Set max players and group size",
      "Configure handicap allowance (95% Stableford default, 100% Stroke Play)",
      "Generate unique shareable invite link",
      "Edit event details after creation",
      "Duplicate event for recurring society fixtures",
    ],
    tech: "Next.js form page. Writes to events table in Supabase. Course selection uses typeahead search against course_db table.",
  },
  invite: {
    name: "Invite & RSVP",
    phase: "mvp",
    tier: "organiser",
    sub: "Shareable link, no account needed",
    desc: "Shareable link flow. Players tap the link, see event details, enter their name and handicap, and confirm attendance. No account creation required — progressive auth.",
    deps: ["Event creation", "Auth"],
    data: ["event_players", "users"],
    features: [
      "Shareable URL with rich Open Graph preview for WhatsApp/iMessage",
      "No account required to RSVP — just name, email, and handicap index",
      "Progressive account creation (optional — prompted after first event)",
      "RSVP status: confirmed / declined / waitlisted",
      "Organiser can manually add players who don't use the link",
      "Automatic email confirmation with event details and calendar invite",
      "Withdraw / change RSVP before event date",
    ],
    tech: "Public Next.js page (no auth required to view). Supabase anonymous auth for RSVP, upgraded to magic link auth if player creates account.",
  },
  payments: {
    name: "Payments",
    phase: "mvp",
    tier: "organiser",
    sub: "Stripe Checkout, live tracker",
    desc: "Stripe Checkout for entry fee collection. Organiser sees real-time payment status on their dashboard. Players pay when they RSVP.",
    deps: ["Invite & RSVP", "Event creation"],
    data: ["payments", "event_players"],
    features: [
      "Stripe Checkout embedded in RSVP flow",
      "Real-time payment status on organiser dashboard",
      "Manual 'mark as paid' for cash payments",
      "Automatic refund if player withdraws (configurable)",
      "Payment reminder email to unpaid confirmed players",
      "Stripe Connect for club payouts (Phase 3)",
      "Platform fee configuration (Phase 3)",
    ],
    tech: "Stripe Checkout Session created via Next.js API route. Webhook handler updates payment status in Supabase. Stripe Connect added in Phase 3.",
  },
  dashboard: {
    name: "Organiser dashboard",
    phase: "mvp",
    tier: "organiser",
    sub: "Flights, status, proxy scoring",
    desc: "The organiser's command centre. View confirmed players, payment status, manage groups/flights, enter scores on behalf of players who aren't using phones.",
    deps: ["Event creation", "Invite & RSVP", "Payments", "Score entry"],
    data: ["events", "event_players", "payments", "scorecards"],
    features: [
      "Player list with RSVP and payment status",
      "Drag-and-drop flight/group management",
      "Auto-generate balanced flights from handicaps",
      "Proxy score entry (enter scores for any player)",
      "Print-friendly draw sheet and start sheet",
      "Live event status overview during play",
      "Finalise event and generate results",
      "Export results to CSV",
    ],
    tech: "Next.js page with Supabase Realtime subscription. Desktop-optimised but usable on mobile for on-day management.",
  },
  stableford: {
    name: "Stableford",
    phase: "mvp",
    tier: "scoring",
    sub: "Points from net score vs par",
    desc: "Calculates Stableford points per hole from gross strokes, par, and handicap strokes received. The most common society format in the UK.",
    deps: ["Handicap engine", "Course database"],
    data: [],
    features: [
      "Net score = gross strokes minus handicap strokes on this hole",
      "Points: 0 (double+), 1 (bogey), 2 (par), 3 (birdie), 4 (eagle), 5 (albatross)",
      "Total = sum of points across all holes (higher is better)",
      "Pick-up handling: 0 points for incomplete holes",
      "Countback tiebreaker: back 9, back 6, back 3, last hole",
      "95% handicap allowance (configurable)",
    ],
    tech: "Pure TypeScript function. No database dependency. Input: strokes[], par[], strokeIndex[], playingHandicap. Output: points[], total, position.",
  },
  strokeplay: {
    name: "Stroke play",
    phase: "mvp",
    tier: "scoring",
    sub: "Gross and net totals",
    desc: "Total gross strokes minus playing handicap = net score. Simplest format. Lower is better.",
    deps: ["Handicap engine", "Course database"],
    data: [],
    features: [
      "Gross total = sum of strokes",
      "Net total = gross minus playing handicap",
      "Relative to par display (+3, -1, E)",
      "NR (No Return) for incomplete rounds",
      "Countback tiebreaker on net scores",
    ],
    tech: "Pure TypeScript function. Shares handicap allocation logic with Stableford engine.",
  },
  matchplay: {
    name: "Match play",
    phase: "mvp",
    tier: "scoring",
    sub: "Holes up/down, early close",
    desc: "Each hole is a separate contest. Lower net score wins the hole. Match status expressed as 'holes up/down'. Match can end early when result is certain.",
    deps: ["Handicap engine", "Course database"],
    data: [],
    features: [
      "Hole-by-hole: win / lose / halve based on net scores",
      "Handicap strokes based on DIFFERENCE between two players' playing handicaps",
      "Match status: '2 up', 'all square', '1 down'",
      "Early termination: match over when lead > holes remaining (e.g. '4&3')",
      "Dormie detection (up by same number as holes remaining)",
      "Pair and team variants (foursomes, fourballs) — Phase 2",
    ],
    tech: "Pure TypeScript function. Different interface from Stableford/Stroke Play — operates on two players' scores simultaneously. Returns match status per hole and final result.",
  },
  ntp_ld: {
    name: "NTP / longest drive",
    phase: "mvp",
    tier: "scoring",
    sub: "Side contests per hole",
    desc: "Side contest tracking. Organiser designates holes. During the round, results are recorded as player name + distance. Winners shown on leaderboard and results.",
    deps: ["Event creation", "Course database"],
    data: ["contest_results"],
    features: [
      "Organiser designates contest holes at event creation",
      "Record: player name + distance (yards/feet/metres)",
      "Multiple contests per event (e.g. NTP on holes 4, 8, 13; LD on hole 7)",
      "Winners displayed on leaderboard and results page",
      "Sponsor attribution field (Phase 3: 'NTP hole 7 — sponsored by...')",
    ],
    tech: "Simple contest_results table: event_id, hole_number, contest_type (ntp/ld), player_name, distance, unit. Minimal complexity.",
  },
  scramble: {
    name: "Texas scramble",
    phase: "soon",
    tier: "scoring",
    sub: "Team best-ball scoring",
    desc: "Team format — all players hit from the best ball position. One score per team per hole. Team handicap is a configurable fraction of combined individual handicaps.",
    deps: ["Handicap engine", "Course database"],
    data: [],
    features: [
      "One score per team per hole (not per player)",
      "Configurable team handicap: typically 10% of sum for 4-person, 15% for 3-person",
      "Stableford or stroke play team scoring (configurable)",
      "Team composition management in organiser dashboard",
    ],
    tech: "Pure TypeScript. Simpler than individual formats — fewer edge cases. Reuses Stableford/Stroke Play calculation with team handicap.",
  },
  skins: {
    name: "Skins",
    phase: "soon",
    tier: "scoring",
    sub: "Hole-by-hole with carry-over",
    desc: "Hole-by-hole prize format. Lowest net score wins the skin. Ties carry over, increasing the next hole's prize. Popular in society groups with a gambling culture.",
    deps: ["Handicap engine", "Course database"],
    data: [],
    features: [
      "Lowest net score on each hole wins the skin",
      "Tied holes: skin carries over to next hole",
      "Final hole accumulation of all remaining carry-overs",
      "Configurable skin value (£ per skin or equal division of pot)",
      "Display: which holes were won, by whom, for how many skins",
    ],
    tech: "Pure TypeScript. Operates on completed hole_scores for all players. Returns array of {hole, winner, skins_value, carried_from[]}.",
  },
  rvb: {
    name: "Reds vs Blues",
    phase: "soon",
    tier: "scoring",
    sub: "Ryder Cup team format",
    desc: "Ryder Cup-style team match. Two teams, multiple match play pairings. Aggregate team score. The hero feature for golf trips and society events.",
    deps: ["Match play engine", "Handicap engine"],
    data: ["events", "event_players"],
    features: [
      "Two teams with configurable names and colours",
      "Multiple concurrent match play pairings",
      "Aggregate team score (points from each pairing)",
      "Up to 72 players (36 per team)",
      "Projected team result based on current match states",
      "Dramatic team leaderboard display",
    ],
    tech: "Extends Match Play engine. Additional UI layer for team composition, pairing creation, and aggregate scoring.",
  },
  handicap: {
    name: "Handicap engine",
    phase: "mvp",
    tier: "scoring",
    sub: "Index → playing HC via slope",
    desc: "Converts handicap index to playing handicap using course slope/rating. Distributes handicap strokes across holes by stroke index. Shared by all scoring engines.",
    deps: ["Course database"],
    data: [],
    features: [
      "Playing handicap = Handicap Index × (Slope Rating ÷ 113), rounded",
      "Allowance: 95% for Stableford/Bogey, 100% for Stroke Play, difference-based for Match Play",
      "Stroke distribution: handicap 18 = 1 stroke per hole; 24 = 2 on SI 1–6, 1 on rest",
      "Manual handicap index entry (MVP)",
      "WHS API lookup (Phase 4 — requires ISV licence)",
    ],
    tech: "Pure TypeScript. No external dependencies in MVP. Course slope/rating from course_db table.",
  },
  course_db: {
    name: "Course database",
    phase: "mvp",
    tier: "course",
    sub: "Par, SI, yardage, slope, rating",
    desc: "All UK golf course data — par, stroke index, yardage per tee, slope rating, course rating. Seeded from free APIs, verified by users.",
    deps: [],
    data: ["courses", "course_holes", "course_tees"],
    features: [
      "~2,000–2,500 UK courses imported from free APIs",
      "Per hole: par, stroke index",
      "Per tee: name, yardage per hole, total yardage, slope rating, course rating",
      "Course search with typeahead (by name, location)",
      "Admin: manual course entry/edit for missing or incorrect data",
      "Cumberwell Park's five 9-hole loops pre-verified",
    ],
    tech: "Supabase tables: courses (id, name, club, location, holes_count), course_holes (course_id, hole_number, par, stroke_index), course_tees (course_id, tee_name, hole_yardages[], slope, rating).",
  },
  course_import: {
    name: "API import pipeline",
    phase: "mvp",
    tier: "course",
    sub: "golfcourseapi.com + bthree.uk",
    desc: "Automated scripts to pull course data from golfcourseapi.com (free, 300 req/day) and the Jacobbrewer1/golf-data open source API (UK-only, no auth).",
    deps: ["Course database"],
    data: ["courses", "course_holes", "course_tees"],
    features: [
      "golfcourseapi.com: free tier, 300 requests/day — full UK import in ~8–10 days",
      "Jacobbrewer1/golf-data (api.bthree.uk/golf/v1): free, UK-only, no auth, no rate limits",
      "Cross-reference both sources — flag discrepancies for manual review",
      "Schema mapping: API response → normalised course_db format",
      "Idempotent import (re-run safely without duplicates)",
      "Fallback: golfapi.io paid CSV export if free sources have significant gaps",
    ],
    tech: "Node.js script (can run as Supabase Edge Function or local CLI). Scheduled background fetch. Stores raw API responses for debugging.",
  },
  course_verify: {
    name: "Community verification",
    phase: "soon",
    tier: "course",
    sub: "Flag & fix incorrect data",
    desc: "Let organisers and players flag incorrect course data. When someone creates an event, they see the imported scorecard and can confirm or edit it.",
    deps: ["Course database", "Event creation"],
    data: ["course_corrections"],
    features: [
      "During event creation: 'Does this scorecard look right?' prompt",
      "Edit: change par, stroke index, or yardage for any hole",
      "Flag: report 'data looks wrong' with optional note",
      "Admin review queue for flagged corrections",
      "Correction history per course",
    ],
    tech: "Supabase table: course_corrections (course_id, hole_number, field, old_value, new_value, submitted_by, status). Admin page to review and apply.",
  },
  auth: {
    name: "Auth",
    phase: "mvp",
    tier: "infra",
    sub: "Magic links + anonymous access",
    desc: "Authentication via Supabase Auth. Magic links (email) for registered users. Anonymous access for RSVP-only players. Progressive upgrade from anonymous to registered.",
    deps: [],
    data: ["users"],
    features: [
      "Magic link auth (email, no password)",
      "Anonymous auth for players joining via invite link",
      "Progressive upgrade: anonymous → registered after first event",
      "Google and Apple OAuth (Phase 2)",
      "Role-based access: player, organiser, club admin",
    ],
    tech: "Supabase Auth with magic links. Row Level Security (RLS) policies on all tables. Anonymous sessions stored in Supabase with upgrade path.",
  },
  realtime: {
    name: "Realtime layer",
    phase: "mvp",
    tier: "infra",
    sub: "Supabase WebSocket subscriptions",
    desc: "Supabase Realtime WebSocket subscriptions on scorecards and hole_scores tables. Powers live leaderboard updates and organiser dashboard.",
    deps: ["Auth"],
    data: ["scorecards", "hole_scores"],
    features: [
      "Subscribe to scorecards table changes for a specific event",
      "Sub-second latency from score entry to leaderboard update",
      "Automatic reconnection on connection drop",
      "Channel-based subscriptions (one channel per event)",
      "Broadcast messages for non-database events (e.g. 'event finalised')",
    ],
    tech: "Supabase Realtime with PostgreSQL CDC (Change Data Capture). Client subscribes via supabase-js. One subscription per event, filtered by event_id.",
  },
  offline: {
    name: "Offline / PWA",
    phase: "mvp",
    tier: "infra",
    sub: "IndexedDB + service worker",
    desc: "Service worker for offline score entry. IndexedDB for local storage. PWA manifest for add-to-home-screen. Essential for golf courses with patchy signal.",
    deps: ["Score entry", "Realtime layer"],
    data: [],
    features: [
      "Service worker caches app shell and course data",
      "IndexedDB stores pending score entries",
      "Sync manager: batch upload on reconnect, last-write-wins",
      "Visual status: 'Synced' (green) or 'Will sync when online' (amber)",
      "PWA manifest: add to home screen, full-screen launch, custom icon",
      "Web Push notifications on Android (event reminders, leaderboard updates)",
    ],
    tech: "next-pwa or Workbox for service worker. IndexedDB via idb library. Background Sync API where supported, polling fallback.",
  },
  mobile_path: {
    name: "Native apps",
    phase: "later",
    tier: "infra",
    sub: "React Native via Expo",
    desc: "iOS and Android native apps via React Native / Expo. Stage 3 of the mobile path — only when 500+ regular users justify the investment.",
    deps: ["All MVP modules", "Auth", "Realtime layer"],
    data: [],
    features: [
      "Share ~70–80% component logic with Next.js web app",
      "Same Supabase backend, same real-time subscriptions",
      "Native push notifications (APNs + FCM)",
      "Apple Watch companion for on-wrist scoring (future)",
      "Bluetooth integration for Trackman simulator (future)",
      "Lock Screen widgets for live match status (future)",
    ],
    tech: "React Native via Expo. TypeScript scoring engines reused directly. Supabase JS client works in React Native. Platform-specific: navigation (React Navigation), native UI components.",
  },
  club_profile: {
    name: "Club profile",
    phase: "later",
    tier: "club",
    sub: "Courses, packages, availability",
    desc: "Public-facing club page with courses, society day packages, and availability calendar. The landing page for club discovery.",
    deps: ["Course database"],
    data: ["clubs"],
    features: [
      "Club info: name, location, facilities, contact",
      "Courses with scorecards",
      "Society day packages and pricing",
      "Availability calendar for event booking",
      "Photo gallery",
    ],
    tech: "Next.js page with SSG. Club admin can edit via dashboard.",
  },
  club_admin: {
    name: "Club admin",
    phase: "later",
    tier: "club",
    sub: "Bookings, calendar, revenue",
    desc: "Club management dashboard. Incoming society bookings, event calendar, revenue reporting. The value proposition for clubs.",
    deps: ["Club profile", "Payments", "Event creation"],
    data: ["clubs", "events", "payments"],
    features: [
      "Incoming booking requests from organisers",
      "Event calendar with status tracking",
      "Revenue dashboard (entries, fees, payouts)",
      "Club branding configuration",
      "Staff accounts with role-based access",
    ],
    tech: "Next.js dashboard. Supabase RLS policies for club-scoped data access.",
  },
  tv_board: {
    name: "TV leaderboard",
    phase: "later",
    tier: "club",
    sub: "Branded full-screen display",
    desc: "Full-screen leaderboard display for clubhouse TVs. Club branding (logo, colours). Auto-scrolling. The wow factor for club sales.",
    deps: ["Live leaderboard", "Club profile"],
    data: ["scorecards", "clubs"],
    features: [
      "1920×1080 optimised layout",
      "Club logo and colour scheme",
      "Auto-scroll through flights",
      "NTP/LD results ticker",
      "Sponsor logos (configurable)",
    ],
    tech: "Dedicated Next.js route. CSS custom properties for club branding. Auto-refresh via Supabase Realtime.",
  },
  stripe_connect: {
    name: "Stripe Connect",
    phase: "later",
    tier: "club",
    sub: "Club payouts, platform fee",
    desc: "Split payments between the platform and clubs. Clubs receive payouts. Platform takes a configurable fee (2–3%).",
    deps: ["Payments", "Club admin"],
    data: ["payments", "clubs"],
    features: [
      "Club onboarding to Stripe Connect",
      "Automatic payout splitting",
      "Configurable platform fee per club",
      "Payout reporting for clubs",
      "Refund handling",
    ],
    tech: "Stripe Connect in destination charges mode. Webhook handler for payout status.",
  },
  tee_sheet: {
    name: "Tee sheet",
    phase: "future",
    tier: "club",
    sub: "Full slot management",
    desc: "Full tee-time slot management for daily club operations. The most complex module — deliberate Phase 4 deferral.",
    deps: ["Club admin", "Course database", "Membership"],
    data: ["tee_slots", "bookings"],
    features: [
      "Time-slot configuration per course",
      "Member priority windows",
      "Visitor booking with dynamic pricing",
      "Block booking for events",
      "Waitlist management",
      "Check-in workflow",
    ],
    tech: "Complex scheduling engine. Supabase with optimistic locking for concurrent booking. Significant UI investment.",
  },
  membership: {
    name: "Membership",
    phase: "future",
    tier: "club",
    sub: "Billing, CRM, categories",
    desc: "Club membership administration. Billing, CRM, categories, renewals. Large module deferred to Phase 4.",
    deps: ["Club admin", "Auth", "Payments"],
    data: ["memberships", "members"],
    features: [
      "Membership categories with pricing tiers",
      "Recurring billing (Stripe Subscriptions)",
      "Member CRM with tags and segments",
      "Renewal management and reminders",
      "Family/linked accounts",
    ],
    tech: "Stripe Subscriptions for billing. Complex CRM data model. Significant admin UI investment.",
  },
  whs: {
    name: "WHS integration",
    phase: "future",
    tier: "club",
    sub: "ISV licence, DotGolf sync",
    desc: "Official World Handicap System integration. Submit scores to England Golf via DotGolf API. Requires ISV licence — target Q4 2026 at earliest.",
    deps: ["Scoring engines", "Auth", "Course database"],
    data: ["whs_submissions"],
    features: [
      "ISV licence with England Golf",
      "Submit qualifying scores to WHS platform",
      "Retrieve current handicap index for players",
      "CDH (Central Database of Handicaps) lookup",
      "Competition designation (qualifying vs non-qualifying)",
    ],
    tech: "DotGolf API integration. ISV compliance requirements. Likely REST API with specific payload format.",
  },
  discovery: {
    name: "Event discovery",
    phase: "future",
    tier: "club",
    sub: "Find and join public events",
    desc: "Public marketplace for finding and joining open golf events. The network-effects play. Requires critical mass to be valuable.",
    deps: ["Event creation", "Invite & RSVP", "Payments", "Club profile"],
    data: ["events"],
    features: [
      "Browse public events by location, date, format",
      "Search and filter",
      "Book and pay directly",
      "Club-promoted events",
      "Event recommendations based on history",
    ],
    tech: "Next.js with geolocation-based search. Supabase PostGIS extension for location queries.",
  },
};

const tierOrder = ["player", "organiser", "scoring", "course", "infra", "club"];
const tierLabels = {
  player: "Player-facing experience",
  organiser: "Organiser tools",
  scoring: "Scoring engines",
  course: "Course data",
  infra: "Platform infrastructure",
  club: "Club-facing (phase 3–4)",
};
const tierNotes = {
  player: "Consumes scores and leaderboard data via Supabase Realtime",
  scoring: "Pure functions — input strokes, output rankings. Shared handicap allocation logic",
};

const phaseColors = {
  mvp: { bg: "#E8F5EE", text: "#1D9E75", label: "MVP" },
  soon: { bg: "#E6F1FB", text: "#185FA5", label: "P2" },
  later: { bg: "#FAEEDA", text: "#854F0B", label: "P3" },
  future: { bg: "#F1EFE8", text: "#5F5E5A", label: "P4" },
};

const legendItems = [
  { phase: "mvp", label: "MVP (weeks 1–6)" },
  { phase: "soon", label: "Phase 2 (weeks 7–18)" },
  { phase: "later", label: "Phase 3 (weeks 19–30)" },
  { phase: "future", label: "Phase 4+" },
];

export default function LX2Architecture() {
  const [selected, setSelected] = useState(null);
  const mod = selected ? modules[selected] : null;

  const grouped = {};
  for (const [id, m] of Object.entries(modules)) {
    if (!grouped[m.tier]) grouped[m.tier] = [];
    grouped[m.tier].push({ id, ...m });
  }

  return (
    <div className="p-4 max-w-3xl mx-auto" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4">
        {legendItems.map((l) => (
          <div key={l.phase} className="flex items-center gap-1.5 text-xs text-gray-500">
            <div
              className="w-2 h-2 rounded-sm"
              style={{ background: phaseColors[l.phase].text }}
            />
            {l.label}
          </div>
        ))}
      </div>

      {/* Tiers */}
      {tierOrder.map((tier) => (
        <div key={tier} className="mb-1">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 mt-5">
            {tierLabels[tier]}
          </div>
          <div className="flex flex-wrap gap-2">
            {(grouped[tier] || []).map((m) => {
              const pc = phaseColors[m.phase];
              const isSel = selected === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelected(isSel ? null : m.id)}
                  className="text-left relative rounded-xl px-3 py-2.5 transition-all"
                  style={{
                    flex: "1 1 150px",
                    minWidth: 140,
                    maxWidth: 220,
                    background: isSel ? "rgba(59,130,246,0.06)" : "transparent",
                    border: isSel
                      ? "1.5px solid rgba(59,130,246,0.4)"
                      : "0.5px solid rgba(0,0,0,0.1)",
                  }}
                >
                  <span
                    className="absolute top-1.5 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded"
                    style={{ background: pc.bg, color: pc.text }}
                  >
                    {pc.label}
                  </span>
                  <div className="text-sm font-medium text-gray-900 pr-8">{m.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5 leading-tight">{m.sub}</div>
                </button>
              );
            })}
          </div>
          {tierNotes[tier] && (
            <div className="text-[11px] text-gray-400 italic mt-1 ml-1">
              ↑ {tierNotes[tier]} ↑
            </div>
          )}
        </div>
      ))}

      {/* Detail panel */}
      {mod && (
        <div className="mt-4 rounded-xl p-5" style={{ background: "rgba(0,0,0,0.03)" }}>
          <div className="text-base font-medium text-gray-900">{mod.name}</div>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{mod.desc}</p>

          {mod.deps.length > 0 && (
            <>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-4 mb-1.5">
                Depends on
              </div>
              <div className="flex flex-wrap gap-1.5">
                {mod.deps.map((d) => (
                  <span
                    key={d}
                    className="text-xs px-2 py-0.5 rounded border text-gray-500"
                    style={{ borderColor: "rgba(0,0,0,0.1)" }}
                  >
                    {d}
                  </span>
                ))}
              </div>
            </>
          )}

          {mod.data.length > 0 && (
            <>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 mb-1.5">
                Data tables
              </div>
              <div className="flex flex-wrap gap-1.5">
                {mod.data.map((d) => (
                  <code
                    key={d}
                    className="text-xs px-2 py-0.5 rounded border text-gray-500"
                    style={{
                      borderColor: "rgba(0,0,0,0.1)",
                      fontFamily: "monospace",
                      fontSize: 11,
                    }}
                  >
                    {d}
                  </code>
                ))}
              </div>
            </>
          )}

          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 mb-1.5">
            Key features
          </div>
          <ol className="text-sm text-gray-700 leading-relaxed pl-4 list-decimal">
            {mod.features.map((f, i) => (
              <li key={i} className="mb-0.5">
                {f}
              </li>
            ))}
          </ol>

          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 mb-1.5">
            Technical approach
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{mod.tech}</p>
        </div>
      )}
    </div>
  );
}
