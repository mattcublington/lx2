import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileClient from './ProfileClient'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('display_name, handicap_index, created_at, avatar_url, distance_unit, is_admin')
    .eq('id', user.id)
    .single()

  return (
    <ProfileClient
      userId={user.id}
      email={user.email ?? ''}
      displayName={profile?.display_name ?? user.email?.split('@')[0] ?? ''}
      handicapIndex={profile?.handicap_index ?? null}
      memberSince={profile?.created_at ?? user.created_at ?? null}
      avatarUrl={profile?.avatar_url ?? null}
      distanceUnit={(profile?.distance_unit as 'yards' | 'metres') ?? 'yards'}
      isAdmin={(profile as { is_admin?: boolean } | null)?.is_admin ?? false}
    />
  )
}
