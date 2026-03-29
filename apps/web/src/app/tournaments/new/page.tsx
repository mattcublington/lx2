import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NewTournamentWizard from './NewTournamentWizard'

export type WizardCombo = {
  id: string
  name: string
  courseName: string
  holes: number
}

export default async function NewTournamentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/tournaments/new')

  const { data: profile } = await supabase
    .from('users')
    .select('display_name, handicap_index')
    .eq('id', user.id)
    .single()

  const { data: rawCombos } = await supabase
    .from('course_combinations')
    .select('id, name, hole_count, courses ( name )')
    .order('name')

  type RawCombo = {
    id: string
    name: string
    hole_count: number
    courses: unknown
  }

  const combos = (rawCombos ?? []) as unknown as RawCombo[]

  const wizardCombos: WizardCombo[] = combos.map(c => ({
    id: c.id,
    name: c.name,
    courseName: (c.courses as { name: string } | null)?.name ?? c.name,
    holes: c.hole_count ?? 18,
  }))

  return (
    <NewTournamentWizard
      displayName={profile?.display_name ?? user.email?.split('@')[0] ?? 'Organiser'}
      handicapIndex={typeof profile?.handicap_index === 'number' ? profile.handicap_index : null}
      combinations={wizardCombos}
    />
  )
}
