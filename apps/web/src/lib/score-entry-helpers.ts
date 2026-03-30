/**
 * Pure helpers extracted from ScoreEntryLive for testability.
 * All functions are side-effect free and depend only on their arguments.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimal hole shape required by allocateStrokes. */
export interface AllocateHole {
  holeInRound: number
  siM: number | null
}

export interface ScoreState {
  hole: number
  scores: Record<number, number | null>
  pickups: Record<number, boolean>
  showNTP: boolean
  ntpResults: Record<number, string>
  ldResults: Record<number, string>
  showCard: boolean
}

export type ScoreAction =
  | { type: 'SCORE'; holeInRound: number; v: number }
  | { type: 'PICKUP'; holeInRound: number }
  | { type: 'UNDO'; holeInRound: number }
  | { type: 'SET_HOLE'; idx: number }
  | { type: 'NEXT'; maxIdx: number }
  | { type: 'SKIP_C'; maxIdx: number }
  | { type: 'SAVE_C'; ct: 'ntp' | 'ld'; holeNum: number; dist: string; maxIdx: number }
  | { type: 'TOGGLE_CARD' }

// ─── Handicap allocation ──────────────────────────────────────────────────────

/**
 * Distribute playing-handicap strokes across holes by stroke index (siM).
 * Holes with siM === null are excluded from allocation.
 * If hc > number of ranked holes, strokes wrap around (second pass gets +1 more).
 */
export function allocateStrokes(hc: number, holes: AllocateHole[]): Record<number, number> {
  const result: Record<number, number> = {}
  for (const h of holes) result[h.holeInRound] = 0
  const order = holes
    .filter(h => h.siM !== null)
    .map(h => ({ hir: h.holeInRound, si: h.siM! }))
    .sort((a, b) => a.si - b.si)
  let remaining = hc
  while (remaining > 0) {
    for (const o of order) {
      if (remaining <= 0) break
      result[o.hir] = (result[o.hir] ?? 0) + 1
      remaining--
    }
  }
  return result
}

// ─── Stableford scoring ───────────────────────────────────────────────────────

/**
 * Stableford points for a single hole.
 * d = (gross − hcShots) − par
 * d ≥ 2 → blob (0), d=1 → 1pt, d=0 → 2pts, d=-1 → 3pts, d=-2 → 4pts, d≤-3 → 5pts
 */
export function pts(gross: number, par: number, hcShots: number): number {
  const d = (gross - hcShots) - par
  return d >= 2 ? 0 : d === 1 ? 1 : d === 0 ? 2 : d === -1 ? 3 : d === -2 ? 4 : 5
}

/**
 * Human-readable label for a stableford hole result.
 * e.g. "3pts · net birdie", "blob · net 6", "1pt · net bogey"
 */
export function ptsLabel(p: number, gross: number, par: number, hcShots: number): string {
  const net = gross - hcShots
  const diff = net - par
  const term = diff <= -3 ? 'albatross'
    : diff === -2 ? 'eagle'
    : diff === -1 ? 'birdie'
    : diff === 0 ? 'par'
    : diff === 1 ? 'bogey'
    : diff === 2 ? 'double'
    : 'triple+'
  if (p === 0) return `blob · net ${net}`
  return `${p === 1 ? '1pt' : p + 'pts'} · net ${term}`
}

// ─── Stroke-play scoring ──────────────────────────────────────────────────────

/**
 * Gross score label relative to par.
 * e.g. "Birdie", "Par", "Bogey", "+4"
 */
export function strokeResult(gross: number, par: number): string {
  const diff = gross - par
  if (diff <= -3) return 'Albatross'
  if (diff === -2) return 'Eagle'
  if (diff === -1) return 'Birdie'
  if (diff === 0) return 'Par'
  if (diff === 1) return 'Bogey'
  if (diff === 2) return 'Double'
  return `+${diff}`
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

export function scoreReducer(s: ScoreState, a: ScoreAction): ScoreState {
  switch (a.type) {
    case 'SCORE':
      return { ...s, scores: { ...s.scores, [a.holeInRound]: a.v }, pickups: { ...s.pickups, [a.holeInRound]: false } }
    case 'PICKUP':
      return { ...s, scores: { ...s.scores, [a.holeInRound]: null }, pickups: { ...s.pickups, [a.holeInRound]: true } }
    case 'UNDO':
      return { ...s, scores: { ...s.scores, [a.holeInRound]: null }, pickups: { ...s.pickups, [a.holeInRound]: false } }
    case 'SET_HOLE':
      return { ...s, hole: a.idx, showNTP: false }
    case 'NEXT':
      return { ...s, hole: Math.min(a.maxIdx, s.hole + 1), showNTP: false }
    case 'SKIP_C':
      return { ...s, showNTP: false, hole: Math.min(a.maxIdx, s.hole + 1) }
    case 'SAVE_C': {
      const k = a.ct === 'ntp' ? 'ntpResults' : 'ldResults'
      return { ...s, [k]: { ...s[k], [a.holeNum]: a.dist }, showNTP: false, hole: Math.min(a.maxIdx, s.hole + 1) }
    }
    case 'TOGGLE_CARD':
      return { ...s, showCard: !s.showCard }
    default:
      return s
  }
}
