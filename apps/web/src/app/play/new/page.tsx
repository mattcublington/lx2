import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NewRoundWizard from './NewRoundWizard'
import type { Course, CourseHole } from '@/lib/courses'

export default async function NewRoundPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Guard: redirect to play if user has an active (incomplete) round in the last 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const { data: activeRound } = await supabase
    .from('scorecards')
    .select('id, event_players!inner(user_id)')
    .eq('event_players.user_id', user.id)
    .is('submitted_at', null)
    .gte('created_at', sevenDaysAgo.toISOString())
    .limit(1)
    .maybeSingle()
  if (activeRound) redirect('/play')

  // Fetch user profile
  const { data: profile } = await supabase
    .from('users')
    .select('display_name, handicap_index')
    .eq('id', user.id)
    .single()

  // Try to fetch course combinations from DB (may be empty if seed not run)
  const { data: dbCombos } = await supabase
    .from('course_combinations')
    .select('id, name, par, holes, course_id, courses(name, club)')
    .order('name')

  const { data: comboTees } = await supabase
    .from('combination_tees')
    .select('combination_id, tee_colour, gender, slope_rating, course_rating')

  type DbCombo = {
    id: string
    name: string
    par: number
    holes: number
    course_id: string
  }

  type CombinationTee = {
    combination_id: string
    tee_colour: string
    gender: string
    slope_rating: number
    course_rating: number
  }

  const combinations: DbCombo[] = (dbCombos ?? []) as unknown as DbCombo[]

  // ── Fetch OCR-approved courses from the DB and convert to Course objects ──
  // These supplement the static courses.ts bundle at runtime.
  const { data: ocrCourses } = await supabase
    .from('courses')
    .select('id, name, club, location, country, continent, holes_count, slope_rating, course_rating, par, course_holes(hole_number, par, stroke_index), course_tees(tee_name, yardages, slope_rating, course_rating)')
    .eq('source', 'ocr')
    .eq('verified', true)

  const extraCourses: Course[] = (ocrCourses ?? []).map(row => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase nested select returns unknown shape
    const holes: CourseHole[] = ((row.course_holes as any[]) ?? [])
      .sort((a, b) => a.hole_number - b.hole_number)
      .map(h => ({
        num: h.hole_number as number,
        par: h.par as number,
        si: h.stroke_index as number,
        yards: 0, // yardages live on course_tees, not course_holes
      }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase nested select returns unknown shape
    const teeRows = (row.course_tees as any[]) ?? []
    const tees = teeRows.map((t: { tee_name: string }) => t.tee_name)

    // Fill in per-hole yards from the first available tee (preferring White)
    const whiteTee = teeRows.find((t: { tee_name: string }) => t.tee_name === 'White') ?? teeRows[0]
    if (whiteTee) {
      const yardages: number[] = whiteTee.yardages ?? []
      holes.forEach((h, i) => { h.yards = yardages[i] ?? 0 })
    }

    // Build per-tee yardage map for each hole
    holes.forEach((h, i) => {
      h.teeYards = {}
      for (const teeRow of teeRows) {
        const y = (teeRow.yardages as number[])?.[i]
        if (y != null) h.teeYards![teeRow.tee_name as string] = y
      }
    })

    // Pick the first tee with ratings as the primary tee for course-level CR/slope
    const ratedTee = teeRows.find((t: { slope_rating: number | null }) => t.slope_rating != null) ?? teeRows[0]

    return {
      id: row.id as string,
      name: row.name as string,
      club: (row.club as string | null) ?? (row.name as string),
      location: (row.location as string | null) ?? '',
      country: (row.country as string | null) ?? '',
      continent: (row.continent as string | null) ?? '',
      holes,
      slopeRating: (ratedTee?.slope_rating as number | null) ?? 0,
      courseRating: (ratedTee?.course_rating as number | null) ?? 0,
      par: (row.par as number | null) ?? holes.reduce((s, h) => s + h.par, 0),
      tees,
      defaultRatingTee: ratedTee?.tee_name ?? '',
    } satisfies Course
  })

  return (
    <NewRoundWizard
      userId={user.id}
      displayName={profile?.display_name ?? user.email?.split('@')[0] ?? 'Golfer'}
      handicapIndex={profile?.handicap_index ?? null}
      dbCombinations={combinations}
      combinationTees={(comboTees ?? []) as CombinationTee[]}
      extraCourses={extraCourses}
    />
  )
}
