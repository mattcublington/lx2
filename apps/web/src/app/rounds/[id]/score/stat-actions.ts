'use server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface HoleStats {
  putts?: number | null
  fairwayHit?: boolean | null
  greenInRegulation?: boolean | null
  missDirection?: string | null
  bunkerShots?: number | null
  penalties?: number | null
  upAndDown?: boolean | null
  sandSave?: boolean | null
}

/**
 * Save hole stats from manual entry.
 * Called after the user fills in the stats panel on the score modal.
 */
export async function saveHoleStats(
  scorecardId: string,
  holeNumber: number,
  stats: HoleStats,
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
      putts: stats.putts ?? null,
      fairway_hit: stats.fairwayHit ?? null,
      green_in_regulation: stats.greenInRegulation ?? null,
      miss_direction: stats.missDirection ?? null,
      bunker_shots: stats.bunkerShots ?? null,
      penalties: stats.penalties ?? null,
      up_and_down: stats.upAndDown ?? null,
      sand_save: stats.sandSave ?? null,
    })
    .eq('scorecard_id', scorecardId)
    .eq('hole_number', holeNumber)
}

/**
 * Load hole stats for a scorecard (all holes).
 * Returns a map of holeNumber → stats.
 */
export async function loadHoleStats(
  scorecardId: string,
): Promise<Record<number, HoleStats>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return {}

  const admin = createAdminClient()

  const { data: rows } = await admin
    .from('hole_scores')
    .select('hole_number, putts, fairway_hit, green_in_regulation, miss_direction, bunker_shots, penalties, up_and_down, sand_save')
    .eq('scorecard_id', scorecardId)

  if (!rows) return {}

  const result: Record<number, HoleStats> = {}
  for (const row of rows) {
    result[row.hole_number as number] = {
      putts: row.putts as number | null,
      fairwayHit: row.fairway_hit as boolean | null,
      greenInRegulation: row.green_in_regulation as boolean | null,
      missDirection: row.miss_direction as string | null,
      bunkerShots: row.bunker_shots as number | null,
      penalties: row.penalties as number | null,
      upAndDown: row.up_and_down as boolean | null,
      sandSave: row.sand_save as boolean | null,
    }
  }
  return result
}
