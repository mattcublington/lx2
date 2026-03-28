import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Verifies the current user is authenticated and is the organiser of the
 * given event. Returns the admin client (service_role) and user ID.
 *
 * Centralises the auth + ownership check that every organiser action repeats.
 * Throws 'Not authenticated' or 'Not authorised' on failure.
 */
export async function assertEventOrganiser(eventId: string): Promise<{
  admin: SupabaseClient
  userId: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: event } = await admin
    .from('events')
    .select('created_by')
    .eq('id', eventId)
    .single()

  if (!event || event.created_by !== user.id) throw new Error('Not authorised')

  return { admin, userId: user.id }
}
