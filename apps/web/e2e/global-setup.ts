/**
 * Runs once before all tests in the 'chromium' project.
 * Authenticates directly via the Supabase REST API, injects the session as
 * cookies, then saves browser storage state to e2e/.auth/user.json so every
 * test starts already authenticated.
 *
 * Requirements:
 *   - E2E_EMAIL and E2E_PASSWORD env vars (a dedicated test account in Supabase)
 *   - NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env vars
 */
import { test as setup, expect } from '@playwright/test'
import path from 'path'

const AUTH_FILE = path.join(__dirname, '.auth/user.json')

setup('authenticate', async ({ page }) => {
  const email = process.env.E2E_EMAIL
  const password = process.env.E2E_PASSWORD
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!email || !password) {
    throw new Error(
      'E2E_EMAIL and E2E_PASSWORD must be set.\n' +
      'Create a dedicated test account in Supabase and add these to .env.local or your CI secrets.'
    )
  }
  if (!supabaseUrl || !anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.')
  }

  // Call Supabase auth API directly — avoids React event issues in UI-driven login
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anonKey },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Supabase sign-in failed (${res.status}): ${body}`)
  }

  const session = await res.json() as {
    access_token: string
    refresh_token: string
    token_type: string
    expires_in: number
    expires_at: number
    user: Record<string, unknown>
  }

  // @supabase/ssr stores the session in a cookie named sb-<project-ref>-auth-token
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  const cookieName = `sb-${projectRef}-auth-token`
  const cookieValue = JSON.stringify({
    access_token: session.access_token,
    token_type: session.token_type,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    refresh_token: session.refresh_token,
    user: session.user,
  })

  // Navigate first so cookies are scoped to localhost
  await page.goto('/')

  await page.context().addCookies([{
    name: cookieName,
    value: cookieValue,
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
  }])

  // Confirm the app accepts the session by loading a protected route
  await page.goto('/play')
  await expect(page).toHaveURL(/\/play/, { timeout: 15_000 })

  await page.context().storageState({ path: AUTH_FILE })
})
