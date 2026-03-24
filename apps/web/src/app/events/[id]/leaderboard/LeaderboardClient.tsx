'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  calculateStableford,
  calculateStrokePlay,
  calculatePlayingHandicap,
} from '@lx2/scoring'
import type { HoleData } from '@lx2/scoring'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlayerData {
  eventPlayerId: string
  scorecardId: string | null
  displayName: string
  handicapIndex: number
  grossStrokes: (number | null)[]
  badges: { type: 'ntp' | 'ld'; holeNumber: number }[]
}

interface ComputedRow {
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

interface Props {
  eventId: string
  format: 'stableford' | 'strokeplay'
  roundType: '18' | '9'
  allowancePct: number
  holeData: HoleData[]
  initialPlayers: PlayerData[]
  ntpHoles: number[]
  ldHoles: number[]
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LeaderboardClient({
  eventId,
  format,
  roundType,
  allowancePct,
  holeData,
  initialPlayers,
  ntpHoles,
  ldHoles,
}: Props) {
  const totalHoles = roundType === '9' ? 9 : 18

  // Live scores: scorecardId → grossStrokes array
  const [liveScores, setLiveScores] = useState<Map<string, (number | null)[]>>(() => {
    const map = new Map<string, (number | null)[]>()
    for (const p of initialPlayers) {
      if (p.scorecardId) map.set(p.scorecardId, [...p.grossStrokes])
    }
    return map
  })

  const [connected, setConnected] = useState(false)
  const [flashId, setFlashId] = useState<string | null>(null)

  const validIds = useMemo(
    () => new Set(initialPlayers.map(p => p.scorecardId).filter((s): s is string => s !== null)),
    [initialPlayers],
  )

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`leaderboard-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hole_scores' },
        payload => {
          const row = payload.new as {
            scorecard_id: string
            hole_number: number
            gross_strokes: number | null
          }
          if (!row?.scorecard_id || !validIds.has(row.scorecard_id)) return

          setLiveScores(prev => {
            const next = new Map(prev)
            const existing = next.get(row.scorecard_id) ?? new Array<number | null>(totalHoles).fill(null)
            const arr = [...existing]
            if (row.hole_number >= 1 && row.hole_number <= totalHoles) {
              arr[row.hole_number - 1] = row.gross_strokes
            }
            next.set(row.scorecard_id, arr)
            return next
          })

          setFlashId(row.scorecard_id)
          const t = setTimeout(() => setFlashId(null), 1400)
          return () => clearTimeout(t)
        },
      )
      .subscribe(status => setConnected(status === 'SUBSCRIBED'))

    return () => { supabase.removeChannel(channel) }
  }, [eventId, validIds, totalHoles])

  const leaderboard = useMemo(
    () => computeLeaderboard(initialPlayers, liveScores, holeData, format, roundType, allowancePct),
    [initialPlayers, liveScores, holeData, format, roundType, allowancePct],
  )

  return (
    <main style={{
      background: '#F2F5F0',
      minHeight: 'calc(100dvh - 116px)',
      padding: '14px 16px 80px',
    }}>

      {/* Live indicator bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
        padding: '0 2px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: connected ? '#22c55e' : '#9ca3af',
            display: 'inline-block',
            flexShrink: 0,
            animation: connected ? 'pulse-dot 2s ease-in-out infinite' : 'none',
          }} />
          <span style={{
            fontSize: '0.6875rem',
            fontFamily: 'var(--font-dm-sans), sans-serif',
            fontWeight: 700,
            color: connected ? '#0D631B' : '#9ca3af',
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
          }}>
            {connected ? 'Live' : 'Connecting…'}
          </span>
        </div>
        <span style={{
          fontSize: '0.75rem',
          color: '#9ca3af',
          fontFamily: 'var(--font-dm-sans), sans-serif',
        }}>
          {leaderboard.length} player{leaderboard.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Rows */}
      {leaderboard.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '72px 24px',
          color: '#6B8C6B',
          fontFamily: 'var(--font-dm-sans), sans-serif',
          fontSize: '0.9375rem',
        }}>
          No confirmed players yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {leaderboard.map((row, i) => (
            <PlayerRow
              key={row.player.eventPlayerId}
              row={row}
              format={format}
              holeData={holeData}
              ntpHoles={ntpHoles}
              ldHoles={ldHoles}
              isFlashing={row.player.scorecardId === flashId}
              animDelay={Math.min(i * 0.045, 0.32)}
            />
          ))}
        </div>
      )}
    </main>
  )
}

// ─── Player row ───────────────────────────────────────────────────────────────

interface PlayerRowProps {
  row: ComputedRow
  format: 'stableford' | 'strokeplay'
  holeData: HoleData[]
  ntpHoles: number[]
  ldHoles: number[]
  isFlashing: boolean
  animDelay: number
}

function PlayerRow({ row, format, holeData, ntpHoles, ldHoles, isFlashing, animDelay }: PlayerRowProps) {
  const isFirst = row.isFirst
  const isDim = row.positionLabel === '–'

  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      border: isFirst ? '1px solid #b6d9ba' : '1px solid #E0EBE0',
      borderLeft: isFirst ? '4px solid #0D631B' : '1px solid #E0EBE0',
      overflow: 'hidden',
      animation: 'lb-in 0.35s ease both',
      animationDelay: `${animDelay}s`,
      boxShadow: isFlashing ? '0 0 0 3px rgba(13,99,27,0.18)' : 'none',
      transition: 'box-shadow 0.5s ease',
      opacity: isDim ? 0.55 : 1,
    }}>

      {/* Main row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '18px 20px',
        gap: 14,
      }}>

        {/* Position number */}
        <div style={{
          minWidth: 52,
          fontFamily: 'var(--font-dm-serif), serif',
          fontSize: row.positionLabel.length > 2 ? '1.75rem' : '2.75rem',
          fontWeight: 400,
          color: isFirst ? '#0D631B' : isDim ? '#b0c4b0' : '#1A2E1A',
          lineHeight: 1,
          flexShrink: 0,
        }}>
          {row.positionLabel}
        </div>

        {/* Name + sub-line */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--font-dm-sans), sans-serif',
              fontWeight: 600,
              fontSize: '1.0625rem',
              color: '#1A2E1A',
              lineHeight: 1.25,
              wordBreak: 'break-word',
            }}>
              {row.player.displayName}
            </span>
            {row.player.badges.map((b, idx) => (
              <span key={idx} style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 5,
                background: b.type === 'ntp' ? '#FEF3C7' : '#DBEAFE',
                color: b.type === 'ntp' ? '#92400E' : '#1E40AF',
                fontFamily: 'var(--font-dm-sans), sans-serif',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}>
                {b.type === 'ntp' ? '🎯' : '🏌️'} H{b.holeNumber}
              </span>
            ))}
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#6B8C6B',
            fontFamily: 'var(--font-dm-sans), sans-serif',
            marginTop: 4,
          }}>
            {`hcp ${row.playingHandicap}`}&nbsp;&middot;&nbsp;
            {row.thru === 0
              ? 'not started'
              : row.thru === holeData.length
                ? 'F'
                : `thru ${row.thru}`}
          </div>
        </div>

        {/* Score */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontFamily: 'var(--font-dm-sans), sans-serif',
            fontWeight: 700,
            fontSize: '2.5rem',
            color: isFirst ? '#0D631B' : '#1A2E1A',
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}>
            {row.nR ? 'NR' : row.thru === 0 ? '–' : row.score}
          </div>
          {row.thru > 0 && !row.nR && (
            <div style={{
              fontSize: '0.6875rem',
              color: '#6B8C6B',
              fontFamily: 'var(--font-dm-sans), sans-serif',
              marginTop: 2,
            }}>
              {format === 'stableford' ? 'pts' : 'gross'}
            </div>
          )}
        </div>
      </div>

      {/* Hole strip — hidden for not-started players */}
      {row.thru > 0 && (
        <div style={{
          borderTop: '1px solid #F2F5F0',
          padding: '10px 20px 14px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          <div style={{ display: 'flex', gap: 4, minWidth: 'max-content' }}>
            {holeData.map((hole, idx) => (
              <HoleDot
                key={hole.holeNumber}
                holeNumber={hole.holeNumber}
                par={hole.par}
                grossStroke={row.grossStrokes[idx] ?? null}
                pointValue={format === 'stableford' ? row.perHole[idx] ?? 0 : null}
                format={format}
                isContest={ntpHoles.includes(hole.holeNumber) || ldHoles.includes(hole.holeNumber)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Hole dot ─────────────────────────────────────────────────────────────────

interface HoleDotProps {
  holeNumber: number
  par: number
  grossStroke: number | null
  pointValue: number | null // stableford points; null for strokeplay
  format: 'stableford' | 'strokeplay'
  isContest: boolean
}

function HoleDot({ holeNumber, par, grossStroke, pointValue, format, isContest }: HoleDotProps) {
  const played = grossStroke !== null

  let bg = 'transparent'
  let textColor = '#c0c0c0'
  let border = '1.5px solid #E0EBE0'
  let label = ''

  if (played) {
    border = 'none'
    if (format === 'stableford' && pointValue !== null) {
      label = String(pointValue)
      if (pointValue >= 3)      { bg = '#0D631B'; textColor = '#fff' }
      else if (pointValue === 2) { bg = '#D1FAE5'; textColor = '#065F46' }
      else if (pointValue === 1) { bg = '#FEF3C7'; textColor = '#92400E' }
      else                       { bg = '#FEE2E2'; textColor = '#B91C1C' }
    } else if (format === 'strokeplay') {
      const rel = (grossStroke ?? 0) - par
      label = String(grossStroke)
      if (rel <= -1)      { bg = '#0D631B'; textColor = '#fff' }
      else if (rel === 0) { bg = '#D1FAE5'; textColor = '#065F46' }
      else if (rel === 1) { bg = '#FEF3C7'; textColor = '#92400E' }
      else                { bg = '#FEE2E2'; textColor = '#B91C1C' }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {/* Hole label / contest star */}
      <span style={{
        fontSize: '0.5rem',
        color: isContest ? '#f59e0b' : '#c0ccbf',
        fontFamily: 'var(--font-dm-sans), sans-serif',
        lineHeight: 1,
        fontWeight: isContest ? 700 : 400,
        letterSpacing: '-0.02em',
      }}>
        {isContest ? '★' : holeNumber}
      </span>
      {/* Score dot */}
      <div style={{
        width: 26,
        height: 26,
        borderRadius: '50%',
        background: bg,
        border,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.625rem',
        fontWeight: 700,
        color: textColor,
        fontFamily: 'var(--font-dm-sans), sans-serif',
        lineHeight: 1,
        flexShrink: 0,
      }}>
        {label}
      </div>
    </div>
  )
}

// ─── Scoring computation ──────────────────────────────────────────────────────

function computeLeaderboard(
  players: PlayerData[],
  liveScores: Map<string, (number | null)[]>,
  holeData: HoleData[],
  format: 'stableford' | 'strokeplay',
  roundType: '18' | '9',
  allowancePct: number,
): ComputedRow[] {
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

  // Sort: fully scored > NR > not started
  rows.sort((a, b) => {
    const aActive = a.thru > 0 && !a.nR
    const bActive = b.thru > 0 && !b.nR

    if (aActive && !bActive) return -1
    if (!aActive && bActive) return 1

    if (!aActive && !bActive) {
      // NR before not-started
      if (a.nR && !b.nR) return -1
      if (!a.nR && b.nR) return 1
      return 0
    }

    // Both active — compare by score
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

    // Find end of tied group
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

// Countback: compare back-half, back-third, back-3, last hole
// For stableford uses points (desc); for strokeplay uses gross strokes where played (asc)
function countback(
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
      // Only count holes that were actually played
      if (aGross[i] !== null && aGross[i] !== undefined) sumA += aScores[i] ?? 0
      if (bGross[i] !== null && bGross[i] !== undefined) sumB += bScores[i] ?? 0
    }
    if (sumA !== sumB) {
      return dir === 'desc' ? sumB - sumA : sumA - sumB
    }
  }
  return 0
}
