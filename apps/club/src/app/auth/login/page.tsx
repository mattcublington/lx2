'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/dashboard'
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      window.location.href = redirect
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: 32 }}>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#F1F5F9', margin: '0 0 8px' }}>Club Console</h1>
          <p style={{ color: '#94A3B8', margin: 0, fontSize: 14 }}>Run your club better.</p>
        </div>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid #334155', background: '#1E293B', color: '#F1F5F9', fontSize: 15 }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid #334155', background: '#1E293B', color: '#F1F5F9', fontSize: 15 }}
          />
          {error && <p style={{ color: '#F87171', fontSize: 14, margin: 0 }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '12px 16px', borderRadius: 8, background: '#2563EB', color: '#fff', fontWeight: 600, fontSize: 15, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
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
