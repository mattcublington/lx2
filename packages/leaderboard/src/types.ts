// ─── Leaderboard types ────────────────────────────────────────────────────────

export interface PlayerData {
  eventPlayerId: string
  scorecardId: string | null
  displayName: string
  handicapIndex: number
  grossStrokes: (number | null)[]
  badges: { type: 'ntp' | 'ld'; holeNumber: number }[]
}

export interface ComputedRow {
  positionLabel: string
  isFirst: boolean
  player: PlayerData
  grossStrokes: (number | null)[]
  thru: number
  score: number
  nR: boolean
  perHole: number[]
  playingHandicap: number
}

export interface LeaderboardConfig {
  format: 'stableford' | 'strokeplay'
  roundType: '18' | '9'
  allowancePct: number
}
