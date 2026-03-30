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
        .hp-hero-text {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          justify-content: center;
          max-width: 640px;
          padding: 8rem 3.5rem 5rem 5rem;
          opacity: 0;
          animation: hp-rise 0.6s ease forwards 0.1s;
        }
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
          font-size: clamp(1rem, 1.4vw, 1.125rem);
          font-weight: 400;
          color: rgba(255,255,255,0.8);
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

        /* ── Bento card overrides — brand fonts + colours ────── */
        .hp-features .group h3 {
          font-family: var(--font-manrope), 'Manrope', sans-serif !important;
          font-weight: 700 !important;
          font-size: 1.05rem !important;
          color: #1A2E1A !important;
          line-height: 1.25 !important;
        }
        .hp-features .group p {
          font-family: var(--font-lexend), 'Lexend', sans-serif !important;
          font-size: 0.8125rem !important;
          font-weight: 400 !important;
          color: #4A5E4A !important;
          line-height: 1.55 !important;
        }
        .hp-features .group a, .hp-features .group button {
          font-family: var(--font-lexend), 'Lexend', sans-serif !important;
          font-size: 0.8125rem !important;
          color: #0D631B !important;
        }

        /* Bento card decorative backgrounds */
        .hp-bento-bg { position: absolute; inset: 0; pointer-events: none; }

        /* Scoring — warm fresh green with bar chart */
        .hp-bento-bg-scoring {
          background: linear-gradient(160deg, #E2F0E4 0%, #F0F8F1 100%);
        }
        .hp-bento-bg-scoring::after {
          content: '';
          position: absolute;
          bottom: 12px;
          right: 16px;
          width: 96px;
          height: 60px;
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 60'%3E%3Crect x='0' y='32' width='14' height='28' rx='3' fill='%230D631B' opacity='.15'/%3E%3Crect x='20' y='20' width='14' height='40' rx='3' fill='%230D631B' opacity='.22'/%3E%3Crect x='40' y='8' width='14' height='52' rx='3' fill='%230D631B' opacity='.32'/%3E%3Crect x='60' y='16' width='14' height='44' rx='3' fill='%230D631B' opacity='.24'/%3E%3Crect x='80' y='10' width='14' height='50' rx='3' fill='%230D631B' opacity='.18'/%3E%3C/svg%3E") center / contain no-repeat;
        }

        /* Leaderboard — deeper teal-green with podium */
        .hp-bento-bg-leaderboard {
          background: linear-gradient(160deg, #D8EAD9 0%, #EAF3EB 100%);
        }
        .hp-bento-bg-leaderboard::after {
          content: '';
          position: absolute;
          bottom: 12px;
          right: 16px;
          width: 72px;
          height: 56px;
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 72 56'%3E%3Crect x='24' y='8' width='24' height='48' rx='3' fill='%230D631B' opacity='.28'/%3E%3Crect x='0' y='22' width='22' height='34' rx='3' fill='%230D631B' opacity='.18'/%3E%3Crect x='50' y='30' width='22' height='26' rx='3' fill='%230D631B' opacity='.14'/%3E%3C/svg%3E") center / contain no-repeat;
        }

        /* Events — sage with calendar dots */
        .hp-bento-bg-events {
          background: linear-gradient(160deg, #E4EDE5 0%, #F2F7F2 100%);
        }
        .hp-bento-bg-events::after {
          content: '';
          position: absolute;
          bottom: 12px;
          right: 16px;
          width: 60px;
          height: 60px;
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 60'%3E%3Crect x='0' y='10' width='60' height='50' rx='6' fill='none' stroke='%230D631B' stroke-width='2.5' opacity='.2'/%3E%3Crect x='0' y='10' width='60' height='16' rx='6' fill='%230D631B' opacity='.12'/%3E%3Ccircle cx='14' cy='42' r='4' fill='%230D631B' opacity='.22'/%3E%3Ccircle cx='30' cy='42' r='4' fill='%230D631B' opacity='.22'/%3E%3Ccircle cx='46' cy='42' r='4' fill='%230D631B' opacity='.14'/%3E%3Ccircle cx='14' cy='55' r='4' fill='%230D631B' opacity='.14'/%3E%3Ccircle cx='30' cy='55' r='4' fill='%230D631B' opacity='.22'/%3E%3C/svg%3E") center / contain no-repeat;
        }

        /* Tournaments — richest green, trophy silhouette */
        .hp-bento-bg-tournaments {
          background: linear-gradient(160deg, #D2E6D4 0%, #E6F0E7 100%);
        }
        .hp-bento-bg-tournaments::after {
          content: '';
          position: absolute;
          bottom: 10px;
          right: 16px;
          width: 48px;
          height: 60px;
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 60'%3E%3Cpath d='M8 4h32v18c0 10-6 16-16 18C14 38 8 32 8 22V4z' fill='%230D631B' opacity='.2'/%3E%3Crect x='18' y='40' width='12' height='8' rx='2' fill='%230D631B' opacity='.18'/%3E%3Crect x='10' y='48' width='28' height='6' rx='3' fill='%230D631B' opacity='.22'/%3E%3Cpath d='M8 10 C0 10 0 22 8 22' stroke='%230D631B' stroke-width='2.5' fill='none' opacity='.18'/%3E%3Cpath d='M40 10 C48 10 48 22 40 22' stroke='%230D631B' stroke-width='2.5' fill='none' opacity='.18'/%3E%3C/svg%3E") center / contain no-repeat;
        }

        /* Handicap — lightest, trending line */
        .hp-bento-bg-handicap {
          background: linear-gradient(160deg, #E8F2E9 0%, #F4FAF5 100%);
        }
        .hp-bento-bg-handicap::after {
          content: '';
          position: absolute;
          bottom: 12px;
          right: 16px;
          width: 80px;
          height: 48px;
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 48'%3E%3Cpolyline points='0,40 20,28 40,32 60,14 80,8' fill='none' stroke='%230D631B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round' opacity='.28'/%3E%3Ccircle cx='80' cy='8' r='4' fill='%230D631B' opacity='.32'/%3E%3C/svg%3E") center / contain no-repeat;
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
        @media (max-width: 1024px) {
          .hp-hero-text { padding: 4rem 2.5rem 4rem 3.5rem; }
        }
        @media (max-width: 768px) {
          .hp-nav { padding: 0 24px; }
          .hp-hero-text { padding: 7rem 24px 4rem; max-width: 100%; }
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
        <div className="hp-hero-text">
          <h1>
            Your game.<br />
            Your data.<br />
            Your edge.
          </h1>
          <p>
            For every golfer, every society, every club.<br />
            Golf intelligence that gets smarter with every round.
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
