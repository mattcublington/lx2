import Link from 'next/link'

type Tab = 'home' | 'rounds' | 'events' | 'analysis' | 'profile'

export default function BottomNav({ active }: { active: Tab }) {
  return (
    <>
      <style>{`
        .bnav {
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
        .bnav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 0.75rem 0;
          gap: 0.25rem;
          text-decoration: none;
          color: #72786E;
          font-family: var(--font-lexend), sans-serif;
          font-size: 0.625rem;
          font-weight: 500;
          transition: color 0.2s ease-in-out;
        }
        .bnav-item svg { transition: transform 0.2s ease-in-out; }
        .bnav-item.active { color: #0D631B; }
        .bnav-item:hover { color: #0D631B; }
        .bnav-item:hover svg { transform: translateY(-2px); }
        @media (min-width: 768px) { .bnav { display: none; } }
      `}</style>
      <nav className="bnav">
        <Link href="/play"     className={`bnav-item${active === 'home'     ? ' active' : ''}`} aria-label="Home">
          <HomeIcon /><span>Home</span>
        </Link>
        <Link href="/rounds"   className={`bnav-item${active === 'rounds'   ? ' active' : ''}`} aria-label="Rounds">
          <ClipboardIcon /><span>Rounds</span>
        </Link>
        <Link href="/tournaments"   className={`bnav-item${active === 'events'   ? ' active' : ''}`} aria-label="Tournaments">
          <TrophyIcon /><span>Tournaments</span>
        </Link>
        <Link href="/analysis" className={`bnav-item${active === 'analysis' ? ' active' : ''}`} aria-label="Analysis">
          <AnalysisIcon /><span>Analysis</span>
        </Link>
        <Link href="/profile"  className={`bnav-item${active === 'profile'  ? ' active' : ''}`} aria-label="Profile">
          <UserIcon /><span>Profile</span>
        </Link>
      </nav>
    </>
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

function TrophyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 21h8M12 17v4M12 17c-4.4 0-8-3.6-8-8V5h16v4c0 4.4-3.6 8-8 8z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 9H2a1 1 0 01-1-1V7a1 1 0 011-1h2M20 9h2a1 1 0 001-1V7a1 1 0 00-1-1h-2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

function AnalysisIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 17l4-8 4 4 4-6 4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 21h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
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
