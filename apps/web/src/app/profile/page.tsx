import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileClient from './ProfileClient'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('display_name, handicap_index')
    .eq('id', user.id)
    .single()

  return (
    <ProfileClient
      userId={user.id}
      email={user.email ?? ''}
      displayName={profile?.display_name ?? user.email?.split('@')[0] ?? ''}
      handicapIndex={profile?.handicap_index ?? null}
    />
  )
}
