// ─── Predictions engine types ─────────────────────────────────────────────────

export interface PlayerForm {
  eventPlayerId: string
  displayName: string
  handicapIndex: number
  /** Current Stableford score (live, updated per hole) */
  currentScore: number
  /** Number of holes completed */
  holesPlayed: number
  /** Total holes in the round */
  totalHoles: number
}

export interface OddsConfig {
  /** Outright overround percentage, e.g. 115 = 15% vig */
  overroundPct: number
  /** Head-to-head overround percentage, e.g. 108 = 8% vig */
  h2hOverroundPct: number
}

export interface FractionalOdds {
  numerator: number
  denominator: number
}

export interface SelectionOdds {
  eventPlayerId: string
  label: string
  /** Raw probability (0–1) before overround */
  rawProbability: number
  /** Adjusted probability after overround (sums to > 1) */
  adjustedProbability: number
  /** Fractional odds (e.g. 5/1) */
  fractionalOdds: FractionalOdds
  /** Decimal odds (e.g. 6.0) */
  decimalOdds: number
}

export interface MarketOdds {
  marketType: 'outright' | 'head_to_head' | 'top_3' | 'over_under' | 'group_winner' | 'last_place'
  title: string
  selections: SelectionOdds[]
}

export interface OverUnderSelection {
  label: string
  line: number
  rawProbability: number
  adjustedProbability: number
  fractionalOdds: FractionalOdds
  decimalOdds: number
}

export interface OverUnderMarket {
  marketType: 'over_under'
  title: string
  eventPlayerId: string
  line: number
  over: OverUnderSelection
  under: OverUnderSelection
}

/** Variance per remaining hole — amateur Stableford scoring */
export const STABLEFORD_HOLE_VARIANCE = 1.5

/** Default expected Stableford points per hole for a scratch golfer on handicap */
export const BASE_POINTS_PER_HOLE = 2.0
