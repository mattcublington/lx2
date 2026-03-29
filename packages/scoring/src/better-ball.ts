import type { BetterBallInput, BetterBallResult, BetterBallHole } from './types.js'
import { calculateStableford } from './stableford.js'
import { distributeStrokes } from './handicap.js'

/**
 * Calculate better ball (fourball) result for a pair.
 *
 * Stableford mode: higher points of the two partners counts per hole.
 * Stroke play mode: lower net score of the two partners counts per hole.
 */
export function calculateBetterBall(input: BetterBallInput): BetterBallResult {
  const { holes, playerA, playerB, mode } = input

  if (mode === 'stableford') {
    return calculateBetterBallStableford(holes, playerA, playerB)
  }
  return calculateBetterBallStrokeplay(holes, playerA, playerB)
}

function calculateBetterBallStableford(
  holes: BetterBallInput['holes'],
  playerA: BetterBallInput['playerA'],
  playerB: BetterBallInput['playerB']
): BetterBallResult {
  const resultA = calculateStableford({
    holes,
    grossStrokes: playerA.grossStrokes,
    playingHandicap: playerA.playingHandicap,
  })
  const resultB = calculateStableford({
    holes,
    grossStrokes: playerB.grossStrokes,
    playingHandicap: playerB.playingHandicap,
  })

  const betterHoles: BetterBallHole[] = []
  let pairTotal = 0
  let playerATotalUsed = 0
  let playerBTotalUsed = 0

  for (let i = 0; i < holes.length; i++) {
    const hole = holes[i]!
    const ptsA = resultA.pointsPerHole[i] ?? 0
    const ptsB = resultB.pointsPerHole[i] ?? 0
    const netA = resultA.netStrokes[i] ?? null
    const netB = resultB.netStrokes[i] ?? null

    const aPickedUp = playerA.grossStrokes[i] === null || playerA.grossStrokes[i] === undefined
    const bPickedUp = playerB.grossStrokes[i] === null || playerB.grossStrokes[i] === undefined

    let selectedPlayer: BetterBallHole['selectedPlayer']
    let pairScore: number

    if (aPickedUp && bPickedUp) {
      selectedPlayer = 'both_pickup'
      pairScore = 0
    } else if (bPickedUp || ptsA >= ptsB) {
      // A's score used (or A wins tie by convention)
      selectedPlayer = 'A'
      pairScore = ptsA
      playerATotalUsed++
    } else {
      selectedPlayer = 'B'
      pairScore = ptsB
      playerBTotalUsed++
    }

    pairTotal += pairScore
    betterHoles.push({
      holeNumber: hole.holeNumber,
      selectedPlayer,
      pairScore,
      playerANet: netA,
      playerBNet: netB,
    })
  }

  return { holes: betterHoles, pairTotal, playerATotalUsed, playerBTotalUsed, nR: false }
}

function calculateBetterBallStrokeplay(
  holes: BetterBallInput['holes'],
  playerA: BetterBallInput['playerA'],
  playerB: BetterBallInput['playerB']
): BetterBallResult {
  const strokesA = distributeStrokes(playerA.playingHandicap, holes)
  const strokesB = distributeStrokes(playerB.playingHandicap, holes)

  const betterHoles: BetterBallHole[] = []
  let pairTotal = 0
  let playerATotalUsed = 0
  let playerBTotalUsed = 0
  let nR = false

  for (let i = 0; i < holes.length; i++) {
    const hole = holes[i]!
    const grossA = playerA.grossStrokes[i]
    const grossB = playerB.grossStrokes[i]

    const aPickedUp = grossA === null || grossA === undefined
    const bPickedUp = grossB === null || grossB === undefined

    const netA = aPickedUp ? null : grossA - (strokesA[i] ?? 0)
    const netB = bPickedUp ? null : grossB - (strokesB[i] ?? 0)

    let selectedPlayer: BetterBallHole['selectedPlayer']
    let pairScore: number

    if (aPickedUp && bPickedUp) {
      selectedPlayer = 'both_pickup'
      pairScore = 0
      nR = true // both picked up = NR for the pair
    } else if (bPickedUp || (netA !== null && netB !== null && netA <= netB)) {
      selectedPlayer = 'A'
      pairScore = netA!
      playerATotalUsed++
    } else if (aPickedUp || (netB !== null && (netA === null || netB < netA))) {
      selectedPlayer = 'B'
      pairScore = netB!
      playerBTotalUsed++
    } else {
      // Equal net scores — use A by convention
      selectedPlayer = 'A'
      pairScore = netA!
      playerATotalUsed++
    }

    pairTotal += pairScore
    betterHoles.push({
      holeNumber: hole.holeNumber,
      selectedPlayer,
      pairScore,
      playerANet: netA,
      playerBNet: netB,
    })
  }

  return { holes: betterHoles, pairTotal, playerATotalUsed, playerBTotalUsed, nR }
}
