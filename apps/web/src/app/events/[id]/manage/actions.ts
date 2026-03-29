'use server'

import { revalidatePath } from 'next/cache'
import { assertEventOrganiser } from '@/lib/assert-event-organiser'
import { createAdminClient } from '@/lib/supabase/admin'
import { settleAllMarkets, refreshMarkets } from '../predictions/actions'

// ─── generateGroups ────────────────────────────────────────────────────────────
// Auto-creates event_group rows and assigns confirmed players to them in order.
// Wipes any existing groups and flight_number assignments before re-generating.

export async function generateGroups(eventId: string): Promise<void> {
  const { admin } = await assertEventOrganiser(eventId)

  // Need group_size from the event
  const { data: event } = await admin
    .from('events')
    .select('group_size')
    .eq('id', eventId)
    .single()

  const { data: players } = await admin
    .from('event_players')
    .select('id')
    .eq('event_id', eventId)
    .eq('rsvp_status', 'confirmed')
    .order('created_at')

  if (!players || players.length === 0) return

  const groupSize = (event?.group_size as number) ?? 4
  const numGroups = Math.ceil(players.length / groupSize)

  // Wipe existing groups and reset all flight_number assignments
  await admin.from('event_groups').delete().eq('event_id', eventId)
  await admin.from('event_players').update({ flight_number: null }).eq('event_id', eventId)

  // Create the group rows
  await admin.from('event_groups').insert(
    Array.from({ length: numGroups }, (_, i) => ({
      event_id: eventId,
      flight_number: i + 1,
      label: `Group ${i + 1}`,
      start_hole: 1,
    }))
  )

  // Assign players sequentially to groups
  for (const [i, player] of players.entries()) {
    await admin
      .from('event_players')
      .update({ flight_number: Math.floor(i / groupSize) + 1 })
      .eq('id', player.id)
  }

  revalidatePath(`/events/${eventId}/manage`)
  revalidatePath(`/events/${eventId}/leaderboard`)
}

// ─── updateGroup ───────────────────────────────────────────────────────────────
// Updates tee_time, start_hole, or label on a group. Organiser only.

export async function updateGroup(
  eventId: string,
  groupId: string,
  fields: { tee_time?: string | null; start_hole?: number; label?: string },
): Promise<void> {
  const { admin } = await assertEventOrganiser(eventId)

  await admin
    .from('event_groups')
    .update(fields)
    .eq('id', groupId)
    .eq('event_id', eventId)

  revalidatePath(`/events/${eventId}/manage`)
}

// ─── assignPlayerToGroup ───────────────────────────────────────────────────────
// Sets flight_number on an event_player row. Pass null to unassign. Organiser only.

export async function assignPlayerToGroup(
  eventId: string,
  playerId: string,
  flightNumber: number | null,
): Promise<void> {
  const { admin } = await assertEventOrganiser(eventId)

  await admin
    .from('event_players')
    .update({ flight_number: flightNumber })
    .eq('id', playerId)
    .eq('event_id', eventId)

  revalidatePath(`/events/${eventId}/manage`)
  revalidatePath(`/events/${eventId}/leaderboard`)
}

// ─── finaliseEvent ──────────────────────────────────────────────────────────────
// Locks the event — no more scoring changes. Sets events.finalised = true.

export async function finaliseEvent(eventId: string): Promise<void> {
  const { admin } = await assertEventOrganiser(eventId)

  await admin
    .from('events')
    .update({ finalised: true })
    .eq('id', eventId)

  // Settle all prediction markets
  try {
    await settleAllMarkets(eventId)
  } catch {
    // Settlement failure shouldn't block finalisation
  }

  // Close any open markets
  await admin.from('prediction_markets')
    .update({ status: 'closed' })
    .eq('event_id', eventId)
    .eq('status', 'open')

  revalidatePath(`/events/${eventId}/manage`)
  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/leaderboard`)
}

// ─── unfinaliseEvent ────────────────────────────────────────────────────────────
// Unlocks the event — allows scoring changes again.

export async function unfinaliseEvent(eventId: string): Promise<void> {
  const { admin } = await assertEventOrganiser(eventId)

  await admin
    .from('events')
    .update({ finalised: false })
    .eq('id', eventId)

  revalidatePath(`/events/${eventId}/manage`)
  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/leaderboard`)
}

// ─── confirmPlayer ─────────────────────────────────────────────────────────────

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

// ─── deleteEvent ──────────────────────────────────────────────────────────────
// Deletes a tournament/event. Safety guards:
// - Finalised events cannot be deleted (must unfinalise first)
// - Events with submitted scores are soft-deleted (archived_at timestamp)
// - Empty events (no scores) are hard-deleted
// Organiser only.

export async function deleteEvent(eventId: string): Promise<{ error?: string }> {
  const { admin } = await assertEventOrganiser(eventId)

  // Check if finalised — block deletion of locked tournaments
  const { data: event } = await admin
    .from('events')
    .select('finalised')
    .eq('id', eventId)
    .single()

  if (event?.finalised) {
    return { error: 'This tournament is finalised. Unfinalise it first before deleting.' }
  }

  // Check if any scorecards have been submitted (have scores)
  const { count: scoredCount } = await admin
    .from('scorecards')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .not('submitted_at', 'is', null)

  if ((scoredCount ?? 0) > 0) {
    // Soft delete — preserve scored data, just hide the event
    await admin
      .from('events')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', eventId)
  } else {
    // No scores submitted — safe to hard delete
    // FK cascades handle event_players, scorecards, hole_scores,
    // event_groups, and contest_entries
    await admin.from('events').delete().eq('id', eventId)
  }

  revalidatePath('/play')
  return {}
}
