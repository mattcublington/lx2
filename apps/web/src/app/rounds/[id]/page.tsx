import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
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

  /* Header */
  .rs-hd {
    background: #F0F4EC;
    padding: 1rem 1.25rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 50;
  }
  .rs-back {
    font-family: var(--font-lexend), sans-serif;
    font-size: 0.875rem;
    font-weight: 500;
    color: #72786E;
    text-decoration: none;
    transition: color 0.15s;
  }
  .rs-back:hover { color: #0D631B; }

  /* Main */
  .rs-main {
    padding: 1rem 1.25rem 2rem;
    max-width: 560px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* Hero */
  .rs-hero {
    animation: rs-rise 0.4s cubic-bezier(0.2, 0, 0, 1) both;
  }
  .rs-course {
    font-family: var(--font-manrope), sans-serif;
    font-weight: 800;
    font-size: 1.625rem;
    color: #1A2E1A;
    letter-spacing: -0.02em;
    line-height: 1.15;
    margin-bottom: 0.625rem;
  }
  .rs-meta-row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 0.4rem;
    align-items: center;
  }
  .rs-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.625rem;
    border-radius: 20px;
    background: rgba(13, 99, 27, 0.1);
    color: #0D631B;
    font-size: 0.75rem;
    font-weight: 500;
  }
  .rs-badge-warn {
    background: rgba(180, 83, 9, 0.1);
    color: #B45309;
  }
  .rs-date {
    font-size: 0.875rem;
    color: #72786E;
    margin-bottom: 1rem;
  }

  /* Score hero */
  .rs-score-hero {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 0.5rem;
  }
  .rs-score-big {
    font-family: var(--font-manrope), sans-serif;
    font-weight: 800;
    font-size: 3.5rem;
    color: #1A2E1A;
    letter-spacing: -0.03em;
    line-height: 1;
  }
  .rs-score-unit {
    font-family: var(--font-manrope), sans-serif;
    font-weight: 700;
    font-size: 1.5rem;
    color: #0D631B;
    letter-spacing: -0.01em;
  }
  .rs-score-sub {
    width: 100%;
    font-size: 0.875rem;
    color: #72786E;
    margin-top: 0.25rem;
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
    font-family: var(--font-dm-serif), serif;
    font-weight: 400;
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
    .rs-main { padding: 2rem; }
    .rs { padding-bottom: 0; }
    .rs-course { font-size: 2rem; }
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
    fontSize: 10, fontWeight: 500, color: '#72786E', whiteSpace: 'nowrap',
  }
  const td: React.CSSProperties = {
    padding: '6px 6px', textAlign: 'center', fontSize: 11,
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
            <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: 15, color: '#0D631B' }}>
              {grandTotalPts} pts total
            </span>
          ) : (
            <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: 15, color: '#1A2E1A' }}>
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
      <div style={{ marginTop: 32, fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 14, color: '#6B8C6B', lineHeight: 1.5 }}>{body}</div>
      <Link href="/rounds" style={{ display: 'inline-block', marginTop: 20, color: '#0D631B', fontWeight: 600, fontSize: 14 }}>
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
  } else {
    courseDataUnavailable = true
  }

  // ── 3. Scores ──────────────────────────────────────────────────────────────
  const { data: holeScoreRows } = await supabase
    .from('hole_scores')
    .select('hole_number, gross_strokes')
    .eq('scorecard_id', id)

  const scores: Record<number, number | null> = {}
  for (const row of holeScoreRows ?? []) {
    scores[row.hole_number] = row.gross_strokes ?? null
  }

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

        {/* Header */}
        <header className="rs-hd">
          <Image src="/lx2-logo.svg" alt="LX2" width={64} height={32} priority />
          <Link href="/rounds" className="rs-back">My Rounds</Link>
        </header>

        <main className="rs-main">

          {/* Hero */}
          <section className="rs-hero">
            <div className="rs-course">{displayCourse}</div>
            <div className="rs-meta-row">
              <span className="rs-badge">{formatLabel}</span>
              <span className="rs-badge">{totalHoles} holes</span>
              {!roundComplete && holesPlayed > 0 && (
                <span className="rs-badge rs-badge-warn">{holesPlayed}/{totalHoles} played</span>
              )}
            </div>
            <div className="rs-date">{dateLabel}</div>

            {/* Score hero */}
            {holesPlayed > 0 && (
              <div className="rs-score-hero">
                {format === 'stableford' ? (
                  <>
                    <span className="rs-score-big">{totalPts}</span>
                    <span className="rs-score-unit">pts</span>
                  </>
                ) : (
                  <>
                    <span className="rs-score-big">{totalGross}</span>
                    <span className="rs-score-unit">{vsPar}</span>
                  </>
                )}
                <div className="rs-score-sub">
                  {format === 'stableford'
                    ? `${totalGross} strokes · HCP ${handicapIndex}`
                    : `${vsPar} vs par ${coursePar} · HCP ${handicapIndex}`}
                </div>
              </div>
            )}
          </section>

          {/* Continue scoring CTA if in progress */}
          {!roundComplete && (
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

