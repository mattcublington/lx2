'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateProfile } from './actions'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
  email: string
  displayName: string
  handicapIndex: number | null
  memberSince: string | null
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function formatMemberSince(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export default function ProfileClient({ email, displayName, handicapIndex, memberSince }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState(displayName)
  const [hcp, setHcp] = useState<string>(handicapIndex !== null ? String(handicapIndex) : '')
  const [saved, setSaved] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const isDirty = name !== displayName || hcp !== (handicapIndex !== null ? String(handicapIndex) : '')

  const handleSave = () => {
    setErrorMsg(null)
    setSaved(false)
    const parsedHcp = hcp.trim() === '' ? null : parseFloat(hcp)
    startTransition(async () => {
      const result = await updateProfile({ displayName: name, handicapIndex: parsedHcp })
      if (result.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      } else {
        setErrorMsg(result.error)
      }
    })
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const initials = getInitials(name || email)

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }

        .profile-wrap {
          min-height: 100dvh;
          background: #F2F5F0;
          font-family: var(--font-dm-sans, 'DM Sans', system-ui, sans-serif);
          color: #1A2E1A;
        }

        /* ── App header ── */
        .profile-header {
          background: #0a1f0a;
          background-image:
            radial-gradient(ellipse 60% 80% at 20% 50%, rgba(13,99,27,0.35) 0%, transparent 70%),
            radial-gradient(ellipse 40% 60% at 80% 30%, rgba(13,99,27,0.2) 0%, transparent 60%);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .profile-header-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 32px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .back-link {
          display: flex;
          align-items: center;
          gap: 6px;
          color: rgba(255,255,255,0.7);
          font-size: 0.875rem;
          font-weight: 500;
          text-decoration: none;
          transition: color 0.15s;
        }
        .back-link:hover { color: #fff; }
        .back-arrow {
          width: 18px;
          height: 18px;
          border-left: 2px solid currentColor;
          border-bottom: 2px solid currentColor;
          transform: rotate(45deg);
          flex-shrink: 0;
        }

        .header-title {
          font-family: var(--font-dm-serif, 'DM Serif Display', Georgia, serif);
          font-size: 1.125rem;
          font-weight: 400;
          color: #fff;
          letter-spacing: -0.01em;
          margin: 0;
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
        }

        /* ── Page body ── */
        .profile-body {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 32px 80px;
        }

        /* Two-col layout: avatar card left, form right */
        .profile-layout {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 24px;
          align-items: start;
        }

        /* ── Avatar / identity card ── */
        .identity-card {
          background: #fff;
          border: 1.5px solid #E0EBE0;
          border-radius: 18px;
          padding: 28px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
          text-align: center;
        }

        .avatar-ring {
          width: 80px;
          height: 80px;
          border-radius: 9999px;
          background: linear-gradient(135deg, #0D631B 0%, #1a7a2e 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          box-shadow: 0 4px 20px rgba(13,99,27,0.25);
        }

        .avatar-initials {
          font-family: var(--font-dm-sans, 'DM Sans', system-ui, sans-serif);
          font-size: 1.625rem;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.02em;
        }

        .identity-name {
          font-family: var(--font-dm-serif, 'DM Serif Display', Georgia, serif);
          font-size: 1.25rem;
          font-weight: 400;
          color: #1A2E1A;
          margin: 0 0 4px;
          letter-spacing: -0.01em;
          word-break: break-word;
        }

        .identity-email {
          font-size: 0.8125rem;
          color: #6B8C6B;
          word-break: break-all;
          margin: 0 0 20px;
        }

        .identity-divider {
          width: 100%;
          border: none;
          border-top: 1.5px solid #E0EBE0;
          margin: 0 0 20px;
        }

        .stat-row {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .stat-label {
          font-size: 0.8125rem;
          color: #6B8C6B;
          font-weight: 400;
        }

        .stat-value {
          font-size: 0.9375rem;
          color: #1A2E1A;
          font-weight: 600;
          letter-spacing: -0.01em;
        }

        .hcp-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #F2F5F0;
          border: 1.5px solid #E0EBE0;
          border-radius: 8px;
          padding: 3px 10px;
          font-size: 0.9375rem;
          font-weight: 700;
          color: #0D631B;
          letter-spacing: -0.01em;
        }

        /* ── Form panel ── */
        .form-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-section-title {
          font-family: var(--font-dm-serif, 'DM Serif Display', Georgia, serif);
          font-size: 1.375rem;
          font-weight: 400;
          color: #1A2E1A;
          letter-spacing: -0.02em;
          margin: 0 0 4px;
        }

        .form-section-sub {
          font-size: 0.875rem;
          color: #6B8C6B;
          margin: 0 0 8px;
        }

        .form-card {
          background: #fff;
          border: 1.5px solid #E0EBE0;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field-label {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #374151;
          letter-spacing: 0.01em;
        }

        .field-input {
          width: 100%;
          border: 1.5px solid #E0EBE0;
          border-radius: 10px;
          padding: 12px 14px;
          font-family: var(--font-dm-sans, 'DM Sans', system-ui, sans-serif);
          font-size: 0.9375rem;
          color: #1A2E1A;
          background: #fff;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          appearance: none;
        }
        .field-input:focus {
          border-color: #0D631B;
          box-shadow: 0 0 0 3px rgba(13,99,27,0.1);
        }
        .field-input::placeholder { color: #9aaa9a; }

        .field-input-readonly {
          background: #fafafa;
          color: #9aaa9a;
          cursor: default;
        }

        .field-hint {
          font-size: 0.75rem;
          color: #9aaa9a;
          line-height: 1.5;
        }

        .field-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        /* ── Actions ── */
        .actions-bar {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn-save {
          flex: 1;
          background: #0D631B;
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 14px 24px;
          font-family: var(--font-dm-sans, 'DM Sans', system-ui, sans-serif);
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: -0.01em;
          transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
        }
        .btn-save:hover:not(:disabled) {
          background: #0a4f15;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(13,99,27,0.25);
        }
        .btn-save:disabled { background: #5a9e66; cursor: not-allowed; }

        .save-feedback {
          font-size: 0.875rem;
          font-weight: 600;
          color: #0D631B;
          opacity: 0;
          transition: opacity 0.3s;
          white-space: nowrap;
        }
        .save-feedback.visible { opacity: 1; }

        .error-msg {
          color: #dc2626;
          font-size: 0.875rem;
          margin: 0;
        }

        /* ── Danger zone ── */
        .danger-card {
          background: #fff;
          border: 1.5px solid #E0EBE0;
          border-radius: 16px;
          padding: 24px;
        }

        .danger-label {
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #9aaa9a;
          margin: 0 0 14px;
        }

        .btn-signout {
          background: #fff;
          color: #1A2E1A;
          border: 1.5px solid #E0EBE0;
          border-radius: 12px;
          padding: 13px 24px;
          font-family: var(--font-dm-sans, 'DM Sans', system-ui, sans-serif);
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: -0.01em;
          transition: border-color 0.15s, color 0.15s;
          width: 100%;
          text-align: center;
        }
        .btn-signout:hover { border-color: #dc2626; color: #dc2626; }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .profile-header-inner { padding: 0 20px; }
          .profile-body { padding: 24px 16px 60px; }
          .profile-layout { grid-template-columns: 1fr; }
          .identity-card { flex-direction: row; text-align: left; gap: 16px; padding: 20px; border-radius: 14px; flex-wrap: wrap; }
          .avatar-ring { width: 56px; height: 56px; flex-shrink: 0; margin-bottom: 0; }
          .avatar-initials { font-size: 1.125rem; }
          .identity-info { flex: 1; min-width: 0; }
          .identity-name { font-size: 1.0625rem; }
          .identity-divider { display: none; }
          .stat-row { display: none; }
          .field-row-2 { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="profile-wrap">
        {/* ── Header ── */}
        <header className="profile-header">
          <div className="profile-header-inner" style={{ position: 'relative' }}>
            <Link href="/play" className="back-link">
              <span className="back-arrow" />
              Dashboard
            </Link>
            <h1 className="header-title">My Profile</h1>
          </div>
        </header>

        {/* ── Body ── */}
        <main className="profile-body">
          <div className="profile-layout">

            {/* Left — identity card */}
            <aside className="identity-card">
              <div className="avatar-ring">
                <span className="avatar-initials">{initials}</span>
              </div>
              <div className="identity-info">
                <p className="identity-name">{name || '—'}</p>
                <p className="identity-email">{email}</p>
              </div>
              <hr className="identity-divider" />
              <div className="stat-row">
                <div className="stat-item">
                  <span className="stat-label">Handicap</span>
                  {hcp ? (
                    <span className="hcp-badge">{parseFloat(hcp).toFixed(1)}</span>
                  ) : (
                    <span className="stat-value" style={{ color: '#9aaa9a' }}>Not set</span>
                  )}
                </div>
                <div className="stat-item">
                  <span className="stat-label">Member since</span>
                  <span className="stat-value">{formatMemberSince(memberSince)}</span>
                </div>
              </div>
            </aside>

            {/* Right — form panel */}
            <div className="form-panel">
              <div>
                <h2 className="form-section-title">Profile details</h2>
                <p className="form-section-sub">Update your name and playing details</p>
              </div>

              <div className="form-card">
                {/* Display name */}
                <div className="field-group">
                  <label htmlFor="display-name" className="field-label">Display name</label>
                  <input
                    id="display-name"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your name"
                    className="field-input"
                    autoComplete="name"
                  />
                  <span className="field-hint">How you appear in rounds and on leaderboards</span>
                </div>

                {/* Handicap + Email side by side */}
                <div className="field-row-2">
                  <div className="field-group">
                    <label htmlFor="handicap-index" className="field-label">Handicap Index</label>
                    <input
                      id="handicap-index"
                      type="number"
                      step={0.1}
                      min={0}
                      max={54}
                      value={hcp}
                      onChange={e => setHcp(e.target.value)}
                      placeholder="e.g. 14.2"
                      className="field-input"
                    />
                    <span className="field-hint">Your WHS handicap index (0–54)</span>
                  </div>

                  <div className="field-group">
                    <span className="field-label">Email address</span>
                    <div className="field-input field-input-readonly">{email}</div>
                    <span className="field-hint">Managed via your Google account</span>
                  </div>
                </div>
              </div>

              {/* Save */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="actions-bar">
                  <button
                    onClick={handleSave}
                    disabled={isPending || !isDirty}
                    className="btn-save"
                  >
                    {isPending ? 'Saving…' : 'Save changes'}
                  </button>
                  <span className={`save-feedback${saved ? ' visible' : ''}`}>
                    ✓ Saved
                  </span>
                </div>
                {errorMsg && <p className="error-msg">{errorMsg}</p>}
              </div>

              {/* Account */}
              <div className="danger-card">
                <p className="danger-label">Account</p>
                <button onClick={handleSignOut} className="btn-signout">
                  Sign out
                </button>
              </div>
            </div>

          </div>
        </main>
      </div>
    </>
  )
}
