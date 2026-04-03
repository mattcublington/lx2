import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/admin/scorecards')

  // is_admin added by migration 013 — cast needed until types regenerated
  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!(profile as { is_admin?: boolean } | null)?.is_admin) {
    redirect('/play')
  }

  return <>{children}</>
}
