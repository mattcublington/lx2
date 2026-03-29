import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: Partial<ResponseCookie> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            options ? supabaseResponse.cookies.set(name, value, options) : supabaseResponse.cookies.set(name, value)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Protect organiser routes
  const isProtected =
    pathname.startsWith('/events/new') ||
    pathname.startsWith('/tournaments/new') ||
    pathname.startsWith('/merit/new') ||
    /^\/tournaments\/[^/]+\/manage(\/|$)/.test(pathname) ||
    /^\/merit\/[^/]+\/manage(\/|$)/.test(pathname)

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/events/new',
    '/events/:id/manage',
    '/tournaments/new',
    '/tournaments/:id/manage',
    '/merit/new',
    '/merit/:id/manage',
  ],
}
