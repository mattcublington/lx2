'use client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

type RoundRow = {
  id: string
  created_at: string
  round_type: string | null
  events: {
    name: string
    date: string
    format: string
    courses: { name: string } | null
    course_combinations: { name: string } | null
  } | null
}

interface Props {
  userId: string
  displayName: string
  rounds: RoundRow[]
  handicapIndex?: number | null
  roundsCount?: number
  activeRoundId?: string | null   // if set → "Join ongoing round" path
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatLabel(format: string): string {
  if (format === 'stableford') return 'Stableford'
  if (format === 'strokeplay') return 'Stroke Play'
  if (format === 'matchplay') return 'Match Play'
  return format
}

const FORMAT_ACCENT: Record<string, string> = {
  stableford: '#1A7D34',
  strokeplay: '#1e4a8a',
  matchplay: '#92400e',
}

export default function PlayDashboard({ displayName, rounds, handicapIndex, roundsCount = 0, activeRoundId }: Props) {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const initials = displayName
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

  const firstName = displayName.split(' ')[0] || displayName.split('@')[0]

  return (
    <>
      <style>{`
        :root {
          --pd-dark:   #0a1f0a;
          --pd-green:  #0D4F1C;
          --pd-accent: #0D631B;
          --pd-act-h:  #0a4f15;
          --pd-bg:     #F2F5F0;
          --pd-paper:  #F6FAF6;
          --pd-ink:    #1A2E1A;
          --pd-muted:  #6B8C6B;
          --pd-border: #E0EBE0;
        }

        /* ── Base (mobile first) ─────────────────────────── */
        .pd {
          min-height: 100dvh;
          background: var(--pd-bg);
          font-family: var(--font-dm-sans), system-ui, sans-serif;
          color: var(--pd-ink);
        }

        /* ── Header ─────────────────────────────────────── */
        .pd-hd {
          position: relative;
          overflow: hidden;
          background: var(--pd-dark) url('/hero.png') center 40% / cover no-repeat;
        }
        .pd-hd::before {
          content: '';
          position: absolute; inset: 0; z-index: 0;
          background: linear-gradient(to bottom,
            rgba(0,0,0,0.55) 0%,
            rgba(0,0,0,0.1) 40%,
            rgba(0,0,0,0.5) 75%,
            rgba(0,0,0,0.72) 100%);
        }
        .pd-hd-in {
          position: relative; z-index: 1;
          max-width: 1200px; margin: 0 auto;
          padding: 22px 20px 64px;
        }
        .pd-nav {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 56px;
        }
        .pd-nav-r { display: flex; align-items: center; gap: 10px; }
        .pd-pill {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 14px 6px 7px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 100px;
          font-size: 0.8125rem; font-weight: 500;
          color: rgba(255,255,255,0.68);
          letter-spacing: 0.01em;
        }
        .pd-av {
          width: 27px; height: 27px; border-radius: 50%;
          background: rgba(255,255,255,0.13);
          border: 1px solid rgba(255,255,255,0.2);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.625rem; font-weight: 700; color: #fff;
          letter-spacing: 0.04em; flex-shrink: 0;
        }
        /* Sign-out hidden on mobile — lives in bottom nav */
        .pd-so { display: none; }

        .pd-greet {
          font-size: 0.75rem; font-weight: 600;
          letter-spacing: 0.14em; text-transform: uppercase;
          color: rgba(255,255,255,0.35);
          margin-bottom: 8px;
        }
        .pd-name {
          font-family: var(--font-dm-serif), Georgia, serif;
          font-size: 2.875rem;
          font-weight: 400;
          color: #fff; line-height: 1.05;
          letter-spacing: -0.01em;
        }

        /* ── Stats strip ─────────────────────────────────── */
        .pd-stats {
          display: flex; align-items: center; gap: 10px;
          margin-top: 14px;
        }
        .pd-hcp {
          display: inline-flex; align-items: center; gap: 5px;
          background: rgba(255,255,255,0.13);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 100px;
          padding: 4px 11px 4px 8px;
        }
        .pd-hcp-label {
          font-size: 0.625rem; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: rgba(255,255,255,0.5);
        }
        .pd-hcp-val {
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.9375rem; font-weight: 700;
          color: #fff; line-height: 1;
          letter-spacing: -0.01em;
        }
        .pd-stats-sep {
          width: 3px; height: 3px; border-radius: 50%;
          background: rgba(255,255,255,0.3); flex-shrink: 0;
        }
        .pd-rounds-stat {
          font-size: 0.8125rem; font-weight: 500;
          color: rgba(255,255,255,0.5);
          letter-spacing: 0.01em;
        }

        /* ── Body ────────────────────────────────────────── */
        .pd-body {
          max-width: 720px; margin: 0 auto;
          padding: 0 16px calc(96px + env(safe-area-inset-bottom));
        }
        .pd-stack {
          display: flex; flex-direction: column;
          gap: 16px;
          margin-top: -24px;
          position: relative; z-index: 1;
        }

        /* ── Play action button ──────────────────────────── */
        .pd-play-btn {
          display: flex; align-items: center; justify-content: center; gap: 12px;
          width: 100%;
          background: var(--pd-accent); color: #fff;
          text-decoration: none;
          padding: 18px 28px; border-radius: 16px;
          font-size: 1rem; font-weight: 600;
          letter-spacing: -0.01em;
          box-shadow: 0 6px 24px rgba(13,99,27,0.4), 0 2px 6px rgba(13,99,27,0.2);
          transition: background 0.15s, transform 0.1s, box-shadow 0.12s;
          animation: pd-rise 0.5s cubic-bezier(0.2, 0, 0, 1) both;
        }
        .pd-play-btn:active {
          transform: scale(0.98);
          box-shadow: 0 2px 10px rgba(13,99,27,0.3);
        }
        .pd-play-btn-icon { flex-shrink: 0; height: 22px; width: auto; filter: brightness(0) invert(1); }
        .pd-play-btn.join .pd-play-btn-icon { filter: none; }
        /* Join variant — muted outline style */
        .pd-play-btn.join {
          background: #fff;
          color: var(--pd-accent);
          border: 1.5px solid var(--pd-border);
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .pd-play-btn.join:active { background: #F5FAF5; }

        /* ── Rounds card ─────────────────────────────────── */
        .pd-rounds {
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.11), 0 4px 12px rgba(0,0,0,0.05);
          overflow: hidden;
          animation: pd-rise 0.55s 0.08s cubic-bezier(0.2, 0, 0, 1) both;
        }
        .pd-rounds-hd {
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--pd-border);
          display: flex; align-items: baseline; gap: 10px;
        }
        .pd-rounds-title {
          font-family: var(--font-dm-serif), Georgia, serif;
          font-size: 1.25rem; font-weight: 400;
          color: var(--pd-ink); letter-spacing: -0.01em;
        }
        .pd-rounds-ct {
          font-size: 0.75rem; font-weight: 600;
          color: var(--pd-muted);
          background: var(--pd-bg);
          border-radius: 100px;
          padding: 2px 9px;
        }
        .pd-row {
          display: flex; align-items: center; gap: 14px;
          padding: 15px 24px;
          text-decoration: none; color: inherit;
          border-bottom: 1px solid #F3F0E8;
          transition: background 0.1s;
        }
        .pd-row:last-of-type { border-bottom: none; }
        .pd-bar { width: 3px; border-radius: 2px; flex-shrink: 0; align-self: stretch; min-height: 40px; }
        .pd-ri { flex: 1; min-width: 0; }
        /* Event name — primary label */
        .pd-event-name {
          font-weight: 600; font-size: 0.9375rem;
          color: var(--pd-ink);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin-bottom: 5px;
        }
        .pd-meta {
          display: flex; align-items: center; gap: 5px;
          font-size: 0.75rem; color: var(--pd-muted);
          white-space: nowrap; overflow: hidden;
        }
        .pd-ftag {
          font-size: 0.625rem; font-weight: 700;
          letter-spacing: 0.05em; text-transform: uppercase;
          padding: 2px 6px; border-radius: 4px;
          flex-shrink: 0;
        }
        .pd-sep { color: #D5CFCA; font-size: 0.4rem; flex-shrink: 0; }
        .pd-course-sub { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--pd-muted); }
        .pd-date { font-size: 0.8125rem; color: var(--pd-muted); font-weight: 400; white-space: nowrap; flex-shrink: 0; }
        .pd-chev { color: #D5CEBF; font-size: 1.25rem; flex-shrink: 0; line-height: 1; transition: transform 0.15s, color 0.15s; }

        /* Empty state */
        .pd-empty { padding: 52px 24px 44px; text-align: center; }
        .pd-empty-h {
          font-family: var(--font-dm-serif), serif;
          font-size: 1.5rem; font-weight: 400;
          color: #C0CFC0; margin-bottom: 12px; display: block;
        }
        .pd-empty-p { font-size: 0.9375rem; color: var(--pd-muted); line-height: 1.65; }

        /* Footer sign-out — hidden on mobile, shown at desktop */
        .pd-foot { display: none; }
        .pd-foot-so {
          background: none; border: none;
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.8125rem; color: var(--pd-muted);
          cursor: pointer; padding: 4px 0;
          transition: color 0.15s;
        }
        .pd-foot-so:hover { color: var(--pd-accent); }

        /* ── Bottom nav (mobile) ─────────────────────────── */
        .pd-bnav {
          display: flex;
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
          background: #fff;
          border-top: 1px solid var(--pd-border);
          padding: 8px 0 max(16px, env(safe-area-inset-bottom));
          align-items: center;
          justify-content: space-around;
        }
        .pd-bnav-item {
          display: flex; flex-direction: column; align-items: center; gap: 3px;
          flex: 1;
          background: none; border: none; cursor: pointer;
          padding: 4px 0;
          color: #B0C0B0;
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.625rem; font-weight: 600;
          letter-spacing: 0.04em; text-transform: uppercase;
          text-decoration: none;
          transition: color 0.15s;
        }
        .pd-bnav-item.active { color: var(--pd-accent); }
        .pd-bnav-item svg { flex-shrink: 0; }
        .pd-bnav-play {
          display: flex; flex-direction: column; align-items: center; gap: 3px;
          flex: 1; text-decoration: none;
        }
        .pd-bnav-play-btn {
          width: 54px; height: 54px;
          background: var(--pd-accent);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 16px rgba(13,99,27,0.45);
          margin-top: -22px;
          transition: background 0.15s, transform 0.12s, box-shadow 0.15s;
        }
        .pd-bnav-play:active .pd-bnav-play-btn {
          transform: scale(0.95);
          box-shadow: 0 2px 8px rgba(13,99,27,0.3);
        }
        .pd-bnav-play-label {
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.625rem; font-weight: 600;
          letter-spacing: 0.04em; text-transform: uppercase;
          color: var(--pd-accent);
        }

        /* ── Animations ──────────────────────────────────── */
        @keyframes pd-rise {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Desktop enhancements (≥768px) ───────────────── */
        @media (min-width: 768px) {
          .pd-hd-in { padding: 28px 32px 72px; }
          .pd-nav { margin-bottom: 64px; }
          .pd-name { font-size: clamp(2.25rem, 5vw, 3.75rem); }

          /* Show sign-out in header; hide bottom nav */
          .pd-so {
            display: block;
            background: none; border: none;
            font-family: var(--font-dm-sans), sans-serif;
            font-size: 0.8125rem; color: rgba(255,255,255,0.3);
            cursor: pointer; padding: 8px 2px;
            transition: color 0.15s; letter-spacing: 0.01em;
          }
          .pd-so:hover { color: rgba(255,255,255,0.6); }
          .pd-bnav { display: none; }

          .pd-body { padding: 0 32px 80px; max-width: 720px; }
          .pd-stack { margin-top: -32px; gap: 20px; }
          .pd-play-btn:hover {
            background: var(--pd-act-h);
            transform: translateY(-1px);
            box-shadow: 0 10px 28px rgba(13,99,27,0.45);
          }
          .pd-row:hover { background: #FAFAF5; }
          .pd-row:hover .pd-chev { transform: translateX(3px); color: var(--pd-muted); }
          .pd-foot {
            display: flex; justify-content: flex-end;
            padding: 11px 24px 13px;
            border-top: 1px solid #F3F0E8;
          }
        }
      `}</style>

      <div className="pd">

        {/* ── Dark header ── */}
        <header className="pd-hd">
          <div className="pd-hd-in">
            <nav className="pd-nav">
              <Image
                src="/lx2-logo.svg"
                alt="LX2"
                width={56}
                height={28}
                style={{ filter: 'brightness(0) invert(1)', opacity: 0.88 }}
              />
              <div className="pd-nav-r">
                <Link href="/profile" className="pd-pill">
                  <div className="pd-av">{initials || '?'}</div>
                  {firstName}
                </Link>
                <button className="pd-so" onClick={handleSignOut}>Sign out</button>
              </div>
            </nav>

            <div className="pd-greet">Good {getTimeOfDay()}</div>
            <div className="pd-name">{displayName}</div>

            {(handicapIndex != null || roundsCount > 0) && (
              <div className="pd-stats">
                {handicapIndex != null && (
                  <div className="pd-hcp">
                    <span className="pd-hcp-label">HCP</span>
                    <span className="pd-hcp-val">
                      {handicapIndex % 1 === 0
                        ? handicapIndex.toFixed(1)
                        : handicapIndex}
                    </span>
                  </div>
                )}
                {handicapIndex != null && roundsCount > 0 && (
                  <div className="pd-stats-sep"/>
                )}
                {roundsCount > 0 && (
                  <span className="pd-rounds-stat">
                    {roundsCount} {roundsCount === 1 ? 'round' : 'rounds'}
                  </span>
                )}
              </div>
            )}
          </div>
        </header>

        {/* ── Body ── */}
        <div className="pd-body">
          <div className="pd-stack">

            {/* Primary action — single clean button */}
            {activeRoundId ? (
              <Link href={`/rounds/${activeRoundId}/score`} className="pd-play-btn join">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="pd-play-btn-icon" src="/lx2-mark.png" alt="" aria-hidden="true" />
                Join ongoing round
              </Link>
            ) : (
              <Link href="/play/new" className="pd-play-btn">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="pd-play-btn-icon" src="/lx2-mark.png" alt="" aria-hidden="true" />
                Start a new round
              </Link>
            )}

            {/* Recent rounds */}
            <div className="pd-rounds">
              <div className="pd-rounds-hd">
                <span className="pd-rounds-title">Recent rounds</span>
                {rounds.length > 0 && (
                  <span className="pd-rounds-ct">{rounds.length}</span>
                )}
              </div>

              {rounds.length === 0 ? (
                <div className="pd-empty">
                  <span className="pd-empty-h">No rounds yet.</span>
                  <p className="pd-empty-p">
                    Start your first round above<br/>and it will appear here.
                  </p>
                </div>
              ) : (
                rounds.map(round => {
                  const event = round.events
                  const courseName = event?.courses?.name ?? 'Golf course'
                  const comboName = event?.course_combinations?.name
                  const date = event?.date ? formatDate(event.date) : '—'
                  const format = event?.format ?? 'stableford'
                  const accent = FORMAT_ACCENT[format] ?? '#1A7D34'

                  const eventName = event?.name ?? courseName

                  return (
                    <Link key={round.id} href={`/rounds/${round.id}/score`} className="pd-row">
                      <div className="pd-bar" style={{ background: accent }}/>
                      <div className="pd-ri">
                        {/* Event name as primary — tells you what you played */}
                        <div className="pd-event-name">{eventName}</div>
                        <div className="pd-meta">
                          <span className="pd-ftag" style={{ background: accent + '18', color: accent }}>
                            {formatLabel(format)}
                          </span>
                          <span className="pd-sep">●</span>
                          <span className="pd-course-sub">{courseName}{comboName ? ` · ${comboName}` : ''}</span>
                        </div>
                      </div>
                      <div className="pd-date">{date}</div>
                      <div className="pd-chev">›</div>
                    </Link>
                  )
                })
              )}

              <div className="pd-foot">
                <button className="pd-foot-so" onClick={handleSignOut}>Sign out</button>
              </div>
            </div>

          </div>
        </div>

        {/* ── Bottom nav (mobile only) ── */}
        <nav className="pd-bnav">
          {/* Home — active */}
          <button className="pd-bnav-item active" aria-label="Home">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M3 12L12 4l9 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 10v9a1 1 0 001 1h4v-4h4v4h4a1 1 0 001-1v-9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Home
          </button>

          {/* Rounds */}
          <button className="pd-bnav-item" aria-label="Rounds">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.75"/>
              <path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              <path d="M8 14h4M8 17h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
            History
          </button>

          {/* Play — centred prominent */}
          <Link href="/play/new" className="pd-bnav-play" aria-label="Play golf">
            <div className="pd-bnav-play-btn">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/lx2-mark.png" alt="" aria-hidden="true" style={{ height: '26px', width: 'auto', filter: 'brightness(0) invert(1)' }} />
            </div>
            <span className="pd-bnav-play-label">Play</span>
          </Link>

          {/* Stats */}
          <button className="pd-bnav-item" aria-label="Stats">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Stats
          </button>

          {/* Profile */}
          <Link href="/profile" className="pd-bnav-item" aria-label="Profile">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.75"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
            Profile
          </Link>
        </nav>

      </div>
    </>
  )
}
