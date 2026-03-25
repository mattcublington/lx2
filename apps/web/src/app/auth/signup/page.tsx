'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function getPasswordStrength(password: string): 'none' | 'weak' | 'medium' | 'strong' {
  if (!password) return 'none'
  let strength = 0
  if (password.length >= 8) strength++
  if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++
  if (password.match(/[0-9]/)) strength++
  if (password.match(/[^a-zA-Z0-9]/)) strength++
  if (strength <= 2) return 'weak'
  if (strength === 3) return 'medium'
  return 'strong'
}

function SignupForm() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/play'

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const supabase = createClient()
  const strength = getPasswordStrength(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${redirect}`,
      },
    })
    if (error) { setError(error.message) }
    else { setSuccess('Check your email to confirm your account, then sign in.') }
    setLoading(false)
  }

  return (
    <>
      <style>{`
        .signup-page {
          font-family: var(--font-lexend, 'Lexend', sans-serif);
          background: #F0F4EC;
          color: #1A1C1C;
          min-height: 100dvh;
          padding: 2.75rem;
          display: flex;
          flex-direction: column;
          max-width: 430px;
          margin: 0 auto;
          box-sizing: border-box;
        }

        .signup-back {
          width: 44px;
          height: 44px;
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 2rem;
          padding: 0;
          text-decoration: none;
          color: #1A1C1C;
          transition: transform 0.2s ease-in-out;
          flex-shrink: 0;
        }
        .signup-back:hover { transform: translateX(-2px); }

        .signup-header { margin-bottom: 2.5rem; }

        .signup-title {
          font-family: var(--font-manrope, 'Manrope', sans-serif);
          font-weight: 700;
          font-size: 32px;
          line-height: 1.2;
          color: #1A1C1C;
          margin: 0 0 0.5rem 0;
        }

        .signup-subhead {
          font-family: var(--font-lexend, 'Lexend', sans-serif);
          font-weight: 400;
          font-size: 16px;
          color: #44483E;
          line-height: 1.5;
          margin: 0;
        }

        .signup-form {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .input-group {
          margin-bottom: 1.4rem;
          transition: transform 0.2s ease-in-out;
        }

        .input-label {
          display: block;
          font-family: var(--font-lexend, 'Lexend', sans-serif);
          font-weight: 500;
          font-size: 14px;
          color: #1A1C1C;
          margin-bottom: 0.5rem;
        }

        .signup-input {
          width: 100%;
          padding: 16px;
          background: #ffffff;
          border: 1px solid rgba(26, 28, 28, 0.12);
          border-radius: 16px;
          font-family: var(--font-lexend, 'Lexend', sans-serif);
          font-size: 16px;
          color: #1A1C1C;
          outline: none;
          box-sizing: border-box;
          transition: all 0.2s ease-in-out;
        }
        .signup-input::placeholder { color: #72786E; }
        .signup-input:focus {
          border-color: #2D5016;
          box-shadow: 0 0 0 3px rgba(45, 80, 22, 0.1);
        }

        .strength-track {
          height: 4px;
          background: rgba(26, 28, 28, 0.08);
          border-radius: 2px;
          margin-top: 8px;
          overflow: hidden;
        }
        .strength-bar {
          height: 100%;
          width: 0%;
          border-radius: 2px;
          transition: all 0.3s ease-in-out;
        }
        .strength-bar.weak   { width: 33%; background: #923357; }
        .strength-bar.medium { width: 66%; background: #F59E0B; }
        .strength-bar.strong { width: 100%; background: #2D5016; }

        .terms-text {
          font-family: var(--font-lexend, 'Lexend', sans-serif);
          font-size: 13px;
          color: #72786E;
          line-height: 1.5;
          margin: 1.4rem 0 2rem;
        }
        .terms-text a {
          color: #923357;
          text-decoration: none;
          transition: opacity 0.2s ease-in-out;
        }
        .terms-text a:hover { opacity: 0.8; }

        .error-text {
          font-size: 13px;
          color: #dc2626;
          margin-bottom: 1rem;
          line-height: 1.4;
        }

        .success-box {
          padding: 16px 20px;
          background: #E8F5EE;
          border-radius: 12px;
          border: 1px solid rgba(45, 80, 22, 0.2);
          font-size: 14px;
          color: #1A2E1A;
          line-height: 1.5;
          margin-bottom: 1rem;
        }

        .cta-button {
          width: 100%;
          padding: 18px;
          background: #2D5016;
          color: #ffffff;
          border: none;
          border-radius: 16px;
          font-family: var(--font-manrope, 'Manrope', sans-serif);
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          margin-top: auto;
          transition: all 0.2s ease-in-out;
        }
        .cta-button:hover:not(:disabled) {
          background: #3D6B1A;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(45, 80, 22, 0.15);
        }
        .cta-button:active:not(:disabled) { transform: translateY(0); }
        .cta-button:disabled { background: #9ca3af; cursor: default; }

        .footer-link {
          text-align: center;
          margin-top: 1.5rem;
          font-family: var(--font-lexend, 'Lexend', sans-serif);
          font-size: 14px;
          color: #72786E;
        }
        .footer-link a {
          color: #1A1C1C;
          font-weight: 500;
          text-decoration: none;
          transition: color 0.2s ease-in-out;
        }
        .footer-link a:hover { color: #2D5016; }

        @media (max-width: 768px) {
          .signup-page { padding: 1.5rem 1.25rem; }
          .signup-title { font-size: 28px; }
        }
      `}</style>

      <div className="signup-page">
        <Link href="/auth/login" className="signup-back" aria-label="Go back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>

        <div className="signup-header">
          <h1 className="signup-title">Create account</h1>
          <p className="signup-subhead">Start your golf journey</p>
        </div>

        {success ? (
          <div className="signup-form">
            <div className="success-box">{success}</div>
            <Link href="/auth/login" className="cta-button" style={{ textDecoration: 'none', textAlign: 'center', display: 'block', marginTop: 0 }}>
              Sign in
            </Link>
          </div>
        ) : (
          <form className="signup-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label" htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                type="text"
                className="signup-input"
                placeholder="Enter your full name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                onFocus={e => { (e.currentTarget.closest('.input-group') as HTMLElement).style.transform = 'translateY(-1px)' }}
                onBlur={e => { (e.currentTarget.closest('.input-group') as HTMLElement).style.transform = 'translateY(0)' }}
                required
                autoFocus
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="signup-input"
                placeholder="your.email@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={e => { (e.currentTarget.closest('.input-group') as HTMLElement).style.transform = 'translateY(-1px)' }}
                onBlur={e => { (e.currentTarget.closest('.input-group') as HTMLElement).style.transform = 'translateY(0)' }}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="signup-input"
                placeholder="Create a strong password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={e => { (e.currentTarget.closest('.input-group') as HTMLElement).style.transform = 'translateY(-1px)' }}
                onBlur={e => { (e.currentTarget.closest('.input-group') as HTMLElement).style.transform = 'translateY(0)' }}
                required
                minLength={8}
              />
              <div className="strength-track">
                <div className={`strength-bar${strength === 'none' ? '' : ` ${strength}`}`} />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                className="signup-input"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onFocus={e => { (e.currentTarget.closest('.input-group') as HTMLElement).style.transform = 'translateY(-1px)' }}
                onBlur={e => { (e.currentTarget.closest('.input-group') as HTMLElement).style.transform = 'translateY(0)' }}
                required
              />
            </div>

            <p className="terms-text">
              By creating an account, you agree to our <a href="#">Terms</a> and <a href="#">Privacy Policy</a>
            </p>

            {error && <div className="error-text">{error}</div>}

            <button
              type="submit"
              className="cta-button"
              disabled={loading || !fullName || !email || !password || !confirmPassword}
            >
              {loading ? '…' : 'Create account'}
            </button>

            <p className="footer-link">
              Already have an account?{' '}
              <Link href="/auth/login">Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
