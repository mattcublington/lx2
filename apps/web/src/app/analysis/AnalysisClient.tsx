'use client'

import Image from 'next/image'
import BottomNav from '@/components/BottomNav'

interface RoundSummary {
  id: string
  date: string
  courseName: string
  totalGross: number
  totalPar: number
  holesPlayed: number
  toPar: number
  eagles: number
  birdies: number
  pars: number
  bogeys: number
  doubles: number
  triples: number
}

interface Props {
  displayName: string
  handicapIndex: number | null
  rounds: RoundSummary[]
}

function formatMonth(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { month: 'short' })
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function AnalysisClient({ displayName, handicapIndex, rounds }: Props) {
  const hasData = rounds.length > 0

  // Aggregate stats
  const totalRounds = rounds.length
  const fullRounds = rounds.filter(r => r.holesPlayed >= 9)
  const avgScore = fullRounds.length > 0
    ? Math.round(fullRounds.reduce((s, r) => s + r.totalGross, 0) / fullRounds.length)
    : null
  const bestScore = fullRounds.length > 0
    ? Math.min(...fullRounds.map(r => r.totalGross))
    : null
  const avgToPar = fullRounds.length > 0
    ? (fullRounds.reduce((s, r) => s + r.toPar, 0) / fullRounds.length).toFixed(1)
    : null

  // Score distribution totals
  const dist = { eagles: 0, birdies: 0, pars: 0, bogeys: 0, doubles: 0, triples: 0 }
  for (const r of rounds) {
    dist.eagles += r.eagles
    dist.birdies += r.birdies
    dist.pars += r.pars
    dist.bogeys += r.bogeys
    dist.doubles += r.doubles
    dist.triples += r.triples
  }
  const distTotal = dist.eagles + dist.birdies + dist.pars + dist.bogeys + dist.doubles + dist.triples
  const distPct = (v: number) => distTotal > 0 ? (v / distTotal * 100) : 0

  // Scoring trend — last 10 rounds
  const trendRounds = fullRounds.slice(-10)

  // Score range for chart scaling
  const trendScores = trendRounds.map(r => r.totalGross)
  const trendMin = trendScores.length > 0 ? Math.min(...trendScores) - 3 : 70
  const trendMax = trendScores.length > 0 ? Math.max(...trendScores) + 3 : 110

  // SVG line chart points
  const chartW = 300
  const chartH = 140
  const chartPad = 20
  const trendPoints = trendRounds.map((r, i) => {
    const x = chartPad + (i / Math.max(trendRounds.length - 1, 1)) * (chartW - 2 * chartPad)
    const y = chartPad + ((trendMax - r.totalGross) / Math.max(trendMax - trendMin, 1)) * (chartH - 2 * chartPad)
    return { x, y, score: r.totalGross, date: r.date, course: r.courseName }
  })
  const trendLine = trendPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')

  // Par line (if we have par data)
  const avgPar = fullRounds.length > 0
    ? Math.round(fullRounds.reduce((s, r) => s + r.totalPar, 0) / fullRounds.length)
    : null
  const parY = avgPar != null
    ? chartPad + ((trendMax - avgPar) / Math.max(trendMax - trendMin, 1)) * (chartH - 2 * chartPad)
    : null

  return (
    <>
      <style>{`
        .an {
          min-height: 100dvh;
          background: #F0F4EC;
          font-family: var(--font-lexend), system-ui, sans-serif;
          color: #1A2E1A;
          padding-bottom: max(80px, calc(80px + env(safe-area-inset-bottom)));
        }
        .an-hero {
          position: relative;
          width: 100%;
          padding: 3rem 2rem 2rem;
          overflow: hidden;
        }
        .an-hero-img {
          position: absolute;
          inset: 0;
          object-fit: cover;
          width: 100%;
          height: 100%;
        }
        .an-hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(10, 31, 10, 0.6) 0%,
            rgba(10, 31, 10, 0.45) 50%,
            rgba(10, 31, 10, 0.35) 100%
          );
          z-index: 1;
        }
        .an-hero-inner {
          max-width: 1200px;
          margin: 0 auto;
          position: relative;
          z-index: 2;
        }
        .an-title {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 800;
          font-size: 1.75rem;
          color: #FFFFFF;
          letter-spacing: -0.01em;
          margin: 0;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
        }
        .an-subtitle {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.7);
          margin-top: 0.35rem;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }
        .an-main {
          padding: 1.5rem 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        /* ── Summary cards ── */
        .an-summary {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
          margin-bottom: 1.75rem;
          animation: an-rise 0.45s cubic-bezier(0.2, 0, 0, 1) both;
        }
        .an-sum-card {
          background: #FFFFFF;
          border-radius: 16px;
          padding: 1.25rem 1rem;
          box-shadow: 0 4px 12px rgba(26, 28, 28, 0.04);
          text-align: center;
        }
        .an-sum-card.highlight {
          background: linear-gradient(135deg, #0D631B 0%, #0a4f15 100%);
          color: #fff;
        }
        .an-sum-label {
          font-size: 0.6875rem;
          font-weight: 400;
          color: #72786E;
          margin-bottom: 0.35rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .an-sum-card.highlight .an-sum-label { color: rgba(255,255,255,0.7); }
        .an-sum-val {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 700;
          font-size: 1.75rem;
          letter-spacing: -0.02em;
          line-height: 1.1;
        }
        .an-sum-card.highlight .an-sum-val { color: #fff; }
        .an-sum-note {
          font-size: 0.6875rem;
          color: #72786E;
          margin-top: 0.25rem;
        }
        .an-sum-card.highlight .an-sum-note { color: rgba(255,255,255,0.6); }

        /* ── Section ── */
        .an-section {
          margin-bottom: 1.75rem;
          animation: an-rise 0.45s cubic-bezier(0.2, 0, 0, 1) both;
        }
        .an-section:nth-child(3) { animation-delay: 0.06s; }
        .an-section:nth-child(4) { animation-delay: 0.12s; }
        .an-section:nth-child(5) { animation-delay: 0.18s; }
        .an-section-title {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 700;
          font-size: 1.0625rem;
          color: #1A2E1A;
          margin-bottom: 0.75rem;
          letter-spacing: -0.01em;
        }

        /* ── Trend chart ── */
        .an-chart-card {
          background: #FFFFFF;
          border-radius: 16px;
          padding: 1.25rem;
          box-shadow: 0 4px 12px rgba(26, 28, 28, 0.04);
          overflow: hidden;
        }
        .an-chart-svg {
          width: 100%;
          height: auto;
        }
        .an-chart-line {
          fill: none;
          stroke: #0D631B;
          stroke-width: 2.5;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .an-chart-area {
          fill: url(#an-grad);
        }
        .an-chart-dot {
          fill: #0D631B;
          stroke: #fff;
          stroke-width: 2;
        }
        .an-chart-par {
          stroke: #E0EBE0;
          stroke-width: 1;
          stroke-dasharray: 6 4;
        }
        .an-chart-par-label {
          fill: #72786E;
          font-size: 9px;
          font-family: var(--font-lexend), sans-serif;
        }
        .an-chart-label {
          fill: #72786E;
          font-size: 8px;
          font-family: var(--font-lexend), sans-serif;
          text-anchor: middle;
        }
        .an-chart-score-label {
          fill: #1A2E1A;
          font-size: 8px;
          font-family: var(--font-manrope), sans-serif;
          font-weight: 700;
          text-anchor: middle;
        }

        /* ── Score distribution bars ── */
        .an-dist {
          background: #FFFFFF;
          border-radius: 16px;
          padding: 1.25rem;
          box-shadow: 0 4px 12px rgba(26, 28, 28, 0.04);
        }
        .an-dist-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.625rem;
        }
        .an-dist-row:last-child { margin-bottom: 0; }
        .an-dist-label {
          font-size: 0.75rem;
          font-weight: 500;
          color: #44483E;
          width: 72px;
          flex-shrink: 0;
          text-align: right;
        }
        .an-dist-track {
          flex: 1;
          height: 24px;
          background: rgba(240, 244, 236, 0.8);
          border-radius: 8px;
          overflow: hidden;
          position: relative;
        }
        .an-dist-bar {
          height: 100%;
          border-radius: 8px;
          transition: width 0.6s cubic-bezier(0.2, 0, 0, 1);
          display: flex;
          align-items: center;
          padding-left: 8px;
          min-width: fit-content;
        }
        .an-dist-bar span {
          font-size: 0.6875rem;
          font-weight: 600;
          color: #fff;
          white-space: nowrap;
        }
        .an-dist-count {
          font-size: 0.6875rem;
          font-weight: 600;
          color: #72786E;
          margin-left: 8px;
          flex-shrink: 0;
          width: 28px;
        }

        /* Distribution bar colours */
        .an-bar-eagle { background: linear-gradient(90deg, #FFB800, #FF9500); }
        .an-bar-birdie { background: linear-gradient(90deg, #0D631B, #15832a); }
        .an-bar-par { background: linear-gradient(90deg, #3D8B3D, #5aaa5a); }
        .an-bar-bogey { background: linear-gradient(90deg, #6B8C6B, #8aab8a); }
        .an-bar-double { background: linear-gradient(90deg, #A0785A, #c29878); }
        .an-bar-triple { background: linear-gradient(90deg, #923357, #b04a6f); }

        /* ── Recent rounds table ── */
        .an-rounds-card {
          background: #FFFFFF;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(26, 28, 28, 0.04);
        }
        .an-round-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.875rem 1.25rem;
          border-bottom: 1px solid rgba(26, 28, 28, 0.06);
        }
        .an-round-row:last-child { border-bottom: none; }
        .an-round-info { flex: 1; min-width: 0; }
        .an-round-course {
          font-weight: 500;
          font-size: 0.875rem;
          color: #1A2E1A;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .an-round-date {
          font-size: 0.75rem;
          color: #72786E;
        }
        .an-round-score {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 700;
          font-size: 1.125rem;
          flex-shrink: 0;
          margin-left: 0.75rem;
        }
        .an-round-par {
          font-size: 0.75rem;
          font-weight: 500;
          margin-left: 0.5rem;
          flex-shrink: 0;
        }
        .an-par-over { color: #923357; }
        .an-par-under { color: #0D631B; }
        .an-par-even { color: #72786E; }

        /* ── Handicap trend mini ── */
        .an-hcp-card {
          background: linear-gradient(135deg, #0a1f0a 0%, #1A2E1A 100%);
          border-radius: 16px;
          padding: 1.5rem 1.25rem;
          box-shadow: 0 4px 12px rgba(26, 28, 28, 0.04);
          color: #fff;
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }
        .an-hcp-val {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 800;
          font-size: 2.5rem;
          letter-spacing: -0.03em;
          line-height: 1;
        }
        .an-hcp-info { flex: 1; }
        .an-hcp-label {
          font-size: 0.8125rem;
          font-weight: 500;
          color: rgba(255,255,255,0.7);
          margin-bottom: 0.25rem;
        }
        .an-hcp-detail {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.5);
        }

        /* ── Empty state ── */
        .an-empty {
          text-align: center;
          padding: 3rem 1.5rem;
          background: #FFFFFF;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(26, 28, 28, 0.04);
        }
        .an-empty-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 1.25rem;
          background: linear-gradient(135deg, rgba(13, 99, 27, 0.1) 0%, rgba(61, 107, 26, 0.1) 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0D631B;
        }
        .an-empty h2 {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 700;
          font-size: 1.125rem;
          color: #1A2E1A;
          margin-bottom: 0.5rem;
        }
        .an-empty p {
          font-size: 0.875rem;
          color: #72786E;
          line-height: 1.6;
        }

        @keyframes an-rise {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (min-width: 768px) {
          .an-hero { padding: 3rem 2rem 2.25rem; }
          .an-main { max-width: 560px; padding: 2rem; }
          .an { padding-bottom: 0; }
        }
      `}</style>

      <div className="an">
        <div className="an-hero">
          <Image src="/hero.jpg" alt="" fill className="an-hero-img" priority />
          <div className="an-hero-overlay" />
          <div className="an-hero-inner">
            <h1 className="an-title">Analysis</h1>
            <p className="an-subtitle">{displayName}&apos;s performance overview</p>
          </div>
        </div>

        <main className="an-main">

          {!hasData ? (
            <div className="an-empty">
              <div className="an-empty-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M3 17l4-8 4 4 4-6 4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 21h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                </svg>
              </div>
              <h2>No round data yet</h2>
              <p>Play your first round and your stats,<br />trends and insights will appear here.</p>
            </div>
          ) : (
            <>
              {/* Handicap card */}
              {handicapIndex != null && (
                <div className="an-section">
                  <div className="an-hcp-card">
                    <div className="an-hcp-val">
                      {handicapIndex % 1 === 0 ? handicapIndex.toFixed(1) : handicapIndex}
                    </div>
                    <div className="an-hcp-info">
                      <div className="an-hcp-label">Handicap Index</div>
                      <div className="an-hcp-detail">Based on {totalRounds} round{totalRounds !== 1 ? 's' : ''} played</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary cards */}
              <div className="an-summary">
                <div className="an-sum-card">
                  <div className="an-sum-label">Rounds</div>
                  <div className="an-sum-val">{totalRounds}</div>
                  <div className="an-sum-note">total played</div>
                </div>
                <div className="an-sum-card highlight">
                  <div className="an-sum-label">Avg Score</div>
                  <div className="an-sum-val">{avgScore ?? '—'}</div>
                  <div className="an-sum-note">{avgToPar != null ? `${Number(avgToPar) > 0 ? '+' : ''}${avgToPar} to par` : ''}</div>
                </div>
                <div className="an-sum-card">
                  <div className="an-sum-label">Best Round</div>
                  <div className="an-sum-val">{bestScore ?? '—'}</div>
                  <div className="an-sum-note">gross score</div>
                </div>
                <div className="an-sum-card">
                  <div className="an-sum-label">Pars</div>
                  <div className="an-sum-val">{dist.pars + dist.birdies + dist.eagles}</div>
                  <div className="an-sum-note">par or better</div>
                </div>
              </div>

              {/* Scoring trend chart */}
              {trendRounds.length >= 2 && (
                <div className="an-section">
                  <h2 className="an-section-title">Scoring Trend</h2>
                  <div className="an-chart-card">
                    <svg viewBox={`0 0 ${chartW} ${chartH + 20}`} className="an-chart-svg" preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <linearGradient id="an-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0D631B" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#0D631B" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>

                      {/* Par reference line */}
                      {parY != null && (
                        <>
                          <line x1={chartPad} y1={parY} x2={chartW - chartPad} y2={parY} className="an-chart-par" />
                          <text x={chartW - chartPad + 4} y={parY + 3} className="an-chart-par-label">Par</text>
                        </>
                      )}

                      {/* Area fill */}
                      <path
                        d={`${trendLine} L${trendPoints[trendPoints.length - 1]?.x},${chartH - chartPad} L${trendPoints[0]?.x},${chartH - chartPad} Z`}
                        className="an-chart-area"
                      />

                      {/* Line */}
                      <path d={trendLine} className="an-chart-line" />

                      {/* Dots + labels */}
                      {trendPoints.map((p, i) => (
                        <g key={i}>
                          <circle cx={p.x} cy={p.y} r={4} className="an-chart-dot" />
                          <text x={p.x} y={p.y - 10} className="an-chart-score-label">{p.score}</text>
                          <text x={p.x} y={chartH + 10} className="an-chart-label">{formatMonth(p.date)}</text>
                        </g>
                      ))}
                    </svg>
                  </div>
                </div>
              )}

              {/* Score distribution */}
              {distTotal > 0 && (
                <div className="an-section">
                  <h2 className="an-section-title">Score Distribution</h2>
                  <div className="an-dist">
                    {[
                      { label: 'Eagle+', val: dist.eagles, cls: 'an-bar-eagle' },
                      { label: 'Birdie', val: dist.birdies, cls: 'an-bar-birdie' },
                      { label: 'Par', val: dist.pars, cls: 'an-bar-par' },
                      { label: 'Bogey', val: dist.bogeys, cls: 'an-bar-bogey' },
                      { label: 'Double', val: dist.doubles, cls: 'an-bar-double' },
                      { label: 'Triple+', val: dist.triples, cls: 'an-bar-triple' },
                    ].map(row => (
                      <div className="an-dist-row" key={row.label}>
                        <div className="an-dist-label">{row.label}</div>
                        <div className="an-dist-track">
                          <div
                            className={`an-dist-bar ${row.cls}`}
                            style={{ width: `${Math.max(distPct(row.val), row.val > 0 ? 8 : 0)}%` }}
                          >
                            {row.val > 0 && <span>{Math.round(distPct(row.val))}%</span>}
                          </div>
                        </div>
                        <div className="an-dist-count">{row.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent rounds */}
              <div className="an-section">
                <h2 className="an-section-title">Round History</h2>
                <div className="an-rounds-card">
                  {[...rounds].reverse().slice(0, 8).map(r => {
                    const parClass = r.toPar > 0 ? 'an-par-over' : r.toPar < 0 ? 'an-par-under' : 'an-par-even'
                    const parLabel = r.toPar > 0 ? `+${r.toPar}` : r.toPar === 0 ? 'E' : String(r.toPar)
                    return (
                      <div className="an-round-row" key={r.id}>
                        <div className="an-round-info">
                          <div className="an-round-course">{r.courseName}</div>
                          <div className="an-round-date">{formatShortDate(r.date)} · {r.holesPlayed} holes</div>
                        </div>
                        <div className="an-round-score">{r.totalGross}</div>
                        <div className={`an-round-par ${parClass}`}>{parLabel}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </main>

        <BottomNav active="analysis" />
      </div>
    </>
  )
}
