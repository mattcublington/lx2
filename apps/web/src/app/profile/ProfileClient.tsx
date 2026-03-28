'use client'
import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { updateProfile, updateAvatarUrl, updateDistanceUnit } from './actions'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
  email: string
  displayName: string
  handicapIndex: number | null
  memberSince: string | null
  avatarUrl: string | null
  distanceUnit: 'yards' | 'metres'
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

// Which field is being inline-edited
type EditingField = 'name' | 'handicap' | null

export default function ProfileClient({ userId, email, displayName, handicapIndex, avatarUrl: initialAvatarUrl, distanceUnit: initialDistanceUnit }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(displayName)
  const [hcp, setHcp] = useState<string>(handicapIndex !== null ? String(handicapIndex) : '')
  const [editing, setEditing] = useState<EditingField>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [distanceUnit, setDistanceUnit] = useState<'yards' | 'metres'>(initialDistanceUnit)

  const initials = getInitials(name || email)

  const handleSave = () => {
    setErrorMsg(null)
    const parsedHcp = hcp.trim() === '' ? null : parseFloat(hcp)
    startTransition(async () => {
      const result = await updateProfile({ displayName: name, handicapIndex: parsedHcp })
      if (result.ok) {
        setEditing(null)
      } else {
        setErrorMsg(result.error)
      }
    })
  }

  const handleCancel = () => {
    // Reset to saved values
    setName(displayName)
    setHcp(handicapIndex !== null ? String(handicapIndex) : '')
    setEditing(null)
    setErrorMsg(null)
  }

  const handleDistanceUnit = (unit: 'yards' | 'metres') => {
    setDistanceUnit(unit)
    startTransition(async () => { await updateDistanceUnit(unit) })
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const handleAvatarClick = () => fileInputRef.current?.click()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarError(null)
    setUploadingAvatar(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${userId}/${Date.now()}.${ext}`
      const { data, error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (error) throw new Error(error.message)
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(data.path)
      setAvatarUrl(publicUrl)
      await updateAvatarUrl(publicUrl)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const hcpDisplay = hcp ? parseFloat(hcp).toFixed(1) : '—'
  const isGoogleAuth = email.endsWith('@gmail.com') || true // always true for this app

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }

        .pf-page {
          min-height: 100dvh;
          background: #F0F4EC;
          font-family: var(--font-lexend, 'Lexend', sans-serif);
          padding-bottom: 80px;
        }

        /* ── Header ── */
        .pf-header {
          background: #F0F4EC;
          padding: 1rem 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .pf-back-btn {
          width: 40px;
          height: 40px;
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1A2E1A;
          font-size: 20px;
          border-radius: 12px;
          transition: all 0.2s ease-in-out;
          flex-shrink: 0;
        }
        .pf-back-btn:hover {
          transform: translateX(-2px);
        }

        .pf-header-title {
          font-family: var(--font-manrope, 'Manrope', sans-serif);
          font-weight: 700;
          font-size: 18px;
          color: #1A2E1A;
          letter-spacing: -0.01em;
          margin: 0;
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
        }

        .pf-settings-btn {
          width: 40px;
          height: 40px;
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #44483E;
          border-radius: 12px;
          transition: all 0.2s ease-in-out;
          flex-shrink: 0;
        }
        .pf-settings-btn:hover {
          background: rgba(26, 28, 28, 0.05);
          color: #1A2E1A;
        }

        /* ── Main content ── */
        .pf-main {
          padding: 1.5rem 1.25rem;
          max-width: 430px;
          margin: 0 auto;
        }

        /* ── Hero section ── */
        .pf-hero {
          background: #FFFFFF;
          border-radius: 16px;
          padding: 2rem 1.5rem;
          box-shadow: 0 4px 12px rgba(26, 28, 28, 0.04);
          text-align: center;
          margin-bottom: 2rem;
        }

        .pf-avatar-wrap {
          position: relative;
          width: 80px;
          height: 80px;
          margin: 0 auto 1rem;
        }

        .pf-avatar-ring {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0D631B 0%, #0a4f15 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          cursor: pointer;
        }

        .pf-avatar-initials {
          font-family: var(--font-manrope, 'Manrope', sans-serif);
          font-size: 1.5rem;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.02em;
          user-select: none;
        }

        .pf-avatar-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        .pf-avatar-uploading {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: rgba(10, 31, 10, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pf-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: pf-spin 0.7s linear infinite;
        }
        @keyframes pf-spin { to { transform: rotate(360deg); } }

        .pf-edit-photo {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, #0D631B 0%, #0a4f15 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(13, 99, 27, 0.2);
          transition: all 0.2s ease-in-out;
          border: none;
        }
        .pf-edit-photo:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(13, 99, 27, 0.3);
        }

        .pf-user-name {
          font-family: var(--font-manrope, 'Manrope', sans-serif);
          font-weight: 700;
          font-size: 24px;
          color: #1A2E1A;
          margin: 0 0 0.5rem;
        }

        .pf-user-email {
          font-family: var(--font-lexend, 'Lexend', sans-serif);
          font-weight: 400;
          font-size: 14px;
          color: #72786E;
          margin: 0 0 1rem;
        }

        .pf-edit-link {
          font-family: var(--font-lexend, 'Lexend', sans-serif);
          font-weight: 500;
          font-size: 14px;
          color: #923357;
          text-decoration: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          transition: opacity 0.2s ease-in-out;
        }
        .pf-edit-link:hover { opacity: 0.8; }

        .pf-avatar-error {
          font-size: 0.8125rem;
          color: #dc2626;
          margin-top: 0.5rem;
        }

        /* ── Section header ── */
        .pf-section-hd {
          font-family: var(--font-manrope, 'Manrope', sans-serif);
          font-weight: 700;
          font-size: 18px;
          color: #1A2E1A;
          letter-spacing: -0.01em;
          margin: 0 0 1rem;
        }

        /* ── Field cards ── */
        .pf-field {
          background: #FFFFFF;
          border-radius: 12px;
          padding: 1rem 1.25rem;
          box-shadow: 0 4px 12px rgba(26, 28, 28, 0.04);
          margin-bottom: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          border: none;
          width: 100%;
          text-align: left;
        }
        .pf-field:hover {
          background: rgba(240, 244, 236, 0.5);
          transform: translateY(-1px);
        }
        .pf-field.editing {
          background: #FFFFFF;
          transform: none;
          cursor: default;
        }

        .pf-field-content { flex: 1; }

        .pf-field-label {
          font-family: var(--font-lexend, 'Lexend', sans-serif);
          font-weight: 500;
          font-size: 14px;
          color: #1A2E1A;
          margin-bottom: 0.25rem;
          display: block;
        }

        .pf-field-value {
          font-family: var(--font-lexend, 'Lexend', sans-serif);
          font-weight: 400;
          font-size: 16px;
          color: #44483E;
          margin-bottom: 0.25rem;
        }

        .pf-field-note {
          font-family: var(--font-lexend, 'Lexend', sans-serif);
          font-weight: 400;
          font-size: 13px;
          color: #72786E;
          line-height: 1.4;
        }

        .pf-chevron {
          color: #72786E;
          flex-shrink: 0;
          margin-left: 1rem;
          margin-top: 4px;
          transition: transform 0.2s ease-in-out;
        }

        /* ── Inline edit ── */
        .pf-field-input {
          width: 100%;
          border: 1.5px solid #E0EBE0;
          border-radius: 8px;
          padding: 8px 10px;
          font-family: var(--font-lexend, 'Lexend', sans-serif);
          font-size: 15px;
          color: #1A2E1A;
          background: #fff;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          margin-top: 6px;
        }
        .pf-field-input:focus {
          border-color: #0D631B;
          box-shadow: 0 0 0 3px rgba(13, 99, 27, 0.1);
        }

        .pf-edit-actions {
          display: flex;
          gap: 8px;
          margin-top: 10px;
        }

        .pf-btn-save {
          flex: 1;
          background: #0D631B;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 9px 16px;
          font-family: var(--font-lexend, 'Lexend', sans-serif);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s, transform 0.15s;
        }
        .pf-btn-save:hover:not(:disabled) {
          background: #0a1f0a;
          transform: translateY(-1px);
        }
        .pf-btn-save:disabled { background: #7aaa7a; cursor: not-allowed; }

        .pf-btn-cancel {
          background: none;
          border: 1.5px solid #E0EBE0;
          border-radius: 8px;
          padding: 9px 16px;
          font-family: var(--font-lexend, 'Lexend', sans-serif);
          font-size: 13px;
          font-weight: 500;
          color: #72786E;
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
        }
        .pf-btn-cancel:hover { border-color: #aaa; color: #44483E; }

        .pf-field-error {
          font-size: 0.8125rem;
          color: #dc2626;
          margin-top: 6px;
        }

        /* ── Distance toggle ── */
        .pf-unit-toggle {
          display: flex;
          gap: 6px;
          margin-top: 6px;
        }
        .pf-unit-btn {
          flex: 1;
          padding: 8px 0;
          border-radius: 8px;
          border: 1.5px solid #E0EBE0;
          background: #fff;
          font-family: var(--font-lexend, 'Lexend', sans-serif);
          font-size: 14px;
          font-weight: 500;
          color: #72786E;
          cursor: pointer;
          transition: all 0.15s ease-in-out;
        }
        .pf-unit-btn.active {
          background: #0D631B;
          border-color: #0D631B;
          color: #fff;
        }
        .pf-unit-btn:not(.active):hover {
          border-color: #0D631B;
          color: #0D631B;
        }

        /* ── Bottom section ── */
        .pf-bottom {
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(26, 28, 28, 0.06);
        }

        .pf-acct-link {
          font-family: var(--font-lexend, 'Lexend', sans-serif);
          font-weight: 500;
          font-size: 14px;
          color: #0D631B;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          transition: opacity 0.2s ease-in-out;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
        }
        .pf-acct-link:hover { opacity: 0.8; }

        .pf-signout-btn {
          font-family: var(--font-lexend, 'Lexend', sans-serif);
          font-weight: 500;
          font-size: 14px;
          color: #923357;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          transition: opacity 0.2s ease-in-out;
        }
        .pf-signout-btn:hover { opacity: 0.8; }

        /* ── Bottom nav ── */
        .pf-bnav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: #FFFFFF;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          box-shadow: 0 -2px 8px rgba(26, 28, 28, 0.06);
          z-index: 100;
          padding-bottom: env(safe-area-inset-bottom);
        }

        .pf-bnav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 0.75rem 0;
          gap: 0.25rem;
          text-decoration: none;
          color: #72786E;
          font-family: var(--font-lexend, 'Lexend', sans-serif);
          font-size: 0.6875rem;
          font-weight: 500;
          background: none;
          border: none;
          cursor: pointer;
          transition: color 0.2s ease-in-out;
        }
        .pf-bnav-item svg { transition: transform 0.2s ease-in-out; }
        .pf-bnav-item.active { color: #0D631B; }
        .pf-bnav-item:hover { color: #0D631B; }
        .pf-bnav-item:hover svg { transform: translateY(-2px); }
      `}</style>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div className="pf-page">

        {/* ── Header ── */}
        <header className="pf-header">
          <button
            className="pf-back-btn"
            aria-label="Go back"
            onClick={() => router.back()}
          >
            <BackArrowIcon />
          </button>
          <h1 className="pf-header-title">My Profile</h1>
          <button className="pf-settings-btn" aria-label="Settings">
            <SettingsIcon />
          </button>
        </header>

        {/* ── Main ── */}
        <main className="pf-main">

          {/* Hero */}
          <div className="pf-hero">
            <div className="pf-avatar-wrap">
              <div className="pf-avatar-ring" onClick={handleAvatarClick} role="button" tabIndex={0} aria-label="Change profile photo" onKeyDown={e => e.key === 'Enter' && handleAvatarClick()}>
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={name || 'Profile photo'}
                    width={80}
                    height={80}
                    className="pf-avatar-photo"
                    unoptimized
                  />
                ) : (
                  <span className="pf-avatar-initials">{initials}</span>
                )}
              </div>

              {!uploadingAvatar && (
                <button
                  className="pf-edit-photo"
                  onClick={handleAvatarClick}
                  aria-label="Change photo"
                >
                  <CameraIcon />
                </button>
              )}

              {uploadingAvatar && (
                <div className="pf-avatar-uploading">
                  <div className="pf-spinner" />
                </div>
              )}
            </div>

            {avatarError && <p className="pf-avatar-error">{avatarError}</p>}

            <p className="pf-user-name">{name || '—'}</p>
            <p className="pf-user-email">{email}</p>
            <button
              className="pf-edit-link"
              onClick={() => setEditing('name')}
            >
              Edit profile
            </button>
          </div>

          {/* Profile details */}
          <p className="pf-section-hd">Profile details</p>

          {/* Display name field */}
          <div className={`pf-field${editing === 'name' ? ' editing' : ''}`} onClick={() => editing === null && setEditing('name')} role="button" tabIndex={0} aria-label="Edit display name" onKeyDown={e => e.key === 'Enter' && editing === null && setEditing('name')}>
            <div className="pf-field-content">
              <span className="pf-field-label">Display name</span>
              {editing === 'name' ? (
                <>
                  <input
                    autoFocus
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="pf-field-input"
                    placeholder="Your name"
                    autoComplete="name"
                    onClick={e => e.stopPropagation()}
                  />
                  {errorMsg && <p className="pf-field-error">{errorMsg}</p>}
                  <div className="pf-edit-actions" onClick={e => e.stopPropagation()}>
                    <button className="pf-btn-save" disabled={isPending} onClick={handleSave}>
                      {isPending ? 'Saving…' : 'Save'}
                    </button>
                    <button className="pf-btn-cancel" onClick={handleCancel}>Cancel</button>
                  </div>
                </>
              ) : (
                <p className="pf-field-value">{name || '—'}</p>
              )}
            </div>
            {editing !== 'name' && <ChevronIcon />}
          </div>

          {/* Handicap Index field */}
          <div className={`pf-field${editing === 'handicap' ? ' editing' : ''}`} onClick={() => editing === null && setEditing('handicap')} role="button" tabIndex={0} aria-label="Edit handicap index" onKeyDown={e => e.key === 'Enter' && editing === null && setEditing('handicap')}>
            <div className="pf-field-content">
              <span className="pf-field-label">Handicap Index</span>
              {editing === 'handicap' ? (
                <>
                  <input
                    autoFocus
                    type="number"
                    step={0.1}
                    min={0}
                    max={54}
                    value={hcp}
                    onChange={e => setHcp(e.target.value)}
                    className="pf-field-input"
                    placeholder="e.g. 14.2"
                    onClick={e => e.stopPropagation()}
                  />
                  {errorMsg && <p className="pf-field-error">{errorMsg}</p>}
                  <div className="pf-edit-actions" onClick={e => e.stopPropagation()}>
                    <button className="pf-btn-save" disabled={isPending} onClick={handleSave}>
                      {isPending ? 'Saving…' : 'Save'}
                    </button>
                    <button className="pf-btn-cancel" onClick={handleCancel}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <p className="pf-field-value">{hcpDisplay}</p>
                  {hcp && <p className="pf-field-note">(Valid handicap under R1-54)</p>}
                </>
              )}
            </div>
            {editing !== 'handicap' && <ChevronIcon />}
          </div>

          {/* Distance unit field */}
          <div className="pf-field" style={{ cursor: 'default' }} aria-label="Distance unit preference">
            <div className="pf-field-content">
              <span className="pf-field-label">Distance unit</span>
              <div className="pf-unit-toggle" role="group" aria-label="Choose distance unit">
                <button
                  className={`pf-unit-btn${distanceUnit === 'yards' ? ' active' : ''}`}
                  onClick={() => handleDistanceUnit('yards')}
                  aria-pressed={distanceUnit === 'yards'}
                >
                  Yards
                </button>
                <button
                  className={`pf-unit-btn${distanceUnit === 'metres' ? ' active' : ''}`}
                  onClick={() => handleDistanceUnit('metres')}
                  aria-pressed={distanceUnit === 'metres'}
                >
                  Metres
                </button>
              </div>
            </div>
          </div>

          {/* Email field (read-only) */}
          <div className="pf-field" style={{ cursor: 'default' }} aria-label="Email address">
            <div className="pf-field-content">
              <span className="pf-field-label">Email address</span>
              <p className="pf-field-value">{email}</p>
              {isGoogleAuth && <p className="pf-field-note">Managed via your Google account</p>}
            </div>
            <ChevronIcon />
          </div>

          {/* Bottom links */}
          <div className="pf-bottom">
            <Link href="/play" className="pf-acct-link">
              Account settings
              <ArrowRightIcon />
            </Link>
            <button className="pf-signout-btn" onClick={handleSignOut}>
              Sign out
            </button>
          </div>

        </main>

        {/* ── Bottom nav ── */}
        <nav className="pf-bnav">
          <Link href="/play" className="pf-bnav-item" aria-label="Home">
            <HomeIcon />
            <span>Home</span>
          </Link>
          <button className="pf-bnav-item" aria-label="Rounds">
            <ClipboardIcon />
            <span>Rounds</span>
          </button>
          <button className="pf-bnav-item" aria-label="Events">
            <TrophyIcon />
            <span>Events</span>
          </button>
          <button className="pf-bnav-item" aria-label="Society">
            <UsersIcon />
            <span>Society</span>
          </button>
          <button className="pf-bnav-item active" aria-label="Profile">
            <UserIcon />
            <span>Profile</span>
          </button>
        </nav>

      </div>
    </>
  )
}

/* ── Inline SVG icons ── */

function BackArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="1.75"/>
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="13" r="4" stroke="white" strokeWidth="2"/>
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="pf-chevron" aria-hidden="true">
      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function ClipboardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" stroke="currentColor" strokeWidth="1.75"/>
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 21h8M12 17v4M17 3H7l1 9a4 4 0 0 0 8 0l1-9z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 3H4a1 1 0 0 0-1 1v2a4 4 0 0 0 4 4M17 3h3a1 1 0 0 1 1 1v2a4 4 0 0 1-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.75"/>
    </svg>
  )
}
