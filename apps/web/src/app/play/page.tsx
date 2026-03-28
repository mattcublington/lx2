import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PlayDashboard from './PlayDashboard'

export default async function PlayPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch profile, recent rounds, count, all scorecards, and active round in parallel
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [
    { data: profile },
    { data: recentRounds },
    { count: roundsCount },
    { data: allScorecards },
    { data: activeRound },
    { data: myEvents },
  ] = await Promise.all([
    supabase
      .from('users')
      .select('display_name, email, handicap_index')
      .eq('id', user.id)
      .single(),
    supabase
      .from('scorecards')
      .select(`
        id,
        created_at,
        round_type,
        events!inner (
          name,
          date,
          format,
          courses (
            name
          ),
          course_combinations (
            name
          )
        ),
        event_players!inner (
          user_id
        )
      `)
      .eq('event_players.user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('scorecards')
      .select('id, event_players!inner(user_id)', { count: 'exact', head: true })
      .eq('event_players.user_id', user.id),
    supabase
      .from('scorecards')
      .select('id, created_at, event_players!inner(user_id)')
      .eq('event_players.user_id', user.id),
    supabase
      .from('scorecards')
      .select('id, event_players!inner(user_id)')
      .eq('event_players.user_id', user.id)
      .is('submitted_at', null)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('events')
      .select(`
        id, name, date, format, finalised,
        course_combinations ( name ),
        event_players ( id )
      `)
      .eq('created_by', user.id)
      .order('date', { ascending: false })
      .limit(5),
  ])

  const scorecardIds = (allScorecards ?? []).map(s => s.id)

  // Hole scores for all the user's rounds (for avg + best)
  const { data: holeScores } = scorecardIds.length > 0
    ? await supabase
        .from('hole_scores')
        .select('scorecard_id, gross_strokes')
        .in('scorecard_id', scorecardIds)
        .not('gross_strokes', 'is', null)
    : { data: [] }

  // Total gross per scorecard
  const scorecardTotals = new Map<string, number>()
  for (const hs of holeScores ?? []) {
    if (hs.gross_strokes == null) continue
    scorecardTotals.set(hs.scorecard_id, (scorecardTotals.get(hs.scorecard_id) ?? 0) + hs.gross_strokes)
  }

  // Average score — last 12 months, only scorecards with at least 9 holes scored
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)
  const recentIds = new Set(
    (allScorecards ?? [])
      .filter(s => new Date(s.created_at) >= twelveMonthsAgo)
      .map(s => s.id)
  )
  const recentTotals = [...scorecardTotals.entries()]
    .filter(([id, total]) => recentIds.has(id) && total >= 27) // min 9 holes
    .map(([, total]) => total)
  const avgScore = recentTotals.length > 0
    ? Math.round(recentTotals.reduce((a, b) => a + b, 0) / recentTotals.length)
    : null

  // Last round score + course
  const lastRound = (recentRounds ?? [])[0] as unknown as {
    id: string
    events: {
      name: string
      courses: { name: string } | null
      course_combinations: { name: string } | null
    } | null
  } | undefined
  const lastRoundScore = lastRound ? (scorecardTotals.get(lastRound.id) ?? null) : null
  const lastRoundCourse = lastRound?.events?.course_combinations?.name
    ?? lastRound?.events?.courses?.name
    ?? lastRound?.events?.name
    ?? null

  type RoundRow = {
    id: string
    created_at: string
    round_type: string | null
    events: {
      name: string
      date: string
      format: string
      courses: { name: string } | null
      course_combinations: { name: string } | null
    } | null
  }

  const rounds: RoundRow[] = (recentRounds ?? []) as unknown as RoundRow[]

  const displayName =
    profile?.display_name ??
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split('@')[0] ??
    'Golfer'

  type OrganisedEvent = {
    id: string
    name: string
    date: string
    format: string
    finalised: boolean
    courseName: string | null
    playerCount: number
  }

  const organisedEvents: OrganisedEvent[] = (myEvents ?? []).map(e => ({
    id: e.id,
    name: e.name,
    date: e.date,
    format: e.format,
    finalised: !!(e.finalised),
    courseName: (e.course_combinations as unknown as { name: string } | null)?.name ?? null,
    playerCount: Array.isArray(e.event_players) ? e.event_players.length : 0,
  }))

  return (
    <PlayDashboard
      userId={user.id}
      displayName={displayName}
      rounds={rounds}
      handicapIndex={profile?.handicap_index ?? null}
      roundsCount={roundsCount ?? 0}
      avgScore={avgScore}
      lastRoundScore={lastRoundScore}
      lastRoundCourse={lastRoundCourse}
      activeRoundId={(activeRound as { id: string } | null)?.id ?? null}
      organisedEvents={organisedEvents}
    />
  )
}
