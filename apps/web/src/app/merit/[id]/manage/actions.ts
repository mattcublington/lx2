'use server'
import { createClient } from '@/lib/supabase/server'

export async function addEntry(meritId: string, data: {
  eventId?: string
  tournamentId?: string
  multiplier: number
}): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: merit } = await supabase
    .from('order_of_merits')
    .select('created_by')
    .eq('id', meritId)
    .single()

  if (!merit || merit.created_by !== user.id) throw new Error('Not authorised')

  const { error } = await supabase
    .from('order_of_merit_entries')
    .insert({
      merit_id: meritId,
      event_id: data.eventId || null,
      tournament_id: data.tournamentId || null,
      points_multiplier: data.multiplier,
    })

  if (error) throw new Error(`Failed to add entry: ${error.message}`)
}

export async function removeEntry(meritId: string, entryId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: merit } = await supabase
    .from('order_of_merits')
    .select('created_by')
    .eq('id', meritId)
    .single()

  if (!merit || merit.created_by !== user.id) throw new Error('Not authorised')

  const { error } = await supabase
    .from('order_of_merit_entries')
    .delete()
    .eq('id', entryId)
    .eq('merit_id', meritId)

  if (error) throw new Error(`Failed to remove entry: ${error.message}`)
}

export async function updateMultiplier(meritId: string, entryId: string, multiplier: number): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: merit } = await supabase
    .from('order_of_merits')
    .select('created_by')
    .eq('id', meritId)
    .single()

  if (!merit || merit.created_by !== user.id) throw new Error('Not authorised')

  const { error } = await supabase
    .from('order_of_merit_entries')
    .update({ points_multiplier: multiplier })
    .eq('id', entryId)
    .eq('merit_id', meritId)

  if (error) throw new Error(`Failed to update multiplier: ${error.message}`)
}

export async function completeMerit(meritId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('order_of_merits')
    .update({ status: 'completed' })
    .eq('id', meritId)
    .eq('created_by', user.id)

  if (error) throw new Error(`Failed to complete merit: ${error.message}`)
}

export async function reopenMerit(meritId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('order_of_merits')
    .update({ status: 'active' })
    .eq('id', meritId)
    .eq('created_by', user.id)

  if (error) throw new Error(`Failed to reopen merit: ${error.message}`)
}
