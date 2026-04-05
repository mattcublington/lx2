'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
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
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)')
    setIsStandalone(mq.matches || (navigator as unknown as { standalone?: boolean }).standalone === true)
  }, [])

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

  // ── PWA standalone: native app sign-in ──────────────────────────────────────
  if (isStandalone) {
    return (
      <>
        <style>{`
          .pwa-auth {
            min-height: 100dvh;
            background: #F0F4EC;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem 1.5rem;
            padding-top: env(safe-area-inset-top, 0);
            padding-bottom: env(safe-area-inset-bottom, 0);
            font-family: var(--font-dm-sans, 'DM Sans', sans-serif);
            color: #1A2E1A;
            overflow: hidden;
          }

          .pwa-auth-inner {
            width: 100%;
            max-width: 360px;
            display: flex;
            flex-direction: column;
            align-items: center;
            opacity: 0;
            animation: pwa-fade-in 0.5s ease forwards 0.05s;
          }

          @keyframes pwa-fade-in {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .pwa-logo {
            margin-bottom: 1rem;
          }

          .pwa-welcome {
            font-family: var(--font-dm-serif, 'DM Serif Display', serif);
            font-size: 1.75rem;
            font-weight: 400;
            color: #1A2E1A;
            margin-bottom: 0.375rem;
            text-align: center;
          }

          .pwa-subtitle {
            font-family: var(--font-dm-sans, 'DM Sans', sans-serif);
            font-size: 0.9375rem;
            font-weight: 400;
            color: #6B8C6B;
            margin-bottom: 2.5rem;
            text-align: center;
          }

          .pwa-google-btn {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 14px 20px;
            background: #fff;
            color: #1A2E1A;
            border: 1px solid #E0EBE0;
            border-radius: 12px;
            font-family: var(--font-dm-sans, 'DM Sans', sans-serif);
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(26, 28, 28, 0.06);
            transition: transform 0.15s ease, box-shadow 0.15s ease;
          }
          .pwa-google-btn:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 16px rgba(26, 28, 28, 0.12);
          }
          .pwa-google-btn:active:not(:disabled) { transform: translateY(0); }
          .pwa-google-btn:disabled { opacity: 0.6; cursor: default; }

          .pwa-divider {
            display: flex;
            align-items: center;
            gap: 1rem;
            width: 100%;
            margin: 1.5rem 0;
          }
          .pwa-divider-line {
            flex: 1;
            height: 1px;
            background: #E0EBE0;
          }
          .pwa-divider-text {
            font-size: 0.8125rem;
            color: #6B8C6B;
          }

          .pwa-form-group {
            width: 100%;
            margin-bottom: 1rem;
          }

          .pwa-label {
            display: block;
            font-size: 0.8125rem;
            font-weight: 500;
            color: #1A2E1A;
            margin-bottom: 6px;
          }

          .pwa-input {
            width: 100%;
            padding: 12px 14px;
            background: #ffffff;
            border: 1px solid #E0EBE0;
            border-radius: 12px;
            color: #1A2E1A;
            font-family: var(--font-dm-sans, 'DM Sans', sans-serif);
            font-size: 1rem;
            outline: none;
            box-sizing: border-box;
            transition: border-color 0.15s, box-shadow 0.15s;
          }
          .pwa-input::placeholder { color: #6B8C6B; }
          .pwa-input:focus {
            border-color: #0D631B;
            box-shadow: 0 0 0 3px rgba(13, 99, 27, 0.08);
          }

          .pwa-submit-btn {
            width: 100%;
            padding: 14px 20px;
            background: #0D631B;
            color: #fff;
            border: none;
            border-radius: 12px;
            font-family: var(--font-dm-sans, 'DM Sans', sans-serif);
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            margin-top: 0.5rem;
            transition: background 0.15s, transform 0.15s;
          }
          .pwa-submit-btn:hover:not(:disabled) {
            background: #0a4f15;
            transform: translateY(-1px);
          }
          .pwa-submit-btn:active:not(:disabled) { transform: translateY(0); }
          .pwa-submit-btn:disabled { background: #9ca3af; cursor: default; }

          .pwa-error {
            width: 100%;
            font-size: 0.8125rem;
            color: #dc2626;
            margin-bottom: 10px;
            line-height: 1.4;
          }

          .pwa-success {
            width: 100%;
            padding: 14px 18px;
            background: #E8F5EE;
            border: 1px solid rgba(13, 99, 27, 0.2);
            border-radius: 12px;
            font-size: 0.875rem;
            color: #1A2E1A;
            line-height: 1.5;
          }

          .pwa-toggle {
            margin-top: 1.5rem;
            text-align: center;
          }
          .pwa-toggle-btn {
            font-family: var(--font-dm-sans, 'DM Sans', sans-serif);
            font-size: 0.875rem;
            font-weight: 500;
            color: #0D631B;
            background: none;
            border: none;
            cursor: pointer;
            padding: 0;
            transition: opacity 0.15s;
          }
          .pwa-toggle-btn:hover { opacity: 0.8; }

          .pwa-hint {
            font-size: 0.75rem;
            color: #6B8C6B;
            margin-top: 4px;
          }
        `}</style>

        <div className="pwa-auth">
          <div className="pwa-auth-inner">
            <div className="pwa-logo">
              <Image
                src="/lx2-logo.svg"
                alt="LX2"
                width={120}
                height={60}
                style={{ height: '48px', width: 'auto' }}
                priority
              />
            </div>

            <h1 className="pwa-welcome">
              {mode === 'signin' ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="pwa-subtitle">
              {mode === 'signin' ? 'Sign in to continue' : 'Get started with LX2'}
            </p>

            {success ? (
              <div className="pwa-success">{success}</div>
            ) : (
              <>
                <button
                  className="pwa-google-btn"
                  onClick={handleGoogle}
                  disabled={googleLoading}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
                  </svg>
                  {googleLoading ? 'Redirecting...' : 'Continue with Google'}
                </button>

                <div className="pwa-divider">
                  <div className="pwa-divider-line" />
                  <span className="pwa-divider-text">or</span>
                  <div className="pwa-divider-line" />
                </div>

                <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                  <div className="pwa-form-group">
                    <label className="pwa-label" htmlFor="pwa-email">Email</label>
                    <input
                      id="pwa-email"
                      type="email"
                      className="pwa-input"
                      placeholder="your@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="pwa-form-group">
                    <label className="pwa-label" htmlFor="pwa-password">Password</label>
                    <input
                      id="pwa-password"
                      type="password"
                      className="pwa-input"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={mode === 'signup' ? 8 : undefined}
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    />
                    {mode === 'signup' && (
                      <div className="pwa-hint">Minimum 8 characters</div>
                    )}
                  </div>

                  {error && <div className="pwa-error">{error}</div>}

                  <button
                    type="submit"
                    className="pwa-submit-btn"
                    disabled={loading || !email || !password}
                  >
                    {loading ? '...' : mode === 'signin' ? 'Sign in' : 'Create account'}
                  </button>
                </form>
              </>
            )}

            <div className="pwa-toggle">
              {mode === 'signin' ? (
                <button
                  className="pwa-toggle-btn"
                  onClick={() => { setMode('signup'); setError(''); setSuccess('') }}
                >
                  Create account
                </button>
              ) : (
                <button
                  className="pwa-toggle-btn"
                  onClick={() => { setMode('signin'); setError(''); setSuccess('') }}
                >
                  Already have an account? Sign in
                </button>
              )}
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Browser: standard login page ────────────────────────────────────────────
  return (
    <>
      <style>{`
        .auth-page {
          min-height: 100dvh;
          background: #F0F4EC;
          display: flex;
          flex-direction: column;
          font-family: var(--font-lexend, 'Lexend', sans-serif);
          color: #1A2E1A;
        }

        .auth-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem 2.75rem;
        }

        .auth-back-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          cursor: pointer;
          transition: transform 0.2s ease-in-out;
          text-decoration: none;
          color: #1A2E1A;
        }
        .auth-back-btn:hover { transform: translateX(-2px); }

        .auth-logo {
          text-decoration: none;
          display: flex;
          align-items: center;
        }

        .auth-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 2.75rem;
        }

        .auth-container {
          width: 100%;
          max-width: 400px;
        }

        .auth-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 2.5rem 2rem;
          box-shadow: 0px 8px 24px rgba(26, 28, 28, 0.06);
        }

        .auth-title {
          font-family: var(--font-manrope, 'Manrope', sans-serif);
          font-weight: 700;
          font-size: 2rem;
          color: #1A2E1A;
          margin: 0 0 2rem 0;
          letter-spacing: -0.02em;
        }

        .form-group { margin-bottom: 1.5rem; }

        .form-label {
          font-family: var(--font-lexend, 'Lexend', sans-serif);
          font-weight: 500;
          font-size: 0.875rem;
          color: #1A2E1A;
          display: block;
          margin-bottom: 0.5rem;
        }

        .form-input {
          width: 100%;
          font-family: var(--font-lexend, 'Lexend', sans-serif);
          font-weight: 400;
          font-size: 1rem;
          padding: 0.875rem 1rem;
          border: 1px solid rgba(26, 28, 28, 0.12);
          border-radius: 12px;
          background: #ffffff;
          color: #1A2E1A;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        }
        .form-input::placeholder { color: #72786E; }
        .form-input:focus {
          border-color: #0D631B;
          box-shadow: 0 0 0 3px rgba(13, 99, 27, 0.08);
        }

        .hint-text {
          font-size: 0.75rem;
          color: #72786E;
          margin-top: 4px;
        }

        .forgot-password {
          text-align: right;
          margin-top: 0.75rem;
          margin-bottom: 2rem;
        }
        .forgot-password a {
          font-family: var(--font-lexend, 'Lexend', sans-serif);
          font-weight: 400;
          font-size: 0.875rem;
          color: #923357;
          text-decoration: none;
          transition: opacity 0.2s ease-in-out;
        }
        .forgot-password a:hover { opacity: 0.8; }

        .btn {
          width: 100%;
          font-family: var(--font-lexend, 'Lexend', sans-serif);
          font-weight: 500;
          font-size: 1rem;
          padding: 1rem;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out, background-color 0.2s ease-in-out;
        }
        .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .btn:active:not(:disabled) { transform: translateY(0); }

        .btn-primary {
          background: #0D631B;
          color: #ffffff;
          margin-bottom: 1.5rem;
        }
        .btn-primary:hover:not(:disabled) { background: #0a4f15; }
        .btn-primary:disabled { background: #9ca3af; cursor: default; }

        .btn-google {
          background: #1A2E1A;
          color: #ffffff;
        }
        .btn-google:hover:not(:disabled) { background: #2D2F2F; }
        .btn-google:disabled { opacity: 0.6; cursor: default; }

        .divider {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin: 1.5rem 0;
        }
        .divider-line {
          flex: 1;
          height: 1px;
          background: rgba(26, 28, 28, 0.08);
        }
        .divider-text {
          font-family: var(--font-lexend, 'Lexend', sans-serif);
          font-weight: 400;
          font-size: 0.875rem;
          color: #72786E;
        }

        .success-box {
          padding: 16px 20px;
          background: #E8F5EE;
          border-radius: 12px;
          border: 1px solid rgba(13, 99, 27, 0.2);
          font-size: 0.875rem;
          color: #1A2E1A;
          line-height: 1.5;
        }

        .error-text {
          font-size: 0.8125rem;
          color: #dc2626;
          margin-bottom: 14px;
          line-height: 1.4;
        }

        .create-account {
          text-align: center;
          margin-top: 1.5rem;
        }
        .create-account-btn {
          font-family: var(--font-lexend, 'Lexend', sans-serif);
          font-weight: 500;
          font-size: 1rem;
          color: #0D631B;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          transition: opacity 0.2s ease-in-out;
        }
        .create-account-btn:hover { opacity: 0.8; }

        @media (max-width: 768px) {
          .auth-header { padding: 1.25rem 1.5rem; }
          .auth-main { padding: 1.5rem 1.5rem; }
          .auth-card { padding: 2rem 1.5rem; }
          .auth-title { font-size: 1.75rem; }
        }
      `}</style>

      <div className="auth-page">
        {/* Header */}
        <header className="auth-header">
          <Link href="/" className="auth-back-btn" aria-label="Go back">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <Link href="/" className="auth-logo" aria-label="LX2 home">
            <Image src="/lx2-logo.svg" alt="LX2" width={72} height={36} priority />
          </Link>
          <div style={{ width: 40 }} />
        </header>

        {/* Main */}
        <main className="auth-main">
          <div className="auth-container">
            <div className="auth-card">
              <h1 className="auth-title">
                {mode === 'signin' ? 'Sign in' : 'Create account'}
              </h1>

              {success ? (
                <div className="success-box">{success}</div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="email">Email</label>
                    <input
                      id="email"
                      type="email"
                      className="form-input"
                      placeholder="your@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="password">Password</label>
                    <input
                      id="password"
                      type="password"
                      className="form-input"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={mode === 'signup' ? 8 : undefined}
                    />
                    {mode === 'signup' && (
                      <div className="hint-text">Minimum 8 characters</div>
                    )}
                  </div>

                  {mode === 'signin' && (
                    <div className="forgot-password">
                      <a href="#">Forgot password?</a>
                    </div>
                  )}

                  {mode === 'signup' && <div style={{ marginBottom: '2rem' }} />}

                  {error && <div className="error-text">{error}</div>}

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || !email || !password}
                  >
                    {loading ? '...' : mode === 'signin' ? 'Sign in' : 'Create account'}
                  </button>

                  <div className="divider">
                    <div className="divider-line" />
                    <span className="divider-text">or</span>
                    <div className="divider-line" />
                  </div>

                  <button
                    type="button"
                    className="btn btn-google"
                    onClick={handleGoogle}
                    disabled={googleLoading}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18">
                      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
                    </svg>
                    {googleLoading ? 'Redirecting...' : 'Continue with Google'}
                  </button>
                </form>
              )}
            </div>

            {/* Toggle mode */}
            <div className="create-account">
              {mode === 'signin' ? (
                <button
                  className="create-account-btn"
                  onClick={() => { setMode('signup'); setError(''); setSuccess('') }}
                >
                  Create account
                </button>
              ) : (
                <button
                  className="create-account-btn"
                  onClick={() => { setMode('signin'); setError(''); setSuccess('') }}
                >
                  Already have an account? Sign in
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  )
}
