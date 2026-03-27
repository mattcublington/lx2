import { createClient } from '@/lib/supabase/server'
import HomePageClient from './HomePageClient'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const name = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? null
  const userInitial = name ? name.charAt(0).toUpperCase() : null

  return <HomePageClient userInitial={userInitial} />
}
