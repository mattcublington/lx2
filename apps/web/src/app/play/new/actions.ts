'use server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCourse } from '@/lib/courses'
import crypto from 'crypto'

// ─── Share code ────────────────────────────────────────────────────────────────
// 6-char uppercase alphanumeric with no visually confusable characters.

function generateShareCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = crypto.randomBytes(6)
  return Array.from(bytes as Uint8Array).map(b => chars[b % chars.length]).join('')
}

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

  // 2. Get course data from courses.ts (sync — no DB call)
  const course = getCourse(data.courseId)
  if (!course) throw new Error(`Course not found: ${data.courseId}`)

  // 3. Parallelise: upsert user row + look up course DB id
  // Uses service_role: public.users has no INSERT policy (writes are
  // restricted to server-side admin actions per 001_rls_policies.sql).
  const userHandicap = data.players.find(p => p.isUser)?.handicapIndex ?? null
  const admin = createAdminClient()

  const [, existingCourse] = await Promise.all([
    admin
      .from('users')
      .upsert({
        id: user.id,
        email: user.email!,
        display_name: user.email!.split('@')[0],
        ...(userHandicap !== null ? { handicap_index: userHandicap } : {}),
      }, { onConflict: 'id', ignoreDuplicates: false }),
    supabase
      .from('courses')
      .select('id')
      .eq('name', course.name)
      .maybeSingle()
      .then(r => r.data),
  ])

  // 4. Create course row only if it doesn't exist yet
  // INSERT uses the admin client — course records come from verified static
  // data in courses.ts, so service_role is appropriate here server-side.
  let courseDbId: string

  if (existingCourse) {
    courseDbId = existingCourse.id
  } else {
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

  // 6. Create events row (with share code for group joining)
  const shareCode = generateShareCode()
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
      share_code: shareCode,
    })
    .select('id')
    .single()

  if (eventErr || !event) {
    throw new Error(`Failed to create event: ${eventErr?.message ?? 'unknown error'}`)
  }

  // 7. Batch-insert all event_players in one request
  const { data: eps, error: epsErr } = await supabase
    .from('event_players')
    .insert(data.players.map(player => ({
      event_id: event.id,
      user_id: player.isUser ? user.id : null,
      display_name: player.name,
      handicap_index: player.handicapIndex,
    })))
    .select('id')

  if (epsErr || !eps) {
    throw new Error(`Failed to create event_players: ${epsErr?.message ?? 'unknown error'}`)
  }

  // 8. Batch-insert all scorecards in one request (order matches eps)
  const { data: scs, error: scsErr } = await supabase
    .from('scorecards')
    .insert(eps.map(ep => ({
      event_id: event.id,
      event_player_id: ep.id,
      round_type: data.roundType,
    })))
    .select('id')

  if (scsErr || !scs) {
    throw new Error(`Failed to create scorecards: ${scsErr?.message ?? 'unknown error'}`)
  }

  // 9. Find the current user's scorecard by matching player index
  const userIdx = data.players.findIndex(p => p.isUser)
  const userScorecardId = scs[userIdx]?.id

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
