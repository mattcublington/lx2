'use client'
import { useState } from 'react'
import Image from 'next/image'

const GITHUB = 'https://github.com/mattcublington/lx2/blob/main'
const APP    = 'https://lx2.golf'

type Phase   = 'mvp' | 'soon' | 'later' | 'future'
type Tier    = 'player-pwa' | 'player-web' | 'organiser' | 'scoring' | 'course' | 'infra' | 'club' | 'api'
type Status  = 'done' | 'building' | 'planned'
type Surface = 'player' | 'organiser' | 'club' | 'shared' | 'api'

interface Module {
  id: string; name: string; phase: Phase; tier: Tier; status: Status
  surface: Surface; sub: string; desc: string; deps: string[]; data: string[]
  liveUrl: string | null; prdUrl: string | null; codeUrl: string | null
  features: string[]; tech: string
}

const modules: Record<string, Module> = {

  // ── Player — on-course PWA ──────────────────────────────────────────────────

  score_entry: {
    id: 'score_entry', name: 'Score entry', phase: 'mvp', tier: 'player-pwa',
    status: 'building', surface: 'player',
    sub: 'Hole-by-hole, mobile-first',
    desc: 'The core on-course interaction. One tap per hole. Stableford, Stroke Play, Match Play. Works offline. Designed for one hand, bright sunlight, wet fingers.',
    deps: ['handicap', 'course_db', 'auth'],
    data: ['hole_scores', 'scorecards'],
    liveUrl: `${APP}/score`, prdUrl: `${GITHUB}/docs/prd/score-entry.md`,
    codeUrl: `${GITHUB}/apps/web/src/app/score/ScoreEntry.tsx`,
    features: ['One-tap score entry, large targets (48px)', 'Running Stableford points per hole', 'Match Play status display', 'NTP/LD capture on designated holes', 'Undo, pick-up/NR', 'Auto-advance to next player', 'Full scorecard view'],
    tech: 'Next.js App Router, useReducer. Sage green player theme. Offline via IndexedDB (Phase 2).',
  },
  ntp_ld: {
    id: 'ntp_ld', name: 'NTP / Longest Drive', phase: 'mvp', tier: 'player-pwa',
    status: 'building', surface: 'player',
    sub: 'Side contest tracking',
    desc: 'Nearest the pin and longest drive result capture. Organiser designates holes at event creation. Players enter results after each relevant hole.',
    deps: ['event_create', 'score_entry'],
    data: ['contest_entries'],
    liveUrl: `${APP}/score`, prdUrl: null, codeUrl: null,
    features: ['NTP and LD holes designated at event creation', 'Overlay capture after each contest hole', 'Distance in yards', 'Winners shown on leaderboard and results', 'Sponsor branding surface on contest holes'],
    tech: 'Part of score entry UI. contest_entries table.',
  },
  leaderboard_live: {
    id: 'leaderboard_live', name: 'Live leaderboard', phase: 'mvp', tier: 'player-pwa',
    status: 'planned', surface: 'player',
    sub: 'Real-time, shareable, TV mode',
    desc: 'Auto-updating standings via WebSocket. Shareable URL — no account needed to view. TV/full-screen mode for clubhouse screens. Score hiding on final holes preserves competition drama. Projected team scores keep Reds vs Blues exciting.',
    deps: ['stableford', 'strokeplay', 'matchplay', 'realtime'],
    data: ['scorecards', 'hole_scores', 'events', 'event_players'],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: ['Sub-second updates via Supabase Realtime', 'Format-aware: Stableford / Stroke / Match', '"Through X holes" per player', 'NTP/LD results panel', 'TV mode: full-screen, auto-scroll', 'Shareable URL with OG preview', 'Score hiding on final holes (anti-spoiler)', 'Projected team scores for team formats'],
    tech: 'Supabase Realtime subscription. Client-side scoring recalculates on each change.',
  },
  event_landing: {
    id: 'event_landing', name: 'Event landing page', phase: 'mvp', tier: 'player-pwa',
    status: 'building', surface: 'player',
    sub: 'Player entry point via invite link',
    desc: 'The page players land on when they tap the WhatsApp invite link. Shows event details, confirmed players, and routes to scoring or leaderboard.',
    deps: ['event_create', 'invite'],
    data: ['events', 'event_players'],
    liveUrl: `${APP}/events/[id]`, prdUrl: null,
    codeUrl: `${GITHUB}/apps/web/src/app/events/[id]/page.tsx`,
    features: ['Event name, date, course, format', 'Confirmed player list', 'Start scoring CTA', 'View leaderboard CTA', 'Share invite link button'],
    tech: 'Next.js server component. Supabase join on events + event_players.',
  },
  branded_event_site: {
    id: 'branded_event_site', name: 'Branded event site', phase: 'soon', tier: 'player-pwa',
    status: 'planned', surface: 'player',
    sub: 'Sponsor logos, custom colours, shareable recap',
    desc: 'Upgrade the event landing page into a fully branded tournament microsite. Organiser uploads sponsor logos, picks accent colour, gets a shareable URL for pre-event marketing and post-event recap. Key commercial surface for corporate days and club competitions.',
    deps: ['event_landing', 'event_create'],
    data: ['events', 'brand_assets'],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: ['Custom colour theme per event', 'Sponsor logo placement (header, leaderboard, contest holes)', 'Pre-event landing page for marketing', 'Post-event recap with results, photos, highlights', 'Shareable URL — works without login', 'PDF results export for prize-giving'],
    tech: 'Event brand_assets table. CSS custom property injection per event. Vercel edge for fast shareable URLs.',
  },

  // ── Marketing & web home ────────────────────────────────────────────────────

  marketing_home: {
    id: 'marketing_home', name: 'Marketing homepage', phase: 'mvp', tier: 'player-web',
    status: 'done', surface: 'shared',
    sub: 'Organiser-first scrolling marketing page',
    desc: 'Public homepage targeting organisers. Full-bleed hero photo with frosted glass UI. Scrolling sections: hero, how it works, features, sign-up CTA. Players can enter an event code directly from the hero. Primary CTA drives organiser sign-up.',
    deps: ['auth'],
    data: [],
    liveUrl: APP, prdUrl: null,
    codeUrl: `${GITHUB}/apps/web/src/app/page.tsx`,
    features: ['Full-bleed hero photo + dark gradient overlay', 'Frosted glass action cards', 'Organiser headline + Get started free CTA', 'Event code entry for players joining an existing round', 'How it works (3-step)', 'Feature highlights grid', 'Bottom sign-up CTA section'],
    tech: 'Next.js client component. CSS-in-JSX. hero.png served from public/. Manrope + Lexend fonts.',
  },

  // ── Player — web & stats ────────────────────────────────────────────────────

  player_home: {
    id: 'player_home', name: 'Player home (/play)', phase: 'soon', tier: 'player-web',
    status: 'planned', surface: 'player',
    sub: 'Stats dashboard, golfer web entry point',
    desc: 'The golfer web experience. Strava-style stats dashboard. Round history, handicap trend, performance analytics.',
    deps: ['auth', 'results'],
    data: ['users', 'scorecards', 'events'],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: ['Driving performance, GIR, putting avg', 'Handicap trend over time', 'Best/worst rounds', 'Course history', 'Goal tracking'],
    tech: 'Next.js server component. Aggregation queries. Manrope display + Lexend body.',
  },
  player_profile: {
    id: 'player_profile', name: 'Player profile', phase: 'soon', tier: 'player-web',
    status: 'planned', surface: 'player',
    sub: 'Public stats page',
    desc: 'Shareable public profile showing round history, stats, and handicap trend.',
    deps: ['auth', 'player_home'],
    data: ['users', 'scorecards'],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: ['Win/loss record', 'Scoring average', 'Handicap trend', 'Events played'],
    tech: 'Server-rendered. Materialised views for stats at scale.',
  },
  results: {
    id: 'results', name: 'Results & history', phase: 'mvp', tier: 'player-web',
    status: 'planned', surface: 'player',
    sub: 'Permanent shareable results page',
    desc: 'Final results at a permanent URL. Shared via WhatsApp after the round. Never expires.',
    deps: ['stableford', 'strokeplay', 'event_create'],
    data: ['events', 'scorecards', 'contest_entries'],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: ['Final standings, scores, handicaps', 'NTP/LD winners', 'Full per-player scorecard', 'Share button (WhatsApp, copy link)', 'Persistent URL'],
    tech: 'Next.js ISR once event is finalised. Cached at edge.',
  },
  join_a_game: {
    id: 'join_a_game', name: 'Join a game', phase: 'later', tier: 'player-web',
    status: 'planned', surface: 'player',
    sub: 'Browse and join open rounds',
    desc: 'Discovery surface for open events and rounds. Players find and join events with available slots — society days open to visitors, club competition entries, group rounds with space. Fill-rate mechanic for organisers; discovery mechanic for players.',
    deps: ['event_create', 'invite', 'payments', 'event_landing'],
    data: ['events', 'event_players'],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: ['Browse public events by date, course, format', 'Filter by format, distance, handicap range', 'Join with one tap + payment', 'Organiser controls: open / invite-only / closed', 'Fill-rate notifications to organiser', 'Club-promoted events given priority placement'],
    tech: 'Supabase PostGIS for location-based search. Event visibility enum: public / invite / private.',
  },
  gps: {
    id: 'gps', name: 'GPS / rangefinder', phase: 'future', tier: 'player-web',
    status: 'planned', surface: 'player',
    sub: 'Distances on 40k+ courses',
    desc: "On-course GPS distances to front, middle, and back of green. Shot measurement and sharing. 40,000+ courses globally. Key daily-use utility that drives habitual engagement outside of events — the clearest gap between LX2 and Golf GameBook's player-side product.",
    deps: ['course_db'],
    data: ['courses', 'course_holes'],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: ['Front / middle / back distance to green', 'Hazard distances', 'Shot measurement — tap start and end', 'Share shot distance to social feed', 'Works offline via cached course map', '40,000+ courses globally'],
    tech: 'Browser Geolocation API. Course GPS data from golfcourseapi.com. IndexedDB cache for offline use.',
  },

  // ── Organiser tools ─────────────────────────────────────────────────────────

  event_create: {
    id: 'event_create', name: 'Event creation', phase: 'mvp', tier: 'organiser',
    status: 'building', surface: 'organiser',
    sub: 'Set up new event — 3-step form',
    desc: 'Organiser creates an event in under 3 minutes. Selects course, format, fee, NTP/LD holes. Gets a shareable invite link.',
    deps: ['course_db', 'auth', 'payments'],
    data: ['events', 'courses'],
    liveUrl: `${APP}/events/new`,
    prdUrl: `${GITHUB}/docs/prd/event-creation.md`,
    codeUrl: `${GITHUB}/apps/web/src/app/events/new/page.tsx`,
    features: ['Step 1: name, date, course search, tee', 'Step 2: format, handicap allowance, group size', 'Step 3: NTP/LD holes, entry fee, visibility', 'Summary before creating', 'Generates shareable invite link', 'Cumberwell Park 5 loops supported'],
    tech: 'Next.js client form + server action. Course typeahead from course_db.',
  },
  invite: {
    id: 'invite', name: 'Invite & RSVP', phase: 'mvp', tier: 'organiser',
    status: 'planned', surface: 'organiser',
    sub: 'No account needed to join',
    desc: 'Players tap the WhatsApp link, see event details, enter name and handicap, confirm. No account required.',
    deps: ['event_create', 'auth'],
    data: ['event_players', 'users'],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: ['Public URL — no login needed', 'Enter name, email, handicap index', 'RSVP: confirmed / declined / waitlisted', 'Organiser can manually add players', 'Email confirmation + calendar invite'],
    tech: 'Public Next.js page. Supabase anonymous auth. Magic link on account creation.',
  },
  payments: {
    id: 'payments', name: 'Payments', phase: 'mvp', tier: 'organiser',
    status: 'planned', surface: 'organiser',
    sub: 'Stripe Checkout, live tracker',
    desc: 'Entry fee collection via Stripe. Organiser sees live payment status. Cash override available.',
    deps: ['invite', 'event_create'],
    data: ['event_players'],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: ['Stripe Checkout in RSVP flow', 'Live payment status on dashboard', 'Manual mark-as-paid for cash', 'Payment reminder emails'],
    tech: 'Stripe Checkout via Next.js API route. Webhook updates Supabase.',
  },
  org_dashboard: {
    id: 'org_dashboard', name: 'Organiser dashboard', phase: 'mvp', tier: 'organiser',
    status: 'planned', surface: 'organiser',
    sub: 'Flights, payments, proxy scoring',
    desc: 'Command centre for the day. Player list, flight management, live round overview, proxy score entry.',
    deps: ['event_create', 'invite', 'payments', 'score_entry'],
    data: ['events', 'event_players', 'scorecards'],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: ['Player list with RSVP + payment status', 'Drag-and-drop flight management', 'Auto-generate balanced flights', 'Proxy score entry for any player', 'Print draw sheet', 'Finalise and publish results'],
    tech: 'Desktop-optimised Next.js page. Supabase Realtime for live status.',
  },

  // ── Scoring engines ─────────────────────────────────────────────────────────

  stableford: {
    id: 'stableford', name: 'Stableford engine', phase: 'mvp', tier: 'scoring',
    status: 'done', surface: 'shared',
    sub: 'Points from net score vs par',
    desc: 'Pure TypeScript. Input strokes, output points. No database dependency. Fully tested.',
    deps: ['handicap'], data: [],
    liveUrl: null, prdUrl: null,
    codeUrl: `${GITHUB}/packages/scoring/src/stableford.ts`,
    features: ['Net = gross minus handicap strokes', '0–5 points per hole', 'Countback tiebreaker', '95% allowance (configurable)', 'Pick-up handling'],
    tech: '@lx2/scoring — pure TypeScript, Vitest tested.',
  },
  strokeplay: {
    id: 'strokeplay', name: 'Stroke play engine', phase: 'mvp', tier: 'scoring',
    status: 'done', surface: 'shared',
    sub: 'Gross and net totals',
    desc: 'Gross minus playing handicap = net. Lower is better. NR for incomplete rounds.',
    deps: ['handicap'], data: [],
    liveUrl: null, prdUrl: null,
    codeUrl: `${GITHUB}/packages/scoring/src/strokeplay.ts`,
    features: ['Gross total', 'Net total = gross minus HC', 'Relative to par display', 'NR handling'],
    tech: '@lx2/scoring — shares handicap logic with Stableford.',
  },
  matchplay: {
    id: 'matchplay', name: 'Match play engine', phase: 'mvp', tier: 'scoring',
    status: 'done', surface: 'shared',
    sub: 'Holes up/down, early close',
    desc: 'Hole-by-hole contest. Early termination when result is certain. Dormie detection.',
    deps: ['handicap'], data: [],
    liveUrl: null, prdUrl: null,
    codeUrl: `${GITHUB}/packages/scoring/src/matchplay.ts`,
    features: ['Win/lose/halve per hole', 'HC = difference between players', '"4 and 3" early close', 'Dormie detection'],
    tech: '@lx2/scoring — separate interface from Stableford/Stroke.',
  },
  handicap: {
    id: 'handicap', name: 'Handicap engine', phase: 'mvp', tier: 'scoring',
    status: 'done', surface: 'shared',
    sub: 'Index → playing HC via slope',
    desc: 'WHS formula. Distributes strokes by stroke index. Shared by all engines.',
    deps: ['course_db'], data: [],
    liveUrl: null, prdUrl: null,
    codeUrl: `${GITHUB}/packages/scoring/src/handicap.ts`,
    features: ['WHS: Index × Slope/113 + (Rating−Par) × allowance', 'Stroke distribution by SI', 'Plus handicap support'],
    tech: '@lx2/scoring — fully tested, zero dependencies.',
  },
  skins: {
    id: 'skins', name: 'Skins engine', phase: 'soon', tier: 'scoring',
    status: 'planned', surface: 'shared',
    sub: 'Carry-over pot per hole',
    desc: 'Each hole worth a skin. Carry-over if tied. Runs alongside Stableford.',
    deps: ['stableford', 'handicap'], data: [],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: ['Hole-by-hole skins with carry-over', 'Configurable skin value', 'Works alongside main format'],
    tech: '@lx2/scoring extension.',
  },
  rvb: {
    id: 'rvb', name: 'Reds vs Blues', phase: 'soon', tier: 'scoring',
    status: 'planned', surface: 'shared',
    sub: 'Ryder Cup team format',
    desc: 'Two teams, multiple concurrent match play pairings. Aggregate team score. Up to 72 players.',
    deps: ['matchplay', 'handicap'], data: ['events', 'event_players'],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: ['Two teams, configurable names/colours', 'Multiple concurrent pairings', 'Aggregate team score', 'Projected result', 'Up to 72 players', 'Dramatic reveal mode'],
    tech: 'Extends Match Play engine.',
  },
  scramble: {
    id: 'scramble', name: 'Scramble engine', phase: 'soon', tier: 'scoring',
    status: 'planned', surface: 'shared',
    sub: 'Team scramble format',
    desc: 'One of the most common corporate and charity event formats. All players hit, best shot selected, all play from there. Supports 2-, 3-, and 4-person scrambles with net scoring.',
    deps: ['handicap'], data: [],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: ['2, 3, and 4-player scramble', 'Best shot selection per hole', 'Net scramble via composite team handicap', 'Stroke play and Stableford variants', 'Works with any number of teams'],
    tech: '@lx2/scoring — team HC = 20% low + 15% 2nd + 10% 3rd + 5% 4th.',
  },
  better_ball: {
    id: 'better_ball', name: 'Better ball stableford', phase: 'soon', tier: 'scoring',
    status: 'planned', surface: 'shared',
    sub: 'Pair points — best score counts',
    desc: 'Pair format where the best Stableford score counts per hole. One of the most common society and club competition formats — essential for away days and charity events.',
    deps: ['stableford', 'handicap'], data: [],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: ['Pair-level best Stableford score per hole', 'Individual scores visible within pair', 'Net scoring via handicap allocation', 'Stroke play variant (best ball gross/net)', 'Countback at pair level'],
    tech: '@lx2/scoring — composes Stableford engine with pair reduction.',
  },

  // ── Course & handicap data ──────────────────────────────────────────────────

  course_db: {
    id: 'course_db', name: 'Course database', phase: 'mvp', tier: 'course',
    status: 'planned', surface: 'shared',
    sub: 'Par, SI, yardage, slope, rating',
    desc: '~30,000 UK courses from golfcourseapi.com. Cumberwell Park 5 loops manually seeded.',
    deps: [], data: ['courses', 'course_holes', 'course_tees'],
    liveUrl: null,
    prdUrl: `${GITHUB}/docs/db/schema-notes.md`,
    codeUrl: `${GITHUB}/packages/db/migrations/001_initial_schema.sql`,
    features: ['30k courses from golfcourseapi.com (free)', 'Per hole: par, stroke index', 'Per tee: yardage, slope, course rating', 'Typeahead search', 'Cumberwell Park pre-verified'],
    tech: 'Supabase: courses, course_holes, course_tees. Cumberwell seeded in lib/courses.ts.',
  },
  whs: {
    id: 'whs', name: 'WHS integration', phase: 'later', tier: 'course',
    status: 'planned', surface: 'shared',
    sub: 'Live handicap lookup',
    desc: 'WHS handicap via England Golf / DotGolf API. Requires ISV licence.',
    deps: ['handicap', 'auth'], data: ['users'],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: ['Lookup by CDH number', 'Auto-populate handicap', 'Submit qualifying rounds', 'ISV licence from England Golf required'],
    tech: 'DotGolf API. Manual entry as fallback throughout.',
  },

  // ── Platform infrastructure ─────────────────────────────────────────────────

  auth: {
    id: 'auth', name: 'Authentication', phase: 'mvp', tier: 'infra',
    status: 'building', surface: 'shared',
    sub: 'Google OAuth + email/password',
    desc: 'Organisers sign up via Google OAuth or email/password. Players joining events need no account. Magic link available as fallback. Row-level security on all Supabase tables.',
    deps: [], data: ['users'],
    liveUrl: `${APP}/auth/login`, prdUrl: null,
    codeUrl: `${GITHUB}/apps/web/src/app/auth/login/page.tsx`,
    features: ['Google OAuth (primary — one tap)', 'Email + password sign up/in', 'Magic link as fallback', 'Anonymous play for event participants', 'Row-level security on all tables', 'Supabase session via SSR cookies'],
    tech: 'Supabase Auth. @supabase/ssr for server-side session. Google Cloud OAuth 2.0 client.',
  },
  realtime: {
    id: 'realtime', name: 'Realtime layer', phase: 'mvp', tier: 'infra',
    status: 'planned', surface: 'shared',
    sub: 'WebSocket subscriptions',
    desc: 'Live score updates pushed to leaderboard clients the moment a hole is saved.',
    deps: ['auth'], data: ['hole_scores', 'scorecards'],
    liveUrl: null, prdUrl: null,
    codeUrl: `${GITHUB}/packages/db/migrations/001_initial_schema.sql`,
    features: ['Supabase Realtime on hole_scores + scorecards', 'Client-side recalculation per change', 'Reconnection with reconciliation'],
    tech: 'Supabase Realtime (postgres_changes). Enabled in migration.',
  },
  brand_system: {
    id: 'brand_system', name: 'Brand system', phase: 'mvp', tier: 'infra',
    status: 'building', surface: 'shared',
    sub: 'Fairway Editorial design tokens',
    desc: 'Single source of truth for all brand values. Three surface themes. Club white-label support.',
    deps: [], data: [],
    liveUrl: null,
    prdUrl: `${GITHUB}/docs/brand/style-guide.md`,
    codeUrl: `${GITHUB}/packages/brand/src/tokens.ts`,
    features: ['Player, organiser, club themes', 'getCSSVars() for CSS custom properties', 'applyClubTheme() for white-labelling', 'Tailwind config export', 'Manrope (display) + Lexend (body)'],
    tech: '@lx2/brand package. TypeScript. No runtime dependencies.',
  },
  pwa: {
    id: 'pwa', name: 'PWA / offline', phase: 'soon', tier: 'infra',
    status: 'planned', surface: 'player',
    sub: 'Add to home screen, offline scoring',
    desc: 'Service worker caches scoring pages. Scores written to IndexedDB offline, synced on reconnect.',
    deps: ['score_entry', 'auth'], data: [],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: ['Offline scorecard via IndexedDB', 'Background sync on reconnect', 'Add to home screen prompt', 'Works on iOS Safari + Android Chrome'],
    tech: 'next-pwa. Workbox. idb library.',
  },

  // ── Club management (Phase 3) ───────────────────────────────────────────────

  club_erp: {
    id: 'club_erp', name: 'Club ERP layer', phase: 'later', tier: 'club',
    status: 'planned', surface: 'club',
    sub: 'Unified club management — Cumberwell first',
    desc: 'Orchestration layer coordinating member data, competition calendar, tee times, and admin reporting. Designed to replace intelligentgolf + golfbook/255it. Pilot: Cumberwell Park. Role-based access for committee, pro, secretary.',
    deps: ['club_members', 'club_tee_sheet', 'club_competitions', 'club_admin_dash', 'auth', 'payments'],
    data: ['clubs', 'club_members', 'events'],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: ['Unified club admin portal', 'Import from intelligentgolf CSV', 'Replaces golfbook / 255it tee sheet', 'Single login for staff and members', 'Role-based access: committee, pro, secretary, member', 'Full audit trail'],
    tech: 'Extended Supabase schema. clubs, club_members, roles tables with RLS. intelligentgolf import format.',
  },
  club_members: {
    id: 'club_members', name: 'Member management', phase: 'later', tier: 'club',
    status: 'planned', surface: 'club',
    sub: 'Roster, categories, CDH numbers',
    desc: 'Full member record management. Handles member categories (full, senior, 5-day, junior, social), handicap indexes, contact details, and subscription status. Entry point for the Cumberwell pilot.',
    deps: ['auth', 'whs'],
    data: ['club_members', 'users'],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: ['Import from intelligentgolf CSV', 'Member categories: full, senior, 5-day, junior, social', 'CDH number storage for WHS lookup', 'Contact directory', 'Lapsed / resigned / suspended states', 'Sanctions: block reservations for bad debt', 'Family unit grouping', 'Bulk email / SMS to member segments'],
    tech: 'club_members with category enum. Supabase RLS — admins see all, members see own. CSV import via Papa Parse.',
  },
  club_tee_sheet: {
    id: 'club_tee_sheet', name: 'Tee sheet', phase: 'later', tier: 'club',
    status: 'planned', surface: 'club',
    sub: 'Booking and slot management',
    desc: "Full tee time booking system replacing golfbook and 255it. Members book online; staff manage slot configuration, pricing, and capacity. Designed around Cumberwell's 18-hole layout.",
    deps: ['club_members', 'auth', 'payments'],
    data: ['tee_times', 'bookings'],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: ['Daily grid — 10-minute intervals', 'Member online booking — 72hr advance window', 'Visitor booking with payment', 'Priority windows for full members', 'Block booking for society days', 'Waiting list for full slots', 'Check-in / no-show tracking', 'Dynamic pricing by time and day'],
    tech: 'tee_times and bookings tables. Stripe for visitor payments. Supabase Realtime for live slot availability.',
  },
  club_competitions: {
    id: 'club_competitions', name: 'Competitions calendar', phase: 'later', tier: 'club',
    status: 'planned', surface: 'club',
    sub: 'Draw management, WHS submission',
    desc: "Manage the club's annual competition calendar. Entry lists, draw management, starting sheet generation, WHS results submission, and historical archive. Bridges LX2 event scoring with formal club competitions.",
    deps: ['club_members', 'event_create', 'stableford', 'strokeplay', 'whs'],
    data: ['events', 'scorecards'],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: ['Annual competition calendar', 'Entry list and draw management', 'Starting sheet PDF generation', 'WHS qualifying round submission via DotGolf', 'Historical results archive', 'Club championship and knockout formats'],
    tech: 'Extends event and scoring modules. DotGolf API for WHS submission (ISV licence required).',
  },
  club_admin_dash: {
    id: 'club_admin_dash', name: 'Club admin dashboard', phase: 'later', tier: 'club',
    status: 'planned', surface: 'club',
    sub: 'Committee reporting and financials',
    desc: 'Central dashboard for club secretary, treasurer, and captain. Membership numbers, revenue, rounds played, competition participation. Replaces manual committee reporting spreadsheets.',
    deps: ['club_members', 'club_tee_sheet', 'club_competitions', 'payments'],
    data: ['clubs', 'club_members', 'bookings', 'events'],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: ['Live membership numbers by category', 'Monthly revenue from bookings and visitors', 'Rounds played by month and year', 'Competition entry rates', 'Overdue subscription report', 'Export to CSV for committee meetings'],
    tech: 'Supabase views and aggregation queries. Recharts. PDF export for committee packs.',
  },

  // ── Partner API & integrations (Phase 3) ────────────────────────────────────

  partner_api: {
    id: 'partner_api', name: 'Partner API', phase: 'later', tier: 'api',
    status: 'planned', surface: 'api',
    sub: 'Multi-tenant REST API with API keys',
    desc: 'Documented gap vs Golfmanager (competitor analysis, March 2026). Golfmanager\'s primary moat is its integrator-facing API: explicit multi-tenancy (tenant + key headers), consumer vs admin API surfaces, and webhooks. LX2 needs a comparable surface for club system integrations, OTA booking, and future partner channels. Design the data model now — build in P3.',
    deps: ['auth', 'club_erp', 'club_tee_sheet'],
    data: ['api_keys', 'webhooks'],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: ['API key per club (club = tenant)', 'Scoped keys: read-only / read-write / admin', 'Consumer API: booking surface for OTAs', 'Admin API: member and competition records', 'Webhooks: round completed, booking confirmed, member joined', 'Rate limiting per key', 'Key rotation and revocation', 'Usage dashboard'],
    tech: 'PostgREST (Supabase) + custom auth middleware. Webhooks via Edge Functions + pg_net. Mirrors Golfmanager V3 tenant+key model.',
  },
  api_docs: {
    id: 'api_docs', name: 'Developer portal', phase: 'later', tier: 'api',
    status: 'planned', surface: 'api',
    sub: 'Public API documentation',
    desc: 'Public documentation for the LX2 partner API. OpenAPI 3.0 spec auto-generated from Supabase schema. Interactive explorer, webhook reference, and integration guides.',
    deps: ['partner_api'],
    data: [],
    liveUrl: null, prdUrl: null, codeUrl: null,
    features: ['OpenAPI 3.0 spec (auto-generated)', 'Interactive API explorer', 'Authentication guide (API key model)', 'Webhook payload reference', 'Integration guides: tee sheet, WHS, accounting', 'Changelog'],
    tech: 'Mintlify or Scalar. OpenAPI from Supabase PostgREST introspection.',
  },
}

// ─── Journey data ─────────────────────────────────────────────────────────────

type JourneyStep = {
  id: string; label: string; sub: string; status: Status
  moduleId?: string; x: number; y: number
}
type JourneyArrow = { x1: number; y1: number; x2: number; y2: number; dashed?: boolean }
type Journey = { id: string; label: string; steps: JourneyStep[]; arrows: JourneyArrow[]; height: number }

const journeys: Journey[] = [
  {
    id: 'player', label: 'Player — join a round', height: 500,
    steps: [
      { id: 'home',    label: 'lx2.golf home',      sub: 'entry point',              status: 'done',                                x: 240, y: 20  },
      { id: 'landing', label: 'Event landing page',  sub: 'via WhatsApp invite link', status: 'building', moduleId: 'event_landing',  x: 60,  y: 120 },
      { id: 'auth',    label: 'Sign in',             sub: 'magic link (optional)',    status: 'building', moduleId: 'auth',            x: 420, y: 120 },
      { id: 'score',   label: 'Score entry',         sub: 'hole-by-hole on PWA',      status: 'building', moduleId: 'score_entry',     x: 240, y: 230 },
      { id: 'ntp',     label: 'NTP / Longest Drive', sub: 'side contest entry',       status: 'building', moduleId: 'ntp_ld',          x: 60,  y: 340 },
      { id: 'live',    label: 'Live leaderboard',    sub: 'real-time standings',      status: 'planned',  moduleId: 'leaderboard_live',x: 420, y: 340 },
      { id: 'results', label: 'Results',             sub: 'shareable scorecard',      status: 'planned',  moduleId: 'results',         x: 240, y: 440 },
    ],
    arrows: [
      { x1: 300, y1: 70,  x2: 160, y2: 120 },
      { x1: 380, y1: 70,  x2: 480, y2: 120 },
      { x1: 160, y1: 170, x2: 300, y2: 230, dashed: true },
      { x1: 520, y1: 170, x2: 380, y2: 230, dashed: true },
      { x1: 280, y1: 280, x2: 160, y2: 340 },
      { x1: 400, y1: 280, x2: 480, y2: 340 },
      { x1: 160, y1: 390, x2: 300, y2: 440 },
      { x1: 480, y1: 390, x2: 380, y2: 440 },
    ],
  },
  {
    id: 'organiser', label: 'Organiser — run an event', height: 560,
    steps: [
      { id: 'org_home',   label: '/organise page',      sub: 'organiser entry',        status: 'done',                                x: 240, y: 20  },
      { id: 'org_auth',   label: 'Sign in',             sub: 'magic link required',    status: 'building', moduleId: 'auth',           x: 240, y: 110 },
      { id: 'org_create', label: 'Event creation',      sub: '3-step form',            status: 'building', moduleId: 'event_create',   x: 240, y: 200 },
      { id: 'org_invite', label: 'Invite & RSVP',       sub: 'players join via link',  status: 'planned',  moduleId: 'invite',         x: 240, y: 300 },
      { id: 'org_pay',    label: 'Payments',            sub: 'Stripe checkout',        status: 'planned',  moduleId: 'payments',       x: 60,  y: 400 },
      { id: 'org_dash',   label: 'Organiser dashboard', sub: 'flights, proxy scoring', status: 'planned',  moduleId: 'org_dashboard',  x: 420, y: 400 },
      { id: 'org_result', label: 'Results published',   sub: 'permanent & shareable',  status: 'planned',  moduleId: 'results',        x: 240, y: 500 },
    ],
    arrows: [
      { x1: 340, y1: 70,  x2: 340, y2: 110 },
      { x1: 340, y1: 160, x2: 340, y2: 200 },
      { x1: 340, y1: 250, x2: 340, y2: 300 },
      { x1: 300, y1: 350, x2: 160, y2: 400 },
      { x1: 380, y1: 350, x2: 480, y2: 400 },
      { x1: 160, y1: 450, x2: 300, y2: 500 },
      { x1: 480, y1: 450, x2: 380, y2: 500 },
    ],
  },
  {
    id: 'solo', label: 'Solo scorer', height: 430,
    steps: [
      { id: 's_home',    label: '/play page',      sub: 'player entry',            status: 'done',                                x: 240, y: 20  },
      { id: 's_auth',    label: 'Auth (optional)', sub: 'anonymous or signed-in',  status: 'building', moduleId: 'auth',           x: 240, y: 110 },
      { id: 's_course',  label: 'Choose course',   sub: 'course database search',  status: 'planned',  moduleId: 'course_db',      x: 240, y: 200 },
      { id: 's_score',   label: 'Score entry',     sub: 'hole-by-hole',            status: 'building', moduleId: 'score_entry',    x: 240, y: 295 },
      { id: 's_profile', label: 'Player profile',  sub: 'stats, handicap history', status: 'planned',  moduleId: 'player_profile', x: 240, y: 385 },
    ],
    arrows: [
      { x1: 340, y1: 70,  x2: 340, y2: 110 },
      { x1: 340, y1: 160, x2: 340, y2: 200 },
      { x1: 340, y1: 250, x2: 340, y2: 295 },
      { x1: 340, y1: 345, x2: 340, y2: 385 },
    ],
  },
]

// ─── Config ───────────────────────────────────────────────────────────────────

const tierOrder: Tier[] = ['player-pwa', 'player-web', 'organiser', 'scoring', 'course', 'infra', 'club', 'api']

const tierConfig: Record<Tier, { label: string; note?: string; surfaceTag: string; color: string }> = {
  'player-pwa': { label: 'Player — on-course PWA',               surfaceTag: 'Player app', color: '#2E7D32', note: 'Mobile-first. Sage green player theme. Offline-capable.' },
  'player-web': { label: 'Player — web & stats',                 surfaceTag: 'Player web', color: '#1B5E20', note: 'Strava-style stats dashboard. Desktop + mobile. Fairway Editorial design.' },
  'organiser':  { label: 'Organiser tools',                      surfaceTag: 'Organiser',  color: '#0D631B', note: 'Desktop-first event management. Clean white organiser theme.' },
  'scoring':    { label: 'Scoring engines',                      surfaceTag: 'Shared',     color: '#4CAF50', note: 'Pure TypeScript in @lx2/scoring. Zero database dependency. Fully tested.' },
  'course':     { label: 'Course & handicap data',               surfaceTag: 'Shared',     color: '#66BB6A' },
  'infra':      { label: 'Platform infrastructure',              surfaceTag: 'Shared',     color: '#888888', note: 'Shared by all surfaces above.' },
  'club':       { label: 'Club management (phase 3)',            surfaceTag: 'Club',       color: '#923357', note: 'Cumberwell Park pilot. Replaces intelligentgolf + golfbook/255it.' },
  'api':        { label: 'Partner API & integrations (phase 3)', surfaceTag: 'API',        color: '#854F0B', note: 'Documented gap vs Golfmanager (March 2026). Design data model now; build in P3.' },
}

const phaseConfig: Record<Phase, { label: string; color: string; bg: string }> = {
  mvp:    { label: 'MVP', color: '#0D631B', bg: '#E8F5E9' },
  soon:   { label: 'P2',  color: '#1565C0', bg: '#E3F2FD' },
  later:  { label: 'P3',  color: '#E65100', bg: '#FFF3E0' },
  future: { label: 'P4+', color: '#6B7280', bg: '#F3F4F6' },
}

const statusConfig: Record<Status, { label: string; color: string }> = {
  done:     { label: 'Done',     color: '#0D631B' },
  building: { label: 'Building', color: '#B8660B' },
  planned:  { label: 'Planned',  color: '#9CA3AF' },
}

const surfaceConfig: Record<Surface, { label: string; color: string; bg: string }> = {
  player:    { label: 'Player',    color: '#2E7D32', bg: '#E8F5E9' },
  organiser: { label: 'Organiser', color: '#0D631B', bg: '#E8F5E9' },
  club:      { label: 'Club',      color: '#923357', bg: '#FCE4EC' },
  shared:    { label: 'Shared',    color: '#6B7280', bg: '#F3F4F6' },
  api:       { label: 'API',       color: '#854F0B', bg: '#FFF3E0' },
}

const statusBorderColor: Record<Status, string> = {
  done:     '#1D9E75',
  building: '#EF9F27',
  planned:  '#C8C6BE',
}

// ─── Journey SVG ─────────────────────────────────────────────────────────────

function JourneyFlow({ journey, onSelectModule }: { journey: Journey; onSelectModule: (id: string) => void }) {
  return (
    <svg width="100%" viewBox={`0 0 680 ${journey.height}`} style={{ display: 'block' }}>
      <defs>
        <marker id="jarrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </marker>
      </defs>
      {journey.arrows.map((a, i) => (
        <line key={i} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
          stroke="#C8C6BE" strokeWidth="1"
          strokeDasharray={a.dashed ? '4 3' : undefined}
          markerEnd="url(#jarrow)" />
      ))}
      {journey.steps.map(step => {
        const borderColor = statusBorderColor[step.status]
        const isLive = step.status === 'done'
        return (
          <g key={step.id} style={{ cursor: step.moduleId ? 'pointer' : 'default' }}
            onClick={() => step.moduleId && onSelectModule(step.moduleId)}>
            <rect x={step.x} y={step.y} width={200} height={50} rx={10}
              fill="#fff" stroke={borderColor} strokeWidth={isLive ? 1.5 : 1} />
            <text x={step.x + 100} y={step.y + 17} textAnchor="middle"
              style={{ fontSize: 13, fontWeight: 600, fill: '#1A2E1A', fontFamily: "'Manrope', sans-serif" }}>
              {step.label}
            </text>
            <text x={step.x + 100} y={step.y + 34} textAnchor="middle"
              style={{ fontSize: 11, fill: '#6B8C6B', fontFamily: "'Lexend', sans-serif" }}>
              {step.sub}
            </text>
            <circle cx={step.x + 186} cy={step.y + 10} r={4} fill={borderColor} />
          </g>
        )
      })}
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LX2Architecture() {
  const [selected, setSelected] = useState<string | null>(null)
  const [view, setView] = useState<'modules' | 'surfaces' | 'deps' | 'journeys'>('modules')
  const [activeJourney, setActiveJourney] = useState<string>('player')
  const mod = selected ? modules[selected] : null

  const grouped = {} as Record<Tier, Module[]>
  for (const m of Object.values(modules)) {
    if (!grouped[m.tier]) grouped[m.tier] = []
    grouped[m.tier]!.push(m)
  }

  const allMods  = Object.values(modules)
  const mvpMods  = allMods.filter(m => m.phase === 'mvp')
  const done     = allMods.filter(m => m.status === 'done').length
  const building = allMods.filter(m => m.status === 'building').length
  const mvpDone  = mvpMods.filter(m => m.status === 'done').length

  const currentJourney = journeys.find(j => j.id === activeJourney)!

  const handleJourneyModuleClick = (moduleId: string) => {
    setSelected(moduleId)
    setView('modules')
  }

  return (
    <div style={{ fontFamily: "'Lexend', system-ui, sans-serif", padding: '1rem 0', color: '#1A1C1C', maxWidth: 780, margin: '0 auto' }}>

      {/* Header with logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <Image src="/lx2-logo.svg" alt="LX2" width={144} height={57} style={{ display: 'block' }} />
        <div>
          <div style={{ fontSize: 13, color: '#6B7280', fontWeight: 400 }}>Platform architecture</div>
          <div style={{ fontSize: 11, color: '#9CA3AF' }}>v0.4 · March 2026</div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: '16px 20px', marginBottom: 20, boxShadow: '0 8px 24px rgba(26,28,28,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>MVP progress</div>
          <div style={{ fontSize: 12, color: '#9CA3AF' }}>{mvpDone} of {mvpMods.length} modules</div>
        </div>
        <div style={{ height: 6, borderRadius: 99, background: '#F3F4F6', overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #0D631B, #2E7D32)', width: `${(mvpDone / mvpMods.length) * 100}%`, transition: 'width 0.4s' }} />
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[{ l: 'Done', n: done, c: '#0D631B' }, { l: 'Building', n: building, c: '#B8660B' }, { l: 'Planned', n: allMods.length - done - building, c: '#9CA3AF' }].map(s => (
            <div key={s.l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: s.c }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.c }} />
              {s.n} {s.l}
            </div>
          ))}
        </div>
      </div>

      {/* View tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['modules', 'surfaces', 'deps', 'journeys'] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 99, border: 'none', background: view === v ? '#1A2E1A' : '#F3F4F6', color: view === v ? '#fff' : '#6B7280', cursor: 'pointer', fontFamily: "'Lexend', sans-serif", fontWeight: view === v ? 500 : 400, transition: 'all 0.15s' }}>
            {v === 'modules' ? 'All modules' : v === 'surfaces' ? 'Surfaces' : v === 'deps' ? 'Dependencies' : 'Journeys'}
          </button>
        ))}
      </div>

      {/* ── Journeys view ── */}
      {view === 'journeys' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {journeys.map(j => (
              <button key={j.id} onClick={() => setActiveJourney(j.id)} style={{ fontSize: 12, padding: '6px 16px', borderRadius: 99, border: `0.5px solid ${activeJourney === j.id ? '#2E7D32' : 'rgba(0,0,0,0.1)'}`, background: activeJourney === j.id ? '#E8F5E9' : '#fff', color: activeJourney === j.id ? '#0D631B' : '#6B7280', cursor: 'pointer', fontFamily: "'Lexend', sans-serif", fontWeight: activeJourney === j.id ? 500 : 400, transition: 'all 0.15s' }}>
                {j.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            {([['done', 'Live today'], ['building', 'In progress'], ['planned', 'Planned']] as const).map(([s, label]) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6B7280' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusBorderColor[s] }} />
                {label}
              </div>
            ))}
            <div style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 4 }}>— tap any step to see its module detail</div>
          </div>
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: '20px', boxShadow: '0 8px 24px rgba(26,28,28,0.04)', marginBottom: 16 }}>
            <JourneyFlow journey={currentJourney} onSelectModule={handleJourneyModuleClick} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {currentJourney.steps.map((step, i) => (
              <div key={step.id} onClick={() => step.moduleId && handleJourneyModuleClick(step.moduleId)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#fff', border: '0.5px solid rgba(0,0,0,0.06)', borderRadius: 10, cursor: step.moduleId ? 'pointer' : 'default', transition: 'border-color 0.15s' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#6B7280', flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1A2E1A', fontFamily: "'Manrope', sans-serif" }}>{step.label}</div>
                  <div style={{ fontSize: 11, color: '#6B8C6B' }}>{step.sub}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: statusBorderColor[step.status] }} />
                  <span style={{ fontSize: 10, color: statusConfig[step.status].color }}>{statusConfig[step.status].label}</span>
                </div>
                {step.moduleId && <span style={{ fontSize: 11, color: '#9CA3AF' }}>→</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Surfaces view ── */}
      {view === 'surfaces' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {[
            { key: 'player',    label: 'Player app & web',      color: '#2E7D32', bg: '#E8F5E9', desc: 'Two entry points, one user. The on-course PWA (sage green, mobile-first, offline-capable) and the stats web experience (Strava-style, desktop + mobile). Both use the player theme from @lx2/brand.', tiers: ['player-pwa', 'player-web'] },
            { key: 'organiser', label: 'Organiser web',         color: '#0D631B', bg: '#F1F8E9', desc: 'Desktop-first event management. Clean white organiser theme. Set up events, manage players, track payments, run the day, publish results.', tiers: ['organiser'] },
            { key: 'club',      label: 'Club admin (Phase 3)',  color: '#923357', bg: '#FCE4EC', desc: 'White-label club management portal. Pilot: Cumberwell Park. Replaces intelligentgolf for member and competition management. Custom branding per club via applyClubTheme().', tiers: ['club'] },
            { key: 'api',       label: 'Partner API (Phase 3)', color: '#854F0B', bg: '#FFF3E0', desc: 'Integrator-facing REST API. Documented gap vs Golfmanager (March 2026). Multi-tenant (club = tenant), scoped API keys, webhooks. Enables OTA booking, accounting integrations, and club system interoperability.', tiers: ['api'] },
            { key: 'shared',    label: 'Shared infrastructure', color: '#6B7280', bg: '#F3F4F6', desc: 'Scoring engines (@lx2/scoring), course database, auth, realtime layer, and brand system. Used by all surfaces. No framework dependency on the scoring engines.', tiers: ['scoring', 'course', 'infra'] },
          ].map(s => (
            <div key={s.key} style={{ background: '#fff', border: `0.5px solid ${s.color}30`, borderRadius: 16, padding: '16px 20px', boxShadow: '0 8px 24px rgba(26,28,28,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1C1C', fontFamily: "'Manrope', sans-serif" }}>{s.label}</div>
              </div>
              <div style={{ fontSize: 13, color: '#44483E', lineHeight: 1.6, marginBottom: 10 }}>{s.desc}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.values(modules).filter(m => s.tiers.includes(m.tier)).map(m => (
                  <button key={m.id} onClick={() => { setSelected(m.id); setView('modules') }} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, border: `0.5px solid ${s.color}40`, background: s.bg, color: s.color, cursor: 'pointer', fontFamily: "'Lexend', sans-serif" }}>
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Dependencies view ── */}
      {view === 'deps' && (
        <div style={{ marginBottom: 20 }}>
          {Object.values(modules).filter(m => m.deps.length > 0).map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '0.5px solid rgba(0,0,0,0.06)', fontSize: 12 }}>
              <div style={{ minWidth: 160, fontWeight: 500, color: phaseConfig[m.phase].color }}>{m.name}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {m.deps.map(dep => {
                  const dm = modules[dep]
                  return (
                    <button key={dep} onClick={() => { setSelected(dep); setView('modules') }} style={{ padding: '2px 8px', borderRadius: 99, border: `0.5px solid ${dm ? phaseConfig[dm.phase].color + '40' : '#E5E7EB'}`, background: dm ? phaseConfig[dm.phase].bg : '#F9FAFB', color: dm ? phaseConfig[dm.phase].color : '#9CA3AF', cursor: 'pointer', fontSize: 11, fontFamily: "'Lexend', sans-serif" }}>
                      → {dm ? dm.name : dep}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modules view ── */}
      {view === 'modules' && tierOrder.map(tier => {
        const mods = grouped[tier] ?? []
        if (!mods.length) return null
        const tc = tierConfig[tier]!
        return (
          <div key={tier} style={{ marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '20px 0 8px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: tc.color, flexShrink: 0 }} />
              <div style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tc.label}</div>
              <div style={{ fontSize: 10, padding: '1px 7px', borderRadius: 99, background: surfaceConfig[mods[0]!.surface]?.bg, color: surfaceConfig[mods[0]!.surface]?.color, fontWeight: 500 }}>{tc.surfaceTag}</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {mods.map(m => {
                const pc = phaseConfig[m.phase]!
                const sc = statusConfig[m.status]!
                const isSel = selected === m.id
                return (
                  <button key={m.id} onClick={() => setSelected(isSel ? null : m.id)} style={{ flex: '1 1 150px', minWidth: 140, maxWidth: 220, textAlign: 'left', padding: '12px 14px', borderRadius: 14, border: 'none', background: isSel ? '#F0F4EC' : '#fff', cursor: 'pointer', outline: isSel ? '2px solid #2E7D32' : '0.5px solid rgba(0,0,0,0.08)', boxShadow: '0 8px 24px rgba(26,28,28,0.04)', transition: 'all 0.15s', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 8, right: 8 }}>
                      <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 99, background: pc.bg, color: pc.color, fontWeight: 500 }}>{pc.label}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1A2E1A', marginBottom: 3, paddingRight: 28, fontFamily: "'Manrope', sans-serif" }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: '#6B8C6B', lineHeight: 1.35, marginBottom: 8 }}>{m.sub}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: sc.color }} />
                      <span style={{ fontSize: 10, color: sc.color }}>{sc.label}</span>
                    </div>
                  </button>
                )
              })}
            </div>
            {tc.note && <div style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic', marginTop: 4, marginLeft: 2 }}>↑ {tc.note}</div>}
          </div>
        )
      })}

      {/* ── Detail panel ── */}
      {mod && (
        <div style={{ marginTop: 20, background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: '20px', boxShadow: '0 8px 24px rgba(26,28,28,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1A2E1A', fontFamily: "'Manrope', sans-serif" }}>{mod.name}</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: surfaceConfig[mod.surface]!.bg, color: surfaceConfig[mod.surface]!.color, fontWeight: 500 }}>{surfaceConfig[mod.surface]!.label}</span>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusConfig[mod.status]!.color }} />
              <span style={{ fontSize: 11, color: statusConfig[mod.status]!.color }}>{statusConfig[mod.status]!.label}</span>
            </div>
          </div>
          <div style={{ fontSize: 13, color: '#44483E', lineHeight: 1.65, marginBottom: 14 }}>{mod.desc}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {mod.liveUrl && <a href={mod.liveUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, padding: '4px 12px', borderRadius: 99, background: '#E8F5E9', color: '#0D631B', textDecoration: 'none', border: '0.5px solid #0D631B30' }}>↗ Live</a>}
            {mod.prdUrl  && <a href={mod.prdUrl}  target="_blank" rel="noreferrer" style={{ fontSize: 12, padding: '4px 12px', borderRadius: 99, background: '#E3F2FD', color: '#1565C0', textDecoration: 'none', border: '0.5px solid #1565C030' }}>↗ PRD</a>}
            {mod.codeUrl && <a href={mod.codeUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, padding: '4px 12px', borderRadius: 99, background: '#F3F4F6', color: '#6B7280', textDecoration: 'none', border: '0.5px solid rgba(0,0,0,0.1)' }}>↗ Code</a>}
          </div>
          {mod.deps.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Depends on</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {mod.deps.map(dep => {
                  const dm = modules[dep]
                  return <button key={dep} onClick={() => setSelected(dep)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, border: `0.5px solid ${dm ? phaseConfig[dm.phase].color + '40' : '#E5E7EB'}`, background: dm ? phaseConfig[dm.phase].bg : '#F9FAFB', color: dm ? phaseConfig[dm.phase].color : '#9CA3AF', cursor: 'pointer', fontFamily: "'Lexend', sans-serif" }}>{dm ? dm.name : dep}</button>
                })}
              </div>
            </div>
          )}
          {mod.data.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>DB tables</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {mod.data.map(d => <code key={d} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 8, background: '#F3F4F6', color: '#44483E', fontFamily: 'monospace' }}>{d}</code>)}
              </div>
            </div>
          )}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Features</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {mod.features.map((f, i) => (
                <div key={i} style={{ fontSize: 13, color: '#44483E', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ color: '#0D631B', flexShrink: 0, marginTop: 1 }}>·</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Technical approach</div>
            <div style={{ fontSize: 13, color: '#44483E', lineHeight: 1.6, fontFamily: 'monospace', background: '#F9FAF7', padding: '10px 14px', borderRadius: 10 }}>{mod.tech}</div>
          </div>
        </div>
      )}
    </div>
  )
}
