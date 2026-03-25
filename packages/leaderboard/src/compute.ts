import {
  calculateStableford,
  calculateStrokePlay,
  calculatePlayingHandicap,
} from '@lx2/scoring'
import type { HoleData } from '@lx2/scoring'
import type { PlayerData, ComputedRow, LeaderboardConfig } from './types'

// ─── Main computation ─────────────────────────────────────────────────────────

export function computeLeaderboard(
  players: PlayerData[],
  liveScores: Map<string, (number | null)[]>,
  holeData: HoleData[],
  config: LeaderboardConfig,
): ComputedRow[] {
  const { format, roundType, allowancePct } = config

  const rows: ComputedRow[] = players.map(player => {
    const grossStrokes = player.scorecardId
      ? (liveScores.get(player.scorecardId) ?? player.grossStrokes)
      : player.grossStrokes

    const playingHandicap = calculatePlayingHandicap(player.handicapIndex, roundType, { allowancePct })
    const thru = grossStrokes.filter(s => s !== null).length

    let score = 0
    let nR = false
    let perHole: number[]

    if (format === 'stableford') {
      const result = calculateStableford({ holes: holeData, grossStrokes, playingHandicap })
      score = result.total
      perHole = result.pointsPerHole
    } else {
      const result = calculateStrokePlay({ holes: holeData, grossStrokes, playingHandicap })
      score = result.grossTotal ?? 0
      nR = result.nR
      perHole = grossStrokes.map(s => s ?? 0)
    }

    return {
      positionLabel: '–',
      isFirst: false,
      player,
      grossStrokes,
      thru,
      score,
      nR,
      perHole,
      playingHandicap,
    }
  })

  // Sort: active > NR > not started
  rows.sort((a, b) => {
    const aActive = a.thru > 0 && !a.nR
    const bActive = b.thru > 0 && !b.nR

    if (aActive && !bActive) return -1
    if (!aActive && bActive) return 1

    if (!aActive && !bActive) {
      if (a.nR && !b.nR) return -1
      if (!a.nR && b.nR) return 1
      return 0
    }

    if (format === 'stableford') {
      if (b.score !== a.score) return b.score - a.score
      return countback(b.perHole, a.perHole, b.grossStrokes, a.grossStrokes, 'desc')
    } else {
      if (a.score !== b.score) return a.score - b.score
      return countback(a.perHole, b.perHole, a.grossStrokes, b.grossStrokes, 'asc')
    }
  })

  // Assign position labels with ties
  let i = 0
  while (i < rows.length) {
    const row = rows[i]!

    if (row.thru === 0) { row.positionLabel = '–'; i++; continue }
    if (row.nR)         { row.positionLabel = 'NR'; i++; continue }

    let j = i
    while (
      j + 1 < rows.length &&
      rows[j + 1]!.thru > 0 &&
      !rows[j + 1]!.nR &&
      rows[j + 1]!.score === row.score
    ) {
      j++
    }

    const rank = i + 1
    const label = j > i ? `T${rank}` : `${rank}`
    for (let k = i; k <= j; k++) {
      rows[k]!.positionLabel = label
      rows[k]!.isFirst = rank === 1
    }
    i = j + 1
  }

  return rows
}

// ─── Countback ────────────────────────────────────────────────────────────────

export function countback(
  aScores: number[],
  bScores: number[],
  aGross: (number | null)[],
  bGross: (number | null)[],
  dir: 'asc' | 'desc',
): number {
  const n = aScores.length
  const slices = Array.from(new Set([
    Math.floor(n / 2),
    Math.floor(n / 3),
    3,
    1,
  ])).filter(k => k > 0 && k <= n)

  for (const k of slices) {
    let sumA = 0, sumB = 0
    for (let i = n - k; i < n; i++) {
      if (aGross[i] !== null && aGross[i] !== undefined) sumA += aScores[i] ?? 0
      if (bGross[i] !== null && bGross[i] !== undefined) sumB += bScores[i] ?? 0
    }
    if (sumA !== sumB) {
      return dir === 'desc' ? sumB - sumA : sumA - sumB
    }
  }
  return 0
}
