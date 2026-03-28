import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ScoreEntryLive from './ScoreEntryLive'
import { COURSES } from '@/lib/courses'

export interface ScoringHole {
  holeInRound: number
  loopHoleId: string
  par: number
  siM: number | null
  siW: number | null
  yards: Record<string, number>  // { Yellow: 342, White: 399 }
}

export interface GroupPlayer {
  scorecardId: string
  displayName: string
  handicapIndex: number
  isCurrentUser: boolean
  initialScores: Record<number, number | null>  // hole_number → gross_strokes (null = pickup)
}

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ hole?: string }>
}



// ─── Error card ───────────────────────────────────────────────────────────────

function ErrorCard({ title, body, retry }: { title: string; body: string; retry?: string }) {
  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '40px 20px', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#1a2e1a', background: '#FAFBF8', minHeight: '100vh' }}>
      <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: -0.3, marginBottom: 4 }}>
        LX<span style={{ color: '#0D631B' }}>2</span>
      </div>
      <div style={{ marginTop: 32, fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 14, color: '#6B8C6B', lineHeight: 1.5 }}>{body}</div>
      {retry && (
        <a href={retry} style={{ display: 'inline-block', marginTop: 20, color: '#0D631B', fontWeight: 600, fontSize: 14 }}>
          Try again
        </a>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ScorePage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { hole: holeParam } = await searchParams
  const initialHole = holeParam ? Math.max(0, parseInt(holeParam, 10) - 1) : 0
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // ── 1. Fetch scorecard with joined event + event_player ────────────────────
  //
  // PostgREST returns related rows as nested objects when you select via
  // foreign key relationship names. We cast explicitly after the fetch.
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
        share_code
      )
    `)
    .eq('id', id)
    .single()

  if (!scorecard) {
    return <ErrorCard title="Round not found" body="This scorecard doesn't exist or you don't have access to it." />
  }

  // Cast the nested PostgREST objects (they come as arrays for 1:many or
  // plain objects for many:1 / !inner joins)
  const ep = scorecard.event_players as unknown as {
    id: string
    user_id: string | null
    display_name: string
    handicap_index: number
  }
  const event = scorecard.events as unknown as {
    format: 'stableford' | 'strokeplay' | 'matchplay'
    ntp_holes: number[] | null
    ld_holes: number[] | null
    // stored as numeric(3,2): e.g. 0.95 = 95%  or  1.00 = 100%
    handicap_allowance_pct: number
    combination_id: string | null
    course_id: string | null
    round_type: string
    loop_id: string | null
    name: string
    date: string
    created_by: string
    share_code: string | null
  }

  // ── 2. Ownership check ─────────────────────────────────────────────────────
  // Allow access if: this is your scorecard OR you organised the event
  // (organiser can score on behalf of guest players in their group)
  if (ep.user_id !== user.id && event.created_by !== user.id) {
    return <ErrorCard title="Round not found" body="This scorecard doesn't exist or you don't have access to it." />
  }

  // ── 3. Resolve hole data ───────────────────────────────────────────────────
  //
  // combination_id → 18-hole round (two loops)
  // loop_id        → 9-hole round (single loop, scorecard or event level)

  const combinationId = event.combination_id
  const loopId = scorecard.loop_id ?? event.loop_id

  const holes: ScoringHole[] = []
  let courseDataUnavailable = false

  if (combinationId) {
    // ── 18-hole via combination ──────────────────────────────────────────────
    const { data: combo } = await supabase
      .from('course_combinations')
      .select('loop_1_id, loop_2_id')
      .eq('id', combinationId)
      .single()

    if (!combo) {
      courseDataUnavailable = true
    } else {
      const loopIds = [combo.loop_1_id, combo.loop_2_id] as string[]

      // Fetch all loop_holes for both loops in one query
      const { data: loopHoles } = await supabase
        .from('loop_holes')
        .select('id, loop_id, hole_number, par, si_m, si_w')
        .in('loop_id', loopIds)
        .order('hole_number')

      if (!loopHoles || loopHoles.length === 0) {
        courseDataUnavailable = true
      } else {
        // Fetch tee yardages by loop_hole_id (loop_hole_tees has NO loop_id column)
        const loopHoleIds = loopHoles.map(h => h.id)
        const { data: teesData } = await supabase
          .from('loop_hole_tees')
          .select('loop_hole_id, tee_colour, yards')
          .in('loop_hole_id', loopHoleIds)

        // Build yards lookup: loopHoleId → { tee_colour: yards }
        const yardsMap: Record<string, Record<string, number>> = {}
        for (const t of teesData ?? []) {
          if (!yardsMap[t.loop_hole_id]) yardsMap[t.loop_hole_id] = {}
          yardsMap[t.loop_hole_id]![t.tee_colour] = t.yards
        }

        // loop_1 → holeInRound 1–9, loop_2 → holeInRound 10–18
        const loop1 = loopHoles
          .filter(h => h.loop_id === combo.loop_1_id)
          .sort((a, b) => a.hole_number - b.hole_number)
        const loop2 = loopHoles
          .filter(h => h.loop_id === combo.loop_2_id)
          .sort((a, b) => a.hole_number - b.hole_number)

        let holeInRound = 1
        for (const h of [...loop1, ...loop2]) {
          holes.push({
            holeInRound: holeInRound++,
            loopHoleId: h.id,
            par: h.par,
            siM: h.si_m ?? null,
            siW: h.si_w ?? null,
            yards: yardsMap[h.id] ?? {},
          })
        }
      }
    }
  } else if (loopId) {
    // ── 9-hole via loop_id ───────────────────────────────────────────────────
    const { data: loopHoles } = await supabase
      .from('loop_holes')
      .select('id, loop_id, hole_number, par, si_m, si_w')
      .eq('loop_id', loopId)
      .order('hole_number')

    if (!loopHoles || loopHoles.length === 0) {
      courseDataUnavailable = true
    } else {
      const loopHoleIds = loopHoles.map(h => h.id)
      const { data: teesData } = await supabase
        .from('loop_hole_tees')
        .select('loop_hole_id, tee_colour, yards')
        .in('loop_hole_id', loopHoleIds)

      const yardsMap: Record<string, Record<string, number>> = {}
      for (const t of teesData ?? []) {
        if (!yardsMap[t.loop_hole_id]) yardsMap[t.loop_hole_id] = {}
        yardsMap[t.loop_hole_id]![t.tee_colour] = t.yards
      }

      let holeInRound = 1
      for (const h of loopHoles) {
        holes.push({
          holeInRound: holeInRound++,
          loopHoleId: h.id,
          par: h.par,
          siM: h.si_m ?? null,
          siW: h.si_w ?? null,
          yards: yardsMap[h.id] ?? {},
        })
      }
    }
  } else if (event.course_id) {
    // ── Fallback: resolve holes from courses.ts static data ─────────────────
    // Used for courses (e.g. Royal Canberra) that have no combination_id or loop_id.
    const { data: courseRow } = await supabase
      .from('courses')
      .select('name, source')
      .eq('id', event.course_id)
      .single()

    const course = courseRow ? COURSES.find(c => c.name === courseRow.name) : undefined
    if (course) {
      for (const hole of course.holes) {
        holes.push({
          holeInRound: hole.num,
          loopHoleId: `${course.id}-h${hole.num}`,
          par: hole.par,
          siM: hole.si || null,
          siW: null,
          yards: hole.teeYards ?? { [course.defaultRatingTee]: hole.yards },
        })
      }
    } else if (courseRow?.source === 'ocr') {
      // ── OCR-uploaded course: load hole data from scorecard_uploads ────────
      // The extracted_data JSONB contains hole-by-hole data from the OCR scan.
      // Match by the extracted courseName stored inside the JSONB.
      const { data: uploads } = await supabase
        .from('scorecard_uploads')
        .select('extracted_data')
        .not('extracted_data', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20)

      // Find the upload whose extracted courseName matches this course
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSONB from Supabase
      const upload = uploads?.find((u: any) => {
        const ed = u.extracted_data
        return ed?.courseName === courseRow.name ||
          `${ed?.courseName} — ${ed?.tees?.[0]?.teeName}` === courseRow.name
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSONB from Supabase, shape validated below
      const extracted = upload?.extracted_data as any
      if (extracted?.tees?.[0]?.holes?.length > 0) {
        const tee = extracted.tees[0]
        for (const h of tee.holes) {
          const yardsForHole: Record<string, number> = {}
          for (const t of extracted.tees) {
            const match = t.holes?.find((th: { hole: number }) => th.hole === h.hole)
            if (match?.yards) yardsForHole[t.teeName] = match.yards
          }
          holes.push({
            holeInRound: h.hole,
            loopHoleId: `ocr-${event.course_id}-h${h.hole}`,
            par: h.par,
            siM: h.si ?? null,
            siW: null,
            yards: yardsForHole,
          })
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

  if (courseDataUnavailable) {
    return (
      <ErrorCard
        title="Course data unavailable"
        body="Hole data couldn't be loaded for this round. Please try refreshing the page."
        retry={`/rounds/${id}/score`}
      />
    )
  }

  // ── 4. Existing hole scores (restore state after refresh) ──────────────────
  //
  // hole_scores has no 'pickup' column — null gross_strokes means pickup/NR.
  const { data: existingScores } = await supabase
    .from('hole_scores')
    .select('hole_number, gross_strokes')
    .eq('scorecard_id', id)

  const initialScores: Record<number, number | null> = {}
  const initialPickups: Record<number, boolean> = {}
  for (const row of existingScores ?? []) {
    initialScores[row.hole_number] = row.gross_strokes ?? null
    // A row with null gross_strokes is an explicit pick-up/NR entry
    initialPickups[row.hole_number] = row.gross_strokes === null
  }

  // ── 5. All players in this event (for live leaderboard) ────────────────────
  const { data: allEventPlayers } = await supabase
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
    .eq('event_id', scorecard.event_id)

  // Normalise into a flat shape ScoreEntryLive can consume.
  // isCurrentUser is based on the event_player's user_id matching the
  // authenticated user — NOT on which scorecard URL we're currently on.
  // This stays correct when the organiser navigates to another player's URL.
  const groupPlayers: GroupPlayer[] = (allEventPlayers ?? []).map(p => {
    const scorecards = p.scorecards as unknown as { id: string; hole_scores: { hole_number: number; gross_strokes: number | null }[] }[] | null
    const sc = (scorecards ?? [])[0]
    const scores: Record<number, number | null> = {}
    for (const hs of sc?.hole_scores ?? []) {
      scores[hs.hole_number] = hs.gross_strokes ?? null
    }
    return {
      scorecardId: sc?.id ?? '',
      displayName: p.display_name ?? '',
      handicapIndex: Number(p.handicap_index),
      isCurrentUser: (p as unknown as { user_id: string | null }).user_id === user.id,
      initialScores: scores,
    }
  })

  // ── 5. Determine the player's tee ──────────────────────────────────────────
  const firstHoleYards = holes[0]?.yards ?? {}
  const teePriority = ['Green', 'White', 'Yellow/Purple', 'Red/Black']
  const selectedTee =
    teePriority.find(t => firstHoleYards[t] !== undefined)
    ?? Object.keys(firstHoleYards)[0]
    ?? 'Yellow'

  const roundType = (scorecard.round_type ?? event.round_type ?? '18') as '18' | '9'

  // ── 6. Render ──────────────────────────────────────────────────────────────
  return (
    <ScoreEntryLive
      scorecardId={id}
      eventId={scorecard.event_id}
      eventPlayerId={ep.id}
      playerName={ep.display_name}
      handicapIndex={Number(ep.handicap_index)}
      format={event.format}
      // handicap_allowance_pct is stored as 0.95 (not 95) — pass as-is,
      // the client multiplies handicap_index × allowancePct directly
      allowancePct={Number(event.handicap_allowance_pct)}
      roundType={roundType}
      holes={holes}
      initialScores={initialScores}
      initialPickups={initialPickups}
      ntpHoles={event.ntp_holes ?? []}
      ldHoles={event.ld_holes ?? []}
      selectedTee={selectedTee}
      eventName={event.name}
      eventDate={event.date}
      groupPlayers={groupPlayers}
      initialHole={initialHole}
      {...(event.share_code ? { shareCode: event.share_code } : {})}
    />
  )
}
