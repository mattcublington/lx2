'use server'
import { createClient } from '@/lib/supabase/server'

export async function addRound(tournamentId: string, data: {
  date: string
  combinationId: string
  eventName: string
  handicapAllowancePct: number
  groupSize: 2 | 3 | 4
}): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Verify ownership
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, created_by, format, finalised')
    .eq('id', tournamentId)
    .single()

  if (!tournament) throw new Error('Tournament not found')
  if (tournament.created_by !== user.id) throw new Error('Not authorised')
  if (tournament.finalised) throw new Error('Tournament is finalised')

  // Get next round number
  const { data: existingRounds } = await supabase
    .from('events')
    .select('round_number')
    .eq('tournament_id', tournamentId)
    .order('round_number', { ascending: false })
    .limit(1)

  const nextRoundNumber = existingRounds?.[0]
    ? (existingRounds[0].round_number as number) + 1
    : 1

  // Resolve course_id
  const { data: combo } = await supabase
    .from('course_combinations')
    .select('course_id')
    .eq('id', data.combinationId)
    .single()

  if (!combo?.course_id) throw new Error('Course combination not found')

  // Create event
  const { data: event, error: evErr } = await supabase
    .from('events')
    .insert({
      created_by: user.id,
      course_id: combo.course_id,
      combination_id: data.combinationId,
      name: data.eventName,
      date: data.date,
      format: tournament.format,
      round_type: '18',
      handicap_allowance_pct: data.handicapAllowancePct / 100,
      group_size: data.groupSize,
      max_players: null,
      ntp_holes: [],
      ld_holes: [],
      entry_fee_pence: null,
      is_public: true,
      finalised: false,
      tournament_id: tournamentId,
      round_number: nextRoundNumber,
    })
    .select('id')
    .single()

  if (evErr || !event) throw new Error(`Failed to create round: ${evErr?.message ?? 'unknown'}`)

  // Register organiser
  const { data: profile } = await supabase
    .from('users')
    .select('display_name, handicap_index')
    .eq('id', user.id)
    .single()

  const { data: ep } = await supabase
    .from('event_players')
    .insert({
      event_id: event.id,
      user_id: user.id,
      display_name: profile?.display_name ?? user.email!.split('@')[0],
      handicap_index: profile?.handicap_index ?? 0,
      rsvp_status: 'confirmed',
    })
    .select('id')
    .single()

  if (ep) {
    await supabase
      .from('scorecards')
      .insert({ event_id: event.id, event_player_id: ep.id, round_type: '18' })
  }

  return event.id
}

export async function removeRound(tournamentId: string, eventId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('created_by, finalised')
    .eq('id', tournamentId)
    .single()

  if (!tournament || tournament.created_by !== user.id) throw new Error('Not authorised')
  if (tournament.finalised) throw new Error('Tournament is finalised')

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)
    .eq('tournament_id', tournamentId)

  if (error) throw new Error(`Failed to remove round: ${error.message}`)
}

export async function reorderRounds(
  tournamentId: string,
  roundOrder: Array<{ eventId: string; roundNumber: number }>,
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('created_by, finalised')
    .eq('id', tournamentId)
    .single()

  if (!tournament || tournament.created_by !== user.id) throw new Error('Not authorised')
  if (tournament.finalised) throw new Error('Tournament is finalised')

  // Set to negative first to avoid unique constraint conflicts
  for (const { eventId, roundNumber } of roundOrder) {
    await supabase
      .from('events')
      .update({ round_number: -roundNumber })
      .eq('id', eventId)
      .eq('tournament_id', tournamentId)
  }
  for (const { eventId, roundNumber } of roundOrder) {
    await supabase
      .from('events')
      .update({ round_number: roundNumber })
      .eq('id', eventId)
      .eq('tournament_id', tournamentId)
  }
}

export async function finaliseTournament(tournamentId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('tournaments')
    .update({ finalised: true, status: 'completed' })
    .eq('id', tournamentId)
    .eq('created_by', user.id)

  if (error) throw new Error(`Failed to finalise: ${error.message}`)
}

export async function unfinaliseTournament(tournamentId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('tournaments')
    .update({ finalised: false, status: 'in_progress' })
    .eq('id', tournamentId)
    .eq('created_by', user.id)

  if (error) throw new Error(`Failed to unfinalise: ${error.message}`)
}
