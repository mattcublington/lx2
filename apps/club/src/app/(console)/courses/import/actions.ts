'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Inline types from packages/course-data/schema.ts (avoids cross-package imports at build time)
interface LoopHole { par: number; si: number; yards: number; metres?: number }
interface ClubLoop { holes: LoopHole[] }
interface TeeRatings { slopeRating: number; courseRating: number }
interface ClubCombination {
  id: string; name: string; front: string; back: string; par: number
  tees: string[]; defaultRatingTee: string; slopeRating: number; courseRating: number
  teeRatings?: Record<string, TeeRatings>; frontSI?: number[]; backSI?: number[]
}
interface CourseHoleSource { par: number; si: number; yards: number; metres?: number }
interface CourseSource {
  id: string; name: string; par: number; tees: string[]; defaultRatingTee: string
  slopeRating: number; courseRating: number
  teeRatings?: Record<string, TeeRatings>; holes: CourseHoleSource[]
}
interface ClubData {
  club: string; location: string; country: string; continent: string
  loops?: Record<string, ClubLoop>; combinations?: ClubCombination[]
  courses?: CourseSource[]
}

// ---------------------------------------------------------------------------
// Helpers — mirror the generate-courses.ts logic to derive flat hole arrays
// ---------------------------------------------------------------------------

function buildHoles(
  combo: ClubCombination,
  loops: Record<string, ClubLoop>,
): Array<{ hole_number: number; par: number; stroke_index: number; yards: number; metres: number | null }> {
  const front = loops[combo.front]
  const back  = loops[combo.back]
  if (!front || !back) throw new Error(`Loop not found for combination "${combo.id}"`)

  const rows: Array<{ hole_number: number; par: number; stroke_index: number; yards: number; metres: number | null }> = []

  front.holes.forEach((h, i) => {
    rows.push({
      hole_number: i + 1,
      par: h.par,
      stroke_index: combo.frontSI ? (combo.frontSI[i] ?? h.si) : h.si,
      yards: h.yards,
      metres: h.metres ?? null,
    })
  })

  back.holes.forEach((h, i) => {
    rows.push({
      hole_number: i + 10,
      par: h.par,
      stroke_index: combo.backSI ? (combo.backSI[i] ?? h.si) : h.si,
      yards: h.yards,
      metres: h.metres ?? null,
    })
  })

  return rows
}

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

export interface ImportResult {
  success: boolean
  message: string
  coursesImported?: string[]
}

export async function importCourseJson(jsonText: string): Promise<ImportResult> {
  const supabase = await createClient()

  let data: ClubData
  try {
    data = JSON.parse(jsonText, (key, value) => key === '_comment' ? undefined : value) as ClubData
  } catch {
    return { success: false, message: 'Invalid JSON — could not parse file.' }
  }

  if (!data.club || !data.country || !data.continent) {
    return { success: false, message: 'JSON must include club, country, and continent fields.' }
  }

  const imported: string[] = []

  try {
    const processOneCourse = async (
      courseId: string,
      courseName: string,
      par: number,
      slopeRating: number,
      courseRating: number,
      tees: string[],
      defaultRatingTee: string,
      teeRatings: Record<string, { slopeRating: number; courseRating: number }> | undefined,
      holes: Array<{ hole_number: number; par: number; stroke_index: number; yards: number; metres: number | null }>,
    ) => {
      // Upsert the course row (match on name)
      const { error: cErr } = await supabase
        .from('courses')
        .upsert({
          name:          courseName,
          club:          data.club,
          location:      data.location,
          holes_count:   18,
          slope_rating:  slopeRating,
          course_rating: courseRating,
          par,
          source:        'import',
          verified:      false,
        }, { onConflict: 'name' })
      if (cErr) throw new Error(`Course upsert failed: ${cErr.message}`)

      const { data: courseRow } = await supabase
        .from('courses')
        .select('id')
        .eq('name', courseName)
        .single()
      if (!courseRow) throw new Error(`Could not retrieve course ID for "${courseName}"`)
      const dbId = courseRow.id as string

      // Upsert holes
      const holeRows = holes.map(h => ({
        course_id:    dbId,
        hole_number:  h.hole_number,
        par:          h.par,
        stroke_index: h.stroke_index,
      }))
      const { error: hErr } = await supabase
        .from('course_holes')
        .upsert(holeRows, { onConflict: 'course_id,hole_number' })
      if (hErr) throw new Error(`Holes upsert failed: ${hErr.message}`)

      // Upsert tees — build yardage + metres arrays from holes
      const allTeeNames = Array.from(new Set(tees))
      const defaultTee = defaultRatingTee || allTeeNames[0] || ''
      const defRatings = teeRatings?.[defaultTee] ?? { slopeRating, courseRating }

      // We only have yardage data for the defaultRatingTee (from hole.yards).
      // Other tees in the list don't have per-hole yardages — insert ratings only.
      const yardages = holes.map(h => h.yards)
      const metres   = holes.every(h => h.metres !== null) ? holes.map(h => h.metres!) : null
      const totalYards = yardages.reduce((s, y) => s + y, 0)

      for (const tee of allTeeNames) {
        const ratings = teeRatings?.[tee] ?? (tee === defaultTee ? defRatings : null)
        if (!ratings) continue  // skip tees with no rating data

        const isDefault = tee === defaultTee
        const { error: tErr } = await supabase
          .from('course_tees')
          .upsert({
            course_id:    dbId,
            tee_name:     tee,
            yardages:     isDefault ? yardages : null,
            metres:       isDefault ? metres    : null,
            total_yards:  isDefault ? totalYards : null,
            slope_rating:  ratings.slopeRating,
            course_rating: ratings.courseRating,
          }, { onConflict: 'course_id,tee_name' })
        if (tErr) throw new Error(`Tee upsert failed for "${tee}": ${tErr.message}`)
      }

      imported.push(courseName)
    }

    if (data.loops && data.combinations) {
      // Loop-based facility
      for (const combo of data.combinations) {
        const holes = buildHoles(combo, data.loops)
        const par   = holes.reduce((s, h) => s + h.par, 0)
        await processOneCourse(
          combo.id,
          combo.name,
          par,
          combo.slopeRating,
          combo.courseRating,
          combo.tees,
          combo.defaultRatingTee,
          combo.teeRatings,
          holes,
        )
      }
    } else if (data.courses) {
      // Standard flat courses
      for (const course of data.courses) {
        const holes = course.holes.map((h, i) => ({
          hole_number:  i + 1,
          par:          h.par,
          stroke_index: h.si,
          yards:        h.yards,
          metres:       h.metres ?? null,
        }))
        await processOneCourse(
          course.id,
          course.name,
          course.par,
          course.slopeRating,
          course.courseRating,
          course.tees,
          course.defaultRatingTee,
          course.teeRatings,
          holes,
        )
      }
    } else {
      return { success: false, message: 'JSON must include either loops+combinations or courses.' }
    }
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Unknown error during import.' }
  }

  revalidatePath('/courses')
  return {
    success: true,
    message: `Imported ${imported.length} course${imported.length !== 1 ? 's' : ''}.`,
    coursesImported: imported,
  }
}
