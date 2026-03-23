import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PlayDashboard from './PlayDashboard'

export default async function PlayPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch user profile (including handicap index)
  const { data: profile } = await supabase
    .from('users')
    .select('display_name, email, handicap_index')
    .eq('id', user.id)
    .single()

  // Fetch recent rounds for current user
  const { data: recentRounds } = await supabase
    .from('scorecards')
    .select(`
      id,
      created_at,
      round_type,
      events!inner (
        name,
        date,
        format,
        courses (
          name
        ),
        course_combinations (
          name
        )
      ),
      event_players!inner (
        user_id
      )
    `)
    .eq('event_players.user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Total rounds played by this user
  const { count: roundsCount } = await supabase
    .from('scorecards')
    .select('id, event_players!inner(user_id)', { count: 'exact', head: true })
    .eq('event_players.user_id', user.id)

  type RoundRow = {
    id: string
    created_at: string
    round_type: string | null
    events: {
      name: string
      date: string
      format: string
      courses: { name: string } | null
      course_combinations: { name: string } | null
    } | null
  }

  const rounds: RoundRow[] = (recentRounds ?? []) as unknown as RoundRow[]

  const displayName =
    profile?.display_name ??
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split('@')[0] ??
    'Golfer'

  return (
    <PlayDashboard
      userId={user.id}
      displayName={displayName}
      rounds={rounds}
      handicapIndex={profile?.handicap_index ?? null}
      roundsCount={roundsCount ?? 0}
    />
  )
}
