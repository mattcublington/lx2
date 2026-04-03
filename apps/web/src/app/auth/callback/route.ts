import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') ?? '/play'

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    // Upsert display_name from Google metadata on first sign-in.
    // Uses service_role: public.users has no INSERT policy (writes are
    // restricted to server-side admin actions per 001_rls_policies.sql).
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const fullName = user.user_metadata?.full_name as string | undefined
      const admin = createAdminClient()

      // Check if the user row already exists.
      // If it does, only update the email (never overwrite a custom display_name).
      // If it doesn't, insert with the Google full_name as the initial display_name.
      const { data: existing } = await admin
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      if (!existing) {
        await admin.from('users').insert({
          id: user.id,
          email: user.email,
          ...(fullName ? { display_name: fullName } : {}),
        })
      } else {
        // Existing user — only sync email in case it changed; leave display_name untouched
        await admin.from('users').update({ email: user.email }).eq('id', user.id)
      }
    }
  }

  return NextResponse.redirect(`${origin}${redirect}`)
}
