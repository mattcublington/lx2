'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/events/new'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${redirect}`,
      },
    })
    if (error) { setError(error.message); setLoading(false); return }
    setSent(true)
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: '48px 24px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>
          LX<span style={{ color: '#1D9E75' }}>2</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 600, marginTop: 24, color: '#111' }}>Sign in</div>
        <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
          We&apos;ll send you a magic link — no password needed.
        </div>
      </div>

      {sent ? (
        <div style={{ padding: '16px 20px', background: '#E8F5EE', borderRadius: 12, border: '1px solid #1D9E7540' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1D9E75' }}>Check your email</div>
          <div style={{ fontSize: 13, color: '#374151', marginTop: 4 }}>
            We sent a link to <strong>{email}</strong>. Tap it to sign in.
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              Email address
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required autoFocus
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #d1d5db', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          {error && <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 12 }}>{error}</div>}
          <button type="submit" disabled={loading || !email}
            style={{ width: '100%', padding: '13px 0', background: loading || !email ? '#9ca3af' : '#1D9E75', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: loading || !email ? 'default' : 'pointer' }}>
            {loading ? 'Sending…' : 'Send magic link'}
          </button>
        </form>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
