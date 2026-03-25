'use client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
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

interface UpcomingEvent {
  id: string
  name: string
  date: string
  courseName?: string | null
  playerCount?: number | null
}

interface Props {
  userId: string
  displayName: string
  rounds: RoundRow[]
  handicapIndex?: number | null
  roundsCount?: number
  activeRoundId?: string | null
  roundsThisMonth?: number | null
  avgScore?: number | null
  bestScore?: number | null
  upcomingEvent?: UpcomingEvent | null
}


function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function PlayDashboard({
  displayName,
  rounds,
  handicapIndex,
  roundsCount = 0,
  activeRoundId,
  roundsThisMonth,
  avgScore,
  bestScore,
  upcomingEvent,
}: Props) {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  // Always 3 stat cards — show n/a if data unavailable
  const stats: Array<{ icon: React.ReactNode; value: string; label: string }> = [
    {
      icon: <GolfBallIcon />,
      value: roundsCount > 0 ? String(roundsCount) : 'n/a',
      label: 'Total rounds',
    },
    {
      icon: <ChartIcon />,
      value: avgScore != null ? String(avgScore) : 'n/a',
      label: 'Avg score (12mo)',
    },
    {
      icon: <TrophyIcon />,
      value: bestScore != null ? String(bestScore) : 'n/a',
      label: 'Best score',
    },
  ]

  return (
    <>
      <style>{`
        /* ── Fairway Editorial Dashboard ─────────────────── */
        .fe {
          min-height: 100dvh;
          background: #F0F4EC;
          font-family: var(--font-lexend), system-ui, sans-serif;
          color: #1A1C1C;
          padding-bottom: max(80px, calc(80px + env(safe-area-inset-bottom)));
        }

        /* ── Header ──────────────────────────────────────── */
        .fe-hd {
          background: #F0F4EC;
          padding: 1rem 1.25rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .fe-hd-r {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .fe-icon-btn {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: transparent;
          border: none;
          color: #44483E;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease-in-out, color 0.2s ease-in-out;
        }
        .fe-icon-btn:hover {
          background: rgba(26, 28, 28, 0.05);
          color: #1A2E1A;
        }
        /* Desktop: sign-out link in header */
        .fe-so-hd {
          display: none;
          background: none;
          border: none;
          font-family: var(--font-lexend), sans-serif;
          font-size: 0.8125rem;
          color: #72786E;
          cursor: pointer;
          padding: 8px 4px;
          letter-spacing: 0.01em;
          transition: color 0.15s;
        }
        .fe-so-hd:hover { color: #2D5016; }

        /* ── Main content ────────────────────────────────── */
        .fe-main {
          padding: 1.5rem 1.25rem;
          max-width: 480px;
          margin: 0 auto;
        }

        /* ── Hero ────────────────────────────────────────── */
        .fe-hero {
          margin-bottom: 1.75rem;
          animation: fe-rise 0.45s cubic-bezier(0.2, 0, 0, 1) both;
        }
        .fe-name {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 800;
          font-size: 2rem;
          color: #1A2E1A;
          margin-bottom: 0.75rem;
          letter-spacing: -0.02em;
          line-height: 1.1;
        }
        .fe-hcp-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: linear-gradient(135deg, rgba(45, 80, 22, 0.1) 0%, rgba(61, 107, 26, 0.1) 100%);
          padding: 0.5rem 1rem;
          border-radius: 24px;
          font-family: var(--font-lexend), sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          color: #2D5016;
        }

        /* ── Stat cards ──────────────────────────────────── */
        .fe-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          animation: fe-rise 0.45s 0.06s cubic-bezier(0.2, 0, 0, 1) both;
        }
        .fe-stat {
          background: #FFFFFF;
          border-radius: 16px;
          padding: 1.25rem 0.75rem;
          text-align: center;
          box-shadow: 0 4px 12px rgba(26, 28, 28, 0.04);
          transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        }
        .fe-stat:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(26, 28, 28, 0.08);
        }
        .fe-stat-icon {
          width: 32px;
          height: 32px;
          margin: 0 auto 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(45, 80, 22, 0.1) 0%, rgba(61, 107, 26, 0.1) 100%);
          border-radius: 10px;
          color: #2D5016;
        }
        .fe-stat-val {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 700;
          font-size: 1.5rem;
          color: #1A2E1A;
          margin-bottom: 0.2rem;
          letter-spacing: -0.02em;
        }
        .fe-stat-label {
          font-family: var(--font-lexend), sans-serif;
          font-size: 0.6875rem;
          font-weight: 400;
          color: #72786E;
          line-height: 1.3;
        }

        /* ── CTA button ──────────────────────────────────── */
        .fe-cta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          width: 100%;
          padding: 1.125rem;
          background: linear-gradient(135deg, #2D5016 0%, #3D6B1A 100%);
          color: #FFFFFF;
          border: none;
          border-radius: 16px;
          font-family: var(--font-manrope), sans-serif;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(45, 80, 22, 0.2);
          transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
          margin-bottom: 2rem;
          text-decoration: none;
          letter-spacing: -0.01em;
          animation: fe-rise 0.45s 0.1s cubic-bezier(0.2, 0, 0, 1) both;
        }
        .fe-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 32px rgba(45, 80, 22, 0.28);
        }
        .fe-cta:active { transform: translateY(0); }

        /* Join variant */
        .fe-cta.join {
          background: #FFFFFF;
          color: #2D5016;
          border: 1.5px solid #E0EBE0;
          box-shadow: 0 4px 12px rgba(26, 28, 28, 0.06);
        }
        .fe-cta.join:hover {
          box-shadow: 0 8px 20px rgba(26, 28, 28, 0.1);
        }

        /* ── Section header ──────────────────────────────── */
        .fe-section-hd {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 700;
          font-size: 1.125rem;
          color: #1A2E1A;
          margin-bottom: 1rem;
          letter-spacing: -0.01em;
        }

        /* ── Rounds list ─────────────────────────────────── */
        .fe-rounds {
          margin-bottom: 2rem;
          animation: fe-rise 0.45s 0.14s cubic-bezier(0.2, 0, 0, 1) both;
        }
        .fe-rounds-list {
          background: #FFFFFF;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(26, 28, 28, 0.04);
        }
        .fe-round-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid rgba(26, 28, 28, 0.06);
          transition: background 0.2s ease-in-out;
          cursor: pointer;
          text-decoration: none;
          color: inherit;
        }
        .fe-round-row:last-child { border-bottom: none; }
        .fe-round-row:hover { background: rgba(240, 244, 236, 0.6); }
        .fe-round-info { flex: 1; min-width: 0; }
        .fe-course {
          font-family: var(--font-lexend), sans-serif;
          font-weight: 500;
          font-size: 0.9375rem;
          color: #1A1C1C;
          margin-bottom: 0.2rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .fe-round-date {
          font-family: var(--font-lexend), sans-serif;
          font-size: 0.8125rem;
          font-weight: 400;
          color: #72786E;
        }
        .fe-round-chev {
          color: #C8D4C8;
          font-size: 1.125rem;
          margin-left: 0.75rem;
          flex-shrink: 0;
          transition: transform 0.15s, color 0.15s;
        }
        .fe-round-row:hover .fe-round-chev {
          transform: translateX(2px);
          color: #2D5016;
        }

        /* Empty state */
        .fe-empty {
          padding: 3rem 1.5rem;
          text-align: center;
        }
        .fe-empty-h {
          font-family: var(--font-manrope), sans-serif;
          font-size: 1rem;
          font-weight: 600;
          color: #C0CFC0;
          margin-bottom: 0.5rem;
        }
        .fe-empty-p {
          font-size: 0.875rem;
          color: #72786E;
          line-height: 1.6;
        }

        /* ── Event card ──────────────────────────────────── */
        .fe-events {
          margin-bottom: 2rem;
          animation: fe-rise 0.45s 0.18s cubic-bezier(0.2, 0, 0, 1) both;
        }
        .fe-event-card {
          background: #FFFFFF;
          border-radius: 16px;
          padding: 1.25rem;
          box-shadow: 0 4px 12px rgba(26, 28, 28, 0.04);
          transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
          cursor: pointer;
          text-decoration: none;
          color: inherit;
          display: block;
        }
        .fe-event-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(26, 28, 28, 0.08);
        }
        .fe-event-date-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(146, 51, 87, 0.1);
          padding: 0.375rem 0.75rem;
          border-radius: 10px;
          font-family: var(--font-lexend), sans-serif;
          font-size: 0.75rem;
          font-weight: 500;
          color: #923357;
          margin-bottom: 0.75rem;
        }
        .fe-event-name {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 700;
          font-size: 1.125rem;
          color: #1A2E1A;
          margin-bottom: 0.5rem;
          letter-spacing: -0.01em;
        }
        .fe-event-meta {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-family: var(--font-lexend), sans-serif;
          font-size: 0.875rem;
          color: #44483E;
        }
        .fe-event-detail {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          color: #44483E;
        }
        .fe-event-detail svg { color: #72786E; flex-shrink: 0; }

        /* ── Bottom nav ──────────────────────────────────── */
        .fe-bnav {
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
        .fe-bnav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 0.75rem 0;
          gap: 0.25rem;
          text-decoration: none;
          color: #72786E;
          font-family: var(--font-lexend), sans-serif;
          font-size: 0.6875rem;
          font-weight: 500;
          background: none;
          border: none;
          cursor: pointer;
          transition: color 0.2s ease-in-out;
        }
        .fe-bnav-item svg {
          transition: transform 0.2s ease-in-out;
        }
        .fe-bnav-item.active { color: #2D5016; }
        .fe-bnav-item:hover { color: #2D5016; }
        .fe-bnav-item:hover svg { transform: translateY(-2px); }

        /* ── Animations ──────────────────────────────────── */
        @keyframes fe-rise {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Desktop ─────────────────────────────────────── */
        @media (min-width: 768px) {
          .fe-main {
            max-width: 560px;
            padding: 2rem 2rem;
          }
          .fe-name { font-size: 2.5rem; }
          .fe-bnav { display: none; }
          .fe-so-hd { display: block; }
          .fe { padding-bottom: 0; }
        }
      `}</style>

      <div className="fe">

        {/* ── Header ── */}
        <header className="fe-hd">
          <Image src="/lx2-logo.svg" alt="LX2" width={56} height={28} priority />
          <div className="fe-hd-r">
            <button className="fe-icon-btn" aria-label="Search">
              <SearchIcon />
            </button>
            <button className="fe-icon-btn" aria-label="Notifications">
              <BellIcon />
            </button>
            <button className="fe-so-hd" onClick={handleSignOut}>Sign out</button>
          </div>
        </header>

        {/* ── Main ── */}
        <main className="fe-main">

          {/* Hero */}
          <section className="fe-hero">
            <h1 className="fe-name">{displayName}</h1>
            {handicapIndex != null && (
              <div className="fe-hcp-badge">
                <FlagIcon size={14} />
                <span>{handicapIndex % 1 === 0 ? handicapIndex.toFixed(1) : handicapIndex} HCP</span>
              </div>
            )}
          </section>

          {/* Quick stats — always 3 cards */}
          <div className="fe-stats">
            {stats.map((s, i) => (
              <div className="fe-stat" key={i}>
                <div className="fe-stat-icon">{s.icon}</div>
                <div className="fe-stat-val">{s.value}</div>
                <div className="fe-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Primary CTA */}
          {activeRoundId ? (
            <Link href={`/rounds/${activeRoundId}/score`} className="fe-cta join">
              <PlayIcon />
              Join ongoing round
            </Link>
          ) : (
            <Link href="/play/new" className="fe-cta">
              <PlusIcon />
              Start a new round
            </Link>
          )}

          {/* Recent rounds */}
          <section className="fe-rounds">
            <h2 className="fe-section-hd">Recent Rounds</h2>
            <div className="fe-rounds-list">
              {rounds.length === 0 ? (
                <div className="fe-empty">
                  <div className="fe-empty-h">No rounds yet</div>
                  <p className="fe-empty-p">
                    Start your first round above<br />and it will appear here.
                  </p>
                </div>
              ) : (
                rounds.map(round => {
                  const event = round.events
                  const courseName = event?.courses?.name ?? event?.name ?? 'Golf course'
                  const comboName = event?.course_combinations?.name
                  const displayCourse = comboName ? `${courseName} · ${comboName}` : courseName
                  const date = formatDate(event?.date ?? round.created_at)

                  return (
                    <Link key={round.id} href={`/rounds/${round.id}/score`} className="fe-round-row">
                      <div className="fe-round-info">
                        <div className="fe-course">{displayCourse}</div>
                        <div className="fe-round-date">{date}</div>
                      </div>
                      <div className="fe-round-chev">›</div>
                    </Link>
                  )
                })
              )}
            </div>
          </section>

          {/* Upcoming event — optional */}
          {upcomingEvent && (
            <section className="fe-events">
              <h2 className="fe-section-hd">Upcoming Events</h2>
              <Link href={`/events/${upcomingEvent.id}`} className="fe-event-card">
                <div className="fe-event-date-badge">
                  <CalendarIcon size={12} />
                  <span>{formatEventDate(upcomingEvent.date)}</span>
                </div>
                <div className="fe-event-name">{upcomingEvent.name}</div>
                <div className="fe-event-meta">
                  {upcomingEvent.courseName && (
                    <div className="fe-event-detail">
                      <PinIcon />
                      <span>{upcomingEvent.courseName}</span>
                    </div>
                  )}
                  {upcomingEvent.playerCount != null && (
                    <div className="fe-event-detail">
                      <UsersIcon />
                      <span>{upcomingEvent.playerCount} players</span>
                    </div>
                  )}
                </div>
              </Link>
            </section>
          )}

        </main>

        {/* ── Bottom nav ── */}
        <nav className="fe-bnav">
          <Link href="/play" className="fe-bnav-item active" aria-label="Home">
            <HomeIcon />
            <span>Home</span>
          </Link>
          <Link href="/rounds" className="fe-bnav-item" aria-label="Rounds">
            <ClipboardIcon />
            <span>Rounds</span>
          </Link>
          <Link href="/events" className="fe-bnav-item" aria-label="Events">
            <TrophyIcon size={20} />
            <span>Events</span>
          </Link>
          <Link href="/society" className="fe-bnav-item" aria-label="Society">
            <UsersIcon size={20} />
            <span>Society</span>
          </Link>
          <Link href="/profile" className="fe-bnav-item" aria-label="Profile">
            <UserIcon />
            <span>Profile</span>
          </Link>
        </nav>

      </div>
    </>
  )
}

/* ── Inline SVG icons ────────────────────────────────────────── */

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function FlagIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

function GolfBallIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M9 9h.01M12 8h.01M15 9h.01M10 12h.01M14 12h.01M12 15h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 17l4-8 4 4 4-6 4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function TrophyIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 21h8M12 17v4M12 17c-4.4 0-8-3.6-8-8V5h16v4c0 4.4-3.6 8-8 8z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 9H2a1 1 0 01-1-1V7a1 1 0 011-1h2M20 9h2a1 1 0 001-1V7a1 1 0 00-1-1h-2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M10 8l6 4-6 4V8z" fill="currentColor"/>
    </svg>
  )
}

function CalendarIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

function PinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 22s-8-6.5-8-13a8 8 0 1116 0c0 6.5-8 13-8 13z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.75"/>
    </svg>
  )
}

function UsersIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 12L12 4l9 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 10v9a1 1 0 001 1h4v-4h4v4h4a1 1 0 001-1v-9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function ClipboardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
      <path d="M8 14h4M8 17h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}
