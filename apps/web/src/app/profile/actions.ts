'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(data: {
  displayName: string
  handicapIndex: number | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('users')
    .update({
      display_name: data.displayName.trim() || user.email!.split('@')[0],
      ...(data.handicapIndex !== null ? { handicap_index: data.handicapIndex } : {}),
    })
    .eq('id', user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/play')
  revalidatePath('/profile')
  return { ok: true }
}

export async function updateDistanceUnit(
  distanceUnit: 'yards' | 'metres'
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('users')
    .update({ distance_unit: distanceUnit })
    .eq('id', user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/profile')
  return { ok: true }
}

export async function updateAvatarUrl(
  avatarUrl: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('users')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/play')
  revalidatePath('/profile')
  return { ok: true }
}
