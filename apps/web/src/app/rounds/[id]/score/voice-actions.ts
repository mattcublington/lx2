'use server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Save extended voice scoring details to an existing hole_scores row.
 * Called after voice input confirms scores. Updates the row with
 * putts, fairway_hit, green_in_regulation, miss_direction, input_method,
 * and the raw voice transcript.
 */
export async function saveVoiceScoreDetails(
  scorecardId: string,
  holeNumber: number,
  details: {
    putts?: number | undefined
    fairwayHit?: boolean | undefined
    greenInRegulation?: boolean | undefined
    missDirection?: string | undefined
    bunkerShots?: number | undefined
    penalties?: number | undefined
    upAndDown?: boolean | undefined
    sandSave?: boolean | undefined
    voiceTranscript: string
  },
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const admin = createAdminClient()

  // Verify the user owns this scorecard
  const { data: sc } = await admin
    .from('scorecards')
    .select('id, event_players!inner(user_id)')
    .eq('id', scorecardId)
    .single()

  const ep = sc?.event_players as unknown as { user_id: string | null } | null
  if (!sc || ep?.user_id !== user.id) return

  await admin
    .from('hole_scores')
    .update({
      putts: details.putts ?? null,
      fairway_hit: details.fairwayHit ?? null,
      green_in_regulation: details.greenInRegulation ?? null,
      miss_direction: details.missDirection ?? null,
      bunker_shots: details.bunkerShots ?? null,
      penalties: details.penalties ?? null,
      up_and_down: details.upAndDown ?? null,
      sand_save: details.sandSave ?? null,
      input_method: 'voice',
      voice_transcript: details.voiceTranscript,
    })
    .eq('scorecard_id', scorecardId)
    .eq('hole_number', holeNumber)
}
