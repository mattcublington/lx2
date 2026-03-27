'use server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Cookie name helper ───────────────────────────────────────────────────────
// Stored as HttpOnly so the score page can redirect anon players to their card.
function epTokenCookieName(eventId: string) {
  return `ep_token_${eventId}`
}

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

/**
 * Join a public event as an anonymous (unauthenticated) player.
 * Creates an event_player with null user_id and stores the join_token
 * in an HttpOnly cookie so the player can access their scorecard later.
 * Safe to call multiple times — idempotent if the cookie is present.
 */
export async function joinEventAnon(
  eventId: string,
  displayName: string,
  handicapIndex: number,
): Promise<void> {
  const admin      = createAdminClient()
  const cookieStore = await cookies()

  // Idempotent: if this browser already has a valid join_token for this
  // event, return without creating a duplicate row.
  const existing = cookieStore.get(epTokenCookieName(eventId))?.value
  if (existing) {
    const { data: ep } = await admin
      .from('event_players')
      .select('id')
      .eq('event_id', eventId)
      .eq('join_token', existing)
      .maybeSingle()
    if (ep) return // Already joined — cookie is still valid
  }

  // Validate event exists and is public
  const { data: event } = await admin
    .from('events')
    .select('max_players, is_public')
    .eq('id', eventId)
    .single()

  if (!event)           throw new Error('Event not found')
  if (!event.is_public) throw new Error('Event is not public')

  // Enforce max_players cap
  if (event.max_players) {
    const { count } = await admin
      .from('event_players')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('rsvp_status', 'confirmed')
    if ((count ?? 0) >= event.max_players) throw new Error('MAX_PLAYERS_REACHED')
  }

  // Create event_player with null user_id (anonymous)
  const { data: ep, error: epErr } = await admin
    .from('event_players')
    .insert({
      event_id:       eventId,
      user_id:        null,
      display_name:   displayName,
      handicap_index: handicapIndex,
      rsvp_status:    'confirmed',
    })
    .select('id, join_token')
    .single()

  if (epErr || !ep) throw new Error(`Failed to join: ${epErr?.message ?? 'unknown'}`)

  // Create scorecard
  const { error: scErr } = await admin
    .from('scorecards')
    .insert({ event_id: eventId, event_player_id: ep.id, round_type: '18' })

  if (scErr) throw new Error(`Failed to create scorecard: ${scErr.message}`)

  // Persist the join_token as an HttpOnly cookie (7 days).
  // The score redirect page reads this to find the scorecard for anon players.
  cookieStore.set(epTokenCookieName(eventId), ep.join_token as string, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   7 * 24 * 60 * 60, // 7 days
    path:     '/',
  })
}
