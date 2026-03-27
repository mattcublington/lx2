import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchEventLeaderboardData } from '@/lib/leaderboard/fetchEventLeaderboardData'
import LeaderboardClient from './LeaderboardClient'

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

export default async function LeaderboardPage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const data = await fetchEventLeaderboardData(id)

  if (!data) {
    return (
      <ErrorPage
        title="Event not found"
        body="This event doesn&apos;t exist or is no longer available."
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
        body="Match play events use head-to-head results — there&apos;s no ranked leaderboard."
      />
    )
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
      `}</style>

      {/* Sticky header */}
      <header style={{
        background: '#0a1f0a',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', height: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Link
            href={`/events/${id}`}
            style={{
              textDecoration: 'none', color: '#6B8C6B',
              fontSize: '0.8125rem', fontFamily: 'var(--font-dm-sans), sans-serif',
            }}
          >
            ← Event
          </Link>
          <span style={{
            fontFamily: 'var(--font-dm-sans), sans-serif',
            fontWeight: 700, color: '#fff', fontSize: '1rem', letterSpacing: '-0.02em',
          }}>
            LX<span style={{ color: '#4ade80' }}>2</span>
          </span>
          <Link
            href={`/events/${id}/leaderboard/tv`}
            style={{
              textDecoration: 'none', color: '#6B8C6B',
              fontSize: '0.8125rem', fontFamily: 'var(--font-dm-sans), sans-serif',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            TV ↗
          </Link>
        </div>
      </header>

      {/* Event sub-header */}
      <div style={{ background: '#0a1f0a', padding: '12px 24px 20px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h1 style={{
            fontFamily: 'var(--font-dm-serif), serif',
            fontWeight: 400,
            fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
            color: '#fff',
            margin: '0 0 4px',
            letterSpacing: '-0.02em',
          }}>
            {event.name}
          </h1>
          <div style={{
            fontSize: '0.8125rem',
            color: '#6B8C6B',
            fontFamily: 'var(--font-dm-sans), sans-serif',
          }}>
            {formatDate(event.date)}
            {'\u00a0\u00b7\u00a0'}
            {FORMAT_LABEL[event.format] ?? event.format}
            {event.courseName ? `${'\u00a0\u00b7\u00a0'}${event.courseName}` : ''}
          </div>
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
    </>
  )
}

// ─── Error page ───────────────────────────────────────────────────────────────

function ErrorPage({ title, body }: { title: string; body: string }) {
  return (
    <div style={{
      minHeight: '100dvh',
      background: '#F2F5F0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: 'var(--font-dm-sans), sans-serif',
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
  )
}
