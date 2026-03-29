'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── markRoundComplete ─────────────────────────────────────────────────────────
// Sets submitted_at on the user's scorecard when all holes are scored.
// Called from ScoreEntryLive when roundComplete becomes true.

export async function markRoundComplete(scorecardId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const admin = createAdminClient()

  const { data: sc } = await admin
    .from('scorecards')
    .select('id, event_players!inner(user_id)')
    .eq('id', scorecardId)
    .single()

  const ep = sc?.event_players as unknown as { user_id: string | null } | null
  if (!sc || ep?.user_id !== user.id) return

  await admin
    .from('scorecards')
    .update({ submitted_at: new Date().toISOString() })
    .eq('id', scorecardId)
    .is('submitted_at', null)
}

// ─── deleteRound ───────────────────────────────────────────────────────────────
// Deletes or leaves a round depending on context:
// - Solo round (you're the only player): deletes scorecard + event_player + event
// - Multi-player round: removes your scorecard + event_player but preserves the event
// - Finalised event: blocked — scores are locked
// Called from round detail page (DeleteRoundButton).

export async function deleteRound(scorecardId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()

  // 1. Load the scorecard + event metadata to verify ownership and check guards
  const { data: sc } = await admin
    .from('scorecards')
    .select('id, event_id, event_player_id, event_players!inner(user_id)')
    .eq('id', scorecardId)
    .single()

  if (!sc) throw new Error('Round not found')

  const ep = sc.event_players as unknown as { user_id: string | null }
  if (ep.user_id !== user.id) throw new Error('Not authorised to delete this round')

  // 2. Check if event is finalised — block deletion of locked scores
  const { data: event } = await admin
    .from('events')
    .select('finalised, created_by')
    .eq('id', sc.event_id)
    .single()

  if (event?.finalised) {
    return { error: 'This round belongs to a finalised tournament. Scores are locked.' }
  }

  // 3. Count other players in this event
  const { count: playerCount } = await admin
    .from('event_players')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', sc.event_id)

  const isMultiPlayer = (playerCount ?? 0) > 1
  const isOrganiser = event?.created_by === user.id

  // 4. Multi-player event where you're not the organiser: leave (remove your data only)
  //    Multi-player event where you ARE the organiser: block — transfer ownership or delete event via manage page
  if (isMultiPlayer && !isOrganiser) {
    await admin.from('scorecards').delete().eq('id', scorecardId)
    await admin.from('event_players').delete().eq('id', sc.event_player_id)
    redirect('/play')
  }

  if (isMultiPlayer && isOrganiser) {
    return { error: 'You organised this tournament. Delete it from the manage page, or remove individual players there.' }
  }

  // 5. Solo round — safe to delete everything
  await admin.from('scorecards').delete().eq('id', scorecardId)
  await admin.from('event_players').delete().eq('id', sc.event_player_id)
  await admin.from('events').delete().eq('id', sc.event_id)

  redirect('/play')
}
