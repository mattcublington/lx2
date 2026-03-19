// ─── Shared types ────────────────────────────────────────────────────────────

export type Format = 'stableford' | 'strokeplay' | 'matchplay'

export interface HoleData {
  holeNumber: number
  par: number
  strokeIndex: number // 1–18
}

export interface PlayerRound {
  playerId: string
  handicapIndex: number
  grossStrokes: (number | null)[] // null = pick-up / NR
}

// ─── Handicap ────────────────────────────────────────────────────────────────

export interface PlayingHandicapInput {
  handicapIndex: number
  slopeRating: number       // course slope, typically 55–155, standard 113
  courseRating: number      // scratch score for the tees
  par: number               // course par
  allowancePct?: number     // default 1.0 (100%)
}

export interface HandicapAllocation {
  playingHandicap: number
  strokesPerHole: number[]  // length 18, value 0 | 1 | 2
}

// ─── Stableford ──────────────────────────────────────────────────────────────

export interface StablefordInput {
  holes: HoleData[]
  grossStrokes: (number | null)[]
  playingHandicap: number
}

export interface StablefordResult {
  pointsPerHole: number[]
  total: number
  netStrokes: (number | null)[]
}

// ─── Stroke play ─────────────────────────────────────────────────────────────

export interface StrokePlayInput {
  holes: HoleData[]
  grossStrokes: (number | null)[]
  playingHandicap: number
}

export interface StrokePlayResult {
  grossTotal: number | null
  netTotal: number | null
  relativeToPar: number | null // positive = over par
  nR: boolean                  // No Return
}

// ─── Match play ──────────────────────────────────────────────────────────────

export interface MatchPlayInput {
  holes: HoleData[]
  playerA: { grossStrokes: (number | null)[]; handicapIndex: number }
  playerB: { grossStrokes: (number | null)[]; handicapIndex: number }
  slopeRating: number
  courseRating: number
  par: number
}

export type HoleResult = 'A' | 'B' | 'halved' | 'pending'

export interface MatchPlayResult {
  holeResults: HoleResult[]
  matchStatus: string        // e.g. "2 up", "all square", "A wins 3&2"
  holesUp: number            // positive = A leads, negative = B leads
  matchOver: boolean
  winner: 'A' | 'B' | null
}
