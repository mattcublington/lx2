export interface PlayerRoundResult {
  userId: string | null
  displayName: string
  stablefordTotal: number
  grossTotal: number
}

export interface TournamentRoundResult {
  roundNumber: number
  finalised: boolean
  results: PlayerRoundResult[]
}

export interface TournamentStanding {
  userId: string
  displayName: string
  roundScores: Record<number, number>
  roundsPlayed: number
  total: number
  position: number
}

export function computeTournamentStandings(
  rounds: TournamentRoundResult[],
  format: 'stableford' | 'strokeplay',
  dnsPolicy: 'exclude' | 'penalty',
): TournamentStanding[] {
  const finalisedRounds = rounds.filter(r => r.finalised)
  if (finalisedRounds.length === 0) return []

  const playerMap = new Map<string, { displayName: string; roundScores: Map<number, number>; roundsPlayed: number }>()

  for (const round of finalisedRounds) {
    for (const result of round.results) {
      if (result.userId === null) continue
      if (!playerMap.has(result.userId)) {
        playerMap.set(result.userId, {
          displayName: result.displayName,
          roundScores: new Map(),
          roundsPlayed: 0,
        })
      }
      const player = playerMap.get(result.userId)!
      const score = format === 'stableford' ? result.stablefordTotal : result.grossTotal
      player.roundScores.set(round.roundNumber, score)
      player.roundsPlayed++
    }
  }

  if (dnsPolicy === 'penalty') {
    for (const round of finalisedRounds) {
      let penaltyScore: number
      if (format === 'stableford') {
        penaltyScore = 0
      } else {
        const maxStrokes = Math.max(...round.results.map(r => r.grossTotal), 0)
        penaltyScore = maxStrokes + 10
      }
      for (const [, player] of playerMap) {
        if (!player.roundScores.has(round.roundNumber)) {
          player.roundScores.set(round.roundNumber, penaltyScore)
        }
      }
    }
  }

  const standings: TournamentStanding[] = []
  for (const [userId, player] of playerMap) {
    let total = 0
    const roundScoresObj: Record<number, number> = {}
    for (const [roundNum, score] of player.roundScores) {
      total += score
      roundScoresObj[roundNum] = score
    }
    standings.push({
      userId,
      displayName: player.displayName,
      roundScores: roundScoresObj,
      roundsPlayed: player.roundsPlayed,
      total,
      position: 0,
    })
  }

  standings.sort((a, b) => {
    const scoreDiff = format === 'stableford' ? b.total - a.total : a.total - b.total
    if (scoreDiff !== 0) return scoreDiff
    if (a.roundsPlayed !== b.roundsPlayed) return b.roundsPlayed - a.roundsPlayed
    const aScores = Object.values(a.roundScores)
    const bScores = Object.values(b.roundScores)
    const aBest = format === 'stableford' ? Math.max(...aScores) : Math.min(...aScores)
    const bBest = format === 'stableford' ? Math.max(...bScores) : Math.min(...bScores)
    const bestDiff = format === 'stableford' ? bBest - aBest : aBest - bBest
    if (bestDiff !== 0) return bestDiff
    return a.displayName.localeCompare(b.displayName)
  })

  standings.forEach((s, i) => { s.position = i + 1 })

  return standings
}
