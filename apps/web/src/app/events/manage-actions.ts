'use server'

import { revalidatePath } from 'next/cache'
import { assertEventOrganiser } from '@/lib/assert-event-organiser'

export async function confirmPlayer(eventId: string, playerId: string): Promise<void> {
  const { admin } = await assertEventOrganiser(eventId)

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
