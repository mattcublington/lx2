'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function confirmPlayer(eventId: string, playerId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Verify the caller is the event organiser
  const admin = createAdminClient()
  const { data: event } = await admin
    .from('events')
    .select('created_by')
    .eq('id', eventId)
    .single()

  if (!event || event.created_by !== user.id) throw new Error('Not authorised')

  await admin
    .from('event_players')
    .update({ rsvp_status: 'confirmed' })
    .eq('id', playerId)
    .eq('event_id', eventId)

  // Ensure the player has a scorecard
  const { data: existing } = await admin
    .from('scorecards')
    .select('id')
    .eq('event_player_id', playerId)
    .maybeSingle()

  if (!existing) {
    const { data: ev } = await admin
      .from('events')
      .select('round_type')
      .eq('id', eventId)
      .single()

    await admin
      .from('scorecards')
      .insert({ event_id: eventId, event_player_id: playerId, round_type: ev?.round_type ?? '18' })
  }

  revalidatePath(`/events/${eventId}/manage`)
  revalidatePath(`/events/${eventId}/leaderboard`)
}
