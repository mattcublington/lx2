import { createAdminClient } from '@/lib/supabase/admin'
import type { PlayerData } from '@lx2/leaderboard'
import type { HoleData } from '@lx2/scoring'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EventLeaderboardData {
  event: {
    id: string
    name: string
    date: string
    format: 'stableford' | 'strokeplay' | 'matchplay'
    roundType: '18' | '9'
    allowancePct: number
    ntpHoles: number[]
    ldHoles: number[]
    isPublic: boolean
    createdBy: string
    courseName: string | null
  }
  holeData: HoleData[]
  initialPlayers: PlayerData[]
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

export async function fetchEventLeaderboardData(
  eventId: string,
): Promise<EventLeaderboardData | null> {
  const admin = createAdminClient()

  const { data: event } = await admin
    .from('events')
    .select(`
      id, name, date, format, round_type, handicap_allowance_pct,
      ntp_holes, ld_holes, created_by, is_public,
      courses(name),
      course_combinations(name, loop_1_id, loop_2_id)
    `)
    .eq('id', eventId)
    .single()

  if (!event) return null

  const combo = event.course_combinations as unknown as {
    name: string
    loop_1_id: string
    loop_2_id: string | null
  } | null

  const roundType = event.round_type as '18' | '9'

  // ── All dependent queries in parallel ──────────────────────────────────────
  const [loop1Result, loop2Result, playersResult, scorecardsResult, contestResult, holeScoresResult] = await Promise.all([
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
    admin
      .from('event_players')
      .select('id, display_name, handicap_index')
      .eq('event_id', eventId)
      .eq('rsvp_status', 'confirmed')
      .order('created_at'),
    admin
      .from('scorecards')
      .select('id, event_player_id')
      .eq('event_id', eventId),
    admin
      .from('contest_entries')
      .select('hole_number, type, event_player_id')
      .eq('event_id', eventId),
    admin
      .from('hole_scores')
      .select('scorecard_id, hole_number, gross_strokes, scorecards!inner(event_id)')
      .eq('scorecards.event_id', eventId),
  ])

  const holeData: HoleData[] = []

  if (loop1Result.data) {
    for (const h of loop1Result.data) {
      holeData.push({ holeNumber: h.hole_number, par: h.par, strokeIndex: h.si_m })
    }
  }
  if (loop2Result.data) {
    for (const h of loop2Result.data) {
      holeData.push({
        holeNumber: h.hole_number + 9,
        par: h.par,
        strokeIndex: h.si_m + 9,
      })
    }
  }
  if (holeData.length === 0) {
    const total = roundType === '9' ? 9 : 18
    for (let i = 1; i <= total; i++) {
      holeData.push({ holeNumber: i, par: 4, strokeIndex: i })
    }
  }
  holeData.sort((a, b) => a.holeNumber - b.holeNumber)

  const totalHoles = holeData.length

  const players = playersResult.data ?? []
  const scorecards = scorecardsResult.data ?? []
  const contestEntries = contestResult.data ?? []
  const holeScoresData = holeScoresResult.data ?? []

  // ── Build lookup maps ──────────────────────────────────────────────────────
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

  // ── Build player data ──────────────────────────────────────────────────────
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

  return {
    event: {
      id: event.id,
      name: event.name,
      date: event.date,
      format: event.format as 'stableford' | 'strokeplay' | 'matchplay',
      roundType,
      allowancePct: Number(event.handicap_allowance_pct),
      ntpHoles: (event.ntp_holes as number[] | null) ?? [],
      ldHoles: (event.ld_holes as number[] | null) ?? [],
      isPublic: event.is_public,
      createdBy: event.created_by,
      courseName: (event.courses as unknown as { name: string } | null)?.name ?? combo?.name ?? null,
    },
    holeData,
    initialPlayers,
  }
}
