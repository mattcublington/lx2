import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') ?? '/play'

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    // Upsert display_name from Google metadata on first sign-in
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const fullName = user.user_metadata?.full_name as string | undefined
      await supabase.from('users').upsert({
        id: user.id,
        email: user.email,
        ...(fullName ? { display_name: fullName } : {}),
      }, { onConflict: 'id', ignoreDuplicates: false })
    }
  }

  return NextResponse.redirect(`${origin}${redirect}`)
}
