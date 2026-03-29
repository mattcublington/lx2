// ─── Odds engine: Bradley-Terry model with live adjustments ──────────────────

import { normalCdf, probABeatsB } from './math'
import type {
  PlayerForm,
  OddsConfig,
  FractionalOdds,
  SelectionOdds,
  MarketOdds,
  OverUnderMarket,
  OverUnderSelection,
} from './types'
import { STABLEFORD_HOLE_VARIANCE, BASE_POINTS_PER_HOLE } from './types'

// ─── Core helpers ────────────────────────────────────────────────────────────

/**
 * Expected final score for a player based on current score + projected remaining.
 * Remaining holes are projected at 2 pts/hole (average Stableford for a player
 * playing to their handicap).
 */
function projectedScore(player: PlayerForm): number {
  const remaining = player.totalHoles - player.holesPlayed
  return player.currentScore + remaining * BASE_POINTS_PER_HOLE
}

/**
 * Remaining variance for a player: variance per hole × holes remaining.
 */
function remainingVariance(player: PlayerForm): number {
  const remaining = player.totalHoles - player.holesPlayed
  return remaining * STABLEFORD_HOLE_VARIANCE
}

/**
 * Bradley-Terry strength parameter from handicap index.
 * Lower handicap = higher strength. We invert and scale so that
 * a 0-handicapper has strength ~36 (expected 36 pts on 18 holes)
 * and a 36-handicapper also has ~36 but with more variance.
 *
 * For opening odds (pre-play), the expected score is
 * BASE_POINTS_PER_HOLE × totalHoles for everyone playing to handicap,
 * but lower-handicap players have a slight edge due to less variance.
 * We add a small form bonus inversely proportional to handicap.
 */
function bradleyTerryStrength(handicapIndex: number, totalHoles: number): number {
  const baseExpected = BASE_POINTS_PER_HOLE * totalHoles
  // Slight edge for lower handicappers: 0.05 pts/hole per handicap unit below 18
  const formBonus = (18 - handicapIndex) * 0.05
  return baseExpected + formBonus
}

// ─── Fractional odds conversion ──────────────────────────────────────────────

/** Common fractional odds ladder for clean display */
const ODDS_LADDER: FractionalOdds[] = [
  { numerator: 1, denominator: 10 },
  { numerator: 1, denominator: 8 },
  { numerator: 1, denominator: 6 },
  { numerator: 1, denominator: 5 },
  { numerator: 1, denominator: 4 },
  { numerator: 2, denominator: 7 },
  { numerator: 1, denominator: 3 },
  { numerator: 4, denominator: 9 },
  { numerator: 1, denominator: 2 },
  { numerator: 4, denominator: 7 },
  { numerator: 8, denominator: 13 },
  { numerator: 4, denominator: 6 },
  { numerator: 8, denominator: 11 },
  { numerator: 4, denominator: 5 },
  { numerator: 5, denominator: 6 },
  { numerator: 10, denominator: 11 },
  { numerator: 1, denominator: 1 },
  { numerator: 11, denominator: 10 },
  { numerator: 6, denominator: 5 },
  { numerator: 5, denominator: 4 },
  { numerator: 11, denominator: 8 },
  { numerator: 6, denominator: 4 },
  { numerator: 13, denominator: 8 },
  { numerator: 7, denominator: 4 },
  { numerator: 15, denominator: 8 },
  { numerator: 2, denominator: 1 },
  { numerator: 9, denominator: 4 },
  { numerator: 5, denominator: 2 },
  { numerator: 11, denominator: 4 },
  { numerator: 3, denominator: 1 },
  { numerator: 7, denominator: 2 },
  { numerator: 4, denominator: 1 },
  { numerator: 9, denominator: 2 },
  { numerator: 5, denominator: 1 },
  { numerator: 6, denominator: 1 },
  { numerator: 7, denominator: 1 },
  { numerator: 8, denominator: 1 },
  { numerator: 10, denominator: 1 },
  { numerator: 12, denominator: 1 },
  { numerator: 14, denominator: 1 },
  { numerator: 16, denominator: 1 },
  { numerator: 20, denominator: 1 },
  { numerator: 25, denominator: 1 },
  { numerator: 33, denominator: 1 },
  { numerator: 40, denominator: 1 },
  { numerator: 50, denominator: 1 },
  { numerator: 66, denominator: 1 },
  { numerator: 80, denominator: 1 },
  { numerator: 100, denominator: 1 },
]

/**
 * Convert an adjusted probability to the nearest standard fractional odds.
 */
export function probabilityToFractionalOdds(prob: number): FractionalOdds {
  if (prob <= 0) return { numerator: 100, denominator: 1 }
  if (prob >= 1) return { numerator: 1, denominator: 10 }

  // Target decimal odds = 1 / prob
  const targetDecimal = 1 / prob
  let bestDist = Infinity
  let best: FractionalOdds = { numerator: 1, denominator: 1 }

  for (const entry of ODDS_LADDER) {
    const decimal = entry.numerator / entry.denominator + 1
    const dist = Math.abs(decimal - targetDecimal)
    if (dist < bestDist) {
      bestDist = dist
      best = entry
    }
  }
  return best
}

/**
 * Convert fractional odds to decimal (e.g. 5/1 → 6.0)
 */
export function fractionalToDecimal(odds: FractionalOdds): number {
  return odds.numerator / odds.denominator + 1
}

// ─── Multi-player win probabilities ──────────────────────────────────────────

/**
 * Calculate raw win probability for each player in a multi-player field.
 *
 * Uses pairwise comparison: for each player, compute probability of beating
 * every other player, then normalise so probabilities sum to 1.
 *
 * This is a simplified Bradley-Terry approach that works well for
 * amateur golf fields of 4-30 players.
 */
export function calculateWinProbabilities(players: PlayerForm[]): Map<string, number> {
  if (players.length === 0) return new Map()
  if (players.length === 1) return new Map([[players[0]!.eventPlayerId, 1.0]])

  const n = players.length
  const rawScores = new Map<string, number>()

  for (let i = 0; i < n; i++) {
    const pi = players[i]!
    let winProduct = 1.0

    for (let j = 0; j < n; j++) {
      if (i === j) continue
      const pj = players[j]!

      let gap: number
      let varI: number
      let varJ: number

      if (pi.holesPlayed > 0) {
        // In-play: use projected scores
        gap = projectedScore(pi) - projectedScore(pj)
        varI = remainingVariance(pi)
        varJ = remainingVariance(pj)
      } else {
        // Pre-play: use handicap-based strength
        gap = bradleyTerryStrength(pi.handicapIndex, pi.totalHoles) -
              bradleyTerryStrength(pj.handicapIndex, pj.totalHoles)
        varI = pi.totalHoles * STABLEFORD_HOLE_VARIANCE
        varJ = pj.totalHoles * STABLEFORD_HOLE_VARIANCE
      }

      winProduct *= probABeatsB(gap, varI, varJ)
    }

    rawScores.set(pi.eventPlayerId, winProduct)
  }

  // Normalise to sum to 1
  const total = Array.from(rawScores.values()).reduce((s, v) => s + v, 0)
  const result = new Map<string, number>()
  for (const [id, raw] of rawScores) {
    result.set(id, total > 0 ? raw / total : 1 / n)
  }
  return result
}

// ─── Market generation ───────────────────────────────────────────────────────

/**
 * Generate outright winner market with overround applied.
 */
export function generateOutrightMarket(
  players: PlayerForm[],
  config: OddsConfig,
): MarketOdds {
  const winProbs = calculateWinProbabilities(players)
  const overround = config.overroundPct / 100

  const selections: SelectionOdds[] = players
    .map(p => {
      const rawProb = winProbs.get(p.eventPlayerId) ?? (1 / players.length)
      const adjProb = Math.min(rawProb * overround, 0.99)
      const frac = probabilityToFractionalOdds(adjProb)
      return {
        eventPlayerId: p.eventPlayerId,
        label: p.displayName,
        rawProbability: rawProb,
        adjustedProbability: adjProb,
        fractionalOdds: frac,
        decimalOdds: fractionalToDecimal(frac),
      }
    })
    .sort((a, b) => a.decimalOdds - b.decimalOdds) // favourite first

  return {
    marketType: 'outright',
    title: 'Outright Winner',
    selections,
  }
}

/**
 * Generate a head-to-head market between two players.
 */
export function generateH2HMarket(
  playerA: PlayerForm,
  playerB: PlayerForm,
  config: OddsConfig,
): MarketOdds {
  let gap: number
  let varA: number
  let varB: number

  if (playerA.holesPlayed > 0) {
    gap = projectedScore(playerA) - projectedScore(playerB)
    varA = remainingVariance(playerA)
    varB = remainingVariance(playerB)
  } else {
    gap = bradleyTerryStrength(playerA.handicapIndex, playerA.totalHoles) -
          bradleyTerryStrength(playerB.handicapIndex, playerB.totalHoles)
    varA = playerA.totalHoles * STABLEFORD_HOLE_VARIANCE
    varB = playerB.totalHoles * STABLEFORD_HOLE_VARIANCE
  }

  const rawProbA = probABeatsB(gap, varA, varB)
  const rawProbB = 1 - rawProbA
  const overround = config.h2hOverroundPct / 100

  const adjA = Math.min(rawProbA * overround, 0.99)
  const adjB = Math.min(rawProbB * overround, 0.99)

  const fracA = probabilityToFractionalOdds(adjA)
  const fracB = probabilityToFractionalOdds(adjB)

  return {
    marketType: 'head_to_head',
    title: `${playerA.displayName} vs ${playerB.displayName}`,
    selections: [
      {
        eventPlayerId: playerA.eventPlayerId,
        label: playerA.displayName,
        rawProbability: rawProbA,
        adjustedProbability: adjA,
        fractionalOdds: fracA,
        decimalOdds: fractionalToDecimal(fracA),
      },
      {
        eventPlayerId: playerB.eventPlayerId,
        label: playerB.displayName,
        rawProbability: rawProbB,
        adjustedProbability: adjB,
        fractionalOdds: fracB,
        decimalOdds: fractionalToDecimal(fracB),
      },
    ],
  }
}

/**
 * Generate top-3 finish market.
 */
export function generateTop3Market(
  players: PlayerForm[],
  config: OddsConfig,
): MarketOdds {
  if (players.length <= 3) {
    // Everyone finishes top 3 — pointless market
    return { marketType: 'top_3', title: 'Top 3 Finish', selections: [] }
  }

  const winProbs = calculateWinProbabilities(players)
  const overround = config.overroundPct / 100

  // Approximate top-3 prob: sum of win prob contributions weighted by position
  // Simple heuristic: top-3 prob ≈ 1 - (1 - winProb)^3 for small fields
  const selections: SelectionOdds[] = players.map(p => {
    const rawWin = winProbs.get(p.eventPlayerId) ?? (1 / players.length)
    // Approximate: prob of finishing top 3 in a field of N
    const rawTop3 = Math.min(1 - Math.pow(1 - rawWin, 3) * Math.pow((players.length - 3) / players.length, 2), 0.99)
    const adjProb = Math.min(rawTop3 * overround, 0.99)
    const frac = probabilityToFractionalOdds(adjProb)
    return {
      eventPlayerId: p.eventPlayerId,
      label: p.displayName,
      rawProbability: rawTop3,
      adjustedProbability: adjProb,
      fractionalOdds: frac,
      decimalOdds: fractionalToDecimal(frac),
    }
  }).sort((a, b) => a.decimalOdds - b.decimalOdds)

  return { marketType: 'top_3', title: 'Top 3 Finish', selections }
}

/**
 * Generate last-place market.
 */
export function generateLastPlaceMarket(
  players: PlayerForm[],
  config: OddsConfig,
): MarketOdds {
  if (players.length <= 1) {
    return { marketType: 'last_place', title: 'Last Place', selections: [] }
  }

  // Invert win probabilities — highest handicap / worst projected = most likely last
  const winProbs = calculateWinProbabilities(players)
  const overround = config.overroundPct / 100

  // Last place prob ≈ inverse of win prob, normalised
  const rawLast = new Map<string, number>()
  let rawTotal = 0
  for (const p of players) {
    const wp = winProbs.get(p.eventPlayerId) ?? (1 / players.length)
    const inv = 1 / Math.max(wp, 0.001)
    rawLast.set(p.eventPlayerId, inv)
    rawTotal += inv
  }

  const selections: SelectionOdds[] = players.map(p => {
    const raw = (rawLast.get(p.eventPlayerId) ?? 1) / rawTotal
    const adj = Math.min(raw * overround, 0.99)
    const frac = probabilityToFractionalOdds(adj)
    return {
      eventPlayerId: p.eventPlayerId,
      label: p.displayName,
      rawProbability: raw,
      adjustedProbability: adj,
      fractionalOdds: frac,
      decimalOdds: fractionalToDecimal(frac),
    }
  }).sort((a, b) => a.decimalOdds - b.decimalOdds)

  return { marketType: 'last_place', title: 'Last Place', selections }
}

/**
 * Generate over/under Stableford total for a specific player.
 */
export function generateOverUnderMarket(
  player: PlayerForm,
  config: OddsConfig,
): OverUnderMarket {
  const projected = projectedScore(player)
  // Round to nearest 0.5 for the line
  const line = Math.round(projected * 2) / 2

  const remaining = player.totalHoles - player.holesPlayed
  const variance = remaining * STABLEFORD_HOLE_VARIANCE
  const sd = Math.sqrt(variance)

  // P(score > line) using normal CDF
  const rawOver = sd > 0 ? 1 - normalCdf((line - projected) / sd) : (projected > line ? 1.0 : 0.0)
  const rawUnder = 1 - rawOver

  const overround = config.h2hOverroundPct / 100
  const adjOver = Math.min(rawOver * overround, 0.99)
  const adjUnder = Math.min(rawUnder * overround, 0.99)

  const fracOver = probabilityToFractionalOdds(adjOver)
  const fracUnder = probabilityToFractionalOdds(adjUnder)

  const makeSelection = (
    label: string,
    rawProb: number,
    adjProb: number,
    frac: FractionalOdds,
  ): OverUnderSelection => ({
    label,
    line,
    rawProbability: rawProb,
    adjustedProbability: adjProb,
    fractionalOdds: frac,
    decimalOdds: fractionalToDecimal(frac),
  })

  return {
    marketType: 'over_under',
    title: `${player.displayName} — Over/Under ${line} pts`,
    eventPlayerId: player.eventPlayerId,
    line,
    over: makeSelection(`Over ${line}`, rawOver, adjOver, fracOver),
    under: makeSelection(`Under ${line}`, rawUnder, adjUnder, fracUnder),
  }
}

/**
 * Generate all standard markets for an event.
 */
export function generateAllMarkets(
  players: PlayerForm[],
  config: OddsConfig,
  options?: {
    /** Flight groups: map of flight_number → player IDs */
    groups?: Map<number, string[]> | undefined
    /** Generate H2H markets within groups */
    h2hWithinGroups?: boolean | undefined
  },
): {
  outright: MarketOdds
  top3: MarketOdds
  lastPlace: MarketOdds
  h2hMarkets: MarketOdds[]
  groupMarkets: MarketOdds[]
  overUnderMarkets: OverUnderMarket[]
} {
  const outright = generateOutrightMarket(players, config)
  const top3 = generateTop3Market(players, config)
  const lastPlace = generateLastPlaceMarket(players, config)

  const h2hMarkets: MarketOdds[] = []
  const groupMarkets: MarketOdds[] = []

  if (options?.groups && options.h2hWithinGroups !== false) {
    const playerMap = new Map(players.map(p => [p.eventPlayerId, p]))

    for (const [flightNum, ids] of options.groups) {
      const groupPlayers = ids.map(id => playerMap.get(id)).filter((p): p is PlayerForm => p !== undefined)

      if (groupPlayers.length >= 2) {
        // Group winner market
        const groupOutright = generateOutrightMarket(groupPlayers, config)
        groupMarkets.push({
          ...groupOutright,
          marketType: 'group_winner',
          title: `Group ${flightNum} Winner`,
        })

        // H2H within the group
        for (let i = 0; i < groupPlayers.length; i++) {
          for (let j = i + 1; j < groupPlayers.length; j++) {
            h2hMarkets.push(generateH2HMarket(groupPlayers[i]!, groupPlayers[j]!, config))
          }
        }
      }
    }
  }

  // Over/under for each player
  const overUnderMarkets = players.map(p => generateOverUnderMarket(p, config))

  return { outright, top3, lastPlace, h2hMarkets, groupMarkets, overUnderMarkets }
}
