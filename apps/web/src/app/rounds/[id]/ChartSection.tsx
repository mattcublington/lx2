'use client'

import { useState } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ChartHole {
  holeInRound: number
  par: number
  siM: number | null
  yards: Record<string, number>
}

type Mode = 'gross' | 'net'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function scoreLabel(d: number, net: boolean): string {
  const prefix = net ? 'Net ' : ''
  if (d <= -3) return net ? 'Net Albatross' : 'Albatross'
  if (d === -2) return net ? 'Net Eagle' : 'Eagle'
  if (d === -1) return `${prefix}Birdie`
  if (d === 0) return `${prefix}Par`
  if (d === 1) return `${prefix}Bogey`
  if (d === 2) return `${prefix}Double`
  return `${prefix}+${d}`
}

// ─── SVG Chart ─────────────────────────────────────────────────────────────────

function HoleChart({
  holes,
  scores,
  hcStrokes,
  mode,
}: {
  holes: ChartHole[]
  scores: Record<number, number | null>
  hcStrokes: Record<number, number>
  mode: Mode
}) {
  const W = 320
  const H = 128
  const ML = 28
  const MR = 8
  const MT = 12
  const MB = 24
  const plotW = W - ML - MR
  const plotH = H - MT - MB

  const n = holes.length
  if (n === 0) return null

  const relScores: (number | null)[] = holes.map(h => {
    const g = scores[h.holeInRound]
    if (g == null) return null
    const strokes = mode === 'net' ? (hcStrokes[h.holeInRound] ?? 0) : 0
    return g - strokes - h.par
  })

  const scored = relScores.filter((v): v is number => v !== null)
  const rawMin = scored.length > 0 ? Math.min(...scored) : -1
  const rawMax = scored.length > 0 ? Math.max(...scored) : 2
  const yMin = Math.min(rawMin - 0.5, -1.5)
  const yMax = Math.max(rawMax + 0.5, 2.5)
  const yRange = yMax - yMin

  function xAt(i: number): number {
    return ML + (i / (n - 1 || 1)) * plotW
  }
  function yAt(v: number): number {
    return MT + plotH - ((v - yMin) / yRange) * plotH
  }
  const y0 = yAt(0)

  const segments: { x: number; y: number }[][] = []
  let current: { x: number; y: number }[] = []
  for (let i = 0; i < n; i++) {
    const v = relScores[i]
    if (v !== null && v !== undefined) {
      current.push({ x: xAt(i), y: yAt(v) })
    } else {
      if (current.length >= 2) segments.push(current)
      current = []
    }
  }
  if (current.length >= 2) segments.push(current)

  const yTicks: number[] = []
  for (let t = Math.ceil(yMin); t <= Math.floor(yMax); t++) {
    yTicks.push(t)
  }

  const xLabelEvery = n <= 9 ? 2 : 3

  function dotFill(v: number | null): string {
    if (v === null) return 'none'
    if (v <= -2) return '#F59E0B'
    if (v === -1) return '#0D631B'
    if (v === 0) return '#72786E'
    if (v === 1) return '#B45309'
    return '#DC2626'
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      aria-label="Hole-by-hole score chart"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <line x1={ML} y1={y0} x2={W - MR} y2={y0}
        stroke="rgba(26,28,28,0.15)" strokeWidth="1" strokeDasharray="3 3"
      />

      {yTicks.map(t => {
        const y = yAt(t)
        const label = t === 0 ? 'E' : t > 0 ? `+${t}` : `${t}`
        const isZero = t === 0
        return (
          <g key={t}>
            <line x1={ML - 4} y1={y} x2={ML} y2={y} stroke="rgba(26,28,28,0.2)" strokeWidth="1" />
            <text
              x={ML - 6} y={y + 4}
              textAnchor="end"
              fontSize="9"
              fill={isZero ? 'rgba(26,28,28,0.5)' : 'rgba(26,28,28,0.35)'}
              fontFamily="'Manrope', sans-serif"
              fontWeight={isZero ? '700' : '400'}
            >{label}</text>
          </g>
        )
      })}

      {holes.map((h, i) => {
        if (i % xLabelEvery !== 0 && i !== n - 1) return null
        return (
          <text
            key={h.holeInRound}
            x={xAt(i)}
            y={H - 4}
            textAnchor="middle"
            fontSize="9"
            fill="rgba(26,28,28,0.4)"
            fontFamily="'Lexend', sans-serif"
          >{h.holeInRound}</text>
        )
      })}

      {segments.map((seg, si) => (
        <polyline
          key={si}
          points={seg.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#0D631B"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.7"
        />
      ))}

      {holes.map((h, i) => {
        const v = relScores[i]
        if (v == null) return null
        const cx = xAt(i)
        const cy = yAt(v)
        return (
          <circle
            key={h.holeInRound}
            cx={cx} cy={cy} r="4"
            fill={dotFill(v)}
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
        )
      })}
    </svg>
  )
}

// ─── ChartSection ──────────────────────────────────────────────────────────────

export default function ChartSection({
  holes,
  scores,
  hcStrokes,
}: {
  holes: ChartHole[]
  scores: Record<number, number | null>
  hcStrokes: Record<number, number>
}) {
  const [mode, setMode] = useState<Mode>('gross')
  const isNet = mode === 'net'

  return (
    <>
      <style>{`
        .cs-hd {
          padding: 1rem 1.25rem 0.625rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(26,28,28,0.06);
        }
        .cs-hd-label {
          font-family: var(--font-lexend), sans-serif;
          font-size: 0.6875rem;
          font-weight: 500;
          color: #72786E;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }
        .cs-toggle {
          display: flex;
          border-radius: 8px;
          border: 1px solid rgba(26,28,28,0.12);
          overflow: hidden;
          background: rgba(26,28,28,0.04);
        }
        .cs-toggle-btn {
          font-family: var(--font-lexend), sans-serif;
          font-size: 0.6875rem;
          font-weight: 500;
          padding: 0.2rem 0.6rem;
          border: none;
          background: transparent;
          color: #72786E;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
          line-height: 1.4;
        }
        .cs-toggle-btn.active {
          background: #0D631B;
          color: #ffffff;
        }
        .cs-toggle-btn:first-child { border-radius: 7px 0 0 7px; }
        .cs-toggle-btn:last-child  { border-radius: 0 7px 7px 0; }
      `}</style>

      <div className="cs-hd">
        <span className="cs-hd-label">Score per hole vs par</span>
        <div className="cs-toggle" role="group" aria-label="Chart mode">
          <button
            className={`cs-toggle-btn${!isNet ? ' active' : ''}`}
            onClick={() => setMode('gross')}
          >Gross</button>
          <button
            className={`cs-toggle-btn${isNet ? ' active' : ''}`}
            onClick={() => setMode('net')}
          >Net</button>
        </div>
      </div>

      <div className="rs-chart-legend">
        <span className="rs-legend-dot" style={{ background: '#0D631B' }} /> {isNet ? 'Net Birdie' : 'Birdie'}
        <span className="rs-legend-dot" style={{ background: '#72786E', marginLeft: '0.75rem' }} /> {isNet ? 'Net Par' : 'Par'}
        <span className="rs-legend-dot" style={{ background: '#B45309', marginLeft: '0.75rem' }} /> {isNet ? 'Net Bogey' : 'Bogey'}
        <span className="rs-legend-dot" style={{ background: '#DC2626', marginLeft: '0.75rem' }} /> {isNet ? 'Net Double+' : 'Double+'}
      </div>

      <HoleChart holes={holes} scores={scores} hcStrokes={hcStrokes} mode={mode} />

      <div className="rs-chart-footer">
        {holes.map(h => {
          const g = scores[h.holeInRound]
          if (g == null) return null
          const strokes = isNet ? (hcStrokes[h.holeInRound] ?? 0) : 0
          const d = g - strokes - h.par
          if (d <= -1) return (
            <span key={h.holeInRound} className="rs-highlight-pill green">
              {scoreLabel(d, isNet)} (H{h.holeInRound})
            </span>
          )
          if (d >= 2) return (
            <span key={h.holeInRound} className="rs-highlight-pill red">
              {scoreLabel(d, isNet)} (H{h.holeInRound})
            </span>
          )
          return null
        })}
      </div>
    </>
  )
}
