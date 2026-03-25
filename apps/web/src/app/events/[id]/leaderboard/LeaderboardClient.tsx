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

// ─── Styles ───────────────────────────────────────────────────────────────────

const STYLES = `
  :root {
    --forest: #1A2E1A;
    --green-dark: #2D5016;
    --green-mid: #3a7d44;
    --green-primary: #0D631B;
    --green-light: #D1FAE5;
    --green-faint: #F2F5F0;
    --green-border: #E0EBE0;
    --muted: #6B8C6B;
    --amber: #92400E;
    --amber-bg: #FEF3C7;
    --red-bg: #FEE2E2;
    --red-text: #B91C1C;
  }

  .lb-wrap {
    background: var(--green-faint);
    min-height: 100dvh;
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
  }

  /* ── Live bar ── */
  .lb-live-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px 8px;
  }
  .lb-live-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
  }
  .lb-live-dot.connected {
    background: #4ade80;
    box-shadow: 0 0 0 2px rgba(74,222,128,0.25);
    animation: lb-pulse 2.2s ease-in-out infinite;
  }
  .lb-live-dot.disconnected { background: rgba(255,255,255,0.25); }
  .lb-live-label {
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-left: 7px;
  }
  .lb-live-label.connected { color: #4ade80; }
  .lb-live-label.disconnected { color: rgba(255,255,255,0.35); }
  .lb-count {
    font-size: 0.75rem;
    color: rgba(255,255,255,0.4);
    font-family: var(--font-lexend), 'Lexend', sans-serif;
  }

  /* ── Body ── */
  .lb-body {
    padding: 16px 16px 80px;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  /* ── Player card ── */
  .lb-card {
    background: #fff;
    border-radius: 16px;
    border: 1px solid var(--green-border);
    overflow: hidden;
    animation: lb-in 0.32s ease both;
    transition: box-shadow 0.4s ease, transform 0.15s ease;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .lb-card:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(13,99,27,0.1); }
  .lb-card.flash { box-shadow: 0 0 0 3px rgba(13,99,27,0.22); }
  .lb-card.dim { opacity: 0.5; }
  .lb-card.pos-1 { border-color: #b6d9ba; }

  /* ── Card main row ── */
  .lb-row {
    display: flex;
    align-items: center;
    padding: 16px 18px;
    gap: 14px;
  }

  /* ── Rank badge ── */
  .lb-rank {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-manrope), 'Manrope', sans-serif;
    font-weight: 800;
    font-size: 1rem;
    letter-spacing: -0.03em;
    line-height: 1;
  }
  .lb-rank.r1 {
    background: linear-gradient(135deg, #2D5016 0%, #0D631B 100%);
    color: #fff;
    box-shadow: 0 2px 8px rgba(13,99,27,0.35);
  }
  .lb-rank.r2 {
    background: #D1FAE5;
    color: #065F46;
  }
  .lb-rank.r3 {
    background: #EDE9FE;
    color: #5B21B6;
  }
  .lb-rank.r-other {
    background: #F2F5F0;
    color: #6B8C6B;
  }
  .lb-rank.r-nr {
    background: #FEE2E2;
    color: #B91C1C;
    font-size: 0.75rem;
  }
  .lb-rank.r-ns {
    background: #F9FAFB;
    color: #9CA3AF;
    font-size: 1.25rem;
  }
  .lb-rank.r-tied { font-size: 0.75rem; letter-spacing: 0; }

  /* ── Name block ── */
  .lb-name-block { flex: 1; min-width: 0; }
  .lb-name-row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .lb-name {
    font-weight: 600;
    font-size: 1rem;
    color: var(--forest);
    line-height: 1.25;
    word-break: break-word;
  }
  .lb-badge {
    font-size: 0.625rem;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 5px;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .lb-badge.ntp { background: var(--amber-bg); color: var(--amber); }
  .lb-badge.ld  { background: #DBEAFE; color: #1E40AF; }
  .lb-sub {
    font-size: 0.6875rem;
    color: var(--muted);
    margin-top: 3px;
    font-family: var(--font-lexend), 'Lexend', sans-serif;
    font-weight: 300;
  }

  /* ── Score ── */
  .lb-score-block {
    text-align: right;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }
  .lb-score {
    font-family: var(--font-manrope), 'Manrope', sans-serif;
    font-weight: 800;
    font-size: 2.25rem;
    line-height: 1;
    letter-spacing: -0.04em;
    color: var(--forest);
  }
  .lb-score.leader { color: var(--green-primary); }
  .lb-score-unit {
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
  }

  /* ── Progress bar ── */
  .lb-progress-wrap {
    padding: 0 18px 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .lb-progress-track {
    flex: 1;
    height: 3px;
    background: #EEF3EE;
    border-radius: 2px;
    overflow: hidden;
  }
  .lb-progress-fill {
    height: 100%;
    border-radius: 2px;
    background: var(--green-primary);
    transition: width 0.4s ease;
  }
  .lb-progress-label {
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--muted);
    white-space: nowrap;
  }

  /* ── Scorecard strip ── */
  .lb-strip-wrap {
    border-top: 1px solid var(--green-faint);
    padding: 12px 18px 16px;
    overflow-x: auto;
    scrollbar-width: none;
    animation: lb-strip-in 0.22s ease both;
  }
  .lb-strip-wrap::-webkit-scrollbar { display: none; }
  .lb-strip {
    display: flex;
    gap: 5px;
    min-width: max-content;
  }

  /* ── Hole dot ── */
  .lb-dot-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
  }
  .lb-dot-num {
    font-size: 0.5rem;
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.01em;
  }
  .lb-dot {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.625rem;
    font-weight: 700;
    line-height: 1;
    flex-shrink: 0;
  }

  /* ── Empty state ── */
  .lb-empty {
    text-align: center;
    padding: 72px 24px;
    color: var(--muted);
    font-size: 0.9375rem;
  }

  /* ── Chevron toggle ── */
  .lb-chevron {
    flex-shrink: 0;
    color: #c0ccc0;
    transition: transform 0.2s ease;
  }
  .lb-chevron.open { transform: rotate(180deg); }

  /* ── Animations ── */
  @keyframes lb-in {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes lb-strip-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes lb-pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }
`

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

  const [liveScores, setLiveScores] = useState<Map<string, (number | null)[]>>(() => {
    const map = new Map<string, (number | null)[]>()
    for (const p of initialPlayers) {
      if (p.scorecardId) map.set(p.scorecardId, [...p.grossStrokes])
    }
    return map
  })

  const [connected, setConnected] = useState(false)
  const [flashId, setFlashId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

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

  function toggleExpand(id: string) {
    setExpandedId(prev => prev === id ? null : id)
  }

  const startedCount = leaderboard.filter(r => r.thru > 0).length

  return (
    <>
      <style>{STYLES}</style>
      <div className="lb-wrap">

        {/* Live status bar */}
        <div className="lb-live-bar">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className={`lb-live-dot ${connected ? 'connected' : 'disconnected'}`} />
            <span className={`lb-live-label ${connected ? 'connected' : 'disconnected'}`}>
              {connected ? 'Live' : 'Connecting…'}
            </span>
          </div>
          <span className="lb-count">
            {startedCount}/{leaderboard.length} playing
          </span>
        </div>

        {/* Body */}
        <div className="lb-body">
          {leaderboard.length === 0 ? (
            <div className="lb-empty">No confirmed players yet.</div>
          ) : (
            leaderboard.map((row, i) => (
              <PlayerCard
                key={row.player.eventPlayerId}
                row={row}
                format={format}
                holeData={holeData}
                ntpHoles={ntpHoles}
                ldHoles={ldHoles}
                isFlashing={row.player.scorecardId === flashId}
                isExpanded={expandedId === row.player.eventPlayerId}
                onToggle={() => toggleExpand(row.player.eventPlayerId)}
                animDelay={Math.min(i * 0.04, 0.28)}
              />
            ))
          )}
        </div>
      </div>
    </>
  )
}

// ─── Player card ──────────────────────────────────────────────────────────────

interface PlayerCardProps {
  row: ComputedRow
  format: 'stableford' | 'strokeplay'
  holeData: HoleData[]
  ntpHoles: number[]
  ldHoles: number[]
  isFlashing: boolean
  isExpanded: boolean
  onToggle: () => void
  animDelay: number
}

function rankClass(posLabel: string, thru: number, nR: boolean): string {
  if (thru === 0) return 'r-ns'
  if (nR) return 'r-nr'
  if (posLabel === '1') return 'r1'
  if (posLabel === 'T1') return 'r1 r-tied'
  if (posLabel === '2' || posLabel === 'T2') {
    return posLabel.startsWith('T') ? 'r2 r-tied' : 'r2'
  }
  if (posLabel === '3' || posLabel === 'T3') {
    return posLabel.startsWith('T') ? 'r3 r-tied' : 'r3'
  }
  if (posLabel === '–') return 'r-ns'
  if (posLabel.startsWith('T')) return 'r-other r-tied'
  return 'r-other'
}

function PlayerCard({ row, format, holeData, ntpHoles, ldHoles, isFlashing, isExpanded, onToggle, animDelay }: PlayerCardProps) {
  const isDim = row.positionLabel === '–' && row.thru === 0 && !row.nR
  const totalHoles = holeData.length
  const progressPct = totalHoles > 0 ? (row.thru / totalHoles) * 100 : 0
  const isFinished = row.thru === totalHoles

  const cardClass = [
    'lb-card',
    row.positionLabel === '1' ? 'pos-1' : '',
    isFlashing ? 'flash' : '',
    isDim ? 'dim' : '',
  ].filter(Boolean).join(' ')

  const scoreClass = ['lb-score', (row.positionLabel === '1' || row.positionLabel === 'T1') ? 'leader' : ''].filter(Boolean).join(' ')

  const thruLabel = row.thru === 0
    ? 'Not started'
    : isFinished
      ? 'Finished'
      : `Thru ${row.thru}`

  return (
    <div
      className={cardClass}
      style={{ animationDelay: `${animDelay}s` }}
      onClick={row.thru > 0 ? onToggle : undefined}
      role={row.thru > 0 ? 'button' : undefined}
      tabIndex={row.thru > 0 ? 0 : undefined}
      onKeyDown={row.thru > 0 ? (e) => { if (e.key === 'Enter' || e.key === ' ') onToggle() } : undefined}
      aria-expanded={row.thru > 0 ? isExpanded : undefined}
    >
      {/* Main row */}
      <div className="lb-row">
        {/* Rank badge */}
        <div className={`lb-rank ${rankClass(row.positionLabel, row.thru, row.nR)}`}>
          {row.thru === 0 ? '–' : row.nR ? 'NR' : row.positionLabel}
        </div>

        {/* Name block */}
        <div className="lb-name-block">
          <div className="lb-name-row">
            <span className="lb-name">{row.player.displayName}</span>
            {row.player.badges.map((b, idx) => (
              <span key={idx} className={`lb-badge ${b.type}`}>
                {b.type === 'ntp' ? '🎯' : '🏌️'} H{b.holeNumber}
              </span>
            ))}
          </div>
          <div className="lb-sub">
            hcp {row.playingHandicap}&nbsp;&middot;&nbsp;{thruLabel}
          </div>
        </div>

        {/* Score */}
        <div className="lb-score-block">
          <span className={scoreClass}>
            {row.nR ? 'NR' : row.thru === 0 ? '–' : row.score}
          </span>
          {row.thru > 0 && !row.nR && (
            <span className="lb-score-unit">
              {format === 'stableford' ? 'pts' : 'gross'}
            </span>
          )}
        </div>

        {/* Chevron (only shown when started) */}
        {row.thru > 0 && (
          <svg
            className={`lb-chevron ${isExpanded ? 'open' : ''}`}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      {/* Progress bar */}
      {row.thru > 0 && !isFinished && (
        <div className="lb-progress-wrap">
          <div className="lb-progress-track">
            <div className="lb-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="lb-progress-label">{row.thru}/{totalHoles}</span>
        </div>
      )}

      {/* Scorecard strip (expanded) */}
      {row.thru > 0 && isExpanded && (
        <div className="lb-strip-wrap">
          <div className="lb-strip">
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
  pointValue: number | null
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
      if (pointValue >= 3)       { bg = '#0D631B'; textColor = '#fff' }
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
    <div className="lb-dot-col">
      <span
        className="lb-dot-num"
        style={{ color: isContest ? '#f59e0b' : '#c0ccbf', fontWeight: isContest ? 700 : 400 }}
      >
        {isContest ? '★' : holeNumber}
      </span>
      <div
        className="lb-dot"
        style={{ background: bg, border, color: textColor }}
      >
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
      if (aGross[i] !== null && aGross[i] !== undefined) sumA += aScores[i] ?? 0
      if (bGross[i] !== null && bGross[i] !== undefined) sumB += bScores[i] ?? 0
    }
    if (sumA !== sumB) {
      return dir === 'desc' ? sumB - sumA : sumA - sumB
    }
  }
  return 0
}
