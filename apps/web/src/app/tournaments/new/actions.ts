'use server'
import { createClient } from '@/lib/supabase/server'

export interface TournamentRoundInput {
  roundNumber: number
  date: string              // YYYY-MM-DD
  combinationId: string     // course_combinations.id
  eventName: string         // auto-generated or custom
}

export interface CreateTournamentData {
  name: string
  format: 'stableford' | 'strokeplay'
  dnsPolicy: 'exclude' | 'penalty'
  description?: string
  rounds: TournamentRoundInput[]
  handicapAllowancePct: number
  groupSize: 2 | 3 | 4
}

export async function createTournament(data: CreateTournamentData): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  if (data.rounds.length < 2) throw new Error('Tournament requires at least 2 rounds')

  // Ensure user profile exists
  const { data: profile } = await supabase
    .from('users')
    .select('display_name, handicap_index')
    .eq('id', user.id)
    .single()

  await supabase
    .from('users')
    .upsert(
      { id: user.id, email: user.email!, display_name: profile?.display_name ?? user.email!.split('@')[0] },
      { onConflict: 'id', ignoreDuplicates: true },
    )

  // Create tournament
  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .insert({
      created_by: user.id,
      name: data.name,
      description: data.description || null,
      format: data.format,
      dns_policy: data.dnsPolicy,
    })
    .select('id')
    .single()

  if (tErr || !tournament) throw new Error(`Failed to create tournament: ${tErr?.message ?? 'unknown'}`)

  // Create one event per round
  for (const round of data.rounds) {
    // Resolve course_id from combination
    const { data: combo } = await supabase
      .from('course_combinations')
      .select('course_id')
      .eq('id', round.combinationId)
      .single()

    if (!combo?.course_id) throw new Error(`Course combination not found for round ${round.roundNumber}`)

    const { data: event, error: evErr } = await supabase
      .from('events')
      .insert({
        created_by: user.id,
        course_id: combo.course_id,
        combination_id: round.combinationId,
        name: round.eventName,
        date: round.date,
        format: data.format,
        round_type: '18',
        handicap_allowance_pct: data.handicapAllowancePct / 100,
        group_size: data.groupSize,
        max_players: null,
        ntp_holes: [],
        ld_holes: [],
        entry_fee_pence: null,
        is_public: true,
        finalised: false,
        tournament_id: tournament.id,
        round_number: round.roundNumber,
      })
      .select('id')
      .single()

    if (evErr || !event) throw new Error(`Failed to create round ${round.roundNumber}: ${evErr?.message ?? 'unknown'}`)

    // Register organiser as player for each round
    const { data: ep, error: epErr } = await supabase
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

    if (epErr || !ep) throw new Error(`Failed to register organiser for round ${round.roundNumber}: ${epErr?.message ?? 'unknown'}`)

    // Create organiser scorecard
    const { error: scErr } = await supabase
      .from('scorecards')
      .insert({ event_id: event.id, event_player_id: ep.id, round_type: '18' })

    if (scErr) throw new Error(`Failed to create scorecard for round ${round.roundNumber}: ${scErr.message}`)
  }

  return tournament.id
}
