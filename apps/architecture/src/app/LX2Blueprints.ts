// ─── Service Blueprint data ────────────────────────────────────────────────────
// Each blueprint = one end-to-end user journey shown as a horizontal table.
// Layers (top → bottom): Evidence / User action / Frontstage / ─ visibility ─
//                        / Backstage / Systems / Notes
// ─────────────────────────────────────────────────────────────────────────────

export type BPStatus = 'done' | 'building' | 'planned'

export type BlueprintStep = {
  id: string
  label: string        // column header
  moduleId?: string    // links to a module in LX2Architecture
  status: BPStatus
  evidence: string[]   // physical evidence visible to the user (URLs, messages)
  userAction: string   // one sentence: what the user does at this step
  frontstage: string[] // visible UI — components, pages, feedback
  backstage: string[]  // server actions, invisible logic, DB writes
  systems: string[]    // external systems invoked (Supabase, Clerk, etc.)
  notes?: string[]     // error states, edge cases, known gaps
}

export type ServiceBlueprint = {
  id: string
  label: string
  description: string
  steps: BlueprintStep[]
}

export const blueprints: ServiceBlueprint[] = [

  // ── 1. Player — join via invite link ───────────────────────────────────────
  {
    id: 'invite_join',
    label: 'Player — join via invite link',
    description: 'A player receives a WhatsApp invite link, joins the event anonymously, scores hole-by-hole, watches the live leaderboard, and reviews their round summary.',
    steps: [
      {
        id: 'ij_landing',
        label: 'Event landing page',
        moduleId: 'event_landing',
        status: 'done',
        evidence: [
          'WhatsApp message containing /events/[id] URL',
          'Browser address bar: lx2.golf/events/[id]',
        ],
        userAction: 'Receives WhatsApp link from organiser; taps to open in browser.',
        frontstage: [
          '/events/[id] server component renders immediately',
          'Event header: name, date, course, format',
          'Live player list — updates as others join (RealtimeRefresher)',
          'Join form below: name input + handicap input + Join button',
        ],
        backstage: [
          'page.tsx: createClient() → SELECT events JOIN courses JOIN event_players WHERE event_id',
          'RealtimeRefresher mounts: subscribes to event_players postgres_changes for this event',
          'No auth check — fully public route',
        ],
        systems: [
          'Supabase Postgres (SELECT events, event_players)',
          'Supabase Realtime (event_players subscription)',
        ],
        notes: [
          'Public — no account required at this step',
          'Event not found → 404 (handled in page.tsx)',
          'Signed-in users skip the join form and go straight to their scorecard',
        ],
      },
      {
        id: 'ij_join',
        label: 'Join form',
        moduleId: 'invite',
        status: 'done',
        evidence: [
          'Join form on /events/[id]',
          'Redirect to /rounds/[scorecardId]/score on success',
        ],
        userAction: 'Types display name + handicap index; taps Join.',
        frontstage: [
          'Name input (required), handicap input (numeric), Join button',
          'Client-side validation: name non-empty, HC is valid number',
          'Loading state on button while server action runs',
        ],
        backstage: [
          'joinEvent() server action called with (eventId, name, handicapIndex):',
          '→ INSERT event_players (event_id, name, handicap_index, rsvp_status="pending", user_id=null for anon)',
          '→ INSERT scorecards (event_id, event_player_id, round_type)',
          '→ sets join_token cookie = scorecardId — ties anon session to scorecard',
          '→ Returns { scorecardId } for redirect',
          'Supabase Realtime broadcasts new event_players row to organiser\'s landing page',
        ],
        systems: [
          'Supabase Postgres (INSERT event_players, INSERT scorecards)',
          'Cookie storage (join_token — HttpOnly, SameSite=Lax)',
        ],
        notes: [
          'Signed-in user: user_id set on event_players row; join_token still set for scorecard lookup',
          'join_token = the scorecard ID — used by score/page.tsx to verify access',
          'RealtimeRefresher broadcasts insert → organiser sees player appear on landing page',
        ],
      },
      {
        id: 'ij_score',
        label: 'Score entry',
        moduleId: 'score_entry',
        status: 'done',
        evidence: [
          'Redirect to /rounds/[scorecardId]/score',
          'URL contains own scorecard ID',
        ],
        userAction: 'Scores each hole using quick-pick buttons or stepper; watches running total.',
        frontstage: [
          'ScoreEntryLive.tsx: hole header (number, par, SI, yards/metres)',
          'Quick-pick buttons: par−1, par, par+1, par+2, par+3 (48px+ targets)',
          'Stepper modal for unusual scores (−/+ buttons + Save)',
          'Running Stableford total in header after hole 1',
          'Pick up / NR option — persisted as null gross_strokes',
          'Undo button — removes saved score, returns to entry state',
          'Bottom bar: current standings → tap to expand group leaderboard panel',
          '"Finish round" banner + "View summary →" CTA when all holes complete',
        ],
        backstage: [
          'page.tsx (server): SELECT scorecard + event + hole data (combination_id → loop_1+loop_2 holes, or loop_id for 9-hole)',
          'saveScore() server action per hole:',
          '→ UPSERT hole_scores (scorecard_id, hole_number, gross_strokes, stableford_points)',
          '→ is_event_participant() SECURITY DEFINER validates write permission',
          'Offline path: score written to IndexedDB queue (lib/offline-queue.ts), drained on reconnect with per-scorecard guard',
          'Supabase Realtime INSERT on hole_scores triggers broadcast to all group members',
        ],
        systems: [
          'Supabase Postgres (UPSERT hole_scores; RLS via is_event_participant())',
          'Supabase Realtime (postgres_changes on hole_scores)',
          'IndexedDB (offline queue — idb-style wrapper)',
          '@lx2/scoring (stableford points computed client-side before save)',
        ],
        notes: [
          'Organiser RLS: event creator can UPSERT hole_scores for any player in their event',
          'Own scores: local useReducer state (zero latency). Others\' scores: via Realtime subscription',
          'Marker mode: organiser navigates to guest\'s URL — "Scoring for [Name]" amber banner shown',
        ],
      },
      {
        id: 'ij_leaderboard',
        label: 'Live leaderboard',
        moduleId: 'leaderboard_live',
        status: 'done',
        evidence: [
          'Bottom bar in score entry showing current standings',
          'Expandable overlay over scorecard',
        ],
        userAction: 'Taps bottom bar to expand full group leaderboard panel mid-round.',
        frontstage: [
          'Absolute-positioned overlay over the scorecard (no page navigation)',
          'Player rows: avatar colour chip, name, running score, holes completed',
          'Sorted by Stableford points (desc) or net strokes (asc)',
          '"Through X" holes counter per player',
          'Organiser: tap any player row → navigate to their scorecard (marker mode)',
          'Collapse: tap bottom bar again or tap outside panel',
        ],
        backstage: [
          'ScoreEntryLive.tsx: single postgres_changes subscription on hole_scores',
          '→ Filtered to all scorecard IDs in the event (fetched at page load)',
          '→ On INSERT/UPDATE: re-runs computeLeaderboard(allScores, holeData, players)',
          '→ On DELETE: removes hole entry from liveScores state',
          'computeLeaderboard() from @lx2/leaderboard: format-aware, handicap-adjusted',
          'Own player\'s scores: local reducer state (not via Realtime)',
        ],
        systems: [
          'Supabase Realtime (postgres_changes on hole_scores, filtered by scorecard IDs)',
          '@lx2/leaderboard (computeLeaderboard — pure TS, no DB dependency)',
        ],
        notes: [
          'Subscription scope: scorecard IDs fetched at page mount — if Group 2 joins mid-round, Group 1 needs refresh to include new scorecards in subscription filter',
          'Public leaderboard at /events/[id]/leaderboard always shows all players (server-fetched per request)',
        ],
      },
      {
        id: 'ij_summary',
        label: 'Round summary',
        moduleId: 'round_summary',
        status: 'done',
        evidence: [
          '"Finish round" banner at bottom of score entry',
          '"View summary →" link → /rounds/[scorecardId]',
        ],
        userAction: 'Taps "View summary →" after completing all holes; reviews chart and scorecard.',
        frontstage: [
          'Hero: big total (Stableford pts or gross), vs-par label, course + format + date',
          'Hole-by-hole SVG line chart (score vs par, colour-coded dots: birdie/par/bogey/double+)',
          'Full scorecard table: front 9 + back 9, par row, SI row, strokes, points, sub-totals',
          'Group leaderboard section when 2+ players in event',
          '"Continue scoring" CTA when round is incomplete',
        ],
        backstage: [
          'Pure server component — zero client JS on the summary itself',
          'SELECT hole_scores WHERE scorecard_id',
          'SELECT scorecard + event + course/combination',
          'SELECT loop/combination hole data (same resolution as score entry page)',
          'SVG chart generated server-side from hole_scores array',
          'Group leaderboard: SELECT all scorecards + hole_scores for event → computeLeaderboard()',
        ],
        systems: [
          'Supabase Postgres (SELECT — multiple joins)',
          '@lx2/leaderboard (computeLeaderboard for group section)',
        ],
        notes: [
          'Auth-gated: own scorecard (via join_token cookie or user_id) OR event.created_by = current user',
          'Accessible from /rounds list, "Finish round" banner, and /play recent rounds',
        ],
      },
    ],
  },

  // ── 2. Organiser — create and run an event ─────────────────────────────────
  {
    id: 'org_run',
    label: 'Organiser — create & run an event',
    description: 'An organiser signs in, creates an event via the round wizard, invites players, confirms them on the manage page, runs scoring via marker mode, and monitors the live leaderboard.',
    steps: [
      {
        id: 'or_auth',
        label: 'Sign in',
        moduleId: 'auth',
        status: 'done',
        evidence: [
          'lx2.golf homepage — "Sign in" CTA in nav or hero',
          '/auth/login URL',
        ],
        userAction: 'Taps Sign in on homepage; chooses Google OAuth or email+password.',
        frontstage: [
          '/auth/login: sage #F0F4EC bg, white card, three-part header',
          'Google "Sign in with Google" button (primary)',
          'Email + password form (secondary)',
          '/auth/signup: full-name field, password strength indicator (weak/medium/strong bar)',
        ],
        backstage: [
          'Google OAuth flow: Supabase Auth → Google OAuth 2.0 → redirect to /auth/callback',
          '/auth/callback route.ts:',
          '→ supabase.auth.exchangeCodeForSession(code)',
          '→ createAdminClient() (service-role key — bypasses RLS)',
          '→ UPSERT users (id, email, display_name from user_metadata.full_name, created_at)',
          'Session persisted to SSR cookies via @supabase/ssr (supabase/server.ts)',
        ],
        systems: [
          'Supabase Auth (session management)',
          'Google OAuth 2.0 (Cloud Console client)',
          'createAdminClient — service-role key for user upsert',
          '@supabase/ssr (cookie-based session)',
        ],
        notes: [
          'Email signup: Supabase sends confirmation email → user confirms → sets password',
          'Auth callback uses admin client (not anon) to avoid INSERT RLS policy on users table',
        ],
      },
      {
        id: 'or_dashboard',
        label: '/play dashboard',
        moduleId: 'player_home',
        status: 'done',
        evidence: [
          '/play URL (post-login redirect)',
          'Display name + handicap badge in hero',
        ],
        userAction: 'Lands on player dashboard; taps "Start a new round".',
        frontstage: [
          'PlayDashboard.tsx: Manrope 800 display name + green handicap badge',
          '3 stat cards: Total rounds / Avg score / Best score (shows "—" when no data)',
          'Primary CTA: "Start a new round" → /play/new',
          'Recent rounds list → each links to /rounds/[id] summary',
          'Bottom nav: Home / Rounds / Events / Society / Profile',
        ],
        backstage: [
          'page.tsx: SELECT users WHERE id=userId → handicap_index, display_name',
          'SELECT COUNT(*) FROM scorecards JOIN event_players WHERE user_id → roundsCount',
          'Props passed to client PlayDashboard — no client DB calls',
        ],
        systems: ['Supabase Postgres (SELECT users, COUNT scorecards)'],
      },
      {
        id: 'or_wizard',
        label: 'New round wizard',
        moduleId: 'event_create',
        status: 'done',
        evidence: [
          '/play/new URL',
          '4-step wizard: venue → combination → players → format',
        ],
        userAction: 'Selects venue, picks 18-hole combination, adds players with HCs, picks format, taps Start.',
        frontstage: [
          'Step 1 — Venue: course cards (name, flag, location, combo count), search + continent filter',
          'Step 2 — Combination: all loop pairs grouped, coloured tee swatches, WHS badge, CR/slope (read-only)',
          'Step 3 — Players: up to 4 rows (avatar chip, name, HC, tee selector); search registered users; Remove × on rows 2–4',
          'Step 4 — Format: Stableford / Stroke Play / Match Play cards + HC allowance % stepper; "Start round" button',
        ],
        backstage: [
          'Steps 1–3: fully client-side — COURSES from lib/courses.ts (static JSON)',
          'searchUsers(query) server action: SELECT users WHERE display_name ILIKE \'%query%\' LIMIT 5',
          '"Start round" → startRound() server action:',
          '→ INSERT events (name, date, course_id, combination_id, format, allowance_pct, share_code)',
          '  share_code = crypto.randomBytes(6) filtered to exclude 0/O/1/I/L, uppercased',
          '→ INSERT event_players × N (user_id or null, name, handicap_index, tee_colour)',
          '→ INSERT scorecards × N (event_id, event_player_id, round_type)',
          '→ redirect("/rounds/[userScorecardId]/score")',
        ],
        systems: [
          'Supabase Postgres (INSERT events, event_players, scorecards)',
          'packages/course-data (JSON source for venue/combo/tee data)',
          'Node crypto (share_code generation)',
        ],
        notes: [
          'share_code has UNIQUE constraint — extremely rare collision handled by retry',
          'Guest players: user_id=null, identified by name only for the session',
          'All 3 inserts in one server action call (not wrapped in explicit transaction — risk of partial state on crash)',
        ],
      },
      {
        id: 'or_invite',
        label: 'Invite players',
        moduleId: 'invite',
        status: 'done',
        evidence: [
          '/events/[id] URL (generated at event creation)',
          'Share code chip in score entry header (6 chars)',
        ],
        userAction: 'Copies event URL or share code → pastes into group WhatsApp chat.',
        frontstage: [
          'Share code chip in ScoreEntryLive header: tappable pill, shows 6-char code',
          '"✓ Copied" feedback text for 2s on tap',
          'Players landing on /events/[id] see live-updating player list',
          '/events/[id]/manage: organiser sees all event_players + RSVP status',
        ],
        backstage: [
          'Share code chip: navigator.clipboard.writeText(shareCode) — client-side only; no server call',
          'Each player who joins: joinEvent() server action (see Blueprint 1, step 2)',
          'RealtimeRefresher on /events/[id]: postgres_changes on event_players → player list updates live',
          'confirmPlayer() server action at /events/[id]/manage:',
          '→ Verify caller is event.created_by',
          '→ UPDATE event_players SET rsvp_status="confirmed"',
          '→ INSERT scorecards if none exists yet for that player',
        ],
        systems: [
          'Browser Clipboard API (share code copy)',
          'Supabase Postgres (UPDATE event_players, INSERT scorecards)',
          'Supabase Realtime (event_players changes broadcast to /events/[id])',
        ],
      },
      {
        id: 'or_marker',
        label: 'Marker mode',
        moduleId: 'score_entry',
        status: 'done',
        evidence: [
          'Own scorecard at /rounds/[scorecardId]/score',
          'Leaderboard panel overlay showing all players',
          'Amber banner: "Scoring for [Name]" on guest scorecard',
        ],
        userAction: 'Scores own holes; taps another player in leaderboard panel to score for them.',
        frontstage: [
          'Leaderboard panel: all event_players listed, tappable rows',
          'Tap player row → client-side router.push("/rounds/[theirScorecardId]/score")',
          'Amber "Scoring for [Name]" banner on guest scorecard',
          'Same score entry UI — quick picks, stepper, undo all work for guest',
        ],
        backstage: [
          'RLS: is_event_participant() SECURITY DEFINER function:',
          '→ Checks if auth.uid() = event.created_by for the scorecard\'s event',
          '→ Returns true → organiser can UPSERT hole_scores for any player',
          'Navigation between scorecards: client-side router.push() — no page reload',
          'Scorecard page (server) re-fetches hole data + existing scores on each navigation',
        ],
        systems: [
          'Supabase Postgres (RLS via is_event_participant() SECURITY DEFINER)',
          'Next.js App Router (client-side navigation)',
        ],
      },
      {
        id: 'or_leaderboard',
        label: 'Live leaderboard + TV',
        moduleId: 'leaderboard_live',
        status: 'done',
        evidence: [
          '/events/[id]/leaderboard URL (shareable, no login required)',
          '/events/[id]/leaderboard/tv URL for TV/projector display',
        ],
        userAction: 'Shares leaderboard URL to group chat; optionally casts TV mode to clubhouse screen.',
        frontstage: [
          '/events/[id]/leaderboard: standings table, "through X holes" per player, NTP/LD panels',
          'Share button: copies URL to clipboard',
          '/events/[id]/leaderboard/tv: dark #0a1f0a fullscreen, two-column layout (standings + NTP/LD), auto-scrolls when > 8 players',
          'No login required — publicly accessible for public events',
        ],
        backstage: [
          'fetchEventLeaderboardData(id): SELECT event + scorecards + all hole_scores + hole data',
          'computeLeaderboard() from @lx2/leaderboard: format-aware Stableford/Stroke ranking',
          'TVClient.tsx: Supabase Realtime postgres_changes subscription on hole_scores (same as score entry)',
          'Updates computeLeaderboard() on each score change → re-renders standings',
        ],
        systems: [
          'Supabase Postgres (SELECT — full event data fetch)',
          'Supabase Realtime (postgres_changes on hole_scores)',
          '@lx2/leaderboard (computeLeaderboard)',
        ],
        notes: [
          'Public leaderboard is always current — server-fetches all scores per request (ISR would stale)',
          'TV mode auto-scroll: CSS animation triggered when player count exceeds viewport',
        ],
      },
    ],
  },

  // ── 3. Second group — join via share code ──────────────────────────────────
  {
    id: 'group_join',
    label: 'Second group — join via share code',
    description: 'A second group of players join an in-progress event using the 6-character share code from the organiser. Both groups end up as event_players on the same event — the leaderboard immediately shows all 8 players.',
    steps: [
      {
        id: 'gj_copy',
        label: 'Organiser copies code',
        moduleId: 'group_joining',
        status: 'done',
        evidence: [
          'Share code chip in score entry header (e.g. "XK7PM2")',
          '"✓ Copied" text feedback',
        ],
        userAction: 'Organiser (Group 1) taps the share code chip in the score entry header.',
        frontstage: [
          'Share code chip: teal-green pill in ScoreEntryLive header',
          'Displays the 6-character code',
          '"✓ Copied" text replaces chip label for 2 seconds, then reverts',
        ],
        backstage: [
          'navigator.clipboard.writeText(event.share_code) — client-side only',
          'No server call on tap — share_code already in component props from page load',
          'share_code stored on events row at event creation (crypto.randomBytes(6), no confusable chars)',
        ],
        systems: ['Browser Clipboard API'],
        notes: [
          'Share code excludes confusable characters: 0/O and 1/I/L',
          'Organiser pastes code into WhatsApp or shares verbally with Group 2',
        ],
      },
      {
        id: 'gj_navigate',
        label: 'Group 2 opens /play/join',
        moduleId: 'group_joining',
        status: 'done',
        evidence: [
          '/play/join URL',
          '"Join a group\'s round" ghost CTA on /play dashboard',
        ],
        userAction: 'Group 2 player navigates to /play/join via dashboard CTA or direct URL.',
        frontstage: [
          'JoinRoundFlow.tsx step 1: large code input (6-char, auto-uppercase)',
          '"Find round" button',
          'CTA on /play dashboard: "Join a group\'s round" — shown when no active round',
        ],
        backstage: [
          'page.tsx: auth check — if signed in, SELECT users for display_name pre-fill',
          'Redirect to /auth/login if not authenticated and auth required',
          'No DB query on page load — only on code submission',
        ],
        systems: ['Supabase Auth (session check)', 'Supabase Postgres (optional user SELECT if signed in)'],
      },
      {
        id: 'gj_lookup',
        label: 'Code lookup',
        moduleId: 'group_joining',
        status: 'done',
        evidence: [
          'Event preview card appears on valid code',
          'Error message on invalid code',
        ],
        userAction: 'Types 6-character share code; taps Find.',
        frontstage: [
          'Event preview card: course name, format, date, existing player count',
          'Error state: "No round found with that code" on invalid/expired code',
          'Loading indicator while lookupRound runs',
        ],
        backstage: [
          'lookupRound(code) server action:',
          '→ SELECT events JOIN courses WHERE share_code = UPPER(code)',
          '→ SELECT COUNT(event_players) WHERE event_id for existing player count',
          '→ Returns { eventId, courseName, format, date, existingPlayerCount }',
          '→ Error if not found: { error: "No round found with that code" }',
        ],
        systems: ['Supabase Postgres (SELECT events WHERE share_code — UNIQUE index lookup)'],
        notes: [
          'share_code has UNIQUE index — O(1) lookup regardless of total event count',
          'Code normalised to UPPER() before query — case-insensitive entry',
        ],
      },
      {
        id: 'gj_players',
        label: 'Add Group 2 players',
        moduleId: 'group_joining',
        status: 'done',
        evidence: [
          'Player rows appear below event preview',
          'First row pre-filled with signed-in user\'s name',
        ],
        userAction: 'Adds 1–4 players with names + handicaps; taps "Join round".',
        frontstage: [
          'Player rows: avatar colour chip, name input, handicap input',
          '+ Add player / × Remove buttons',
          'Signed-in user: first row pre-filled with display_name',
          '"Join round" submit button — shows player count',
        ],
        backstage: [
          'joinRound(eventId, roundType, players[]) server action:',
          '→ INSERT event_players × N rows — same event_id as Group 1',
          '→ INSERT scorecards × N rows',
          '→ Returns { scorecardId: players[0].scorecardId } for redirect',
          'No new event created — Group 2 joins the SAME event as Group 1',
        ],
        systems: ['Supabase Postgres (INSERT event_players, INSERT scorecards)'],
        notes: [
          'Inserted event_players share the same event_id as Group 1 — single combined event',
          'Group 1\'s manage page (/events/[id]/manage) will show Group 2 players with rsvp_status="pending"',
        ],
      },
      {
        id: 'gj_score',
        label: 'Score + combined leaderboard',
        moduleId: 'score_entry',
        status: 'done',
        evidence: [
          'Redirect to /rounds/[scorecardId]/score for first Group 2 player',
          'Leaderboard panel shows all 8 players',
        ],
        userAction: 'Group 2 scores normally; leaderboard panel shows all players from both groups.',
        frontstage: [
          'Score entry identical to any other player',
          'Leaderboard panel: all event_players (both groups) sorted by score',
          'Group 1 players visible in standings alongside Group 2',
        ],
        backstage: [
          'Score entry page.tsx fetches all scorecards for the event on load',
          'Realtime subscription created with all scorecard IDs (both groups)',
          'computeLeaderboard() processes all event_players — format-aware, handicap-adjusted',
          'Group 1 sessions: if still mounted from before Group 2 joined, their subscription may not include Group 2 scorecard IDs until page refresh',
        ],
        systems: [
          'Supabase Realtime (hole_scores subscription — all event scorecard IDs)',
          '@lx2/leaderboard (computeLeaderboard)',
          'Supabase Postgres (UPSERT hole_scores)',
        ],
        notes: [
          'Known gap: Group 1 Realtime subscription (set at their page mount) filters by scorecard IDs at that time — Group 2 scorecards added later are not in filter. Group 1 sees Group 2 scores only after page refresh.',
          'Public leaderboard at /events/[id]/leaderboard always shows all 8 players (server-fetched)',
          'TV mode at /events/[id]/leaderboard/tv also shows all players — Realtime subscription fetches all scorecard IDs on mount',
        ],
      },
    ],
  },

  // ── 4. Solo scorer — start a round and review history ─────────────────────
  {
    id: 'solo_score',
    label: 'Solo scorer — start round, review history',
    description: 'A signed-in player creates a solo round via the wizard, scores hole-by-hole, reviews their round summary, and browses their full history via the Rounds and Events lists.',
    steps: [
      {
        id: 'ss_auth',
        label: 'Sign in',
        moduleId: 'auth',
        status: 'done',
        evidence: ['lx2.golf homepage — Sign in CTA', '/auth/login'],
        userAction: 'Signs in via Google OAuth or email+password.',
        frontstage: [
          '/auth/login: Google button + email form on sage background',
          '/auth/signup: full name + email + password with strength indicator',
        ],
        backstage: [
          'Supabase Auth OAuth flow → /auth/callback',
          'createAdminClient() UPSERT users (display_name, email, created_at)',
          'SSR session cookie set via @supabase/ssr',
        ],
        systems: ['Supabase Auth', 'Google OAuth 2.0', 'createAdminClient (service-role)'],
      },
      {
        id: 'ss_wizard',
        label: 'New round wizard',
        moduleId: 'event_create',
        status: 'done',
        evidence: ['/play/new URL', '4-step wizard UI'],
        userAction: 'Picks venue, combination, sets own player row (HC + tee), chooses format, taps Start.',
        frontstage: [
          'Step 1: venue search (course name, flag, continent filter)',
          'Step 2: combination picker (tee swatches, WHS badge, CR/slope)',
          'Step 3: own player row pre-filled with display_name; single row for solo',
          'Step 4: format + HC allowance + Start round button',
        ],
        backstage: [
          'Steps 1–3: client-side COURSES data from lib/courses.ts',
          'startRound() server action:',
          '→ INSERT events (share_code, format, combination_id, date)',
          '→ INSERT event_players (user_id, handicap_index, tee_colour)',
          '→ INSERT scorecards (event_id, event_player_id, round_type)',
          '→ redirect("/rounds/[scorecardId]/score")',
        ],
        systems: [
          'Supabase Postgres (INSERT events, event_players, scorecards)',
          'packages/course-data (static JSON)',
          'Node crypto (share_code)',
        ],
      },
      {
        id: 'ss_score',
        label: 'Score entry',
        moduleId: 'score_entry',
        status: 'done',
        evidence: ['/rounds/[scorecardId]/score URL'],
        userAction: 'Scores 9 or 18 holes via quick picks and stepper; monitors running Stableford total.',
        frontstage: [
          'ScoreEntryLive.tsx: hole header, quick picks (par−1 to par+3), stepper',
          'Running Stableford total in header',
          'Full scorecard view (tap to review all holes so far)',
          '"Finish round" banner + "View summary →" when complete',
          'No leaderboard panel for solo (only 1 player)',
        ],
        backstage: [
          'saveScore() server action: UPSERT hole_scores per hole',
          'is_event_participant() RLS validates own scorecard write',
          'Offline: IndexedDB queue if no connectivity',
          'No Realtime subscription needed for solo (no group)',
        ],
        systems: [
          'Supabase Postgres (UPSERT hole_scores)',
          'IndexedDB (offline queue)',
          '@lx2/scoring (stableford points)',
        ],
      },
      {
        id: 'ss_summary',
        label: 'Round summary',
        moduleId: 'round_summary',
        status: 'done',
        evidence: ['"View summary →" → /rounds/[scorecardId]'],
        userAction: 'Reviews SVG hole chart, full scorecard table, and total score.',
        frontstage: [
          'Hero: total Stableford pts (or gross), vs-par label, course + format + date',
          'SVG hole chart: score vs par, colour-coded dots (birdie/par/bogey/double+)',
          'Full scorecard table: front/back 9, par, SI, strokes, points, totals',
          'No group leaderboard section (solo round)',
        ],
        backstage: [
          'Pure server component — zero client JS',
          'SELECT hole_scores + scorecard + event + loop/combination hole data',
          'SVG chart computed server-side',
        ],
        systems: ['Supabase Postgres (SELECT)'],
      },
      {
        id: 'ss_history',
        label: 'Browse history',
        moduleId: 'rounds_list',
        status: 'done',
        evidence: [
          '/rounds — all personal rounds (bottom nav "Rounds" tab)',
          '/events — all events played (bottom nav "Events" tab)',
          '/profile — account settings (bottom nav "Profile" tab)',
        ],
        userAction: 'Browses round history, events list, and updates profile settings.',
        frontstage: [
          '/rounds: chronological list of all rounds → each links to /rounds/[id] summary',
          '/events: all events where user is confirmed event_player → links to /events/[id]',
          '/profile: display name (inline edit), handicap (inline edit), avatar upload, yards/metres toggle',
        ],
        backstage: [
          '/rounds: SELECT scorecards JOIN event_players WHERE user_id ORDER BY created_at DESC',
          '/events: SELECT event_players JOIN events WHERE user_id AND rsvp_status="confirmed"',
          '/profile updates: updateProfile() → UPDATE users SET display_name, handicap_index',
          'updateAvatarUrl() → upload to Supabase Storage → UPDATE users SET avatar_url',
          'updateDistanceUnit() → UPDATE users SET distance_unit ("yards" | "metres")',
        ],
        systems: [
          'Supabase Postgres (SELECT scorecards, event_players, events)',
          'Supabase Storage (avatar uploads)',
        ],
        notes: [
          'distance_unit preference flows through to score entry (yards/metres display) and round summary',
          'All profile updates use server actions with revalidatePath() for immediate UI refresh',
        ],
      },
    ],
  },

]
