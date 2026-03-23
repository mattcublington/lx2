'use server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Join an event as a player. Idempotent — safe to call if already joined.
 * Uses admin client because event_players_insert RLS only permits the organiser.
 * Returns the player's scorecard ID for navigation to the scoring page.
 */
export async function joinEvent(
  eventId: string,
  displayName: string,
  handicapIndex: number,
): Promise<{ scorecardId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()

  // Idempotent check: has this user already joined? (admin bypasses RLS)
  const { data: existing } = await admin
    .from('event_players')
    .select('id, scorecards(id)')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    const scs = existing.scorecards as unknown as { id: string }[] | null
    const sc = (scs ?? [])[0]
    if (sc) return { scorecardId: sc.id }
    // Edge case: player row exists but scorecard is missing — create it
    const { data: newSc, error } = await admin
      .from('scorecards')
      .insert({ event_id: eventId, event_player_id: existing.id, round_type: '18' })
      .select('id')
      .single()
    if (error || !newSc) throw new Error('Failed to create scorecard')
    return { scorecardId: newSc.id }
  }

  // Fetch event to validate and check max_players cap
  const { data: event } = await admin
    .from('events')
    .select('max_players')
    .eq('id', eventId)
    .single()

  if (!event) throw new Error('Event not found')

  if (event.max_players) {
    const { count } = await admin
      .from('event_players')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('rsvp_status', 'confirmed')
    if ((count ?? 0) >= event.max_players) throw new Error('MAX_PLAYERS_REACHED')
  }

  // Update public.users profile with name + handicap (regular client — own row)
  await supabase
    .from('users')
    .upsert(
      {
        id: user.id,
        email: user.email!,
        display_name: displayName,
        ...(handicapIndex > 0 ? { handicap_index: handicapIndex } : {}),
      },
      { onConflict: 'id', ignoreDuplicates: false },
    )

  // Insert event_player row via admin (RLS only permits organiser insert)
  const { data: ep, error: epErr } = await admin
    .from('event_players')
    .insert({
      event_id:       eventId,
      user_id:        user.id,
      display_name:   displayName,
      handicap_index: handicapIndex,
      rsvp_status:    'confirmed',
    })
    .select('id')
    .single()

  if (epErr || !ep) throw new Error(`Failed to join event: ${epErr?.message ?? 'unknown'}`)

  // Create scorecard via admin
  const { data: sc, error: scErr } = await admin
    .from('scorecards')
    .insert({ event_id: eventId, event_player_id: ep.id, round_type: '18' })
    .select('id')
    .single()

  if (scErr || !sc) throw new Error(`Failed to create scorecard: ${scErr?.message ?? 'unknown'}`)

  return { scorecardId: sc.id }
}
