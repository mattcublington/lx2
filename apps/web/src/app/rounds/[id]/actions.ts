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

  // Only mark complete if the user owns this scorecard
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
    .is('submitted_at', null) // idempotent — only set once
}

// ─── deleteRound ───────────────────────────────────────────────────────────────
// Deletes the user's scorecard + event_player. If no other players remain,
// also deletes the parent event.

export async function deleteRound(scorecardId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()

  // 1. Load the scorecard to verify ownership and get event_id + event_player_id
  const { data: sc } = await admin
    .from('scorecards')
    .select('id, event_id, event_player_id, event_players!inner(user_id)')
    .eq('id', scorecardId)
    .single()

  if (!sc) throw new Error('Round not found')

  const ep = sc.event_players as unknown as { user_id: string | null }
  if (ep.user_id !== user.id) throw new Error('Not authorised to delete this round')

  // 2. Delete scorecard (hole_scores cascade via FK)
  await admin.from('scorecards').delete().eq('id', scorecardId)

  // 3. Delete event_player
  await admin.from('event_players').delete().eq('id', sc.event_player_id)

  // 4. If no event_players remain, delete the event too
  const { count } = await admin
    .from('event_players')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', sc.event_id)

  if ((count ?? 0) === 0) {
    await admin.from('events').delete().eq('id', sc.event_id)
  }

  redirect('/play')
}
