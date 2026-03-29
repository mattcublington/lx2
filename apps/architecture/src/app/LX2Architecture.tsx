'use client'
import { useState } from 'react'
import Image from 'next/image'
import BlueprintView from './BlueprintView'

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
    status: 'done', surface: 'player',
    sub: 'Hole-by-hole, group scoring, live leaderboard, share codes',
    desc: 'The core on-course interaction. One tap per hole. Stableford, Stroke Play, Match Play. Designed for one hand, bright sunlight, wet fingers. Live at /rounds/[id]/score.\n\n── USER JOURNEY ──\n1. ENTER SCORES: Each player in the group is shown as a card. Unscored cards have a green left-border accent, chevron arrow, and "Tap to enter score" hint — the border pulses 3× on first render to draw attention. Tap a card → score modal opens with quick-select buttons (par−1 through par+3) and a stepper.\n2. ADVANCE HOLES: When all players have scored the current hole, an auto-advance banner appears and moves to the next hole. Players can also navigate manually via the hole strip at the top.\n3. FINISH ROUND: When all holes are scored, (a) the round is automatically submitted server-side via markRoundComplete(), (b) an "All holes scored ✓" banner appears with a "Finish round →" button, and (c) the bottom action bar replaces Scorecard/Leaderboard buttons with a green "Finish round →" link.\n4. ROUND SUMMARY (/rounds/[id]): Shows a "Round complete — score submitted" confirmation banner, full scorecard, hole-by-hole chart, and group leaderboard. This page is the clear end-state — it does NOT look like another scoring screen.\n\n── MARKER MODE ──\nEach player has their own scorecard URL. The organiser can navigate to any player\'s scorecard and score for them — enabled by RLS policies that allow the event creator to write hole_scores for all players in their event. A yellow banner shows "Scoring for [Name]" when on a guest\'s scorecard.\n\n── SHARE CODE ──\nA 6-character alphanumeric code (no confusable chars) is generated at event creation and stored on the events row. When present, a tappable chip appears in the score entry header. Tap copies the code to clipboard — the organiser shares it with a second group who join at /play/join. Both groups are event_players on the same event, so the live leaderboard shows all players.\n\nOffline resilience: scores are written to an IndexedDB queue when offline and auto-synced on reconnect.',
    deps: ['handicap', 'course_db', 'auth', 'group_joining', 'round_summary'],
    data: ['hole_scores', 'scorecards', 'event_players', 'events'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/score-entry.md`,
    codeUrl: `${GITHUB}/apps/web/src/app/rounds/[id]/score/ScoreEntryLive.tsx`,
    features: [
      'One-tap score entry, large targets (48px+)',
      'Quick values: par−1, par, par+1, par+2, par+3 as large buttons',
      'Stepper for unusual scores (−/+ buttons + Save)',
      'Running Stableford points shown in header after first hole',
      'Pick up / NR — persisted as null gross_strokes in hole_scores',
      'Undo — removes a saved score and returns to entry state',
      'NTP / Longest Drive overlay — captures distance in yards after contest holes',
      'Full scorecard view — tap to see all holes, scores, points, sub-totals',
      'GROUP LEADERBOARD — inline panel overlay (replaces navigate-away): tap the standings bar at bottom to expand/collapse over the scorecard',
      'MARKER MODE — organiser taps any player row in leaderboard panel to switch to their scoring page',
      '"Scoring for [Name]" amber banner when on a guest\'s scorecard',
      'Supabase Realtime postgres_changes — other players\' scores update without refresh',
      'SHARE CODE CHIP — 6-char alphanumeric code shown in header, tap to copy to clipboard (✓ Copied feedback), enables group_joining flow',
      'UNSCORED CARDS — green left-border accent + chevron arrow + "Tap to enter score" hint; 3-pulse animation on first render to draw attention',
      '"All holes scored ✓" banner → /rounds/[id] (summary page) with "Finish round →" CTA; bottom bar also shows green "Finish round" button when complete',
      'Round summary page shows "Round complete — score submitted" confirmation banner; scorecard, chart, and leaderboard displayed below',
      'Offline queue — IndexedDB persistence, per-scorecard draining guard, auto-synced on reconnect',
      'RLS: players write own scores; organiser writes scores for all players in their event (via is_event_participant SECURITY DEFINER fn)',
    ],
    tech: 'page.tsx: Next.js server component (data fetch + auth). ScoreEntryLive.tsx: client component with useReducer for local state, Supabase browser client for realtime + persistence. Leaderboard panel: absolute-positioned overlay toggled by bottom bar tap — no page navigation required. Share code: generated server-side via crypto.randomBytes(6), stored as events.share_code (UNIQUE, indexed). Sage green (#3a7d44) player theme.',
  },
  ntp_ld: {
    id: 'ntp_ld', name: 'NTP / Longest Drive', phase: 'mvp', tier: 'player-pwa',
    status: 'done', surface: 'player',
    sub: 'Side contest tracking',
    desc: 'Nearest the pin and longest drive side contests. Opt-in toggles in the start-round wizard (off by default) auto-pick the best hole. Overlay fires immediately after scoring on a contest hole; player enters distance in yards. Results persisted to contest_entries via upsert — re-scoring re-triggers overlay and overwrites.',
    deps: ['event_create', 'score_entry'],
    data: ['contest_entries'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/ntp-ld.md`, codeUrl: `${GITHUB}/apps/web/src/app/rounds/%5Bid%5D/score/ScoreEntryLive.tsx`,
    features: ['Opt-in toggles in start-round wizard (off by default)', 'Auto-picks best hole: first par-3 for NTP, first par-5 for LD', 'Manual hole override in Advanced Options', 'Overlay fires immediately after scoring on contest hole', 'Distance in yards (NTP: 1dp, LD: whole number)', 'Persisted to contest_entries via upsert (yards → cm)', 'Re-scoring re-triggers overlay and overwrites previous entry', 'Winners shown on leaderboard ContestPanel'],
    tech: 'NewRoundWizard.tsx: ntpEnabled/ldEnabled state, PillBtn toggles, conditional hole grids. ScoreEntryLive.tsx: tapScore() shows overlay on contest holes, persistContest() upserts to contest_entries. contest_entries UNIQUE (event_id, hole_number, type, event_player_id).',
  },
  leaderboard_live: {
    id: 'leaderboard_live', name: 'Live leaderboard', phase: 'mvp', tier: 'player-pwa',
    status: 'done', surface: 'player',
    sub: 'Real-time, shareable, TV mode',
    desc: 'Auto-updating standings via Supabase Realtime. Shareable URL — no account needed to view public events. TV mode: fullscreen dark-theme, two-column layout (standings left, NTP/LD panels right), auto-scrolls when player count > 8. @lx2/leaderboard package extracts compute logic for reuse across web + club apps.',
    deps: ['stableford', 'strokeplay', 'matchplay', 'realtime'],
    data: ['scorecards', 'hole_scores', 'events', 'event_players'],
    liveUrl: '/events/[id]/leaderboard', prdUrl: `${GITHUB}/docs/prd/leaderboard-live.md`, codeUrl: `${GITHUB}/apps/web/src/app/events/%5Bid%5D/leaderboard`,
    features: ['Sub-second updates via Supabase Realtime', 'Format-aware: Stableford / Stroke Play', '"Through X holes" per player', 'NTP/LD results panel (player + TV)', 'TV mode: fullscreen, two-column, auto-scroll', 'Share button — copies URL to clipboard', 'No login required for public events', '@lx2/leaderboard shared compute package'],
    tech: 'Supabase Realtime postgres_changes subscription in useLeaderboard hook. computeLeaderboard() in @lx2/leaderboard package. TV route at /events/[id]/leaderboard/tv.',
  },
  event_landing: {
    id: 'event_landing', name: 'Event landing page', phase: 'mvp', tier: 'player-pwa',
    status: 'done', surface: 'player',
    sub: 'Player entry point via invite link — anonymous join',
    desc: 'The page players land on when they tap the WhatsApp invite link at /events/[id]. Shows event details (name, date, course, format), live-updating confirmed player list via RealtimeRefresher, and an anonymous join form (name + handicap). No account required. Also includes /events/[id]/score (scorecard redirect) and /events/[id]/manage (organiser dashboard).',
    deps: ['event_create', 'invite'],
    data: ['events', 'event_players'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/event-landing.md`,
    codeUrl: `${GITHUB}/apps/web/src/app/events/[id]/page.tsx`,
    features: ['Event name, date, course, format', 'Live player list via RealtimeRefresher', 'Anonymous join form — name + handicap, no account', 'join_token cookie for session continuity', 'Start scoring CTA', '/events/[id]/manage — organiser dashboard', '/events/[id]/score — scorecard redirect handler'],
    tech: 'Next.js server component + client RealtimeRefresher. Supabase join on events + event_players. joinEvent server action.',
  },
  branded_event_site: {
    id: 'branded_event_site', name: 'Branded event site', phase: 'soon', tier: 'player-pwa',
    status: 'planned', surface: 'player',
    sub: 'Sponsor logos, custom colours, shareable recap',
    desc: 'Upgrade the event landing page into a fully branded tournament microsite. Organiser uploads sponsor logos, picks accent colour, gets a shareable URL for pre-event marketing and post-event recap. Key commercial surface for corporate days and club competitions.',
    deps: ['event_landing', 'event_create'],
    data: ['events', 'brand_assets'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/branded-event-site.md`, codeUrl: null,
    features: ['Custom colour theme per event', 'Sponsor logo placement (header, leaderboard, contest holes)', 'Pre-event landing page for marketing', 'Post-event recap with results, photos, highlights', 'Shareable URL — works without login', 'PDF results export for prize-giving'],
    tech: 'Event brand_assets table. CSS custom property injection per event. Vercel edge for fast shareable URLs.',
  },

  // ── Marketing & web home ────────────────────────────────────────────────────

  marketing_home: {
    id: 'marketing_home', name: 'Marketing homepage', phase: 'mvp', tier: 'player-web',
    status: 'done', surface: 'shared',
    sub: 'Fairway Editorial — hero + 4-feature grid',
    desc: 'Public homepage at lx2.golf. Fairway Editorial design system: sage #F0F4EC background, full-bleed hero photo with gradient fade, Manrope 800 headline. Three hero CTAs: Create account → /auth/signup, Sign in → /auth/login, Join event → (inline code entry). Top-right nav shows dark frosted-glass avatar with user initial when signed in (links to /play), hidden when logged out. Feature grid: Track Your Game, Play With Friends, Compete in Events, Run Your Club.',
    deps: ['auth'],
    data: [],
    liveUrl: APP, prdUrl: `${GITHUB}/docs/prd/marketing-home.md`,
    codeUrl: `${GITHUB}/apps/web/src/app/page.tsx`,
    features: ['Full-bleed hero photo + sage gradient fade', 'Manrope 800 hero headline', 'Three CTAs: Create account, Sign in, Join event (always visible — no conditional Dashboard)', 'Join event → inline event code input (pill, auto-focus)', 'Profile avatar top-right (dark frosted-glass, user initial) when signed in → /play', 'Feature highlights grid (4 cards)', 'Lexend body, Manrope headings throughout', 'Dark footer (#111D11) with Features / Sign in / Architecture links'],
    tech: 'Next.js client component. CSS-in-JSX. hero.png served from public/. Supabase getUser() on mount to show/hide profile avatar. Manrope + Lexend via next/font.',
  },

  // ── Player — web & stats ────────────────────────────────────────────────────

  player_home: {
    id: 'player_home', name: 'Player home (/play)', phase: 'mvp', tier: 'player-web',
    status: 'done', surface: 'player',
    sub: 'Golfer entry point — Fairway Editorial dashboard',
    desc: 'The authenticated golfer home. Fairway Editorial design system: sage #F0F4EC background, white sticky header with LX2 wordmark + search/bell icons. Hero section: Manrope 800 display name + green handicap badge. Dynamic 3-column quick-stats grid (rounds, avg score, best — renders when data available). Forest-green gradient "Start a new round" CTA (or "Join ongoing round" variant). Secondary "Join a group\'s round" ghost CTA shown when no active round — links to /play/join. Editorial recent-rounds list in white container linking to /rounds/[id] (summary). Optional upcoming-event card with berry #923357 accent. Fixed 5-item bottom nav (Home, Rounds, Events, Society, Profile). Phase 2: wire roundsThisMonth, avgScore, bestScore, upcomingEvent props from page.tsx.',
    deps: ['auth', 'event_create', 'group_joining'],
    data: ['users', 'scorecards', 'events'],
    liveUrl: `${APP}/play`, prdUrl: `${GITHUB}/docs/prd/player-home.md`,
    codeUrl: `${GITHUB}/apps/web/src/app/play/PlayDashboard.tsx`,
    features: ['Fairway Editorial layout: sage bg, white sticky header with sage gradient + dot/noise texture, Manrope/Lexend fonts', 'Hero: Manrope 800 display name + green handicap badge (inline-flex, tonal gradient)', 'Always-3 stat cards (Total rounds / Avg score 12mo / Best score) — rendered with "—" placeholder when no data, never hidden', 'Primary CTA: "Start a new round" / "Join ongoing round" (green gradient / white outline variant)', 'Secondary CTA: "Join a group\'s round" ghost button — shown only when no active round, links to /play/join', 'Editorial rounds list: white rounded container, course name + date, hover tint, tap-to-navigate to /rounds/[id] summary', 'Optional upcoming event card: berry date badge, event name, course + player count', 'Bottom nav 5 items wired: Home / Rounds / Events / Society / Profile — mobile only (hidden on desktop)', 'Desktop: sign-out link in sticky header', 'Optional props: roundsThisMonth, avgScore, bestScore, upcomingEvent — fully backward-compatible'],
    tech: 'Next.js server component (page.tsx fetches handicap_index + roundsCount) + client PlayDashboard. Manrope + Lexend (Fairway Editorial fonts via CSS vars). Supabase join: scorecards → events → courses + course_combinations. Inline SVG icons — no external icon lib.',
  },
  account_settings: {
    id: 'account_settings', name: 'Account settings (/profile)', phase: 'mvp', tier: 'player-web',
    status: 'done', surface: 'player',
    sub: 'Name, handicap, avatar, distance unit',
    desc: 'Authenticated account settings page at /profile. Bottom-nav "Profile" tab destination. Inline editing of display name and handicap index (tap field to edit, save/cancel). Avatar upload to Supabase Storage with initials fallback. Distance unit preference (yards / metres) — controls yardage display throughout score entry and round summary. Distinct from player_profile (which is the future public stats page).',
    deps: ['auth'],
    data: ['users'],
    liveUrl: `${APP}/profile`, prdUrl: null,
    codeUrl: `${GITHUB}/apps/web/src/app/profile/ProfileClient.tsx`,
    features: [
      'Inline edit: display name — tap to edit, save via updateProfile server action',
      'Inline edit: handicap index — tap to edit, validated float',
      'Avatar upload: file input → Supabase Storage → users.avatar_url',
      'Initials fallback avatar (two-letter, colour from player-colours palette)',
      'Distance unit toggle: yards / metres — stored in users.distance_unit',
      'updateDistanceUnit server action — revalidates /profile',
      'updateAvatarUrl server action — revalidates /play + /profile',
      'Email shown (read-only), member since date',
    ],
    tech: 'page.tsx: Next.js server component (auth + fetch). ProfileClient.tsx: client component with useTransition for optimistic saves. updateProfile / updateAvatarUrl / updateDistanceUnit server actions in actions.ts. Supabase browser client for avatar upload.',
  },
  rounds_list: {
    id: 'rounds_list', name: 'Rounds list (/rounds)', phase: 'mvp', tier: 'player-web',
    status: 'done', surface: 'player',
    sub: 'All personal rounds — bottom nav "Rounds" tab',
    desc: 'Chronological list of all rounds the authenticated player has played, at /rounds. Bottom-nav "Rounds" tab destination. Each row shows event name, course, combination, format, and date — taps through to /rounds/[id] summary. Auth-gated; filters scorecards via event_players.user_id.',
    deps: ['auth', 'round_summary'],
    data: ['scorecards', 'events', 'event_players'],
    liveUrl: `${APP}/rounds`, prdUrl: null,
    codeUrl: `${GITHUB}/apps/web/src/app/rounds/page.tsx`,
    features: [
      'All rounds for the authenticated player, descending by created_at',
      'Each row: event name, course/combination name, format label, date',
      'Taps to /rounds/[id] full summary',
      'Empty state when no rounds yet',
      'Bottom nav + sticky header, Fairway Editorial design',
    ],
    tech: 'Pure Next.js server component. Supabase join: scorecards → event_players (user_id filter) → events → courses + course_combinations.',
  },
  events_list: {
    id: 'events_list', name: 'Events list (/events)', phase: 'mvp', tier: 'player-web',
    status: 'done', surface: 'player',
    sub: 'All played events — bottom nav "Events" tab',
    desc: 'List of all events the authenticated player participated in (rsvp_status = confirmed), at /events. Bottom-nav "Events" tab destination. Each row links to the event landing page /events/[id] (leaderboard + manage access). Shows event name, course, format, date.',
    deps: ['auth', 'event_landing', 'leaderboard_live'],
    data: ['event_players', 'events'],
    liveUrl: `${APP}/events`, prdUrl: null,
    codeUrl: `${GITHUB}/apps/web/src/app/events/page.tsx`,
    features: [
      'All events where user is a confirmed event_player',
      'Each row: event name, course/combination, format, date',
      'Taps to /events/[id] (landing → leaderboard → manage)',
      'Empty state, sticky header, Fairway Editorial design',
    ],
    tech: 'Pure Next.js server component. Supabase join: event_players (user_id + rsvp_status filter) → events → courses + course_combinations.',
  },
  society_stub: {
    id: 'society_stub', name: 'Society page (/society)', phase: 'soon', tier: 'player-web',
    status: 'building', surface: 'player',
    sub: 'Bottom nav "Society" tab — placeholder',
    desc: 'The /society route is the 4th bottom-nav tab. Currently a styled stub page with "Coming Soon" content — auth-gated, full Fairway Editorial shell (header, bottom nav), placeholder illustration. Will become the Society home: member list, private leaderboards, society history, invite flow.',
    deps: ['auth', 'player_home'],
    data: [],
    liveUrl: `${APP}/society`, prdUrl: null,
    codeUrl: `${GITHUB}/apps/web/src/app/society/page.tsx`,
    features: ['Auth-gated stub', 'Fairway Editorial shell', '"Coming soon" placeholder', 'Bottom nav wired'],
    tech: 'Next.js server component. Redirect to /auth/login if unauthenticated.',
  },
  player_profile: {
    id: 'player_profile', name: 'Player profile (public)', phase: 'soon', tier: 'player-web',
    status: 'planned', surface: 'player',
    sub: 'Shareable public stats page',
    desc: 'Shareable public profile showing round history, stats, and handicap trend. Distinct from account_settings (/profile) which is the private account page.',
    deps: ['auth', 'player_home'],
    data: ['users', 'scorecards'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/player-profile.md`, codeUrl: null,
    features: ['Win/loss record', 'Scoring average', 'Handicap trend', 'Events played'],
    tech: 'Server-rendered. Materialised views for stats at scale.',
  },
  round_summary: {
    id: 'round_summary', name: 'Round summary', phase: 'mvp', tier: 'player-web',
    status: 'done', surface: 'player',
    sub: 'Per-scorecard summary — hole chart, scorecard, group leaderboard',
    desc: 'Permanent per-player round summary page at /rounds/[id]. Accessible from the rounds list, from the "Finish round" banner in score entry, and from the player home recent-rounds list.\n\nShows: hero section with total score (Stableford points or gross), vs-par label, course, format, date. Hole-by-hole SVG line chart (score vs par, colour-coded dots). Full 18/9-hole scorecard table (front/back sections, par row, SI row, score row, points row, totals). Group leaderboard when event has 2+ players. "Continue scoring" CTA when the round is incomplete.',
    deps: ['score_entry', 'course_db', 'auth'],
    data: ['hole_scores', 'scorecards', 'event_players', 'loop_holes', 'loop_hole_tees'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/round-summary.md`,
    codeUrl: `${GITHUB}/apps/web/src/app/rounds/[id]/page.tsx`,
    features: [
      'Hero: big total score (pts or gross), vs-par label, course + format + date',
      'Hole-by-hole SVG line chart — score vs par, colour-coded dots (birdie green, par grey, bogey amber, double+ red), dashed par baseline, auto-scaled Y axis, gaps at pickups/NR',
      'Full scorecard table — front 9 / back 9 sections, hole number, par, SI, gross strokes, Stableford points, colour-coded cells',
      'Group leaderboard section when event has 2+ players (sorted by running score)',
      '"Continue scoring" CTA when round is incomplete',
      'All hole data resolved identically to score entry (combination_id for 18-hole, loop_id for 9-hole)',
      'Auth-gated: own scorecard OR event organiser',
    ],
    tech: 'Pure Next.js server component. Zero client JS on the summary itself (SVG chart generated server-side). HoleChart and ScorecardTable are server-only functions. Data fetching mirrors score/page.tsx hole resolution logic.',
  },
  group_joining: {
    id: 'group_joining', name: 'Group joining', phase: 'mvp', tier: 'player-pwa',
    status: 'done', surface: 'player',
    sub: 'Second group joins via 6-char share code',
    desc: 'Allows a second group of players to join an existing event mid-round. The organiser of the first group shares the 6-character code shown in the score entry header. The second group visits /play/join (or the "Join a group\'s round" CTA on the player dashboard), enters the code, sees a preview of the event, adds their players with names and handicaps, and gets their own scorecard URLs.\n\nOnce joined, both groups are event_players on the same event, so the live leaderboard in score entry already shows all 8 players with no additional code.',
    deps: ['score_entry', 'event_create', 'player_home'],
    data: ['events', 'event_players', 'scorecards'],
    liveUrl: `${APP}/play/join`, prdUrl: `${GITHUB}/docs/prd/group-joining.md`,
    codeUrl: `${GITHUB}/apps/web/src/app/play/join`,
    features: [
      'Share code generated at event creation — crypto.randomBytes(6), no confusable chars (0/O/1/I/L excluded)',
      'Code stored as events.share_code (UNIQUE, indexed) — DB migration 002_share_code.sql',
      'Share chip in score entry header — tap to copy, ✓ Copied feedback for 2s',
      'Two-step join wizard at /play/join: (1) code entry → lookup, (2) event preview + player rows → join',
      'lookupRound(code) server action — fetches event by share_code, returns preview (course, format, date, existing players)',
      'joinRound(eventId, roundType, players) server action — inserts event_players + scorecards, returns first player\'s scorecard URL',
      'Player rows: avatar colour, pre-filled name for current user, handicap input, add/remove',
      '"Join a group\'s round" secondary CTA on player home (shown when no active round)',
    ],
    tech: 'page.tsx: server component, auth-guards, fetches user profile. JoinRoundFlow.tsx: client component, two-step wizard. actions.ts: server actions (lookupRound, joinRound). CSS-in-JSX design system styles.',
  },
  results: {
    id: 'results', name: 'Results & history', phase: 'mvp', tier: 'player-web',
    status: 'done', surface: 'player',
    sub: 'Event results on round summary + shareable leaderboard with OG tags',
    desc: 'Event-aware round summary: when a round belongs to an event, the /rounds/[id] page shows an Event Results card with finishing position, NTP/LD contest winners (closest/longest with distances), and link to full leaderboard. Leaderboard page at /events/[id]/leaderboard has OG metadata for shareable link previews. Group section renamed to "Event Leaderboard" for event rounds.',
    deps: ['stableford', 'strokeplay', 'event_create', 'round_summary'],
    data: ['events', 'scorecards', 'contest_entries'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/results.md`, codeUrl: 'apps/web/src/app/rounds/[id]/page.tsx, apps/web/src/app/events/[id]/leaderboard/page.tsx',
    features: ['Event Results card on round summary (position, NTP/LD winners)', 'Contest winner detection (closest for NTP, longest for LD)', 'Distance display (cm/m for NTP, yards for LD)', 'Link to full event leaderboard', '"Event Leaderboard" label for event rounds', 'OG metadata on leaderboard page (title, description, siteName)'],
    tech: 'Server component. Parallel fetch of event_players + contest_entries. Contest winner computed server-side by grouping entries by (type, hole) and picking best distance. generateMetadata for OG tags on leaderboard page.',
  },
  join_a_game: {
    id: 'join_a_game', name: 'Join a game', phase: 'later', tier: 'player-web',
    status: 'planned', surface: 'player',
    sub: 'Browse and join open rounds',
    desc: 'Discovery surface for open events and rounds. Players find and join events with available slots — society days open to visitors, club competition entries, group rounds with space. Fill-rate mechanic for organisers; discovery mechanic for players.',
    deps: ['event_create', 'invite', 'payments', 'event_landing'],
    data: ['events', 'event_players'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/join-a-game.md`, codeUrl: null,
    features: ['Browse public events by date, course, format', 'Filter by format, distance, handicap range', 'Join with one tap + payment', 'Organiser controls: open / invite-only / closed', 'Fill-rate notifications to organiser', 'Club-promoted events given priority placement'],
    tech: 'Supabase PostGIS for location-based search. Event visibility enum: public / invite / private.',
  },
  tee_booking: {
    id: 'tee_booking', name: 'Tee time booking', phase: 'soon', tier: 'player-web',
    status: 'planned', surface: 'player',
    sub: 'Book at your club from lx2.golf',
    desc: 'Golfers book tee times at their club directly from lx2.golf. The bridge between the golfer app and the club console. Foundation for the multi-club booking network. Phase 2: Cumberwell only. Phase 3: any LX2-powered club.',
    deps: ['club_booking', 'booking_api', 'auth'],
    data: ['tee_slots', 'bookings'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/tee-booking.md`, codeUrl: null,
    features: ['My club tee sheet in lx2.golf', 'Loop selection for multi-loop courses', 'Real-time availability', 'Booking confirmation and calendar invite', 'Manage / cancel bookings', 'Phase 3: book at any LX2-powered club'],
    tech: 'Consumes booking_api. Member entitlement via club_members. Supabase Realtime for live availability.',
  },
  club_competition_entry: {
    id: 'club_competition_entry', name: 'Club competition entry', phase: 'soon', tier: 'player-web',
    status: 'planned', surface: 'player',
    sub: 'Browse calendar, enter, pay — from lx2.golf',
    desc: "Golfer-facing competition entry. Browse the club's competition calendar, enter upcoming events, pay the entry fee — all from lx2.golf. The companion to club_competition_calendar in the club console.",
    deps: ['club_competition_calendar', 'booking_api', 'auth', 'payments'],
    data: ['events', 'event_players'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/club-competition-entry.md`, codeUrl: null,
    features: ['Club competition calendar in lx2.golf', 'One-tap entry with handicap pre-filled', 'Entry fee payment (Stripe)', 'Entry confirmation and draw notification', 'View draw and start time', 'Score via lx2.golf on the day'],
    tech: 'Consumes club competition events via booking_api. Extends existing event entry flow.',
  },
  my_club_dashboard: {
    id: 'my_club_dashboard', name: 'My club dashboard', phase: 'soon', tier: 'player-web',
    status: 'planned', surface: 'player',
    sub: 'Upcoming bookings, entered comps, member status',
    desc: "Golfer's club home in lx2.golf. Upcoming tee time bookings, entered competitions with draw info, member subscription status, and club news. The club connection made visible.",
    deps: ['tee_booking', 'club_competition_entry', 'club_members'],
    data: ['bookings', 'events', 'club_members'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/my-club-dashboard.md`, codeUrl: null,
    features: ['Next tee time with loop and partners', 'Upcoming entered competitions', 'Membership type and renewal date', 'Recent club results', 'Club news and announcements', 'Quick links: book, enter, results'],
    tech: 'Server Component. Reads from club_members, bookings, events for the authenticated user.',
  },
  multi_club_booking: {
    id: 'multi_club_booking', name: 'Multi-club booking', phase: 'later', tier: 'player-web',
    status: 'planned', surface: 'player',
    sub: 'Browse & book at any LX2 club',
    desc: 'Browse and book tee times at any LX2-powered club from lx2.golf. The network-effects play. Each new club that adopts LX2 adds their inventory to the golfer marketplace.',
    deps: ['booking_api', 'tee_booking', 'auth'],
    data: ['clubs', 'tee_slots', 'bookings'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/multi-club-booking.md`, codeUrl: null,
    features: ['Browse clubs by location', 'Check availability without an account at that club', 'Visitor booking and payment', 'Review and ratings (Phase 4+)', 'Preferred clubs shortlist'],
    tech: 'booking_api public endpoint for visitor slot availability. Supabase PostGIS for location search.',
  },
  gps: {
    id: 'gps', name: 'GPS / rangefinder', phase: 'future', tier: 'player-web',
    status: 'planned', surface: 'player',
    sub: 'Distances on 40k+ courses',
    desc: "On-course GPS distances to front, middle, and back of green. Shot measurement and sharing. 40,000+ courses globally. Key daily-use utility that drives habitual engagement outside of events — the clearest gap between LX2 and Golf GameBook's player-side product.",
    deps: ['course_db'],
    data: ['courses', 'course_holes'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/gps.md`, codeUrl: null,
    features: ['Front / middle / back distance to green', 'Hazard distances', 'Shot measurement — tap start and end', 'Share shot distance to social feed', 'Works offline via cached course map', '40,000+ courses globally'],
    tech: 'Browser Geolocation API. Course GPS data from golfcourseapi.com. IndexedDB cache for offline use.',
  },

  // ── Organiser tools ─────────────────────────────────────────────────────────

  event_create: {
    id: 'event_create', name: 'New round wizard (/play/new)', phase: 'mvp', tier: 'organiser',
    status: 'done', surface: 'organiser',
    sub: 'Venue → combination → players → settings',
    desc: 'Four-step wizard to start a round. Step 1: pick venue (club) from a searchable list. Step 2: pick combination (18-hole loop pair) or single loop, with coloured tee swatches and WHS badge. Step 3: add players with handicap and tee. Step 4: format + settings. Creates event, event_players, and scorecard rows, then navigates to /rounds/[id]/score.',
    deps: ['course_db', 'auth'],
    data: ['events', 'event_players', 'scorecards', 'courses', 'course_combinations'],
    liveUrl: `${APP}/play/new`,
    prdUrl: `${GITHUB}/docs/prd/event-create.md`,
    codeUrl: `${GITHUB}/apps/web/src/app/play/new/NewRoundWizard.tsx`,
    features: [
      'Step 1 — Venue picker: club name, flag emoji, location, combination count. Searchable.',
      'Step 2 — Combination picker: all 14 Cumberwell loop pairs grouped, WHS badge, coloured tee swatches',
      'Tee swatches: Green=solid, White=bordered, Yellow/Purple=split gradient, Red/Black=split',
      'Step 3 — Players: up to 4 players, handicap index, search registered users by name. Organiser handicap pre-filled from profile with option to override for this round.',
      'Guest players supported: name + handicap only, no account required (user_id = null)',
      'Remove button on player rows 2–4 — tap × to drop a player before starting',
      'Course rating and slope shown as read-only info (not editable inputs) in step 2',
      'Step 4 — Format: Stableford / Stroke Play / Match Play, handicap allowance %',
      'Server action creates: 1 event row, N event_player rows, N scorecard rows',
      'Redirects organiser to /rounds/[userScorecardId]/score — other players accessed from group leaderboard',
    ],
    tech: 'Next.js client wizard (useReducer). startRound server action in actions.ts. COURSES data from lib/courses.ts. searchUsers server action for player lookup.',
  },
  invite: {
    id: 'invite', name: 'Invite & RSVP', phase: 'mvp', tier: 'organiser',
    status: 'done', surface: 'organiser',
    sub: 'Anonymous join via public URL — no account needed',
    desc: 'Players tap the WhatsApp invite link, see event details and confirmed player list, enter name and handicap index, and join instantly — no account required. A join_token cookie ties the anonymous player to their scorecard for the session. The event page uses RealtimeRefresher to show a live-updating player list as others join.',
    deps: ['event_create', 'auth'],
    data: ['event_players', 'users'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/invite.md`,
    codeUrl: `${GITHUB}/apps/web/src/app/events/[id]/page.tsx`,
    features: ['Public URL — no login needed', 'Enter name + handicap index to join', 'join_token cookie ties anonymous player to scorecard', 'RealtimeRefresher — live player list updates as others join', 'Organiser can manually add players', 'Manage page (/events/[id]/manage): organiser confirms invited players before round starts', 'Event details: name, date, course, format shown on landing'],
    tech: 'Public Next.js server component + client join form. Supabase insert into event_players. join_token cookie for anonymous session continuity. Supabase Realtime for live player list.',
  },
  payments: {
    id: 'payments', name: 'Payments', phase: 'soon', tier: 'organiser',
    status: 'planned', surface: 'organiser',
    sub: 'Stripe Checkout, live tracker',
    desc: 'Entry fee collection via Stripe. Organiser sees live payment status. Cash override available.',
    deps: ['invite', 'event_create'],
    data: ['event_players'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/payments.md`, codeUrl: null,
    features: ['Stripe Checkout in RSVP flow', 'Live payment status on dashboard', 'Manual mark-as-paid for cash', 'Payment reminder emails'],
    tech: 'Stripe Checkout via Next.js API route. Webhook updates Supabase.',
  },
  org_dashboard: {
    id: 'org_dashboard', name: 'Organiser dashboard', phase: 'mvp', tier: 'organiser',
    status: 'done', surface: 'organiser',
    sub: 'Manage page, drag-and-drop flights, finalise event, My Events on Play dashboard',
    desc: 'Full organiser event management. /events/[id]/manage shows event details, player list with confirm action, drag-and-drop flight management (HTML5 DnD between group cards), tee time and start hole per group, finalise/reopen event toggle, share/invite link with WhatsApp. Play dashboard shows "My Events" section listing events the user has organised with status badges (upcoming/in progress/finalised) linking to manage page.',
    deps: ['event_create', 'invite', 'score_entry'],
    data: ['events', 'event_players', 'event_groups', 'scorecards'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/org-dashboard.md`,
    codeUrl: `${GITHUB}/apps/web/src/app/events/%5Bid%5D/manage`,
    features: [
      'Player list with RSVP status + confirm action at /events/[id]/manage',
      'Drag-and-drop flight management (HTML5 DnD between group cards)',
      'Auto-generate groups based on group size, re-generate anytime',
      'Tee time and start hole per group',
      'Finalise event (locks scores) / reopen event',
      'Share invite link + WhatsApp share',
      'My Events section on Play dashboard with status badges',
    ],
    tech: 'Next.js server component (manage/page.tsx) + GroupManager (DnD client component) + ManageActions (share/finalise). Server actions: generateGroups, updateGroup, assignPlayerToGroup, finaliseEvent, unfinaliseEvent, confirmPlayer. Admin client for organiser-scoped writes.',
  },

  // ── Scoring engines ─────────────────────────────────────────────────────────

  stableford: {
    id: 'stableford', name: 'Stableford engine', phase: 'mvp', tier: 'scoring',
    status: 'done', surface: 'shared',
    sub: 'Points from net score vs par',
    desc: 'Pure TypeScript. Input strokes, output points. No database dependency. Fully tested.',
    deps: ['handicap'], data: [],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/stableford.md`,
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
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/strokeplay.md`,
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
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/matchplay.md`,
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
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/handicap.md`,
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
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/skins.md`, codeUrl: null,
    features: ['Hole-by-hole skins with carry-over', 'Configurable skin value', 'Works alongside main format'],
    tech: '@lx2/scoring extension.',
  },
  rvb: {
    id: 'rvb', name: 'Reds vs Blues', phase: 'soon', tier: 'scoring',
    status: 'planned', surface: 'shared',
    sub: 'Ryder Cup team format',
    desc: 'Two teams, multiple concurrent match play pairings. Aggregate team score. Up to 72 players.',
    deps: ['matchplay', 'handicap'], data: ['events', 'event_players'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/rvb.md`, codeUrl: null,
    features: ['Two teams, configurable names/colours', 'Multiple concurrent pairings', 'Aggregate team score', 'Projected result', 'Up to 72 players', 'Dramatic reveal mode'],
    tech: 'Extends Match Play engine.',
  },
  scramble: {
    id: 'scramble', name: 'Scramble engine', phase: 'soon', tier: 'scoring',
    status: 'planned', surface: 'shared',
    sub: 'Team scramble format',
    desc: 'One of the most common corporate and charity event formats. All players hit, best shot selected, all play from there. Supports 2-, 3-, and 4-person scrambles with net scoring.',
    deps: ['handicap'], data: [],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/scramble.md`, codeUrl: null,
    features: ['2, 3, and 4-player scramble', 'Best shot selection per hole', 'Net scramble via composite team handicap', 'Stroke play and Stableford variants', 'Works with any number of teams'],
    tech: '@lx2/scoring — team HC = 20% low + 15% 2nd + 10% 3rd + 5% 4th.',
  },
  better_ball: {
    id: 'better_ball', name: 'Better ball stableford', phase: 'soon', tier: 'scoring',
    status: 'planned', surface: 'shared',
    sub: 'Pair points — best score counts',
    desc: 'Pair format where the best Stableford score counts per hole. One of the most common society and club competition formats — essential for away days and charity events.',
    deps: ['stableford', 'handicap'], data: [],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/better-ball.md`, codeUrl: null,
    features: ['Pair-level best Stableford score per hole', 'Individual scores visible within pair', 'Net scoring via handicap allocation', 'Stroke play variant (best ball gross/net)', 'Countback at pair level'],
    tech: '@lx2/scoring — composes Stableford engine with pair reduction.',
  },

  // ── Course & handicap data ──────────────────────────────────────────────────

  course_db: {
    id: 'course_db', name: 'Course database', phase: 'mvp', tier: 'course',
    status: 'done', surface: 'shared',
    sub: 'Cumberwell (6 loops, 14 combos) + Royal Canberra — scalable JSON system',
    desc: 'Two courses fully seeded. Scalable management via packages/course-data JSON source files.\n\nCumberwell Park: 6 loops (Red, Yellow, Blue, Orange, White, Par 3), 14 named 18-hole combinations, per-hole par + SI, yardages for Yellow/Purple tees. Schema: loops → loop_holes → loop_hole_tees. Combinations: course_combinations links two loop IDs. Fixed loop UUIDs for idempotent seeds.\n\nRoyal Canberra GC (Westbourne, A+B): 18-hole course seeded into the generic courses/course_holes/course_tees tables. Yardages in yards (converted from metres source). Purple/Red tee CR/slope ratings. Metres column added to course_tees for dual-unit display.\n\ncourse-data package: JSON source of truth (cumberwell-park.json, royal-canberra.json) with schema.ts type contract. Generate script produces SQL migrations from JSON — new courses added by editing JSON only. Admin UI for course management in architect app. Continent filter in venue picker.\n\nDistance unit: users.distance_unit (yards/metres) — controlled from /profile, read throughout score entry + round summary.',
    deps: [], data: ['courses', 'loops', 'loop_holes', 'loop_hole_tees', 'course_combinations', 'course_holes', 'course_tees'],
    liveUrl: null,
    prdUrl: `${GITHUB}/docs/prd/course-db.md`,
    codeUrl: `${GITHUB}/packages/course-data`,
    features: [
      'Cumberwell: 6 loops, 14 18-hole combinations, Yellow/Purple tees',
      'Royal Canberra GC: Westbourne A+B, Purple + Red tees, CR/slope seeded',
      'packages/course-data: JSON source (cumberwell-park.json, royal-canberra.json) + schema.ts',
      'Generate script: JSON → SQL migration — new courses require only JSON edit',
      'courses/course_holes/course_tees: generic schema for non-Cumberwell courses',
      'course_tees.metres column for dual-unit yardage storage',
      'users.distance_unit (yards/metres) — set in /profile, used everywhere',
      'Continent filter in venue picker (groups courses by region)',
      'Fixed loop UUIDs — idempotent re-seeding, stable across environments',
      '30k UK courses from golfcourseapi.com — Phase 2',
    ],
    tech: 'packages/course-data/schema.ts types, *.json sources. packages/db/migrations/golfer/003_golfer_seed_cumberwell_loops.sql + 005_course_seed_royal_canberra.sql. apps/web/src/lib/courses.ts: client-side tee UI reference.',
  },
  whs: {
    id: 'whs', name: 'WHS integration', phase: 'later', tier: 'course',
    status: 'planned', surface: 'shared',
    sub: 'Live handicap lookup',
    desc: 'WHS handicap via England Golf / DotGolf API. Requires ISV licence.',
    deps: ['handicap', 'auth'], data: ['users'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/whs.md`, codeUrl: null,
    features: ['Lookup by CDH number', 'Auto-populate handicap', 'Submit qualifying rounds', 'ISV licence from England Golf required'],
    tech: 'DotGolf API. Manual entry as fallback throughout.',
  },

  // ── Platform infrastructure ─────────────────────────────────────────────────

  auth: {
    id: 'auth', name: 'Authentication', phase: 'mvp', tier: 'infra',
    status: 'done', surface: 'shared',
    sub: 'Google OAuth + email/password',
    desc: 'Organisers sign up via Google OAuth or email/password. Players joining events need no account. Auth flow is two separate pages: /auth/login (sign-in card — three-part header, sage background, white card) and /auth/signup (create account — full-page layout, back arrow, password strength indicator, full_name passed to auth metadata). Auth callback uses createAdminClient (service-role key) for user upsert to bypass RLS. Row-level security on all Supabase tables with is_event_participant() SECURITY DEFINER function to prevent infinite recursion.',
    deps: [], data: ['users'],
    liveUrl: `${APP}/auth/login`, prdUrl: `${GITHUB}/docs/prd/auth.md`,
    codeUrl: `${GITHUB}/apps/web/src/app/auth`,
    features: ['Google OAuth (primary — one tap)', 'Email + password sign in — /auth/login', 'Create account — /auth/signup (full name, email, password strength, confirm)', 'Password strength indicator (weak/medium/strong) with animated bar', 'Magic link as fallback', 'Anonymous play for event participants', 'Row-level security on all tables', 'is_event_participant() SECURITY DEFINER function — prevents infinite RLS recursion', 'Auth callback user upsert via createAdminClient (service-role key)', 'Supabase session via SSR cookies', 'Fairway Editorial design: sage #F0F4EC, Manrope/Lexend, berry accents, forest CTA'],
    tech: 'Supabase Auth. @supabase/ssr for server-side session. Google Cloud OAuth 2.0 client. createAdminClient in auth callback for user upsert.',
  },
  realtime: {
    id: 'realtime', name: 'Realtime layer', phase: 'mvp', tier: 'infra',
    status: 'done', surface: 'shared',
    sub: 'Supabase postgres_changes — live group leaderboard',
    desc: 'Live score updates pushed to all players in a group the moment any hole is saved. Implemented as a single postgres_changes subscription in ScoreEntryLive, filtered to the set of scorecard IDs in the current event. On INSERT/UPDATE the relevant player\'s liveScores state is updated and the leaderboard re-renders. DELETE removes the hole entry from liveScores.',
    deps: ['auth', 'score_entry'], data: ['hole_scores'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/realtime.md`,
    codeUrl: `${GITHUB}/apps/web/src/app/events/[id]/RealtimeRefresher.tsx`,
    features: [
      'Supabase Realtime postgres_changes on hole_scores table',
      'Single channel subscription per scoring session',
      'Client-side scorecard ID filter (no spurious updates from other events)',
      'Handles INSERT, UPDATE, DELETE events',
      'Current user scores use local reducer state (no latency) — realtime only updates others',
      'liveScores state initialised from server-fetched hole_scores at page load',
      'Channel cleanup on component unmount',
    ],
    tech: 'Supabase postgres_changes. hole_scores + scorecards enabled in supabase_realtime publication (golfer/001_golfer_schema.sql).',
  },
  brand_system: {
    id: 'brand_system', name: 'Brand system', phase: 'mvp', tier: 'infra',
    status: 'done', surface: 'shared',
    sub: 'Fairway Editorial design tokens',
    desc: 'Single source of truth for all brand values. Three surface themes. Club white-label support.',
    deps: [], data: [],
    liveUrl: null,
    prdUrl: `${GITHUB}/docs/prd/brand-system.md`,
    codeUrl: `${GITHUB}/docs/brand/style-guide.md`,
    features: ['Player, organiser, club themes', 'getCSSVars() for CSS custom properties', 'applyClubTheme() for white-labelling', 'Tailwind config export', 'Manrope (display) + Lexend (body)'],
    tech: '@lx2/brand package. TypeScript. No runtime dependencies.',
  },
  pwa: {
    id: 'pwa', name: 'PWA / offline', phase: 'soon', tier: 'infra',
    status: 'building', surface: 'player',
    sub: 'Service worker, offline scoring, add to home screen',
    desc: 'Service worker with cache-first (static assets) and network-first (API) strategies. Scores written to IndexedDB offline queue with per-scorecard draining guard, auto-synced on reconnect. PWA manifest and meta tags in place. OfflineBanner component shows connectivity and sync state.',
    deps: ['score_entry', 'auth'], data: [],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/pwa.md`,
    codeUrl: `${GITHUB}/apps/web/src/lib/offline-queue.ts`,
    features: ['IndexedDB offline queue with per-scorecard draining guard', 'Service worker: cache-first for static, network-first for API', 'OfflineBanner — shows offline/syncing state to player', 'ServiceWorkerRegistration client component', 'PWA manifest with icons', 'PWA meta tags in layout', 'Works on iOS Safari + Android Chrome'],
    tech: 'Custom service worker (public/sw.js). IndexedDB via idb-style wrapper (lib/offline-queue.ts). Vitest tested (offline-queue.test.ts).',
  },

  // ── Club console — Phase 1 (club.lx2.golf) ──────────────────────────────────
  // Replacing intelligentgolf + golfbook.255it.com at Cumberwell Park

  club_app_scaffold: {
    id: 'club_app_scaffold', name: 'Club app scaffold', phase: 'soon', tier: 'club',
    status: 'building', surface: 'club',
    sub: 'apps/club — runs locally on port 3001',
    desc: 'apps/club exists in the monorepo with a working dark sidebar console shell, auth protection, and nav links to Dashboard, Tee Sheet, Members, Competitions, Sheet Config. Dashboard is a stub. Runs locally — not yet deployed to Vercel. Deployment to club.lx2.golf is the next step.',
    deps: ['auth'],
    data: ['clubs'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/club-app-scaffold.md`,
    codeUrl: `${GITHUB}/apps/club/src/app`,
    features: ['Dark sidebar layout (#1E293B) with Cumberwell Park header', 'Auth protection via Supabase SSR', 'Nav: Dashboard, Tee Sheet, Members, Competitions, Sheet Config', 'Signed-in user email in sidebar footer', 'Turborepo workspace with shared @lx2/db, @lx2/ui', 'ESLint flat config in place, CI passing'],
    tech: 'Next.js App Router. Port 3001 locally. Turborepo @lx2/club workspace.',
  },
  club_auth: {
    id: 'club_auth', name: 'Club auth & roles', phase: 'soon', tier: 'club',
    status: 'planned', surface: 'club',
    sub: 'Admin, secretary, staff — multi-role',
    desc: 'Multi-role auth for club staff. A user can be club admin, competition secretary, bar staff, or pro shop staff — each with different RLS policies. Separate from the golfer auth on lx2.golf.',
    deps: ['auth'],
    data: ['club_user_roles'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/club-auth.md`, codeUrl: null,
    features: ['Roles: admin, competition_secretary, bar_staff, pro_shop', 'club_user_roles junction table', 'Supabase RLS per role', 'Invite staff by email', 'Role management UI for club admin', 'Audit log for sensitive actions'],
    tech: 'Supabase Auth + club_user_roles table. RLS policies per role. clubs table with slug-based routing.',
  },
  club_members: {
    id: 'club_members', name: 'Member roster', phase: 'soon', tier: 'club',
    status: 'planned', surface: 'club',
    sub: 'Import from intelligentgolf, link to lx2.golf',
    desc: 'Full member record management. Import from intelligentgolf CSV export. Each member linked to their lx2.golf golfer profile via email match — one identity, two views.',
    deps: ['club_auth'],
    data: ['club_members', 'users'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/club-members.md`, codeUrl: null,
    features: ['CSV import from intelligentgolf (Papa Parse)', 'Member categories: full, senior, 5-day, junior, social', 'CDH number storage (WHS Phase 4)', 'Link to lx2.golf profile via email match', 'Status: active / suspended / lapsed', 'Sanctions: block tee sheet bookings for bad debt', 'Contact directory', 'Handicap index (manual until WHS)'],
    tech: 'club_members table. user_id nullable until linked. Supabase RLS — admins see all, members see own record.',
  },
  club_teesheet_config: {
    id: 'club_teesheet_config', name: 'Tee sheet config', phase: 'soon', tier: 'club',
    status: 'planned', surface: 'club',
    sub: 'Rules: intervals, capacity, windows',
    desc: 'Configuration layer that defines tee sheet rules per loop. Slot interval, capacity, open/close times, member-only windows. Generates daily tee_slots rows. Prerequisite for the live tee sheet.',
    deps: ['club_auth', 'course_db'],
    data: ['tee_sheet_rules', 'tee_slots'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/club-teesheet-config.md`, codeUrl: null,
    features: ['Per-loop rules: interval (e.g. 10 min), capacity per slot (e.g. 4)', 'Open/close times per loop per day-of-week', 'Member-only windows (e.g. before 09:00 weekends)', 'Seasonal rules (valid_from / valid_to)', 'Daily slot generation (Supabase scheduled function)', 'Block dates: course maintenance, competitions'],
    tech: 'tee_sheet_rules table. Supabase pg_cron or Vercel Cron generating tee_slots rows 7 days ahead.',
  },
  club_teesheet: {
    id: 'club_teesheet', name: 'Tee sheet', phase: 'soon', tier: 'club',
    status: 'planned', surface: 'club',
    sub: 'All 5 Cumberwell loops — replaces golfbook.255it.com',
    desc: 'Staff-facing tee sheet grid. View all 5 loops, move bookings, override slots, manage no-shows. Replaces golfbook.255it.com as Cumberwell\'s daily operations tool.',
    deps: ['club_teesheet_config', 'club_members'],
    data: ['tee_slots', 'bookings'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/club-teesheet.md`, codeUrl: null,
    features: ['Daily grid view per loop — 10-minute intervals', 'Drag-and-drop booking management', 'Manual slot override and blocking', 'Check-in / no-show marking', 'Society block booking', 'Supabase Realtime — live slot availability', 'Print-ready start sheet PDF'],
    tech: 'tee_slots and bookings tables. Supabase Realtime subscriptions. Staff UI at club.lx2.golf/teesheet.',
  },
  club_booking: {
    id: 'club_booking', name: 'Online booking', phase: 'soon', tier: 'club',
    status: 'planned', surface: 'club',
    sub: 'Self-service for members — golfer app in Phase 2',
    desc: 'Self-service tee time booking for members and visitors. Phase 1: accessible via club.lx2.golf. Phase 2: integrated into lx2.golf so members book from the golfer app. Loop selection, member pricing, real-time availability.',
    deps: ['club_teesheet_config', 'club_members', 'payments'],
    data: ['tee_slots', 'bookings'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/club-booking.md`, codeUrl: null,
    features: ['Loop selection for Cumberwell 5-loop layout', 'Real-time slot availability', 'Member booking window (e.g. 72hr advance)', 'Visitor booking with payment', 'Booking confirmation email + calendar invite', 'Self-service cancellation', 'Waiting list on full slots'],
    tech: 'Supabase Realtime for availability. Stripe Checkout for visitor payments (Stripe Connect for club payout). booking_api layer shared with lx2.golf Phase 2.',
  },
  club_competition_calendar: {
    id: 'club_competition_calendar', name: 'Competition calendar', phase: 'soon', tier: 'club',
    status: 'planned', surface: 'club',
    sub: 'Full season schedule, entries, draws',
    desc: 'Full club competition calendar. Admin creates competitions, manages entries and draws, generates start sheets. Uses existing LX2 scoring engine. Golfer-facing entry arrives in Phase 2 via lx2.golf.',
    deps: ['club_auth', 'club_members', 'stableford', 'strokeplay', 'event_create'],
    data: ['events', 'event_players', 'scorecards'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/club-competition-calendar.md`, codeUrl: null,
    features: ['Full-season calendar: medals, championships, opens, charity days', 'Entry list and draw management', 'Starting sheet PDF generation', 'Real-time scoring via existing LX2 engine', 'Live leaderboard during competition', 'Historical results archive', 'WHS submission (Phase 4 — ISV licence required)'],
    tech: 'Extends event_create and scoring modules. Admin UI at club.lx2.golf/competitions. WHS via DotGolf API (Phase 4).',
  },
  club_admin_dashboard: {
    id: 'club_admin_dashboard', name: 'Club admin dashboard', phase: 'soon', tier: 'club',
    status: 'planned', surface: 'club',
    sub: 'Today\'s sheet, live comp status, payments',
    desc: 'Command centre for club admin and competition secretary. Today\'s tee sheet at a glance, live competition status, payment totals, outstanding entries. Replaces manual committee spreadsheets.',
    deps: ['club_teesheet', 'club_competition_calendar', 'club_members', 'payments'],
    data: ['clubs', 'club_members', 'tee_slots', 'bookings', 'events'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/club-admin-dashboard.md`, codeUrl: null,
    features: ['Today\'s tee sheet summary per loop', 'Live competition status if event in progress', 'Membership numbers by category', 'Revenue from bookings and visitor fees', 'Outstanding entry fees and unpaid members', 'Export to CSV for committee meetings'],
    tech: 'Supabase views and aggregation queries. Recharts for revenue charts. PDF export for committee packs.',
  },

  // ── Club console — Phase 2 (Operations) ─────────────────────────────────────

  club_membership_billing: {
    id: 'club_membership_billing', name: 'Membership billing', phase: 'later', tier: 'club',
    status: 'planned', surface: 'club',
    sub: 'Subscriptions, direct debit, renewals',
    desc: 'Membership subscription management. Handles annual and monthly billing cycles, direct debit collection, renewal reminders, and lapsed member workflows.',
    deps: ['club_members', 'payments'],
    data: ['club_members', 'payments'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/club-membership-billing.md`, codeUrl: null,
    features: ['Subscription types: annual / monthly', 'Direct debit collection (GoCardless or Stripe)', 'Renewal reminders 30/14/7 days before expiry', 'Lapsed member auto-status update', 'Payment history per member', 'Bulk renewal processing'],
    tech: 'Stripe Billing or GoCardless for direct debit. Supabase cron for renewal reminders.',
  },
  club_pricing: {
    id: 'club_pricing', name: 'Pricing rules', phase: 'later', tier: 'club',
    status: 'planned', surface: 'club',
    sub: 'Member / visitor / society / time-of-day',
    desc: 'Flexible pricing engine for tee times and facilities. Member categories, visitor green fees, society day rates, time-of-day pricing, seasonal overrides.',
    deps: ['club_booking', 'club_members'],
    data: ['tee_sheet_rules'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/club-pricing.md`, codeUrl: null,
    features: ['Member / visitor / junior / society pricing per loop', 'Time-of-day pricing (twilight, weekend premium)', 'Seasonal rates', 'Society day bundle pricing', 'Manual override per booking', 'Price list export'],
    tech: 'Pricing rules table extending tee_sheet_rules. Applied at booking creation.',
  },
  club_communications: {
    id: 'club_communications', name: 'Member communications', phase: 'later', tier: 'club',
    status: 'planned', surface: 'club',
    sub: 'Email / SMS by segment',
    desc: 'Outbound communications to member segments. Competition results, upcoming events, renewal reminders, club news. Replaces manual email lists.',
    deps: ['club_members'],
    data: ['club_members'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/club-communications.md`, codeUrl: null,
    features: ['Segment by membership type, status, age', 'Competition result auto-send after finalise', 'Upcoming events digest (weekly)', 'Custom email composer with club branding', 'SMS for day-of-play reminders', 'Unsubscribe and opt-out compliance'],
    tech: 'Resend for transactional email. React Email templates. Twilio for SMS.',
  },
  club_vouchers: {
    id: 'club_vouchers', name: 'Vouchers & promotions', phase: 'later', tier: 'club',
    status: 'planned', surface: 'club',
    sub: 'Gift vouchers, discount codes, loyalty',
    desc: 'Gift vouchers for green fees, pro shop, and lessons. Promotional discount codes for visitor acquisition. Loyalty rewards for frequent players.',
    deps: ['club_booking', 'payments'],
    data: ['vouchers'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/club-vouchers.md`, codeUrl: null,
    features: ['Gift voucher generation and redemption', 'Discount codes (percentage or fixed)', 'Expiry and usage limits', 'Loyalty: e.g. 10th round free', 'Voucher balance tracking', 'Bulk voucher creation for corporate gifting'],
    tech: 'vouchers table. Applied at Stripe Checkout. QR code on PDF voucher.',
  },
  club_reporting: {
    id: 'club_reporting', name: 'Club reporting', phase: 'later', tier: 'club',
    status: 'planned', surface: 'club',
    sub: 'Revenue, rounds, retention — Xero export',
    desc: 'Financial and operational reports for committee meetings. Revenue by category, rounds played, membership retention, competition participation. Xero integration for accounting.',
    deps: ['club_admin_dashboard', 'club_membership_billing'],
    data: ['clubs', 'bookings', 'events', 'club_members'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/club-reporting.md`, codeUrl: null,
    features: ['Monthly revenue by category (greens, visitors, bar, pro shop)', 'Rounds played YoY comparison', 'Membership retention and churn', 'Competition entry rates', 'Xero sync for accounting', 'CSV / PDF export for committee packs'],
    tech: 'Supabase materialised views. Recharts. Xero API for accounting sync.',
  },
  club_waitlist: {
    id: 'club_waitlist', name: 'Waitlist', phase: 'later', tier: 'club',
    status: 'planned', surface: 'club',
    sub: 'Auto-notify on cancellation',
    desc: 'Automatic waitlist for full tee slots and competitions. Notify the next player on the list when a cancellation occurs. Reduce wasted slots and improve member experience.',
    deps: ['club_booking', 'club_competition_calendar'],
    data: ['waitlist', 'tee_slots', 'events'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/club-waitlist.md`, codeUrl: null,
    features: ['Join waitlist when slot full', 'Auto-notify on cancellation (email + SMS)', 'Time window to accept (e.g. 2 hours)', 'Priority ordering (member category)', 'Admin override'],
    tech: 'waitlist table. Supabase trigger on cancellation. Email via Resend, SMS via Twilio.',
  },
  club_proshop_epos: {
    id: 'club_proshop_epos', name: 'Pro shop EPOS', phase: 'later', tier: 'club',
    status: 'planned', surface: 'club',
    sub: 'Callaway, Ping, TaylorMade, Titleist',
    desc: 'Point-of-sale for the pro shop. Stock management for Callaway, Ping, TaylorMade, Titleist inventory. Transactions linked to member accounts.',
    deps: ['club_members', 'payments'],
    data: ['stock', 'transactions'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/club-proshop-epos.md`, codeUrl: null,
    features: ['Product catalogue with barcodes', 'Stock levels and reorder alerts', 'Transaction linked to member account', 'Staff till interface (tablet-optimised)', 'End-of-day reconciliation', 'Supplier purchase order management'],
    tech: 'stock and transactions tables. Stripe Terminal for card payments. Tablet UI.',
  },
  club_bar_epos: {
    id: 'club_bar_epos', name: 'Bar & café EPOS', phase: 'later', tier: 'club',
    status: 'planned', surface: 'club',
    sub: 'Wraxall Bar & Cafe — tab management',
    desc: 'Point-of-sale for Wraxall Bar & Cafe. Tab management, member account charging, end-of-day reconciliation.',
    deps: ['club_members', 'payments'],
    data: ['transactions', 'tabs'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/club-bar-epos.md`, codeUrl: null,
    features: ['Table and tab management', 'Member account charging (add to tab, pay at end)', 'Menu management', 'Staff till interface', 'End-of-day cash reconciliation', 'Happy hour / promotion pricing'],
    tech: 'tabs and transactions tables. Stripe Terminal. Tablet UI for bar staff.',
  },

  // ── Club console — Phase 3 (Facilities) ─────────────────────────────────────

  lesson_booking: {
    id: 'lesson_booking', name: 'Lesson booking', phase: 'later', tier: 'club',
    status: 'planned', surface: 'club',
    sub: 'PGA pro scheduling and payment',
    desc: 'Lesson booking system for PGA professionals at Cumberwell. Members and visitors book lesson slots, choose pro, pay online. Lesson history and player development tracking.',
    deps: ['club_auth', 'payments', 'club_members'],
    data: ['lessons', 'bookings'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/lesson-booking.md`, codeUrl: null,
    features: ['Pro availability calendar', 'Lesson type: individual, group, playing lesson', 'Online booking and payment', 'Lesson packages (buy 5 get 1 free)', 'Lesson history per member', 'Cancellation and rescheduling'],
    tech: 'lessons table. Stripe Checkout. Calendar UI shared with tee sheet.',
  },
  simulator_booking: {
    id: 'simulator_booking', name: 'Simulator bays', phase: 'later', tier: 'club',
    status: 'planned', surface: 'club',
    sub: 'Hourly booking, member discounts',
    desc: 'Booking system for Cumberwell\'s indoor golf simulators. Hourly sessions, member discounts, winter packages.',
    deps: ['club_auth', 'payments', 'club_members'],
    data: ['tee_slots', 'bookings'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/simulator-booking.md`, codeUrl: null,
    features: ['Hourly session booking', 'Member / visitor pricing', 'Winter package bundles', 'Group booking (up to bay capacity)', 'Online payment', 'Cancellation policy'],
    tech: 'Reuses tee_slots / bookings model. Simulator bays as a separate inventory type.',
  },
  driving_range: {
    id: 'driving_range', name: 'Driving range', phase: 'later', tier: 'club',
    status: 'planned', surface: 'club',
    sub: '20 bays — covered + outside',
    desc: 'Management for Cumberwell\'s 20-bay driving range (10 covered + 10 outside). Ball token system, bay booking, usage tracking.',
    deps: ['club_auth', 'payments'],
    data: ['transactions'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/driving-range.md`, codeUrl: null,
    features: ['Ball token purchase (online + till)', 'Bay booking for peak times', 'Usage analytics (busiest times, revenue)', 'Member discount on tokens', 'Practice area short game zone'],
    tech: 'Token purchase via Stripe. Simple bay availability grid.',
  },
  society_packages: {
    id: 'society_packages', name: 'Society packages', phase: 'later', tier: 'club',
    status: 'planned', surface: 'club',
    sub: 'Day builder, quote generator, up to 150',
    desc: 'Society day package builder for groups up to 150. Organiser selects format, catering, prizes. System generates a quote and booking form. Replaces manual back-and-forth with enquiries@cumberwellpark.com.',
    deps: ['club_booking', 'club_competition_calendar', 'payments'],
    data: ['events', 'bookings'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/society-packages.md`, codeUrl: null,
    features: ['Package builder: golf + catering + prizes', 'Instant online quote', 'Online deposit payment', 'Full LX2 scoring for the society day', 'Organiser dashboard (lx2.golf)', 'Post-event results and recap page'],
    tech: 'Extends event_create. Society-specific pricing rules. Quote PDF generation.',
  },
  function_rooms: {
    id: 'function_rooms', name: 'Function rooms', phase: 'later', tier: 'club',
    status: 'planned', surface: 'club',
    sub: '4 rooms, up to 150 people, corporate',
    desc: 'Booking system for Cumberwell\'s 4 function rooms. Corporate events, meetings, team building days, weddings, Christmas parties. Delegate packages and catering coordination.',
    deps: ['club_auth', 'payments'],
    data: ['function_bookings'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/function-rooms.md`, codeUrl: null,
    features: ['Room availability calendar', 'Delegate package builder', 'Catering options: fork buffet, BBQ, afternoon tea, fine dining', 'Online enquiry form with instant quote', 'Deposit and balance payments', 'AV and layout configuration'],
    tech: 'function_bookings table. Separate from tee_slots. Enquiry flow with manual confirmation.',
  },

  // ── Club console — Phase 4 (Full OS) ────────────────────────────────────────

  fb_management: {
    id: 'fb_management', name: 'F&B management', phase: 'future', tier: 'club',
    status: 'planned', surface: 'club',
    sub: 'Wraxall kitchen workflows, table booking',
    desc: 'Full F&B operational layer. Kitchen order management, Wraxall Bar table booking, Sunday lunch capacity, Christmas package management.',
    deps: ['club_bar_epos'],
    data: ['tables', 'orders', 'reservations'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/fb-management.md`, codeUrl: null,
    features: ['Table booking (Wraxall Bar)', 'Sunday lunch capacity (homemade menu)', 'Kitchen order flow', 'Christmas package booking and catering coordination', 'Recipe / menu management', 'Dietary requirements tracking'],
    tech: 'tables, orders, reservations tables. Kitchen display system (tablet).',
  },
  stock_management: {
    id: 'stock_management', name: 'Stock management', phase: 'future', tier: 'club',
    status: 'planned', surface: 'club',
    sub: 'Pro shop inventory and suppliers',
    desc: 'Full pro shop inventory management. Stock levels, reorder alerts, supplier purchase orders, shrinkage tracking. Extends the EPOS module.',
    deps: ['club_proshop_epos'],
    data: ['stock', 'suppliers', 'purchase_orders'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/stock-management.md`, codeUrl: null,
    features: ['Full stock catalogue with SKUs', 'Reorder alerts and minimum stock levels', 'Supplier management and purchase orders', 'Shrinkage and write-off tracking', 'Stock take workflow', 'Integration with pro shop EPOS'],
    tech: 'Extends stock table. Purchase order workflow.',
  },
  multi_club_resort: {
    id: 'multi_club_resort', name: 'Multi-club / resort', phase: 'future', tier: 'club',
    status: 'planned', surface: 'club',
    sub: 'Single admin for multiple venues',
    desc: 'Single admin login for groups managing multiple clubs or resort properties. Shared member accounts, cross-venue reporting, and unified billing.',
    deps: ['club_auth', 'club_admin_dashboard'],
    data: ['clubs'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/multi-club-resort.md`, codeUrl: null,
    features: ['Single login across multiple venues', 'Cross-venue member accounts', 'Consolidated revenue reporting', 'Venue-level and group-level admin roles', 'Shared member pricing across venues'],
    tech: 'clubs table supports multi-tenancy. club_user_roles with venue scope.',
  },

  // ── Partner API & integrations (Phase 3) ────────────────────────────────────

  booking_api: {
    id: 'booking_api', name: 'Booking API', phase: 'soon', tier: 'api',
    status: 'planned', surface: 'api',
    sub: 'Club publishes availability → lx2.golf books',
    desc: 'The internal API layer that connects club.lx2.golf and lx2.golf. Club tee sheet publishes slot availability; lx2.golf golfer app consumes it to show availability and create bookings. Foundation for the multi-club booking network.',
    deps: ['club_teesheet_config', 'club_booking'],
    data: ['tee_slots', 'bookings'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/booking-api.md`, codeUrl: null,
    features: ['GET /availability — real-time slot availability per club/loop/date', 'POST /bookings — create booking (member or visitor)', 'DELETE /bookings/:id — cancellation', 'Webhook: booking_confirmed, booking_cancelled', 'Auth: member JWT or visitor session', 'Rate limiting per club'],
    tech: 'Next.js Route Handlers in apps/club. Supabase RLS enforces club data isolation. Consumed by apps/web tee_booking module.',
  },
  partner_api: {
    id: 'partner_api', name: 'Partner API', phase: 'later', tier: 'api',
    status: 'planned', surface: 'api',
    sub: 'Multi-tenant REST API with API keys',
    desc: 'Documented gap vs Golfmanager (competitor analysis, March 2026). Golfmanager\'s primary moat is its integrator-facing API: explicit multi-tenancy (tenant + key headers), consumer vs admin API surfaces, and webhooks. LX2 needs a comparable surface for club system integrations, OTA booking, and future partner channels. Design the data model now — build in P3.',
    deps: ['auth', 'club_teesheet', 'club_members'],
    data: ['api_keys', 'webhooks'],
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/partner-api.md`, codeUrl: null,
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
    liveUrl: null, prdUrl: `${GITHUB}/docs/prd/api-docs.md`, codeUrl: null,
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
    // Player receives a WhatsApp invite link, joins anonymously, scores, reviews
    id: 'player', label: 'Player — join via invite link', height: 510,
    steps: [
      { id: 'landing', label: 'Event landing page',      sub: '/events/[id] · via WhatsApp link',   status: 'done',    moduleId: 'event_landing',    x: 60,  y: 20  },
      { id: 'auth',    label: 'Sign in (optional)',       sub: 'Google OAuth / email / stay anon',   status: 'done',    moduleId: 'auth',              x: 420, y: 20  },
      { id: 'join',    label: 'Join form',                sub: 'name + handicap · no account needed',status: 'done',    moduleId: 'invite',            x: 240, y: 130 },
      { id: 'score',   label: 'Score entry',              sub: '/rounds/[id]/score · hole-by-hole',  status: 'done',    moduleId: 'score_entry',       x: 240, y: 240 },
      { id: 'live',    label: 'Live leaderboard panel',   sub: 'inline overlay · real-time group',   status: 'done',    moduleId: 'leaderboard_live',  x: 60,  y: 350 },
      { id: 'ntp',     label: 'NTP / LD capture',         sub: 'overlay after contest hole',         status: 'done',    moduleId: 'ntp_ld',            x: 420, y: 350 },
      { id: 'summary', label: 'Round summary',            sub: '/rounds/[id] · chart + scorecard',   status: 'done',    moduleId: 'round_summary',     x: 60,  y: 460 },
      { id: 'results', label: 'Event results',            sub: 'on round summary + OG leaderboard',  status: 'done',    moduleId: 'results',           x: 420, y: 460 },
    ],
    arrows: [
      { x1: 200, y1: 70,  x2: 280, y2: 130 },
      { x1: 480, y1: 70,  x2: 360, y2: 130 },
      { x1: 340, y1: 180, x2: 340, y2: 240 },
      { x1: 280, y1: 290, x2: 160, y2: 350 },
      { x1: 400, y1: 290, x2: 480, y2: 350 },
      { x1: 120, y1: 400, x2: 120, y2: 460 },
      { x1: 480, y1: 400, x2: 480, y2: 460 },
    ],
  },
  {
    // Organiser creates an event, invites players, runs the round, manages on the day
    id: 'organiser', label: 'Organiser — create & run an event', height: 530,
    steps: [
      { id: 'org_home',   label: '/play dashboard',       sub: 'signed-in organiser entry',           status: 'done',     moduleId: 'player_home',    x: 240, y: 20  },
      { id: 'org_create', label: 'New round wizard',       sub: 'venue → combo → players → format',   status: 'done',     moduleId: 'event_create',   x: 240, y: 120 },
      { id: 'org_invite', label: 'Invite link shared',     sub: 'WhatsApp · /events/[id] · anon join',status: 'done',     moduleId: 'invite',         x: 240, y: 220 },
      { id: 'org_manage', label: 'Manage event',           sub: '/events/[id]/manage · DnD flights',   status: 'done',     moduleId: 'org_dashboard', x: 60,  y: 330 },
      { id: 'org_marker', label: 'Marker mode',            sub: 'score for any player via leaderboard',status: 'done',    moduleId: 'score_entry',    x: 420, y: 330 },
      { id: 'org_live',   label: 'Live leaderboard',       sub: '/events/[id]/leaderboard · TV mode',  status: 'done',    moduleId: 'leaderboard_live', x: 240, y: 440 },
      { id: 'org_result', label: 'Results published',      sub: 'OG leaderboard · shareable URL',      status: 'done',    moduleId: 'results',        x: 240, y: 520 },
    ],
    arrows: [
      { x1: 340, y1: 70,  x2: 340, y2: 120 },
      { x1: 340, y1: 170, x2: 340, y2: 220 },
      { x1: 280, y1: 270, x2: 160, y2: 330 },
      { x1: 400, y1: 270, x2: 480, y2: 330 },
      { x1: 160, y1: 380, x2: 300, y2: 440 },
      { x1: 480, y1: 380, x2: 380, y2: 440 },
      { x1: 340, y1: 490, x2: 340, y2: 520 },
    ],
  },
  {
    // Solo player starts and finishes a round, then reviews their history
    id: 'solo', label: 'Solo scorer — start round, review history', height: 470,
    steps: [
      { id: 's_home',    label: '/play dashboard',       sub: 'signed-in player entry',             status: 'done', moduleId: 'player_home',      x: 240, y: 20  },
      { id: 's_wizard',  label: 'New round wizard',      sub: 'venue → combo → tee → format',       status: 'done', moduleId: 'event_create',     x: 240, y: 120 },
      { id: 's_score',   label: 'Score entry',           sub: '/rounds/[id]/score · hole-by-hole',  status: 'done', moduleId: 'score_entry',      x: 240, y: 220 },
      { id: 's_summary', label: 'Round summary',         sub: '/rounds/[id] · chart + scorecard',   status: 'done', moduleId: 'round_summary',    x: 240, y: 320 },
      { id: 's_rounds',  label: 'Rounds list',           sub: '/rounds · all rounds history',        status: 'done', moduleId: 'rounds_list',      x: 60,  y: 420 },
      { id: 's_events',  label: 'Events list',           sub: '/events · all events played',         status: 'done', moduleId: 'events_list',      x: 420, y: 420 },
    ],
    arrows: [
      { x1: 340, y1: 70,  x2: 340, y2: 120 },
      { x1: 340, y1: 170, x2: 340, y2: 220 },
      { x1: 340, y1: 270, x2: 340, y2: 320 },
      { x1: 280, y1: 370, x2: 160, y2: 420 },
      { x1: 400, y1: 370, x2: 480, y2: 420 },
    ],
  },
  {
    // A second group of players joins an in-progress event via share code
    id: 'group_join', label: 'Second group — join via share code', height: 470,
    steps: [
      { id: 'g_score',   label: 'Group 1 scoring',       sub: 'share code chip visible in header',  status: 'done', moduleId: 'score_entry',    x: 240, y: 20  },
      { id: 'g_copy',    label: 'Tap chip → code copied', sub: '6-char code · ✓ Copied feedback',   status: 'done', moduleId: 'group_joining',  x: 240, y: 115 },
      { id: 'g_join',    label: '/play/join',             sub: 'Group 2 enters the share code',      status: 'done', moduleId: 'group_joining',  x: 240, y: 210 },
      { id: 'g_preview', label: 'Event preview',          sub: 'course, format, existing players',   status: 'done', moduleId: 'group_joining',  x: 240, y: 305 },
      { id: 'g_players', label: 'Add Group 2 players',   sub: 'names + handicaps · own scorecards',  status: 'done', moduleId: 'group_joining',  x: 60,  y: 400 },
      { id: 'g_board',   label: 'Live leaderboard',       sub: 'all 8 players · no extra config',    status: 'done', moduleId: 'leaderboard_live', x: 420, y: 400 },
    ],
    arrows: [
      { x1: 340, y1: 70,  x2: 340, y2: 115 },
      { x1: 340, y1: 165, x2: 340, y2: 210 },
      { x1: 340, y1: 260, x2: 340, y2: 305 },
      { x1: 280, y1: 355, x2: 160, y2: 400 },
      { x1: 400, y1: 355, x2: 480, y2: 400 },
    ],
  },
  {
    // Future: club member books, enters competition, and scores via lx2.golf
    id: 'club_member', label: 'Club member — book, compete, score (P2)', height: 560,
    steps: [
      { id: 'cm_home',    label: 'lx2.golf — My Club',    sub: 'member home',               status: 'planned', moduleId: 'my_club_dashboard',      x: 240, y: 20  },
      { id: 'cm_book',    label: 'Book tee time',          sub: 'loop selection, Realtime',  status: 'planned', moduleId: 'tee_booking',            x: 60,  y: 120 },
      { id: 'cm_enter',   label: 'Enter competition',      sub: 'monthly medal, pay online', status: 'planned', moduleId: 'club_competition_entry', x: 420, y: 120 },
      { id: 'cm_score',   label: 'Score on the day',       sub: 'lx2.golf, hole-by-hole',   status: 'planned', moduleId: 'score_entry',            x: 240, y: 230 },
      { id: 'cm_live',    label: 'Live leaderboard',       sub: 'real-time standings',       status: 'done',    moduleId: 'leaderboard_live',       x: 240, y: 330 },
      { id: 'cm_results', label: 'Results in history',     sub: 'rounds list + event list',  status: 'done',    moduleId: 'rounds_list',            x: 60,  y: 440 },
      { id: 'cm_club',    label: 'Club admin sees same',   sub: 'club.lx2.golf dashboard',   status: 'planned', moduleId: 'club_admin_dashboard',   x: 420, y: 440 },
    ],
    arrows: [
      { x1: 300, y1: 70,  x2: 160, y2: 120 },
      { x1: 380, y1: 70,  x2: 480, y2: 120 },
      { x1: 160, y1: 170, x2: 300, y2: 230, dashed: true },
      { x1: 480, y1: 170, x2: 380, y2: 230, dashed: true },
      { x1: 340, y1: 280, x2: 340, y2: 330 },
      { x1: 300, y1: 380, x2: 160, y2: 440 },
      { x1: 380, y1: 380, x2: 480, y2: 440 },
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
  'club':       { label: 'Club console — club.lx2.golf',         surfaceTag: 'Club',       color: '#923357', note: 'Cumberwell Park pilot. Replaces intelligentgolf + golfbook/255it. Separate apps/club Next.js app.' },
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
  const [view, setView] = useState<'modules' | 'surfaces' | 'deps' | 'journeys' | 'blueprints' | 'tests' | 'stack' | 'claude'>('modules')
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
  const mvpBuild = mvpMods.filter(m => m.status === 'building').length
  const p2Mods   = allMods.filter(m => m.phase === 'soon')
  const p2Done   = p2Mods.filter(m => m.status === 'done').length
  const p2Build  = p2Mods.filter(m => m.status === 'building').length
  const p3Mods   = allMods.filter(m => m.phase === 'later')
  const p3Done   = p3Mods.filter(m => m.status === 'done').length
  const p3Build  = p3Mods.filter(m => m.status === 'building').length
  const p4Mods   = allMods.filter(m => m.phase === 'future')
  const p4Done   = p4Mods.filter(m => m.status === 'done').length
  const p4Build  = p4Mods.filter(m => m.status === 'building').length

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
          <div style={{ fontSize: 11, color: '#9CA3AF' }}>v0.6 · March 2026 · two-app platform</div>
        </div>
      </div>

      {/* Vision banner */}
      <div style={{ background: 'linear-gradient(135deg, #0D2B12 0%, #1A3E1A 100%)', borderRadius: 16, padding: '20px 24px', marginBottom: 16, boxShadow: '0 8px 24px rgba(13,43,18,0.18)' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', fontFamily: "'Manrope', sans-serif", marginBottom: 4 }}>⛳ Golf, all in one place.</div>
        <div style={{ fontSize: 13, color: '#86EFAC', lineHeight: 1.5 }}>One platform. Two apps. A golfer scores any round, enters competitions, and books tee times on <strong style={{ color: '#fff' }}>lx2.golf</strong>. Their club admin manages the tee sheet, runs draws, and views financials on <strong style={{ color: '#fff' }}>club.lx2.golf</strong>. Same data. Two views. One identity.</div>
      </div>

      {/* Two-app overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {/* Golfer app */}
        <div onClick={() => setView('surfaces')} style={{ background: '#fff', border: '1.5px solid #22C55E40', borderRadius: 14, padding: '14px 16px', boxShadow: '0 4px 16px rgba(34,197,94,0.08)', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A', flexShrink: 0 }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: '#15803D', fontFamily: "'Manrope', sans-serif" }}>lx2.golf</div>
            <div style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: '#DCFCE7', color: '#166534', fontWeight: 500, marginLeft: 'auto' }}>golfer app</div>
          </div>
          <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>Score · Compete · Book · Track</div>
          {[
            ['Phase 1', 'Score entry, live leaderboard, events, invite & RSVP, results, payments', '#16A34A', '#DCFCE7'],
            ['Phase 2', 'Tee booking, club competition entry, player profile, my club dashboard', '#2563EB', '#DBEAFE'],
            ['Phase 3', 'Multi-club booking, extended formats', '#7C3AED', '#EDE9FE'],
            ['Phase 4', 'GPS on-course, WHS integration', '#B45309', '#FEF3C7'],
          ].map(([phase, desc, color, bg]) => (
            <div key={phase} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 4 }}>
              <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 99, background: bg as string, color: color as string, fontWeight: 600, flexShrink: 0, marginTop: 1 }}>{phase}</span>
              <span style={{ fontSize: 11, color: '#44483E', lineHeight: 1.4 }}>{desc}</span>
            </div>
          ))}
        </div>

        {/* Club console */}
        <div onClick={() => setView('surfaces')} style={{ background: '#fff', border: '1.5px solid #3B82F640', borderRadius: 14, padding: '14px 16px', boxShadow: '0 4px 16px rgba(59,130,246,0.08)', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563EB', flexShrink: 0 }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1D4ED8', fontFamily: "'Manrope', sans-serif" }}>club.lx2.golf</div>
            <div style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: '#DBEAFE', color: '#1E40AF', fontWeight: 500, marginLeft: 'auto' }}>club console</div>
          </div>
          <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>Manage · Operate · Report</div>
          {[
            ['Phase 1', 'Club auth, member roster, tee sheet config & view, booking, competition calendar, admin dashboard', '#16A34A', '#DCFCE7'],
            ['Phase 2', 'Membership billing, pricing rules, communications, vouchers, reporting, EPOS', '#2563EB', '#DBEAFE'],
            ['Phase 3', 'Lesson/simulator/range booking, society packages, function rooms', '#7C3AED', '#EDE9FE'],
            ['Phase 4', 'F&B management, stock management, multi-club resort', '#B45309', '#FEF3C7'],
          ].map(([phase, desc, color, bg]) => (
            <div key={phase} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 4 }}>
              <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 99, background: bg as string, color: color as string, fontWeight: 600, flexShrink: 0, marginTop: 1 }}>{phase}</span>
              <span style={{ fontSize: 11, color: '#44483E', lineHeight: 1.4 }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20, padding: '10px 14px', background: '#F9FAF7', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.06)' }}>
        <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 500, marginRight: 4 }}>Legend:</span>
        {[
          ['✓ existing', '#374151', '#F3F4F6'],
          ['golfer app', '#15803D', '#DCFCE7'],
          ['club console', '#1D4ED8', '#DBEAFE'],
          ['shared / both', '#6B7280', '#F3F4F6'],
        ].map(([label, color, bg]) => (
          <span key={label} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: bg, color: color, fontWeight: 500, border: `0.5px solid ${color}30` }}>{label}</span>
        ))}
        <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 4 }}>· Pilot: Cumberwell Park (Bradford-on-Avon)</span>
      </div>

      {/* Progress */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: '16px 20px', marginBottom: 20, boxShadow: '0 8px 24px rgba(26,28,28,0.06)' }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Progress by phase</div>
        {([
          { label: 'P1 · MVP', mods: mvpMods, dCount: mvpDone, bCount: mvpBuild },
          { label: 'P2',       mods: p2Mods,  dCount: p2Done,  bCount: p2Build  },
          { label: 'P3',       mods: p3Mods,  dCount: p3Done,  bCount: p3Build  },
          { label: 'P4',       mods: p4Mods,  dCount: p4Done,  bCount: p4Build  },
        ] as const).map(({ label, mods, dCount, bCount }) => (
          <div key={label} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', letterSpacing: '0.02em' }}>{label}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                {dCount > 0 && <span style={{ color: '#0D631B', fontWeight: 600 }}>{dCount}</span>}
                {dCount > 0 && bCount > 0 && <span style={{ color: '#9CA3AF' }}> + </span>}
                {bCount > 0 && <span style={{ color: '#B8660B', fontWeight: 600 }}>{bCount}</span>}
                {(dCount > 0 || bCount > 0) && <span style={{ color: '#9CA3AF' }}> / </span>}
                <span>{mods.length}</span>
              </div>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: '#F3F4F6', overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #0D631B, #2E7D32)', width: `${(dCount / mods.length) * 100}%`, transition: 'width 0.4s' }} />
              <div style={{ position: 'absolute', left: `${(dCount / mods.length) * 100}%`, top: 0, height: '100%', background: '#F59E0B', width: `${(bCount / mods.length) * 100}%`, transition: 'all 0.4s' }} />
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 16, marginTop: 8, paddingTop: 10, borderTop: '0.5px solid #F3F4F6' }}>
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
        {(['modules', 'surfaces', 'deps', 'journeys', 'blueprints', 'tests', 'stack', 'claude'] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 99, border: 'none', background: view === v ? '#1A2E1A' : '#F3F4F6', color: view === v ? '#fff' : '#6B7280', cursor: 'pointer', fontFamily: "'Lexend', sans-serif", fontWeight: view === v ? 500 : 400, transition: 'all 0.15s' }}>
            {v === 'modules' ? 'All modules' : v === 'surfaces' ? 'App map' : v === 'deps' ? 'Dependencies' : v === 'journeys' ? 'Journeys' : v === 'blueprints' ? 'Service blueprints' : v === 'tests' ? 'Test strategy' : v === 'stack' ? 'Tech stack' : 'Claude setup'}
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

      {/* ── Blueprints view ── */}
      {view === 'blueprints' && <BlueprintView />}

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

      {/* ── Tests view ── */}
      {view === 'tests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>

          {/* Strategy overview */}
          <div style={{ background: 'linear-gradient(135deg, #0D2B12 0%, #1A3E1A 100%)', borderRadius: 16, padding: '18px 22px', boxShadow: '0 8px 24px rgba(13,43,18,0.18)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: "'Manrope', sans-serif", marginBottom: 4 }}>Test strategy</div>
            <div style={{ fontSize: 12, color: '#86EFAC', lineHeight: 1.6 }}>Two-layer approach: fast <strong style={{ color: '#fff' }}>unit tests</strong> for all scoring and offline logic (Vitest, run on every commit), plus <strong style={{ color: '#fff' }}>E2E tests</strong> covering critical user journeys (Playwright, run after build in CI). No mocking the database — integration tests use real Supabase.</div>
          </div>

          {/* Test pyramid */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: '18px 20px', boxShadow: '0 8px 24px rgba(26,28,28,0.06)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1A2E1A', fontFamily: "'Manrope', sans-serif", marginBottom: 14 }}>Test pyramid</div>
            {[
              { layer: 'E2E (Playwright)', count: '11 tests', tool: 'Playwright · Chromium', color: '#2563EB', bg: '#DBEAFE', desc: 'Full browser flows: auth, /play dashboard, new round wizard, public pages. Saved auth state (global-setup.ts). CI uploads report on failure.' },
              { layer: 'Unit (Vitest)', count: '~40 tests', tool: 'Vitest · @lx2/scoring + @lx2/pwa', color: '#0D631B', bg: '#DCFCE7', desc: 'Pure functions only. Stableford / Stroke Play / Match Play / Handicap engines. Offline queue IndexedDB wrapper. Zero framework dependencies.' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '12px 0', borderBottom: i < 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                <div style={{ flexShrink: 0, width: 120 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: row.color, fontFamily: "'Manrope', sans-serif" }}>{row.layer}</div>
                  <div style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: row.bg, color: row.color, fontWeight: 500, marginTop: 4, display: 'inline-block' }}>{row.count}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#6B8C6B', marginBottom: 4, fontFamily: 'monospace' }}>{row.tool}</div>
                  <div style={{ fontSize: 12, color: '#44483E', lineHeight: 1.5 }}>{row.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* E2E suites */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: '18px 20px', boxShadow: '0 8px 24px rgba(26,28,28,0.06)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1A2E1A', fontFamily: "'Manrope', sans-serif", marginBottom: 12 }}>E2E test suites (Playwright)</div>
            {[
              { file: 'e2e/public.spec.ts', label: 'Public flows', tests: ['Homepage loads + has LX2 title', 'Login page renders email/password form', 'Unauthenticated /play → redirects to /auth/login', 'Unauthenticated /play/new → redirects to /auth/login'] },
              { file: 'e2e/auth.spec.ts', label: 'Authentication', tests: ['Sign-in with valid credentials → lands on /play', 'Sign-in with bad password → shows error', 'Signed-in user visiting /auth/login redirects to /play'] },
              { file: 'e2e/play.spec.ts', label: 'Play dashboard + wizard', tests: ['Play dashboard loads and shows 3 stat cards', '"Start a round" button visible', 'New round wizard opens on venue step', 'Back link returns to /play'] },
            ].map((suite, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <code style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: '#F3F4F6', color: '#44483E', fontFamily: 'monospace' }}>{suite.file}</code>
                  <span style={{ fontSize: 11, color: '#6B8C6B' }}>{suite.label}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 12 }}>
                  {suite.tests.map((t, j) => (
                    <div key={j} style={{ fontSize: 12, color: '#44483E', display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                      <span style={{ color: '#0D631B', flexShrink: 0 }}>✓</span><span>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, fontStyle: 'italic' }}>global-setup.ts logs in once, saves auth state to e2e/.auth/user.json — reused by all authenticated suites</div>
          </div>

          {/* CI pipeline */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: '18px 20px', boxShadow: '0 8px 24px rgba(26,28,28,0.06)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1A2E1A', fontFamily: "'Manrope', sans-serif", marginBottom: 12 }}>CI pipeline (GitHub Actions · main + PRs)</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {[
                { step: 'npm ci', color: '#6B7280', bg: '#F3F4F6' },
                { step: 'type-check', color: '#7C3AED', bg: '#EDE9FE' },
                { step: 'lint', color: '#B45309', bg: '#FEF3C7' },
                { step: 'vitest', color: '#0D631B', bg: '#DCFCE7' },
                { step: 'build', color: '#1565C0', bg: '#E3F2FD' },
                { step: 'playwright', color: '#2563EB', bg: '#DBEAFE' },
              ].map((s, i, arr) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, padding: '4px 12px', borderRadius: 99, background: s.bg, color: s.color, fontWeight: 500, fontFamily: 'monospace' }}>{s.step}</span>
                  {i < arr.length - 1 && <span style={{ fontSize: 12, color: '#D1D5DB' }}>→</span>}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#6B8C6B', marginTop: 10, lineHeight: 1.6 }}>
              Playwright requires <code style={{ fontSize: 10, background: '#F3F4F6', padding: '1px 5px', borderRadius: 4 }}>NEXT_PUBLIC_SUPABASE_URL</code>, <code style={{ fontSize: 10, background: '#F3F4F6', padding: '1px 5px', borderRadius: 4 }}>E2E_TEST_EMAIL</code>, <code style={{ fontSize: 10, background: '#F3F4F6', padding: '1px 5px', borderRadius: 4 }}>E2E_TEST_PASSWORD</code> as GitHub Secrets. Report uploaded as artifact on failure (7-day retention).
            </div>
          </div>

          {/* Coverage gaps */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: '18px 20px', boxShadow: '0 8px 24px rgba(26,28,28,0.06)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1A2E1A', fontFamily: "'Manrope', sans-serif", marginBottom: 10 }}>Coverage gaps — planned next</div>
            {[
              { gap: 'Score entry flow', note: 'Hole-by-hole scoring, leaderboard panel overlay, marker mode' },
              { gap: 'New round creation', note: 'Full wizard: venue → combination → players → start' },
              { gap: 'Offline queue', note: 'E2E: go offline, score holes, reconnect, verify sync' },
              { gap: 'Event join (anonymous)', note: 'Name + handicap join flow, join_token cookie' },
              { gap: 'Leaderboard realtime', note: 'Supabase Realtime subscription — needs two concurrent browser contexts' },
            ].map((row, i, arr) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '7px 0', borderBottom: i < arr.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#FEF3C7', color: '#B45309', fontWeight: 500, flexShrink: 0, marginTop: 1 }}>gap</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#1A2E1A' }}>{row.gap}</div>
                  <div style={{ fontSize: 11, color: '#6B8C6B' }}>{row.note}</div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ── Stack view ── */}
      {view === 'stack' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {[
            {
              layer: 'Frontend', icon: '🖥',
              items: [
                { name: 'Next.js 15', role: 'App Router, SSR, server actions, streaming', tag: 'core' },
                { name: 'React 18', role: 'Server + client components, Suspense, useReducer', tag: 'core' },
                { name: 'TypeScript', role: 'Strict mode throughout', tag: 'core' },
                { name: 'CSS-in-JSX', role: 'Component styles in <style> blocks — no CSS Modules', tag: 'pattern' },
                { name: 'Tailwind CSS', role: 'globals.css only — base reset', tag: 'pattern' },
              ],
              color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE',
            },
            {
              layer: 'Design system', icon: '🎨',
              items: [
                { name: 'Manrope 800', role: 'Marketing headings, wizard headers', tag: 'font' },
                { name: 'Lexend 300–500', role: 'Marketing body, inputs, UI labels', tag: 'font' },
                { name: 'DM Serif Display', role: 'App headings (scoring, auth)', tag: 'font' },
                { name: 'DM Sans 300–700', role: 'App body, UI labels (scoring, play)', tag: 'font' },
                { name: 'Green palette', role: '#0D631B primary · #0a1f0a header · #F2F5F0 bg', tag: 'colour' },
              ],
              color: '#0D631B', bg: '#F0FDF4', border: '#BBF7D0',
            },
            {
              layer: 'Backend / Data', icon: '🗄',
              items: [
                { name: 'Supabase Postgres', role: 'Primary database — all app data', tag: 'infra' },
                { name: 'Supabase Auth', role: 'Google OAuth + email/password', tag: 'infra' },
                { name: 'Supabase Realtime', role: 'postgres_changes — live leaderboard, player list', tag: 'infra' },
                { name: 'Row-level security', role: 'RLS on all tables + SECURITY DEFINER fn', tag: 'pattern' },
                { name: '@supabase/ssr', role: 'Server-side session via cookies', tag: 'lib' },
              ],
              color: '#059669', bg: '#ECFDF5', border: '#A7F3D0',
            },
            {
              layer: 'Shared packages', icon: '📦',
              items: [
                { name: '@lx2/scoring', role: 'Stableford, Stroke Play, Match Play, Handicap — pure TS, Vitest', tag: 'pkg' },
                { name: '@lx2/leaderboard', role: 'computeLeaderboard() — shared by web + club', tag: 'pkg' },
                { name: '@lx2/brand', role: 'Design tokens, getCSSVars(), applyClubTheme()', tag: 'pkg' },
                { name: '@lx2/db', role: 'Supabase client factory, shared migrations', tag: 'pkg' },
              ],
              color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE',
            },
            {
              layer: 'Monorepo + build', icon: '🏗',
              items: [
                { name: 'Turborepo', role: 'Task orchestration, remote caching, parallel builds', tag: 'build' },
                { name: 'apps/web :3000', role: 'Player PWA — lx2.golf', tag: 'app' },
                { name: 'apps/club :3001', role: 'Organiser console — club.lx2.golf', tag: 'app' },
                { name: 'apps/arch :3002', role: 'This control tower — local only', tag: 'app' },
                { name: 'Vercel', role: 'Deployment target for web + club apps', tag: 'infra' },
              ],
              color: '#B45309', bg: '#FFFBEB', border: '#FDE68A',
            },
            {
              layer: 'Testing', icon: '🧪',
              items: [
                { name: 'Vitest', role: 'Unit — @lx2/scoring engines + offline-queue', tag: 'test' },
                { name: 'Playwright', role: 'E2E — auth, /play, new round, public. Chromium only', tag: 'test' },
                { name: 'GitHub Actions', role: 'CI: type-check → lint → vitest → build → playwright', tag: 'ci' },
              ],
              color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC',
            },
            {
              layer: 'PWA / Offline', icon: '📱',
              items: [
                { name: 'IndexedDB queue', role: 'Offline score writes — per-scorecard draining guard', tag: 'lib' },
                { name: 'Service worker', role: 'Cache-first static, network-first API (public/sw.js)', tag: 'lib' },
                { name: 'OfflineBanner', role: 'Connectivity + sync state indicator', tag: 'ui' },
              ],
              color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB',
            },
          ].map(section => (
            <div key={section.layer} style={{ background: '#fff', border: `0.5px solid ${section.border}`, borderRadius: 16, padding: '16px 20px', boxShadow: '0 4px 16px rgba(26,28,28,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>{section.icon}</span>
                <div style={{ fontSize: 13, fontWeight: 700, color: section.color, fontFamily: "'Manrope', sans-serif" }}>{section.layer}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {section.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: section.bg, color: section.color, fontWeight: 600, flexShrink: 0, marginTop: 1, minWidth: 50, textAlign: 'center' as const }}>{item.tag}</span>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#1A2E1A', marginRight: 6 }}>{item.name}</span>
                      <span style={{ fontSize: 12, color: '#6B8C6B' }}>{item.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Claude setup view ── */}
      {view === 'claude' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>

          {/* Overview */}
          <div style={{ background: 'linear-gradient(135deg, #0D2B12 0%, #1A3E1A 100%)', borderRadius: 16, padding: '18px 22px', boxShadow: '0 8px 24px rgba(13,43,18,0.18)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: "'Manrope', sans-serif", marginBottom: 4 }}>.claude/ — AI-assisted development setup</div>
            <div style={{ fontSize: 12, color: '#86EFAC', lineHeight: 1.6 }}>The <code style={{ background: 'rgba(255,255,255,0.12)', padding: '1px 5px', borderRadius: 4 }}>.claude/</code> folder configures how Claude Code works with LX2. It defines <strong style={{ color: '#fff' }}>agents</strong> (specialist AI roles), <strong style={{ color: '#fff' }}>slash commands</strong> (multi-step workflows), <strong style={{ color: '#fff' }}>hooks</strong> (automated gates), and <strong style={{ color: '#fff' }}>rules</strong> (context injected by file path). Together they enforce the design system, architecture patterns, and quality gates on every change — without repeating them in every prompt.</div>
          </div>

          {/* Folder tree */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: '18px 20px', boxShadow: '0 4px 16px rgba(26,28,28,0.04)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1A2E1A', fontFamily: "'Manrope', sans-serif", marginBottom: 12 }}>Folder structure</div>
            <div style={{ fontFamily: 'monospace', fontSize: 11, lineHeight: 2, color: '#44483E' }}>
              {[
                { indent: 0, text: '.claude/', color: '#0D631B', bold: true },
                { indent: 1, text: 'CLAUDE.md', color: '#1A2E1A', note: '— master project instructions (always read first)' },
                { indent: 1, text: 'launch.json', color: '#1A2E1A', note: '— dev server configs (web :3000, club :3001, arch :3002)' },
                { indent: 1, text: 'settings.json', color: '#1A2E1A', note: '— Claude Code permissions & tool allowlist' },
                { indent: 1, text: 'commands/', color: '#7C3AED', bold: true, note: '— slash commands' },
                { indent: 2, text: 'audit.md', color: '#44483E', note: '— /audit: 9-step project health check' },
                { indent: 1, text: 'hooks/', color: '#B45309', bold: true, note: '— automated gates' },
                { indent: 2, text: 'pre-push.sh', color: '#44483E', note: '— blocks push on type errors, build failures, suppressions' },
                { indent: 1, text: 'rules/', color: '#2563EB', bold: true, note: '— auto-injected context rules' },
                { indent: 2, text: 'quality-gates.md', color: '#44483E', note: '— applies to all .tsx/.ts files' },
                { indent: 1, text: 'lx2-claude/', color: '#0D631B', bold: true, note: '— full agent/workflow framework' },
                { indent: 2, text: 'agents/', color: '#7C3AED', bold: true },
                { indent: 3, text: 'architect.md', color: '#44483E', note: '— Opus · plan only, never implements' },
                { indent: 3, text: 'coder.md', color: '#44483E', note: '— Sonnet · executes architect plans' },
                { indent: 3, text: 'design-guardian.md', color: '#44483E', note: '— Sonnet · design system enforcer' },
                { indent: 3, text: 'code-reviewer.md', color: '#44483E', note: '— Opus · 3-pass security+design+quality' },
                { indent: 3, text: 'debugger.md', color: '#44483E', note: '— Opus (high effort) · root cause, never symptoms' },
                { indent: 3, text: 'scribe.md', color: '#44483E', note: '— Haiku · docs + cleanup, no logic changes' },
                { indent: 2, text: 'commands/', color: '#7C3AED', bold: true },
                { indent: 3, text: 'new-feature.md', color: '#44483E', note: '— architect → approve → DB → server → UI → verify' },
                { indent: 3, text: 'deploy.md', color: '#44483E', note: '— pre-flight → push main → live verification' },
                { indent: 3, text: 'pr-review.md', color: '#44483E', note: '— types → lint → build → code-reviewer agent' },
                { indent: 2, text: 'hooks/', color: '#B45309', bold: true },
                { indent: 3, text: 'lint-on-save.sh', color: '#44483E', note: '— lint on every file save' },
                { indent: 3, text: 'pre-commit.sh', color: '#44483E', note: '— type-check + lint before every commit' },
                { indent: 2, text: 'rules/', color: '#2563EB', bold: true },
                { indent: 3, text: 'frontend.md', color: '#44483E', note: '— injected for apps/**/src/** files' },
                { indent: 3, text: 'api.md', color: '#44483E', note: '— injected for server actions + route handlers' },
                { indent: 3, text: 'database.md', color: '#44483E', note: '— injected for migration + Supabase files' },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'baseline', paddingLeft: row.indent * 18 }}>
                  {row.indent > 0 && <span style={{ color: '#D1D5DB', flexShrink: 0 }}>{row.indent === 1 ? '├─' : row.indent === 2 ? '│ ├─' : '│ │ ├─'}</span>}
                  <span style={{ color: row.color, fontWeight: row.bold ? 700 : 400 }}>{row.text}</span>
                  {row.note && <span style={{ color: '#9CA3AF', fontWeight: 400 }}>{row.note}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Agents */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: '18px 20px', boxShadow: '0 4px 16px rgba(26,28,28,0.04)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1A2E1A', fontFamily: "'Manrope', sans-serif", marginBottom: 12 }}>Agents — specialist AI roles</div>
            <div style={{ fontSize: 11, color: '#6B8C6B', marginBottom: 12 }}>Each agent has a fixed model, a limited toolset, and a single responsibility. Invoke with <code style={{ background: '#F3F4F6', padding: '1px 5px', borderRadius: 4 }}>claude --agent &lt;name&gt;</code> or from a command.</div>
            {[
              { name: 'architect', model: 'Opus', tag: 'plan', color: '#7C3AED', bg: '#F5F3FF', tools: 'Read, Glob, Grep, Bash', desc: 'Produces numbered implementation plans — files to create, DB changes, sequence of work, risks. Never writes code. Always runs before significant new work.' },
              { name: 'coder', model: 'Sonnet', tag: 'build', color: '#0D631B', bg: '#DCFCE7', tools: 'Read, Write, Edit, Glob, Grep, Bash', desc: 'Executes architect plans precisely. Reads CLAUDE.md + relevant rules/ before every file. Runs tsc + lint after writing. No design system deviations.' },
              { name: 'design-guardian', model: 'Sonnet', tag: 'audit', color: '#B45309', bg: '#FEF3C7', tools: 'Read, Glob, Grep', desc: 'Audits any component for design system compliance. Flags fonts, colours, layout, and animation violations with FILE → LINE → SEVERITY → FIX.' },
              { name: 'code-reviewer', model: 'Opus', tag: 'review', color: '#1565C0', bg: '#E3F2FD', tools: 'Read, Glob, Grep, Bash', desc: 'Three independent passes: (1) security — secrets, RLS, auth guards; (2) design system compliance; (3) code quality — Next.js 15, TypeScript, patterns. Blocks merge on CRITICAL.' },
              { name: 'debugger', model: 'Opus ↑', tag: 'debug', color: '#B91C1C', bg: '#FEE2E2', tools: 'Read, Glob, Grep, Bash', desc: 'Root cause investigation. Reproduce → check LX2 gotchas (async APIs, wrong Supabase client, stale Turbo cache) → investigate systematically → fix minimally → verify.' },
              { name: 'scribe', model: 'Haiku', tag: 'docs', color: '#6B7280', bg: '#F3F4F6', tools: 'Read, Write, Edit, Glob, Grep', desc: 'JSDoc, README, inline comments, rename, extract constants, remove dead code. No logic changes. No CSS changes. Keeps CLAUDE.md Session Learnings up to date.' },
            ].map((a, i, arr) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderBottom: i < arr.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                <div style={{ flexShrink: 0, width: 110 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: a.color, fontFamily: "'Manrope', sans-serif" }}>{a.name}</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 99, background: a.bg, color: a.color, fontWeight: 600 }}>{a.tag}</span>
                    <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 99, background: '#F3F4F6', color: '#6B7280', fontWeight: 500 }}>{a.model}</span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'monospace', marginBottom: 3 }}>tools: {a.tools}</div>
                  <div style={{ fontSize: 12, color: '#44483E', lineHeight: 1.5 }}>{a.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Commands */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: '18px 20px', boxShadow: '0 4px 16px rgba(26,28,28,0.04)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1A2E1A', fontFamily: "'Manrope', sans-serif", marginBottom: 12 }}>Slash commands — multi-step workflows</div>
            {[
              {
                cmd: '/new-feature',
                trigger: 'Starting any new feature',
                color: '#0D631B', bg: '#DCFCE7',
                steps: ['architect agent produces full plan (apps affected, DB, server, UI, risks)', 'Wait for Matt\'s approval before any code', 'DB: migration + RLS in supabase/migrations/', 'Server: actions in app/actions/, route handlers in app/api/ only for public/webhooks', 'UI: coder agent — server component by default, CSS-in-JSX, design system', 'Verify: tsc --noEmit + lint + test in affected apps'],
              },
              {
                cmd: '/deploy',
                trigger: 'Deploying to production',
                color: '#2563EB', bg: '#DBEAFE',
                steps: ['Pre-flight: git status clean, lint clean, tsc clean, build clean, no .env staged', 'git push origin main → Vercel auto-deploys', 'Verify lx2.golf and club.lx2.golf load', 'Test Google OAuth login on both apps', 'If anything fails: fix and re-run all checks — no force push, no skipping'],
              },
              {
                cmd: '/pr-review',
                trigger: 'Before raising any PR',
                color: '#7C3AED', bg: '#F5F3FF',
                steps: ['tsc --noEmit → fix all type errors', 'turbo run lint → fix all warnings', 'turbo run build → clean across all apps', 'Invoke code-reviewer agent (3-pass: security, design, quality)', 'Fix all CRITICAL findings', 'Remove console.log, commented-out code, TODO comments'],
              },
              {
                cmd: '/audit',
                trigger: 'After every feature completion or on demand',
                color: '#B45309', bg: '#FEF3C7',
                steps: ['TypeScript — tsc --noEmit, no ignoreBuildErrors, no @ts-ignore', 'Build — turbo run build all apps clean', 'Lint — turbo run lint zero warnings', 'Tests — turbo run test all passing', 'RLS — every table has RLS enabled AND at least one policy', 'Schema drift — live DB vs migration files', 'Design system — fonts, colours, layout, no Tailwind in components', 'Dead code — unused exports, files, TODO/FIXME', 'Vision check — would a golfer on hole 14 understand this in 3 seconds?'],
              },
            ].map((cmd, i, arr) => (
              <div key={i} style={{ padding: '12px 0', borderBottom: i < arr.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <code style={{ fontSize: 12, fontWeight: 700, color: cmd.color, fontFamily: 'monospace', background: cmd.bg, padding: '2px 10px', borderRadius: 6 }}>{cmd.cmd}</code>
                  <span style={{ fontSize: 11, color: '#6B8C6B' }}>— {cmd.trigger}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 8 }}>
                  {cmd.steps.map((s, j) => (
                    <div key={j} style={{ fontSize: 11, color: '#44483E', display: 'flex', gap: 7 }}>
                      <span style={{ color: cmd.color, flexShrink: 0, fontSize: 10, marginTop: 1 }}>{j + 1}.</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Hooks + Rules */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Hooks */}
            <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: '16px 18px', boxShadow: '0 4px 16px rgba(26,28,28,0.04)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1A2E1A', fontFamily: "'Manrope', sans-serif", marginBottom: 10 }}>Hooks — automated gates</div>
              {[
                { file: 'pre-push.sh', trigger: 'git push', steps: ['type-check (blocks on error)', 'lint (blocks on error)', 'build (blocks on failure)', 'tests (warns, not blocking)', 'no ignoreBuildErrors / ignoreDuringBuilds in next.config', 'colour spot-check (warns on unapproved hex)'] },
                { file: 'pre-commit.sh', trigger: 'git commit', steps: ['tsc --noEmit', 'npm run lint', 'fail fast — no bad commits reach the tree'] },
                { file: 'lint-on-save.sh', trigger: 'file save', steps: ['npm run lint on changed file', 'instant feedback — catch issues before commit'] },
              ].map((h, i, arr) => (
                <div key={i} style={{ marginBottom: i < arr.length - 1 ? 12 : 0 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                    <code style={{ fontSize: 10, background: '#FEF3C7', color: '#B45309', padding: '1px 6px', borderRadius: 4 }}>{h.file}</code>
                    <span style={{ fontSize: 10, color: '#9CA3AF' }}>on {h.trigger}</span>
                  </div>
                  {h.steps.map((s, j) => (
                    <div key={j} style={{ fontSize: 11, color: '#44483E', display: 'flex', gap: 5, paddingLeft: 4 }}>
                      <span style={{ color: '#B45309', flexShrink: 0 }}>·</span><span>{s}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Rules */}
            <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: '16px 18px', boxShadow: '0 4px 16px rgba(26,28,28,0.04)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1A2E1A', fontFamily: "'Manrope', sans-serif", marginBottom: 4 }}>Rules — context injected by file path</div>
              <div style={{ fontSize: 11, color: '#6B8C6B', marginBottom: 10 }}>Automatically added to the context when Claude reads/edits matching files. No manual prompting needed.</div>
              {[
                { file: 'quality-gates.md', paths: 'apps/**/*.tsx, apps/**/*.ts, packages/**/*.ts', rules: ['Before coding: read CLAUDE.md, check for DB migration + RLS impact', 'After every edit: tsc --noEmit, no any, no @ts-ignore, no Tailwind in components, approved colours + fonts only', 'After every feature: /audit, update PRD, update architecture module status'] },
                { file: 'frontend.md', paths: 'apps/web/src/**, apps/club/src/**', rules: ['Server component by default, \'use client\' only for hooks/browser APIs', 'CSS-in-JSX <style> blocks — no inline styles, no CSS Modules', 'next/image with explicit dimensions, no blocking fetches in client components'] },
                { file: 'api.md', paths: 'server actions + route handler files', rules: ['Server actions for mutations, route handlers for public/webhook APIs only', 'Type all inputs and outputs — no any', 'Validate inputs with Zod before DB writes'] },
                { file: 'database.md', paths: 'supabase/migrations/**, Supabase client files', rules: ['Every new table: RLS enabled + at least one policy', 'Migrations: YYYYMMDDHHMMSS_description.sql, ON CONFLICT DO NOTHING', 'Use SECURITY DEFINER sparingly — only for is_event_participant() style cross-table checks'] },
              ].map((r, i, arr) => (
                <div key={i} style={{ marginBottom: i < arr.length - 1 ? 12 : 0 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                    <code style={{ fontSize: 10, background: '#DBEAFE', color: '#1565C0', padding: '1px 6px', borderRadius: 4 }}>{r.file}</code>
                  </div>
                  <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'monospace', marginBottom: 3 }}>{r.paths}</div>
                  {r.rules.map((s, j) => (
                    <div key={j} style={{ fontSize: 11, color: '#44483E', display: 'flex', gap: 5 }}>
                      <span style={{ color: '#2563EB', flexShrink: 0 }}>·</span><span>{s}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

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

      {/* ── Detail drawer (slides in from right) ── */}
      {/* Backdrop */}
      <div
        onClick={() => setSelected(null)}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(10,20,10,0.35)',
          backdropFilter: 'blur(2px)',
          opacity: mod ? 1 : 0,
          pointerEvents: mod ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />
      {/* Drawer panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 50,
        width: 'min(440px, 92vw)',
        background: '#fff',
        boxShadow: '-12px 0 48px rgba(0,0,0,0.14)',
        overflowY: 'auto',
        transform: mod ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex', flexDirection: 'column',
      }}>
        {mod && (
          <>
            {/* Drawer header */}
            <div style={{ padding: '18px 20px 14px', borderBottom: '0.5px solid rgba(0,0,0,0.07)', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1A2E1A', fontFamily: "'Manrope', sans-serif", lineHeight: 1.3 }}>{mod.name}</div>
                <button onClick={() => setSelected(null)} style={{ flexShrink: 0, width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#F3F4F6', color: '#6B7280', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>✕</button>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: surfaceConfig[mod.surface]!.bg, color: surfaceConfig[mod.surface]!.color, fontWeight: 500 }}>{surfaceConfig[mod.surface]!.label}</span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: phaseConfig[mod.phase]!.bg, color: phaseConfig[mod.phase]!.color, fontWeight: 500 }}>{phaseConfig[mod.phase]!.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusConfig[mod.status]!.color }} />
                  <span style={{ fontSize: 11, color: statusConfig[mod.status]!.color }}>{statusConfig[mod.status]!.label}</span>
                </div>
              </div>
            </div>

            {/* Drawer body */}
            <div style={{ padding: '16px 20px', flex: 1 }}>
              <div style={{ fontSize: 13, color: '#44483E', lineHeight: 1.65, marginBottom: 14 }}>{mod.desc}</div>

              {/* Links */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {mod.liveUrl && <a href={mod.liveUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, padding: '4px 12px', borderRadius: 99, background: '#E8F5E9', color: '#0D631B', textDecoration: 'none', border: '0.5px solid #0D631B30' }}>↗ Live</a>}
                {mod.prdUrl  && <a href={mod.prdUrl}  target="_blank" rel="noreferrer" style={{ fontSize: 12, padding: '4px 12px', borderRadius: 99, background: '#E3F2FD', color: '#1565C0', textDecoration: 'none', border: '0.5px solid #1565C030' }}>↗ PRD</a>}
                {mod.codeUrl && <a href={mod.codeUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, padding: '4px 12px', borderRadius: 99, background: '#F3F4F6', color: '#6B7280', textDecoration: 'none', border: '0.5px solid rgba(0,0,0,0.1)' }}>↗ Code</a>}
              </div>

              {/* Depends on */}
              {mod.deps.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Depends on</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {mod.deps.map(dep => {
                      const dm = modules[dep]
                      return <button key={dep} onClick={() => setSelected(dep)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, border: `0.5px solid ${dm ? phaseConfig[dm.phase].color + '40' : '#E5E7EB'}`, background: dm ? phaseConfig[dm.phase].bg : '#F9FAFB', color: dm ? phaseConfig[dm.phase].color : '#9CA3AF', cursor: 'pointer', fontFamily: "'Lexend', sans-serif" }}>{dm ? dm.name : dep}</button>
                    })}
                  </div>
                </div>
              )}

              {/* DB tables */}
              {mod.data.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>DB tables</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {mod.data.map(d => <code key={d} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 8, background: '#F3F4F6', color: '#44483E', fontFamily: 'monospace' }}>{d}</code>)}
                  </div>
                </div>
              )}

              {/* Features */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Features</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {mod.features.map((f, i) => (
                    <div key={i} style={{ fontSize: 13, color: '#44483E', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: '#0D631B', flexShrink: 0, marginTop: 1 }}>·</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tech */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Technical approach</div>
                <div style={{ fontSize: 12, color: '#44483E', lineHeight: 1.6, fontFamily: 'monospace', background: '#F9FAF7', padding: '10px 14px', borderRadius: 10 }}>{mod.tech}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
