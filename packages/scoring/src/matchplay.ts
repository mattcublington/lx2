import type { MatchPlayInput, MatchPlayResult, HoleResult } from './types.js'
import { calculateHandicap, distributeStrokes } from './handicap.js'

/**
 * Calculate match play result hole-by-hole.
 *
 * Handicap strokes are based on the DIFFERENCE between the two players'
 * playing handicaps. The higher-handicap player receives strokes.
 */
export function calculateMatchPlay(input: MatchPlayInput): MatchPlayResult {
  const { holes, playerA, playerB, slopeRating, courseRating, par } = input

  const hcA = calculateHandicap(
    { handicapIndex: playerA.handicapIndex, slopeRating, courseRating, par },
    holes
  ).playingHandicap

  const hcB = calculateHandicap(
    { handicapIndex: playerB.handicapIndex, slopeRating, courseRating, par },
    holes
  ).playingHandicap

  const diff = hcA - hcB
  // If diff > 0, B gives strokes to A; if diff < 0, A gives strokes to B
  const strokesForA = diff > 0 ? distributeStrokes(diff, holes) : new Array(holes.length).fill(0)
  const strokesForB = diff < 0 ? distributeStrokes(Math.abs(diff), holes) : new Array(holes.length).fill(0)

  const holeResults: HoleResult[] = []
  let holesUp = 0 // positive = A leads

  for (let i = 0; i < holes.length; i++) {
    const grossA = playerA.grossStrokes[i]
    const grossB = playerB.grossStrokes[i]

    if (grossA === null || grossB === null) {
      holeResults.push('pending')
      continue
    }

    const netA = grossA - (strokesForA[i] ?? 0)
    const netB = grossB - (strokesForB[i] ?? 0)

    let result: HoleResult
    if (netA < netB) {
      result = 'A'
      holesUp++
    } else if (netB < netA) {
      result = 'B'
      holesUp--
    } else {
      result = 'halved'
    }
    holeResults.push(result)

    // Check if match is over (lead > holes remaining)
    const holesPlayed = i + 1
    const holesRemaining = holes.length - holesPlayed
    if (Math.abs(holesUp) > holesRemaining) {
      // Fill remaining as pending
      for (let j = holesPlayed; j < holes.length; j++) {
        holeResults.push('pending')
      }
      break
    }
  }

  const holesRemaining = holes.length - holeResults.filter((r) => r !== 'pending').length
  const matchOver = Math.abs(holesUp) > holesRemaining || holesRemaining === 0

  let matchStatus: string
  let winner: 'A' | 'B' | null = null

  if (matchOver) {
    winner = holesUp > 0 ? 'A' : 'B'
    const holesPlayed = holeResults.filter((r) => r !== 'pending').length
    if (holesRemaining === 0 && Math.abs(holesUp) > 0) {
      matchStatus = `${winner} wins 1 up`
    } else {
      matchStatus = `${winner} wins ${Math.abs(holesUp)}&${holesRemaining}`
    }
  } else if (holesUp === 0) {
    matchStatus = 'all square'
  } else {
    const leader = holesUp > 0 ? 'A' : 'B'
    matchStatus = `${leader} ${Math.abs(holesUp)} up`
    if (holesRemaining === Math.abs(holesUp)) {
      matchStatus += ' (dormie)'
    }
  }

  return { holeResults, matchStatus, holesUp, matchOver, winner }
}
