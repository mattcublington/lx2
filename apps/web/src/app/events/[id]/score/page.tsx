import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Resolves the current user's (or anonymous player's) scorecard for this event
 * and redirects to /rounds/[scorecardId]/score.
 *
 * Authenticated path:  match event_player by user_id
 * Anonymous path:      match event_player by join_token cookie (set by joinEventAnon)
 *
 * If neither is found the visitor is redirected to the event landing page to join.
 */
export default async function EventScorePage({ params }: PageProps) {
  const { id } = await params
  const admin = createAdminClient()

  // ── Try authenticated path ────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: player } = await admin
      .from('event_players')
      .select('id, scorecards(id)')
      .eq('event_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!player) redirect(`/events/${id}`)

    const scorecards  = player.scorecards as unknown as { id: string }[] | null
    const scorecardId = (scorecards ?? [])[0]?.id
    if (!scorecardId) redirect(`/events/${id}`)

    redirect(`/rounds/${scorecardId}/score`)
  }

  // ── Anonymous path — check join_token cookie ──────────────────────────────
  const cookieStore = await cookies()
  const joinToken   = cookieStore.get(`ep_token_${id}`)?.value

  if (!joinToken) {
    // No session and no token — send to login with a return URL
    redirect(`/auth/login?redirect=/events/${id}/score`)
  }

  const { data: anonPlayer } = await admin
    .from('event_players')
    .select('id, scorecards(id)')
    .eq('event_id', id)
    .eq('join_token', joinToken)
    .maybeSingle()

  if (!anonPlayer) redirect(`/events/${id}`)

  const scorecards  = anonPlayer.scorecards as unknown as { id: string }[] | null
  const scorecardId = (scorecards ?? [])[0]?.id
  if (!scorecardId) redirect(`/events/${id}`)

  redirect(`/rounds/${scorecardId}/score`)
}
