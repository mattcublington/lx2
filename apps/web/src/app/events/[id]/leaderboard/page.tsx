import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import LeaderboardClient from './LeaderboardClient'
import type { PlayerData } from './LeaderboardClient'
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
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default async function LeaderboardPage({ params }: PageProps) {
  const { id } = await params
  const admin = createAdminClient()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // ── Event ─────────────────────────────────────────────────────────────────
  const { data: event } = await admin
    .from('events')
    .select(`
      id, name, date, format, round_type, handicap_allowance_pct,
      ntp_holes, ld_holes, created_by, is_public, combination_id,
      course_combinations(name, loop_1_id, loop_2_id)
    `)
    .eq('id', id)
    .single()

  if (!event) {
    return (
      <ErrorPage
        title="Event not found"
        body="This event doesn't exist or is no longer available."
      />
    )
  }

  if (!event.is_public && !user) {
    redirect(`/auth/login?redirect=/events/${id}/leaderboard`)
  }

  if (event.format === 'matchplay') {
    return (
      <ErrorPage
        title="No leaderboard for Match Play"
        body="Match play events use head-to-head results — there&apos;s no ranked leaderboard."
      />
    )
  }

  const combo = event.course_combinations as unknown as {
    name: string
    loop_1_id: string
    loop_2_id: string | null
  } | null

  const roundType = event.round_type as '18' | '9'
  const isOrganiser = user?.id === event.created_by

  // ── Hole data from loop_holes ─────────────────────────────────────────────
  const [loop1Result, loop2Result] = await Promise.all([
    combo?.loop_1_id
      ? admin
          .from('loop_holes')
          .select('hole_number, par, si_m')
          .eq('loop_id', combo.loop_1_id)
          .order('hole_number')
      : Promise.resolve({ data: null }),
    combo?.loop_2_id && roundType === '18'
      ? admin
          .from('loop_holes')
          .select('hole_number, par, si_m')
          .eq('loop_id', combo.loop_2_id)
          .order('hole_number')
      : Promise.resolve({ data: null }),
  ])

  const holeData: HoleData[] = []

  if (loop1Result.data) {
    for (const h of loop1Result.data) {
      holeData.push({ holeNumber: h.hole_number, par: h.par, strokeIndex: h.si_m })
    }
  }
  if (loop2Result.data) {
    for (const h of loop2Result.data) {
      // Offset hole numbers and stroke indexes for the back nine
      holeData.push({
        holeNumber: h.hole_number + 9,
        par: h.par,
        strokeIndex: h.si_m + 9,
      })
    }
  }
  // Fallback when no course data is linked
  if (holeData.length === 0) {
    const total = roundType === '9' ? 9 : 18
    for (let i = 1; i <= total; i++) {
      holeData.push({ holeNumber: i, par: 4, strokeIndex: i })
    }
  }
  holeData.sort((a, b) => a.holeNumber - b.holeNumber)

  const totalHoles = holeData.length

  // ── Players, scorecards, contest entries (parallel) ───────────────────────
  const [playersResult, scorecardsResult, contestResult] = await Promise.all([
    admin
      .from('event_players')
      .select('id, display_name, handicap_index')
      .eq('event_id', id)
      .eq('rsvp_status', 'confirmed')
      .order('created_at'),
    admin
      .from('scorecards')
      .select('id, event_player_id')
      .eq('event_id', id),
    admin
      .from('contest_entries')
      .select('hole_number, type, event_player_id')
      .eq('event_id', id),
  ])

  const players = playersResult.data ?? []
  const scorecards = scorecardsResult.data ?? []
  const contestEntries = contestResult.data ?? []

  // ── Hole scores ───────────────────────────────────────────────────────────
  const scorecardIds = scorecards.map(s => s.id)
  const { data: holeScoresData } = scorecardIds.length > 0
    ? await admin
        .from('hole_scores')
        .select('scorecard_id, hole_number, gross_strokes')
        .in('scorecard_id', scorecardIds)
    : { data: [] as { scorecard_id: string; hole_number: number; gross_strokes: number | null }[] }

  // ── Build lookup maps ─────────────────────────────────────────────────────
  const scorecardByPlayer = new Map(scorecards.map(s => [s.event_player_id, s.id]))

  const scoresMap = new Map<string, (number | null)[]>()
  for (const sc of scorecards) {
    scoresMap.set(sc.id, new Array<number | null>(totalHoles).fill(null))
  }
  for (const hs of holeScoresData ?? []) {
    const arr = scoresMap.get(hs.scorecard_id)
    if (arr && hs.hole_number >= 1 && hs.hole_number <= totalHoles) {
      arr[hs.hole_number - 1] = hs.gross_strokes
    }
  }

  const contestMap = new Map<string, { type: 'ntp' | 'ld'; holeNumber: number }[]>()
  for (const entry of contestEntries) {
    const list = contestMap.get(entry.event_player_id) ?? []
    list.push({ type: entry.type as 'ntp' | 'ld', holeNumber: entry.hole_number })
    contestMap.set(entry.event_player_id, list)
  }

  // ── Build initial player data ─────────────────────────────────────────────
  const initialPlayers: PlayerData[] = players.map(p => {
    const scorecardId = scorecardByPlayer.get(p.id) ?? null
    return {
      eventPlayerId: p.id,
      scorecardId,
      displayName: p.display_name,
      handicapIndex: Number(p.handicap_index),
      grossStrokes: scorecardId
        ? (scoresMap.get(scorecardId) ?? new Array<number | null>(totalHoles).fill(null))
        : new Array<number | null>(totalHoles).fill(null),
      badges: contestMap.get(p.id) ?? [],
    }
  })

  const allowancePct = Number(event.handicap_allowance_pct)
  const ntpHoles = (event.ntp_holes as number[] | null) ?? []
  const ldHoles = (event.ld_holes as number[] | null) ?? []

  return (
    <>
      <style>{`
        @keyframes lb-in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.75); }
        }
        .lb-strip::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── Sticky header ── */}
      <header style={{
        background: '#0a1f0a',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', height: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Link
            href={`/events/${id}`}
            style={{
              textDecoration: 'none', color: '#6db56d',
              fontSize: '0.8125rem', fontFamily: 'var(--font-dm-sans), sans-serif',
            }}
          >
            ← Event
          </Link>
          <span style={{
            fontFamily: 'var(--font-dm-sans), sans-serif',
            fontWeight: 700, color: '#fff', fontSize: '1rem', letterSpacing: '-0.02em',
          }}>
            LX<span style={{ color: '#4ade80' }}>2</span>
          </span>
          {isOrganiser ? (
            <Link
              href={`/events/${id}/manage`}
              style={{
                fontSize: '0.8125rem', color: '#6db56d',
                fontFamily: 'var(--font-dm-sans), sans-serif', textDecoration: 'none',
              }}
            >
              Manage
            </Link>
          ) : (
            <span style={{ width: 48 }} /> /* spacer to keep logo centred */
          )}
        </div>
      </header>

      {/* ── Event sub-header ── */}
      <div style={{
        background: '#0a1f0a',
        padding: '12px 24px 20px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h1 style={{
            fontFamily: 'var(--font-dm-serif), serif',
            fontWeight: 400,
            fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
            color: '#fff',
            margin: '0 0 4px',
            letterSpacing: '-0.02em',
          }}>
            {event.name}
          </h1>
          <div style={{
            fontSize: '0.8125rem',
            color: '#6B8C6B',
            fontFamily: 'var(--font-dm-sans), sans-serif',
          }}>
            {formatDate(event.date)}
            {'\u00a0\u00b7\u00a0'}
            {FORMAT_LABEL[event.format] ?? event.format}
            {combo?.name ? `${'\u00a0\u00b7\u00a0'}${combo.name}` : ''}
          </div>
        </div>
      </div>

      {/* ── Live client leaderboard ── */}
      <LeaderboardClient
        eventId={id}
        format={event.format as 'stableford' | 'strokeplay'}
        roundType={roundType}
        allowancePct={allowancePct}
        holeData={holeData}
        initialPlayers={initialPlayers}
        ntpHoles={ntpHoles}
        ldHoles={ldHoles}
      />
    </>
  )
}

// ─── Error page ───────────────────────────────────────────────────────────────

function ErrorPage({ title, body }: { title: string; body: string }) {
  return (
    <div style={{
      minHeight: '100dvh',
      background: '#F2F5F0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: 'var(--font-dm-sans), sans-serif',
    }}>
      <div style={{ maxWidth: 360, textAlign: 'center' }}>
        <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1A2E1A', marginBottom: 8 }}>
          {title}
        </div>
        <div
          style={{ fontSize: '0.875rem', color: '#6B8C6B', lineHeight: 1.6 }}
          dangerouslySetInnerHTML={{ __html: body }}
        />
      </div>
    </div>
  )
}
