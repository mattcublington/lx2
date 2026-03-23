import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PlayDashboard from './PlayDashboard'

export default async function PlayPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch user profile
  const { data: profile } = await supabase
    .from('users')
    .select('display_name, email')
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

  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'Golfer'

  return (
    <PlayDashboard
      userId={user.id}
      displayName={displayName}
      rounds={rounds}
    />
  )
}
