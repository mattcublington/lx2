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
  vsParLabel: string
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? 'th')
}

function formatVsPar(diff: number): string {
  if (diff === 0) return 'E'
  return diff > 0 ? `+${diff}` : `${diff}`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
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
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
  }

  /* ── Body ── */
  .lb-body {
    padding: 16px 16px 80px;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  /* ── Progress card ── */
  .lb-progress-card {
    background: #fff;
    border-radius: 16px;
    padding: 0.875rem 1.25rem;
    text-align: center;
    font-size: 0.875rem;
    color: var(--muted);
    box-shadow: 0 4px 12px rgba(26, 28, 28, 0.04);
  }
  .lb-progress-card strong {
    color: var(--forest);
    font-weight: 600;
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

  /* ── Card main row ── */
  .lb-row {
    display: flex;
    align-items: center;
    padding: 14px 16px;
    gap: 12px;
  }

  /* ── Rank badge (circle, medal colours) ── */
  .lb-rank {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-manrope), 'Manrope', sans-serif;
    font-weight: 700;
    font-size: 0.6875rem;
    line-height: 1;
  }
  .lb-rank.r1 {
    background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
    color: #1A2E1A;
  }
  .lb-rank.r2 {
    background: linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%);
    color: #1A2E1A;
  }
  .lb-rank.r3 {
    background: linear-gradient(135deg, #CD7F32 0%, #B8722E 100%);
    color: #ffffff;
  }
  .lb-rank.r-other {
    background: rgba(26, 28, 28, 0.08);
    color: #1A2E1A;
  }
  .lb-rank.r-nr {
    background: #FEE2E2;
    color: #B91C1C;
    font-size: 0.5625rem;
  }
  .lb-rank.r-ns {
    background: #F9FAFB;
    color: #9CA3AF;
    font-size: 1rem;
  }

  /* ── Avatar ── */
  .lb-avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: linear-gradient(135deg, #2D5016 0%, #0D631B 100%);
    color: #fff;
    font-size: 0.8125rem;
    font-weight: 700;
    font-family: var(--font-manrope), 'Manrope', sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    letter-spacing: -0.01em;
  }

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
    font-size: 0.9375rem;
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
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-weight: 400;
  }

  /* ── Score block ── */
  .lb-score-block {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .lb-score {
    font-family: var(--font-manrope), 'Manrope', sans-serif;
    font-weight: 800;
    font-size: 1.75rem;
    line-height: 1;
    letter-spacing: -0.04em;
    color: var(--forest);
  }
  .lb-score.leader { color: var(--green-dark); }
  .lb-pts-pill {
    background: linear-gradient(135deg, rgba(45,80,22,0.1) 0%, rgba(61,107,26,0.1) 100%);
    padding: 0.3rem 0.625rem;
    border-radius: 10px;
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-weight: 500;
    font-size: 0.6875rem;
    color: var(--green-dark);
    white-space: nowrap;
  }

  /* ── Chevron toggle ── */
  .lb-chevron {
    flex-shrink: 0;
    color: #c0ccc0;
    transition: transform 0.2s ease;
    margin-left: 2px;
  }
  .lb-chevron.open { transform: rotate(180deg); }

  /* ── Scorecard table (expanded) ── */
  .lb-sc-wrap {
    border-top: 1px solid rgba(26,28,28,0.06);
    padding: 1.25rem 1rem 1.5rem;
    overflow-x: auto;
    scrollbar-width: none;
    animation: lb-strip-in 0.22s ease both;
    position: relative;
  }
  .lb-sc-wrap::-webkit-scrollbar { display: none; }
  .lb-sc-wrap::after {
    content: '';
    position: absolute;
    top: 0; right: 0; bottom: 0;
    width: 32px;
    background: linear-gradient(to left, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%);
    pointer-events: none;
  }
  .lb-sc-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    min-width: 220px;
  }
  .lb-sc-table th {
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-weight: 500;
    font-size: 0.6875rem;
    color: var(--muted);
    text-align: center;
    padding: 0.375rem 0.5rem;
    border-bottom: 1px solid rgba(26,28,28,0.06);
  }
  .lb-sc-table td {
    text-align: center;
    padding: 0.625rem 0.5rem;
    border-bottom: 1px solid rgba(26,28,28,0.06);
  }
  .lb-sc-table tr:last-child td { border-bottom: none; }
  .lb-sc-hole {
    width: 28px; height: 28px;
    border-radius: 50%;
    background: rgba(26,28,28,0.05);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-manrope), 'Manrope', sans-serif;
    font-weight: 600;
    font-size: 0.8125rem;
    color: var(--forest);
  }
  .lb-sc-par {
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-size: 0.875rem;
    color: #44483E;
  }
  .lb-sc-score {
    font-family: var(--font-manrope), 'Manrope', sans-serif;
    font-weight: 700;
    font-size: 1rem;
  }
  .lb-sc-score.under-par { color: #2D5016; }
  .lb-sc-score.over-par  { color: #923357; }
  .lb-sc-score.at-par    { color: var(--forest); }
  .lb-sc-score.unplayed  { color: #c0c0c0; font-weight: 400; font-size: 0.875rem; }
  .lb-sc-pts {
    background: rgba(45,80,22,0.08);
    padding: 0.2rem 0.4rem;
    border-radius: 6px;
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-weight: 500;
    font-size: 0.75rem;
    color: var(--green-dark);
    display: inline-block;
    white-space: nowrap;
  }
  .lb-sc-total {
    text-align: right;
    font-family: var(--font-manrope), 'Manrope', sans-serif;
    font-weight: 700;
    font-size: 0.875rem;
    color: var(--green-dark);
    padding-top: 0.5rem;
  }

  /* ── Empty state ── */
  .lb-empty {
    text-align: center;
    padding: 72px 24px;
    color: var(--muted);
    font-size: 0.9375rem;
  }

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
  const maxThru = leaderboard.reduce((max, r) => Math.max(max, r.thru), 0)
  const allFinished = startedCount > 0 && leaderboard.filter(r => r.thru > 0).every(r => r.thru === totalHoles)

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
          {/* Progress indicator */}
          {maxThru > 0 && (
            <div className="lb-progress-card">
              {allFinished
                ? <p><strong>All finished</strong> &middot; Final results</p>
                : <p><strong>Thru {maxThru} hole{maxThru !== 1 ? 's' : ''}</strong> &middot; Competition in progress</p>
              }
            </div>
          )}

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
  const base = posLabel.replace('T', '')
  if (base === '1') return 'r1'
  if (base === '2') return 'r2'
  if (base === '3') return 'r3'
  if (posLabel === '–') return 'r-ns'
  return 'r-other'
}

function rankLabel(posLabel: string, thru: number, nR: boolean): string {
  if (thru === 0) return '–'
  if (nR) return 'NR'
  if (posLabel === '–') return '–'
  if (posLabel.startsWith('T')) return posLabel
  const n = parseInt(posLabel, 10)
  return isNaN(n) ? posLabel : getOrdinal(n)
}

function PlayerCard({ row, format, holeData, ntpHoles, ldHoles, isFlashing, isExpanded, onToggle, animDelay }: PlayerCardProps) {
  const isDim = row.positionLabel === '–' && row.thru === 0 && !row.nR
  const isLeader = row.positionLabel === '1' || row.positionLabel === 'T1'

  const cardClass = [
    'lb-card',
    isFlashing ? 'flash' : '',
    isDim ? 'dim' : '',
  ].filter(Boolean).join(' ')

  const scoreClass = ['lb-score', isLeader ? 'leader' : ''].filter(Boolean).join(' ')

  const thruLabel = row.thru === 0
    ? 'Not started'
    : row.thru === holeData.length
      ? 'Finished'
      : `Thru ${row.thru}`

  const subLabel = row.thru > 0 && !row.nR
    ? `${row.vsParLabel} · ${thruLabel}`
    : `hcp ${row.playingHandicap} · ${thruLabel}`

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
          {rankLabel(row.positionLabel, row.thru, row.nR)}
        </div>

        {/* Avatar */}
        <div className="lb-avatar">
          {getInitials(row.player.displayName)}
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
          <div className="lb-sub">{subLabel}</div>
        </div>

        {/* Score + pill */}
        <div className="lb-score-block">
          {row.thru > 0 && !row.nR ? (
            <>
              <span className={scoreClass}>{row.score}</span>
              <span className="lb-pts-pill">
                {format === 'stableford' ? `${row.score} pts` : 'gross'}
              </span>
            </>
          ) : (
            <span className="lb-score" style={{ fontSize: '1.25rem', color: '#c0ccc0' }}>–</span>
          )}
        </div>

        {/* Chevron */}
        {row.thru > 0 && (
          <svg
            className={`lb-chevron ${isExpanded ? 'open' : ''}`}
            width="16" height="16" viewBox="0 0 16 16" fill="none"
          >
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      {/* Scorecard table (expanded) */}
      {row.thru > 0 && isExpanded && (
        <ScorecardTable
          holeData={holeData}
          grossStrokes={row.grossStrokes}
          perHole={row.perHole}
          format={format}
          ntpHoles={ntpHoles}
          ldHoles={ldHoles}
        />
      )}
    </div>
  )
}

// ─── Scorecard table ──────────────────────────────────────────────────────────

interface ScorecardTableProps {
  holeData: HoleData[]
  grossStrokes: (number | null)[]
  perHole: number[]
  format: 'stableford' | 'strokeplay'
  ntpHoles: number[]
  ldHoles: number[]
}

function ScorecardTable({ holeData, grossStrokes, perHole, format, ntpHoles, ldHoles }: ScorecardTableProps) {
  const playedHoles = holeData.filter((_, i) => grossStrokes[i] !== null)
  const totalPts = format === 'stableford'
    ? perHole.reduce((s, p, i) => grossStrokes[i] !== null ? s + p : s, 0)
    : playedHoles.reduce((s, h, i) => {
        const actualIdx = holeData.indexOf(h)
        return s + (grossStrokes[actualIdx] ?? 0) - h.par
      }, 0)

  const lastHoleIndex = holeData.reduce((last, _, i) => grossStrokes[i] !== null ? i : last, -1)

  return (
    <div className="lb-sc-wrap">
      <table className="lb-sc-table">
        <thead>
          <tr>
            <th>Hole</th>
            <th>Par</th>
            <th>Score</th>
            <th>{format === 'stableford' ? 'Points' : '+/−'}</th>
          </tr>
        </thead>
        <tbody>
          {holeData.map((hole, idx) => {
            const gross = grossStrokes[idx] ?? null
            const pts = perHole[idx] ?? 0
            const played = gross !== null
            const isContest = ntpHoles.includes(hole.holeNumber) || ldHoles.includes(hole.holeNumber)
            const isLast = idx === lastHoleIndex

            let scoreClass = 'lb-sc-score unplayed'
            if (played) {
              const rel = gross - hole.par
              if (rel < 0) scoreClass = 'lb-sc-score under-par'
              else if (rel > 0) scoreClass = 'lb-sc-score over-par'
              else scoreClass = 'lb-sc-score at-par'
            }

            const ptLabel = format === 'stableford'
              ? `${pts} pt${pts !== 1 ? 's' : ''}`
              : played ? formatVsPar(gross - hole.par) : '–'

            return (
              <tr key={hole.holeNumber} style={isLast ? { fontWeight: 600 } : undefined}>
                <td>
                  <span className="lb-sc-hole" style={isContest ? { outline: '2px solid #f59e0b', outlineOffset: '1px' } : undefined}>
                    {hole.holeNumber}
                  </span>
                </td>
                <td><span className="lb-sc-par">{hole.par}</span></td>
                <td>
                  <span className={scoreClass}>
                    {played ? gross : '–'}
                  </span>
                </td>
                <td>
                  {played
                    ? <span className="lb-sc-pts">{ptLabel}</span>
                    : <span style={{ color: '#c0c0c0', fontSize: '0.875rem' }}>–</span>
                  }
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="lb-sc-total">
        {format === 'stableford'
          ? `Total: ${totalPts} pts`
          : `Total: ${formatVsPar(totalPts)}`
        }
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

    const grossTotal = grossStrokes.reduce<number>((s, g) => s + (g ?? 0), 0)
    const parForPlayed = holeData
      .filter((_, i) => grossStrokes[i] !== null)
      .reduce((s, h) => s + h.par, 0)
    const vsParLabel = thru > 0 ? formatVsPar(grossTotal - parForPlayed) : ''

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
      vsParLabel,
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
