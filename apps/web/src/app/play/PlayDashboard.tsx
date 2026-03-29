'use client'
import { useRouter } from 'next/navigation'
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

        /* ── Hero banner ─────────────────────────────────── */
        .fe-banner {
          position: relative;
          width: 100%;
          padding: 1.75rem 1.5rem 1.5rem;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .fe-banner-img {
          position: absolute;
          inset: 0;
          object-fit: cover;
          width: 100%;
          height: 100%;
        }
        .fe-banner-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(10, 31, 10, 0.6) 0%,
            rgba(10, 31, 10, 0.45) 50%,
            rgba(10, 31, 10, 0.35) 100%
          );
          z-index: 1;
        }
        .fe-banner-logo {
          position: absolute;
          top: 0.875rem;
          right: 1.25rem;
          z-index: 3;
          opacity: 0.7;
          filter: brightness(0) invert(1);
        }
        .fe-banner-profile {
          position: relative;
          z-index: 3;
          display: flex;
          align-items: center;
          gap: 1rem;
          text-decoration: none;
          color: #fff;
        }
        .fe-avatar {
          width: 72px;
          height: 72px;
          border-radius: 14px;
          border: 3px solid rgba(255,255,255,0.25);
          box-shadow: 0 2px 12px rgba(0,0,0,0.3);
          object-fit: cover;
          flex-shrink: 0;
          background: #E0EBE0;
        }
        .fe-avatar-placeholder {
          width: 72px;
          height: 72px;
          border-radius: 14px;
          border: 3px solid rgba(255,255,255,0.25);
          box-shadow: 0 2px 12px rgba(0,0,0,0.3);
          flex-shrink: 0;
          background: linear-gradient(135deg, #0D631B, #0a4f15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-family: var(--font-manrope), sans-serif;
          font-weight: 800;
          font-size: 1.5rem;
        }
        .fe-banner-info { display: flex; flex-direction: column; gap: 0.35rem; }
        .fe-name {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 800;
          font-size: 1.5rem;
          color: #fff;
          letter-spacing: -0.02em;
          line-height: 1.1;
          text-shadow: 0 1px 4px rgba(0,0,0,0.3);
        }
        .fe-hcp-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          background: rgba(13, 99, 27, 0.7);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          border: 1px solid rgba(13, 99, 27, 0.5);
          border-radius: 9999px;
          padding: 4px 12px;
          font-family: var(--font-lexend), sans-serif;
          font-size: 0.75rem;
          font-weight: 600;
          color: #fff;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          width: fit-content;
        }
        /* Sign-out button — full-width below profile */
        .fe-so-hd {
          display: block;
          position: relative;
          z-index: 3;
          width: 100%;
          max-width: 340px;
          margin-top: 1rem;
          background: rgba(255,255,255,0.08);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          color: rgba(255,255,255,0.85);
          cursor: pointer;
          padding: 12px 24px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition: background 0.15s, color 0.15s;
        }
        .fe-so-hd:hover { background: rgba(255,255,255,0.18); color: #fff; }

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

        /* ── Stat cards (2-across, scrollable) ─────────── */
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
          padding: 1.25rem 1.25rem;
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
          .fe-name { font-size: 1.625rem; }
          .fe-avatar, .fe-avatar-placeholder { width: 80px; height: 80px; }
          .fe { padding-bottom: 0; }
        }
      `}</style>

      <div className="fe">

        {/* ── Hero banner with photo ── */}
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
          <div className="fe-banner-logo">
            <Image src="/lx2-logo.svg" alt="LX2" width={64} height={32} style={{ width: 'auto', height: 'auto' }} priority />
          </div>
          <Link href="/profile" className="fe-banner-profile">
            {avatarUrl ? (
              <Image src={avatarUrl} alt={displayName} width={72} height={72} className="fe-avatar" />
            ) : (
              <div className="fe-avatar-placeholder">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="fe-banner-info">
              <h1 className="fe-name">{displayName}</h1>
              {handicapIndex != null && (
                <div className="fe-hcp-badge">
                  Handicap: {handicapIndex % 1 === 0 ? handicapIndex.toFixed(1) : handicapIndex}
                </div>
              )}
            </div>
          </Link>
          <button className="fe-so-hd" onClick={handleSignOut}>Sign Out</button>
        </div>

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
              <Link href="/play/new?mode=tournament" className="fe-action-card secondary">
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

          {/* Quick stats — 2 across, swipe for more */}
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
