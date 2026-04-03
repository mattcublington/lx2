'use client'
import { useState } from 'react'

type RecapStyle = 'commentary' | 'banter' | 'stats'

interface PlayerRecap {
  player_id: string
  recap: string
  highlights: { type: '+' | '-' | '='; text: string }[]
  stats: {
    back_nine_pts: number | null
    fir_pct: number | null
    gir_pct: number | null
    avg_putts: number | null
    best_hole: string
  }
}

interface RecapData {
  id: string
  commentary_group: string
  commentary_players: PlayerRecap[]
  banter_group: string
  banter_players: PlayerRecap[]
  stats_group: string
  stats_players: PlayerRecap[]
  recap_slug: string | null
  generated_at: string
}

interface RecapGeneratorProps {
  eventId: string
  eventName: string
  existingRecap: RecapData | null
  appUrl: string
}

const STYLE_CONFIG: { key: RecapStyle; label: string; desc: string }[] = [
  { key: 'commentary', label: 'Commentary', desc: 'Like a golf correspondent wrote it' },
  { key: 'banter', label: 'Banter', desc: 'WhatsApp-group energy, no mercy' },
  { key: 'stats', label: 'Stats Report', desc: 'Numbers-first analysis' },
]

export default function RecapGenerator({ eventId, eventName, existingRecap, appUrl }: RecapGeneratorProps) {
  const [state, setState] = useState<'idle' | 'config' | 'generating' | 'viewing'>(
    existingRecap ? 'viewing' : 'idle'
  )
  const [recap, setRecap] = useState<RecapData | null>(existingRecap)
  const [activeStyle, setActiveStyle] = useState<RecapStyle>('commentary')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Config toggles
  const [includeNtpLd, setIncludeNtpLd] = useState(true)
  const [includeWoodenSpoon, setIncludeWoodenSpoon] = useState(true)
  const [includeIndividual, setIncludeIndividual] = useState(true)

  // Expanded player recaps
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null)

  const generate = async () => {
    setState('generating')
    setError(null)
    try {
      const resp = await fetch('/api/generate-recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          include_ntp_ld: includeNtpLd,
          include_wooden_spoon: includeWoodenSpoon,
          include_individual_recaps: includeIndividual,
        }),
      })
      if (!resp.ok) {
        const data = await resp.json() as { error: string }
        setError(data.error || 'Generation failed')
        setState('config')
        return
      }
      const data = await resp.json() as RecapData
      setRecap(data)
      setState('viewing')
    } catch {
      setError('Network error — please try again')
      setState('config')
    }
  }

  const groupText = recap
    ? recap[`${activeStyle}_group` as keyof RecapData] as string
    : ''
  const players = recap
    ? (recap[`${activeStyle}_players` as keyof RecapData] as PlayerRecap[] ?? [])
    : []

  const shareUrl = recap?.recap_slug ? `${appUrl}/recap/${recap.recap_slug}` : null

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(groupText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const shareViaWebShare = async () => {
    if (navigator.share) {
      const shareData: ShareData = {
        title: eventName,
        text: groupText.slice(0, 200) + '...',
      }
      if (shareUrl) shareData.url = shareUrl
      await navigator.share(shareData)
    }
  }

  const copyShareLink = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="rc-wrap">

        {/* ── Idle: Generate button ── */}
        {state === 'idle' && (
          <button className="rc-generate-btn" onClick={() => setState('config')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/>
            </svg>
            Generate round recap
          </button>
        )}

        {/* ── Config: Style picker + toggles ── */}
        {state === 'config' && (
          <div className="rc-config">
            <h3 className="rc-heading">Round Recap</h3>
            <p className="rc-desc">AI will generate three recap styles in one go.</p>

            <div className="rc-style-cards">
              {STYLE_CONFIG.map(s => (
                <div key={s.key} className="rc-style-card">
                  <div className="rc-style-name">{s.label}</div>
                  <div className="rc-style-desc">{s.desc}</div>
                </div>
              ))}
            </div>

            <div className="rc-toggles">
              <label className="rc-toggle">
                <input type="checkbox" checked={includeNtpLd} onChange={e => setIncludeNtpLd(e.target.checked)} />
                <span>NTP and longest drive</span>
              </label>
              <label className="rc-toggle">
                <input type="checkbox" checked={includeWoodenSpoon} onChange={e => setIncludeWoodenSpoon(e.target.checked)} />
                <span>Wooden spoon</span>
              </label>
              <label className="rc-toggle">
                <input type="checkbox" checked={includeIndividual} onChange={e => setIncludeIndividual(e.target.checked)} />
                <span>Individual player recaps</span>
              </label>
            </div>

            {error && <div className="rc-error">{error}</div>}

            <button className="rc-go-btn" onClick={generate}>
              Generate all three styles
            </button>
          </div>
        )}

        {/* ── Generating: Loading state ── */}
        {state === 'generating' && (
          <div className="rc-loading">
            <div className="rc-spinner" />
            <span className="rc-loading-text">Generating round recap...</span>
            <span className="rc-loading-sub">This takes about 10-15 seconds</span>
          </div>
        )}

        {/* ── Viewing: Style tabs + content ── */}
        {state === 'viewing' && recap && (
          <div className="rc-viewer">
            <div className="rc-tabs">
              {STYLE_CONFIG.map(s => (
                <button
                  key={s.key}
                  className={`rc-tab ${activeStyle === s.key ? 'active' : ''}`}
                  onClick={() => setActiveStyle(s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="rc-content">
              {groupText.split('\n\n').map((para, i) => (
                <p key={i} className="rc-paragraph">{para}</p>
              ))}
            </div>

            {/* Individual player recaps */}
            {players.length > 0 && (
              <div className="rc-players">
                <h4 className="rc-players-heading">Player recaps</h4>
                {players.map(p => (
                  <div key={p.player_id} className="rc-player-card">
                    <button
                      className="rc-player-header"
                      onClick={() => setExpandedPlayer(expandedPlayer === p.player_id ? null : p.player_id)}
                    >
                      <span className="rc-player-name">{p.recap.split(' ')[0] ?? 'Player'}</span>
                      <svg
                        width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                        style={{ transform: expandedPlayer === p.player_id ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
                      >
                        <path d="m6 9 6 6 6-6"/>
                      </svg>
                    </button>
                    {expandedPlayer === p.player_id && (
                      <div className="rc-player-body">
                        <p className="rc-player-recap">{p.recap}</p>
                        {p.highlights.length > 0 && (
                          <div className="rc-highlights">
                            {p.highlights.map((h, i) => (
                              <div key={i} className={`rc-highlight rc-hl-${h.type === '+' ? 'pos' : h.type === '-' ? 'neg' : 'neutral'}`}>
                                <span className="rc-hl-icon">{h.type}</span>
                                <span>{h.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {(p.stats.fir_pct !== null || p.stats.gir_pct !== null || p.stats.avg_putts !== null) && (
                          <div className="rc-stat-badges">
                            {p.stats.fir_pct !== null && <span className="rc-stat-badge">FIR {p.stats.fir_pct}%</span>}
                            {p.stats.gir_pct !== null && <span className="rc-stat-badge">GIR {p.stats.gir_pct}%</span>}
                            {p.stats.avg_putts !== null && <span className="rc-stat-badge">{p.stats.avg_putts} avg putts</span>}
                            {p.stats.best_hole && <span className="rc-stat-badge">Best: {p.stats.best_hole}</span>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Share options */}
            <div className="rc-share">
              <button className="rc-share-btn" onClick={copyText}>
                {copied ? 'Copied!' : 'Copy text'}
              </button>
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button className="rc-share-btn" onClick={shareViaWebShare}>
                  WhatsApp
                </button>
              )}
              {shareUrl && (
                <button className="rc-share-btn" onClick={copyShareLink}>
                  Share link
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

const STYLES = `
  .rc-wrap {
    margin-top: 0.75rem;
  }
  .rc-generate-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    background: linear-gradient(135deg, #0D631B 0%, #0a4f15 100%);
    color: #FFFFFF;
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-weight: 600;
    font-size: 0.9375rem;
    padding: 0.875rem;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s;
    box-shadow: 0 4px 12px rgba(13,99,27,0.2);
  }
  .rc-generate-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(13,99,27,0.3);
  }
  .rc-config {
    background: #FFFFFF;
    border: 1.5px solid #E0EBE0;
    border-radius: 14px;
    padding: 1.25rem;
  }
  .rc-heading {
    font-family: var(--font-dm-serif), 'DM Serif Display', serif;
    font-size: 1.25rem;
    color: #1A2E1A;
    margin: 0 0 0.25rem;
  }
  .rc-desc {
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-size: 0.8125rem;
    color: #72786E;
    margin: 0 0 1rem;
  }
  .rc-style-cards {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  .rc-style-card {
    flex: 1;
    background: #F0F4EC;
    border-radius: 10px;
    padding: 0.75rem;
  }
  .rc-style-name {
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-weight: 600;
    font-size: 0.8125rem;
    color: #1A2E1A;
    margin-bottom: 0.25rem;
  }
  .rc-style-desc {
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-size: 0.6875rem;
    color: #72786E;
    line-height: 1.3;
  }
  .rc-toggles {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  .rc-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-size: 0.875rem;
    color: #1A2E1A;
    cursor: pointer;
  }
  .rc-toggle input[type="checkbox"] {
    width: 18px; height: 18px;
    accent-color: #0D631B;
    cursor: pointer;
  }
  .rc-error {
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-size: 0.8125rem;
    color: #E24B4A;
    margin-bottom: 0.75rem;
  }
  .rc-go-btn {
    width: 100%;
    background: linear-gradient(135deg, #0D631B 0%, #0a4f15 100%);
    color: #FFFFFF;
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-weight: 600;
    font-size: 0.9375rem;
    padding: 0.875rem;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(13,99,27,0.2);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .rc-go-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(13,99,27,0.3);
  }
  .rc-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 2rem 1rem;
    background: #FFFFFF;
    border: 1.5px solid #E0EBE0;
    border-radius: 14px;
  }
  .rc-spinner {
    width: 32px; height: 32px;
    border: 3px solid #E0EBE0;
    border-top-color: #0D631B;
    border-radius: 50%;
    animation: rc-spin 0.7s linear infinite;
  }
  @keyframes rc-spin { to { transform: rotate(360deg); } }
  .rc-loading-text {
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-weight: 600;
    font-size: 0.9375rem;
    color: #1A2E1A;
  }
  .rc-loading-sub {
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-size: 0.75rem;
    color: #72786E;
  }
  .rc-viewer {
    background: #FFFFFF;
    border: 1.5px solid #E0EBE0;
    border-radius: 14px;
    overflow: hidden;
  }
  .rc-tabs {
    display: flex;
    border-bottom: 1.5px solid #E0EBE0;
  }
  .rc-tab {
    flex: 1;
    padding: 0.75rem;
    border: none;
    background: none;
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-weight: 500;
    font-size: 0.8125rem;
    color: #72786E;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
    border-bottom: 2px solid transparent;
    margin-bottom: -1.5px;
  }
  .rc-tab.active {
    color: #0D631B;
    border-bottom-color: #0D631B;
    font-weight: 600;
  }
  .rc-tab:hover { color: #1A2E1A; }
  .rc-content {
    padding: 1.25rem;
  }
  .rc-paragraph {
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-size: 0.9375rem;
    line-height: 1.6;
    color: #1A2E1A;
    margin: 0 0 1rem;
  }
  .rc-paragraph:last-child { margin-bottom: 0; }
  .rc-players {
    padding: 0 1.25rem 1.25rem;
  }
  .rc-players-heading {
    font-family: var(--font-dm-serif), 'DM Serif Display', serif;
    font-size: 1rem;
    color: #1A2E1A;
    margin: 0 0 0.75rem;
  }
  .rc-player-card {
    border: 1px solid #E0EBE0;
    border-radius: 10px;
    margin-bottom: 0.5rem;
    overflow: hidden;
  }
  .rc-player-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: none;
    border: none;
    cursor: pointer;
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    color: #1A2E1A;
  }
  .rc-player-name {
    font-weight: 600;
    font-size: 0.875rem;
  }
  .rc-player-body {
    padding: 0 1rem 0.75rem;
  }
  .rc-player-recap {
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-size: 0.8125rem;
    line-height: 1.5;
    color: #1A2E1A;
    margin: 0 0 0.5rem;
  }
  .rc-highlights {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }
  .rc-highlight {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
  }
  .rc-hl-pos { background: rgba(13,99,27,0.08); color: #0D631B; }
  .rc-hl-neg { background: rgba(146,51,87,0.08); color: #923357; }
  .rc-hl-neutral { background: #F0F4EC; color: #72786E; }
  .rc-hl-icon {
    font-weight: 700;
    font-size: 0.875rem;
  }
  .rc-stat-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }
  .rc-stat-badge {
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-size: 0.6875rem;
    font-weight: 500;
    color: #0D631B;
    background: rgba(13,99,27,0.08);
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
  }
  .rc-share {
    display: flex;
    gap: 0.5rem;
    padding: 0 1.25rem 1.25rem;
  }
  .rc-share-btn {
    flex: 1;
    padding: 0.625rem 0.5rem;
    border: 1.5px solid #E0EBE0;
    border-radius: 10px;
    background: #FFFFFF;
    font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
    font-weight: 500;
    font-size: 0.8125rem;
    color: #1A2E1A;
    cursor: pointer;
    transition: all 0.15s;
    text-align: center;
  }
  .rc-share-btn:hover {
    border-color: #0D631B;
    transform: translateY(-1px);
  }
`
