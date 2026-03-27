'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { lookupRound, joinRound } from './actions'
import type { RoundPreview, JoinPlayer } from './actions'

// ─── Design tokens (match rest of app) ────────────────────────────────────────

const FE = {
  forestPrimary: '#1A2E1A',
  greenDark: '#0D631B',
  sageBg: '#F0F4EC',
  white: '#FFFFFF',
  onSecondary: '#44483E',
  onTertiary: '#72786E',
  borderGhost: 'rgba(26, 28, 28, 0.12)',
  gradientGreen: 'linear-gradient(135deg, #0D631B 0%, #0a4f15 100%)',
  shadowFloat: '0 4px 12px rgba(26, 28, 28, 0.04)',
  shadowHover: '0 6px 16px rgba(26, 28, 28, 0.08)',
}

const font = {
  display: "var(--font-dm-serif), serif",
  body: "var(--font-dm-sans), system-ui, sans-serif",
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PlayerRow {
  name: string
  handicapIndex: string
  isUser: boolean
}

interface Props {
  userId: string
  displayName: string
  handicapIndex: number | null
  /** Pre-fill code from URL ?code= param */
  initialCode?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLabel(fmt: string): string {
  if (fmt === 'stableford') return 'Stableford'
  if (fmt === 'strokeplay') return 'Stroke Play'
  if (fmt === 'matchplay') return 'Match Play'
  return fmt
}

function formatDate(d: string): string {
  const dt = new Date(d + 'T12:00:00')
  return dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function JoinRoundFlow({ displayName, handicapIndex, initialCode }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Step 1: enter code
  const [code, setCode] = useState(initialCode ?? '')
  const [lookupError, setLookupError] = useState('')
  const [isLooking, setIsLooking] = useState(false)

  // Step 2: preview + add players
  const [preview, setPreview] = useState<RoundPreview | null>(null)
  const [players, setPlayers] = useState<PlayerRow[]>([
    { name: displayName, handicapIndex: handicapIndex != null ? String(handicapIndex) : '', isUser: true },
  ])
  const [joinError, setJoinError] = useState('')

  // ── Code lookup ─────────────────────────────────────────────────────────────

  async function handleLookup() {
    setLookupError('')
    setIsLooking(true)
    try {
      const result = await lookupRound(code)
      if (!result) {
        setLookupError('Round not found. Check the code and try again.')
      } else {
        setPreview(result)
      }
    } catch {
      setLookupError('Something went wrong. Please try again.')
    } finally {
      setIsLooking(false)
    }
  }

  // ── Player management ───────────────────────────────────────────────────────

  function addPlayer() {
    if (players.length >= 4) return
    setPlayers(p => [...p, { name: '', handicapIndex: '', isUser: false }])
  }

  function removePlayer(i: number) {
    // Can't remove yourself
    if (players[i]?.isUser) return
    setPlayers(p => p.filter((_, idx) => idx !== i))
  }

  function updatePlayer(i: number, field: 'name' | 'handicapIndex', value: string) {
    setPlayers(p => p.map((pl, idx) => idx === i ? { ...pl, [field]: value } : pl))
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  function handleJoin() {
    if (!preview) return
    setJoinError('')

    // Validate
    for (const p of players) {
      if (!p.name.trim()) { setJoinError('All players need a name.'); return }
      const hcp = parseFloat(p.handicapIndex)
      if (isNaN(hcp) || hcp < 0 || hcp > 54) { setJoinError(`Invalid handicap for ${p.name}.`); return }
    }

    const joinPlayers: JoinPlayer[] = players.map(p => ({
      name: p.name.trim(),
      handicapIndex: parseFloat(p.handicapIndex),
      isUser: p.isUser,
    }))

    startTransition(async () => {
      try {
        const url = await joinRound(preview.eventId, preview.roundType, joinPlayers)
        router.push(url)
      } catch (e) {
        setJoinError(e instanceof Error ? e.message : 'Failed to join round.')
      }
    })
  }

  // ── Render: step 1 — code entry ─────────────────────────────────────────────

  if (!preview) {
    return (
      <>
        <style>{STYLES}</style>
        <div className="jr">
          <header className="jr-hd">
            <a href="/play" className="jr-back" aria-label="Back to dashboard">
              <BackIcon /> Play
            </a>
          </header>

          <main className="jr-main">
            <div className="jr-hero">
              <h1 className="jr-title">Join a round</h1>
              <p className="jr-sub">
                Get the 6-letter code from the group who set up the round and enter it below.
              </p>
            </div>

            <div className="jr-card">
              <label className="jr-label" htmlFor="share-code">Round code</label>
              <input
                id="share-code"
                className="jr-code-input"
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                maxLength={6}
                placeholder="ABC123"
                value={code}
                onChange={e => {
                  setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                  setLookupError('')
                }}
                onKeyDown={e => { if (e.key === 'Enter' && code.length === 6) handleLookup() }}
              />
              {lookupError && <p className="jr-error">{lookupError}</p>}
              <button
                className="jr-btn-primary"
                onClick={handleLookup}
                disabled={code.length !== 6 || isLooking}
              >
                {isLooking ? 'Looking up…' : 'Find round'}
              </button>
            </div>
          </main>
        </div>
      </>
    )
  }

  // ── Render: step 2 — preview + players ──────────────────────────────────────

  return (
    <>
      <style>{STYLES}</style>
      <div className="jr">
        <header className="jr-hd">
          <button className="jr-back" onClick={() => { setPreview(null); setJoinError('') }}>
            <BackIcon /> Back
          </button>
        </header>

        <main className="jr-main">
          <div className="jr-hero">
            <h1 className="jr-title">You&apos;re joining</h1>
          </div>

          {/* Event preview card */}
          <div className="jr-card jr-preview">
            <div className="jr-preview-course">{preview.courseName}</div>
            <div className="jr-preview-meta">
              <span className="jr-badge">{formatLabel(preview.format)}</span>
              <span className="jr-badge">{preview.roundType} holes</span>
            </div>
            <div className="jr-preview-date">{formatDate(preview.date)}</div>
            {preview.existingPlayers.length > 0 && (
              <div className="jr-preview-players">
                {preview.existingPlayers.length} player{preview.existingPlayers.length !== 1 ? 's' : ''} already in:
                &nbsp;<span className="jr-preview-names">{preview.existingPlayers.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Your group */}
          <div className="jr-section-hd">Your group</div>
          <div className="jr-players">
            {players.map((p, i) => (
              <div className="jr-player" key={i}>
                <div className="jr-player-avatar" style={{ background: AVATAR_COLOURS[i % AVATAR_COLOURS.length] }}>
                  {p.name.trim() ? p.name.trim()[0]!.toUpperCase() : (i + 1)}
                </div>
                <div className="jr-player-fields">
                  <input
                    className="jr-input"
                    type="text"
                    placeholder={p.isUser ? 'Your name' : 'Player name'}
                    value={p.name}
                    onChange={e => updatePlayer(i, 'name', e.target.value)}
                    readOnly={p.isUser}
                    style={p.isUser ? { opacity: 0.7, cursor: 'default' } : {}}
                  />
                  <input
                    className="jr-input jr-hcp"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={54}
                    step={0.1}
                    placeholder="HCP"
                    value={p.handicapIndex}
                    onChange={e => updatePlayer(i, 'handicapIndex', e.target.value)}
                  />
                </div>
                {!p.isUser && (
                  <button className="jr-remove" onClick={() => removePlayer(i)} aria-label="Remove player">×</button>
                )}
              </div>
            ))}
          </div>

          {players.length < 4 && (
            <button className="jr-btn-add" onClick={addPlayer}>
              <span className="jr-btn-add-icon">+</span> Add player
            </button>
          )}

          {joinError && <p className="jr-error jr-error-bottom">{joinError}</p>}

          <button
            className="jr-btn-primary"
            onClick={handleJoin}
            disabled={isPending}
          >
            {isPending ? 'Joining…' : 'Start scoring →'}
          </button>
        </main>
      </div>
    </>
  )
}

// ─── Avatar colours ────────────────────────────────────────────────────────────

const AVATAR_COLOURS = ['#0D631B', '#1A6DA0', '#923357', '#6B4C9A', '#B8660B']

// ─── Icons ─────────────────────────────────────────────────────────────────────

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const STYLES = `
  .jr {
    min-height: 100dvh;
    background: ${FE.sageBg};
    font-family: ${font.body};
    color: ${FE.forestPrimary};
    padding-bottom: max(40px, env(safe-area-inset-bottom));
  }

  .jr-hd {
    background: ${FE.sageBg};
    padding: 1rem 1.25rem;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .jr-back {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-family: ${font.body};
    font-size: 0.9rem;
    font-weight: 500;
    color: ${FE.onSecondary};
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem 0;
    text-decoration: none;
    transition: color 0.15s;
  }
  .jr-back:hover { color: ${FE.greenDark}; }

  .jr-main {
    padding: 1rem 1.25rem 2rem;
    max-width: 640px;
    margin: 0 auto;
  }

  .jr-hero {
    margin-bottom: 1.5rem;
    animation: jr-rise 0.4s cubic-bezier(0.2, 0, 0, 1) both;
  }
  .jr-title {
    font-family: ${font.display};
    font-weight: 800;
    font-size: 1.875rem;
    color: ${FE.forestPrimary};
    letter-spacing: -0.02em;
    margin: 0 0 0.375rem;
    line-height: 1.1;
  }
  .jr-sub {
    font-size: 0.9375rem;
    color: ${FE.onTertiary};
    line-height: 1.5;
    margin: 0;
  }

  /* Card */
  .jr-card {
    background: ${FE.white};
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: ${FE.shadowFloat};
    animation: jr-rise 0.4s 0.06s cubic-bezier(0.2, 0, 0, 1) both;
    margin-bottom: 1.25rem;
  }

  .jr-label {
    display: block;
    font-family: ${font.body};
    font-size: 0.6875rem;
    font-weight: 500;
    color: ${FE.onTertiary};
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin-bottom: 0.625rem;
  }

  .jr-code-input {
    display: block;
    width: 100%;
    box-sizing: border-box;
    font-family: ${font.display};
    font-weight: 800;
    font-size: 2.25rem;
    letter-spacing: 0.18em;
    color: ${FE.forestPrimary};
    border: 2px solid ${FE.borderGhost};
    border-radius: 12px;
    padding: 0.875rem 1rem;
    background: ${FE.sageBg};
    text-align: center;
    transition: border-color 0.15s;
    outline: none;
    text-transform: uppercase;
    margin-bottom: 1rem;
  }
  .jr-code-input:focus { border-color: ${FE.greenDark}; background: ${FE.white}; }
  .jr-code-input::placeholder { color: #C8D4C0; letter-spacing: 0.1em; }

  /* Preview card */
  .jr-preview { padding: 1.25rem 1.5rem; }
  .jr-preview-course {
    font-family: ${font.display};
    font-weight: 700;
    font-size: 1.125rem;
    color: ${FE.forestPrimary};
    margin-bottom: 0.625rem;
    letter-spacing: -0.01em;
  }
  .jr-preview-meta { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; flex-wrap: wrap; }
  .jr-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.625rem;
    border-radius: 24px;
    background: rgba(13, 99, 27, 0.1);
    color: ${FE.greenDark};
    font-family: ${font.body};
    font-size: 0.75rem;
    font-weight: 500;
  }
  .jr-preview-date {
    font-size: 0.875rem;
    color: ${FE.onTertiary};
    margin-bottom: 0.625rem;
  }
  .jr-preview-players {
    font-size: 0.8125rem;
    color: ${FE.onTertiary};
    padding-top: 0.625rem;
    border-top: 1px solid rgba(26,28,28,0.07);
  }
  .jr-preview-names { color: ${FE.forestPrimary}; font-weight: 500; }

  /* Section heading */
  .jr-section-hd {
    font-family: ${font.body};
    font-size: 0.6875rem;
    font-weight: 500;
    color: ${FE.onTertiary};
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin-bottom: 0.75rem;
  }

  /* Players */
  .jr-players { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 0.75rem; }
  .jr-player {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: ${FE.white};
    border-radius: 12px;
    padding: 0.875rem 1rem;
    box-shadow: ${FE.shadowFloat};
    animation: jr-rise 0.35s ease both;
  }
  .jr-player-avatar {
    width: 36px; height: 36px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: ${font.display};
    font-weight: 700;
    font-size: 0.875rem;
    color: #FFFFFF;
    flex-shrink: 0;
  }
  .jr-player-fields {
    display: flex;
    gap: 0.625rem;
    flex: 1;
    min-width: 0;
  }

  .jr-input {
    flex: 1;
    min-width: 0;
    font-family: ${font.body};
    font-size: 0.9375rem;
    color: ${FE.forestPrimary};
    background: ${FE.sageBg};
    border: 1.5px solid transparent;
    border-radius: 8px;
    padding: 0.5rem 0.625rem;
    outline: none;
    transition: border-color 0.15s, background 0.15s;
  }
  .jr-input:focus { border-color: ${FE.greenDark}; background: ${FE.white}; }
  .jr-input::placeholder { color: #A0B09A; }
  .jr-hcp { flex: 0 0 72px; text-align: center; }

  .jr-remove {
    width: 28px; height: 28px;
    border-radius: 50%;
    border: 1.5px solid rgba(26,28,28,0.18);
    background: transparent;
    color: ${FE.onTertiary};
    font-size: 1.125rem;
    line-height: 1;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: all 0.15s;
  }
  .jr-remove:hover { background: #FEE2E2; border-color: #EF4444; color: #EF4444; }

  .jr-btn-add {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    background: ${FE.white};
    border: 1.5px dashed rgba(13, 99, 27, 0.3);
    border-radius: 12px;
    padding: 0.75rem 1rem;
    font-family: ${font.body};
    font-size: 0.9375rem;
    font-weight: 500;
    color: ${FE.greenDark};
    cursor: pointer;
    transition: all 0.15s;
    margin-bottom: 1.25rem;
  }
  .jr-btn-add:hover { background: rgba(13, 99, 27, 0.04); border-color: ${FE.greenDark}; }
  .jr-btn-add-icon {
    width: 24px; height: 24px;
    border-radius: 50%;
    background: rgba(13, 99, 27, 0.12);
    color: ${FE.greenDark};
    font-size: 1.125rem;
    line-height: 1;
    display: inline-flex; align-items: center; justify-content: center;
  }

  /* Primary button */
  .jr-btn-primary {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 1.125rem;
    background: ${FE.gradientGreen};
    color: #FFFFFF;
    border: none;
    border-radius: 16px;
    font-family: ${font.display};
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(13, 99, 27, 0.2);
    transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
    letter-spacing: -0.01em;
    margin-top: 0.25rem;
  }
  .jr-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 32px rgba(13, 99, 27, 0.28); }
  .jr-btn-primary:active { transform: translateY(0); }
  .jr-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

  /* Error */
  .jr-error {
    font-family: ${font.body};
    font-size: 0.875rem;
    color: #C0392B;
    background: #FEF2F2;
    border: 1px solid rgba(192, 57, 43, 0.2);
    border-radius: 8px;
    padding: 0.625rem 0.875rem;
    margin: 0 0 1rem;
  }
  .jr-error-bottom { margin-top: 0.75rem; margin-bottom: 0.75rem; }

  @keyframes jr-rise {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`
