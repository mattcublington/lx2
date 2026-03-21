'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCourse } from '@/lib/courses'

export interface EventFormData {
  name: string
  date: string
  courseId: string
  tee: string
  format: 'stableford' | 'strokeplay' | 'matchplay'
  handicapAllowancePct: number
  groupSize: number
  maxPlayers: number | null
  entryFeePence: number | null
  ntpHoles: number[]
  ldHoles: number[]
  isPublic: boolean
}

export async function createEvent(data: EventFormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Ensure user record exists in public.users
  await supabase.from('users').upsert({
    id: user.id,
    email: user.email!,
    display_name: user.email!.split('@')[0],
  }, { onConflict: 'id', ignoreDuplicates: true })

  // Get course data to store slope/rating on event
  const course = getCourse(data.courseId)
  if (!course) throw new Error('Course not found')

  // Find or create course record in DB
  const { data: courseRecord } = await supabase
    .from('courses')
    .select('id')
    .eq('name', course.name)
    .single()

  let courseDbId: string

  if (courseRecord) {
    courseDbId = courseRecord.id
  } else {
    const { data: newCourse, error } = await supabase
      .from('courses')
      .insert({
        name: course.name,
        club: course.club,
        location: course.location,
        holes_count: 18,
        slope_rating: course.slopeRating,
        course_rating: course.courseRating,
        par: course.par,
        source: 'manual',
        verified: true,
      })
      .select('id')
      .single()

    if (error || !newCourse) throw new Error('Failed to create course')
    courseDbId = newCourse.id
  }

  // Create the event
  const { data: event, error } = await supabase
    .from('events')
    .insert({
      created_by: user.id,
      course_id: courseDbId,
      name: data.name,
      date: data.date,
      format: data.format,
      handicap_allowance_pct: data.handicapAllowancePct,
      entry_fee_pence: data.entryFeePence,
      max_players: data.maxPlayers,
      group_size: data.groupSize,
      ntp_holes: data.ntpHoles,
      ld_holes: data.ldHoles,
      is_public: data.isPublic,
      finalised: false,
    })
    .select('id')
    .single()

  if (error || !event) throw new Error('Failed to create event')

  redirect(`/events/${event.id}`)
}
