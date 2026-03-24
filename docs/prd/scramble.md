# PRD: Scramble / Texas Scramble Format

**Module:** `scramble`
**Phase:** Soon
**Status:** Planned
**Last updated:** March 2026

---

## Problem

The scramble (or Texas Scramble) is the most popular team format for charity days, corporate events, and society golf. All team members tee off, the team picks the best shot, and all players play their next shot from that position. This repeats until the ball is holed. It is fundamentally different from better ball because players do not play their own ball throughout -- they converge on the best position after each shot.

Scramble events are extremely common in society golf but have unique scoring and handicap requirements that differ from individual formats. The team handicap is typically a weighted combination of individual handicaps (not a simple average), and the format supports various team sizes (2-person, 3-person, 4-person scramble).

## Goal

Build a scramble scoring engine that handles team-based scoring with appropriate handicap allowances, supporting 2, 3, and 4-person team sizes, and integrate it with the event creation and leaderboard systems.

## Users

- **Primary:** Charity and corporate event organisers who run scramble formats almost exclusively
- **Secondary:** Society organisers who occasionally run scramble events for variety

## Core requirements

### Must have

- Team-based scoring: one scorecard per team, not per player
- Gross and net score calculation per team
- Team handicap calculation using standard scramble allowance formula:
  - 2-person: 35% of low HC + 15% of high HC
  - 3-person: 20% of low + 15% of mid + 10% of high
  - 4-person: 20% of low + 15% of 2nd + 10% of 3rd + 5% of high
- Support for configurable handicap allowance percentages (organisers often adjust)
- Net score = gross total - team playing handicap
- Score relative to par for leaderboard ranking
- Support 18-hole and 9-hole scrambles

### Should have

- "Minimum drives" rule tracking: each player must contribute a minimum number of tee shots (typically 3-4 per player in a 4-person scramble)
- Team creation UI: organiser groups players into teams of 2, 3, or 4
- Configurable allowance formula (some organisers use different percentages)
- Tie-break by countback on back 9 / last 6 / last 3

### Won't have (this phase)

- Ambrose format (scramble variant with specific handicap rules popular in Australia)
- Shot-by-shot tracking (which player's shot was chosen on each shot)
- Scramble with individual challenges (e.g., NTP counted individually within the scramble)
- Mixed team sizes within the same event

## Technical design

### Proposed types

```typescript
interface ScrambleTeam {
  teamId: string
  teamName: string
  players: { playerId: string; playingHandicap: number }[]
}

interface ScrambleInput {
  holes: HoleData[]
  team: ScrambleTeam
  grossStrokes: (number | null)[]  // one score per hole for the team
  teamSize: 2 | 3 | 4
  allowanceOverride?: number[]  // custom percentages per position
}

interface ScrambleResult {
  teamHandicap: number
  grossTotal: number | null
  netTotal: number | null
  relativeToPar: number | null
  nR: boolean
}
```

### Team handicap algorithm

1. Sort team members by playing handicap (ascending)
2. Apply position-weighted percentages: `[0.20, 0.15, 0.10, 0.05]` for 4-person
3. `teamHandicap = round(sum of weighted handicaps)`
4. If `allowanceOverride` is provided, use those percentages instead

### Default allowance table

| Team size | Position weights |
|-----------|-----------------|
| 2-person | 35%, 15% |
| 3-person | 20%, 15%, 10% |
| 4-person | 20%, 15%, 10%, 5% |

### Database changes

- New `event_teams` table: `{ id, event_id, team_name, team_handicap }`
- New `event_team_members` table: `{ id, team_id, event_player_id, position }`
- Scorecards linked to `event_teams.id` instead of (or in addition to) `event_players.id`
- Events table: add 'scramble' to the format CHECK constraint
- Minimum drives tracking: `team_drives jsonb` on scorecards or separate tracking

### Score entry UX

- One player per team enters scores (the "team scorer")
- Score entry page shows team name and all player names
- Each hole: enter gross strokes for the team
- Optional: mark which player's drive was used (for minimum drives tracking)

## Open questions

- [ ] Should scramble scorecards be linked to a team entity or to one designated player?
- [ ] How to enforce minimum drives in the app -- honour system with a counter, or strict validation?
- [ ] Do we need a separate leaderboard component for team formats, or can the existing one adapt?
- [ ] Should organisers be able to manually override the team handicap?

## Links

- Engine (planned): `packages/scoring/src/scramble.ts`
- Types: `packages/scoring/src/types.ts`
- Related PRD: `docs/prd/handicap.md`
- Related PRD: `docs/prd/better-ball.md`
- Related PRD: `docs/prd/rvb.md`
