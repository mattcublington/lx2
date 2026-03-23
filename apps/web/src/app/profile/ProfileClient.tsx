'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateProfile } from './actions'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
  email: string
  displayName: string
  handicapIndex: number | null
}

export default function ProfileClient({ email, displayName, handicapIndex }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState(displayName)
  const [hcp, setHcp] = useState<string>(
    handicapIndex !== null ? String(handicapIndex) : ''
  )
  const [saved, setSaved] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSave = () => {
    setErrorMsg(null)
    setSaved(false)

    const parsedHcp = hcp.trim() === '' ? null : parseFloat(hcp)

    startTransition(async () => {
      const result = await updateProfile({
        displayName: name,
        handicapIndex: parsedHcp,
      })
      if (result.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
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

  // ── Styles ────────────────────────────────────────────────────────────────

  const wrapStyle: React.CSSProperties = {
    minHeight: '100dvh',
    background: '#F2F5F0',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    color: '#1A2E1A',
  }

  const innerStyle: React.CSSProperties = {
    maxWidth: 480,
    margin: '0 auto',
    paddingBottom: 'calc(40px + env(safe-area-inset-bottom))',
  }

  // Header
  const headerStyle: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    background: '#F2F5F0',
    borderBottom: '1px solid #E4EDE4',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
  }

  const backLinkStyle: React.CSSProperties = {
    color: '#0D631B',
    fontWeight: 600,
    fontSize: '0.9375rem',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    minWidth: 70,
  }

  const headerTitleStyle: React.CSSProperties = {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontWeight: 400,
    fontSize: '1.125rem',
    color: '#1A2E1A',
    letterSpacing: '-0.01em',
    margin: 0,
  }

  const spacerStyle: React.CSSProperties = {
    minWidth: 70,
  }

  // Content
  const contentStyle: React.CSSProperties = {
    padding: '24px 16px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  }

  // Card
  const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: '1.5px solid #E4EDE4',
    borderRadius: 14,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  }

  // Label
  const labelStyle: React.CSSProperties = {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#374151',
    marginBottom: 8,
    display: 'block',
  }

  // Input
  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1.5px solid #E4EDE4',
    borderRadius: 10,
    padding: '12px 14px',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: '1rem',
    color: '#1A2E1A',
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
    appearance: 'none',
  }

  // Muted note
  const noteStyle: React.CSSProperties = {
    color: '#9aaa9a',
    fontSize: '0.75rem',
    lineHeight: 1.5,
    margin: 0,
  }

  // Read-only email value
  const emailValueStyle: React.CSSProperties = {
    fontSize: '1rem',
    color: '#9aaa9a',
    padding: '12px 14px',
    border: '1.5px solid #E4EDE4',
    borderRadius: 10,
    background: '#fafafa',
    wordBreak: 'break-all',
  }

  // Save button
  const saveBtnStyle: React.CSSProperties = {
    width: '100%',
    background: isPending ? '#5a9e66' : '#0D631B',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '15px 20px',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: '1rem',
    fontWeight: 600,
    cursor: isPending ? 'not-allowed' : 'pointer',
    letterSpacing: '-0.01em',
    transition: 'background 0.15s',
  }

  // Saved confirmation
  const savedMsgStyle: React.CSSProperties = {
    color: '#0D631B',
    fontWeight: 600,
    fontSize: '0.875rem',
    textAlign: 'center',
    marginTop: 4,
    transition: 'opacity 0.3s',
    opacity: saved ? 1 : 0,
  }

  // Error message
  const errorStyle: React.CSSProperties = {
    color: '#dc2626',
    fontSize: '0.875rem',
    textAlign: 'center',
    marginTop: 4,
  }

  // Divider
  const dividerStyle: React.CSSProperties = {
    borderTop: '1.5px solid #E4EDE4',
    margin: '8px 0 0',
  }

  // Sign out button
  const signOutBtnStyle: React.CSSProperties = {
    width: '100%',
    background: '#fff',
    color: '#0D631B',
    border: '1.5px solid #0D631B',
    borderRadius: 12,
    padding: '15px 20px',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '-0.01em',
    transition: 'background 0.15s',
  }

  const dangerLabelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#9aaa9a',
    marginBottom: 12,
  }

  return (
    <>
      {/* Google Fonts */}
      <link
        rel="preconnect"
        href="https://fonts.googleapis.com"
      />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap"
        rel="stylesheet"
      />

      <div style={wrapStyle}>
        <div style={innerStyle}>

          {/* ── Sticky header ── */}
          <header style={headerStyle}>
            <a href="/play" style={backLinkStyle}>
              ← Back
            </a>
            <h1 style={headerTitleStyle}>My Profile</h1>
            <div style={spacerStyle} />
          </header>

          {/* ── Form content ── */}
          <div style={contentStyle}>

            {/* 1. Display name */}
            <div style={cardStyle}>
              <label htmlFor="display-name" style={labelStyle}>
                Your name
              </label>
              <input
                id="display-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Display name"
                style={inputStyle}
                autoComplete="name"
              />
              <p style={noteStyle}>
                This is how you appear in rounds and leaderboards
              </p>
            </div>

            {/* 2. Handicap Index */}
            <div style={cardStyle}>
              <label htmlFor="handicap-index" style={labelStyle}>
                Handicap Index
              </label>
              <input
                id="handicap-index"
                type="number"
                step={0.1}
                min={0}
                max={54}
                value={hcp}
                onChange={e => setHcp(e.target.value)}
                placeholder="e.g. 14.2"
                style={inputStyle}
              />
              <p style={noteStyle}>
                Your WHS handicap index. Used for stroke calculations.
              </p>
              <p style={{ ...noteStyle, marginTop: 2 }}>
                Auto-sync from England Golf coming in a future update
              </p>
            </div>

            {/* 3. Account info (read-only) */}
            <div style={cardStyle}>
              <span style={labelStyle}>Email address</span>
              <div style={emailValueStyle}>{email}</div>
            </div>

            {/* 4. Save */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <button
                onClick={handleSave}
                disabled={isPending}
                style={saveBtnStyle}
              >
                {isPending ? 'Saving…' : 'Save changes'}
              </button>
              <div style={savedMsgStyle}>✓ Saved</div>
              {errorMsg && (
                <div style={errorStyle}>{errorMsg}</div>
              )}
            </div>

            {/* 5. Danger zone */}
            <div style={{ marginTop: 8 }}>
              <hr style={dividerStyle} />
              <div style={{ padding: '20px 0 0' }}>
                <p style={dangerLabelStyle}>Account</p>
                <button
                  onClick={handleSignOut}
                  style={signOutBtnStyle}
                >
                  Sign out
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
