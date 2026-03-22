'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }

        .home {
          min-height: 100dvh;
          font-family: 'Lexend', system-ui, sans-serif;
          color: #fff;
          display: flex;
          flex-direction: column;
          position: relative;
          isolation: isolate;
        }

        /* ── Hero image & overlay ── */
        .hero-bg {
          position: fixed;
          inset: 0;
          z-index: -1;
          background: url('/hero.png') center center / cover no-repeat;
        }
        .hero-bg::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(0,0,0,0.28) 0%,
            rgba(0,0,0,0.18) 40%,
            rgba(0,0,0,0.48) 100%
          );
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
          filter: brightness(0) invert(1);
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
          color: rgba(255,255,255,0.8);
          text-decoration: none;
          letter-spacing: 0.04em;
          transition: color 0.15s;
        }

        .nav-link:hover { color: #fff; }

        .nav-cta {
          font-family: 'Lexend', sans-serif;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #fff;
          text-decoration: none;
          padding: 8px 20px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.35);
          border-radius: 9999px;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          transition: background 0.15s, border-color 0.15s;
        }

        .nav-cta:hover { background: rgba(255,255,255,0.25); border-color: rgba(255,255,255,0.6); }

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
          color: rgba(255,255,255,0.75);
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
          color: #fff;
          margin-bottom: 20px;
          opacity: 0;
          animation: rise 0.6s ease forwards 0.2s;
          text-shadow: 0 2px 24px rgba(0,0,0,0.3);
        }

        .hero-sub {
          font-family: 'Lexend', sans-serif;
          font-size: 1.0625rem;
          font-weight: 300;
          color: rgba(255,255,255,0.8);
          letter-spacing: 0.01em;
          line-height: 1.6;
          max-width: 400px;
          margin: 0 auto 52px;
          opacity: 0;
          animation: rise 0.6s ease forwards 0.3s;
          text-shadow: 0 1px 8px rgba(0,0,0,0.3);
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
          box-shadow: 0px 8px 32px rgba(0,0,0,0.3);
          transition: transform 0.15s, box-shadow 0.15s;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0px 12px 40px rgba(0,0,0,0.35);
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
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 1.5rem;
          font-family: 'Lexend', sans-serif;
          font-size: 0.9375rem;
          color: #fff;
          outline: none;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          transition: background 0.15s, border-color 0.15s;
        }

        .join-input::placeholder { color: rgba(255,255,255,0.5); }
        .join-input:focus { background: rgba(255,255,255,0.22); border-color: rgba(255,255,255,0.55); }

        .join-btn {
          padding: 18px 22px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 1.5rem;
          color: #fff;
          font-size: 1.1rem;
          cursor: pointer;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          transition: background 0.15s;
          display: flex;
          align-items: center;
          font-family: 'Manrope', sans-serif;
          font-weight: 700;
        }

        .join-btn:hover { background: rgba(255,255,255,0.25); }

        /* Secondary action cards */
        .actions-row { display: flex; gap: 10px; }

        .btn-secondary {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 18px 20px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.22);
          border-radius: 1.5rem;
          text-decoration: none;
          cursor: pointer;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          transition: transform 0.15s, background 0.15s;
          text-align: left;
        }

        .btn-secondary:hover {
          transform: translateY(-2px);
          background: rgba(255,255,255,0.2);
        }

        .btn-s-icon { font-size: 1.25rem; margin-bottom: 10px; }
        .btn-s-label { font-family: 'Manrope', sans-serif; font-size: 0.9375rem; font-weight: 600; color: #fff; margin-bottom: 3px; }
        .btn-s-sub { font-family: 'Lexend', sans-serif; font-size: 0.75rem; font-weight: 300; color: rgba(255,255,255,0.65); line-height: 1.4; }

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
          color: rgba(255,255,255,0.45);
          text-decoration: none;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          transition: color 0.15s;
        }
        .footer-link:hover { color: rgba(255,255,255,0.8); }
        .footer-tagline {
          font-family: 'Lexend', sans-serif;
          font-size: 0.6875rem;
          color: rgba(255,255,255,0.45);
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
        <div className="hero-bg" />
        {/* Nav */}
        <nav className="nav">
          <Link href="/" className="logo">
            <Image src="/lx2-logo.svg" alt="LX2" height={108} width={216} />
          </Link>
          <div className="nav-links">
            <Link href="/play" className="nav-link">Play</Link>
            <Link href="/organise" className="nav-link">Organise</Link>
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
            perfected.
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
