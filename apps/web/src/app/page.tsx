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
        html { scroll-behavior: smooth; }

        body {
          font-family: 'Lexend', system-ui, sans-serif;
          color: #1A2E1A;
          background: #fff;
        }

        /* ── Nav ── */
        .nav {
          position: absolute;
          top: 0; left: 0; right: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 28px 48px;
          z-index: 20;
        }

        .logo { display: flex; align-items: center; text-decoration: none; }
        .logo img { height: 48px; width: auto; filter: brightness(0) invert(1); }

        .nav-links { display: flex; align-items: center; gap: 32px; }

        .nav-link {
          font-size: 0.8125rem;
          font-weight: 400;
          color: rgba(255,255,255,0.8);
          text-decoration: none;
          letter-spacing: 0.04em;
          transition: color 0.15s;
        }
        .nav-link:hover { color: #fff; }

        .nav-signin {
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
          transition: background 0.15s;
        }
        .nav-signin:hover { background: rgba(255,255,255,0.25); }

        /* ── Hero ── */
        .hero {
          position: relative;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
        }

        .hero-bg {
          position: absolute;
          inset: 0;
          background: url('/hero.png') center center / cover no-repeat;
          z-index: 0;
        }
        .hero-bg::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            160deg,
            rgba(0,0,0,0.45) 0%,
            rgba(0,0,0,0.2) 50%,
            rgba(0,0,0,0.55) 100%
          );
        }

        .hero-content {
          position: relative;
          z-index: 10;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 120px 48px 60px;
          color: #fff;
        }

        .hero-label {
          font-size: 0.6875rem;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.7);
          margin-bottom: 20px;
          opacity: 0;
          animation: rise 0.5s ease forwards 0.1s;
        }

        .hero-title {
          font-family: 'Manrope', sans-serif;
          font-size: clamp(2.75rem, 8vw, 5.25rem);
          font-weight: 800;
          line-height: 1.0;
          letter-spacing: -0.025em;
          color: #fff;
          margin-bottom: 24px;
          max-width: 700px;
          text-shadow: 0 2px 32px rgba(0,0,0,0.3);
          opacity: 0;
          animation: rise 0.6s ease forwards 0.2s;
        }

        .hero-sub {
          font-size: 1.0625rem;
          font-weight: 300;
          color: rgba(255,255,255,0.82);
          line-height: 1.65;
          max-width: 460px;
          margin-bottom: 44px;
          text-shadow: 0 1px 8px rgba(0,0,0,0.25);
          opacity: 0;
          animation: rise 0.6s ease forwards 0.3s;
        }

        .hero-ctas {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 48px;
          opacity: 0;
          animation: rise 0.6s ease forwards 0.4s;
        }

        .btn-getstarted {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 28px;
          background: #0D631B;
          color: #fff;
          font-family: 'Manrope', sans-serif;
          font-size: 0.9375rem;
          font-weight: 700;
          text-decoration: none;
          border-radius: 9999px;
          box-shadow: 0 8px 28px rgba(0,0,0,0.3);
          transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
        }
        .btn-getstarted:hover { background: #0a4f15; transform: translateY(-1px); box-shadow: 0 12px 32px rgba(0,0,0,0.35); }

        .btn-signin-hero {
          display: inline-flex;
          align-items: center;
          padding: 14px 24px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.3);
          color: #fff;
          font-size: 0.9375rem;
          font-weight: 500;
          text-decoration: none;
          border-radius: 9999px;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          transition: background 0.15s;
        }
        .btn-signin-hero:hover { background: rgba(255,255,255,0.22); }

        /* Event code row */
        .code-row {
          display: flex;
          align-items: center;
          gap: 8px;
          opacity: 0;
          animation: rise 0.6s ease forwards 0.5s;
        }

        .code-label {
          font-size: 0.8125rem;
          color: rgba(255,255,255,0.6);
          white-space: nowrap;
        }

        .code-input {
          width: 140px;
          padding: 10px 14px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.28);
          border-radius: 9999px;
          font-family: 'Lexend', sans-serif;
          font-size: 0.875rem;
          color: #fff;
          outline: none;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          text-align: center;
          letter-spacing: 0.08em;
          transition: background 0.15s, border-color 0.15s, width 0.2s;
        }
        .code-input::placeholder { color: rgba(255,255,255,0.4); letter-spacing: 0.04em; }
        .code-input:focus { background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.5); width: 180px; }

        .code-btn {
          padding: 10px 16px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.28);
          border-radius: 9999px;
          color: #fff;
          font-size: 0.875rem;
          font-family: 'Manrope', sans-serif;
          font-weight: 600;
          cursor: pointer;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          transition: background 0.15s;
        }
        .code-btn:hover { background: rgba(255,255,255,0.25); }

        /* Scroll cue */
        .scroll-cue {
          position: absolute;
          bottom: 32px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          opacity: 0;
          animation: rise 0.6s ease forwards 0.9s;
        }
        .scroll-cue span {
          font-size: 0.625rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.5);
        }
        .scroll-arrow {
          width: 20px;
          height: 20px;
          border-right: 2px solid rgba(255,255,255,0.4);
          border-bottom: 2px solid rgba(255,255,255,0.4);
          transform: rotate(45deg);
          animation: bounce 1.8s ease infinite 1.2s;
        }

        /* ── How it works ── */
        .hiw {
          background: #fff;
          padding: 96px 48px;
          text-align: center;
        }

        .section-label {
          font-size: 0.6875rem;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #0D631B;
          margin-bottom: 16px;
        }

        .section-title {
          font-family: 'Manrope', sans-serif;
          font-size: clamp(1.75rem, 4vw, 2.5rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #1A2E1A;
          margin-bottom: 16px;
          line-height: 1.1;
        }

        .section-sub {
          font-size: 1rem;
          font-weight: 300;
          color: #6B8C6B;
          max-width: 440px;
          margin: 0 auto 64px;
          line-height: 1.65;
        }

        .steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
          max-width: 860px;
          margin: 0 auto;
        }

        .step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 32px 24px;
          background: #F6FAF6;
          border-radius: 1.5rem;
          border: 1px solid #E0EBE0;
        }

        .step-num {
          width: 40px;
          height: 40px;
          background: #0D631B;
          color: #fff;
          font-family: 'Manrope', sans-serif;
          font-size: 1rem;
          font-weight: 800;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .step-title {
          font-family: 'Manrope', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          color: #1A2E1A;
        }

        .step-desc {
          font-size: 0.875rem;
          font-weight: 300;
          color: #6B8C6B;
          line-height: 1.6;
          text-align: center;
        }

        /* ── Features ── */
        .features {
          background: #F6FAF6;
          padding: 96px 48px;
        }

        .features-inner {
          max-width: 860px;
          margin: 0 auto;
          text-align: center;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-top: 56px;
          text-align: left;
        }

        .feature-card {
          background: #fff;
          border-radius: 1.25rem;
          padding: 28px;
          border: 1px solid #E0EBE0;
        }

        .feature-icon { font-size: 1.5rem; margin-bottom: 12px; }
        .feature-title {
          font-family: 'Manrope', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          color: #1A2E1A;
          margin-bottom: 6px;
        }
        .feature-desc {
          font-size: 0.875rem;
          font-weight: 300;
          color: #6B8C6B;
          line-height: 1.6;
        }

        /* ── CTA section ── */
        .cta-section {
          background: #1A2E1A;
          padding: 96px 48px;
          text-align: center;
          color: #fff;
        }

        .cta-title {
          font-family: 'Manrope', sans-serif;
          font-size: clamp(1.75rem, 4vw, 2.5rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 16px;
          line-height: 1.1;
        }

        .cta-sub {
          font-size: 1rem;
          font-weight: 300;
          color: rgba(255,255,255,0.7);
          margin-bottom: 40px;
          line-height: 1.65;
        }

        .btn-cta-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 15px 32px;
          background: #0D631B;
          color: #fff;
          font-family: 'Manrope', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          text-decoration: none;
          border-radius: 9999px;
          box-shadow: 0 8px 28px rgba(0,0,0,0.3);
          transition: background 0.15s, transform 0.15s;
        }
        .btn-cta-primary:hover { background: #0a4f15; transform: translateY(-1px); }

        /* ── Footer ── */
        .footer {
          background: #111D11;
          padding: 32px 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .footer-links { display: flex; gap: 24px; }
        .footer-link {
          font-size: 0.6875rem;
          font-weight: 400;
          color: rgba(255,255,255,0.35);
          text-decoration: none;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          transition: color 0.15s;
        }
        .footer-link:hover { color: rgba(255,255,255,0.7); }

        .footer-copy {
          font-size: 0.6875rem;
          color: rgba(255,255,255,0.3);
          letter-spacing: 0.04em;
        }

        @keyframes rise {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes bounce {
          0%, 100% { transform: rotate(45deg) translateY(0); }
          50% { transform: rotate(45deg) translateY(5px); }
        }

        @media (max-width: 768px) {
          .nav { padding: 20px 24px; }
          .nav-link { display: none; }
          .hero-content { padding: 100px 24px 60px; }
          .hiw, .features, .cta-section { padding: 72px 24px; }
          .steps { grid-template-columns: 1fr; max-width: 360px; }
          .feature-grid { grid-template-columns: 1fr; }
          .footer { padding: 24px; flex-direction: column; gap: 16px; }
          .hero-ctas { flex-direction: column; }
        }
      `}</style>

      {/* Nav */}
      <nav className="nav">
        <Link href="/" className="logo">
          <Image src="/lx2-logo.svg" alt="LX2" height={96} width={192} />
        </Link>
        <div className="nav-links">
          <a href="#how-it-works" className="nav-link">How it works</a>
          {userEmail ? (
            <Link href="/play" className="nav-signin">Dashboard</Link>
          ) : (
            <Link href="/auth/login" className="nav-signin">Sign in</Link>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-content">
          <div className="hero-label">Golf society management</div>
          <h1 className="hero-title">Golf, all in one place.</h1>
          <p className="hero-sub">
            Score your rounds, track your handicap, and run society days — all from your phone.
          </p>
          <div className="hero-ctas">
            <a href="/auth/login?mode=signup" className="btn-getstarted">
              Get started free →
            </a>
            {userEmail ? (
              <Link href="/play" className="btn-signin-hero">Go to dashboard</Link>
            ) : (
              <Link href="/auth/login" className="btn-signin-hero">Sign in</Link>
            )}
          </div>
          <div className="code-row">
            <span className="code-label">Got an event code?</span>
            <input
              className="code-input"
              placeholder="e.g. GOLF24"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
            <button className="code-btn" onClick={handleJoin}>Join →</button>
          </div>
        </div>
        <div className="scroll-cue">
          <span>Scroll</span>
          <div className="scroll-arrow" />
        </div>
      </section>

      {/* How it works */}
      <section className="hiw" id="how-it-works">
        <div className="section-label">How it works</div>
        <h2 className="section-title">Up and running in minutes</h2>
        <p className="section-sub">No training, no setup calls. If you can send a WhatsApp, you can run an event with LX2.</p>
        <div className="steps">
          <div className="step">
            <div className="step-num">1</div>
            <div className="step-title">Create your event</div>
            <p className="step-desc">Set your format — Stableford, stroke play or match play. Add players and tee times in a 3-step form.</p>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <div className="step-title">Players join via link</div>
            <p className="step-desc">Share one link over WhatsApp. Players tap it and score hole-by-hole — no app download, no account needed.</p>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <div className="step-title">Live scores, instant results</div>
            <p className="step-desc">Watch the leaderboard update in real time. Results are calculated automatically when the last card comes in.</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <div className="features-inner">
          <div className="section-label">Everything you need</div>
          <h2 className="section-title">Built for how societies actually play</h2>
          <p className="section-sub">From casual Saturday medals to full society days with side competitions.</p>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">🏆</div>
              <div className="feature-title">Multiple formats</div>
              <p className="feature-desc">Stableford, stroke play and match play with handicap indexing. NTP and longest drive side contests.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📡</div>
              <div className="feature-title">Live leaderboard</div>
              <p className="feature-desc">Real-time standings as scores come in. Share a TV-mode link for the 19th hole screen.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <div className="feature-title">No app needed</div>
              <p className="feature-desc">Players score on any phone via a web link. Nothing to download, nothing to sign up for.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <div className="feature-title">Handicap tracking</div>
              <p className="feature-desc">Handicap indexes tracked across rounds. Player profiles with full scoring history.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="cta-section">
        <h2 className="cta-title">Ready to run your first event?</h2>
        <p className="cta-sub">Free to get started. No credit card required.</p>
        <a href="/auth/login?mode=signup" className="btn-cta-primary">Create your account →</a>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-links">
          <a href="#how-it-works" className="footer-link">How it works</a>
          <a href="/auth/login" className="footer-link">Sign in</a>
          <a href="https://lx2-architecture.vercel.app" className="footer-link">Architecture</a>
        </div>
        <span className="footer-copy">lx2.golf · Play to par.</span>
      </footer>
    </>
  )
}
