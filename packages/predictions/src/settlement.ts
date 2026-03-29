// ─── Settlement: resolve markets and calculate payouts ───────────────────────

import type { FractionalOdds } from './types'

export interface BetToSettle {
  betId: string
  selectionId: string
  stake: number
  oddsNumerator: number
  oddsDenominator: number
}

export interface SelectionResult {
  selectionId: string
  isWinner: boolean
  /** Number of positions available / tied players for dead heat */
  deadHeatDivisor: number
}

export interface SettledBet {
  betId: string
  status: 'won' | 'lost' | 'void'
  payout: number
}

/**
 * Calculate the payout for a winning bet.
 * Payout = stake + (stake × odds_numerator / odds_denominator)
 * With dead heat: winnings portion divided by dead heat divisor.
 */
export function calculatePayout(
  stake: number,
  odds: FractionalOdds,
  deadHeatDivisor: number = 1,
): number {
  const winnings = (stake * odds.numerator) / odds.denominator
  const adjustedWinnings = winnings / deadHeatDivisor
  return Math.round(stake + adjustedWinnings)
}

/**
 * Settle a batch of bets against selection results.
 */
export function settleBets(
  bets: BetToSettle[],
  results: SelectionResult[],
): SettledBet[] {
  const resultMap = new Map(results.map(r => [r.selectionId, r]))

  return bets.map(bet => {
    const result = resultMap.get(bet.selectionId)

    // No result for this selection — void the bet
    if (!result) {
      return { betId: bet.betId, status: 'void' as const, payout: bet.stake }
    }

    if (result.isWinner) {
      const payout = calculatePayout(
        bet.stake,
        { numerator: bet.oddsNumerator, denominator: bet.oddsDenominator },
        result.deadHeatDivisor,
      )
      return { betId: bet.betId, status: 'won' as const, payout }
    }

    return { betId: bet.betId, status: 'lost' as const, payout: 0 }
  })
}

/**
 * Determine dead heat divisor for a set of tied players.
 * If 3 players tie for 2 places, divisor = 3/2 = 1.5
 * We return as integer divisor (positions available in numerator,
 * tied count as the deadHeatDivisor).
 */
export function calculateDeadHeatDivisor(
  tiedCount: number,
  positionsAvailable: number,
): number {
  if (tiedCount <= positionsAvailable) return 1
  return tiedCount
}

/**
 * Determine outright winner results from a final leaderboard.
 * Handles ties with dead heat rules.
 */
export function resolveOutrightResults(
  leaderboard: { eventPlayerId: string; position: number; isTied: boolean }[],
): SelectionResult[] {
  // Find all players in 1st place
  const winners = leaderboard.filter(p => p.position === 1)
  const deadHeatDivisor = winners.length > 1 ? winners.length : 1

  return leaderboard.map(p => ({
    selectionId: p.eventPlayerId, // Caller maps to actual selection ID
    isWinner: p.position === 1,
    deadHeatDivisor: p.position === 1 ? deadHeatDivisor : 1,
  }))
}

/**
 * Determine top-3 results from a final leaderboard.
 */
export function resolveTop3Results(
  leaderboard: { eventPlayerId: string; position: number; isTied: boolean }[],
): SelectionResult[] {
  // Players with position ≤ 3 are in the top 3
  // But ties at 3rd extend the top-3 and trigger dead heat
  const inTop3 = leaderboard.filter(p => p.position <= 3)
  const tiedAt3 = leaderboard.filter(p => p.position === 3)

  // If more than one player tied at 3rd, dead heat applies to all at 3rd
  const dhDivisor = tiedAt3.length > 1 ? tiedAt3.length : 1

  return leaderboard.map(p => ({
    selectionId: p.eventPlayerId,
    isWinner: p.position <= 3,
    deadHeatDivisor: p.position === 3 ? dhDivisor : 1,
  }))
}

/**
 * Determine last-place result from a final leaderboard.
 */
export function resolveLastPlaceResults(
  leaderboard: { eventPlayerId: string; position: number; isTied: boolean }[],
): SelectionResult[] {
  const maxPos = Math.max(...leaderboard.map(p => p.position))
  const lastPlace = leaderboard.filter(p => p.position === maxPos)
  const dhDivisor = lastPlace.length > 1 ? lastPlace.length : 1

  return leaderboard.map(p => ({
    selectionId: p.eventPlayerId,
    isWinner: p.position === maxPos,
    deadHeatDivisor: p.position === maxPos ? dhDivisor : 1,
  }))
}

/**
 * Determine H2H result between two players.
 */
export function resolveH2HResult(
  playerAId: string,
  playerBId: string,
  scoreA: number,
  scoreB: number,
  format: 'stableford' | 'strokeplay',
): SelectionResult[] {
  // Stableford: higher is better. Strokeplay: lower is better.
  const aWins = format === 'stableford' ? scoreA > scoreB : scoreA < scoreB
  const bWins = format === 'stableford' ? scoreB > scoreA : scoreB < scoreA
  const tie = scoreA === scoreB

  if (tie) {
    // Dead heat — both "win" with divisor 2 (each gets half winnings)
    return [
      { selectionId: playerAId, isWinner: true, deadHeatDivisor: 2 },
      { selectionId: playerBId, isWinner: true, deadHeatDivisor: 2 },
    ]
  }

  return [
    { selectionId: playerAId, isWinner: aWins, deadHeatDivisor: 1 },
    { selectionId: playerBId, isWinner: bWins, deadHeatDivisor: 1 },
  ]
}
