'use server'

import { revalidatePath } from 'next/cache'
import { assertEventOrganiser } from '@/lib/assert-event-organiser'
import { settleAllMarkets } from '../predictions/actions'

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

// ─── getRecentlyPlayedWith ───────────────────────────────────────────────────
// Returns users the organiser has previously played with in other events,
// excluding anyone already in the current event. Ordered by most-recent event first.

export async function getRecentlyPlayedWith(
  eventId: string,
): Promise<{ id: string; displayName: string; handicapIndex: number | null; avatarUrl: string | null; club: string | null }[]> {
  const { admin, userId } = await assertEventOrganiser(eventId)

  // Get user_ids already in this event (to exclude them)
  const { data: existing } = await admin
    .from('event_players')
    .select('user_id')
    .eq('event_id', eventId)
    .not('user_id', 'is', null)

  const existingIds = new Set((existing ?? []).map(p => p.user_id as string))
  existingIds.add(userId) // exclude the organiser themselves

  // Find all events the organiser has played in
  const { data: myEvents } = await admin
    .from('event_players')
    .select('event_id')
    .eq('user_id', userId)

  if (!myEvents || myEvents.length === 0) return []

  const eventIds = myEvents.map(e => e.event_id as string)

  // Get all co-players from those events, most recent first
  const { data: coPlayers } = await admin
    .from('event_players')
    .select('user_id, display_name, handicap_index, created_at')
    .in('event_id', eventIds)
    .not('user_id', 'is', null)
    .order('created_at', { ascending: false })

  if (!coPlayers) return []

  // Deduplicate — keep only the most recent occurrence per user
  const seen = new Set<string>()
  const unique: { userId: string; displayName: string; handicapIndex: number | null }[] = []
  for (const p of coPlayers) {
    const uid = p.user_id as string
    if (existingIds.has(uid) || seen.has(uid)) continue
    seen.add(uid)
    unique.push({
      userId: uid,
      displayName: p.display_name,
      handicapIndex: p.handicap_index !== null ? Number(p.handicap_index) : null,
    })
    if (unique.length >= 20) break
  }

  if (unique.length === 0) return []

  // Fetch avatar_url from users table
  const { data: users } = await admin
    .from('users')
    .select('id, avatar_url, handicap_index')
    .in('id', unique.map(u => u.userId))

  const userMap = new Map((users ?? []).map(u => [u.id, u]))

  return unique.map(u => {
    const profile = userMap.get(u.userId)
    return {
      id: u.userId,
      displayName: u.displayName,
      handicapIndex: profile?.handicap_index !== null && profile?.handicap_index !== undefined
        ? Number(profile.handicap_index)
        : u.handicapIndex,
      avatarUrl: (profile?.avatar_url as string | null) ?? null,
      club: null, // We don't store club on users yet
    }
  })
}

// ─── searchUsersForEvent ─────────────────────────────────────────────────────
// Searches registered users by name, excluding those already in the event.

export async function searchUsersForEvent(
  eventId: string,
  query: string,
): Promise<{ id: string; displayName: string; handicapIndex: number | null; avatarUrl: string | null }[]> {
  if (!query || query.trim().length < 2) return []

  const { admin } = await assertEventOrganiser(eventId)

  // Get user_ids already in this event
  const { data: existing } = await admin
    .from('event_players')
    .select('user_id')
    .eq('event_id', eventId)
    .not('user_id', 'is', null)

  const existingIds = new Set((existing ?? []).map(p => p.user_id as string))

  // Search users via the existing RPC
  const supabase = (await import('@/lib/supabase/server')).createClient
  const client = await supabase()
  const { data } = await client.rpc('search_user_profiles', { search_query: query.trim() })

  return (data ?? [])
    .filter((u: { id: string }) => !existingIds.has(u.id))
    .map((u: { id: string; display_name: string | null; handicap_index: number | null }) => ({
      id: u.id,
      displayName: u.display_name ?? '',
      handicapIndex: u.handicap_index !== null ? Number(u.handicap_index) : null,
      avatarUrl: null, // RPC doesn't return avatar_url
    }))
}

// ─── addPlayerToEvent ────────────────────────────────────────────────────────
// Adds a registered or unregistered player to an event as confirmed.
// Creates event_player + scorecard. Organiser only.

export async function addPlayerToEvent(
  eventId: string,
  player: {
    userId: string | null   // null = unregistered player
    displayName: string
    handicapIndex: number
    flightNumber: number | null  // assign to a specific group
  },
): Promise<{ id: string }> {
  const { admin } = await assertEventOrganiser(eventId)

  // Check for duplicates if registered user
  if (player.userId) {
    const { data: dup } = await admin
      .from('event_players')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', player.userId)
      .maybeSingle()

    if (dup) return { id: dup.id }
  }

  // Insert event_player
  const { data: ep, error: epErr } = await admin
    .from('event_players')
    .insert({
      event_id: eventId,
      user_id: player.userId,
      display_name: player.displayName.trim(),
      handicap_index: player.handicapIndex,
      rsvp_status: 'confirmed',
      flight_number: player.flightNumber,
    })
    .select('id')
    .single()

  if (epErr || !ep) throw new Error(`Failed to add player: ${epErr?.message ?? 'unknown'}`)

  // Create scorecard
  const { data: ev } = await admin
    .from('events')
    .select('round_type')
    .eq('id', eventId)
    .single()

  await admin
    .from('scorecards')
    .insert({ event_id: eventId, event_player_id: ep.id, round_type: ev?.round_type ?? '18' })

  revalidatePath(`/events/${eventId}/manage`)
  revalidatePath(`/events/${eventId}/leaderboard`)

  return { id: ep.id }
}

// ─── removePlayerFromEvent ───────────────────────────────────────────────────
// Removes a player from the event entirely. Deletes scorecard + hole_scores + event_player.
// Only allowed if the event is not finalised. Organiser only.

export async function removePlayerFromEvent(
  eventId: string,
  playerId: string,
): Promise<void> {
  const { admin } = await assertEventOrganiser(eventId)

  // Safety: don't remove from finalised events
  const { data: event } = await admin
    .from('events')
    .select('finalised')
    .eq('id', eventId)
    .single()

  if (event?.finalised) throw new Error('Cannot remove players from a finalised event')

  // Delete hole_scores → scorecards → event_player (cascade order)
  const { data: sc } = await admin
    .from('scorecards')
    .select('id')
    .eq('event_player_id', playerId)
    .eq('event_id', eventId)
    .maybeSingle()

  if (sc) {
    await admin.from('hole_scores').delete().eq('scorecard_id', sc.id)
    await admin.from('scorecards').delete().eq('id', sc.id)
  }

  await admin
    .from('event_players')
    .delete()
    .eq('id', playerId)
    .eq('event_id', eventId)

  revalidatePath(`/events/${eventId}/manage`)
  revalidatePath(`/events/${eventId}/leaderboard`)
}
