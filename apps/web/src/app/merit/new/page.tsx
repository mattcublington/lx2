import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NewMeritWizard from './NewMeritWizard'

export type WizardEvent = {
  id: string
  name: string
  date: string
  format: string
}

export type WizardTournament = {
  id: string
  name: string
  format: string
  roundCount: number
}

export default async function NewMeritPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/merit/new')

  const { data: profile } = await supabase
    .from('users')
    .select('display_name')
    .eq('id', user.id)
    .single()

  // Events owned by this user (finalised or upcoming)
  const { data: rawEvents } = await supabase
    .from('events')
    .select('id, name, date, format')
    .eq('created_by', user.id)
    .is('archived_at', null)
    .order('date', { ascending: false })

  // Tournaments owned by this user
  const { data: rawTournaments } = await supabase
    .from('tournaments')
    .select('id, name, format, events ( id )')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })

  type RawTournament = {
    id: string
    name: string
    format: string
    events: { id: string }[] | null
  }

  const wizardEvents: WizardEvent[] = (rawEvents ?? []).map(e => ({
    id: e.id as string,
    name: e.name as string,
    date: e.date as string,
    format: e.format as string,
  }))

  const wizardTournaments: WizardTournament[] = ((rawTournaments ?? []) as unknown as RawTournament[]).map(t => ({
    id: t.id,
    name: t.name,
    format: t.format,
    roundCount: (t.events ?? []).length,
  }))

  return (
    <NewMeritWizard
      displayName={profile?.display_name ?? user.email?.split('@')[0] ?? 'Organiser'}
      events={wizardEvents}
      tournaments={wizardTournaments}
    />
  )
}
