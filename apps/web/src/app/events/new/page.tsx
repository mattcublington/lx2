import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NewEventWizard from './NewEventWizard'

export type CombinationTee = {
  combination_id: string
  tee_colour: string
  gender: string
  slope_rating: number | null
  course_rating: number | null
}

export type WizardCombo = {
  id: string
  name: string
  par: number
  courseName: string
}

export type ComboHole = { hole: number; par: number }

export default async function NewEventPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/events/new')

  const { data: profile } = await supabase
    .from('users')
    .select('display_name, handicap_index')
    .eq('id', user.id)
    .single()

  // Combinations that have a linked courses row (needed for events.course_id NOT NULL)
  const { data: rawCombos } = await supabase
    .from('course_combinations')
    .select('id, name, par, holes, course_id, loop_1_id, loop_2_id, courses(name, club)')
    .not('course_id', 'is', null)
    .order('name')

  type RawCombo = {
    id: string; name: string; par: number; holes: number
    course_id: string; loop_1_id: string; loop_2_id: string
    courses: unknown
  }
  const combos = (rawCombos ?? []) as unknown as RawCombo[]

  // Tee options for each combination
  const comboIds = combos.map(c => c.id)
  const { data: rawTees } = comboIds.length > 0
    ? await supabase
        .from('combination_tees')
        .select('combination_id, tee_colour, gender, slope_rating, course_rating')
        .in('combination_id', comboIds)
    : { data: [] }

  // Hole par data for NTP/LD chip display
  const loopIds = [...new Set([
    ...combos.map(c => c.loop_1_id),
    ...combos.map(c => c.loop_2_id),
  ].filter(Boolean))]

  const { data: loopHoleRows } = loopIds.length > 0
    ? await supabase
        .from('loop_holes')
        .select('loop_id, hole_number, par')
        .in('loop_id', loopIds)
        .order('hole_number')
    : { data: [] }

  // Build loop_id → sorted holes map
  const loopHolesMap: Record<string, { hole_number: number; par: number }[]> = {}
  for (const h of (loopHoleRows ?? [])) {
    if (!loopHolesMap[h.loop_id]) loopHolesMap[h.loop_id] = []
    loopHolesMap[h.loop_id]!.push({ hole_number: h.hole_number, par: h.par })
  }

  // Build combination_id → 18-hole array (loop1 holes 1–9, loop2 holes 10–18)
  const combinationHoles: Record<string, ComboHole[]> = {}
  for (const c of combos) {
    const l1 = (loopHolesMap[c.loop_1_id] ?? []).sort((a, b) => a.hole_number - b.hole_number)
    const l2 = (loopHolesMap[c.loop_2_id] ?? []).sort((a, b) => a.hole_number - b.hole_number)
    const holes: ComboHole[] = []
    let hir = 1
    for (const h of l1) holes.push({ hole: hir++, par: h.par })
    for (const h of l2) holes.push({ hole: hir++, par: h.par })
    combinationHoles[c.id] = holes
  }

  const wizardCombos: WizardCombo[] = combos.map(c => ({
    id: c.id,
    name: c.name,
    par: c.par,
    courseName: (c.courses as { name: string; club: string } | null)?.name ?? c.name,
  }))

  return (
    <NewEventWizard
      displayName={profile?.display_name ?? user.email?.split('@')[0] ?? 'Organiser'}
      handicapIndex={typeof profile?.handicap_index === 'number' ? profile.handicap_index : null}
      combinations={wizardCombos}
      combinationTees={(rawTees ?? []) as CombinationTee[]}
      combinationHoles={combinationHoles}
    />
  )
}
