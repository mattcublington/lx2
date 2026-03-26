'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function HomePage() {
  const [userInitial, setUserInitial] = useState<string | null>(null)
  const [showCode, setShowCode] = useState(false)
  const [code, setCode] = useState('')
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      const name = user?.user_metadata?.full_name ?? user?.email ?? null
      setUserInitial(name ? name[0].toUpperCase() : null)
    })
  }, [])

  const handleJoinEvent = () => {
    setShowCode(true)
    setTimeout(() => codeRef.current?.focus(), 50)
  }

  const handleJoin = () => {
    if (code.trim()) window.location.href = `/events/${code.trim()}`
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body {
          font-family: var(--font-lexend), 'Lexend', system-ui, sans-serif;
          background: #F0F4EC;
          color: #1A2E1A;
        }

        /* ── Nav ── */
        .hp-nav {
          position: absolute;
          top: 0; left: 0; right: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 28px 44px;
          z-index: 20;
        }
        .hp-logo { display: flex; align-items: center; text-decoration: none; }
        .hp-nav-links { display: flex; align-items: center; gap: 32px; }
        .hp-nav-link {
          font-size: 0.875rem;
          font-weight: 400;
          color: rgba(255,255,255,0.85);
          text-decoration: none;
          letter-spacing: 0.02em;
          transition: color 0.15s;
        }
        .hp-nav-link:hover { color: #fff; }
        .hp-nav-profile {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 9999px;
          background: rgba(10, 20, 10, 0.72);
          border: 1.5px solid rgba(255,255,255,0.18);
          color: #fff;
          font-family: var(--font-manrope), 'Manrope', sans-serif;
          font-weight: 700;
          font-size: 15px;
          text-decoration: none;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          transition: background 0.15s, border-color 0.15s, transform 0.15s;
          letter-spacing: 0;
          flex-shrink: 0;
        }
        .hp-nav-profile:hover {
          background: rgba(10, 20, 10, 0.88);
          border-color: rgba(255,255,255,0.3);
          transform: translateY(-1px);
        }

        /* ── Hero ── */
        .hp-hero {
          position: relative;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .hp-hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(240, 244, 236, 0) 0%,
            rgba(240, 244, 236, 0.25) 28%,
            rgba(240, 244, 236, 0.65) 55%,
            rgba(240, 244, 236, 0.92) 78%,
            rgba(240, 244, 236, 1) 100%
          );
          z-index: 2;
        }
        .hp-hero-content {
          position: relative;
          z-index: 3;
          width: 100%;
          max-width: 860px;
          padding: 120px 44px 80px;
          text-align: center;
        }
        .hp-hero h1 {
          font-family: var(--font-manrope), 'Manrope', sans-serif;
          font-weight: 800;
          font-size: 72px;
          line-height: 1.1;
          color: #1A2E1A;
          margin-bottom: 1.25rem;
          letter-spacing: -0.02em;
          opacity: 0;
          animation: hp-rise 0.7s ease forwards 0.15s;
        }
        .hp-hero p {
          font-family: var(--font-lexend), 'Lexend', sans-serif;
          font-size: 21px;
          font-weight: 400;
          color: #44483E;
          line-height: 1.55;
          margin-bottom: 2.75rem;
          max-width: 560px;
          margin-left: auto;
          margin-right: auto;
          opacity: 0;
          animation: hp-rise 0.7s ease forwards 0.3s;
        }
        .hp-hero-ctas {
          display: flex;
          gap: 0.875rem;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          opacity: 0;
          animation: hp-rise 0.7s ease forwards 0.45s;
        }
        .hp-code-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 1.5rem;
          opacity: 0;
          animation: hp-rise 0.4s ease forwards 0s;
        }
        .hp-code-row.visible { animation: hp-rise 0.4s ease forwards 0s; opacity: 0; }
        .hp-code-label {
          font-size: 0.875rem;
          color: #72786E;
          white-space: nowrap;
        }
        .hp-code-input {
          width: 148px;
          padding: 10px 16px;
          background: rgba(255,255,255,0.75);
          border: 1.5px solid rgba(26,28,28,0.18);
          border-radius: 9999px;
          font-family: var(--font-lexend), 'Lexend', sans-serif;
          font-size: 0.875rem;
          color: #1A2E1A;
          outline: none;
          text-align: center;
          letter-spacing: 0.08em;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          transition: background 0.15s, border-color 0.15s, width 0.2s;
        }
        .hp-code-input::placeholder { color: #72786E; letter-spacing: 0.04em; }
        .hp-code-input:focus {
          background: #fff;
          border-color: rgba(26,28,28,0.3);
          width: 180px;
          outline: none;
        }
        .hp-code-btn {
          padding: 10px 18px;
          background: rgba(26,44,26,0.08);
          border: 1.5px solid rgba(26,28,28,0.15);
          border-radius: 9999px;
          color: #1A2E1A;
          font-size: 0.875rem;
          font-family: var(--font-lexend), 'Lexend', sans-serif;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }
        .hp-code-btn:hover { background: rgba(26,44,26,0.14); }

        /* ── Buttons ── */
        .hp-btn-primary {
          display: inline-flex;
          align-items: center;
          background: linear-gradient(135deg, #2D5016 0%, #3D6B1A 100%);
          color: #fff;
          padding: 0.875rem 2.25rem;
          border-radius: 9999px;
          font-family: var(--font-lexend), 'Lexend', sans-serif;
          font-weight: 500;
          font-size: 1rem;
          border: none;
          cursor: pointer;
          text-decoration: none;
          box-shadow: 0 8px 24px rgba(26, 28, 28, 0.12);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          white-space: nowrap;
        }
        .hp-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(26, 28, 28, 0.2); }
        .hp-btn-primary:focus-visible { outline: 2px solid #3D6B1A; outline-offset: 2px; }

        .hp-btn-secondary {
          display: inline-flex;
          align-items: center;
          background: transparent;
          color: #1A2E1A;
          padding: 0.875rem 2.25rem;
          border-radius: 9999px;
          font-family: var(--font-lexend), 'Lexend', sans-serif;
          font-weight: 500;
          font-size: 1rem;
          border: 2px solid rgba(26, 28, 28, 0.22);
          cursor: pointer;
          text-decoration: none;
          white-space: nowrap;
          transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
        }
        .hp-btn-secondary:hover {
          background: rgba(255,255,255,0.65);
          border-color: rgba(26,28,28,0.32);
          transform: translateY(-1px);
        }
        .hp-btn-secondary:focus-visible { outline: 2px solid #1A2E1A; outline-offset: 2px; }

        .hp-btn-link {
          display: inline-flex;
          align-items: center;
          background: transparent;
          color: #923357;
          padding: 0.875rem 1.25rem;
          font-family: var(--font-lexend), 'Lexend', sans-serif;
          font-weight: 500;
          font-size: 1rem;
          border: none;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 4px;
          transition: color 0.2s ease;
          white-space: nowrap;
        }
        .hp-btn-link:hover { color: #7A2A49; text-decoration-thickness: 2px; }
        .hp-btn-link:focus-visible { outline: 2px solid #923357; outline-offset: 2px; }

        /* ── Features ── */
        .hp-features {
          background: #F0F4EC;
          padding: 6rem 44px;
        }
        .hp-features-inner {
          max-width: 1400px;
          margin: 0 auto;
        }
        .hp-features h2 {
          font-family: var(--font-manrope), 'Manrope', sans-serif;
          font-weight: 800;
          font-size: 48px;
          color: #1A2E1A;
          text-align: center;
          margin-bottom: 3.5rem;
          letter-spacing: -0.015em;
        }
        .hp-features-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.75rem;
        }
        .hp-feature-card {
          background: #fff;
          border-radius: 24px;
          padding: 2.5rem 1.75rem;
          text-align: center;
          box-shadow: 0 8px 24px rgba(26, 28, 28, 0.06);
        }
        .hp-feature-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(45,80,22,0.1) 0%, rgba(61,107,26,0.1) 100%);
          border-radius: 16px;
          flex-shrink: 0;
        }
        .hp-feature-card h3 {
          font-family: var(--font-manrope), 'Manrope', sans-serif;
          font-weight: 700;
          font-size: 19px;
          color: #1A2E1A;
          margin-bottom: 0.625rem;
        }
        .hp-feature-card p {
          font-family: var(--font-lexend), 'Lexend', sans-serif;
          font-size: 15px;
          color: #44483E;
          line-height: 1.65;
          animation: none;
          opacity: 1;
        }

        /* ── Footer ── */
        .hp-footer {
          background: #111D11;
          padding: 32px 44px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .hp-footer-links { display: flex; gap: 24px; }
        .hp-footer-link {
          font-size: 0.6875rem;
          font-weight: 400;
          color: rgba(255,255,255,0.35);
          text-decoration: none;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          transition: color 0.15s;
        }
        .hp-footer-link:hover { color: rgba(255,255,255,0.7); }
        .hp-footer-copy {
          font-size: 0.6875rem;
          color: rgba(255,255,255,0.3);
          letter-spacing: 0.04em;
        }

        /* ── Animations ── */
        @keyframes hp-rise {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Responsive ── */
        @media (max-width: 1024px) {
          .hp-hero h1 { font-size: 52px; }
          .hp-features-grid { grid-template-columns: repeat(2, 1fr); }
          .hp-features h2 { font-size: 38px; }
        }
        @media (max-width: 768px) {
          .hp-nav { padding: 20px 24px; }
          .hp-nav-link { display: none; }
          .hp-hero-content { padding: 100px 24px 72px; }
          .hp-hero h1 { font-size: 38px; line-height: 1.12; }
          .hp-hero p { font-size: 17px; margin-bottom: 2rem; }
          .hp-hero-ctas { flex-direction: column; gap: 0.75rem; }
          .hp-btn-primary, .hp-btn-secondary { width: 100%; justify-content: center; }
          .hp-code-row { flex-wrap: wrap; }
          .hp-features { padding: 4rem 24px; }
          .hp-features h2 { font-size: 30px; margin-bottom: 2.5rem; }
          .hp-features-grid { grid-template-columns: 1fr; }
          .hp-footer { padding: 24px; flex-direction: column; gap: 16px; text-align: center; }
          .hp-footer-links { justify-content: center; }
        }
      `}</style>

      {/* Nav */}
      <nav className="hp-nav">
        <Link href="/" className="hp-logo">
          <Image
            src="/lx2-logo.svg"
            alt="LX2"
            height={96}
            width={192}
            style={{ height: '44px', width: 'auto' }}
            priority
          />
        </Link>
        <div className="hp-nav-links">
          {userInitial && (
            <Link href="/play" className="hp-nav-profile" aria-label="My profile">
              {userInitial}
            </Link>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="hp-hero">
        <Image
          src="/hero.png"
          alt="Links golf course at golden hour"
          fill
          priority
          style={{ objectFit: 'cover', zIndex: 1 }}
          sizes="100vw"
        />
        <div className="hp-hero-overlay" />
        <div className="hp-hero-content">
          <h1>One place for<br />every golfer,<br />every society,<br />every club.</h1>
          <p>Track your rounds. Play with friends. Compete in events. Run your club. All in one beautiful app.</p>
          <div className="hp-hero-ctas">
            <Link href="/auth/signup" className="hp-btn-primary">Create account</Link>
            <Link href="/auth/login" className="hp-btn-secondary">Sign in</Link>
            <button className="hp-btn-link" onClick={handleJoinEvent}>Join event →</button>
          </div>
          {showCode && (
            <div className="hp-code-row visible">
              <span className="hp-code-label">Enter event code:</span>
              <input
                ref={codeRef}
                className="hp-code-input"
                placeholder="e.g. GOLF24"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
              />
              <button className="hp-code-btn" onClick={handleJoin}>Go →</button>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="hp-features" id="features">
        <div className="hp-features-inner">
          <h2>Everything you need for every round</h2>
          <div className="hp-features-grid">
            <div className="hp-feature-card">
              <div className="hp-feature-icon">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path d="M4 20l6-8 5 6 4-5 5 7" stroke="#2D5016" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="14" cy="6" r="2.5" fill="#3D6B1A" opacity="0.4"/>
                </svg>
              </div>
              <h3>Track Your Game</h3>
              <p>Keep detailed stats, monitor your progress, and watch your handicap improve over time.</p>
            </div>
            <div className="hp-feature-card">
              <div className="hp-feature-icon">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <circle cx="10" cy="9" r="3.5" stroke="#2D5016" strokeWidth="2" fill="none"/>
                  <circle cx="19" cy="9" r="3.5" stroke="#3D6B1A" strokeWidth="2" fill="none" opacity="0.6"/>
                  <path d="M3 22c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="#2D5016" strokeWidth="2" strokeLinecap="round" fill="none"/>
                  <path d="M19 15c2.761 0 5 2.239 5 5" stroke="#3D6B1A" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6"/>
                </svg>
              </div>
              <h3>Play With Friends</h3>
              <p>Create foursomes, manage groups, and keep everyone connected throughout the round.</p>
            </div>
            <div className="hp-feature-card">
              <div className="hp-feature-icon">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path d="M14 3l2.8 5.6 6.2.9-4.5 4.4 1.1 6.1L14 17l-5.6 3 1.1-6.1L5 9.5l6.2-.9L14 3z" stroke="#2D5016" strokeWidth="2" strokeLinejoin="round" fill="rgba(45,80,22,0.15)"/>
                  <path d="M9 24h10" stroke="#3D6B1A" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <h3>Compete in Events</h3>
              <p>Join tournaments, leagues, and society competitions. Track live leaderboards in real-time.</p>
            </div>
            <div className="hp-feature-card">
              <div className="hp-feature-icon">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <rect x="3" y="12" width="22" height="13" rx="3" stroke="#2D5016" strokeWidth="2" fill="none"/>
                  <path d="M9 12V8a5 5 0 0110 0v4" stroke="#3D6B1A" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7"/>
                  <circle cx="14" cy="18.5" r="2" fill="#2D5016" opacity="0.5"/>
                </svg>
              </div>
              <h3>Run Your Club</h3>
              <p>Complete club management tools for memberships, events, bookings, and communication.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="hp-footer">
        <div />
        <Link href="/" className="hp-logo">
          <Image
            src="/lx2-logo.svg"
            alt="LX2"
            height={96}
            width={192}
            style={{ height: '32px', width: 'auto', opacity: 0.5 }}
          />
        </Link>
      </footer>
    </>
  )
}
