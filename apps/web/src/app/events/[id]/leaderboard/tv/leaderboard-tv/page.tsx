import { fetchEventLeaderboardData } from '@/lib/leaderboard/fetchEventLeaderboardData'
import TVClient from '../TVClient'

interface PageProps {
  params: Promise<{ id: string }>
}

const FORMAT_LABEL: Record<string, string> = {
  stableford: 'Stableford',
  strokeplay: 'Stroke Play',
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default async function TVPage({ params }: PageProps) {
  const { id } = await params

  const data = await fetchEventLeaderboardData(id)

  if (!data) {
    return (
      <div style={{
        minHeight: '100dvh',
        background: '#0a1f0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6B8C6B',
        fontFamily: 'var(--font-dm-sans), sans-serif',
        fontSize: '1.25rem',
      }}>
        Event not found
      </div>
    )
  }

  const { event, holeData, initialPlayers } = data

  if (event.format === 'matchplay') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: '#0a1f0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6B8C6B',
        fontFamily: 'var(--font-dm-sans), sans-serif',
        fontSize: '1.25rem',
      }}>
        No leaderboard for Match Play events
      </div>
    )
  }

  const subtitle = [
    formatDate(event.date),
    FORMAT_LABEL[event.format] ?? event.format,
    event.courseName,
  ].filter(Boolean).join(' · ')

  return (
    <>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.75); }
        }
        @keyframes tv-row-in {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <TVClient
        eventId={id}
        eventName={event.name}
        subtitle={subtitle}
        format={event.format}
        roundType={event.roundType}
        allowancePct={event.allowancePct}
        holeData={holeData}
        initialPlayers={initialPlayers}
        ntpHoles={event.ntpHoles}
        ldHoles={event.ldHoles}
        playerUrl={`/events/${id}/leaderboard`}
      />
    </>
  )
}
