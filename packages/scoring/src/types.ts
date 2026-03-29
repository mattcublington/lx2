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

// ─── Better Ball (Fourball) ─────────────────────────────────────────────────

export interface BetterBallInput {
  holes: HoleData[]
  playerA: {
    grossStrokes: (number | null)[]
    playingHandicap: number
  }
  playerB: {
    grossStrokes: (number | null)[]
    playingHandicap: number
  }
  mode: 'stableford' | 'strokeplay'
}

export interface BetterBallHole {
  holeNumber: number
  selectedPlayer: 'A' | 'B' | 'both_pickup'
  pairScore: number // points (stableford) or net strokes (strokeplay)
  playerANet: number | null
  playerBNet: number | null
}

export interface BetterBallResult {
  holes: BetterBallHole[]
  pairTotal: number
  playerATotalUsed: number // how many holes player A's score was used
  playerBTotalUsed: number
  nR: boolean // stroke play only: true if both picked up on any hole
}

// ─── Skins ──────────────────────────────────────────────────────────────────

export interface SkinsInput {
  holes: HoleData[]
  players: {
    playerId: string
    grossStrokes: (number | null)[]
    playingHandicap: number
  }[]
  mode: 'net' | 'gross'
  lastHoleCarryover: 'split' | 'unawarded'
}

export interface SkinWin {
  holeNumber: number
  playerId: string
  skinsWon: number // 1 + carried
  netScore: number
}

export interface SkinsResult {
  wins: SkinWin[]
  carriedToNext: number // 0 if all resolved
  skinsByPlayer: Record<string, number>
  unawarded: number // only non-zero if lastHoleCarryover = 'unawarded'
}

// ─── Reds vs Blues ──────────────────────────────────────────────────────────

export interface RvBInput {
  players: {
    playerId: string
    team: 'red' | 'blue'
    stablefordTotal: number
  }[]
  bestOf?: number // if set, only count top N per team
}

export interface RvBTeamResult {
  total: number
  playerCount: number
  average: number
  countedPlayers: string[]
}

export interface RvBResult {
  red: RvBTeamResult
  blue: RvBTeamResult
  winner: 'red' | 'blue' | 'tied'
  margin: number
}

// ─── Scramble (Texas Scramble) ──────────────────────────────────────────────

export interface ScrambleTeam {
  teamId: string
  teamName: string
  players: { playerId: string; playingHandicap: number }[]
}

export interface ScrambleInput {
  holes: HoleData[]
  team: ScrambleTeam
  grossStrokes: (number | null)[] // one score per hole for the team
  teamSize: 2 | 3 | 4
  allowanceOverride?: number[] // custom percentages per position
}

export interface ScrambleResult {
  teamHandicap: number
  grossTotal: number | null
  netTotal: number | null
  relativeToPar: number | null
  nR: boolean
}
