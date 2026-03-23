import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NewRoundWizard from './NewRoundWizard'

export default async function NewRoundPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

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

  type DbCombo = {
    id: string
    name: string
    par: number
    holes: number
    course_id: string
  }

  const combinations: DbCombo[] = (dbCombos ?? []) as unknown as DbCombo[]

  return (
    <NewRoundWizard
      userId={user.id}
      displayName={profile?.display_name ?? user.email?.split('@')[0] ?? 'Golfer'}
      handicapIndex={profile?.handicap_index ?? null}
      dbCombinations={combinations}
    />
  )
}
