'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function HomePage() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [code, setCode] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null)
    })
  }, [])

  const handleJoin = () => {
    if (code.trim()) window.location.href = `/events/${code.trim()}`
  }

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Lexend:wght@300;400;500&display=swap" rel="stylesheet" />

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }

        .home {
          min-height: 100dvh;
          background: #F0F4EC;
          font-family: 'Lexend', system-ui, sans-serif;
          color: #1A2E1A;
          display: flex;
          flex-direction: column;
          position: relative;
        }

        /* ── Nav ── */
        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 28px 44px;
          position: relative;
          z-index: 10;
        }

        .logo {
          display: flex;
          align-items: center;
          text-decoration: none;
        }

        .logo img {
          height: 56px;
          width: auto;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 28px;
        }

        .nav-link {
          font-family: 'Lexend', sans-serif;
          font-size: 0.8125rem;
          font-weight: 400;
          color: #6B8C6B;
          text-decoration: none;
          letter-spacing: 0.04em;
          transition: color 0.15s;
        }

        .nav-link:hover { color: #1A2E1A; }

        .nav-cta {
          font-family: 'Lexend', sans-serif;
          font-size: 0.8125rem;
          font-weight: 500;
          color: #0D631B;
          text-decoration: none;
          padding: 8px 18px;
          border: 1px solid rgba(13,99,27,0.25);
          border-radius: 9999px;
          transition: background 0.15s, border-color 0.15s;
        }

        .nav-cta:hover { background: rgba(13,99,27,0.06); border-color: rgba(13,99,27,0.5); }

        /* ── Hero ── */
        .hero {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 44px 40px;
          text-align: center;
          position: relative;
        }

        .hero-label {
          font-family: 'Lexend', sans-serif;
          font-size: 0.6875rem;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #0D631B;
          margin-bottom: 20px;
          opacity: 0;
          animation: rise 0.5s ease forwards 0.1s;
        }

        .hero-title {
          font-family: 'Manrope', sans-serif;
          font-size: clamp(3rem, 9vw, 5.5rem);
          font-weight: 800;
          line-height: 1.0;
          letter-spacing: -0.025em;
          color: #1A2E1A;
          margin-bottom: 20px;
          opacity: 0;
          animation: rise 0.6s ease forwards 0.2s;
        }

        .hero-title .accent {
          color: #0D631B;
        }

        .hero-sub {
          font-family: 'Lexend', sans-serif;
          font-size: 1.0625rem;
          font-weight: 300;
          color: #6B8C6B;
          letter-spacing: 0.01em;
          line-height: 1.6;
          max-width: 400px;
          margin: 0 auto 52px;
          opacity: 0;
          animation: rise 0.6s ease forwards 0.3s;
        }

        /* ── Actions ── */
        .actions {
          width: 100%;
          max-width: 440px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          opacity: 0;
          animation: rise 0.7s ease forwards 0.45s;
        }

        /* Primary — green gradient, main CTA */
        .btn-primary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 22px 26px;
          background: linear-gradient(135deg, #0D631B 0%, #2E7D32 100%);
          border-radius: 1.5rem;
          text-decoration: none;
          border: none;
          cursor: pointer;
          width: 100%;
          box-shadow: 0px 8px 24px rgba(13, 99, 27, 0.22);
          transition: transform 0.15s, box-shadow 0.15s;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0px 12px 32px rgba(13, 99, 27, 0.28);
        }

        .btn-primary:active { transform: translateY(0); }

        .btn-p-left { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; }
        .btn-p-label { font-family: 'Manrope', sans-serif; font-size: 1.0625rem; font-weight: 700; color: #fff; letter-spacing: -0.01em; }
        .btn-p-sub { font-family: 'Lexend', sans-serif; font-size: 0.8125rem; font-weight: 300; color: rgba(255,255,255,0.7); }
        .btn-p-arrow { font-size: 1.25rem; color: rgba(255,255,255,0.7); }

        /* Join row */
        .join-row { display: flex; gap: 8px; }

        .join-input {
          flex: 1;
          padding: 18px 20px;
          background: #fff;
          border: none;
          border-radius: 1.5rem;
          font-family: 'Lexend', sans-serif;
          font-size: 0.9375rem;
          color: #1A2E1A;
          outline: none;
          box-shadow: 0px 8px 24px rgba(26,28,28,0.06);
          transition: box-shadow 0.15s;
        }

        .join-input::placeholder { color: #A0B898; }
        .join-input:focus { box-shadow: 0px 8px 24px rgba(13,99,27,0.12), 0 0 0 2px rgba(13,99,27,0.2); }

        .join-btn {
          padding: 18px 22px;
          background: #fff;
          border: none;
          border-radius: 1.5rem;
          color: #0D631B;
          font-size: 1.1rem;
          cursor: pointer;
          box-shadow: 0px 8px 24px rgba(26,28,28,0.06);
          transition: background 0.15s, box-shadow 0.15s;
          display: flex;
          align-items: center;
          font-family: 'Manrope', sans-serif;
          font-weight: 700;
        }

        .join-btn:hover { background: #E8F5E9; box-shadow: 0px 8px 24px rgba(13,99,27,0.1); }

        /* Secondary action cards */
        .actions-row { display: flex; gap: 10px; }

        .btn-secondary {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 18px 20px;
          background: #fff;
          border: none;
          border-radius: 1.5rem;
          text-decoration: none;
          cursor: pointer;
          box-shadow: 0px 8px 24px rgba(26,28,28,0.06);
          transition: transform 0.15s, box-shadow 0.15s;
          text-align: left;
        }

        .btn-secondary:hover {
          transform: translateY(-2px);
          box-shadow: 0px 12px 28px rgba(26,28,28,0.1);
        }

        .btn-s-icon { font-size: 1.25rem; margin-bottom: 10px; }
        .btn-s-label { font-family: 'Manrope', sans-serif; font-size: 0.9375rem; font-weight: 600; color: #1A2E1A; margin-bottom: 3px; }
        .btn-s-sub { font-family: 'Lexend', sans-serif; font-size: 0.75rem; font-weight: 300; color: #6B8C6B; line-height: 1.4; }

        /* ── Decorative course illustration ── */
        .deco {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 140px;
          overflow: hidden;
          pointer-events: none;
          opacity: 0.35;
        }

        /* ── Footer ── */
        .home-footer {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 44px 28px;
        }

        .footer-links { display: flex; gap: 24px; }
        .footer-link {
          font-family: 'Lexend', sans-serif;
          font-size: 0.6875rem;
          font-weight: 400;
          color: #A0B898;
          text-decoration: none;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          transition: color 0.15s;
        }
        .footer-link:hover { color: #6B8C6B; }
        .footer-tagline {
          font-family: 'Lexend', sans-serif;
          font-size: 0.6875rem;
          color: #A0B898;
          letter-spacing: 0.04em;
        }

        @keyframes rise {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 600px) {
          .nav { padding: 20px 20px; }
          .hero { padding: 36px 20px 32px; }
          .actions { max-width: 100%; }
          .actions-row { flex-direction: column; }
          .home-footer { padding: 16px 20px 24px; flex-direction: column; gap: 12px; }
          .nav-links .nav-link:not(.nav-cta) { display: none; }
        }
      `}</style>

      <div className="home">
        {/* Nav */}
        <nav className="nav">
          <a href="/" className="logo">
            <img src="/lx2-logo.svg" alt="LX2" height={36} />
          </a>
          <div className="nav-links">
            <a href="/play" className="nav-link">Play</a>
            <a href="/organise" className="nav-link">Organise</a>
            {userEmail ? (
              <a href="/auth/login" className="nav-cta">Account</a>
            ) : (
              <a href="/auth/login" className="nav-cta">Sign in</a>
            )}
          </div>
        </nav>

        {/* Hero */}
        <main className="hero">
          <div className="hero-label">Golf society management</div>
          <h1 className="hero-title">
            Your round,<br/>
            <span className="accent">perfected.</span>
          </h1>
          <p className="hero-sub">
            Scoring, leaderboards and society management — built for the way your group actually plays.
          </p>

          <div className="actions">
            {/* Primary CTA */}
            <a href={userEmail ? "/play/round" : "/auth/login"} className="btn-primary">
              <div className="btn-p-left">
                <span className="btn-p-label">Start new round</span>
                <span className="btn-p-sub">Score any course, track your handicap</span>
              </div>
              <span className="btn-p-arrow">→</span>
            </a>

            {/* Join via code */}
            <div className="join-row">
              <input
                className="join-input"
                placeholder="Have an event code? Enter it here"
                value={code}
                onChange={e => setCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
              />
              <button className="join-btn" onClick={handleJoin}>→</button>
            </div>

            {/* Secondary actions */}
            <div className="actions-row">
              <a href={userEmail ? "/organise" : "/auth/login"} className="btn-secondary">
                <div className="btn-s-icon">📋</div>
                <div className="btn-s-label">Set up event</div>
                <div className="btn-s-sub">Society days, competitions, club events</div>
              </a>

              <a href="/leaderboard" className="btn-secondary">
                <div className="btn-s-icon">📡</div>
                <div className="btn-s-label">Live leaderboard</div>
                <div className="btn-s-sub">Follow a round in real time</div>
              </a>
            </div>
          </div>

          {/* Rolling hills decoration */}
          <div className="deco">
            <svg width="100%" height="140" viewBox="0 0 1440 140" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 80 Q180 20 360 60 Q540 100 720 50 Q900 0 1080 55 Q1260 110 1440 45 L1440 140 L0 140 Z" fill="#2E7D32" opacity="0.12"/>
              <path d="M0 100 Q200 50 400 80 Q600 110 800 65 Q1000 20 1200 70 Q1350 100 1440 75 L1440 140 L0 140 Z" fill="#0D631B" opacity="0.08"/>
            </svg>
          </div>
        </main>

        {/* Footer */}
        <footer className="home-footer">
          <div className="footer-links">
            <a href="/play" className="footer-link">Play</a>
            <a href="/organise" className="footer-link">Organise</a>
            <a href="https://lx2-architecture.vercel.app" className="footer-link">Architecture</a>
          </div>
          <span className="footer-tagline">Play to par. · lx2.golf</span>
        </footer>
      </div>
    </>
  )
}
