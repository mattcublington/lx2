import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import JoinRoundFlow from './JoinRoundFlow'

interface PageProps {
  searchParams: Promise<{ code?: string }>
}

export default async function JoinRoundPage({ searchParams }: PageProps) {
  const { code } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch display name and handicap from profile
  const { data: profile } = await supabase
    .from('users')
    .select('display_name, handicap_index')
    .eq('id', user.id)
    .single()

  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'You'
  const handicapIndex = profile?.handicap_index != null ? Number(profile.handicap_index) : null

  return (
    <JoinRoundFlow
      userId={user.id}
      displayName={displayName}
      handicapIndex={handicapIndex}
      initialCode={code?.toUpperCase()}
    />
  )
}
