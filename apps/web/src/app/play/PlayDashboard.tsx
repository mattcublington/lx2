'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'

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

interface OrganisedEvent {
  id: string
  name: string
  date: string
  format: string
  finalised: boolean
  courseName: string | null
  playerCount: number
}

interface Props {
  userId: string
  displayName: string
  avatarUrl?: string | null
  rounds: RoundRow[]
  handicapIndex?: number | null
  roundsCount?: number
  activeRoundId?: string | null
  roundsThisMonth?: number | null
  avgScore?: number | null
  lastRoundScore?: number | null
  lastRoundCourse?: string | null
  upcomingEvent?: UpcomingEvent | null
  organisedEvents?: OrganisedEvent[]
  recentScores?: Array<{ date: string; score: number }>
}


/* ── Greeting ──────────────────────────────────────────────────── */

type Period = 'morning' | 'afternoon' | 'evening'

const TZ_GREETINGS: Record<string, Record<Period, string>> = {
  'Asia/Tokyo':          { morning: 'Ohayo gozaimasu', afternoon: 'Konnichiwa', evening: 'Konbanwa' },
  'Asia/Osaka':          { morning: 'Ohayo gozaimasu', afternoon: 'Konnichiwa', evening: 'Konbanwa' },
  'Asia/Seoul':          { morning: 'Joeun achimieyo', afternoon: 'Annyeonghaseyo', evening: 'Joeun jeonyeogeyo' },
  'Asia/Shanghai':       { morning: 'Zao shang hao', afternoon: 'Xia wu hao', evening: 'Wan shang hao' },
  'Asia/Hong_Kong':      { morning: 'Zao shang hao', afternoon: 'Xia wu hao', evening: 'Wan shang hao' },
  'Asia/Taipei':         { morning: 'Zao an', afternoon: 'Wu an', evening: 'Wan an' },
  'Europe/Paris':        { morning: 'Bonjour', afternoon: 'Bonjour', evening: 'Bonsoir' },
  'Europe/Brussels':     { morning: 'Bonjour', afternoon: 'Bonjour', evening: 'Bonsoir' },
  'Europe/Madrid':       { morning: 'Buenos dias', afternoon: 'Buenas tardes', evening: 'Buenas noches' },
  'America/Mexico_City': { morning: 'Buenos dias', afternoon: 'Buenas tardes', evening: 'Buenas noches' },
  'America/Bogota':      { morning: 'Buenos dias', afternoon: 'Buenas tardes', evening: 'Buenas noches' },
  'America/Buenos_Aires':{ morning: 'Buenos dias', afternoon: 'Buenas tardes', evening: 'Buenas noches' },
  'America/Santiago':    { morning: 'Buenos dias', afternoon: 'Buenas tardes', evening: 'Buenas noches' },
  'Europe/Berlin':       { morning: 'Guten Morgen', afternoon: 'Guten Tag', evening: 'Guten Abend' },
  'Europe/Vienna':       { morning: 'Guten Morgen', afternoon: 'Guten Tag', evening: 'Guten Abend' },
  'Europe/Zurich':       { morning: 'Guten Morgen', afternoon: 'Guten Tag', evening: 'Guten Abend' },
  'Europe/Rome':         { morning: 'Buongiorno', afternoon: 'Buon pomeriggio', evening: 'Buonasera' },
  'Europe/Lisbon':       { morning: 'Bom dia', afternoon: 'Boa tarde', evening: 'Boa noite' },
  'America/Sao_Paulo':   { morning: 'Bom dia', afternoon: 'Boa tarde', evening: 'Boa noite' },
  'Europe/Amsterdam':    { morning: 'Goedemorgen', afternoon: 'Goedemiddag', evening: 'Goedenavond' },
  'Europe/Moscow':       { morning: 'Dobroe utro', afternoon: 'Dobry den', evening: 'Dobry vecher' },
  'Asia/Bangkok':        { morning: 'Sawadee krap', afternoon: 'Sawadee krap', evening: 'Sawadee krap' },
  'Asia/Jakarta':        { morning: 'Selamat pagi', afternoon: 'Selamat siang', evening: 'Selamat malam' },
  'Asia/Kolkata':        { morning: 'Namaste', afternoon: 'Namaste', evening: 'Namaste' },
  'Asia/Dubai':          { morning: 'Sabah al-khayr', afternoon: 'Masa al-khayr', evening: 'Masa al-khayr' },
}

function getGreeting(displayName: string): { prefix: string; firstName: string } {
  const firstName = displayName.split(' ')[0] ?? displayName
  const hour = new Date().getHours()
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const period: Period = hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 17 ? 'afternoon' : 'evening'
  const en: Record<Period, string> = { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening' }
  const match = TZ_GREETINGS[tz]
  return { prefix: match ? match[period] : en[period], firstName }
}

/* ── Daily insight ─────────────────────────────────────────────── */

const GOLF_TIPS = [
  'A pre-shot routine builds consistency - pick a spot behind the ball and commit.',
  'Course management wins more shots than swing changes.',
  'The short game accounts for over 60% of your strokes. Practise it more.',
  'Align to an intermediate target 2 feet in front of the ball, not the distant flag.',
  'On tough holes, aim for the fat part of the green - bogey is a fine score.',
  'Slow your backswing. Most amateurs rush to the top.',
  'Speed control matters more than line when putting.',
  'Never make a swing change during a round. Trust what you have today.',
  'A solid 3-wood is more valuable than a driver you can\'t control.',
  'Read greens from below the hole - you see the slope more clearly.',
  'Tension is your biggest enemy. Relax your grip, shoulders, and jaw.',
  'Play to where your next shot is easiest, not where you want to be.',
  'For chip shots, play the ball off your back foot and lean the shaft forward.',
  'Commit to every shot, even when the lie is tough. Doubt creates bad swings.',
  'The mental game is won between shots, not during them.',
]

function getDailyInsight(
  recentScores: Array<{ date: string; score: number }>,
  roundsCount: number,
): string {
  if (roundsCount === 0) return 'Every great round starts with the first. Get out there - the course is waiting.'
  if (roundsCount === 1) return 'One round down. The best way to improve is to play more - consistency builds over time.'

  if (recentScores.length >= 4) {
    const half = Math.floor(recentScores.length / 2)
    const recentAvg = recentScores.slice(-half).reduce((a, b) => a + b.score, 0) / half
    const olderAvg = recentScores.slice(0, half).reduce((a, b) => a + b.score, 0) / half
    const diff = olderAvg - recentAvg
    if (diff > 2) return `Your last ${half} rounds average ${recentAvg.toFixed(1)} strokes - ${diff.toFixed(1)} better than before. You're on the right trajectory.`
    if (diff < -2) return `Your scoring has drifted up by ${Math.abs(diff).toFixed(1)} shots recently. A session focusing on the short game could turn it around.`
  }

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000)
  return GOLF_TIPS[dayOfYear % GOLF_TIPS.length] ?? GOLF_TIPS[0]!
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
  avatarUrl,
  rounds,
  handicapIndex,
  roundsCount = 0,
  activeRoundId,
  avgScore,
  lastRoundScore,
  lastRoundCourse,
  upcomingEvent,
  organisedEvents = [],
  recentScores = [],
}: Props) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const { prefix: greetingPrefix, firstName } = getGreeting(displayName)
  const dailyInsight = getDailyInsight(recentScores, roundsCount)

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
      value: lastRoundScore != null ? String(lastRoundScore) : 'n/a',
      label: lastRoundCourse ? `Last · ${lastRoundCourse}` : 'Last round',
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
          color: #1A2E1A;
          padding-bottom: max(80px, calc(80px + env(safe-area-inset-bottom)));
        }

        /* ── Banner top bar (logo + hamburger inside banner) ── */
        .fe-banner-topbar {
          position: relative;
          z-index: 3;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.875rem 1rem;
        }
        .fe-topbar-logo {
          display: flex;
          align-items: center;
          text-decoration: none;
        }
        .fe-hamburger {
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #fff;
          transition: background 0.15s, border-color 0.15s;
          flex-shrink: 0;
        }
        .fe-hamburger:hover { background: rgba(255, 255, 255, 0.2); border-color: rgba(255, 255, 255, 0.35); }

        /* ── Hero banner ─────────────────────────────────── */
        .fe-banner-wrap {
          padding: 0.75rem 1rem 0;
        }
        .fe-banner {
          position: relative;
          width: 100%;
          min-height: 260px;
          overflow: hidden;
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(10, 31, 10, 0.22);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .fe-banner-img {
          position: absolute;
          inset: 0;
          object-fit: cover;
          width: 100%;
          height: 100%;
          filter: saturate(1.3) contrast(1.05);
        }
        .fe-banner-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(10, 31, 10, 0.25) 0%,
            rgba(10, 31, 10, 0.05) 30%,
            rgba(10, 31, 10, 0.15) 60%,
            rgba(10, 31, 10, 0.5) 100%
          );
          z-index: 1;
        }

        /* ── Profile card (inside banner, transparent) ────── */
        .fe-profile-card {
          position: relative;
          z-index: 3;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1rem 1.25rem;
          margin: 0 0.75rem 0.75rem;
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 14px;
          animation: fe-rise 0.4s 0.05s cubic-bezier(0.2, 0, 0, 1) both;
        }
        .fe-profile-link {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          text-decoration: none;
          color: #fff;
          flex: 1;
          min-width: 0;
        }
        .fe-avatar {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          border: 2.5px solid rgba(255,255,255,0.2);
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          object-fit: cover;
          flex-shrink: 0;
          background: #E0EBE0;
        }
        .fe-avatar-placeholder {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          border: 2.5px solid rgba(255,255,255,0.2);
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          flex-shrink: 0;
          background: linear-gradient(135deg, #0D631B, #0a4f15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-family: var(--font-manrope), sans-serif;
          font-weight: 800;
          font-size: 1.25rem;
        }
        .fe-banner-info { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
        .fe-greeting-sub {
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.8125rem;
          font-weight: 400;
          color: rgba(255,255,255,0.6);
          line-height: 1.2;
        }
        .fe-name {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 800;
          font-size: 1.375rem;
          color: #fff;
          letter-spacing: -0.03em;
          line-height: 1.1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .fe-profile-sub {
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.75rem;
          font-weight: 400;
          color: rgba(255,255,255,0.45);
          line-height: 1.3;
          margin-top: 0.15rem;
        }

        /* ── Neon HCP badge (pill, glow lines) ────────── */
        .fe-hcp-neon {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          border: 1px solid rgba(90, 180, 100, 0.25);
          background: rgba(90, 180, 100, 0.08);
          flex-shrink: 0;
          overflow: hidden;
          transition: background 0.3s;
        }
        .fe-hcp-neon:hover {
          background: rgba(90, 180, 100, 0.04);
        }
        /* Top glow line */
        .fe-hcp-neon::before {
          content: '';
          position: absolute;
          top: -1px;
          left: 12.5%;
          width: 75%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(120, 210, 130, 0.6), transparent);
          opacity: 0;
          transition: opacity 0.5s ease-in-out;
        }
        /* Bottom glow line */
        .fe-hcp-neon::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 12.5%;
          width: 75%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(120, 210, 130, 0.6), transparent);
          opacity: 0;
          transition: opacity 0.5s ease-in-out;
        }
        .fe-hcp-neon:hover::before,
        .fe-hcp-neon:hover::after {
          opacity: 1;
        }
        .fe-hcp-label {
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.6875rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.65);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .fe-hcp-value {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 800;
          font-size: 1.125rem;
          color: #fff;
          letter-spacing: -0.02em;
        }

        /* ── Stat cards (scrollable row) ──────────────── */
        .fe-stats {
          display: flex;
          gap: 0.75rem;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          margin-bottom: 1.5rem;
          padding-bottom: 0.25rem;
          animation: fe-rise 0.45s 0.06s cubic-bezier(0.2, 0, 0, 1) both;
        }
        .fe-stats::-webkit-scrollbar { display: none; }
        .fe-stat {
          background: #FFFFFF;
          border-radius: 16px;
          padding: 1.25rem 0.5rem;
          text-align: center;
          box-shadow: 0 4px 12px rgba(26, 28, 28, 0.04);
          transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
          min-width: calc(50% - 0.375rem);
          flex-shrink: 0;
          scroll-snap-align: start;
          overflow: hidden;
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
          background: linear-gradient(135deg, rgba(13, 99, 27, 0.1) 0%, rgba(61, 107, 26, 0.1) 100%);
          border-radius: 10px;
          color: #0D631B;
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
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Dropdown menu (fixed, below topbar) */
        .fe-menu {
          position: fixed;
          top: 3.75rem;
          right: 2rem;
          z-index: 200;
          background: rgba(10, 22, 10, 0.94);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          overflow: hidden;
          min-width: 186px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.35);
          animation: fe-menu-in 0.15s ease-out both;
        }
        @keyframes fe-menu-in {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .fe-menu-backdrop {
          position: fixed;
          inset: 0;
          z-index: 199;
        }
        .fe-menu-item {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          width: 100%;
          padding: 0.875rem 1.125rem;
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.9375rem;
          font-weight: 500;
          color: rgba(255,255,255,0.88);
          background: none;
          border: none;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          cursor: pointer;
          text-decoration: none;
          transition: background 0.12s;
          text-align: left;
        }
        .fe-menu-item:last-child { border-bottom: none; }
        .fe-menu-item:hover { background: rgba(255,255,255,0.08); }
        .fe-menu-item.danger { color: rgba(255, 110, 110, 0.9); }
        /* Daily insight card */
        .fe-insight {
          background: linear-gradient(135deg, rgba(13,99,27,0.07) 0%, rgba(13,99,27,0.03) 100%);
          border: 1px solid rgba(13,99,27,0.18);
          border-radius: 14px;
          padding: 0.875rem 1rem;
          margin-bottom: 1.25rem;
          animation: fe-rise 0.45s 0.05s cubic-bezier(0.2, 0, 0, 1) both;
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
        }
        .fe-insight-icon {
          width: 26px;
          height: 26px;
          border-radius: 7px;
          background: rgba(13,99,27,0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0D631B;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .fe-insight-label {
          font-family: var(--font-lexend), sans-serif;
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #0D631B;
          margin-bottom: 0.2rem;
        }
        .fe-insight-text {
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.875rem;
          font-weight: 400;
          color: #1A2E1A;
          line-height: 1.5;
        }

        /* ── Main content ────────────────────────────────── */
        .fe-main {
          padding: 1.5rem 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        /* ── Golf Form Pulse ────────────────────────────── */
        .fe-pulse {
          background: #FFFFFF;
          border-radius: 16px;
          padding: 1.25rem;
          box-shadow: 0 4px 12px rgba(26, 28, 28, 0.04);
          margin-bottom: 1.5rem;
          animation: fe-rise 0.45s 0.03s cubic-bezier(0.2, 0, 0, 1) both;
        }
        .fe-pulse-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.875rem;
        }
        .fe-pulse-title {
          font-family: var(--font-lexend), sans-serif;
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #72786E;
        }
        .fe-pulse-trend {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-family: var(--font-lexend), sans-serif;
          font-size: 0.8125rem;
          font-weight: 500;
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
        }
        .fe-pulse-trend.improving { color: #0D631B; background: rgba(13, 99, 27, 0.08); }
        .fe-pulse-trend.declining { color: #b91c1c; background: rgba(185, 28, 28, 0.06); }
        .fe-pulse-trend.steady { color: #72786E; background: rgba(114, 120, 110, 0.08); }
        .fe-pulse-sparkline {
          width: 100%;
          height: 56px;
          margin-bottom: 0.75rem;
        }
        .fe-pulse-scores {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.875rem;
        }
        .fe-pulse-score {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.15rem;
        }
        .fe-pulse-score-val {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 700;
          font-size: 0.6875rem;
          color: #1A2E1A;
        }
        .fe-pulse-score-val.latest {
          color: #0D631B;
          font-size: 0.75rem;
        }
        .fe-pulse-score-date {
          font-family: var(--font-lexend), sans-serif;
          font-size: 0.5625rem;
          color: #72786E;
        }
        .fe-pulse-footer {
          display: flex;
          gap: 1.5rem;
          font-family: var(--font-lexend), sans-serif;
          font-size: 0.8125rem;
          color: #72786E;
        }

        /* ── (spacer) ── */

        /* ── CTA button ──────────────────────────────────── */
        .fe-cta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          width: 100%;
          padding: 1.125rem;
          background: linear-gradient(135deg, #0D631B 0%, #0a4f15 100%);
          color: #FFFFFF;
          border: none;
          border-radius: 16px;
          font-family: var(--font-manrope), sans-serif;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(13, 99, 27, 0.2);
          transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
          margin-bottom: 2rem;
          text-decoration: none;
          letter-spacing: -0.01em;
          animation: fe-rise 0.45s 0.1s cubic-bezier(0.2, 0, 0, 1) both;
        }
        .fe-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 32px rgba(13, 99, 27, 0.28);
        }
        .fe-cta:active { transform: translateY(0); }

        /* Join ongoing-round variant */
        .fe-cta.join {
          background: #FFFFFF;
          color: #0D631B;
          border: 1.5px solid #E0EBE0;
          box-shadow: 0 4px 12px rgba(26, 28, 28, 0.06);
        }
        .fe-cta.join:hover {
          box-shadow: 0 8px 20px rgba(26, 28, 28, 0.1);
        }

        /* ── Action cards (Start / Organise) ────────────── */
        .fe-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
          animation: fe-rise 0.45s 0.1s cubic-bezier(0.2, 0, 0, 1) both;
        }
        .fe-action-card {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 1rem;
          padding: 1.125rem 1.25rem 1.125rem 1rem;
          background: #FFFFFF;
          border-radius: 18px;
          box-shadow: 0 2px 8px rgba(26, 28, 28, 0.06);
          text-decoration: none;
          color: inherit;
          transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
          cursor: pointer;
          border: 1.5px solid #E0EBE0;
          position: relative;
          overflow: hidden;
        }
        .fe-action-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(26, 28, 28, 0.08);
        }
        .fe-action-card:active { transform: translateY(0); }
        .fe-action-card.primary {
          background: linear-gradient(135deg, #0D631B 0%, #0a4f15 100%);
          color: #FFFFFF;
          border-color: transparent;
          box-shadow: 0 6px 20px rgba(13, 99, 27, 0.2);
        }
        .fe-action-card.primary:hover {
          box-shadow: 0 10px 28px rgba(13, 99, 27, 0.28);
        }
        .fe-action-icon {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .fe-action-card.primary .fe-action-icon {
          background: rgba(255, 255, 255, 0.18);
        }
        .fe-action-card.secondary .fe-action-icon {
          background: rgba(13, 99, 27, 0.08);
          color: #0D631B;
        }
        .fe-action-text {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .fe-action-title {
          font-family: var(--font-dm-sans), sans-serif;
          font-weight: 700;
          font-size: 1.0625rem;
          letter-spacing: -0.01em;
          text-align: left;
          line-height: 1.2;
        }
        .fe-action-sub {
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.8125rem;
          font-weight: 400;
          text-align: left;
          line-height: 1.4;
          opacity: 0.65;
        }
        .fe-action-card.primary .fe-action-sub { opacity: 0.75; }

        /* Join-group secondary link (below action cards) */
        .fe-cta-secondary {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          width: 100%;
          padding: 0.9375rem 1.25rem;
          background: rgba(13, 99, 27, 0.06);
          color: #1A2E1A;
          border: none;
          border-radius: 14px;
          font-family: var(--font-dm-sans), sans-serif;
          font-weight: 600;
          font-size: 0.8125rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.15s;
          margin-bottom: 2rem;
          text-decoration: none;
          animation: fe-rise 0.45s 0.15s cubic-bezier(0.2, 0, 0, 1) both;
        }
        .fe-cta-secondary .fe-join-chevron {
          margin-left: auto;
          color: #6B8C6B;
        }
        .fe-cta-secondary:hover {
          background: rgba(13, 99, 27, 0.1);
        }

        /* ── Section header ──────────────────────────────── */
        .fe-section-hd {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 1rem;
        }
        .fe-section-title {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 700;
          font-size: 1.125rem;
          color: #1A2E1A;
          letter-spacing: -0.01em;
        }
        .fe-section-link {
          font-family: var(--font-lexend), sans-serif;
          font-size: 0.8125rem;
          font-weight: 500;
          color: #6B8C6B;
          text-decoration: none;
          transition: color 0.15s;
        }
        .fe-section-link:hover { color: #0D631B; }

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
          align-items: center;
          border-bottom: 1px solid rgba(26, 28, 28, 0.06);
          transition: background 0.2s ease-in-out;
        }
        .fe-round-row:last-child { border-bottom: none; }
        .fe-round-row:hover { background: rgba(240, 244, 236, 0.6); }
        .fe-round-link {
          display: flex;
          flex: 1;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 0.5rem 1rem 1.25rem;
          text-decoration: none;
          color: inherit;
          min-width: 0;
        }
        .fe-round-info { flex: 1; min-width: 0; }
        .fe-course {
          font-family: var(--font-lexend), sans-serif;
          font-weight: 500;
          font-size: 0.9375rem;
          color: #1A2E1A;
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
        .fe-round-link:hover .fe-round-chev {
          transform: translateX(2px);
          color: #0D631B;
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

        /* ── My Events (organiser) ─────────────────────────── */
        .fe-my-events {
          margin-bottom: 2rem;
          animation: fe-rise 0.45s 0.16s cubic-bezier(0.2, 0, 0, 1) both;
        }
        .fe-my-events-list {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }
        .fe-org-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #FFFFFF;
          border-radius: 14px;
          padding: 1rem 1.25rem;
          box-shadow: 0 4px 12px rgba(26, 28, 28, 0.04);
          text-decoration: none;
          color: inherit;
          transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        }
        .fe-org-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(26, 28, 28, 0.08);
        }
        .fe-org-info { flex: 1; min-width: 0; }
        .fe-org-name {
          font-family: var(--font-lexend), sans-serif;
          font-weight: 500;
          font-size: 0.9375rem;
          color: #1A2E1A;
          margin-bottom: 0.15rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .fe-org-meta {
          font-family: var(--font-lexend), sans-serif;
          font-size: 0.8125rem;
          color: #72786E;
        }
        .fe-org-badge {
          flex-shrink: 0;
          margin-left: 0.75rem;
          padding: 0.25rem 0.625rem;
          border-radius: 8px;
          font-family: var(--font-lexend), sans-serif;
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .fe-org-badge.finalised {
          background: rgba(13, 99, 27, 0.1);
          color: #0D631B;
        }
        .fe-org-badge.live {
          background: rgba(234, 179, 8, 0.12);
          color: #92400e;
        }
        .fe-org-badge.upcoming {
          background: rgba(107, 140, 107, 0.12);
          color: #6B8C6B;
        }

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
          .fe-name { font-size: 1.5rem; }
          .fe-avatar, .fe-avatar-placeholder { width: 56px; height: 56px; }
          .fe-banner { min-height: 240px; }
          .fe-profile-card { margin: 0 1rem 1rem; padding: 1.125rem 1.5rem; }
          .fe { padding-bottom: 0; }
          .fe-menu { top: 4rem; right: 2.5rem; }
        }
      `}</style>

      <div className="fe">

        {/* ── Hero banner with logo, hamburger, and profile card ── */}
        <div className="fe-banner-wrap">
          <div className="fe-banner">
            <Image
              src="/hero.jpg"
              alt="Golf course"
              fill
              priority
              className="fe-banner-img"
              sizes="100vw"
              quality={90}
            />
            <div className="fe-banner-overlay" />

            {/* ── Logo + hamburger inside banner ── */}
            <div className="fe-banner-topbar">
              <Link href="/play" className="fe-topbar-logo">
                <Image src="/lx2-logo.svg" alt="LX2" width={72} height={36} />
              </Link>
              <button className="fe-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Open menu">
                <HamburgerIcon />
              </button>
            </div>

            {/* ── Profile card (inside banner, frosted glass) ── */}
            <div className="fe-profile-card">
              <Link href="/profile" className="fe-profile-link">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={displayName} width={52} height={52} className="fe-avatar" />
                ) : (
                  <div className="fe-avatar-placeholder">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="fe-banner-info">
                  <div className="fe-greeting-sub">{greetingPrefix},</div>
                  <h1 className="fe-name">{firstName}</h1>
                  <div className="fe-profile-sub">Ready for your next round?</div>
                </div>
              </Link>
              {handicapIndex != null && (
                <div className="fe-hcp-neon">
                  <span className="fe-hcp-label">HCP</span>
                  <span className="fe-hcp-value">
                    {handicapIndex % 1 === 0 ? handicapIndex.toFixed(1) : handicapIndex}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dropdown menu — rendered outside banner to avoid overflow clip */}
        {menuOpen && (
          <div className="fe-menu-backdrop" onClick={() => setMenuOpen(false)} />
        )}
        {menuOpen && (
          <nav className="fe-menu" role="menu">
            <Link href="/profile" className="fe-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
              <UserMenuIcon /> Profile
            </Link>
            <button className="fe-menu-item danger" role="menuitem" onClick={handleSignOut}>
              <SignOutMenuIcon /> Sign out
            </button>
          </nav>
        )}

        {/* ── Main ── */}
        <main className="fe-main">

          {/* Golf Form Pulse — sparkline of recent scores */}
          {recentScores.length >= 2 && <FormPulse recentScores={recentScores} />}

          {/* Primary CTA — active round or action cards */}
          {activeRoundId ? (
            <Link href={`/rounds/${activeRoundId}/score`} className="fe-cta join">
              <PlayIcon />
              Join ongoing round
            </Link>
          ) : (
            <div className="fe-actions">
              <Link href="/play/new" className="fe-action-card primary">
                <div className="fe-action-icon"><PlayIcon /></div>
                <div className="fe-action-text">
                  <div className="fe-action-title">Start a round</div>
                  <div className="fe-action-sub">Begin a new 18-hole scorecard</div>
                </div>
              </Link>
              <Link href="/events/new" className="fe-action-card secondary">
                <div className="fe-action-icon"><TournamentIcon /></div>
                <div className="fe-action-text">
                  <div className="fe-action-title">Organise a tournament</div>
                  <div className="fe-action-sub">Create and manage competitions</div>
                </div>
              </Link>
            </div>
          )}

          {/* Secondary CTA — join another group's round */}
          {!activeRoundId && (
            <Link href="/play/join" className="fe-cta-secondary">
              <PeopleIcon />
              Join a group&apos;s round
              <span className="fe-join-chevron">›</span>
            </Link>
          )}

          {/* Daily insight */}
          <div className="fe-insight">
            <div className="fe-insight-icon"><LightbulbIcon /></div>
            <div>
              <div className="fe-insight-label">Today&apos;s insight</div>
              <div className="fe-insight-text">{dailyInsight}</div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="fe-stats">
            {stats.map((s, i) => (
              <div className="fe-stat" key={i}>
                <div className="fe-stat-icon">{s.icon}</div>
                <div className="fe-stat-val">{s.value}</div>
                <div className="fe-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Recent rounds */}
          <section className="fe-rounds">
            <div className="fe-section-hd">
              <h2 className="fe-section-title">Recent Rounds</h2>
              {rounds.length > 0 && (
                <Link href="/rounds" className="fe-section-link">View all →</Link>
              )}
            </div>
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
                    <div key={round.id} className="fe-round-row">
                      <Link href={`/rounds/${round.id}`} className="fe-round-link">
                        <div className="fe-round-info">
                          <div className="fe-course">{displayCourse}</div>
                          <div className="fe-round-date">{date}</div>
                        </div>
                        <div className="fe-round-chev">›</div>
                      </Link>
                    </div>
                  )
                })
              )}
            </div>
          </section>

          {/* My Tournaments — organiser */}
          {organisedEvents.length > 0 && (
            <section className="fe-my-events">
              <div className="fe-section-hd">
                <h2 className="fe-section-title">My Tournaments</h2>
                <Link href="/events" className="fe-section-link">View all →</Link>
              </div>
              <div className="fe-my-events-list">
                {organisedEvents.map(ev => {
                  const today = new Date().toISOString().slice(0, 10)
                  const status = ev.finalised ? 'finalised' : ev.date <= today ? 'live' : 'upcoming'
                  const badgeLabel = status === 'finalised' ? 'Finalised' : status === 'live' ? 'In progress' : 'Upcoming'
                  return (
                    <Link key={ev.id} href={`/events/${ev.id}/manage`} className="fe-org-card">
                      <div className="fe-org-info">
                        <div className="fe-org-name">{ev.name}</div>
                        <div className="fe-org-meta">
                          {formatDate(ev.date)}
                          {ev.courseName && ` · ${ev.courseName}`}
                          {` · ${ev.playerCount} player${ev.playerCount !== 1 ? 's' : ''}`}
                        </div>
                      </div>
                      <span className={`fe-org-badge ${status}`}>{badgeLabel}</span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {/* Upcoming event — optional */}
          {upcomingEvent && (
            <section className="fe-events">
              <div className="fe-section-hd">
                <h2 className="fe-section-title">Upcoming Events</h2>
                <Link href="/events" className="fe-section-link">View all →</Link>
              </div>
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

        <BottomNav active="home" />

      </div>
    </>
  )
}

/* ── Inline SVG icons ────────────────────────────────────────── */


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

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M10 8l6 4-6 4V8z" fill="currentColor"/>
    </svg>
  )
}

function TournamentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
      <path d="M6 3h12l-1 8H7L6 3z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 11c0 2.8 2.2 6 5 6s5-3.2 5-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
      <path d="M18 5h2a1 1 0 011 1v1a3 3 0 01-3 3M6 5H4a1 1 0 00-1 1v1a3 3 0 003 3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

function PeopleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M3 21v-1a6 6 0 0112 0v1" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
      <path d="M16 3.13a4 4 0 010 7.75M21 21v-1a4 4 0 00-3-3.85" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
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

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function UserMenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M4 20a8 8 0 0116 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

function SignOutMenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function LightbulbIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2a7 7 0 015.33 11.6c-.54.66-.83 1.48-.83 2.4V17a2 2 0 01-2 2H9a2 2 0 01-2-2v-1c0-.92-.29-1.74-.83-2.4A7 7 0 0112 2z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 21h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

/* ── Golf Form Pulse ──────────────────────────────────────────── */

function FormPulse({ recentScores }: { recentScores: Array<{ date: string; score: number }> }) {
  const scores = recentScores.map(s => s.score)
  const half = Math.floor(scores.length / 2)
  const recentAvg = scores.slice(-half).reduce((a, b) => a + b, 0) / half
  const olderAvg = scores.slice(0, half).reduce((a, b) => a + b, 0) / half
  const diff = olderAvg - recentAvg // positive = improving (lower golf scores)
  const trend = diff > 1 ? 'improving' : diff < -1 ? 'declining' : 'steady'
  const trendLabel = trend === 'improving' ? 'Improving' : trend === 'declining' ? 'Needs work' : 'Steady'
  const trendArrow = trend === 'improving' ? '\u2197' : trend === 'declining' ? '\u2198' : '\u2192'

  const lastEntry = recentScores[recentScores.length - 1]!
  const lastDate = new Date(lastEntry.date + 'T12:00:00')
  const daysSince = Math.floor((Date.now() - lastDate.getTime()) / 86400000)
  const daysLabel = daysSince === 0 ? 'Played today' : daysSince === 1 ? 'Last played yesterday' : `Last played ${daysSince} days ago`

  // Sparkline geometry
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const range = max - min || 1
  const pad = 8
  const w = 300
  const h = 56
  const iw = w - pad * 2
  const ih = h - pad * 2

  const pts = scores.map((s, i) => ({
    x: pad + (i / (scores.length - 1)) * iw,
    y: pad + ((s - min) / range) * ih, // lower score = top of chart
  }))
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')
  const first = pts[0]!
  const last = pts[pts.length - 1]!
  const fillPts = `${first.x},${h} ${polyline} ${last.x},${h}`

  const shortDate = (d: string) => {
    const dt = new Date(d + 'T12:00:00')
    return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="fe-pulse">
      <div className="fe-pulse-header">
        <span className="fe-pulse-title">Your Form</span>
        <span className={`fe-pulse-trend ${trend}`}>
          {trendArrow} {trendLabel}
        </span>
      </div>
      <svg className="fe-pulse-sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="pulse-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0D631B" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0D631B" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={fillPts} fill="url(#pulse-fill)" />
        <polyline points={polyline} fill="none" stroke="#0D631B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={last.x} cy={last.y} r="4" fill="#0D631B" />
        <circle cx={last.x} cy={last.y} r="8" fill="none" stroke="#0D631B" strokeWidth="1.5" opacity="0.25">
          <animate attributeName="r" from="4" to="12" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.3" to="0" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>
      <div className="fe-pulse-scores">
        {recentScores.map((s, i) => (
          <div className="fe-pulse-score" key={s.date}>
            <span className={`fe-pulse-score-val${i === recentScores.length - 1 ? ' latest' : ''}`}>{s.score}</span>
            <span className="fe-pulse-score-date">{shortDate(s.date)}</span>
          </div>
        ))}
      </div>
      <div className="fe-pulse-footer">
        <span>{daysLabel}</span>
        <span>{scores.length} rounds tracked</span>
      </div>
    </div>
  )
}
