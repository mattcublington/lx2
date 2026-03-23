import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import JoinForm from './JoinForm'

interface PageProps {
  params: Promise<{ id: string }>
}

const FORMAT_LABEL: Record<string, string> = {
  stableford: 'Stableford',
  strokeplay:  'Stroke Play',
  matchplay:   'Match Play',
}

const FORMAT_COLOR: Record<string, string> = {
  stableford: '#0D631B',
  strokeplay:  '#1e4a8a',
  matchplay:   '#92400e',
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default async function EventPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?redirect=/events/${id}`)

  // Load user profile for join form defaults
  const { data: profile } = await supabase
    .from('users')
    .select('display_name, handicap_index')
    .eq('id', user.id)
    .single()

  // Fetch event — readable because is_public = true (events_select RLS)
  const { data: event } = await supabase
    .from('events')
    .select(`
      id, name, date, format, handicap_allowance_pct,
      group_size, max_players, ntp_holes, ld_holes,
      entry_fee_pence, created_by, combination_id,
      course_combinations(name)
    `)
    .eq('id', id)
    .single()

  if (!event) {
    return (
      <ErrorCard
        title="Event not found"
        body="This event doesn&apos;t exist or is no longer available."
        back="/play"
      />
    )
  }

  const comboName = (event.course_combinations as unknown as { name: string } | null)?.name ?? null

  // Check if current user is already in this event
  // After joining: RLS allows them to see their own event_player row.
  // Before joining: RLS returns nothing → null = not yet joined.
  const { data: myPlayer } = await supabase
    .from('event_players')
    .select('id, scorecards(id)')
    .eq('event_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  const isOrganiser = event.created_by === user.id
  const isJoined    = !!myPlayer
  const myScorecards = myPlayer?.scorecards as unknown as { id: string }[] | null
  const myScorecardId = (myScorecards ?? [])[0]?.id ?? null

  // Player list — admin for full visibility (regular RLS hides list before join)
  const { data: players } = await admin
    .from('event_players')
    .select('id, user_id, display_name, handicap_index, rsvp_status')
    .eq('event_id', id)
    .eq('rsvp_status', 'confirmed')
    .order('created_at')

  const playerCount    = players?.length ?? 0
  const allowancePct   = Math.round(Number(event.handicap_allowance_pct) * 100)
  const entryFeeLabel  = event.entry_fee_pence
    ? `£${(event.entry_fee_pence / 100).toFixed(2)}`
    : 'Free'
  const ntpHoles  = (event.ntp_holes as number[] | null) ?? []
  const ldHoles   = (event.ld_holes  as number[] | null) ?? []

  return (
    <>
      <style>{`
        .ep-tag {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 10px; border-radius: 9999px; font-size: 0.75rem;
          font-weight: 600; font-family: var(--font-dm-sans), sans-serif;
        }
        .player-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 0; border-bottom: 1px solid #f0f4f0;
          font-family: var(--font-dm-sans), sans-serif;
        }
        .player-row:last-child { border-bottom: none; }
      `}</style>

      {/* ── Header ── */}
      <header style={{ background: '#0a1f0a', padding: '0 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/play" style={{ textDecoration: 'none', color: '#6db56d', fontSize: '0.8125rem', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
            ← Back
          </Link>
          <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 700, color: '#fff', fontSize: '1rem', letterSpacing: '-0.02em' }}>
            LX<span style={{ color: '#4ade80' }}>2</span>
          </span>
          <span style={{ width: 48 }} />
        </div>
      </header>

      {/* ── Body ── */}
      <main style={{ background: '#F2F5F0', minHeight: 'calc(100dvh - 60px)', padding: '32px 32px 80px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Event card ── */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E0EBE0', padding: '28px' }}>
            {/* Format badge */}
            <div style={{ marginBottom: 12 }}>
              <span
                className="ep-tag"
                style={{ background: `${FORMAT_COLOR[event.format] ?? '#0D631B'}18`, color: FORMAT_COLOR[event.format] ?? '#0D631B' }}
              >
                {FORMAT_LABEL[event.format] ?? event.format} &middot; {allowancePct}%
              </span>
            </div>

            {/* Name */}
            <h1 style={{ fontFamily: 'var(--font-dm-serif), serif', fontWeight: 400, fontSize: 'clamp(1.5rem, 4vw, 2rem)', color: '#1A2E1A', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              {event.name}
            </h1>

            {/* Meta */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
              <div style={{ fontSize: '0.875rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                📅 {formatDate(event.date)}
              </div>
              {comboName && (
                <div style={{ fontSize: '0.875rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                  ⛳ {comboName}
                </div>
              )}
              <div style={{ fontSize: '0.875rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                👥 {playerCount}{event.max_players ? ` / ${event.max_players}` : ''} player{playerCount !== 1 ? 's' : ''} confirmed
                &nbsp;&middot;&nbsp;{event.group_size}-ball groups
              </div>
              {event.entry_fee_pence ? (
                <div style={{ fontSize: '0.875rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                  💰 Entry fee: {entryFeeLabel}
                </div>
              ) : null}
              {(ntpHoles.length > 0 || ldHoles.length > 0) && (
                <div style={{ fontSize: '0.875rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                  {ntpHoles.length > 0 && `🎯 NTP: ${ntpHoles.map(h => `H${h}`).join(', ')}`}
                  {ntpHoles.length > 0 && ldHoles.length > 0 && '  '}
                  {ldHoles.length > 0 && `🏌️ LD: ${ldHoles.map(h => `H${h}`).join(', ')}`}
                </div>
              )}
            </div>

            <div style={{ height: 1, background: '#E0EBE0', marginBottom: 20 }} />

            {/* CTA */}
            {isJoined && myScorecardId ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#E8F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#0D631B', fontWeight: 700 }}>✓</span>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 500, color: '#1A2E1A' }}>
                    You&apos;re confirmed for this event
                  </span>
                </div>
                <Link
                  href={`/rounds/${myScorecardId}/score`}
                  style={{
                    display: 'block', textAlign: 'center',
                    padding: '14px 0', background: '#0D631B', color: '#fff',
                    borderRadius: 12, fontSize: '1rem', fontWeight: 600,
                    fontFamily: 'var(--font-dm-sans), sans-serif', textDecoration: 'none',
                    transition: 'background 0.15s',
                  }}
                >
                  Go to my scorecard →
                </Link>
              </div>
            ) : isJoined ? (
              <Link
                href={`/events/${id}/score`}
                style={{
                  display: 'block', textAlign: 'center',
                  padding: '14px 0', background: '#0D631B', color: '#fff',
                  borderRadius: 12, fontSize: '1rem', fontWeight: 600,
                  fontFamily: 'var(--font-dm-sans), sans-serif', textDecoration: 'none',
                }}
              >
                Go to my scorecard →
              </Link>
            ) : (
              <JoinForm
                eventId={id}
                defaultName={profile?.display_name ?? user.email?.split('@')[0] ?? ''}
                defaultHandicap={typeof profile?.handicap_index === 'number' ? profile.handicap_index : null}
              />
            )}

            {/* Manage link for organiser */}
            {isOrganiser && (
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <Link
                  href={`/events/${id}/manage`}
                  style={{ fontSize: '0.875rem', color: '#0D631B', fontWeight: 500, fontFamily: 'var(--font-dm-sans), sans-serif', textDecoration: 'none' }}
                >
                  ⚙ Manage event →
                </Link>
              </div>
            )}
          </div>

          {/* ── Players card ── */}
          {playerCount > 0 && (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E0EBE0', padding: '20px 24px' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#6B8C6B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                Players confirmed
              </div>
              {players?.map((p, i) => (
                <div key={p.id} className="player-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: '50%', background: '#F2F5F0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 700, color: '#6B8C6B',
                    }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize: '0.9375rem', fontWeight: 500, color: '#1A2E1A' }}>
                      {p.display_name}
                      {p.user_id === event.created_by && (
                        <span style={{ marginLeft: 6, fontSize: '0.75rem', color: '#6B8C6B', fontWeight: 400 }}>(org)</span>
                      )}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.875rem', color: '#6B8C6B' }}>
                    {Number(p.handicap_index).toFixed(1)} hcp
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}

// ── Error card ──────────────────────────────────────────────────────────────────

function ErrorCard({ title, body, back }: { title: string; body: string; back: string }) {
  return (
    <div style={{ minHeight: '100dvh', background: '#F2F5F0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--font-dm-sans), sans-serif' }}>
      <div style={{ maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1A2E1A', marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: '0.875rem', color: '#6B8C6B', lineHeight: 1.6, marginBottom: 20 }}>
          {body}
        </div>
        <Link href={back} style={{ color: '#0D631B', fontWeight: 600, textDecoration: 'none', fontSize: '0.875rem' }}>
          ← Go back
        </Link>
      </div>
    </div>
  )
}
