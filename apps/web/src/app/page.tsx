import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .home {
          min-height: 100dvh;
          background: #0c1a0e;
          color: #e8ede8;
          font-family: 'DM Sans', system-ui, sans-serif;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        /* Subtle grain texture */
        .home::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
        }

        /* Gold accent line top */
        .home::after {
          content: '';
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, #c9a84c60, transparent);
          z-index: 1;
        }

        .nav {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 28px 32px 0;
        }

        .wordmark {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 28px;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: #e8ede8;
          text-decoration: none;
          line-height: 1;
        }

        .wordmark em {
          font-style: normal;
          color: #c9a84c;
        }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .nav-user {
          font-size: 12px;
          color: #6b8c6b;
          font-weight: 300;
          letter-spacing: 0.02em;
        }

        .nav-link {
          font-size: 12px;
          color: #c9a84c;
          text-decoration: none;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          font-weight: 500;
        }

        /* Hero */
        .hero {
          position: relative;
          z-index: 10;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px 32px;
          text-align: center;
        }

        .hero-eyebrow {
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #c9a84c;
          font-weight: 400;
          margin-bottom: 20px;
          opacity: 0;
          animation: fadeUp 0.6s ease forwards 0.1s;
        }

        .hero-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(48px, 10vw, 88px);
          font-weight: 400;
          line-height: 1;
          letter-spacing: -0.01em;
          color: #e8ede8;
          margin-bottom: 8px;
          opacity: 0;
          animation: fadeUp 0.7s ease forwards 0.2s;
        }

        .hero-title em {
          font-style: italic;
          color: #c9a84c;
        }

        .hero-sub {
          font-size: 15px;
          color: #6b8c6b;
          font-weight: 300;
          letter-spacing: 0.03em;
          margin-bottom: 52px;
          opacity: 0;
          animation: fadeUp 0.7s ease forwards 0.35s;
        }

        /* Action cards */
        .actions {
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          opacity: 0;
          animation: fadeUp 0.8s ease forwards 0.5s;
        }

        .action-primary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          background: #c9a84c;
          border-radius: 14px;
          text-decoration: none;
          transition: transform 0.15s, background 0.15s;
          border: none;
          cursor: pointer;
          width: 100%;
        }

        .action-primary:hover { transform: translateY(-1px); background: #d4b55e; }
        .action-primary:active { transform: translateY(0); }

        .action-primary-left { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
        .action-primary-label { font-size: 16px; font-weight: 500; color: #0c1a0e; letter-spacing: -0.01em; }
        .action-primary-sub { font-size: 12px; color: #0c1a0e; opacity: 0.6; font-weight: 300; }
        .action-primary-arrow { font-size: 20px; color: #0c1a0e; opacity: 0.5; }

        .action-secondary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          text-decoration: none;
          transition: background 0.15s, border-color 0.15s;
          cursor: pointer;
          width: 100%;
        }

        .action-secondary:hover { background: rgba(255,255,255,0.07); border-color: rgba(201,168,76,0.3); }

        .action-secondary-left { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
        .action-secondary-label { font-size: 15px; font-weight: 400; color: #c8d8c8; letter-spacing: -0.01em; }
        .action-secondary-sub { font-size: 12px; color: #5a7a5a; font-weight: 300; }
        .action-secondary-icon { font-size: 16px; opacity: 0.5; }

        /* Join input row */
        .join-row {
          display: flex;
          gap: 8px;
          width: 100%;
        }

        .join-input {
          flex: 1;
          padding: 18px 18px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          color: #e8ede8;
          font-size: 15px;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          letter-spacing: 0.05em;
          transition: border-color 0.15s;
        }

        .join-input::placeholder { color: #3a5a3a; }
        .join-input:focus { border-color: rgba(201,168,76,0.4); }

        .join-btn {
          padding: 18px 20px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          color: #c9a84c;
          font-size: 20px;
          cursor: pointer;
          transition: background 0.15s;
          display: flex;
          align-items: center;
        }

        .join-btn:hover { background: rgba(201,168,76,0.1); border-color: rgba(201,168,76,0.3); }

        /* Footer rule */
        .home-footer {
          position: relative;
          z-index: 10;
          padding: 20px 32px 28px;
          display: flex;
          justify-content: center;
          gap: 24px;
        }

        .footer-link {
          font-size: 11px;
          color: #3a5a3a;
          text-decoration: none;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition: color 0.15s;
        }

        .footer-link:hover { color: #6b8c6b; }

        /* Decorative circle */
        .deco-circle {
          position: fixed;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          border: 1px solid rgba(201,168,76,0.06);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 0;
        }

        .deco-circle-2 {
          position: fixed;
          width: 900px;
          height: 900px;
          border-radius: 50%;
          border: 1px solid rgba(201,168,76,0.03);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 0;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 480px) {
          .nav { padding: 20px 20px 0; }
          .home-footer { padding: 16px 20px 24px; }
        }
      `}</style>

      <div className="home">
        <div className="deco-circle" />
        <div className="deco-circle-2" />

        {/* Nav */}
        <nav className="nav">
          <a href="/" className="wordmark">LX<em>2</em></a>
          <div className="nav-right">
            {user ? (
              <>
                <span className="nav-user">{user.email}</span>
                <a href="/auth/login" className="nav-link">Sign out</a>
              </>
            ) : (
              <a href="/auth/login" className="nav-link">Sign in</a>
            )}
          </div>
        </nav>

        {/* Hero */}
        <main className="hero">
          <div className="hero-eyebrow">Golf society management</div>
          <h1 className="hero-title">Play to <em>par.</em></h1>
          <p className="hero-sub">Scoring, leaderboards and society management — in your pocket.</p>

          <div className="actions">
            {/* Primary CTA */}
            <Link href={user ? "/events/new" : "/auth/login"} className="action-primary">
              <div className="action-primary-left">
                <span className="action-primary-label">Start new round</span>
                <span className="action-primary-sub">Create an event and invite your group</span>
              </div>
              <span className="action-primary-arrow">→</span>
            </Link>

            {/* Join a round */}
            <div className="join-row">
              <input className="join-input" placeholder="Enter event code" maxLength={8}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value.trim()
                    if (val) window.location.href = `/events/${val}`
                  }
                }}
              />
              <button className="join-btn" title="Join round"
                onClick={() => {
                  const input = document.querySelector('.join-input') as HTMLInputElement
                  if (input?.value.trim()) window.location.href = `/events/${input.value.trim()}`
                }}>→</button>
            </div>

            {/* Secondary actions */}
            <Link href={user ? "/rounds" : "/auth/login"} className="action-secondary">
              <div className="action-secondary-left">
                <span className="action-secondary-label">Past rounds</span>
                <span className="action-secondary-sub">Your scoring history and stats</span>
              </div>
              <span className="action-secondary-icon">📋</span>
            </Link>

            <Link href="/leaderboard" className="action-secondary">
              <div className="action-secondary-left">
                <span className="action-secondary-label">Live leaderboard</span>
                <span className="action-secondary-sub">Follow a round in real time</span>
              </div>
              <span className="action-secondary-icon">📡</span>
            </Link>
          </div>
        </main>

        {/* Footer */}
        <footer className="home-footer">
          <a href="/about" className="footer-link">About</a>
          <a href="https://lx2-architecture.vercel.app" className="footer-link">Architecture</a>
          <a href="mailto:matt@lx2.golf" className="footer-link">Contact</a>
        </footer>
      </div>
    </>
  )
}
