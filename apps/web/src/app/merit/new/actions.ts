'use server'
import { createClient } from '@/lib/supabase/server'

export interface MeritEntryInput {
  eventId?: string
  tournamentId?: string
  multiplier: number
}

export interface CreateMeritData {
  name: string
  seasonYear: number
  bestOf: number | null
  participationPoints: number
  pointsTemplate: Record<string, number>
  entries: MeritEntryInput[]
}

export async function createMerit(data: CreateMeritData): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Validate points template
  for (const [key, value] of Object.entries(data.pointsTemplate)) {
    if (key !== 'default' && (isNaN(Number(key)) || Number(key) < 1)) {
      throw new Error(`Invalid position key: ${key}`)
    }
    if (typeof value !== 'number' || value < 0) {
      throw new Error(`Invalid points value for position ${key}`)
    }
  }

  const { data: merit, error: mErr } = await supabase
    .from('order_of_merits')
    .insert({
      created_by: user.id,
      name: data.name,
      season_year: data.seasonYear,
      best_of: data.bestOf,
      participation_points: data.participationPoints,
      points_template: data.pointsTemplate,
    })
    .select('id')
    .single()

  if (mErr || !merit) throw new Error(`Failed to create merit: ${mErr?.message ?? 'unknown'}`)

  if (data.entries.length > 0) {
    const rows = data.entries.map(e => ({
      merit_id: merit.id,
      event_id: e.eventId || null,
      tournament_id: e.tournamentId || null,
      points_multiplier: e.multiplier,
    }))

    const { error: eErr } = await supabase
      .from('order_of_merit_entries')
      .insert(rows)

    if (eErr) throw new Error(`Failed to add entries: ${eErr.message}`)
  }

  return merit.id
}
