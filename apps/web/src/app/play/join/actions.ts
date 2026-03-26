'use server'
import { createClient } from '@/lib/supabase/server'

export interface RoundPreview {
  eventId: string
  shareCode: string
  eventName: string
  courseName: string
  format: 'stableford' | 'strokeplay' | 'matchplay'
  date: string
  roundType: '18' | '9'
  combinationId: string | null
  loopId: string | null
  playerCount: number
  existingPlayers: string[]
}

export interface JoinPlayer {
  name: string
  handicapIndex: number
  isUser: boolean
}

// ─── lookupRound ──────────────────────────────────────────────────────────────
// Finds an event by share code and returns a preview for the confirmation step.
// Events are publicly readable, so no auth required for the lookup.

export async function lookupRound(code: string): Promise<RoundPreview | null> {
  const supabase = await createClient()

  const clean = code.trim().toUpperCase()
  if (clean.length !== 6) return null

  const { data: event } = await supabase
    .from('events')
    .select(`
      id,
      share_code,
      name,
      format,
      date,
      round_type,
      combination_id,
      loop_id,
      courses ( name ),
      event_players ( id, display_name )
    `)
    .eq('share_code', clean)
    .single()

  if (!event) return null

  const courses = event.courses as unknown as { name: string } | null
  const players = event.event_players as unknown as { id: string; display_name: string }[] | null

  return {
    eventId: event.id,
    shareCode: event.share_code ?? clean,
    eventName: event.name,
    courseName: courses?.name ?? event.name,
    format: event.format as 'stableford' | 'strokeplay' | 'matchplay',
    date: event.date,
    roundType: (event.round_type ?? '18') as '18' | '9',
    combinationId: event.combination_id ?? null,
    loopId: event.loop_id ?? null,
    playerCount: players?.length ?? 0,
    existingPlayers: (players ?? []).map(p => p.display_name ?? 'Player'),
  }
}

// ─── joinRound ────────────────────────────────────────────────────────────────
// Adds a new group of players to an existing event.
// Returns the URL for the authenticated user's scorecard.

export async function joinRound(
  eventId: string,
  roundType: '18' | '9',
  players: JoinPlayer[],
): Promise<string> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  let userScorecardId: string | null = null

  for (const player of players) {
    // Create event_player row
    const { data: ep, error: epErr } = await supabase
      .from('event_players')
      .insert({
        event_id: eventId,
        user_id: player.isUser ? user.id : null,
        display_name: player.name,
        handicap_index: player.handicapIndex,
      })
      .select('id')
      .single()

    if (epErr || !ep) {
      throw new Error(`Failed to add player ${player.name}: ${epErr?.message ?? 'unknown error'}`)
    }

    // Create scorecard row
    const { data: sc, error: scErr } = await supabase
      .from('scorecards')
      .insert({
        event_id: eventId,
        event_player_id: ep.id,
        round_type: roundType,
      })
      .select('id')
      .single()

    if (scErr || !sc) {
      throw new Error(`Failed to create scorecard for ${player.name}: ${scErr?.message ?? 'unknown error'}`)
    }

    if (player.isUser) {
      userScorecardId = sc.id
    }
  }

  if (!userScorecardId) {
    throw new Error('Could not determine user scorecard')
  }

  return `/rounds/${userScorecardId}/score`
}
