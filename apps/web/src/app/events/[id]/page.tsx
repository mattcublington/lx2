import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

interface Props {
  params: Promise<{ id: string }>
}

const FORMAT_LABELS: Record<string, string> = {
  stableford: 'Stableford',
  strokeplay: 'Stroke play',
  matchplay: 'Match play',
}

export default async function EventPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select(`*, courses(name, location, par, slope_rating)`)
    .eq('id', id)
    .single()

  if (!event) notFound()

  const { data: players } = await supabase
    .from('event_players')
    .select('id, display_name, handicap_index, rsvp_status')
    .eq('event_id', id)
    .eq('rsvp_status', 'confirmed')
    .order('created_at')

  const course = event.courses as { name: string; location: string; par: number; slope_rating: number } | null
  const confirmed = players?.length ?? 0
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 20px', fontFamily: 'system-ui, sans-serif', color: '#111', minHeight: '100vh', background: '#FAFBF8' }}>
      {/* Header */}
      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, marginBottom: 24 }}>
        LX<span style={{ color: '#1D9E75' }}>2</span>
      </div>

      {/* Event card */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '20px', border: '0.5px solid rgba(0,0,0,0.08)', marginBottom: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3, marginBottom: 4 }}>{event.name}</div>
        <div style={{ fontSize: 15, color: '#6b7280', marginBottom: 16 }}>{formatDate(event.date)}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {course && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16 }}>⛳</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{course.name}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>{course.location}</div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 16 }}>🏌️</span>
            <div style={{ fontSize: 14 }}>{FORMAT_LABELS[event.format] ?? event.format} · {Math.round(event.handicap_allowance_pct * 100)}% handicap</div>
          </div>
          {event.entry_fee_pence && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 16 }}>💳</span>
              <div style={{ fontSize: 14 }}>£{(event.entry_fee_pence / 100).toFixed(2)} entry fee</div>
            </div>
          )}
          {(event.ntp_holes?.length > 0 || event.ld_holes?.length > 0) && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 16 }}>🎯</span>
              <div style={{ fontSize: 14 }}>
                {event.ntp_holes?.length > 0 && `NTP: holes ${event.ntp_holes.join(', ')}`}
                {event.ntp_holes?.length > 0 && event.ld_holes?.length > 0 && ' · '}
                {event.ld_holes?.length > 0 && `LD: holes ${event.ld_holes.join(', ')}`}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 16 }}>👥</span>
            <div style={{ fontSize: 14 }}>{confirmed} player{confirmed !== 1 ? 's' : ''} confirmed</div>
          </div>
        </div>
      </div>

      {/* Players */}
      {confirmed > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, padding: '16px 20px', border: '0.5px solid rgba(0,0,0,0.08)', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Players</div>
          {players?.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid #f3f4f6' }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{p.display_name}</div>
              <div style={{ fontSize: 13, color: '#9ca3af' }}>HC {p.handicap_index}</div>
            </div>
          ))}
        </div>
      )}

      {/* CTAs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Link href={`/events/${id}/score`}
          style={{ display: 'block', padding: '14px 0', background: '#1D9E75', color: '#fff', borderRadius: 12, fontSize: 15, fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>
          Start scoring
        </Link>
        <Link href={`/events/${id}/leaderboard`}
          style={{ display: 'block', padding: '14px 0', background: 'transparent', border: '1.5px solid #1D9E75', color: '#1D9E75', borderRadius: 12, fontSize: 15, fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>
          View leaderboard
        </Link>
        <button
          onClick={() => navigator.share?.({ title: event.name, url: window.location.href }) ?? navigator.clipboard?.writeText(window.location.href)}
          style={{ padding: '14px 0', background: 'transparent', border: '1.5px solid #d1d5db', borderRadius: 12, fontSize: 15, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
          Share invite link
        </button>
      </div>
    </div>
  )
}
