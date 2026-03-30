import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchEventLeaderboardData } from '@/lib/leaderboard/fetchEventLeaderboardData'
import LeaderboardClient from './LeaderboardClient'
import BetSlip from './BetSlip'

interface PageProps {
  params: Promise<{ id: string }>
}

const FORMAT_LABEL: Record<string, string> = {
  stableford: 'Stableford',
  strokeplay: 'Stroke Play',
  matchplay: 'Match Play',
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const data = await fetchEventLeaderboardData(id)

  if (!data) {
    return { title: 'Leaderboard — LX2' }
  }

  const { event } = data
  const subtitle = [
    formatDate(event.date),
    FORMAT_LABEL[event.format] ?? event.format,
    event.courseName,
  ].filter(Boolean).join(' · ')

  return {
    title: `${event.name} — Leaderboard — LX2`,
    description: subtitle,
    openGraph: {
      title: `${event.name} — Live Leaderboard`,
      description: subtitle,
      siteName: 'LX2',
      type: 'website',
    },
  }
}

export default async function LeaderboardPage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const data = await fetchEventLeaderboardData(id)

  if (!data) {
    return (
      <ErrorPage
        title="Tournament not found"
        body="This tournament doesn&apos;t exist or is no longer available."
      />
    )
  }

  const { event, holeData, initialPlayers } = data

  if (!event.isPublic && !user) {
    redirect(`/auth/login?redirect=/events/${id}/leaderboard`)
  }

  if (event.format === 'matchplay') {
    return (
      <ErrorPage
        title="No leaderboard for Match Play"
        body="Match play tournaments use head-to-head results — there&apos;s no ranked leaderboard."
      />
    )
  }

  // Fetch prediction markets if enabled
  const admin = createAdminClient()
  const { data: predConfig } = await admin
    .from('prediction_configs')
    .select('enabled, starting_credits, max_bet_pct')
    .eq('event_id', id)
    .single()

  let predictionData: {
    markets: { id: string; market_type: string; title: string; status: string; selections: { id: string; label: string; odds_numerator: number; odds_denominator: number; event_player_id: string | null }[] }[]
    userCredits: number | null
    userBets: { id: string; selection_id: string; stake: number; odds_numerator: number; odds_denominator: number; potential_payout: number; status: string }[]
    maxBetPct: number
  } | null = null

  if (predConfig?.enabled) {
    const { data: markets } = await admin
      .from('prediction_markets')
      .select('id, market_type, title, status')
      .eq('event_id', id)
      .order('created_at')

    // Fetch selections for all markets
    const marketIds = (markets ?? []).map(m => m.id)
    const { data: selections } = marketIds.length > 0
      ? await admin
          .from('prediction_selections')
          .select('id, market_id, label, odds_numerator, odds_denominator, event_player_id, sort_order')
          .in('market_id', marketIds)
          .order('sort_order')
      : { data: [] as { id: string; market_id: string; label: string; odds_numerator: number; odds_denominator: number; event_player_id: string | null; sort_order: number }[] }

    // User-specific data
    let userCredits: number | null = null
    let userBets: { id: string; selection_id: string; stake: number; odds_numerator: number; odds_denominator: number; potential_payout: number; status: string }[] = []

    if (user) {
      const [{ data: bankroll }, { data: bets }] = await Promise.all([
        admin.from('prediction_bankrolls')
          .select('credits')
          .eq('event_id', id)
          .eq('user_id', user.id)
          .single(),
        admin.from('prediction_bets')
          .select('id, selection_id, stake, odds_numerator, odds_denominator, potential_payout, status')
          .eq('event_id', id)
          .eq('user_id', user.id)
          .order('placed_at', { ascending: false }),
      ])
      userCredits = bankroll?.credits ?? predConfig.starting_credits
      userBets = bets ?? []
    }

    predictionData = {
      markets: (markets ?? []).map(m => ({
        ...m,
        selections: (selections ?? []).filter(s => s.market_id === m.id),
      })),
      userCredits,
      userBets,
      maxBetPct: predConfig.max_bet_pct,
    }
  }

  return (
    <>
      <style>{`
        @keyframes lb-in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.75); }
        }
        .lb-page {
          background: #F0F4EC;
          min-height: 100dvh;
          max-width: 640px;
          margin: 0 auto;
        }

        /* ── Sticky header bar (matches scoring page) ── */
        .lb-header {
          background: #FFFFFF;
          padding: 0.875rem 1.25rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 8px rgba(26,28,28,0.04);
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .lb-back-btn {
          width: 40px; height: 40px;
          border-radius: 12px;
          border: none;
          background: transparent;
          color: #44483E;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s;
          text-decoration: none;
          flex-shrink: 0;
        }
        .lb-back-btn:hover { background: rgba(26,28,28,0.05); }
        .lb-header-title {
          font-family: var(--font-manrope), 'Manrope', sans-serif;
          font-weight: 700;
          font-size: 0.9375rem;
          color: #1A2E1A;
          letter-spacing: -0.01em;
        }
        .lb-tv-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          border-radius: 20px;
          border: 1.5px solid rgba(13, 99, 27, 0.25);
          background: rgba(13, 99, 27, 0.07);
          color: #0D631B;
          font-family: var(--font-manrope), 'Manrope', sans-serif;
          font-weight: 700;
          font-size: 0.75rem;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
          text-decoration: none;
          flex-shrink: 0;
        }
        .lb-tv-btn:hover { background: rgba(13, 99, 27, 0.12); border-color: rgba(13, 99, 27, 0.4); }

        /* ── Event info card ── */
        .lb-event-card {
          background: #FFFFFF;
          margin: 0.75rem 1rem 0;
          border-radius: 14px;
          padding: 1rem 1.25rem;
          border: 1px solid #E0EBE0;
          box-shadow: 0 2px 8px rgba(26,28,28,0.04);
          animation: lb-in 0.28s ease both;
        }
        .lb-event-name {
          font-family: var(--font-dm-serif), 'DM Serif Display', serif;
          font-weight: 400;
          font-size: 1.25rem;
          color: #1A2E1A;
          letter-spacing: -0.02em;
          margin: 0 0 0.375rem;
          line-height: 1.25;
        }
        .lb-event-meta {
          font-family: var(--font-dm-sans), 'DM Sans', sans-serif;
          font-size: 0.8125rem;
          color: #6B8C6B;
          line-height: 1.4;
        }
      `}</style>

      <div className="lb-page">
        {/* Sticky header — matches scoring page */}
        <header className="lb-header">
          <Link href={`/events/${id}`} className="lb-back-btn" aria-label="Back to event">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <span className="lb-header-title">Leaderboard</span>
          <Link href={`/events/${id}/leaderboard/tv`} className="lb-tv-btn">
            TV
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 9L9 3M9 3H4.5M9 3V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </header>

        {/* Event info card */}
        <div className="lb-event-card">
          <h1 className="lb-event-name">{event.name}</h1>
          <div className="lb-event-meta">
            {formatDate(event.date)}
            {' · '}
            {FORMAT_LABEL[event.format] ?? event.format}
            {event.courseName ? ` · ${event.courseName}` : ''}
          </div>
        </div>

        <LeaderboardClient
          eventId={id}
          format={event.format}
          roundType={event.roundType}
          allowancePct={event.allowancePct}
          holeData={holeData}
          initialPlayers={initialPlayers}
          ntpHoles={event.ntpHoles}
          ldHoles={event.ldHoles}
        />

        {predictionData && predictionData.markets.length > 0 && (
          <BetSlip
            eventId={id}
            markets={predictionData.markets}
            userCredits={predictionData.userCredits}
            userBets={predictionData.userBets}
            maxBetPct={predictionData.maxBetPct}
            isLoggedIn={!!user}
          />
        )}
      </div>
    </>
  )
}

// ─── Error page ───────────────────────────────────────────────────────────────

function ErrorPage({ title, body }: { title: string; body: string }) {
  return (
    <div style={{
      minHeight: '100dvh',
      background: '#F0F4EC',
      maxWidth: 640,
      margin: '0 auto',
      fontFamily: 'var(--font-dm-sans), sans-serif',
    }}>
      <header style={{
        background: '#FFFFFF',
        padding: '0.875rem 1.25rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(26,28,28,0.04)',
      }}>
        <span style={{
          fontFamily: 'var(--font-manrope), sans-serif',
          fontWeight: 700,
          fontSize: '0.9375rem',
          color: '#1A2E1A',
          letterSpacing: '-0.01em',
        }}>
          Leaderboard
        </span>
      </header>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        minHeight: 'calc(100dvh - 56px)',
      }}>
        <div style={{ maxWidth: 360, textAlign: 'center' }}>
          <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1A2E1A', marginBottom: 8 }}>
            {title}
          </div>
          <div
            style={{ fontSize: '0.875rem', color: '#6B8C6B', lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: body }}
          />
        </div>
      </div>
    </div>
  )
}
