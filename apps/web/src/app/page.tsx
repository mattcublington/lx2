import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', background: '#FAFBF8', padding: '24px' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <h1 style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1, margin: '0 0 8px' }}>
          LX<span style={{ color: '#1D9E75' }}>2</span>
        </h1>
        <p style={{ fontSize: 16, color: '#6b7280', margin: '0 0 36px' }}>
          Golf scoring, stats and society management
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {user ? (
            <Link href="/events/new"
              style={{ display: 'block', padding: '14px 0', background: '#1D9E75', color: '#fff', borderRadius: 12, fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>
              Create an event
            </Link>
          ) : (
            <Link href="/auth/login"
              style={{ display: 'block', padding: '14px 0', background: '#1D9E75', color: '#fff', borderRadius: 12, fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>
              Sign in to create an event
            </Link>
          )}
          <Link href="/score"
            style={{ display: 'block', padding: '14px 0', background: 'transparent', border: '1.5px solid #d1d5db', borderRadius: 12, fontSize: 15, fontWeight: 500, color: '#374151', textDecoration: 'none' }}>
            Quick score (no event)
          </Link>
        </div>

        {user && (
          <div style={{ marginTop: 20, fontSize: 13, color: '#9ca3af' }}>
            Signed in as {user.email}
          </div>
        )}
      </div>
    </main>
  )
}
