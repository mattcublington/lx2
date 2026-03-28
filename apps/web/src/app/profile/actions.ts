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
    .upsert({
      id: user.id,
      email: user.email!,
      display_name: data.displayName.trim() || user.email!.split('@')[0],
      ...(data.handicapIndex !== null ? { handicap_index: data.handicapIndex } : {}),
    }, { onConflict: 'id', ignoreDuplicates: false })

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
    .upsert({ id: user.id, email: user.email!, distance_unit: distanceUnit }, { onConflict: 'id', ignoreDuplicates: false })

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
    .upsert({ id: user.id, email: user.email!, avatar_url: avatarUrl }, { onConflict: 'id', ignoreDuplicates: false })

  if (error) return { ok: false, error: error.message }
  revalidatePath('/play')
  revalidatePath('/profile')
  return { ok: true }
}
