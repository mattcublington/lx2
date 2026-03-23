import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Resolves the current user's scorecard for this event and redirects to
 * /rounds/[scorecardId]/score. If the user hasn't joined yet, redirects
 * back to the event landing page.
 */
export default async function EventScorePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?redirect=/events/${id}/score`)

  // Find this user's event_player + scorecard in the event.
  // event_players_select RLS: once joined, user can see their own row.
  const { data: player } = await supabase
    .from('event_players')
    .select('id, scorecards(id)')
    .eq('event_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!player) {
    // Not joined — send them to the landing page to join first
    redirect(`/events/${id}`)
  }

  const scorecards = player.scorecards as unknown as { id: string }[] | null
  const scorecardId = (scorecards ?? [])[0]?.id

  if (!scorecardId) {
    // Joined but scorecard missing — edge case, send them back to join
    redirect(`/events/${id}`)
  }

  redirect(`/rounds/${scorecardId}/score`)
}
