import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { COURSES } from '@/lib/courses'
import BottomNav from '@/components/BottomNav'
import DeleteRoundButton from './DeleteRoundButton'
import ChartSection from './ChartSection'

// ─── Styles ────────────────────────────────────────────────────────────────────
// Defined here (top of file) to avoid TDZ issues with webpack chunk-splitting in production.

const STYLES = `
  .rs {
    min-height: 100dvh;
    background: #F0F4EC;
    font-family: var(--font-lexend), system-ui, sans-serif;
    color: #1A2E1A;
    padding-bottom: max(80px, calc(80px + env(safe-area-inset-bottom)));
  }

  /* ── Hero banner (matches My Rounds page) ── */
  .rs-banner-wrap {
    padding: 0.75rem 1rem 0;
  }
  .rs-banner {
    position: relative;
    width: 100%;
    min-height: 220px;
    overflow: hidden;
    border-radius: 20px;
    box-shadow: 0 4px 20px rgba(10, 31, 10, 0.22);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .rs-banner-img {
    position: absolute;
    inset: 0;
    object-fit: cover;
    width: 100%;
    height: 100%;
    filter: saturate(1.3) contrast(1.05);
  }
  .rs-banner-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      rgba(10, 31, 10, 0.25) 0%,
      rgba(10, 31, 10, 0.05) 30%,
      rgba(10, 31, 10, 0.15) 60%,
      rgba(10, 31, 10, 0.5) 100%
    );
    z-index: 1;
  }
  .rs-banner-topbar {
    position: relative;
    z-index: 3;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 1rem;
  }
  .rs-topbar-logo {
    display: flex;
    align-items: center;
    text-decoration: none;
  }
  .rs-back-btn {
    background: rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 10px;
    padding: 0.4rem 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.85);
    font-family: var(--font-dm-sans), sans-serif;
    font-size: 0.8125rem;
    font-weight: 500;
    text-decoration: none;
    transition: background 0.15s, border-color 0.15s;
    flex-shrink: 0;
  }
  .rs-back-btn:hover { background: rgba(255, 255, 255, 0.2); border-color: rgba(255, 255, 255, 0.35); }

  /* ── Title card (inside banner, frosted glass) ── */
  .rs-title-card {
    position: relative;
    z-index: 3;
    padding: 1rem 1.25rem;
    margin: 0 0.75rem 0.75rem;
    background: rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .rs-title-left {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .rs-course {
    font-family: var(--font-manrope), sans-serif;
    font-weight: 800;
    font-size: 1.25rem;
    color: #fff;
    letter-spacing: -0.02em;
    line-height: 1.15;
    margin: 0;
  }
  .rs-meta-row {
    display: flex;
    gap: 0.375rem;
    flex-wrap: wrap;
    align-items: center;
    margin-top: 0.25rem;
  }
  .rs-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.15rem 0.5rem;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.85);
    font-size: 0.6875rem;
    font-weight: 500;
  }
  .rs-badge-warn {
    background: rgba(180, 83, 9, 0.25);
    color: rgba(255, 210, 140, 0.95);
  }
  .rs-date {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.55);
    margin-top: 0.125rem;
  }

  /* ── Score badge (neon pill, matches My Rounds count badge) ── */
  .rs-score-badge {
    position: relative;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    padding: 0.5rem 1rem;
    border-radius: 9999px;
    border: 1px solid rgba(90, 180, 100, 0.25);
    background: rgba(90, 180, 100, 0.08);
    flex-shrink: 0;
    overflow: hidden;
  }
  .rs-score-badge::before {
    content: '';
    position: absolute;
    top: -1px;
    left: 12.5%;
    width: 75%;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(120, 210, 130, 0.6), transparent);
    opacity: 0.6;
  }
  .rs-score-badge::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 12.5%;
    width: 75%;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(120, 210, 130, 0.6), transparent);
    opacity: 0.6;
  }
  .rs-score-value {
    font-family: var(--font-manrope), sans-serif;
    font-weight: 800;
    font-size: 1.25rem;
    color: #fff;
    letter-spacing: -0.02em;
    line-height: 1;
  }
  .rs-score-label {
    font-family: var(--font-dm-sans), sans-serif;
    font-size: 0.625rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.65);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-top: 0.125rem;
  }

  /* Main */
  .rs-main {
    padding: 1.5rem 2rem 2rem;
    max-width: 560px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* Score detail (below banner) */
  .rs-score-detail {
    font-size: 0.875rem;
    color: #72786E;
    text-align: center;
    margin-bottom: 0.25rem;
  }

  /* Round complete banner */
  .rs-complete-banner {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.875rem 1.125rem;
    background: rgba(13, 99, 27, 0.08);
    border: 1.5px solid rgba(13, 99, 27, 0.2);
    border-radius: 14px;
    font-family: var(--font-lexend), sans-serif;
    font-size: 0.875rem;
    font-weight: 500;
    color: #0D631B;
    animation: rs-rise 0.4s cubic-bezier(0.2, 0, 0, 1) both;
  }
  .rs-complete-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #0D631B;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  /* Continue CTA */
  .rs-continue {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: linear-gradient(135deg, #0D631B 0%, #0a4f15 100%);
    color: #FFFFFF;
    border-radius: 14px;
    font-family: var(--font-manrope), sans-serif;
    font-weight: 700;
    font-size: 0.9375rem;
    text-decoration: none;
    box-shadow: 0 6px 20px rgba(13, 99, 27, 0.2);
    transition: transform 0.15s, box-shadow 0.15s;
    letter-spacing: -0.01em;
    animation: rs-rise 0.4s 0.05s cubic-bezier(0.2, 0, 0, 1) both;
  }
  .rs-continue:hover { transform: translateY(-1px); box-shadow: 0 10px 28px rgba(13, 99, 27, 0.28); }

  /* Profile CTA */
  .rs-profile-link {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: #FFFFFF;
    color: #0D631B;
    border-radius: 14px;
    font-family: var(--font-manrope), sans-serif;
    font-weight: 700;
    font-size: 0.9375rem;
    text-decoration: none;
    border: 1.5px solid #0D631B;
    transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
    letter-spacing: -0.01em;
    animation: rs-rise 0.4s 0.05s cubic-bezier(0.2, 0, 0, 1) both;
  }
  .rs-profile-link:hover { background: rgba(13, 99, 27, 0.05); transform: translateY(-1px); }

  /* Delete round */
  .rs-delete-btn {
    display: block;
    width: 100%;
    padding: 12px;
    background: none;
    border: none;
    color: #6B8C6B;
    font-family: var(--font-dm-sans);
    font-size: 0.85rem;
    cursor: pointer;
    text-align: center;
    margin-top: 4px;
  }
  .rs-delete-btn:hover { color: #DC2626; }
  .rs-delete-confirm {
    background: #fff;
    border: 1px solid #E0EBE0;
    border-radius: 12px;
    padding: 16px;
    margin-top: 8px;
    text-align: center;
  }
  .rs-delete-confirm-text {
    font-family: var(--font-dm-sans);
    font-size: 0.9rem;
    color: #1A2E1A;
    margin-bottom: 12px;
  }
  .rs-delete-confirm-btns { display: flex; gap: 8px; justify-content: center; }
  .rs-delete-cancel, .rs-delete-confirm-btn {
    padding: 8px 20px;
    border-radius: 8px;
    font-family: var(--font-dm-sans);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    border: none;
  }
  .rs-delete-cancel { background: #F2F5F0; color: #1A2E1A; }
  .rs-delete-cancel:hover { background: #E0EBE0; }
  .rs-delete-confirm-btn { background: #DC2626; color: #fff; }
  .rs-delete-confirm-btn:hover { background: #b91c1c; }
  .rs-delete-cancel:disabled, .rs-delete-confirm-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  /* Cards */
  .rs-card {
    background: #FFFFFF;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(26, 28, 28, 0.04);
    animation: rs-rise 0.4s 0.1s cubic-bezier(0.2, 0, 0, 1) both;
  }
  .rs-card-hd {
    padding: 1rem 1.25rem 0.625rem;
    font-family: var(--font-lexend), sans-serif;
    font-size: 0.6875rem;
    font-weight: 500;
    color: #72786E;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    border-bottom: 1px solid rgba(26, 28, 28, 0.06);
  }

  /* Stats card */
  .rs-stats-card {
    animation: rs-rise 0.4s 0.08s cubic-bezier(0.2, 0, 0, 1) both;
  }
  .rs-stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1px;
    background: rgba(26, 28, 28, 0.06);
  }
  .rs-stat-tile {
    background: #FFFFFF;
    padding: 1rem 0.75rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.125rem;
  }
  .rs-stat-value {
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-weight: 700;
    font-size: 1.375rem;
    color: #0D631B;
    line-height: 1;
  }
  .rs-stat-sub {
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-size: 0.6875rem;
    color: #A0B09A;
    font-weight: 400;
    min-height: 0.875rem;
  }
  .rs-stat-name {
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-size: 0.6875rem;
    font-weight: 500;
    color: #72786E;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* Chart card */
  .rs-chart-card { padding-bottom: 0.75rem; }
  .rs-chart-legend {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.625rem 1.25rem;
    font-size: 0.6875rem;
    color: #72786E;
  }
  .rs-legend-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .rs-chart-footer {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    padding: 0.5rem 1rem 0;
    min-height: 0;
  }
  .rs-highlight-pill {
    font-size: 0.6875rem;
    font-weight: 500;
    padding: 0.15rem 0.5rem;
    border-radius: 10px;
  }
  .rs-highlight-pill.green { background: #D1FAE5; color: #065F46; }
  .rs-highlight-pill.red   { background: #FEE2E2; color: #991B1B; }

  /* Leaderboard */
  .rs-lb { padding: 0.25rem 0; }
  .rs-lb-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1.25rem;
    border-bottom: 1px solid rgba(26, 28, 28, 0.05);
    transition: background 0.15s;
  }
  .rs-lb-row:last-child { border-bottom: none; }
  .rs-lb-row.you { background: rgba(13, 99, 27, 0.04); }
  .rs-lb-pos {
    font-family: var(--font-manrope), sans-serif;
    font-weight: 700;
    font-size: 0.875rem;
    color: #72786E;
    width: 20px;
    flex-shrink: 0;
  }
  .rs-lb-row:first-child .rs-lb-pos { color: #0D631B; }
  .rs-lb-name {
    flex: 1;
    font-weight: 500;
    font-size: 0.9375rem;
    color: #1A2E1A;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .rs-lb-you {
    font-size: 0.6875rem;
    font-weight: 600;
    color: #0D631B;
    background: rgba(13, 99, 27, 0.1);
    padding: 0.15rem 0.4rem;
    border-radius: 6px;
  }
  .rs-lb-score {
    font-family: var(--font-manrope), sans-serif;
    font-weight: 700;
    font-size: 0.9375rem;
    color: #1A2E1A;
  }
  .rs-lb-thru {
    font-size: 0.6875rem;
    color: #A0B09A;
  }

  /* Event results */
  .rs-event-card {
    animation: rs-rise 0.4s 0.15s cubic-bezier(0.2, 0, 0, 1) both;
  }
  .rs-event-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem 0.75rem;
    border-bottom: 1px solid rgba(26, 28, 28, 0.06);
  }
  .rs-event-title {
    font-family: var(--font-dm-sans), sans-serif;
    font-weight: 600;
    font-size: 1.0625rem;
    color: #1A2E1A;
    letter-spacing: -0.01em;
  }
  .rs-event-link {
    font-family: var(--font-dm-sans), sans-serif;
    font-size: 0.75rem;
    font-weight: 600;
    color: #0D631B;
    text-decoration: none;
    transition: opacity 0.15s;
  }
  .rs-event-link:hover { opacity: 0.7; }
  .rs-event-position {
    padding: 0.875rem 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border-bottom: 1px solid rgba(26, 28, 28, 0.06);
  }
  .rs-event-pos-num {
    font-family: var(--font-manrope), sans-serif;
    font-weight: 800;
    font-size: 1.75rem;
    color: #0D631B;
    line-height: 1;
    letter-spacing: -0.02em;
  }
  .rs-event-pos-label {
    font-family: var(--font-dm-sans), sans-serif;
    font-size: 0.8125rem;
    color: #72786E;
  }
  .rs-contest-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.25rem;
    border-bottom: 1px solid rgba(26, 28, 28, 0.04);
  }
  .rs-contest-row:last-child { border-bottom: none; }
  .rs-contest-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8125rem;
    flex-shrink: 0;
  }
  .rs-contest-icon.ntp { background: rgba(13, 99, 27, 0.1); }
  .rs-contest-icon.ld { background: rgba(59, 130, 246, 0.1); }
  .rs-contest-detail {
    flex: 1;
    min-width: 0;
  }
  .rs-contest-label {
    font-family: var(--font-dm-sans), sans-serif;
    font-size: 0.75rem;
    font-weight: 500;
    color: #72786E;
  }
  .rs-contest-winner {
    font-family: var(--font-dm-sans), sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    color: #1A2E1A;
  }
  .rs-contest-dist {
    font-family: var(--font-dm-sans), sans-serif;
    font-size: 0.75rem;
    color: #A0B09A;
    flex-shrink: 0;
  }

  @keyframes rs-rise {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @media (min-width: 768px) {
    .rs-banner { min-height: 240px; }
    .rs-title-card { margin: 0 1rem 1rem; padding: 1.125rem 1.5rem; }
    .rs-main { padding: 2rem; }
    .rs { padding-bottom: 0; }
    .rs-course { font-size: 1.375rem; }
  }
`

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SummaryHole {
  holeInRound: number
  par: number
  siM: number | null
  yards: Record<string, number>
}

interface PlayerSummary {
  displayName: string
  handicapIndex: number
  isCurrentUser: boolean
  scores: Record<number, number | null>  // hole → gross (null = pickup)
}

// ─── Stableford helpers ────────────────────────────────────────────────────────

function allocateStrokes(hc: number, holes: SummaryHole[]): Record<number, number> {
  const result: Record<number, number> = {}
  for (const h of holes) result[h.holeInRound] = 0
  const order = holes
    .filter(h => h.siM !== null)
    .map(h => ({ hir: h.holeInRound, si: h.siM! }))
    .sort((a, b) => a.si - b.si)
  let remaining = Math.round(hc)
  while (remaining > 0) {
    for (const o of order) {
      if (remaining <= 0) break
      result[o.hir] = (result[o.hir] ?? 0) + 1
      remaining--
    }
  }
  return result
}

function stablefordPts(gross: number, par: number, shots: number): number {
  const diff = (gross - shots) - par
  return diff >= 2 ? 0 : diff === 1 ? 1 : diff === 0 ? 2 : diff === -1 ? 3 : diff === -2 ? 4 : 5
}

// ─── Scorecard table ───────────────────────────────────────────────────────────

function ScorecardTable({
  holes,
  scores,
  handicapIndex,
  allowancePct,
  format,
}: {
  holes: SummaryHole[]
  scores: Record<number, number | null>
  handicapIndex: number
  allowancePct: number
  format: 'stableford' | 'strokeplay' | 'matchplay'
}) {
  const hcStrokes = allocateStrokes(Math.round(handicapIndex * allowancePct), holes)
  const isStableford = format === 'stableford'

  const front = holes.filter(h => h.holeInRound <= 9)
  const back = holes.filter(h => h.holeInRound > 9)
  const sections = back.length > 0
    ? [{ label: 'Out', holes: front }, { label: 'In', holes: back }]
    : [{ label: 'Total', holes: front }]

  const th: React.CSSProperties = {
    padding: '5px 6px', textAlign: 'center', fontFamily: "'Lexend', sans-serif",
    fontSize: '0.625rem', fontWeight: 500, color: '#72786E', whiteSpace: 'nowrap',
  }
  const td: React.CSSProperties = {
    padding: '6px 6px', textAlign: 'center', fontSize: '0.6875rem',
    fontFamily: "'Lexend', sans-serif",
  }
  const tdBold: React.CSSProperties = { ...td, fontWeight: 700, fontFamily: "'Manrope', sans-serif" }

  function cellBg(gross: number | null | undefined, par: number, shots: number): React.CSSProperties {
    if (gross == null) return {}
    const net = gross - shots
    const d = net - par
    if (d <= -2) return { background: '#FEF3C7', color: '#92400E', borderRadius: 4 }
    if (d === -1) return { background: '#D1FAE5', color: '#065F46', borderRadius: 4 }
    if (d === 0) return {}
    if (d === 1) return {}
    if (d === 2) return { background: '#FEE2E2', color: '#991B1B', borderRadius: 4 }
    return { background: '#FCA5A5', color: '#7F1D1D', borderRadius: 4 }
  }

  let grandTotalGross = 0
  let grandTotalPts = 0

  return (
    <div style={{ overflowX: 'auto' }}>
      {sections.map(({ label, holes: sHoles }) => {
        const sectionGross = sHoles.reduce((sum, h) => {
          const g = scores[h.holeInRound]
          return sum + (g ?? 0)
        }, 0)
        const sectionPts = sHoles.reduce((sum, h) => {
          const g = scores[h.holeInRound]
          if (g == null) return sum
          return sum + stablefordPts(g, h.par, hcStrokes[h.holeInRound] ?? 0)
        }, 0)
        const sectionPar = sHoles.reduce((s, h) => s + h.par, 0)
        grandTotalGross += sectionGross
        grandTotalPts += sectionPts

        return (
          <table key={label} style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4 }}>
            <thead>
              <tr style={{ background: '#F0F4EC' }}>
                <th style={{ ...th, textAlign: 'left', paddingLeft: 8 }}>Hole</th>
                {sHoles.map(h => <th key={h.holeInRound} style={th}>{h.holeInRound}</th>)}
                <th style={{ ...th, background: '#E8F0E4' }}>{label}</th>
              </tr>
              <tr>
                <th style={{ ...th, textAlign: 'left', paddingLeft: 8 }}>Par</th>
                {sHoles.map(h => <td key={h.holeInRound} style={td}>{h.par}</td>)}
                <td style={{ ...tdBold, background: '#F8FAF6' }}>{sectionPar}</td>
              </tr>
              {isStableford && (
                <tr>
                  <th style={{ ...th, textAlign: 'left', paddingLeft: 8 }}>SI</th>
                  {sHoles.map(h => <td key={h.holeInRound} style={{ ...td, color: '#A0B09A' }}>{h.siM ?? '–'}</td>)}
                  <td style={td} />
                </tr>
              )}
            </thead>
            <tbody>
              <tr>
                <td style={{ ...td, textAlign: 'left', paddingLeft: 8, fontWeight: 600, color: '#1A2E1A' }}>
                  Score
                </td>
                {sHoles.map(h => {
                  const g = scores[h.holeInRound]
                  const shots = hcStrokes[h.holeInRound] ?? 0
                  if (g == null) {
                    return <td key={h.holeInRound} style={{ ...td, color: '#C8D4C0', fontStyle: 'italic' }}>NR</td>
                  }
                  return (
                    <td key={h.holeInRound} style={{ ...tdBold, ...cellBg(g, h.par, shots) }}>
                      {g}
                    </td>
                  )
                })}
                <td style={{ ...tdBold, background: '#F8FAF6' }}>
                  {sHoles.some(h => scores[h.holeInRound] != null) ? sectionGross : '–'}
                </td>
              </tr>
              {isStableford && (
                <tr style={{ background: 'rgba(13,99,27,0.04)' }}>
                  <td style={{ ...td, textAlign: 'left', paddingLeft: 8, color: '#0D631B', fontWeight: 600 }}>Pts</td>
                  {sHoles.map(h => {
                    const g = scores[h.holeInRound]
                    if (g == null) return <td key={h.holeInRound} style={{ ...td, color: '#C8D4C0' }}>–</td>
                    const p = stablefordPts(g, h.par, hcStrokes[h.holeInRound] ?? 0)
                    return (
                      <td key={h.holeInRound} style={{ ...td, color: p === 0 ? '#DC2626' : '#0D631B', fontWeight: p >= 3 ? 700 : 400 }}>
                        {p}
                      </td>
                    )
                  })}
                  <td style={{ ...tdBold, color: '#0D631B', background: 'rgba(13,99,27,0.06)' }}>{sectionPts}</td>
                </tr>
              )}
            </tbody>
          </table>
        )
      })}

      {/* Grand total row (only for 18-hole showing both sections) */}
      {sections.length > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
          padding: '8px 12px', gap: '1.5rem',
          borderTop: '1px solid rgba(26,28,28,0.08)',
        }}>
          {isStableford ? (
            <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '0.9375rem', color: '#0D631B' }}>
              {grandTotalPts} pts total
            </span>
          ) : (
            <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '0.9375rem', color: '#1A2E1A' }}>
              {grandTotalGross} strokes
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Error card ────────────────────────────────────────────────────────────────

function ErrorCard({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '40px 20px', fontFamily: "'DM Sans', sans-serif", color: '#1a2e1a', minHeight: '100vh' }}>
      <div style={{ marginTop: 32, fontSize: '1.125rem', fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: '0.875rem', color: '#6B8C6B', lineHeight: 1.5 }}>{body}</div>
      <Link href="/rounds" style={{ display: 'inline-block', marginTop: 20, color: '#0D631B', fontWeight: 600, fontSize: '0.875rem' }}>
        ← My Rounds
      </Link>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function RoundSummaryPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // ── 1. Fetch scorecard + event ─────────────────────────────────────────────
  const { data: scorecard } = await supabase
    .from('scorecards')
    .select(`
      id,
      event_id,
      round_type,
      loop_id,
      event_players!inner (
        id,
        user_id,
        display_name,
        handicap_index
      ),
      events!inner (
        format,
        ntp_holes,
        ld_holes,
        handicap_allowance_pct,
        combination_id,
        course_id,
        round_type,
        loop_id,
        name,
        date,
        created_by,
        courses ( name ),
        course_combinations ( name )
      )
    `)
    .eq('id', id)
    .single()

  if (!scorecard) {
    return <ErrorCard title="Round not found" body="This scorecard doesn't exist or you don't have access to it." />
  }

  const ep = scorecard.event_players as unknown as {
    id: string; user_id: string | null; display_name: string; handicap_index: number
  }
  const event = scorecard.events as unknown as {
    format: 'stableford' | 'strokeplay' | 'matchplay'
    handicap_allowance_pct: number
    combination_id: string | null
    course_id: string | null
    round_type: string
    loop_id: string | null
    name: string
    date: string
    created_by: string
    ntp_holes: number[] | null
    ld_holes: number[] | null
    courses: { name: string } | null
    course_combinations: { name: string } | null
  }

  // Ownership check
  if (ep.user_id !== user.id && event.created_by !== user.id) {
    return <ErrorCard title="Round not found" body="This scorecard doesn't exist or you don't have access to it." />
  }

  // ── 2. Resolve holes ───────────────────────────────────────────────────────
  const combinationId = event.combination_id
  const loopId = scorecard.loop_id ?? event.loop_id

  const holes: SummaryHole[] = []
  let courseDataUnavailable = false

  if (combinationId) {
    const { data: combo } = await supabase
      .from('course_combinations')
      .select('loop_1_id, loop_2_id')
      .eq('id', combinationId)
      .single()

    if (!combo) {
      courseDataUnavailable = true
    } else {
      const { data: loopHoles } = await supabase
        .from('loop_holes')
        .select('id, loop_id, hole_number, par, si_m, si_w')
        .in('loop_id', [combo.loop_1_id, combo.loop_2_id])
        .order('hole_number')

      if (!loopHoles || loopHoles.length === 0) {
        courseDataUnavailable = true
      } else {
        const yardsMap: Record<string, Record<string, number>> = {}
        const { data: teesData } = await supabase
          .from('loop_hole_tees')
          .select('loop_hole_id, tee_colour, yards')
          .in('loop_hole_id', loopHoles.map(h => h.id))

        for (const t of teesData ?? []) {
          if (!yardsMap[t.loop_hole_id]) yardsMap[t.loop_hole_id] = {}
          yardsMap[t.loop_hole_id]![t.tee_colour] = t.yards
        }

        const loop1 = loopHoles.filter(h => h.loop_id === combo.loop_1_id).sort((a, b) => a.hole_number - b.hole_number)
        const loop2 = loopHoles.filter(h => h.loop_id === combo.loop_2_id).sort((a, b) => a.hole_number - b.hole_number)
        let hir = 1
        for (const h of [...loop1, ...loop2]) {
          holes.push({ holeInRound: hir++, par: h.par, siM: h.si_m ?? null, yards: yardsMap[h.id] ?? {} })
        }
      }
    }
  } else if (loopId) {
    const { data: loopHoles } = await supabase
      .from('loop_holes')
      .select('id, loop_id, hole_number, par, si_m, si_w')
      .eq('loop_id', loopId)
      .order('hole_number')

    if (!loopHoles || loopHoles.length === 0) {
      courseDataUnavailable = true
    } else {
      const yardsMap: Record<string, Record<string, number>> = {}
      const { data: teesData } = await supabase
        .from('loop_hole_tees')
        .select('loop_hole_id, tee_colour, yards')
        .in('loop_hole_id', loopHoles.map(h => h.id))

      for (const t of teesData ?? []) {
        if (!yardsMap[t.loop_hole_id]) yardsMap[t.loop_hole_id] = {}
        yardsMap[t.loop_hole_id]![t.tee_colour] = t.yards
      }

      let hir = 1
      for (const h of loopHoles) {
        holes.push({ holeInRound: hir++, par: h.par, siM: h.si_m ?? null, yards: yardsMap[h.id] ?? {} })
      }
    }
  } else if (event.course_id) {
    // ── Fallback: resolve holes from courses.ts static data or OCR upload ──
    const { data: courseRow } = await supabase
      .from('courses')
      .select('name, source')
      .eq('id', event.course_id)
      .single()

    const course = courseRow ? COURSES.find(c => c.name === courseRow.name) : undefined
    if (course) {
      let hir = 1
      for (const hole of course.holes) {
        holes.push({ holeInRound: hir++, par: hole.par, siM: hole.si || null, yards: hole.teeYards ?? { [course.defaultRatingTee]: hole.yards } })
      }
    } else if (courseRow?.source === 'ocr') {
      // OCR-uploaded course: load hole data from scorecard_uploads
      const { data: uploads } = await supabase
        .from('scorecard_uploads')
        .select('extracted_data')
        .not('extracted_data', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSONB from Supabase
      const upload = uploads?.find((u: any) => {
        const ed = u.extracted_data
        return ed?.courseName === courseRow.name ||
          `${ed?.courseName} — ${ed?.tees?.[0]?.teeName}` === courseRow.name
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSONB from Supabase
      const extracted = upload?.extracted_data as any // Supabase returns JSONB as unknown
      if (extracted?.tees?.[0]?.holes?.length > 0) {
        const tee = extracted.tees[0]
        for (const h of tee.holes) {
          const yardsForHole: Record<string, number> = {}
          for (const t of extracted.tees) {
            const match = t.holes?.find((th: { hole: number }) => th.hole === h.hole)
            if (match?.yards) yardsForHole[t.teeName] = match.yards
          }
          holes.push({ holeInRound: h.hole, par: h.par, siM: h.si ?? null, yards: yardsForHole })
        }
      } else {
        courseDataUnavailable = true
      }
    } else {
      courseDataUnavailable = true
    }
  } else {
    courseDataUnavailable = true
  }

  // ── 3. Scores ──────────────────────────────────────────────────────────────
  const { data: holeScoreRows } = await supabase
    .from('hole_scores')
    .select('hole_number, gross_strokes, putts, fairway_hit, green_in_regulation, bunker_shots, penalties, up_and_down, sand_save')
    .eq('scorecard_id', id)

  const scores: Record<number, number | null> = {}
  for (const row of holeScoreRows ?? []) {
    scores[row.hole_number] = row.gross_strokes ?? null
  }

  // ── Stats aggregation ──────────────────────────────────────────────────────
  let totalPutts = 0, puttsHoles = 0
  let girYes = 0, girTotal = 0
  let fwyYes = 0, fwyTotal = 0
  let bunkerTotal = 0, penaltyTotal = 0
  let uadYes = 0, uadTotal = 0
  let sandYes = 0, sandTotal = 0

  for (const row of holeScoreRows ?? []) {
    if (row.putts != null) { totalPutts += row.putts; puttsHoles++ }
    if (row.green_in_regulation != null) { girTotal++; if (row.green_in_regulation) girYes++ }
    if (row.fairway_hit != null) { fwyTotal++; if (row.fairway_hit) fwyYes++ }
    if (row.bunker_shots != null) bunkerTotal += row.bunker_shots
    if (row.penalties != null) penaltyTotal += row.penalties
    if (row.up_and_down != null) { uadTotal++; if (row.up_and_down) uadYes++ }
    if (row.sand_save != null) { sandTotal++; if (row.sand_save) sandYes++ }
  }

  const hasStats = puttsHoles > 0 || girTotal > 0 || fwyTotal > 0 || bunkerTotal > 0 || penaltyTotal > 0

  // ── 4. Group players + contest entries (for leaderboard) ──────────────────
  const [{ data: allPlayers }, { data: contestEntries }] = await Promise.all([
    supabase
      .from('event_players')
      .select(`
        id,
        user_id,
        display_name,
        handicap_index,
        scorecards (
          id,
          hole_scores ( hole_number, gross_strokes )
        )
      `)
      .eq('event_id', scorecard.event_id),
    supabase
      .from('contest_entries')
      .select('hole_number, type, event_player_id, distance_cm')
      .eq('event_id', scorecard.event_id),
  ])

  const groupPlayers: PlayerSummary[] = (allPlayers ?? []).map(p => {
    const scs = p.scorecards as unknown as { id: string; hole_scores: { hole_number: number; gross_strokes: number | null }[] }[] | null
    const sc = (scs ?? [])[0]
    const playerScores: Record<number, number | null> = {}
    for (const hs of sc?.hole_scores ?? []) {
      playerScores[hs.hole_number] = hs.gross_strokes ?? null
    }
    return {
      displayName: p.display_name ?? 'Player',
      handicapIndex: Number(p.handicap_index),
      isCurrentUser: (p as unknown as { user_id: string | null }).user_id === user.id,
      scores: playerScores,
    }
  })

  // ── 5. Derived summary stats ───────────────────────────────────────────────
  const format = event.format
  const allowancePct = Number(event.handicap_allowance_pct)
  const handicapIndex = Number(ep.handicap_index)
  const hcStrokes = allocateStrokes(Math.round(handicapIndex * allowancePct), holes)

  const holesPlayed = holes.filter(h => scores[h.holeInRound] != null).length
  const totalHoles = holes.length
  const roundComplete = holesPlayed === totalHoles && totalHoles > 0

  const totalGross = holes.reduce((s, h) => s + (scores[h.holeInRound] ?? 0), 0)
  const totalPts = holes.reduce((s, h) => {
    const g = scores[h.holeInRound]
    if (g == null) return s
    return s + stablefordPts(g, h.par, hcStrokes[h.holeInRound] ?? 0)
  }, 0)
  const coursePar = holes.reduce((s, h) => s + h.par, 0)
  const vsParRaw = totalGross - coursePar
  const vsPar = vsParRaw === 0 ? 'E' : vsParRaw > 0 ? `+${vsParRaw}` : `${vsParRaw}`

  // Group leaderboard (sort by format)
  const leaderboard = groupPlayers
    .map(p => {
      const pHcStrokes = allocateStrokes(Math.round(p.handicapIndex * allowancePct), holes)
      const pts = holes.reduce((s, h) => {
        const g = p.scores[h.holeInRound]
        if (g == null) return s
        return s + stablefordPts(g, h.par, pHcStrokes[h.holeInRound] ?? 0)
      }, 0)
      const gross = holes.reduce((s, h) => s + (p.scores[h.holeInRound] ?? 0), 0)
      const played = holes.filter(h => p.scores[h.holeInRound] != null).length
      return { ...p, pts, gross, played }
    })
    .sort((a, b) => format === 'stableford' ? b.pts - a.pts : a.gross - b.gross)

  // ── 6. Contest winners (NTP / LD) ──────────────────────────────────────────
  const playerNameMap = new Map((allPlayers ?? []).map(p => [p.id, p.display_name ?? 'Player']))
  const ntpHoles = (event.ntp_holes ?? []) as number[]
  const ldHoles = (event.ld_holes ?? []) as number[]
  const hasContests = ntpHoles.length > 0 || ldHoles.length > 0

  interface ContestWinner { hole: number; type: 'ntp' | 'ld'; playerName: string; distanceCm: number | null }
  const contestWinners: ContestWinner[] = []

  if (hasContests && contestEntries) {
    // Group entries by (type, hole) and pick the closest (smallest distance) for NTP, longest for LD
    const grouped = new Map<string, typeof contestEntries>()
    for (const entry of contestEntries) {
      const key = `${entry.type}:${entry.hole_number}`
      const list = grouped.get(key) ?? []
      list.push(entry)
      grouped.set(key, list)
    }
    for (const [, entries] of grouped) {
      const withDistance = entries.filter(e => e.distance_cm != null)
      if (withDistance.length === 0) continue
      const type = entries[0]!.type as 'ntp' | 'ld'
      const best = type === 'ntp'
        ? withDistance.reduce((a, b) => (a.distance_cm! < b.distance_cm! ? a : b))
        : withDistance.reduce((a, b) => (a.distance_cm! > b.distance_cm! ? a : b))
      contestWinners.push({
        hole: best.hole_number,
        type,
        playerName: playerNameMap.get(best.event_player_id) ?? 'Player',
        distanceCm: best.distance_cm,
      })
    }
    contestWinners.sort((a, b) => a.hole - b.hole)
  }

  // Player's position in leaderboard
  const myPosition = leaderboard.findIndex(p => p.isCurrentUser) + 1
  const isEventRound = leaderboard.length > 1

  // ── 7. Formatted date ──────────────────────────────────────────────────────
  const dateLabel = new Date(event.date + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const courseName = event.courses?.name ?? event.name
  const comboName = event.course_combinations?.name
  const displayCourse = comboName ? `${comboName}` : courseName

  const formatLabel =
    format === 'stableford' ? 'Stableford'
    : format === 'strokeplay' ? 'Stroke Play'
    : 'Match Play'

  return (
    <>
      <style>{STYLES}</style>
      <div className="rs">

        {/* ── Hero banner (matches My Rounds page) ── */}
        <div className="rs-banner-wrap">
          <div className="rs-banner">
            <Image src="/hero.jpg" alt="Golf course" fill className="rs-banner-img" priority sizes="100vw" quality={90} />
            <div className="rs-banner-overlay" />

            {/* Logo + back button */}
            <div className="rs-banner-topbar">
              <Link href="/play" className="rs-topbar-logo">
                <Image src="/lx2-logo.svg" alt="LX2" width={72} height={36} />
              </Link>
              <Link href="/rounds" className="rs-back-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                My Rounds
              </Link>
            </div>

            {/* Title card (frosted glass, inside banner) */}
            <div className="rs-title-card">
              <div className="rs-title-left">
                <h1 className="rs-course">{displayCourse}</h1>
                <div className="rs-meta-row">
                  <span className="rs-badge">{formatLabel}</span>
                  <span className="rs-badge">{totalHoles} holes</span>
                  {!roundComplete && holesPlayed > 0 && (
                    <span className="rs-badge rs-badge-warn">{holesPlayed}/{totalHoles} played</span>
                  )}
                </div>
                <div className="rs-date">{dateLabel}</div>
              </div>
              {holesPlayed > 0 && (
                <div className="rs-score-badge">
                  <span className="rs-score-value">
                    {format === 'stableford' ? totalPts : totalGross}
                  </span>
                  <span className="rs-score-label">
                    {format === 'stableford' ? 'pts' : vsPar}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <main className="rs-main">

          {/* Score detail */}
          {holesPlayed > 0 && (
            <div className="rs-score-detail">
              {format === 'stableford'
                ? `${totalGross} strokes · HCP ${handicapIndex}`
                : `${vsPar} vs par ${coursePar} · HCP ${handicapIndex}`}
            </div>
          )}

          {/* Round status */}
          {roundComplete ? (
            <div className="rs-complete-banner">
              <span className="rs-complete-icon">✓</span>
              <span>Round complete — score submitted</span>
            </div>
          ) : (
            <>
              <Link href={`/rounds/${id}/score`} className="rs-continue">
                {holesPlayed === 0 ? 'Start scoring →' : `Continue scoring · hole ${holesPlayed + 1} →`}
              </Link>
              <DeleteRoundButton scorecardId={id} />
            </>
          )}

          {/* Hole-by-hole chart */}
          {!courseDataUnavailable && holesPlayed > 0 && (
            <section className="rs-card rs-chart-card">
              <ChartSection holes={holes} scores={scores} hcStrokes={hcStrokes} />
            </section>
          )}

          {/* Round stats */}
          {hasStats && (
            <section className="rs-card rs-stats-card">
              <div className="rs-card-hd">Round Stats</div>
              <div className="rs-stats-grid">
                {puttsHoles > 0 && (
                  <div className="rs-stat-tile">
                    <span className="rs-stat-value">{totalPutts}</span>
                    <span className="rs-stat-sub">{(totalPutts / puttsHoles).toFixed(1)} avg</span>
                    <span className="rs-stat-name">Putts</span>
                  </div>
                )}
                {girTotal > 0 && (
                  <div className="rs-stat-tile">
                    <span className="rs-stat-value">{Math.round(girYes / girTotal * 100)}%</span>
                    <span className="rs-stat-sub">{girYes}/{girTotal}</span>
                    <span className="rs-stat-name">GIR</span>
                  </div>
                )}
                {fwyTotal > 0 && (
                  <div className="rs-stat-tile">
                    <span className="rs-stat-value">{Math.round(fwyYes / fwyTotal * 100)}%</span>
                    <span className="rs-stat-sub">{fwyYes}/{fwyTotal}</span>
                    <span className="rs-stat-name">Fairways</span>
                  </div>
                )}
                {bunkerTotal > 0 && (
                  <div className="rs-stat-tile">
                    <span className="rs-stat-value">{bunkerTotal}</span>
                    <span className="rs-stat-sub">&nbsp;</span>
                    <span className="rs-stat-name">Bunker Shots</span>
                  </div>
                )}
                {penaltyTotal > 0 && (
                  <div className="rs-stat-tile">
                    <span className="rs-stat-value">{penaltyTotal}</span>
                    <span className="rs-stat-sub">&nbsp;</span>
                    <span className="rs-stat-name">Penalties</span>
                  </div>
                )}
                {uadTotal > 0 && (
                  <div className="rs-stat-tile">
                    <span className="rs-stat-value">{Math.round(uadYes / uadTotal * 100)}%</span>
                    <span className="rs-stat-sub">{uadYes}/{uadTotal}</span>
                    <span className="rs-stat-name">Up &amp; Down</span>
                  </div>
                )}
                {sandTotal > 0 && (
                  <div className="rs-stat-tile">
                    <span className="rs-stat-value">{Math.round(sandYes / sandTotal * 100)}%</span>
                    <span className="rs-stat-sub">{sandYes}/{sandTotal}</span>
                    <span className="rs-stat-name">Sand Saves</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Scorecard */}
          {!courseDataUnavailable && holesPlayed > 0 && (
            <section className="rs-card">
              <div className="rs-card-hd">Scorecard</div>
              <ScorecardTable
                holes={holes}
                scores={scores}
                handicapIndex={handicapIndex}
                allowancePct={allowancePct}
                format={format}
              />
            </section>
          )}

          {/* Event results — position + contest winners */}
          {isEventRound && (hasContests || roundComplete) && (
            <section className="rs-card rs-event-card">
              <div className="rs-event-header">
                <span className="rs-event-title">{event.name}</span>
                <Link href={`/events/${scorecard.event_id}/leaderboard`} className="rs-event-link">
                  Full leaderboard →
                </Link>
              </div>

              {/* Position */}
              {myPosition > 0 && (
                <div className="rs-event-position">
                  <span className="rs-event-pos-num">
                    {myPosition}{myPosition === 1 ? 'st' : myPosition === 2 ? 'nd' : myPosition === 3 ? 'rd' : 'th'}
                  </span>
                  <span className="rs-event-pos-label">
                    of {leaderboard.length} players
                    {!roundComplete && ` · ${holesPlayed} holes played`}
                  </span>
                </div>
              )}

              {/* NTP / LD winners */}
              {contestWinners.map(w => (
                <div key={`${w.type}-${w.hole}`} className="rs-contest-row">
                  <div className={`rs-contest-icon ${w.type}`}>
                    {w.type === 'ntp' ? '🎯' : '💪'}
                  </div>
                  <div className="rs-contest-detail">
                    <div className="rs-contest-label">
                      {w.type === 'ntp' ? 'Nearest the Pin' : 'Longest Drive'} · Hole {w.hole}
                    </div>
                    <div className="rs-contest-winner">{w.playerName}</div>
                  </div>
                  {w.distanceCm != null && (
                    <span className="rs-contest-dist">
                      {w.type === 'ntp'
                        ? w.distanceCm < 100
                          ? `${w.distanceCm} cm`
                          : `${(w.distanceCm / 100).toFixed(1)} m`
                        : `${Math.round(w.distanceCm / 91.44)} yds`}
                    </span>
                  )}
                </div>
              ))}

              {/* No entries yet for active contests */}
              {hasContests && contestWinners.length === 0 && (
                <div style={{
                  padding: '0.875rem 1.25rem',
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                  fontSize: '0.8125rem',
                  color: '#A0B09A',
                }}>
                  No contest entries yet
                </div>
              )}
            </section>
          )}

          {/* Event leaderboard */}
          {leaderboard.length > 1 && (
            <section className="rs-card">
              <div className="rs-card-hd">
                {isEventRound ? 'Event Leaderboard' : 'Group'}
              </div>
              <div className="rs-lb">
                {leaderboard.map((p, i) => (
                  <div key={p.displayName} className={`rs-lb-row${p.isCurrentUser ? ' you' : ''}`}>
                    <span className="rs-lb-pos">{i + 1}</span>
                    <span className="rs-lb-name">
                      {p.displayName}
                      {p.isCurrentUser && <span className="rs-lb-you">You</span>}
                    </span>
                    <span className="rs-lb-score">
                      {p.played === 0 ? '–' : format === 'stableford'
                        ? `${p.pts} pts`
                        : `${p.gross}`}
                    </span>
                    {p.played < totalHoles && p.played > 0 && (
                      <span className="rs-lb-thru">{p.played} holes</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Back to profile — shown when round is complete */}
          {roundComplete && (
            <Link href="/profile" className="rs-profile-link">
              Back to profile
            </Link>
          )}

        </main>

        <BottomNav active="rounds" />
      </div>
    </>
  )
}

