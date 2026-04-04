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

// Data for OCR-uploaded courses (not in static courses.ts)
interface UploadedCourseData {
  name: string
  club: string
  location: string
  par: number
  slopeRating: number
  courseRating: number
  holesCount: number
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
  // Event / advanced fields (all optional — backwards-compatible)
  eventDate?: string         // YYYY-MM-DD, default today
  inviteLink?: boolean       // open invite link mode
  groupSize?: number         // 2 | 3 | 4, default 4
  entryFeePence?: number | null
  // OCR-uploaded course (when courseId starts with 'upload-')
  uploadedCourse?: UploadedCourseData
  // Group assignments from wizard (array of groups, each group is array of player indices)
  groupAssignments?: number[][]
}

export async function startRound(data: StartRoundData): Promise<string> {
  const supabase = await createClient()

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // 2. Resolve course — static courses.ts, freshly-uploaded OCR, or DB-stored OCR
  const isUploadedCourse = data.courseId.startsWith('upload-')
  const course = isUploadedCourse ? null : getCourse(data.courseId)

  // If not in static data and not a fresh upload, look up in DB (e.g. previously-uploaded OCR course)
  let dbCourse: { id: string; name: string; club: string | null; location: string | null; holes_count: number; slope_rating: number | null; course_rating: number | null; par: number | null } | null = null
  if (!isUploadedCourse && !course) {
    const { data: found } = await supabase
      .from('courses')
      .select('id, name, club, location, holes_count, slope_rating, course_rating, par')
      .eq('id', data.courseId)
      .maybeSingle()
    dbCourse = found
    if (!dbCourse) throw new Error(`Course not found: ${data.courseId}`)
  }

  const courseName = isUploadedCourse ? data.uploadedCourse?.name : course?.name ?? dbCourse?.name
  const courseClub = isUploadedCourse ? data.uploadedCourse?.club : course?.club ?? dbCourse?.club
  const courseLocation = isUploadedCourse ? (data.uploadedCourse?.location ?? '') : course?.location ?? dbCourse?.location ?? ''
  const courseHolesCount = isUploadedCourse ? (data.uploadedCourse?.holesCount ?? 18) : course?.holes.length ?? dbCourse?.holes_count ?? 18
  const courseSlopeRating = isUploadedCourse ? (data.uploadedCourse?.slopeRating ?? 113) : course?.slopeRating ?? dbCourse?.slope_rating ?? 113
  const courseCourseRating = isUploadedCourse ? (data.uploadedCourse?.courseRating ?? 72) : course?.courseRating ?? dbCourse?.course_rating ?? 72
  const coursePar = isUploadedCourse ? (data.uploadedCourse?.par ?? 72) : course?.par ?? dbCourse?.par ?? 72

  if (!courseName) throw new Error('Course name is required')

  // 3. Parallelise: upsert user row + look up course DB id
  // Uses service_role: public.users has no INSERT policy (writes are
  // restricted to server-side admin actions per 001_rls_policies.sql).
  const userHandicap = data.players.find(p => p.isUser)?.handicapIndex ?? null
  const admin = createAdminClient()

  // If we already resolved the course from DB, skip the name-based lookup
  const [, existingCourse] = await Promise.all([
    admin
      .from('users')
      .upsert({
        id: user.id,
        email: user.email!,
        ...(userHandicap !== null ? { handicap_index: userHandicap } : {}),
      }, { onConflict: 'id', ignoreDuplicates: false }),
    dbCourse
      ? Promise.resolve(dbCourse)
      : supabase
          .from('courses')
          .select('id')
          .eq('name', courseName)
          .maybeSingle()
          .then(r => r.data),
  ])

  // 4. Create course row only if it doesn't exist yet
  let courseDbId: string

  if (existingCourse) {
    courseDbId = existingCourse.id
  } else {
    const { data: newCourse, error: courseErr } = await admin
      .from('courses')
      .insert({
        name: courseName,
        club: courseClub,
        location: courseLocation,
        holes_count: courseHolesCount,
        slope_rating: courseSlopeRating,
        course_rating: courseCourseRating,
        par: coursePar,
        source: isUploadedCourse ? 'ocr' : 'manual',
        verified: !isUploadedCourse,
      })
      .select('id')
      .single()

    if (courseErr || !newCourse) {
      throw new Error(`Failed to create course record: ${courseErr?.message ?? 'unknown error'}`)
    }
    courseDbId = newCourse.id
  }

  // 5. Auto-generate event name: "{combo} · {format} · {date}"
  const shortCombo = courseName.split('—').pop()?.trim() ?? courseName
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
  const eventDate = data.eventDate ?? todayIso
  const groupSize = data.groupSize ?? 4
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .insert({
      created_by: user.id,
      course_id: courseDbId,
      combination_id: data.dbCombinationId ?? null,
      name: eventName,
      date: eventDate,
      format: data.format,
      round_type: data.roundType,
      handicap_allowance_pct: data.allowancePct / 100,
      ntp_holes: data.ntpHoles,
      ld_holes: data.ldHoles,
      is_public: data.inviteLink ?? false,
      finalised: false,
      share_code: shareCode,
      group_size: groupSize,
      entry_fee_pence: data.entryFeePence ?? null,
    })
    .select('id')
    .single()

  if (eventErr || !event) {
    throw new Error(`Failed to create round: ${eventErr?.message ?? 'unknown error'}`)
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

  // 9. Create groups — use wizard assignments if provided, otherwise auto-generate
  if (data.groupAssignments && data.groupAssignments.length > 0) {
    await admin.from('event_groups').insert(
      data.groupAssignments.map((_, i) => ({
        event_id: event.id,
        flight_number: i + 1,
        label: `Group ${i + 1}`,
        start_hole: 1,
      }))
    )
    for (const [groupIdx, playerIndices] of data.groupAssignments.entries()) {
      for (const playerIdx of playerIndices) {
        const epId = eps[playerIdx]?.id
        if (epId) {
          await admin
            .from('event_players')
            .update({ flight_number: groupIdx + 1 })
            .eq('id', epId)
        }
      }
    }
  } else if (eps.length > groupSize) {
    const numGroups = Math.ceil(eps.length / groupSize)
    await admin.from('event_groups').insert(
      Array.from({ length: numGroups }, (_, i) => ({
        event_id: event.id,
        flight_number: i + 1,
        label: `Group ${i + 1}`,
        start_hole: 1,
      }))
    )
    for (const [i, ep] of eps.entries()) {
      await admin
        .from('event_players')
        .update({ flight_number: Math.floor(i / groupSize) + 1 })
        .eq('id', ep.id)
    }
  }

  // 10. Route: invite-link mode → manage page; otherwise → scoring
  if (data.inviteLink) {
    return `/events/${event.id}/manage`
  }

  const userIdx = data.players.findIndex(p => p.isUser)
  const userScorecardId = scs[userIdx]?.id

  if (!userScorecardId) {
    throw new Error('Could not determine user scorecard ID')
  }

  return `/rounds/${userScorecardId}/score`
}

export async function getRecentlyPlayedWith(): Promise<{ id: string | null; displayName: string; handicapIndex: number | null }[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Find events the user has played in
  const { data: myEvents } = await supabase
    .from('event_players')
    .select('event_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (!myEvents || myEvents.length === 0) return []

  const eventIds = myEvents.map(e => e.event_id)

  // Find other players from those events
  const { data: partners } = await supabase
    .from('event_players')
    .select('user_id, display_name, handicap_index')
    .in('event_id', eventIds)
    .neq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!partners) return []

  // Deduplicate by user_id (prefer registered) then by display_name (for guests)
  const seen = new Set<string>()
  const results: { id: string | null; displayName: string; handicapIndex: number | null }[] = []
  for (const p of partners) {
    const key = p.user_id ?? `guest:${p.display_name}`
    if (seen.has(key)) continue
    seen.add(key)
    results.push({ id: p.user_id, displayName: p.display_name, handicapIndex: p.handicap_index })
  }
  return results.slice(0, 20)
}

export async function getRecentlyPlayedClubs(): Promise<{ club: string; location: string; country: string; lastPlayed: string }[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Find events the user has played in, with course info
  const { data: myEvents } = await supabase
    .from('event_players')
    .select('event_id, events(date, courses(name, club, location))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!myEvents || myEvents.length === 0) return []

  // Extract unique clubs from events
  const seen = new Set<string>()
  const results: { club: string; location: string; country: string; lastPlayed: string }[] = []
  for (const ep of myEvents) {
    // Supabase returns single-row joins as objects, but TS types them as arrays
    const event = ep.events as unknown as { date: string; courses: { name: string; club: string | null; location: string | null } | null } | null
    if (!event?.courses?.club) continue
    const club = event.courses.club
    if (seen.has(club)) continue
    seen.add(club)
    // Extract country from location (last part after comma)
    const locationParts = (event.courses.location ?? '').split(',').map(s => s.trim())
    const country = locationParts.length > 1 ? locationParts[locationParts.length - 1]! : ''
    results.push({
      club,
      location: event.courses.location ?? '',
      country,
      lastPlayed: event.date,
    })
  }
  return results.slice(0, 10)
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
