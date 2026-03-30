import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import BottomNav from '@/components/BottomNav'
import { computeTournamentStandings } from '@/lib/tournaments/standings'
import type { TournamentRoundResult } from '@/lib/tournaments/standings'
import { calculateStableford } from '@lx2/scoring'
import { calculateStrokePlay } from '@lx2/scoring'
import type { HoleData } from '@lx2/scoring'

interface PageProps {
  params: Promise<{ id: string }>
}

const FORMAT_LABEL: Record<string, string> = {
  stableford: 'Stableford',
  strokeplay: 'Stroke Play',
  matchplay: 'Match Play',
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── Types for raw Supabase data ───────────────────────────────────────────────

type RawHoleScore = {
  hole_number: number
  gross_strokes: number | null
}

type RawScorecard = {
  id: string
  submitted_at: string | null
  hole_scores: RawHoleScore[]
}

type RawEventPlayer = {
  id: string
  user_id: string | null
  display_name: string
  handicap_index: number | null
  scorecards: RawScorecard[]
}

type RawCourse = { name: string } | null
type RawCombo = { id: string; name: string } | null

type RawRound = {
  id: string
  name: string
  date: string
  format: string
  finalised: boolean
  round_number: number | null
  courses: RawCourse
  course_combinations: RawCombo
  event_players: RawEventPlayer[]
}

type RawLoopHole = {
  hole_number: number
  par: number
  si_m: number
}

// ── Hole data fetcher ─────────────────────────────────────────────────────────

async function fetchHoleData(
  admin: ReturnType<typeof createAdminClient>,
  comboId: string | null,
): Promise<HoleData[]> {
  if (!comboId) {
    const fallback: HoleData[] = []
    for (let i = 1; i <= 18; i++) fallback.push({ holeNumber: i, par: 4, strokeIndex: i })
    return fallback
  }

  // Get loop IDs for this combination
  const { data: combo } = await admin
    .from('course_combinations')
    .select('loop_1_id, loop_2_id')
    .eq('id', comboId)
    .single()

  if (!combo) {
    const fallback: HoleData[] = []
    for (let i = 1; i <= 18; i++) fallback.push({ holeNumber: i, par: 4, strokeIndex: i })
    return fallback
  }

  const [loop1Result, loop2Result] = await Promise.all([
    combo.loop_1_id
      ? admin
          .from('loop_holes')
          .select('hole_number, par, si_m')
          .eq('loop_id', combo.loop_1_id)
          .order('hole_number')
      : Promise.resolve({ data: null }),
    combo.loop_2_id
      ? admin
          .from('loop_holes')
          .select('hole_number, par, si_m')
          .eq('loop_id', combo.loop_2_id)
          .order('hole_number')
      : Promise.resolve({ data: null }),
  ])

  const holeData: HoleData[] = []
  if (loop1Result.data) {
    for (const h of (loop1Result.data as RawLoopHole[])) {
      holeData.push({ holeNumber: h.hole_number, par: h.par, strokeIndex: h.si_m })
    }
  }
  if (loop2Result.data) {
    for (const h of (loop2Result.data as RawLoopHole[])) {
      holeData.push({ holeNumber: h.hole_number + 9, par: h.par, strokeIndex: h.si_m + 9 })
    }
  }
  if (holeData.length === 0) {
    for (let i = 1; i <= 18; i++) holeData.push({ holeNumber: i, par: 4, strokeIndex: i })
  }
  holeData.sort((a, b) => a.holeNumber - b.holeNumber)
  return holeData
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default async function TournamentOverviewPage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?redirect=/tournaments/${id}`)

  const admin = createAdminClient()

  // ── Tournament ──────────────────────────────────────────────────────────────
  const { data: tournament } = await admin
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (!tournament) {
    return <ErrorCard title="Tournament not found" body="This tournament does not exist or has been removed." back="/tournaments" />
  }

  // ── Rounds (events linked to this tournament) ───────────────────────────────
  const { data: rawRounds } = await admin
    .from('events')
    .select(`
      id, name, date, format, finalised, round_number,
      courses ( name ),
      course_combinations ( id, name ),
      event_players (
        id, user_id, display_name, handicap_index,
        scorecards (
          id, submitted_at,
          hole_scores ( hole_number, gross_strokes )
        )
      )
    `)
    .eq('tournament_id', id)
    .order('round_number', { ascending: true })

  const rounds = (rawRounds ?? []) as unknown as RawRound[]

  const format = (tournament.format as string) === 'strokeplay' ? 'strokeplay' : 'stableford'

  // ── Compute scores for each finalised round ─────────────────────────────────
  const allowance = format === 'stableford' ? 0.95 : 1.0

  const tournamentRoundResults: TournamentRoundResult[] = await Promise.all(
    rounds.map(async (round) => {
      const roundNum = round.round_number ?? 1
      if (!round.finalised) {
        return { roundNumber: roundNum, finalised: false, results: [] }
      }

      const comboId = (round.course_combinations as RawCombo)?.id ?? null
      const holeData = await fetchHoleData(admin, comboId)
      const totalHoles = holeData.length

      const results = round.event_players.flatMap((player) => {
        const sc = (player.scorecards as RawScorecard[])[0]
        if (!sc || !sc.submitted_at) return []
        if (!player.user_id) return []

        const grossStrokes: (number | null)[] = new Array<number | null>(totalHoles).fill(null)
        for (const hs of sc.hole_scores) {
          const idx = hs.hole_number - 1
          if (idx >= 0 && idx < totalHoles) {
            grossStrokes[idx] = hs.gross_strokes
          }
        }

        const playingHandicap = Math.round(Number(player.handicap_index ?? 0) * allowance)

        let stablefordTotal = 0
        let grossTotal = 0

        if (format === 'stableford') {
          const result = calculateStableford({ holes: holeData, grossStrokes, playingHandicap })
          stablefordTotal = result.total
          grossTotal = (grossStrokes.filter(s => s !== null) as number[]).reduce((a, b) => a + b, 0)
        } else {
          const result = calculateStrokePlay({ holes: holeData, grossStrokes, playingHandicap })
          grossTotal = result.grossTotal ?? 0
          stablefordTotal = 0
        }

        return [{
          userId: player.user_id,
          displayName: player.display_name,
          stablefordTotal,
          grossTotal,
        }]
      })

      return { roundNumber: roundNum, finalised: true, results }
    }),
  )

  const standings = computeTournamentStandings(tournamentRoundResults, format, 'exclude')

  const isOrganiser = user.id === tournament.created_by
  const finalisedRoundNumbers = tournamentRoundResults
    .filter(r => r.finalised)
    .map(r => r.roundNumber)
    .sort((a, b) => a - b)

  const hasStandings = standings.length > 0

  // ── Status badge for each round ─────────────────────────────────────────────
  function roundStatus(round: RawRound): 'finalised' | 'in_progress' | 'upcoming' {
    if (round.finalised) return 'finalised'
    const hasAny = round.event_players.some(
      p => (p.scorecards as RawScorecard[]).some(sc => sc.submitted_at)
    )
    return hasAny ? 'in_progress' : 'upcoming'
  }

  return (
    <>
      <style>{`
        .to-page {
          min-height: 100dvh;
          background: #F2F5F0;
          font-family: var(--font-dm-sans), system-ui, sans-serif;
          color: #1A2E1A;
          padding-bottom: max(100px, calc(80px + env(safe-area-inset-bottom)));
        }
        /* ── Hero ── */
        .to-hero {
          position: relative; width: 100%; height: 160px; overflow: hidden;
        }
        .to-hero-img { object-fit: cover; }
        .to-hero-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to bottom, rgba(10,31,10,0.45) 0%, rgba(10,31,10,0.75) 100%);
          z-index: 1;
        }
        .to-hero-inner {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 1.25rem 2rem; z-index: 2;
          max-width: 1200px; margin: 0 auto;
        }
        .to-hero-back {
          display: inline-flex; align-items: center; gap: 6px;
          color: rgba(255,255,255,0.7); text-decoration: none;
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.875rem; font-weight: 500;
          padding: 6px 10px; border-radius: 8px;
          transition: background 0.15s, color 0.15s;
          margin-bottom: 8px;
        }
        .to-hero-back:hover { background: rgba(255,255,255,0.15); color: #fff; }
        .to-hero-title {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 800;
          font-size: clamp(1.5rem, 4vw, 2rem);
          color: #fff; margin: 0;
          letter-spacing: -0.02em;
          text-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .to-hero-badges {
          display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap;
        }
        .to-hero-badge {
          display: inline-flex; align-items: center;
          padding: 3px 10px; border-radius: 9999px;
          font-size: 0.75rem; font-weight: 600;
          font-family: var(--font-dm-sans), sans-serif;
          backdrop-filter: blur(4px);
        }
        .to-hero-badge-format {
          background: rgba(255,255,255,0.2); color: #fff;
          border: 1px solid rgba(255,255,255,0.25);
        }
        .to-hero-badge-status {
          background: rgba(255,255,255,0.15); color: rgba(255,255,255,0.9);
          border: 1px solid rgba(255,255,255,0.2);
        }
        @media (min-width: 768px) {
          .to-hero { height: 180px; }
        }
        /* ── Body ── */
        .to-main {
          padding: 28px 32px;
          max-width: 1200px;
          margin: 0 auto;
        }
        @keyframes to-in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .to-section { margin-bottom: 32px; animation: to-in 0.35s ease both; }
        .to-section:nth-child(2) { animation-delay: 0.06s; }
        .to-section:nth-child(3) { animation-delay: 0.12s; }
        .to-section:nth-child(4) { animation-delay: 0.18s; }
        .to-section-title {
          font-size: 0.8125rem; font-weight: 700; color: #6B8C6B;
          text-transform: uppercase; letter-spacing: 0.06em;
          margin-bottom: 12px;
          font-family: var(--font-dm-sans), sans-serif;
        }
        /* ── Round cards ── */
        .to-rounds-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 12px;
        }
        .to-round-card {
          display: block; text-decoration: none; color: inherit;
          background: #fff; border: 1px solid #E0EBE0; border-radius: 14px;
          padding: 16px 18px;
          transition: transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 2px 8px rgba(26,46,26,0.04);
        }
        .to-round-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(26,46,26,0.1);
        }
        .to-round-label {
          font-size: 0.8125rem; font-weight: 600; color: #6B8C6B;
          text-transform: uppercase; letter-spacing: 0.05em;
          margin-bottom: 4px;
        }
        .to-round-name {
          font-family: var(--font-dm-sans), sans-serif;
          font-weight: 600;
          font-size: 1rem; color: #1A2E1A;
          margin-bottom: 6px;
        }
        .to-round-meta {
          font-size: 0.8125rem; color: #6B8C6B;
          margin-bottom: 8px; line-height: 1.5;
        }
        /* ── Status badges ── */
        .to-badge {
          display: inline-flex; align-items: center;
          padding: 3px 8px; border-radius: 9999px;
          font-size: 0.6875rem; font-weight: 600;
          font-family: var(--font-dm-sans), sans-serif;
        }
        .to-badge-finalised {
          background: rgba(13,99,27,0.1); color: #0D631B;
        }
        .to-badge-in-progress {
          background: rgba(180,100,0,0.1); color: #a05800;
        }
        .to-badge-upcoming {
          background: rgba(107,140,107,0.12); color: #4a6e4a;
        }
        /* ── Standings table ── */
        .to-table-wrap {
          overflow-x: auto;
          border-radius: 14px;
          border: 1px solid #E0EBE0;
          background: #fff;
          box-shadow: 0 2px 8px rgba(26,46,26,0.04);
        }
        .to-table {
          width: 100%; border-collapse: collapse;
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.875rem;
        }
        .to-table th {
          padding: 10px 14px;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 600;
          color: #6B8C6B;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #E0EBE0;
          white-space: nowrap;
          background: #F2F5F0;
        }
        .to-table th:first-child {
          position: sticky; left: 0; z-index: 1;
          border-top-left-radius: 14px;
        }
        .to-table th:last-child { border-top-right-radius: 14px; }
        .to-table td {
          padding: 11px 14px;
          border-bottom: 1px solid #F2F5F0;
          white-space: nowrap;
          color: #1A2E1A;
        }
        .to-table tbody tr:last-child td { border-bottom: none; }
        .to-table td:first-child {
          position: sticky; left: 0; z-index: 1;
          background: inherit;
        }
        .to-row-leader {
          background: rgba(13,99,27,0.04);
          font-weight: 600;
        }
        .to-row-leader td:first-child { background: rgba(13,99,27,0.04); }
        .to-pos-badge {
          display: inline-flex; align-items: center; justify-content: center;
          width: 24px; height: 24px; border-radius: 50%;
          font-size: 0.75rem; font-weight: 700;
          background: #F2F5F0; color: #6B8C6B;
        }
        .to-pos-badge-1 {
          background: rgba(13,99,27,0.12); color: #0D631B;
        }
        .to-col-score { text-align: right; }
        .to-col-total {
          text-align: right; font-weight: 700; color: #0D631B;
        }
        .to-col-miss { color: #C8D4C8; text-align: right; }
        /* ── Manage button ── */
        .to-manage-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 10px 18px; background: #fff;
          border: 1.5px solid #0D631B; color: #0D631B;
          border-radius: 12px; font-family: var(--font-dm-sans), sans-serif;
          font-weight: 600; font-size: 0.875rem; text-decoration: none;
          transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
        }
        .to-manage-btn:hover {
          background: rgba(13,99,27,0.04);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(13,99,27,0.1);
        }
      `}</style>

      <div className="to-page">

        {/* ── Hero Banner ── */}
        <div className="to-hero">
          <Image src="/hero.jpg" alt="Golf course" fill priority className="to-hero-img" sizes="100vw" quality={90} />
          <div className="to-hero-overlay" />
          <div className="to-hero-inner">
            <Link href="/tournaments" className="to-hero-back">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </Link>
            <h1 className="to-hero-title">{tournament.name}</h1>
            <div className="to-hero-badges">
              <span className="to-hero-badge to-hero-badge-format">
                {FORMAT_LABEL[tournament.format as string] ?? tournament.format}
              </span>
              <span className="to-hero-badge to-hero-badge-status">
                {tournament.finalised ? 'Completed' :
                  tournament.status === 'in_progress' ? 'In Progress' :
                  'Upcoming'}
              </span>
            </div>
          </div>
        </div>

        <main className="to-main">

          {/* ── Manage button (organiser only) ── */}
          {isOrganiser && (
            <section className="to-section">
              <Link href={`/tournaments/${id}/manage`} className="to-manage-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.75"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="currentColor" strokeWidth="1.75"/>
                </svg>
                Manage Tournament
              </Link>
            </section>
          )}

          {/* ── Round Schedule ── */}
          <section className="to-section">
            <div className="to-section-title">
              Rounds ({rounds.length})
            </div>
            {rounds.length === 0 ? (
              <div style={{
                padding: '20px 24px', background: '#fff', borderRadius: 14,
                border: '1px solid #E0EBE0', fontSize: '0.875rem', color: '#6B8C6B',
                textAlign: 'center',
              }}>
                No rounds scheduled yet.
              </div>
            ) : (
              <div className="to-rounds-grid">
                {rounds.map((round) => {
                  const status = roundStatus(round)
                  const courseName =
                    (round.course_combinations as RawCombo)?.name ??
                    (round.courses as RawCourse)?.name ??
                    null
                  return (
                    <Link
                      key={round.id}
                      href={`/events/${round.id}`}
                      className="to-round-card"
                    >
                      <div className="to-round-label">
                        Round {round.round_number ?? '—'}
                      </div>
                      <div className="to-round-name">{round.name}</div>
                      <div className="to-round-meta">
                        {formatDate(round.date)}
                        {courseName && <><br />{courseName}</>}
                      </div>
                      <span className={
                        status === 'finalised' ? 'to-badge to-badge-finalised' :
                        status === 'in_progress' ? 'to-badge to-badge-in-progress' :
                        'to-badge to-badge-upcoming'
                      }>
                        {status === 'finalised' ? 'Finalised' :
                         status === 'in_progress' ? 'In Progress' :
                         'Upcoming'}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>

          {/* ── Cumulative Standings ── */}
          {hasStandings && (
            <section className="to-section">
              <div className="to-section-title">
                Standings
              </div>
              <div className="to-table-wrap">
                <table className="to-table">
                  <thead>
                    <tr>
                      <th>Pos</th>
                      <th>Player</th>
                      {finalisedRoundNumbers.map(rn => (
                        <th key={rn} className="to-col-score">R{rn}</th>
                      ))}
                      <th className="to-col-total">
                        {format === 'stableford' ? 'Pts' : 'Total'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((standing) => {
                      const isLeader = standing.position === 1
                      return (
                        <tr key={standing.userId} className={isLeader ? 'to-row-leader' : undefined}>
                          <td>
                            <span className={`to-pos-badge${isLeader ? ' to-pos-badge-1' : ''}`}>
                              {standing.position}
                            </span>
                          </td>
                          <td>{standing.displayName}</td>
                          {finalisedRoundNumbers.map(rn => {
                            const score = standing.roundScores[rn]
                            return score !== undefined ? (
                              <td key={rn} className="to-col-score">{score}</td>
                            ) : (
                              <td key={rn} className="to-col-miss">&mdash;</td>
                            )
                          })}
                          <td className="to-col-total">{standing.total}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{
                marginTop: 10, fontSize: '0.75rem', color: '#6B8C6B',
                fontFamily: 'var(--font-dm-sans), sans-serif',
              }}>
                {format === 'stableford'
                  ? 'Higher points = better. Players sorted by total Stableford points.'
                  : 'Lower strokes = better. Players sorted by gross stroke total.'}
              </div>
            </section>
          )}

        </main>
      </div>

      <BottomNav active="events" />
    </>
  )
}

// ── Error card ────────────────────────────────────────────────────────────────

function ErrorCard({ title, body, back }: { title: string; body: string; back: string }) {
  return (
    <div style={{
      minHeight: '100dvh', background: '#F2F5F0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: 'var(--font-dm-sans), sans-serif',
    }}>
      <div style={{ maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1A2E1A', marginBottom: 8 }}>
          {title}
        </div>
        <div style={{ fontSize: '0.875rem', color: '#6B8C6B', lineHeight: 1.6, marginBottom: 20 }}>
          {body}
        </div>
        <Link href={back} style={{ color: '#0D631B', fontWeight: 600, textDecoration: 'none', fontSize: '0.875rem' }}>
          &larr; Go back
        </Link>
      </div>
    </div>
  )
}
