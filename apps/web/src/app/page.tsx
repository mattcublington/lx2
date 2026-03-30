'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { animate, useMotionValue } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Activity, Trophy, Users, CalendarDays, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { BentoCard, BentoGrid } from '@/components/ui/bento-grid'
import type { ComponentType } from 'react'

// ── Stat counter (counts up on scroll into view) ──────────────────────────────

function StatCounter({
  value,
  label,
  sublabel,
  suffix = '',
}: {
  value: number
  label: string
  sublabel: string
  suffix?: string
}) {
  const [display, setDisplay] = useState(0)
  const motionVal = useMotionValue(0)
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.4 })

  useEffect(() => {
    if (!inView) return
    // animate() returns playback controls; void discards it since triggerOnce=true
    void animate(motionVal, value, {
      duration: 1.4,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
  }, [inView, motionVal, value])

  return (
    <div ref={ref} className="hp-stat">
      <span className="hp-stat-number">{display}{suffix}</span>
      <span className="hp-stat-label">{label}</span>
      <span className="hp-stat-sublabel">{sublabel}</span>
    </div>
  )
}

// ── Bento feature data ────────────────────────────────────────────────────────

const FEATURES: Array<{
  Icon: ComponentType<{ className?: string | undefined }>
  name: string
  description: string
  href: string
  cta: string
  className: string
  background: React.ReactNode
}> = [
  {
    Icon: Activity,
    name: 'Live Scoring',
    description:
      'Score hole by hole on any device. Scores sync instantly across everyone in the group — no refreshing needed.',
    href: '/auth/signup',
    cta: 'Start scoring',
    className: 'col-span-3 md:col-span-2',
    background: <div className="hp-bento-bg hp-bento-bg-scoring" />,
  },
  {
    Icon: Trophy,
    name: 'Live Leaderboards',
    description:
      'Real-time standings update as scores come in. Share the leaderboard link with anyone.',
    href: '/auth/signup',
    cta: 'See how it works',
    className: 'col-span-3 md:col-span-1',
    background: <div className="hp-bento-bg hp-bento-bg-leaderboard" />,
  },
  {
    Icon: Users,
    name: 'Society Events',
    description:
      'Create events in minutes. Set format, contests, and entry fee. Players join with a code — no accounts required.',
    href: '/auth/signup',
    cta: 'Create an event',
    className: 'col-span-3 md:col-span-1',
    background: <div className="hp-bento-bg hp-bento-bg-events" />,
  },
  {
    Icon: CalendarDays,
    name: 'Tournament Series',
    description:
      'Run multi-round tournaments with automatic stroke index allocation, group draws, and cumulative standings.',
    href: '/auth/signup',
    cta: 'Learn more',
    className: 'col-span-3 md:col-span-1',
    background: <div className="hp-bento-bg hp-bento-bg-tournaments" />,
  },
  {
    Icon: TrendingUp,
    name: 'Handicap Tracking',
    description:
      'Playing handicap calculated automatically from your course handicap index. Every round counts.',
    href: '/auth/signup',
    cta: 'Track your game',
    className: 'col-span-3 md:col-span-1',
    background: <div className="hp-bento-bg hp-bento-bg-handicap" />,
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

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

        /* ── Header / Nav ─────────────────────────────────── */
        .hp-header {
          position: sticky;
          top: 0;
          z-index: 40;
          background: #0a1f0a;
          height: 72px;
          display: flex;
          align-items: center;
        }
        .hp-nav {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 44px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .hp-logo { display: flex; align-items: center; text-decoration: none; }
        .hp-nav-profile {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
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
          flex-shrink: 0;
        }
        .hp-nav-profile:hover {
          background: rgba(10, 20, 10, 0.88);
          border-color: rgba(255,255,255,0.3);
          transform: translateY(-1px);
        }

        /* ── Hero ─────────────────────────────────────────── */
        .hp-hero {
          min-height: calc(100dvh - 72px);
          background: #F6FAF6;
          display: grid;
          grid-template-columns: 1fr 1fr;
          overflow: hidden;
        }
        .hp-hero-text {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 5rem 3.5rem 5rem 5rem;
          opacity: 0;
          animation: hp-rise 0.6s ease forwards 0.1s;
        }
        .hp-hero-eyebrow {
          font-family: var(--font-lexend), 'Lexend', sans-serif;
          font-weight: 500;
          font-size: 0.6875rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #0D631B;
          margin-bottom: 1.25rem;
        }
        .hp-hero h1 {
          font-family: var(--font-manrope), 'Manrope', sans-serif;
          font-weight: 800;
          font-size: clamp(2.25rem, 3.5vw, 3.5rem);
          line-height: 1.1;
          color: #1A2E1A;
          margin-bottom: 1.25rem;
          letter-spacing: -0.02em;
        }
        .hp-hero p {
          font-family: var(--font-lexend), 'Lexend', sans-serif;
          font-size: clamp(1rem, 1.4vw, 1.125rem);
          font-weight: 400;
          color: #44483E;
          line-height: 1.65;
          margin-bottom: 2.5rem;
          max-width: 460px;
        }
        .hp-hero-ctas {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          align-items: center;
        }
        /* shadcn Button overrides — marketing pill shape */
        .hp-btn-primary {
          border-radius: 9999px !important;
          font-family: var(--font-lexend), 'Lexend', sans-serif !important;
          font-weight: 500 !important;
          font-size: 1rem !important;
          padding: 0.875rem 2.25rem !important;
          height: auto !important;
          background: linear-gradient(135deg, #0D631B 0%, #0a4f15 100%) !important;
          box-shadow: 0 8px 24px rgba(26, 28, 28, 0.12) !important;
          transition: transform 0.2s ease, box-shadow 0.2s ease !important;
          white-space: nowrap;
        }
        .hp-btn-primary:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 12px 32px rgba(26, 28, 28, 0.2) !important;
          background: linear-gradient(135deg, #0D631B 0%, #0a4f15 100%) !important;
        }
        .hp-btn-secondary {
          border-radius: 9999px !important;
          font-family: var(--font-lexend), 'Lexend', sans-serif !important;
          font-weight: 500 !important;
          font-size: 1rem !important;
          padding: 0.875rem 2.25rem !important;
          height: auto !important;
          color: #1A2E1A !important;
          border-color: rgba(26, 28, 28, 0.22) !important;
          background: transparent !important;
          transition: transform 0.2s ease, background 0.2s ease !important;
          white-space: nowrap;
        }
        .hp-btn-secondary:hover {
          background: rgba(255,255,255,0.65) !important;
          border-color: rgba(26,28,28,0.32) !important;
          transform: translateY(-1px) !important;
        }
        .hp-btn-link {
          background: transparent;
          border: none;
          color: #923357;
          font-family: var(--font-lexend), 'Lexend', sans-serif;
          font-weight: 500;
          font-size: 1rem;
          cursor: pointer;
          padding: 0.25rem 0;
          text-decoration: underline;
          text-underline-offset: 4px;
          transition: color 0.15s;
          white-space: nowrap;
        }
        .hp-btn-link:hover { color: #7A2A49; text-decoration-thickness: 2px; }

        /* Join code row */
        .hp-code-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 1.25rem;
          flex-wrap: wrap;
        }
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

        /* Hero image pane */
        .hp-hero-image { position: relative; overflow: hidden; }

        /* ── Features / Bento ─────────────────────────────── */
        .hp-features {
          background: #F0F4EC;
          padding: 6rem 44px;
        }
        .hp-features-inner { max-width: 1400px; margin: 0 auto; }
        .hp-features h2 {
          font-family: var(--font-manrope), 'Manrope', sans-serif;
          font-weight: 800;
          font-size: clamp(1.75rem, 3.5vw, 3rem);
          color: #1A2E1A;
          margin-bottom: 0.75rem;
          letter-spacing: -0.015em;
        }
        .hp-features-lead {
          font-family: var(--font-lexend), 'Lexend', sans-serif;
          font-size: 1.0625rem;
          color: #44483E;
          margin-bottom: 3rem;
          max-width: 560px;
          line-height: 1.6;
        }
        /* Brand overrides for bento card internals */
        .hp-features .group { border-radius: 20px !important; }
        .hp-features .group h3 {
          font-family: var(--font-manrope), 'Manrope', sans-serif !important;
          font-weight: 700 !important;
          font-size: 1.125rem !important;
          color: #1A2E1A !important;
        }
        .hp-features .group p {
          font-family: var(--font-lexend), 'Lexend', sans-serif !important;
          color: #6B8C6B !important;
          animation: none !important;
          opacity: 1 !important;
          font-size: 0.9375rem !important;
          line-height: 1.6 !important;
        }
        .hp-features .group svg { color: #0D631B !important; }
        .hp-features .group button,
        .hp-features .group a {
          font-family: var(--font-lexend), 'Lexend', sans-serif !important;
          color: #0D631B !important;
          font-size: 0.875rem !important;
        }

        /* Bento card decorative backgrounds */
        .hp-bento-bg { position: absolute; inset: 0; pointer-events: none; }
        .hp-bento-bg-scoring {
          background: linear-gradient(135deg, #E8F5ED 0%, #F4FAF6 60%, #F6FAF6 100%);
        }
        .hp-bento-bg-scoring::after {
          content: '';
          position: absolute;
          bottom: 16px;
          right: 20px;
          width: 90px;
          height: 56px;
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 90 56'%3E%3Crect x='0' y='28' width='14' height='28' rx='3' fill='%230D631B' opacity='.18'/%3E%3Crect x='19' y='18' width='14' height='38' rx='3' fill='%230D631B' opacity='.28'/%3E%3Crect x='38' y='6' width='14' height='50' rx='3' fill='%230D631B' opacity='.38'/%3E%3Crect x='57' y='16' width='14' height='40' rx='3' fill='%230D631B' opacity='.28'/%3E%3Crect x='76' y='10' width='14' height='46' rx='3' fill='%230D631B' opacity='.22'/%3E%3C/svg%3E") center / contain no-repeat;
        }
        .hp-bento-bg-leaderboard { background: linear-gradient(135deg, #F0F4EC 0%, #E8F0E4 100%); }
        .hp-bento-bg-events      { background: linear-gradient(135deg, #F6FAF6 0%, #EDF4EE 100%); }
        .hp-bento-bg-tournaments { background: linear-gradient(135deg, #F2F7F2 0%, #E8F0E4 100%); }
        .hp-bento-bg-handicap    { background: linear-gradient(135deg, #F6FAF6 0%, #EDF5ED 100%); }

        /* ── Stats ────────────────────────────────────────── */
        .hp-stats { background: #1A2E1A; padding: 5rem 44px; }
        .hp-stats-inner { max-width: 960px; margin: 0 auto; }
        .hp-stats-lead {
          font-family: var(--font-lexend), 'Lexend', sans-serif;
          font-size: 0.6875rem;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(240,244,236,0.45);
          text-align: center;
          margin-bottom: 3rem;
        }
        .hp-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
          text-align: center;
        }
        .hp-stat-number {
          display: block;
          font-family: var(--font-manrope), 'Manrope', sans-serif;
          font-weight: 800;
          font-size: clamp(3rem, 6vw, 5rem);
          color: #F0F4EC;
          line-height: 1;
          letter-spacing: -0.03em;
        }
        .hp-stat-label {
          display: block;
          font-family: var(--font-lexend), 'Lexend', sans-serif;
          font-size: 0.9375rem;
          font-weight: 500;
          color: rgba(240,244,236,0.7);
          margin-top: 0.625rem;
        }
        .hp-stat-sublabel {
          display: block;
          font-family: var(--font-lexend), 'Lexend', sans-serif;
          font-size: 0.75rem;
          font-weight: 400;
          color: rgba(240,244,236,0.38);
          margin-top: 0.25rem;
          letter-spacing: 0.02em;
        }

        /* ── Footer ──────────────────────────────────────── */
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

        /* ── Responsive ──────────────────────────────────── */
        @media (max-width: 1024px) {
          .hp-hero-text { padding: 4rem 2.5rem 4rem 3.5rem; }
        }
        @media (max-width: 768px) {
          .hp-nav { padding: 0 24px; }
          .hp-hero { grid-template-columns: 1fr; min-height: auto; }
          .hp-hero-text { padding: 3rem 24px; }
          .hp-hero-image { height: 56vw; min-height: 220px; max-height: 380px; }
          .hp-hero-ctas { flex-direction: column; align-items: flex-start; }
          .hp-btn-primary, .hp-btn-secondary { width: 100%; justify-content: center !important; }
          .hp-features { padding: 4rem 24px; }
          .hp-stats { padding: 4rem 24px; }
          .hp-stats-grid { grid-template-columns: 1fr; gap: 2.5rem; }
          .hp-footer { padding: 24px; flex-direction: column; gap: 16px; text-align: center; }
          .hp-footer-links { justify-content: center; }
        }
      `}</style>

      {/* Header */}
      <header className="hp-header">
        <nav className="hp-nav">
          <Link href="/" className="hp-logo">
            <Image
              src="/lx2-logo.svg"
              alt="LX2"
              height={96}
              width={192}
              style={{ height: '40px', width: 'auto' }}
              priority
            />
          </Link>
          <div>
            {userInitial && (
              <Link href="/play" className="hp-nav-profile" aria-label="My profile">
                {userInitial}
              </Link>
            )}
          </div>
        </nav>
      </header>

      {/* Hero — structured two-column, no text over image */}
      <section className="hp-hero">
        <div className="hp-hero-text">
          <span className="hp-hero-eyebrow">Golf scoring &amp; society management</span>
          <h1>One place for every golfer, every society, every club.</h1>
          <p>
            Track your rounds. Play with friends. Compete in events.
            Run your club. All in one beautiful app.
          </p>
          <div className="hp-hero-ctas">
            <Button asChild className="hp-btn-primary">
              <Link href="/auth/signup">Create account</Link>
            </Button>
            <Button asChild variant="outline" className="hp-btn-secondary">
              <Link href="/auth/login">Sign in</Link>
            </Button>
            <button className="hp-btn-link" onClick={handleJoinEvent}>
              Join event →
            </button>
          </div>
          {showCode && (
            <div className="hp-code-row">
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

        {/* Decorative image — no text overlaid */}
        <div className="hp-hero-image" aria-hidden="true">
          <Image
            src="/hero.jpg"
            alt=""
            fill
            priority
            style={{ objectFit: 'cover' }}
            sizes="50vw"
            quality={90}
          />
        </div>
      </section>

      {/* Features — bento grid */}
      <section className="hp-features" id="features">
        <div className="hp-features-inner">
          <h2>Everything you need on the course</h2>
          <p className="hp-features-lead">
            From the first tee to the final standings — LX2 handles scoring,
            results, and society admin in one place.
          </p>
          <BentoGrid>
            {FEATURES.map(f => (
              <BentoCard key={f.name} {...f} />
            ))}
          </BentoGrid>
        </div>
      </section>

      {/* Stats — factual counters only */}
      <section className="hp-stats">
        <div className="hp-stats-inner">
          <p className="hp-stats-lead">Built for societies of every size</p>
          <div className="hp-stats-grid">
            <StatCounter
              value={3}
              label="Scoring formats"
              sublabel="Stableford · Stroke Play · Match Play"
            />
            <StatCounter
              value={18}
              label="Holes per round"
              sublabel="Full 18-hole and 9-hole rounds supported"
            />
            <StatCounter
              value={4}
              label="Players per group"
              sublabel="Groups of 2, 3, or 4 supported"
            />
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
            style={{ height: '30px', width: 'auto', opacity: 0.45 }}
          />
        </Link>
      </footer>
    </>
  )
}
