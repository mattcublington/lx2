'use server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCourse } from '@/lib/courses'

interface StartRoundPlayer {
  name: string
  handicapIndex: number
  isUser: boolean
}

interface StartRoundData {
  courseId: string           // courses.ts id, e.g. 'cumberwell-red-yellow'
  dbCombinationId: string | null
  players: StartRoundPlayer[]
  format: 'stableford' | 'strokeplay' | 'matchplay'
  tee: string
  roundType: '18' | '9'
  ntpHoles: number[]
  ldHoles: number[]
  allowancePct: number       // e.g. 95 (percent)
}

export async function startRound(data: StartRoundData): Promise<string> {
  const supabase = await createClient()

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // 2. Ensure public.users row exists; persist handicap_index if provided
  const userHandicap = data.players.find(p => p.isUser)?.handicapIndex ?? null
  await supabase
    .from('users')
    .upsert({
      id: user.id,
      email: user.email!,
      display_name: user.email!.split('@')[0],
      ...(userHandicap !== null ? { handicap_index: userHandicap } : {}),
    }, { onConflict: 'id', ignoreDuplicates: false })

  // 3. Get course data from courses.ts
  const course = getCourse(data.courseId)
  if (!course) throw new Error(`Course not found: ${data.courseId}`)

  // 4. Find or create courses row in DB
  // SELECT uses the user's session (courses are publicly readable).
  // INSERT uses the admin client — course records come from verified static
  // data in courses.ts, so service_role is appropriate here server-side.
  const { data: existingCourse } = await supabase
    .from('courses')
    .select('id')
    .eq('name', course.name)
    .single()

  let courseDbId: string

  if (existingCourse) {
    courseDbId = existingCourse.id
  } else {
    const admin = createAdminClient()
    const { data: newCourse, error: courseErr } = await admin
      .from('courses')
      .insert({
        name: course.name,
        club: course.club,
        location: course.location,
        holes_count: course.holes.length,
        slope_rating: course.slopeRating,
        course_rating: course.courseRating,
        par: course.par,
        source: 'manual',
        verified: true,
      })
      .select('id')
      .single()

    if (courseErr || !newCourse) {
      throw new Error(`Failed to create course record: ${courseErr?.message ?? 'unknown error'}`)
    }
    courseDbId = newCourse.id
  }

  // 5. Auto-generate event name: "{combo} · {format} · {date}"
  const shortCombo = course.name.split('—').pop()?.trim() ?? course.name
  const formatLabel =
    data.format === 'stableford' ? 'Stableford'
    : data.format === 'strokeplay' ? 'Stroke Play'
    : 'Match Play'
  const today = new Date()
  const dateLabel = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const eventName = `${shortCombo} · ${formatLabel} · ${dateLabel}`
  const todayIso = today.toISOString().split('T')[0]!

  // 6. Create events row
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .insert({
      created_by: user.id,
      course_id: courseDbId,
      combination_id: data.dbCombinationId ?? null,
      name: eventName,
      date: todayIso,
      format: data.format,
      round_type: data.roundType,
      handicap_allowance_pct: data.allowancePct / 100,
      ntp_holes: data.ntpHoles,
      ld_holes: data.ldHoles,
      is_public: false,
      finalised: false,
    })
    .select('id')
    .single()

  if (eventErr || !event) {
    throw new Error(`Failed to create event: ${eventErr?.message ?? 'unknown error'}`)
  }

  // 7. Create event_players + scorecards for each player
  let userScorecardId: string | null = null

  for (const player of data.players) {
    // a) Create event_player row
    const { data: ep, error: epErr } = await supabase
      .from('event_players')
      .insert({
        event_id: event.id,
        user_id: player.isUser ? user.id : null,
        display_name: player.name,
        handicap_index: player.handicapIndex,
      })
      .select('id')
      .single()

    if (epErr || !ep) {
      throw new Error(`Failed to create event_player for ${player.name}: ${epErr?.message ?? 'unknown error'}`)
    }

    // b) Create scorecard row
    const { data: sc, error: scErr } = await supabase
      .from('scorecards')
      .insert({
        event_id: event.id,
        event_player_id: ep.id,
        round_type: data.roundType,
      })
      .select('id')
      .single()

    if (scErr || !sc) {
      throw new Error(`Failed to create scorecard for ${player.name}: ${scErr?.message ?? 'unknown error'}`)
    }

    if (player.isUser) {
      userScorecardId = sc.id
    }
  }

  // 8. Redirect to scoring page for the current user's scorecard
  if (!userScorecardId) {
    throw new Error('Could not determine user scorecard ID')
  }

  return `/rounds/${userScorecardId}/score`
}

export async function searchUsers(query: string): Promise<{ id: string; displayName: string; handicapIndex: number | null }[]> {
  if (!query || query.trim().length < 2) return []
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .rpc('search_user_profiles', { search_query: query.trim() })
  return (data ?? []).map((u: { id: string; display_name: string | null; handicap_index: number | null }) => ({
    id: u.id,
    displayName: u.display_name ?? '',
    handicapIndex: u.handicap_index ?? null,
  }))
}
