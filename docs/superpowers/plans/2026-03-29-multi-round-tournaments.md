# Multi-Round Tournaments + Order of Merit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-round tournaments with cumulative scoring and a season-long Order of Merit points system on top of the existing single-event scoring platform.

**Architecture:** Two additive database layers (tournaments → events linkage, order_of_merits → entries) with on-the-fly standings computation. No changes to existing event creation, scoring, or leaderboard flows. New pages follow existing hero-banner + CSS-in-JSX patterns.

**Tech Stack:** Next.js 15 App Router, Supabase Postgres + RLS, CSS-in-JSX `<style>` blocks, `@lx2/scoring` package (read-only), Vitest for tests.

**Spec:** `docs/superpowers/specs/2026-03-29-multi-round-tournaments-design.md`

---

## File Structure

### New files

| File | Responsibility |
|------|---------------|
| `packages/db/migrations/011_tournaments.sql` | DB migration: tournaments, events columns, order_of_merits, order_of_merit_entries, RLS, indexes, triggers |
| `apps/web/src/app/tournaments/page.tsx` | Hub page: active tournaments, order of merit, standalone events |
| `apps/web/src/app/tournaments/new/page.tsx` | Server component: load courses/combinations for wizard |
| `apps/web/src/app/tournaments/new/actions.ts` | `createTournament` server action |
| `apps/web/src/app/tournaments/new/NewTournamentWizard.tsx` | 3-step wizard: Details → Rounds → Review |
| `apps/web/src/app/tournaments/[id]/page.tsx` | Tournament overview: round schedule + cumulative standings |
| `apps/web/src/app/tournaments/[id]/manage/page.tsx` | Manage: add/remove rounds, reorder, finalise |
| `apps/web/src/app/tournaments/[id]/manage/actions.ts` | `addRound`, `removeRound`, `reorderRounds`, `finaliseTournament`, `unfinaliseTournament` |
| `apps/web/src/lib/tournaments/standings.ts` | Pure function: compute cumulative standings from event data |
| `apps/web/src/lib/tournaments/standings.test.ts` | Vitest tests for standings computation |
| `apps/web/src/app/merit/page.tsx` | Order of Merit list page |
| `apps/web/src/app/merit/new/page.tsx` | Server component: load data for wizard |
| `apps/web/src/app/merit/new/actions.ts` | `createMerit` server action |
| `apps/web/src/app/merit/new/NewMeritWizard.tsx` | 4-step wizard: Details → Points → Events → Review |
| `apps/web/src/app/merit/[id]/page.tsx` | Merit standings page |
| `apps/web/src/app/merit/[id]/manage/page.tsx` | Manage merit entries |
| `apps/web/src/app/merit/[id]/manage/actions.ts` | `addEntry`, `removeEntry`, `updateMultiplier` |
| `apps/web/src/lib/merit/points.ts` | Pure function: compute merit standings |
| `apps/web/src/lib/merit/points.test.ts` | Vitest tests for merit points |
| `apps/web/src/lib/merit/presets.ts` | Points template presets (Standard, Flat, Participation-heavy) |

### Modified files

| File | Change |
|------|--------|
| `apps/web/src/components/BottomNav.tsx` | Change "Tournaments" href from `/events` to `/tournaments` |
| `apps/web/src/middleware.ts` | Add `/tournaments/new`, `/tournaments/:id/manage`, `/merit/new`, `/merit/:id/manage` to matcher |
| `apps/web/next.config.ts` | Add redirect `/events` → `/tournaments` |
| `apps/web/src/app/events/[id]/page.tsx` | Add tournament badge/banner if event has `tournament_id` |

---

## Task 1: Database Migration

**Files:**
- Create: `packages/db/migrations/011_tournaments.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- ═══════════════════════════════════════════════════════════════════════════════
-- 011: Multi-round tournaments + Order of Merit
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Tournaments table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tournaments (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by  uuid        NOT NULL REFERENCES public.users(id),
  name        text        NOT NULL,
  description text,
  format      text        NOT NULL CHECK (format IN ('stableford', 'strokeplay')),
  status      text        NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'completed')),
  finalised   boolean     NOT NULL DEFAULT false,
  dns_policy  text        NOT NULL DEFAULT 'exclude' CHECK (dns_policy IN ('exclude', 'penalty')),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournaments_select" ON tournaments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "tournaments_insert" ON tournaments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "tournaments_update" ON tournaments
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "tournaments_delete" ON tournaments
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- ── Add tournament columns to events ────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'tournament_id'
  ) THEN
    ALTER TABLE events ADD COLUMN tournament_id uuid REFERENCES tournaments(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'round_number'
  ) THEN
    ALTER TABLE events ADD COLUMN round_number smallint;
  END IF;
END $$;

-- Both set or both null
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_tournament_round_check;
ALTER TABLE events ADD CONSTRAINT events_tournament_round_check
  CHECK ((tournament_id IS NULL) = (round_number IS NULL));

-- No duplicate round numbers within a tournament
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'events_tournament_round_unique'
  ) THEN
    CREATE UNIQUE INDEX events_tournament_round_unique ON events(tournament_id, round_number)
      WHERE tournament_id IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_events_tournament ON events(tournament_id) WHERE tournament_id IS NOT NULL;

-- ── Order of Merits table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_of_merits (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by            uuid        NOT NULL REFERENCES public.users(id),
  name                  text        NOT NULL,
  season_year           smallint    NOT NULL,
  best_of               smallint,
  points_template       jsonb       NOT NULL,
  participation_points  smallint    NOT NULL DEFAULT 0,
  status                text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE order_of_merits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_of_merits_select" ON order_of_merits
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "order_of_merits_insert" ON order_of_merits
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "order_of_merits_update" ON order_of_merits
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "order_of_merits_delete" ON order_of_merits
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- ── Order of Merit Entries ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_of_merit_entries (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  merit_id          uuid        NOT NULL REFERENCES order_of_merits(id) ON DELETE CASCADE,
  event_id          uuid        REFERENCES events(id) ON DELETE CASCADE,
  tournament_id     uuid        REFERENCES tournaments(id) ON DELETE CASCADE,
  points_multiplier numeric(3,2) NOT NULL DEFAULT 1.00,
  added_at          timestamptz NOT NULL DEFAULT now(),
  CHECK ((event_id IS NULL) != (tournament_id IS NULL))
);

ALTER TABLE order_of_merit_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "oom_entries_select" ON order_of_merit_entries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "oom_entries_insert" ON order_of_merit_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM order_of_merits WHERE id = merit_id AND created_by = auth.uid())
  );

CREATE POLICY "oom_entries_update" ON order_of_merit_entries
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM order_of_merits WHERE id = merit_id AND created_by = auth.uid())
  );

CREATE POLICY "oom_entries_delete" ON order_of_merit_entries
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM order_of_merits WHERE id = merit_id AND created_by = auth.uid())
  );

-- Unique constraints: no duplicate entries per merit
CREATE UNIQUE INDEX IF NOT EXISTS oom_entries_merit_event_unique
  ON order_of_merit_entries(merit_id, event_id) WHERE event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS oom_entries_merit_tournament_unique
  ON order_of_merit_entries(merit_id, tournament_id) WHERE tournament_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_oom_entries_merit ON order_of_merit_entries(merit_id);

-- ── updated_at trigger ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION lx2_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tournaments_updated_at ON tournaments;
CREATE TRIGGER tournaments_updated_at
  BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION lx2_update_updated_at();

DROP TRIGGER IF EXISTS order_of_merits_updated_at ON order_of_merits;
CREATE TRIGGER order_of_merits_updated_at
  BEFORE UPDATE ON order_of_merits
  FOR EACH ROW EXECUTE FUNCTION lx2_update_updated_at();

-- ── Realtime ────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE order_of_merits;
ALTER PUBLICATION supabase_realtime ADD TABLE order_of_merit_entries;
```

- [ ] **Step 2: Apply the migration**

Run: `cd /Users/mattjohnson/Documents/lx2 && cat packages/db/migrations/011_tournaments.sql`
Verify the file looks correct, then apply via the Supabase MCP `apply_migration` tool or the Supabase dashboard SQL editor.

- [ ] **Step 3: Commit**

```bash
git add packages/db/migrations/011_tournaments.sql
git commit -m "feat: add tournaments + order of merit migration (011)"
```

---

## Task 2: Tournament Standings Pure Function + Tests

**Files:**
- Create: `apps/web/src/lib/tournaments/standings.ts`
- Create: `apps/web/src/lib/tournaments/standings.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/web/src/lib/tournaments/standings.test.ts
import { describe, it, expect } from 'vitest'
import { computeTournamentStandings } from './standings'
import type { TournamentRoundResult, TournamentStanding } from './standings'

describe('computeTournamentStandings', () => {
  const baseRounds: TournamentRoundResult[] = [
    {
      roundNumber: 1,
      finalised: true,
      results: [
        { userId: 'alice', displayName: 'Alice', stablefordTotal: 36, grossTotal: 72 },
        { userId: 'bob', displayName: 'Bob', stablefordTotal: 30, grossTotal: 78 },
      ],
    },
    {
      roundNumber: 2,
      finalised: true,
      results: [
        { userId: 'alice', displayName: 'Alice', stablefordTotal: 34, grossTotal: 74 },
        { userId: 'bob', displayName: 'Bob', stablefordTotal: 38, grossTotal: 70 },
      ],
    },
  ]

  it('sums stableford totals and ranks descending', () => {
    const standings = computeTournamentStandings(baseRounds, 'stableford', 'exclude')
    expect(standings).toHaveLength(2)
    expect(standings[0].displayName).toBe('Alice')
    expect(standings[0].total).toBe(70) // 36 + 34
    expect(standings[1].displayName).toBe('Bob')
    expect(standings[1].total).toBe(68) // 30 + 38
  })

  it('sums strokeplay totals and ranks ascending', () => {
    const standings = computeTournamentStandings(baseRounds, 'strokeplay', 'exclude')
    expect(standings[0].displayName).toBe('Alice')
    expect(standings[0].total).toBe(146) // 72 + 74
    expect(standings[1].displayName).toBe('Bob')
    expect(standings[1].total).toBe(148) // 78 + 70
  })

  it('excludes unfinalised rounds', () => {
    const rounds = [
      { ...baseRounds[0], finalised: true },
      { ...baseRounds[1], finalised: false },
    ]
    const standings = computeTournamentStandings(rounds, 'stableford', 'exclude')
    expect(standings[0].total).toBe(36)
    expect(standings[0].roundsPlayed).toBe(1)
  })

  it('dns_policy exclude: skips missed rounds', () => {
    const rounds: TournamentRoundResult[] = [
      {
        roundNumber: 1,
        finalised: true,
        results: [
          { userId: 'alice', displayName: 'Alice', stablefordTotal: 36, grossTotal: 72 },
          { userId: 'bob', displayName: 'Bob', stablefordTotal: 30, grossTotal: 78 },
        ],
      },
      {
        roundNumber: 2,
        finalised: true,
        results: [
          { userId: 'alice', displayName: 'Alice', stablefordTotal: 34, grossTotal: 74 },
          // Bob did not play round 2
        ],
      },
    ]
    const standings = computeTournamentStandings(rounds, 'stableford', 'exclude')
    // Alice: 36+34=70, Bob: 30
    expect(standings[0].displayName).toBe('Alice')
    expect(standings[0].total).toBe(70)
    expect(standings[1].displayName).toBe('Bob')
    expect(standings[1].total).toBe(30)
    expect(standings[1].roundsPlayed).toBe(1)
  })

  it('dns_policy penalty (stableford): 0 for missed rounds', () => {
    const rounds: TournamentRoundResult[] = [
      {
        roundNumber: 1,
        finalised: true,
        results: [
          { userId: 'alice', displayName: 'Alice', stablefordTotal: 36, grossTotal: 72 },
          { userId: 'bob', displayName: 'Bob', stablefordTotal: 30, grossTotal: 78 },
        ],
      },
      {
        roundNumber: 2,
        finalised: true,
        results: [
          { userId: 'alice', displayName: 'Alice', stablefordTotal: 34, grossTotal: 74 },
        ],
      },
    ]
    const standings = computeTournamentStandings(rounds, 'stableford', 'penalty')
    // Alice: 36+34=70, Bob: 30+0=30
    expect(standings[0].total).toBe(70)
    expect(standings[1].total).toBe(30)
    expect(standings[1].roundsPlayed).toBe(1)
  })

  it('dns_policy penalty (strokeplay): max+10 for missed rounds', () => {
    const rounds: TournamentRoundResult[] = [
      {
        roundNumber: 1,
        finalised: true,
        results: [
          { userId: 'alice', displayName: 'Alice', stablefordTotal: 0, grossTotal: 72 },
          { userId: 'bob', displayName: 'Bob', stablefordTotal: 0, grossTotal: 78 },
        ],
      },
      {
        roundNumber: 2,
        finalised: true,
        results: [
          { userId: 'alice', displayName: 'Alice', stablefordTotal: 0, grossTotal: 74 },
          // Bob missed — max observed in round 2 is 74, penalty = 84
        ],
      },
    ]
    const standings = computeTournamentStandings(rounds, 'strokeplay', 'penalty')
    // Alice: 72+74=146, Bob: 78+84=162
    expect(standings[0].displayName).toBe('Alice')
    expect(standings[0].total).toBe(146)
    expect(standings[1].displayName).toBe('Bob')
    expect(standings[1].total).toBe(162)
  })

  it('tie-breaking: more rounds played wins', () => {
    const rounds: TournamentRoundResult[] = [
      {
        roundNumber: 1,
        finalised: true,
        results: [
          { userId: 'alice', displayName: 'Alice', stablefordTotal: 36, grossTotal: 72 },
        ],
      },
      {
        roundNumber: 2,
        finalised: true,
        results: [
          { userId: 'alice', displayName: 'Alice', stablefordTotal: 0, grossTotal: 72 },
          { userId: 'bob', displayName: 'Bob', stablefordTotal: 36, grossTotal: 72 },
        ],
      },
    ]
    const standings = computeTournamentStandings(rounds, 'stableford', 'exclude')
    // Both have 36 points, but Alice played 2 rounds
    expect(standings[0].displayName).toBe('Alice')
    expect(standings[1].displayName).toBe('Bob')
  })

  it('returns empty array for no finalised rounds', () => {
    const standings = computeTournamentStandings([], 'stableford', 'exclude')
    expect(standings).toEqual([])
  })

  it('excludes players with null userId (anonymous/guest)', () => {
    const rounds: TournamentRoundResult[] = [
      {
        roundNumber: 1,
        finalised: true,
        results: [
          { userId: 'alice', displayName: 'Alice', stablefordTotal: 36, grossTotal: 72 },
          { userId: null, displayName: 'Guest Player', stablefordTotal: 40, grossTotal: 68 },
        ],
      },
    ]
    const standings = computeTournamentStandings(rounds, 'stableford', 'exclude')
    expect(standings).toHaveLength(1)
    expect(standings[0].displayName).toBe('Alice')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/mattjohnson/Documents/lx2 && npx vitest run apps/web/src/lib/tournaments/standings.test.ts`
Expected: FAIL — module `./standings` not found

- [ ] **Step 3: Write the implementation**

```typescript
// apps/web/src/lib/tournaments/standings.ts

export interface PlayerRoundResult {
  userId: string | null
  displayName: string
  stablefordTotal: number
  grossTotal: number
}

export interface TournamentRoundResult {
  roundNumber: number
  finalised: boolean
  results: PlayerRoundResult[]
}

export interface TournamentStanding {
  userId: string
  displayName: string
  roundScores: Record<number, number>  // roundNumber → score used
  roundsPlayed: number
  total: number
  position: number
}

export function computeTournamentStandings(
  rounds: TournamentRoundResult[],
  format: 'stableford' | 'strokeplay',
  dnsPolicy: 'exclude' | 'penalty',
): TournamentStanding[] {
  const finalisedRounds = rounds.filter(r => r.finalised)
  if (finalisedRounds.length === 0) return []

  // Collect all authenticated player IDs
  const playerMap = new Map<string, { displayName: string; roundScores: Map<number, number>; roundsPlayed: number }>()

  for (const round of finalisedRounds) {
    for (const result of round.results) {
      if (result.userId === null) continue // exclude anonymous
      if (!playerMap.has(result.userId)) {
        playerMap.set(result.userId, {
          displayName: result.displayName,
          roundScores: new Map(),
          roundsPlayed: 0,
        })
      }
      const player = playerMap.get(result.userId)!
      const score = format === 'stableford' ? result.stablefordTotal : result.grossTotal
      player.roundScores.set(round.roundNumber, score)
      player.roundsPlayed++
    }
  }

  // Apply DNS penalty for missed rounds
  if (dnsPolicy === 'penalty') {
    for (const round of finalisedRounds) {
      let penaltyScore: number
      if (format === 'stableford') {
        penaltyScore = 0
      } else {
        // max observed strokes in this round + 10
        const maxStrokes = Math.max(...round.results.map(r => r.grossTotal), 0)
        penaltyScore = maxStrokes + 10
      }
      for (const [userId, player] of playerMap) {
        if (!player.roundScores.has(round.roundNumber)) {
          player.roundScores.set(round.roundNumber, penaltyScore)
          // roundsPlayed stays the same — penalty rounds don't count as "played"
        }
      }
    }
  }

  // Compute totals
  const standings: TournamentStanding[] = []
  for (const [userId, player] of playerMap) {
    let total = 0
    const roundScoresObj: Record<number, number> = {}
    for (const [roundNum, score] of player.roundScores) {
      total += score
      roundScoresObj[roundNum] = score
    }
    standings.push({
      userId,
      displayName: player.displayName,
      roundScores: roundScoresObj,
      roundsPlayed: player.roundsPlayed,
      total,
      position: 0,
    })
  }

  // Sort: stableford descending, strokeplay ascending
  // Tie-break: more rounds played → better single-round score → alphabetical
  standings.sort((a, b) => {
    const scoreDiff = format === 'stableford' ? b.total - a.total : a.total - b.total
    if (scoreDiff !== 0) return scoreDiff

    // More rounds played = better
    if (a.roundsPlayed !== b.roundsPlayed) return b.roundsPlayed - a.roundsPlayed

    // Best single-round score
    const aScores = Object.values(a.roundScores)
    const bScores = Object.values(b.roundScores)
    const aBest = format === 'stableford' ? Math.max(...aScores) : Math.min(...aScores)
    const bBest = format === 'stableford' ? Math.max(...bScores) : Math.min(...bScores)
    const bestDiff = format === 'stableford' ? bBest - aBest : aBest - bBest
    if (bestDiff !== 0) return bestDiff

    return a.displayName.localeCompare(b.displayName)
  })

  // Assign positions
  standings.forEach((s, i) => { s.position = i + 1 })

  return standings
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd /Users/mattjohnson/Documents/lx2 && npx vitest run apps/web/src/lib/tournaments/standings.test.ts`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/tournaments/standings.ts apps/web/src/lib/tournaments/standings.test.ts
git commit -m "feat: tournament standings computation with tests"
```

---

## Task 3: createTournament Server Action

**Files:**
- Create: `apps/web/src/app/tournaments/new/actions.ts`

- [ ] **Step 1: Write the server action**

```typescript
// apps/web/src/app/tournaments/new/actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'

export interface TournamentRoundInput {
  roundNumber: number
  date: string              // YYYY-MM-DD
  combinationId: string     // course_combinations.id
  eventName: string         // auto-generated or custom
}

export interface CreateTournamentData {
  name: string
  format: 'stableford' | 'strokeplay'
  dnsPolicy: 'exclude' | 'penalty'
  description?: string
  rounds: TournamentRoundInput[]
  handicapAllowancePct: number
  groupSize: 2 | 3 | 4
}

export async function createTournament(data: CreateTournamentData): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  if (data.rounds.length < 2) throw new Error('Tournament requires at least 2 rounds')

  // Ensure user profile exists
  const { data: profile } = await supabase
    .from('users')
    .select('display_name, handicap_index')
    .eq('id', user.id)
    .single()

  await supabase
    .from('users')
    .upsert(
      { id: user.id, email: user.email!, display_name: profile?.display_name ?? user.email!.split('@')[0] },
      { onConflict: 'id', ignoreDuplicates: true },
    )

  // Create tournament
  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .insert({
      created_by: user.id,
      name: data.name,
      description: data.description || null,
      format: data.format,
      dns_policy: data.dnsPolicy,
    })
    .select('id')
    .single()

  if (tErr || !tournament) throw new Error(`Failed to create tournament: ${tErr?.message ?? 'unknown'}`)

  // Create one event per round
  for (const round of data.rounds) {
    // Resolve course_id from combination
    const { data: combo } = await supabase
      .from('course_combinations')
      .select('course_id')
      .eq('id', round.combinationId)
      .single()

    if (!combo?.course_id) throw new Error(`Course combination not found for round ${round.roundNumber}`)

    const { data: event, error: evErr } = await supabase
      .from('events')
      .insert({
        created_by: user.id,
        course_id: combo.course_id,
        combination_id: round.combinationId,
        name: round.eventName,
        date: round.date,
        format: data.format,
        round_type: '18',
        handicap_allowance_pct: data.handicapAllowancePct / 100,
        group_size: data.groupSize,
        max_players: null,
        ntp_holes: [],
        ld_holes: [],
        entry_fee_pence: null,
        is_public: true,
        finalised: false,
        tournament_id: tournament.id,
        round_number: round.roundNumber,
      })
      .select('id')
      .single()

    if (evErr || !event) throw new Error(`Failed to create round ${round.roundNumber}: ${evErr?.message ?? 'unknown'}`)

    // Register organiser as player for each round
    const { data: ep, error: epErr } = await supabase
      .from('event_players')
      .insert({
        event_id: event.id,
        user_id: user.id,
        display_name: profile?.display_name ?? user.email!.split('@')[0],
        handicap_index: profile?.handicap_index ?? 0,
        rsvp_status: 'confirmed',
      })
      .select('id')
      .single()

    if (epErr || !ep) throw new Error(`Failed to register organiser for round ${round.roundNumber}: ${epErr?.message ?? 'unknown'}`)

    // Create organiser scorecard
    const { error: scErr } = await supabase
      .from('scorecards')
      .insert({ event_id: event.id, event_player_id: ep.id, round_type: '18' })

    if (scErr) throw new Error(`Failed to create scorecard for round ${round.roundNumber}: ${scErr.message}`)
  }

  return tournament.id
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/mattjohnson/Documents/lx2 && npx tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -20`
Expected: No errors related to tournaments/new/actions.ts

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/tournaments/new/actions.ts
git commit -m "feat: createTournament server action"
```

---

## Task 4: Tournament Wizard Page + Component

**Files:**
- Create: `apps/web/src/app/tournaments/new/page.tsx`
- Create: `apps/web/src/app/tournaments/new/NewTournamentWizard.tsx`

- [ ] **Step 1: Write the server page component**

This follows the exact pattern from `apps/web/src/app/events/new/page.tsx` — fetch user, courses, combinations, and pass to client wizard.

```typescript
// apps/web/src/app/tournaments/new/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NewTournamentWizard from './NewTournamentWizard'

export type WizardCombo = {
  id: string
  name: string
  courseName: string
  holes: number
}

export default async function NewTournamentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('display_name, handicap_index')
    .eq('id', user.id)
    .single()

  // Load all course combinations
  const { data: combos } = await supabase
    .from('course_combinations')
    .select('id, name, hole_count, courses ( name )')
    .order('name')

  const combinations: WizardCombo[] = (combos ?? []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    name: c.name as string,
    courseName: (c.courses as Record<string, unknown>)?.name as string ?? '',
    holes: c.hole_count as number ?? 18,
  }))

  return (
    <NewTournamentWizard
      displayName={profile?.display_name ?? user.email!.split('@')[0]}
      combinations={combinations}
    />
  )
}
```

- [ ] **Step 2: Write the wizard client component**

Create `apps/web/src/app/tournaments/new/NewTournamentWizard.tsx` — a 3-step wizard (Details → Rounds → Review) following the exact same CSS-in-JSX, hero banner, step indicator, and form field patterns as `apps/web/src/app/events/new/NewEventWizard.tsx`.

The wizard must:
- Use the same hero banner pattern (160px, gradient overlay, Manrope 800 title "New tournament", back link to `/tournaments`)
- Use the same step indicator pattern (32px gradient circles, SVG tick marks, animated progress line)
- Step 1: Tournament name, format (stableford/strokeplay chips), DNS policy toggle
- Step 2: Add rounds (min 2). Each round: date picker + course/combination picker (reuse same search/card pattern). Rounds auto-numbered. Show round cards with remove button.
- Step 3: Review summary + "Create tournament" button
- Use the same `.wiz-input`, `.wiz-label`, `.format-chip`, `.summary-row` CSS classes
- Call `createTournament` action on submit, redirect to `/tournaments/${id}`

This component is ~400-500 lines. The implementer should copy the structure from `NewEventWizard.tsx` (hero banner lines 318-339, step indicator lines 346-412, form field styles lines 207-316) and adapt for the tournament-specific fields.

Key state variables:
```typescript
const STEP_LABELS = ['Details', 'Rounds', 'Review'] as const
const [step, setStep] = useState<1 | 2 | 3>(1)
const [name, setName] = useState('')
const [format, setFormat] = useState<'stableford' | 'strokeplay'>('stableford')
const [dnsPolicy, setDnsPolicy] = useState<'exclude' | 'penalty'>('exclude')
const [allowancePct, setAllowancePct] = useState(95)
const [groupSize, setGroupSize] = useState<2 | 3 | 4>(4)
const [rounds, setRounds] = useState<Array<{ date: string; combinationId: string; eventName: string }>>([])
```

- [ ] **Step 3: Verify the page renders**

Run the dev server and navigate to `http://localhost:3000/tournaments/new`. Verify:
- Hero banner with "New tournament" title
- Step indicator shows 3 steps
- Form fields render without errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/tournaments/new/page.tsx apps/web/src/app/tournaments/new/NewTournamentWizard.tsx
git commit -m "feat: tournament creation wizard"
```

---

## Task 5: Tournament Hub Page (`/tournaments`)

**Files:**
- Create: `apps/web/src/app/tournaments/page.tsx`

- [ ] **Step 1: Write the hub page**

This is a server component following the exact pattern of `apps/web/src/app/events/page.tsx` — hero banner, data fetching, card layout. It shows three sections:

1. **Active Tournaments** — tournaments created by or containing the user
2. **Order of Merit** — active merits
3. **Standalone Events** — events without a tournament_id (the current events list)

```typescript
// apps/web/src/app/tournaments/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/BottomNav'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

const FORMAT_LABEL: Record<string, string> = {
  stableford: 'Stableford',
  strokeplay: 'Stroke Play',
}

export default async function TournamentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch tournaments the user created
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select(`
      id, name, format, status, finalised, created_at,
      events ( id, date, name, finalised, courses ( name ) )
    `)
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })

  // Fetch standalone events (no tournament_id) — same query as existing events page
  const { data: playerRows } = await supabase
    .from('event_players')
    .select(`
      event_id,
      events!inner (
        id, name, date, format,
        tournament_id,
        courses ( name ),
        course_combinations ( name )
      )
    `)
    .eq('user_id', user.id)
    .eq('rsvp_status', 'confirmed')
    .is('events.archived_at', null)
    .is('events.tournament_id', null)

  const { data: organisedRows } = await supabase
    .from('events')
    .select('id, name, date, format, courses ( name ), course_combinations ( name )')
    .eq('created_by', user.id)
    .is('archived_at', null)
    .is('tournament_id', null)
    .order('date', { ascending: false })

  // Merge standalone events (same dedup pattern as events page)
  const seen = new Set<string>()
  const standaloneEvents: Array<{ id: string; name: string; date: string; format: string; courseName: string }> = []

  for (const row of playerRows ?? []) {
    const ev = row.events as Record<string, unknown>
    const id = ev.id as string
    if (seen.has(id)) continue
    seen.add(id)
    standaloneEvents.push({
      id,
      name: ev.name as string,
      date: ev.date as string,
      format: ev.format as string,
      courseName: (ev.courses as Record<string, unknown>)?.name as string ?? '',
    })
  }
  for (const ev of organisedRows ?? []) {
    if (seen.has(ev.id)) continue
    seen.add(ev.id)
    standaloneEvents.push({
      id: ev.id,
      name: ev.name,
      date: ev.date,
      format: ev.format,
      courseName: (ev.courses as Record<string, unknown>)?.name as string ?? '',
    })
  }

  standaloneEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Fetch order of merits
  const { data: merits } = await supabase
    .from('order_of_merits')
    .select('id, name, season_year, status')
    .eq('created_by', user.id)
    .order('season_year', { ascending: false })

  const activeTournaments = (tournaments ?? []).filter(t => !t.finalised)
  const pastTournaments = (tournaments ?? []).filter(t => t.finalised)

  return (
    <>
      {/* Hero banner, sections for tournaments/merit/standalone, cards, CTAs */}
      {/* Follow exact same CSS-in-JSX pattern as events/page.tsx */}
      {/* Hero: Image + overlay + "Tournaments" title in Manrope 800 */}
      {/* Section: Active Tournaments — card per tournament showing name, format, round count, next round date */}
      {/* Section: Order of Merit — card per merit showing name, season year, status */}
      {/* Section: Standalone Events — same cards as current events page */}
      {/* CTA buttons: "New tournament" → /tournaments/new, "New event" → /events/new, "New Order of Merit" → /merit/new */}
      <BottomNav active="events" />
    </>
  )
}
```

The implementer should build the full JSX with hero banner, section headings (DM Serif Display), event/tournament cards (white bg, `#E0EBE0` border, 14-20px border-radius), and empty states. Follow the exact CSS patterns from `apps/web/src/app/events/page.tsx`.

- [ ] **Step 2: Verify the page renders**

Run dev server, navigate to `http://localhost:3000/tournaments`. Verify:
- Hero banner renders
- Empty states show for all sections
- CTA buttons link correctly

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/tournaments/page.tsx
git commit -m "feat: tournaments hub page"
```

---

## Task 6: Tournament Overview Page (`/tournaments/[id]`)

**Files:**
- Create: `apps/web/src/app/tournaments/[id]/page.tsx`

- [ ] **Step 1: Write the tournament overview page**

Server component that:
1. Fetches tournament + its events (rounds) ordered by round_number
2. For each finalised round, fetches event_players + scorecards + hole_scores to compute stableford/strokeplay totals using `@lx2/scoring`
3. Calls `computeTournamentStandings()` from `@/lib/tournaments/standings`
4. Renders: hero banner, round schedule cards (date, course, status badge), cumulative standings table

```typescript
// apps/web/src/app/tournaments/[id]/page.tsx
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { computeTournamentStandings } from '@/lib/tournaments/standings'
import type { TournamentRoundResult } from '@/lib/tournaments/standings'
import { calculateStableford, calculateStrokePlay } from '@lx2/scoring'
import BottomNav from '@/components/BottomNav'

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch tournament
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (!tournament) notFound()

  // Fetch rounds (events linked to this tournament)
  const { data: rounds } = await supabase
    .from('events')
    .select(`
      id, name, date, format, finalised, round_number,
      courses ( name ),
      course_combinations ( id, name ),
      event_players (
        id, user_id, display_name, handicap_index,
        scorecards (
          id, submitted_at,
          hole_scores ( hole_number, gross_strokes )
        )
      )
    `)
    .eq('tournament_id', id)
    .order('round_number', { ascending: true })

  // Build round results for standings computation
  // For each finalised round, compute each player's stableford/strokeplay total
  // using the @lx2/scoring package — fetch hole data for the combination
  const roundResults: TournamentRoundResult[] = []

  for (const round of rounds ?? []) {
    if (!round.finalised) {
      roundResults.push({ roundNumber: round.round_number, finalised: false, results: [] })
      continue
    }

    // Fetch hole data for this round's combination
    const comboId = (round.course_combinations as Record<string, unknown>)?.id as string
    const { data: holes } = await supabase
      .from('course_combination_holes')
      .select('hole_number, par, stroke_index')
      .eq('combination_id', comboId)
      .order('hole_number')

    const holeData = (holes ?? []).map(h => ({
      holeNumber: h.hole_number,
      par: h.par,
      strokeIndex: h.stroke_index,
    }))

    const results = []
    for (const player of round.event_players ?? []) {
      const scorecard = (player.scorecards as Array<Record<string, unknown>>)?.[0]
      if (!scorecard || !scorecard.submitted_at) continue

      const holeScores = scorecard.hole_scores as Array<{ hole_number: number; gross_strokes: number | null }> ?? []
      const grossStrokes = holeData.map(h => {
        const hs = holeScores.find(s => s.hole_number === h.holeNumber)
        return hs?.gross_strokes ?? null
      })

      const playingHandicap = Math.round(player.handicap_index * 0.95) // simplified — real logic uses event's allowance pct

      if (tournament.format === 'stableford') {
        const calc = calculateStableford({ holes: holeData, grossStrokes, playingHandicap })
        results.push({
          userId: player.user_id,
          displayName: player.display_name,
          stablefordTotal: calc.total,
          grossTotal: grossStrokes.reduce((s, v) => s + (v ?? 0), 0),
        })
      } else {
        const grossTotal = grossStrokes.reduce((s, v) => s + (v ?? 0), 0)
        results.push({
          userId: player.user_id,
          displayName: player.display_name,
          stablefordTotal: 0,
          grossTotal,
        })
      }
    }

    roundResults.push({ roundNumber: round.round_number, finalised: true, results })
  }

  const standings = computeTournamentStandings(
    roundResults,
    tournament.format as 'stableford' | 'strokeplay',
    tournament.dns_policy as 'exclude' | 'penalty',
  )

  const isOrganiser = tournament.created_by === user.id

  return (
    <>
      {/* Hero banner: tournament name, format badge, status badge */}
      {/* Round schedule: cards for each round — date, course, status (upcoming/finalised), link to /events/[id] */}
      {/* Cumulative standings table: position, player, round-by-round scores, total */}
      {/* Manage button if organiser */}
      {/* Follow exact CSS-in-JSX pattern from events/[id]/page.tsx */}
      <BottomNav active="events" />
    </>
  )
}
```

The implementer should build the full JSX. Key UI elements:
- Hero banner: 160px, gradient overlay, tournament name in Manrope 800, format badge
- Round cards: white bg, border `#E0EBE0`, status badges (green "Finalised", amber "In Progress", grey "Upcoming")
- Standings table: sticky first column (position + name), scrollable round columns, total column
- Manage link for organiser: button linking to `/tournaments/${id}/manage`

- [ ] **Step 2: Verify the page renders**

Create a test tournament via the wizard, then navigate to `/tournaments/[id]`. Verify round cards and standings render.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/tournaments/[id]/page.tsx
git commit -m "feat: tournament overview page with standings"
```

---

## Task 7: Tournament Manage Page + Actions

**Files:**
- Create: `apps/web/src/app/tournaments/[id]/manage/page.tsx`
- Create: `apps/web/src/app/tournaments/[id]/manage/actions.ts`

- [ ] **Step 1: Write the manage actions**

```typescript
// apps/web/src/app/tournaments/[id]/manage/actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'

export async function addRound(tournamentId: string, data: {
  date: string
  combinationId: string
  eventName: string
  handicapAllowancePct: number
  groupSize: 2 | 3 | 4
}): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Verify ownership
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, created_by, format, finalised')
    .eq('id', tournamentId)
    .single()

  if (!tournament) throw new Error('Tournament not found')
  if (tournament.created_by !== user.id) throw new Error('Not authorised')
  if (tournament.finalised) throw new Error('Tournament is finalised')

  // Get next round number
  const { data: existingRounds } = await supabase
    .from('events')
    .select('round_number')
    .eq('tournament_id', tournamentId)
    .order('round_number', { ascending: false })
    .limit(1)

  const nextRoundNumber = existingRounds?.[0]
    ? (existingRounds[0].round_number as number) + 1
    : 1

  // Resolve course_id
  const { data: combo } = await supabase
    .from('course_combinations')
    .select('course_id')
    .eq('id', data.combinationId)
    .single()

  if (!combo?.course_id) throw new Error('Course combination not found')

  // Create event
  const { data: event, error: evErr } = await supabase
    .from('events')
    .insert({
      created_by: user.id,
      course_id: combo.course_id,
      combination_id: data.combinationId,
      name: data.eventName,
      date: data.date,
      format: tournament.format,
      round_type: '18',
      handicap_allowance_pct: data.handicapAllowancePct / 100,
      group_size: data.groupSize,
      max_players: null,
      ntp_holes: [],
      ld_holes: [],
      entry_fee_pence: null,
      is_public: true,
      finalised: false,
      tournament_id: tournamentId,
      round_number: nextRoundNumber,
    })
    .select('id')
    .single()

  if (evErr || !event) throw new Error(`Failed to create round: ${evErr?.message ?? 'unknown'}`)

  // Register organiser
  const { data: profile } = await supabase
    .from('users')
    .select('display_name, handicap_index')
    .eq('id', user.id)
    .single()

  const { data: ep } = await supabase
    .from('event_players')
    .insert({
      event_id: event.id,
      user_id: user.id,
      display_name: profile?.display_name ?? user.email!.split('@')[0],
      handicap_index: profile?.handicap_index ?? 0,
      rsvp_status: 'confirmed',
    })
    .select('id')
    .single()

  if (ep) {
    await supabase
      .from('scorecards')
      .insert({ event_id: event.id, event_player_id: ep.id, round_type: '18' })
  }

  return event.id
}

export async function removeRound(tournamentId: string, eventId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Verify ownership
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('created_by, finalised')
    .eq('id', tournamentId)
    .single()

  if (!tournament || tournament.created_by !== user.id) throw new Error('Not authorised')
  if (tournament.finalised) throw new Error('Tournament is finalised')

  // Remove the event (CASCADE deletes event_players, scorecards, hole_scores)
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)
    .eq('tournament_id', tournamentId)

  if (error) throw new Error(`Failed to remove round: ${error.message}`)
  // Round numbers are NOT re-numbered — gaps are allowed
}

export async function reorderRounds(
  tournamentId: string,
  roundOrder: Array<{ eventId: string; roundNumber: number }>,
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('created_by, finalised')
    .eq('id', tournamentId)
    .single()

  if (!tournament || tournament.created_by !== user.id) throw new Error('Not authorised')
  if (tournament.finalised) throw new Error('Tournament is finalised')

  // Update round numbers — set to negative first to avoid unique constraint conflicts
  for (const { eventId, roundNumber } of roundOrder) {
    await supabase
      .from('events')
      .update({ round_number: -roundNumber })
      .eq('id', eventId)
      .eq('tournament_id', tournamentId)
  }
  // Then set to positive
  for (const { eventId, roundNumber } of roundOrder) {
    await supabase
      .from('events')
      .update({ round_number: roundNumber })
      .eq('id', eventId)
      .eq('tournament_id', tournamentId)
  }
}

export async function finaliseTournament(tournamentId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('tournaments')
    .update({ finalised: true, status: 'completed' })
    .eq('id', tournamentId)
    .eq('created_by', user.id)

  if (error) throw new Error(`Failed to finalise: ${error.message}`)
}

export async function unfinaliseTournament(tournamentId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('tournaments')
    .update({ finalised: false, status: 'in_progress' })
    .eq('id', tournamentId)
    .eq('created_by', user.id)

  if (error) throw new Error(`Failed to unfinalise: ${error.message}`)
}
```

- [ ] **Step 2: Write the manage page**

```typescript
// apps/web/src/app/tournaments/[id]/manage/page.tsx
// Server component — follows pattern of events/[id]/manage/page.tsx
// Shows: tournament details, list of rounds with remove buttons, add round form,
// finalise/unfinalise button
// Hero banner with "Manage Tournament" title
// Uses same CSS-in-JSX patterns as event manage page
```

The implementer should build the full page following `apps/web/src/app/events/[id]/manage/page.tsx` patterns. Key sections:
- Hero banner: "Manage: {tournament name}"
- Round list: cards for each round with date, course, status, "Remove" button (confirm via window.confirm)
- Add round: inline form with date + course picker + "Add Round" button
- Finalise button: green button at bottom, or "Reopen" if already finalised
- Back link to tournament overview

- [ ] **Step 3: Test the flow end to end**

1. Create a tournament via `/tournaments/new`
2. Navigate to manage page
3. Add a round
4. Remove a round
5. Finalise tournament

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/tournaments/[id]/manage/page.tsx apps/web/src/app/tournaments/[id]/manage/actions.ts
git commit -m "feat: tournament manage page with add/remove/finalise actions"
```

---

## Task 8: Navigation + Middleware + Redirects

**Files:**
- Modify: `apps/web/src/components/BottomNav.tsx`
- Modify: `apps/web/src/middleware.ts`
- Modify: `apps/web/next.config.ts`
- Modify: `apps/web/src/app/events/[id]/page.tsx`

- [ ] **Step 1: Update BottomNav href**

In `apps/web/src/components/BottomNav.tsx`, change the Tournaments tab `href` from `/events` to `/tournaments`:

```typescript
// Find the Link with href="/events" and change to href="/tournaments"
```

- [ ] **Step 2: Update middleware matcher**

In `apps/web/src/middleware.ts`, add tournament and merit routes to the matcher and protection logic:

```typescript
// Add to the if-block checking for protected routes:
if (
  (request.nextUrl.pathname.startsWith('/events/new') ||
   request.nextUrl.pathname.startsWith('/tournaments/new') ||
   request.nextUrl.pathname.startsWith('/merit/new') ||
   request.nextUrl.pathname.match(/^\/tournaments\/[^/]+\/manage/) ||
   request.nextUrl.pathname.match(/^\/merit\/[^/]+\/manage/) ||
   request.nextUrl.pathname.match(/^\/events\/[^/]+\/manage/)) &&
  !user
) {
  // redirect to login
}

// Update matcher:
export const config = {
  matcher: [
    '/events/new',
    '/events/:id/manage',
    '/tournaments/new',
    '/tournaments/:id/manage',
    '/merit/new',
    '/merit/:id/manage',
  ],
}
```

- [ ] **Step 3: Add /events redirect in next.config.ts**

```typescript
// apps/web/next.config.ts
const nextConfig: NextConfig = {
  // ... existing config ...
  async redirects() {
    return [
      {
        source: '/events',
        destination: '/tournaments',
        permanent: false,
      },
    ]
  },
}
```

- [ ] **Step 4: Add tournament badge to event detail page**

In `apps/web/src/app/events/[id]/page.tsx`, after fetching the event, check if `tournament_id` is set. If so, fetch the tournament name and round count, then render a badge above the event content:

```tsx
{event.tournament_id && (
  <Link href={`/tournaments/${event.tournament_id}`} style={{
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '6px 12px', borderRadius: 8,
    background: 'rgba(13, 99, 27, 0.08)', color: '#0D631B',
    fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: '0.8125rem',
    fontWeight: 600, textDecoration: 'none', marginBottom: 16,
  }}>
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1L9 5L13 5.5L10 8.5L11 13L7 11L3 13L4 8.5L1 5.5L5 5L7 1Z" fill="currentColor"/>
    </svg>
    Round {event.round_number} of {roundCount} — {tournamentName}
  </Link>
)}
```

The query needs to include `tournament_id, round_number` in the event select, and a secondary query for the tournament name + total round count.

- [ ] **Step 5: Verify navigation flow**

1. `/events` redirects to `/tournaments`
2. Bottom nav "Tournaments" tab goes to `/tournaments`
3. `/tournaments/new` requires login
4. Event page shows tournament badge when part of a tournament

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/BottomNav.tsx apps/web/src/middleware.ts apps/web/next.config.ts apps/web/src/app/events/[id]/page.tsx
git commit -m "feat: navigation updates, /events redirect, tournament badge on events"
```

---

## Task 9: Order of Merit Points Function + Tests

**Files:**
- Create: `apps/web/src/lib/merit/presets.ts`
- Create: `apps/web/src/lib/merit/points.ts`
- Create: `apps/web/src/lib/merit/points.test.ts`

- [ ] **Step 1: Write the presets**

```typescript
// apps/web/src/lib/merit/presets.ts

export type PointsTemplate = Record<string, number>

export const PRESETS: Record<string, { label: string; template: PointsTemplate; participation: number }> = {
  standard: {
    label: 'Standard',
    template: {
      '1': 25, '2': 20, '3': 16, '4': 13, '5': 11,
      '6': 10, '7': 9, '8': 8, '9': 7, '10': 6, '11': 5, '12': 4,
      default: 2,
    },
    participation: 0,
  },
  flat: {
    label: 'Flat',
    template: {
      '1': 10, '2': 8, '3': 6, '4': 5, '5': 4,
      '6': 3, '7': 3, '8': 3, '9': 2, '10': 2, '11': 2, '12': 2,
      default: 1,
    },
    participation: 0,
  },
  participation: {
    label: 'Participation-heavy',
    template: {
      '1': 15, '2': 12, '3': 10, '4': 8, '5': 6,
      '6': 5, '7': 5, '8': 5, '9': 4, '10': 4, '11': 4, '12': 4,
      default: 3,
    },
    participation: 5,
  },
}
```

- [ ] **Step 2: Write the failing tests**

```typescript
// apps/web/src/lib/merit/points.test.ts
import { describe, it, expect } from 'vitest'
import { computeMeritStandings } from './points'
import type { MeritEventResult, MeritConfig } from './points'

describe('computeMeritStandings', () => {
  const config: MeritConfig = {
    pointsTemplate: { '1': 25, '2': 20, '3': 16, default: 2 },
    participationPoints: 0,
    bestOf: null,
  }

  const events: MeritEventResult[] = [
    {
      entryId: 'e1',
      multiplier: 1.0,
      standings: [
        { userId: 'alice', displayName: 'Alice', position: 1 },
        { userId: 'bob', displayName: 'Bob', position: 2 },
        { userId: 'carol', displayName: 'Carol', position: 3 },
      ],
    },
    {
      entryId: 'e2',
      multiplier: 1.0,
      standings: [
        { userId: 'bob', displayName: 'Bob', position: 1 },
        { userId: 'alice', displayName: 'Alice', position: 2 },
      ],
    },
  ]

  it('awards points based on position and sums across events', () => {
    const standings = computeMeritStandings(events, config)
    // Alice: 25 + 20 = 45, Bob: 20 + 25 = 45, Carol: 16
    expect(standings[0].total).toBe(45)
    expect(standings[1].total).toBe(45)
    expect(standings[2].total).toBe(16)
  })

  it('tie-break: number of wins', () => {
    const standings = computeMeritStandings(events, config)
    // Both Alice and Bob have 45 pts, both have 1 win each → alphabetical
    expect(standings[0].displayName).toBe('Alice')
    expect(standings[1].displayName).toBe('Bob')
  })

  it('applies multiplier to points', () => {
    const majorEvents: MeritEventResult[] = [
      {
        entryId: 'e1',
        multiplier: 1.5,
        standings: [
          { userId: 'alice', displayName: 'Alice', position: 1 },
        ],
      },
    ]
    const standings = computeMeritStandings(majorEvents, config)
    expect(standings[0].total).toBe(38) // 25 * 1.5 = 37.5 → 38 (rounded)
  })

  it('adds participation points', () => {
    const withParticipation = { ...config, participationPoints: 5 }
    const singleEvent: MeritEventResult[] = [
      {
        entryId: 'e1',
        multiplier: 1.0,
        standings: [
          { userId: 'alice', displayName: 'Alice', position: 1 },
          { userId: 'bob', displayName: 'Bob', position: 2 },
        ],
      },
    ]
    const standings = computeMeritStandings(singleEvent, withParticipation)
    expect(standings[0].total).toBe(30) // 25 + 5
    expect(standings[1].total).toBe(25) // 20 + 5
  })

  it('best_of: only counts top N results', () => {
    const bestOfConfig = { ...config, bestOf: 1 }
    const standings = computeMeritStandings(events, bestOfConfig)
    // Alice: best is 25 (1st place), Bob: best is 25 (1st place)
    expect(standings[0].total).toBe(25)
    expect(standings[1].total).toBe(25)
  })

  it('default points for positions beyond template', () => {
    const singleEvent: MeritEventResult[] = [
      {
        entryId: 'e1',
        multiplier: 1.0,
        standings: [
          { userId: 'alice', displayName: 'Alice', position: 1 },
          { userId: 'dave', displayName: 'Dave', position: 10 },
        ],
      },
    ]
    const standings = computeMeritStandings(singleEvent, config)
    expect(standings[1].total).toBe(2) // default points
  })

  it('returns empty array for no events', () => {
    expect(computeMeritStandings([], config)).toEqual([])
  })
})
```

- [ ] **Step 3: Run to verify failure**

Run: `cd /Users/mattjohnson/Documents/lx2 && npx vitest run apps/web/src/lib/merit/points.test.ts`
Expected: FAIL — module `./points` not found

- [ ] **Step 4: Write the implementation**

```typescript
// apps/web/src/lib/merit/points.ts

export interface MeritPlayerStanding {
  userId: string
  displayName: string
  position: number
}

export interface MeritEventResult {
  entryId: string
  multiplier: number
  standings: MeritPlayerStanding[]
}

export interface MeritConfig {
  pointsTemplate: Record<string, number>
  participationPoints: number
  bestOf: number | null
}

export interface MeritStanding {
  userId: string
  displayName: string
  eventPoints: Record<string, number>  // entryId → points earned
  total: number
  wins: number
  position: number
}

function lookupPoints(template: Record<string, number>, position: number): number {
  const key = String(position)
  if (key in template) return template[key]
  if ('default' in template) return template['default']
  return 0
}

export function computeMeritStandings(
  events: MeritEventResult[],
  config: MeritConfig,
): MeritStanding[] {
  if (events.length === 0) return []

  const playerMap = new Map<string, {
    displayName: string
    eventPoints: Map<string, number>
    allPoints: number[]
    wins: number
    secondPlaces: number
  }>()

  for (const event of events) {
    for (const player of event.standings) {
      if (!playerMap.has(player.userId)) {
        playerMap.set(player.userId, {
          displayName: player.displayName,
          eventPoints: new Map(),
          allPoints: [],
          wins: 0,
          secondPlaces: 0,
        })
      }

      const entry = playerMap.get(player.userId)!
      const basePoints = lookupPoints(config.pointsTemplate, player.position)
      const points = Math.round(basePoints * event.multiplier) + config.participationPoints
      entry.eventPoints.set(event.entryId, points)
      entry.allPoints.push(points)

      if (player.position === 1) entry.wins++
      if (player.position === 2) entry.secondPlaces++
    }
  }

  const standings: MeritStanding[] = []

  for (const [userId, data] of playerMap) {
    // Sort points descending for best-of
    const sorted = [...data.allPoints].sort((a, b) => b - a)
    const counted = config.bestOf
      ? sorted.slice(0, Math.min(config.bestOf, sorted.length))
      : sorted

    const total = counted.reduce((s, v) => s + v, 0)

    const eventPointsObj: Record<string, number> = {}
    for (const [entryId, pts] of data.eventPoints) {
      eventPointsObj[entryId] = pts
    }

    standings.push({
      userId,
      displayName: data.displayName,
      eventPoints: eventPointsObj,
      total,
      wins: data.wins,
      position: 0,
    })
  }

  // Sort: highest total → most wins → most 2nd places → alphabetical
  standings.sort((a, b) => {
    if (a.total !== b.total) return b.total - a.total
    if (a.wins !== b.wins) return b.wins - a.wins
    const aSeconds = playerMap.get(a.userId)!.secondPlaces
    const bSeconds = playerMap.get(b.userId)!.secondPlaces
    if (aSeconds !== bSeconds) return bSeconds - aSeconds
    return a.displayName.localeCompare(b.displayName)
  })

  standings.forEach((s, i) => { s.position = i + 1 })

  return standings
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /Users/mattjohnson/Documents/lx2 && npx vitest run apps/web/src/lib/merit/points.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/merit/presets.ts apps/web/src/lib/merit/points.ts apps/web/src/lib/merit/points.test.ts
git commit -m "feat: order of merit points computation with presets and tests"
```

---

## Task 10: Order of Merit Pages + Actions

**Files:**
- Create: `apps/web/src/app/merit/page.tsx`
- Create: `apps/web/src/app/merit/new/page.tsx`
- Create: `apps/web/src/app/merit/new/actions.ts`
- Create: `apps/web/src/app/merit/new/NewMeritWizard.tsx`
- Create: `apps/web/src/app/merit/[id]/page.tsx`
- Create: `apps/web/src/app/merit/[id]/manage/page.tsx`
- Create: `apps/web/src/app/merit/[id]/manage/actions.ts`

- [ ] **Step 1: Write the createMerit server action**

```typescript
// apps/web/src/app/merit/new/actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'

export interface MeritEntryInput {
  eventId?: string
  tournamentId?: string
  multiplier: number
}

export interface CreateMeritData {
  name: string
  seasonYear: number
  bestOf: number | null
  participationPoints: number
  pointsTemplate: Record<string, number>
  entries: MeritEntryInput[]
}

export async function createMerit(data: CreateMeritData): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Validate points template
  for (const [key, value] of Object.entries(data.pointsTemplate)) {
    if (key !== 'default' && (isNaN(Number(key)) || Number(key) < 1)) {
      throw new Error(`Invalid position key: ${key}`)
    }
    if (typeof value !== 'number' || value < 0) {
      throw new Error(`Invalid points value for position ${key}`)
    }
  }

  const { data: merit, error: mErr } = await supabase
    .from('order_of_merits')
    .insert({
      created_by: user.id,
      name: data.name,
      season_year: data.seasonYear,
      best_of: data.bestOf,
      participation_points: data.participationPoints,
      points_template: data.pointsTemplate,
    })
    .select('id')
    .single()

  if (mErr || !merit) throw new Error(`Failed to create merit: ${mErr?.message ?? 'unknown'}`)

  // Add entries
  if (data.entries.length > 0) {
    const rows = data.entries.map(e => ({
      merit_id: merit.id,
      event_id: e.eventId || null,
      tournament_id: e.tournamentId || null,
      points_multiplier: e.multiplier,
    }))

    const { error: eErr } = await supabase
      .from('order_of_merit_entries')
      .insert(rows)

    if (eErr) throw new Error(`Failed to add entries: ${eErr.message}`)
  }

  return merit.id
}
```

- [ ] **Step 2: Write the merit list page**

`apps/web/src/app/merit/page.tsx` — server component, same hero banner pattern. Lists active and completed merits with season year, event count, and link to standings.

- [ ] **Step 3: Write the merit wizard**

`apps/web/src/app/merit/new/page.tsx` + `NewMeritWizard.tsx` — 4-step wizard:
1. Details: name, season year, best-of count, participation points
2. Points template: preset picker (Standard/Flat/Participation-heavy/Custom) + editable table
3. Add events/tournaments: list available events and tournaments owned by this user, checkboxes, multiplier input
4. Review & Create

Follow exact same patterns as tournament wizard (hero banner, step indicator, form fields, CSS-in-JSX).

- [ ] **Step 4: Write the merit standings page**

`apps/web/src/app/merit/[id]/page.tsx` — server component that:
1. Fetches the merit + its entries
2. For each entry, fetches the event/tournament standings
3. Calls `computeMeritStandings()` to compute total points
4. Renders: hero banner, standings table (position, player, per-event points, total), best-of indicator

- [ ] **Step 5: Write the merit manage page + actions**

`apps/web/src/app/merit/[id]/manage/page.tsx` + `actions.ts`:
- Actions: `addEntry`, `removeEntry`, `updateMultiplier`, `completeMerit`
- Page: list of entries with remove buttons, add entry form, complete button

- [ ] **Step 6: Test the full flow**

1. Create an Order of Merit via `/merit/new`
2. Verify standings page shows correctly
3. Add/remove entries via manage page
4. Complete the merit

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/merit/
git commit -m "feat: order of merit pages, wizard, and manage actions"
```

---

## Task 11: Final Integration + Type Checks + Push

**Files:**
- All files from previous tasks

- [ ] **Step 1: Run TypeScript check**

Run: `cd /Users/mattjohnson/Documents/lx2 && npx tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -30`
Expected: No errors

- [ ] **Step 2: Run all tests**

Run: `cd /Users/mattjohnson/Documents/lx2 && npx vitest run`
Expected: All tests pass (existing + new standings + points tests)

- [ ] **Step 3: Run lint**

Run: `cd /Users/mattjohnson/Documents/lx2 && npx next lint --dir apps/web/src 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Test dev server**

Run the dev server and manually verify:
1. `/tournaments` hub page renders
2. `/tournaments/new` wizard works end-to-end
3. `/tournaments/[id]` shows rounds + standings
4. `/tournaments/[id]/manage` allows add/remove/finalise
5. `/events` redirects to `/tournaments`
6. Event page shows tournament badge
7. Bottom nav links to `/tournaments`
8. `/merit` pages work end-to-end

- [ ] **Step 5: Push to main**

```bash
git push origin main
```
