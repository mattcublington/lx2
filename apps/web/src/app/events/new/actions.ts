'use server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface CreateEventData {
  eventName: string
  date: string                   // YYYY-MM-DD
  combinationId: string          // course_combinations.id
  format: 'stableford' | 'strokeplay'
  handicapAllowancePct: number   // e.g. 95 (stored as 0.95 in DB)
  groupSize: 2 | 3 | 4
  maxPlayers: number | null
  ntpHoles: number[]
  ldHoles: number[]
  entryFeePence: number | null   // null = free
  organiserHandicap: number | null  // override profile handicap for this event
  predictionsEnabled?: boolean
  startingCredits?: number
}

export async function createEvent(data: CreateEventData): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Load organiser profile
  const { data: profile } = await supabase
    .from('users')
    .select('display_name, handicap_index')
    .eq('id', user.id)
    .single()

  // Ensure public.users row exists (same pattern as startRound)
  await supabase
    .from('users')
    .upsert(
      { id: user.id, email: user.email!, display_name: profile?.display_name ?? user.email!.split('@')[0] },
      { onConflict: 'id', ignoreDuplicates: true },
    )

  // Resolve course_id from the combination
  const { data: combo } = await supabase
    .from('course_combinations')
    .select('course_id')
    .eq('id', data.combinationId)
    .single()

  if (!combo?.course_id) throw new Error('Course combination not found')

  // Create the event row — organiser INSERT is permitted by events_insert RLS
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .insert({
      created_by:             user.id,
      course_id:              combo.course_id,
      combination_id:         data.combinationId,
      name:                   data.eventName,
      date:                   data.date,
      format:                 data.format,
      round_type:             '18',
      handicap_allowance_pct: data.handicapAllowancePct / 100,
      group_size:             data.groupSize,
      max_players:            data.maxPlayers,
      ntp_holes:              data.ntpHoles,
      ld_holes:               data.ldHoles,
      entry_fee_pence:        data.entryFeePence,
      is_public:              true,
      finalised:              false,
    })
    .select('id')
    .single()

  if (eventErr || !event) throw new Error(`Failed to create event: ${eventErr?.message ?? 'unknown'}`)

  // Register organiser as first confirmed player
  // event_players_insert RLS: organiser can insert when created_by = auth.uid()
  const { data: ep, error: epErr } = await supabase
    .from('event_players')
    .insert({
      event_id:      event.id,
      user_id:       user.id,
      display_name:  profile?.display_name ?? user.email!.split('@')[0],
      handicap_index: data.organiserHandicap ?? profile?.handicap_index ?? 0,
      rsvp_status:   'confirmed',
    })
    .select('id')
    .single()

  if (epErr || !ep) throw new Error(`Failed to register organiser: ${epErr?.message ?? 'unknown'}`)

  // Create organiser scorecard — scorecards_insert RLS: same organiser check
  const { error: scErr } = await supabase
    .from('scorecards')
    .insert({ event_id: event.id, event_player_id: ep.id, round_type: '18' })

  if (scErr) throw new Error(`Failed to create scorecard: ${scErr.message}`)

  // Create predictions config if enabled (uses admin client to bypass RLS)
  if (data.predictionsEnabled) {
    const admin = createAdminClient()
    await admin.from('prediction_configs').insert({
      event_id: event.id,
      enabled: true,
      starting_credits: data.startingCredits ?? 1000,
    })
  }

  return event.id
}
