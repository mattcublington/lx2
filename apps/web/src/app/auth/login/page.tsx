'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function AuthForm() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/play'
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin'

  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const supabase = createClient()

  const handleGoogle = async () => {
    setGoogleLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${redirect}`,
      },
    })
    if (error) { setError(error.message); setGoogleLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${redirect}` },
      })
      if (error) { setError(error.message) }
      else { setSuccess('Check your email to confirm your account, then sign in.') }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message) }
      else { window.location.href = redirect }
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#F6FAF6',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Lexend', system-ui, sans-serif",
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
          <Link href="/">
            <Image src="/lx2-logo.svg" alt="LX2" height={40} width={80}
              style={{ filter: 'brightness(0) saturate(100%) invert(19%) sepia(44%) saturate(500%) hue-rotate(80deg) brightness(90%)' }}
            />
          </Link>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff',
          borderRadius: '1.5rem',
          padding: '36px 32px',
          boxShadow: '0 4px 32px rgba(0,0,0,0.07)',
          border: '1px solid #E0EBE0',
        }}>
          {/* Mode toggle */}
          <div style={{
            display: 'flex',
            background: '#F6FAF6',
            borderRadius: '9999px',
            padding: '4px',
            marginBottom: '28px',
            border: '1px solid #E0EBE0',
          }}>
            {(['signin', 'signup'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setSuccess('') }}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  border: 'none',
                  borderRadius: '9999px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  fontFamily: "'Lexend', sans-serif",
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: mode === m ? '#fff' : 'transparent',
                  color: mode === m ? '#1A2E1A' : '#6B8C6B',
                  boxShadow: mode === m ? '0 1px 6px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {m === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '12px 0',
              background: '#fff',
              border: '1.5px solid #d1d5db',
              borderRadius: '0.75rem',
              fontSize: '0.9375rem',
              fontWeight: 500,
              fontFamily: "'Lexend', sans-serif",
              color: '#374151',
              cursor: googleLoading ? 'default' : 'pointer',
              opacity: googleLoading ? 0.6 : 1,
              transition: 'border-color 0.15s, box-shadow 0.15s',
              marginBottom: '20px',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#9ca3af')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#d1d5db')}
          >
            {/* Google SVG */}
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
            </svg>
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', background: '#E0EBE0' }} />
            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: '#E0EBE0' }} />
          </div>

          {/* Email/password form */}
          {success ? (
            <div style={{
              padding: '16px 20px',
              background: '#E8F5EE',
              borderRadius: '0.75rem',
              border: '1px solid rgba(13,99,27,0.2)',
              fontSize: '0.875rem',
              color: '#1A2E1A',
              lineHeight: 1.5,
            }}>
              {success}
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    border: '1.5px solid #d1d5db',
                    borderRadius: '0.625rem',
                    fontSize: '0.9375rem',
                    fontFamily: "'Lexend', sans-serif",
                    color: '#1A2E1A',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#0D631B')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#d1d5db')}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Choose a password' : 'Your password'}
                  required
                  minLength={mode === 'signup' ? 8 : undefined}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    border: '1.5px solid #d1d5db',
                    borderRadius: '0.625rem',
                    fontSize: '0.9375rem',
                    fontFamily: "'Lexend', sans-serif",
                    color: '#1A2E1A',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#0D631B')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#d1d5db')}
                />
                {mode === 'signup' && (
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px' }}>Minimum 8 characters</div>
                )}
              </div>

              {error && (
                <div style={{ fontSize: '0.8125rem', color: '#dc2626', marginBottom: '14px', lineHeight: 1.4 }}>{error}</div>
              )}

              <button
                type="submit"
                disabled={loading || !email || !password}
                style={{
                  width: '100%',
                  padding: '13px 0',
                  background: loading || !email || !password ? '#9ca3af' : '#0D631B',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.75rem',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  fontFamily: "'Manrope', sans-serif",
                  cursor: loading || !email || !password ? 'default' : 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                {loading ? '…' : mode === 'signup' ? 'Create account' : 'Sign in'}
              </button>
            </form>
          )}
        </div>

        {/* Back link */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Link href="/" style={{ fontSize: '0.8125rem', color: '#6B8C6B', textDecoration: 'none' }}>
            ← Back to lx2.golf
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  )
}
