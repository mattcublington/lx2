'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { animate, useMotionValue } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Activity, Users, CalendarDays, LayoutDashboard } from 'lucide-react'
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
  staticText,
}: {
  value: number
  label: string
  sublabel: string
  suffix?: string
  staticText?: string
}) {
  const [display, setDisplay] = useState(0)
  const motionVal = useMotionValue(0)
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.4 })

  useEffect(() => {
    if (!inView || staticText) return
    // animate() returns playback controls; void discards it since triggerOnce=true
    void animate(motionVal, value, {
      duration: 1.4,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
  }, [inView, motionVal, value, staticText])

  return (
    <div ref={ref} className="hp-stat">
      <span className="hp-stat-number">{staticText ?? `${display}${suffix}`}</span>
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
    name: 'Live Scoring & Leaderboards',
    description:
      'Score hole-by-hole on any device — works offline too. Leaderboards update live as scores come in. Share the link and anyone can follow along, no account needed.',
    href: '/auth/signup',
    cta: 'Start scoring',
    className: 'col-span-1',
    background: (
      <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}} viewBox="0 0 10 6" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <rect x="2.7" y="2.4" width=".6" height="1.4" rx=".12" fill="#0D631B" opacity=".18"/>
        <rect x="3.6" y="2.0" width=".6" height="1.8" rx=".12" fill="#0D631B" opacity=".24"/>
        <rect x="4.5" y="1.5" width=".6" height="2.3" rx=".12" fill="#0D631B" opacity=".32"/>
        <rect x="5.4" y="1.8" width=".6" height="2.0" rx=".12" fill="#0D631B" opacity=".26"/>
        <rect x="6.3" y="1.6" width=".6" height="2.2" rx=".12" fill="#0D631B" opacity=".20"/>
      </svg>
    ),
  },
  {
    Icon: Users,
    name: 'Society Events',
    description:
      'Create a competition in minutes. Players join with a code — no download or account required. Handle formats, contests, and entry fees from one screen.',
    href: '/auth/signup',
    cta: 'Create an event',
    className: 'col-span-1',
    background: (
      <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}} viewBox="0 0 10 6" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="1.7" width="4" height="2.4" rx=".3" fill="none" stroke="#0D631B" strokeWidth=".12" opacity=".22"/>
        <rect x="3" y="1.7" width="4" height=".7" rx=".3" fill="#0D631B" opacity=".14"/>
        <circle cx="4" cy="3.2" r=".2" fill="#0D631B" opacity=".22"/>
        <circle cx="5" cy="3.2" r=".2" fill="#0D631B" opacity=".22"/>
        <circle cx="6" cy="3.2" r=".2" fill="#0D631B" opacity=".16"/>
        <circle cx="4" cy="3.8" r=".2" fill="#0D631B" opacity=".16"/>
        <circle cx="5" cy="3.8" r=".2" fill="#0D631B" opacity=".22"/>
      </svg>
    ),
  },
  {
    Icon: CalendarDays,
    name: 'Tournament Series',
    description:
      'Run a full season without the spreadsheets. Automatic stroke index allocation, group draws, and cumulative standings across every round.',
    href: '/auth/signup',
    cta: 'Learn more',
    className: 'col-span-1',
    background: (
      <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}} viewBox="0 0 10 8" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <path d="M3.5 1h3v1.5c0 .85-.5 1.35-1.5 1.5C4 4.15 3.5 3.65 3.5 2.8V1z" fill="#0D631B" opacity=".22"/>
        <rect x="4.3" y="4" width="1.4" height=".5" rx=".15" fill="#0D631B" opacity=".20"/>
        <rect x="3.7" y="4.5" width="2.6" height=".4" rx=".15" fill="#0D631B" opacity=".22"/>
        <path d="M3.5 1.8 C2.8 1.8 2.8 2.8 3.5 2.8" stroke="#0D631B" strokeWidth=".12" fill="none" opacity=".20"/>
        <path d="M6.5 1.8 C7.2 1.8 7.2 2.8 6.5 2.8" stroke="#0D631B" strokeWidth=".12" fill="none" opacity=".20"/>
      </svg>
    ),
  },
  {
    Icon: LayoutDashboard,
    name: 'Club Portal',
    description:
      'A dedicated home for your club — member management, competition calendar, and published results. Built for the people who keep golf running.',
    href: '#',
    cta: 'Coming soon',
    className: 'col-span-1',
    background: (
      <>
        <span className="hp-bento-soon">Coming soon</span>
        <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}} viewBox="0 0 10 6" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
          <rect x="2.8" y="1.3" width="4.4" height=".55" rx=".15" fill="#0D631B" opacity=".20"/>
          <rect x="2.8" y="2.1" width="3.3" height=".45" rx=".12" fill="#0D631B" opacity=".16"/>
          <rect x="2.8" y="2.75" width="3.9" height=".45" rx=".12" fill="#0D631B" opacity=".14"/>
          <rect x="2.8" y="3.4" width="2.7" height=".45" rx=".12" fill="#0D631B" opacity=".12"/>
          <circle cx="7.8" cy="2.7" r=".3" fill="#0D631B" opacity=".20"/>
        </svg>
      </>
    ),
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
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          z-index: 40;
          height: 72px;
          display: flex;
          align-items: center;
          background: transparent;
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
          position: relative;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          overflow: hidden;
        }
        .hp-hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(0, 0, 0, 0.08) 0%,
            rgba(10, 31, 10, 0.28) 60%,
            rgba(10, 31, 10, 0.45) 100%
          );
          z-index: 1;
        }
        .hp-hero-content {
          position: relative;
          z-index: 2;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8rem 44px 4rem;
          opacity: 0;
          animation: hp-rise 0.6s ease forwards 0.1s;
        }
        .hp-hero-text {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 720px;
        }
        .hp-hero-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 2.5rem;
          width: 100%;
          max-width: 960px;
        }

        /* ── Desktop hero audience cards ──────────────────── */
        .hp-audience-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 16px;
          padding: 24px 28px;
          text-decoration: none;
          display: block;
          transition: background 0.2s ease, transform 0.2s ease;
        }
        .hp-audience-card:hover {
          background: rgba(255, 255, 255, 0.16);
          transform: translateY(-2px);
        }
        .hp-audience-card-label {
          font-family: var(--font-lexend), 'Lexend', sans-serif;
          font-size: 0.625rem;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.45);
          margin-bottom: 6px;
        }
        .hp-audience-card-title {
          font-family: var(--font-manrope), 'Manrope', sans-serif;
          font-weight: 700;
          font-size: 1.125rem;
          color: #fff;
          margin-bottom: 4px;
          letter-spacing: -0.01em;
        }
        .hp-audience-card-desc {
          font-family: var(--font-lexend), 'Lexend', sans-serif;
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.5;
          margin-bottom: 14px;
        }
        .hp-audience-card-link {
          font-family: var(--font-lexend), 'Lexend', sans-serif;
          font-size: 0.8125rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.85);
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: color 0.15s;
        }
        .hp-audience-card:hover .hp-audience-card-link { color: #fff; }
        .hp-hero-eyebrow {
          font-family: var(--font-lexend), 'Lexend', sans-serif;
          font-weight: 500;
          font-size: 0.6875rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.65);
          margin-bottom: 1.25rem;
        }
        .hp-hero h1 {
          font-family: var(--font-manrope), 'Manrope', sans-serif;
          font-weight: 800;
          font-size: clamp(2.5rem, 4.5vw, 4.5rem);
          line-height: 1.06;
          color: #fff;
          margin-bottom: 1.25rem;
          letter-spacing: -0.02em;
        }
        .hp-hero p {
          font-family: var(--font-lexend), 'Lexend', sans-serif;
          font-size: clamp(0.9375rem, 1.3vw, 1.0625rem);
          font-weight: 400;
          color: rgba(255,255,255,0.8);
          line-height: 1.55;
          max-width: 480px;
          margin: 0 auto 0.625rem;
        }
        .hp-hero-tagline {
          font-weight: 600 !important;
          color: rgba(255,255,255,0.95) !important;
          margin-bottom: 2.5rem !important;
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
          color: #fff !important;
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
          color: #fff !important;
          border-color: rgba(255,255,255,0.4) !important;
          background: transparent !important;
          transition: transform 0.2s ease, background 0.2s ease !important;
          white-space: nowrap;
        }
        .hp-btn-secondary:hover {
          background: rgba(255,255,255,0.12) !important;
          border-color: rgba(255,255,255,0.6) !important;
          transform: translateY(-1px) !important;
        }
        .hp-btn-link {
          background: transparent;
          border: 1.5px solid rgba(255,255,255,0.4);
          border-radius: 9999px;
          color: #fff;
          font-family: var(--font-lexend), 'Lexend', sans-serif;
          font-weight: 500;
          font-size: 1rem;
          cursor: pointer;
          padding: 0.875rem 2.25rem;
          text-decoration: none;
          text-align: center;
          width: 100%;
          transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
          white-space: nowrap;
          display: block;
        }
        .hp-btn-link:hover {
          background: rgba(255,255,255,0.12);
          border-color: rgba(255,255,255,0.6);
          transform: translateY(-1px);
        }

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
          color: rgba(255,255,255,0.65);
          white-space: nowrap;
        }
        .hp-code-input {
          width: 148px;
          padding: 10px 16px;
          background: rgba(255,255,255,0.15);
          border: 1.5px solid rgba(255,255,255,0.3);
          border-radius: 9999px;
          font-family: var(--font-lexend), 'Lexend', sans-serif;
          font-size: 0.875rem;
          color: #1A2E1A;
          outline: none;
          text-align: center;
          letter-spacing: 0.08em;
          transition: background 0.15s, border-color 0.15s, width 0.2s;
        }
        .hp-code-input::placeholder { color: rgba(255,255,255,0.45); letter-spacing: 0.04em; }
        .hp-code-input:focus {
          background: rgba(255,255,255,0.22);
          border-color: rgba(255,255,255,0.55);
          width: 180px;
          outline: none;
        }
        .hp-code-btn {
          padding: 10px 18px;
          background: rgba(255,255,255,0.12);
          border: 1.5px solid rgba(255,255,255,0.25);
          border-radius: 9999px;
          color: #fff;
          font-size: 0.875rem;
          font-family: var(--font-lexend), 'Lexend', sans-serif;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }
        .hp-code-btn:hover { background: rgba(255,255,255,0.2); }

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
        .hp-features .group {
          position: relative !important;
          overflow: hidden !important;
          border-radius: 20px !important;
          background: #ffffff !important;
          border: 1px solid #E0EBE0 !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04) !important;
        }
        .hp-features .group h3 {
          font-family: var(--font-manrope), 'Manrope', sans-serif !important;
          font-weight: 700 !important;
          font-size: 1.05rem !important;
          color: #1A2E1A !important;
          line-height: 1.25 !important;
        }
        .hp-features .group p {
          font-family: var(--font-lexend), 'Lexend', sans-serif !important;
          font-size: 0.875rem !important;
          font-weight: 400 !important;
          color: #4A5E4A !important;
          line-height: 1.6 !important;
          animation: none !important;
          opacity: 1 !important;
        }
        .hp-features .group svg { color: #0D631B !important; }
        .hp-features .group a, .hp-features .group button {
          font-family: var(--font-lexend), 'Lexend', sans-serif !important;
          font-size: 0.8125rem !important;
          color: #0D631B !important;
        }

        /* Coming soon badge */
        .hp-bento-soon {
          position: absolute;
          top: 14px;
          right: 14px;
          font-family: var(--font-lexend), 'Lexend', sans-serif;
          font-size: 0.625rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #0D631B;
          background: rgba(13, 99, 27, 0.10);
          border: 1px solid rgba(13, 99, 27, 0.18);
          border-radius: 9999px;
          padding: 3px 10px;
          pointer-events: none;
        }

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
        @media (min-width: 769px) {
          .hp-btn-link { width: auto; }
          .hp-hero-ctas { justify-content: center; }
        }
        @media (max-width: 768px) {
          .hp-nav { padding: 0 24px; }
          .hp-hero-content { padding: 7rem 24px 3rem; }
          .hp-hero-text { max-width: 100%; }
          .hp-hero-cards { grid-template-columns: 1fr; }
          .hp-hero-ctas { flex-direction: column; align-items: center; }
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

      {/* Hero — full-bleed image with gradient overlay */}
      <section className="hp-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero.jpg"
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
        <div className="hp-hero-overlay" aria-hidden="true" />
        <div className="hp-hero-content">
          <div className="hp-hero-text">
            <h1>
              Every round.<br />
              Every shot.<br />
              Every stat.
            </h1>
            <p>Play, compete and manage all in one place.</p>
            <p>For every golfer, every society, every club.</p>
            <p className="hp-hero-tagline">The golf app that gets smarter the more you play.</p>
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

          <div className="hp-hero-cards">
            <Link href="/auth/signup" className="hp-audience-card">
              <p className="hp-audience-card-label">For Golfers</p>
              <p className="hp-audience-card-title">Score. Compete. Improve.</p>
              <p className="hp-audience-card-desc">Track every round, compete in events, and watch your game develop over time.</p>
              <span className="hp-audience-card-link">Create account →</span>
            </Link>
            <Link href="/auth/signup" className="hp-audience-card">
              <p className="hp-audience-card-label">For Societies</p>
              <p className="hp-audience-card-title">Run better events.</p>
              <p className="hp-audience-card-desc">Create competitions, manage entry fees, and share live leaderboards with all your members.</p>
              <span className="hp-audience-card-link">Create an event →</span>
            </Link>
            <a href="https://club.lx2.golf" className="hp-audience-card">
              <p className="hp-audience-card-label">For Clubs</p>
              <p className="hp-audience-card-title">Your club, managed.</p>
              <p className="hp-audience-card-desc">A dedicated organiser dashboard for member management, results, and competitions.</p>
              <span className="hp-audience-card-link">Explore Club Portal →</span>
            </a>
          </div>
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
          <p className="hp-stats-lead">Built for you</p>
          <div className="hp-stats-grid">
            <StatCounter
              value={6}
              label="Competition formats"
              sublabel="Stableford · Stroke Play · Better Ball · Scramble · Skins · Red vs Blue · and more to come"
            />
            <StatCounter
              value={100}
              suffix="%"
              label="Offline-ready"
              sublabel="Score every hole, even when the signal drops on the 7th."
            />
            <StatCounter
              value={0}
              staticText="Real time"
              label="Live leaderboards"
              sublabel="Every score, every group, every hole — as it happens."
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
            style={{ height: '30px', width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.6 }}
          />
        </Link>
      </footer>
    </>
  )
}
