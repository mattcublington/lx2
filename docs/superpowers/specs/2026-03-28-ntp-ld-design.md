# NTP / Longest Drive — Design Spec

**Date:** 2026-03-28
**Module:** `ntp_ld`
**Status:** Approved

---

## Problem

NTP and Longest Drive contests are a staple of society golf. The database schema and leaderboard panel already exist. The wizard defaults both features on (NTP auto-selects 3 holes). The score entry overlay exists but `setShowContestOverlay(true)` is never called and nothing is persisted.

This spec covers:
1. Making NTP and LD opt-in in the start-round wizard (off by default, single best hole)
2. Wiring the contest overlay to fire immediately after scoring on a contest hole
3. Persisting results to `contest_entries` via Supabase upsert

---

## Wizard changes (`NewRoundWizard.tsx`)

### State

Add to `WizardState`:
```ts
ntpEnabled: boolean  // default false
ldEnabled: boolean   // default false
```

`ntpHoles` and `ldHoles` initialise as `[]`. Populated only when feature is toggled on.

### Default hole selection — one hole only

```ts
// Before: returns up to 3 par-3s
function defaultNtpHoles(courseId: string): number[] {
  return course.holes.filter(h => h.par === 3).map(h => h.num).slice(0, 3)
}

// After: returns exactly 1 par-3 (lowest hole number), or [] if none
function defaultNtpHoles(courseId: string): number[] {
  const course = getCourse(courseId)
  if (!course) return []
  const par3 = course.holes.find(h => h.par === 3)  // first by array order = lowest hole number
  return par3 ? [par3.num] : []
}
```

`defaultLdHoles` is unchanged — already returns 1 hole (first par-5, fallback first par-4).

### No qualifying holes edge case

- If `defaultNtpHoles` returns `[]` (no par-3s on course): NTP toggle is hidden entirely
- `defaultLdHoles` always finds at least a par-4, so LD toggle is always shown

### Advanced Options UI

Two toggle pills added **before** the existing hole grids:

```
[ 🎯 Nearest the Pin ]   [ 🏌️ Longest Drive ]
```

Behaviour:
- Toggling **ON**: `ntpEnabled: true`, `ntpHoles: defaultNtpHoles(courseId)`
- Toggling **OFF**: `ntpEnabled: false`, `ntpHoles: []`
- Hole grid renders only when `ntpEnabled === true` (same for LD)
- Manual hole selection still works (overrides auto-pick)

When `selectCombination()` fires (course changes mid-wizard): if feature is enabled, re-run auto-pick for new course; if new course has no qualifying holes, disable and clear.

---

## Score page changes (`page.tsx`)

`ep.id` is already in scope (from `event_players!inner` join at line 64). `ntpHoles` and `ldHoles` are already passed to `ScoreEntryLive` (lines 348–349).

**Only change:** add `eventPlayerId={ep.id}` to the `<ScoreEntryLive>` render call.

---

## Score entry changes (`ScoreEntryLive.tsx`)

### New prop

```ts
eventPlayerId: string
```

Added to `Props` interface.

### `isNTP`/`isLD` — no change

Already derived correctly from existing props:
```ts
const isNTP = ntpHoles.includes(hole.holeInRound)
const isLD  = ldHoles.includes(hole.holeInRound)
```

### `cDist` / `setCDist` — existing state

`const [cDist, setCDist] = useState('')` already exists. Used as-is for the distance input.

### Overlay trigger in `tapScore()`

After `persistScore()`, before `checkAutoAdvance()`:

```ts
if (isNTP || isLD) {
  // Cancel any pending auto-advance timer
  // Do NOT add to autoAdvancedHoles.current — this allows the overlay to
  // re-fire if the player navigates back and changes their score
  if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current)
  setCDist('')
  setShowContestOverlay(true)
  return  // skip checkAutoAdvance
}
```

Why no `autoAdvancedHoles.current.add(hir)`: that set prevents double-advance. Since we return early before `checkAutoAdvance()`, there is no advance to prevent. Not adding to the set means re-scoring the hole (after navigating back) re-triggers the overlay correctly.

`tapPickup()` is unaffected — pickups on contest holes do not trigger the overlay.

### Re-score behaviour

Player navigates back (`SET_HOLE`) → re-taps a score on a contest hole:
- `tapScore()` fires, `isNTP || isLD` is true → overlay fires again
- If they save: `persistContest()` upserts, overwriting previous `distance_cm`
- If they skip: previous entry (if any) is retained unchanged

### Skip / dismiss

Use existing `skipContest()`:
```ts
function skipContest() {
  setShowContestOverlay(false)
  d({ type: 'NEXT', maxIdx })
}
```
No database write. Previous entry (if any) is retained. `distance_cm` column is `NOT NULL` — no partial row created since we only write on Save.

Backdrop tap already calls `skipContest` (existing wiring — no change needed).

### `persistContest()`

New async function:

```ts
async function persistContest(ct: 'ntp' | 'ld', holeNum: number, distYards: string) {
  const cm = Math.round(parseFloat(distYards) * 91.44)
  if (isNaN(cm) || cm <= 0) return
  await sb.from('contest_entries').upsert(
    {
      event_id: eventId,
      hole_number: holeNum,  // hole.holeInRound at time of save
      type: ct,
      event_player_id: eventPlayerId,
      distance_cm: cm,       // yards × 91.44, rounded to nearest cm
    },
    { onConflict: 'event_id,hole_number,type,event_player_id' }
  )
}
```

### `saveContest()` — updated

```ts
function saveContest() {
  if (!cDist) return
  const ct: 'ntp' | 'ld' = ntpHoles.includes(hole.holeInRound) ? 'ntp' : 'ld'
  persistContest(ct, hole.holeInRound, cDist)  // fire-and-forget; upsert handles conflicts
  d({ type: 'SAVE_C', ct, holeNum: hole.holeInRound, dist: cDist, maxIdx })
  setCDist('')
  setShowContestOverlay(false)
}
```

### Distance units

Both NTP and LD use **yards** as input unit (UK golf societies measure NTP in yards per the PRD).

| Contest | Range | Placeholder | Conversion |
|---------|-------|-------------|------------|
| NTP | 0.5–50 yards | `e.g. 3.5 yards` | `yards × 91.44 = cm` |
| LD | 150–350 yards | `e.g. 285 yards` | `yards × 91.44 = cm` |

### Overlay title/subtitle — updated placeholders only

```tsx
placeholder={isNTP ? 'e.g. 3.5 yards' : 'e.g. 285 yards'}
```

---

## Data flow

```
NewRoundWizard
  ntpEnabled/ldEnabled toggles (off by default)
  → single auto-picked hole on enable
  → ntpHoles/ldHoles passed to startRound() ([] when disabled)
  → saved to events.ntp_holes / events.ld_holes

page.tsx
  ep.id → eventPlayerId prop (new)
  event.ntp_holes/ld_holes → ntpHoles/ldHoles (already passing)

ScoreEntryLive
  tapScore() on NTP/LD hole
    → cancel auto-advance timer, show overlay
  saveContest()
    → persistContest() → upsert contest_entries
    → SAVE_C action → advance
  skipContest() → advance, no write
  re-score on contest hole → overlay fires again → upsert overwrites

Leaderboard
  ContestPanel reads contest_entries via PlayerData.badges (no change needed)
```

---

## Files changed

| File | Change |
|------|--------|
| `apps/web/src/app/play/new/NewRoundWizard.tsx` | `ntpEnabled`/`ldEnabled` state + toggle pills + single-hole auto-pick + conditional hole grids |
| `apps/web/src/app/rounds/[id]/score/ScoreEntryLive.tsx` | `eventPlayerId` prop + overlay trigger in `tapScore()` + `persistContest()` + placeholder text |
| `apps/web/src/app/rounds/[id]/score/page.tsx` | Pass `eventPlayerId={ep.id}` to `ScoreEntryLive` |

---

## Out of scope

- Feet+inches input format for NTP
- Photo proof upload
- Organiser edit from manage page
- Metric display toggle
- Multiple NTP/LD prizes per hole
