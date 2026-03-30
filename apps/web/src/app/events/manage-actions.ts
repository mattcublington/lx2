'use server'

import { revalidatePath } from 'next/cache'
import { assertEventOrganiser } from '@/lib/assert-event-organiser'

// ─── updateEventFormat ────────────────────────────────────────────────────────
// Updates the format, handicap allowance, or tee-related settings for an event.
// Preserves existing scores.

export async function updateEventFormat(
  eventId: string,
  fields: {
    format?: 'stableford' | 'strokeplay' | 'matchplay'
    handicap_allowance_pct?: number
    ntp_holes?: number[]
    ld_holes?: number[]
  },
): Promise<void> {
  const { admin } = await assertEventOrganiser(eventId)

  await admin
    .from('events')
    .update(fields)
    .eq('id', eventId)

  revalidatePath(`/events/${eventId}/manage`)
  revalidatePath(`/events/${eventId}/leaderboard`)
}

// ─── updateEventCourse ────────────────────────────────────────────────────────
// Changes the course for an event and resets all scores (destructive).
// Organiser only.

export async function updateEventCourse(
  eventId: string,
  courseId: string,
  combinationId: string | null,
): Promise<void> {
  const { admin } = await assertEventOrganiser(eventId)

  // Update the event course
  await admin
    .from('events')
    .update({ course_id: courseId, combination_id: combinationId })
    .eq('id', eventId)

  // Delete all existing hole scores (reset scoring)
  const { data: scorecards } = await admin
    .from('scorecards')
    .select('id')
    .eq('event_id', eventId)

  if (scorecards && scorecards.length > 0) {
    const ids = scorecards.map(sc => sc.id)
    await admin
      .from('hole_scores')
      .delete()
      .in('scorecard_id', ids)
  }

  revalidatePath(`/events/${eventId}/manage`)
  revalidatePath(`/events/${eventId}/leaderboard`)
}

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
