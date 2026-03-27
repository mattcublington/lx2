import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NewRoundWizard from './NewRoundWizard'

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

  return (
    <NewRoundWizard
      userId={user.id}
      displayName={profile?.display_name ?? user.email?.split('@')[0] ?? 'Golfer'}
      handicapIndex={profile?.handicap_index ?? null}
      dbCombinations={combinations}
      combinationTees={(comboTees ?? []) as CombinationTee[]}
    />
  )
}
