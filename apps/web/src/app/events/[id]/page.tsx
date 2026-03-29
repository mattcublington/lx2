import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import JoinForm from './JoinForm'
import RealtimeRefresher from './RealtimeRefresher'
import BottomNav from '@/components/BottomNav'

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

  // ── Always use admin client for data fetches ──────────────────────────────
  // This works for both authenticated and anonymous visitors.
  // We do NOT rely on regular client + RLS for the event page because:
  //  - Anon visitors don't have a session → regular client would hit RLS
  //  - Admin client is server-only and safe here
  const admin = createAdminClient()

  // ── Determine auth state ──────────────────────────────────────────────────
  // May be null for anonymous (unauthenticated) visitors.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // ── Load event ────────────────────────────────────────────────────────────
  const { data: event } = await admin
    .from('events')
    .select(`
      id, name, date, format, handicap_allowance_pct,
      group_size, max_players, ntp_holes, ld_holes,
      entry_fee_pence, created_by, combination_id, is_public,
      course_combinations(name)
    `)
    .eq('id', id)
    .single()

  if (!event) {
    return (
      <ErrorCard
        title="Event not found"
        body="This event doesn't exist or is no longer available."
        back="/play"
      />
    )
  }

  // Private events require login
  if (!event.is_public && !user) {
    redirect(`/auth/login?redirect=/events/${id}`)
  }

  // ── User profile (authenticated only) ────────────────────────────────────
  const { data: profile } = user
    ? await supabase
        .from('users')
        .select('display_name, handicap_index')
        .eq('id', user.id)
        .single()
    : { data: null }

  // ── "Am I already in this event?" ────────────────────────────────────────
  // Authenticated: match by user_id.
  // Anonymous:     match by join_token cookie (set by joinEventAnon action).
  let isJoined      = false
  let myScorecardId: string | null = null

  if (user) {
    const { data: myPlayer } = await admin
      .from('event_players')
      .select('id, scorecards(id)')
      .eq('event_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (myPlayer) {
      isJoined = true
      const scs = myPlayer.scorecards as unknown as { id: string }[] | null
      myScorecardId = (scs ?? [])[0]?.id ?? null
    }
  } else {
    const cookieStore = await cookies()
    const joinToken   = cookieStore.get(`ep_token_${id}`)?.value

    if (joinToken) {
      const { data: anonPlayer } = await admin
        .from('event_players')
        .select('id, scorecards(id)')
        .eq('event_id', id)
        .eq('join_token', joinToken)
        .maybeSingle()

      if (anonPlayer) {
        isJoined = true
        const scs = anonPlayer.scorecards as unknown as { id: string }[] | null
        myScorecardId = (scs ?? [])[0]?.id ?? null
      }
    }
  }

  const isOrganiser = user?.id === event.created_by

  // ── Full player list (admin — shows all regardless of auth state) ─────────
  const { data: players } = await admin
    .from('event_players')
    .select('id, user_id, display_name, handicap_index, rsvp_status')
    .eq('event_id', id)
    .eq('rsvp_status', 'confirmed')
    .order('created_at')

  const playerCount   = players?.length ?? 0
  const allowancePct  = Math.round(Number(event.handicap_allowance_pct) * 100)
  const entryFeeLabel = event.entry_fee_pence
    ? `£${(event.entry_fee_pence / 100).toFixed(2)}`
    : 'Free'
  const ntpHoles = (event.ntp_holes as number[] | null) ?? []
  const ldHoles  = (event.ld_holes  as number[] | null) ?? []
  const comboName = (event.course_combinations as unknown as { name: string } | null)?.name ?? null

  const defaultName = profile?.display_name
    ?? user?.email?.split('@')[0]
    ?? ''
  const defaultHandicap = typeof profile?.handicap_index === 'number'
    ? profile.handicap_index
    : null

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
        @keyframes ep-in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ep-card {
          animation: ep-in 0.35s ease both;
        }
        .ep-card:nth-child(2) { animation-delay: 0.06s; }
        .ep-card:nth-child(3) { animation-delay: 0.12s; }
      `}</style>

      {/* ── Header ── */}
      <header style={{ background: '#0a1f0a', padding: '0 32px' }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', height: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Link
            href="/play"
            style={{ textDecoration: 'none', color: '#6B8C6B', fontSize: '0.8125rem', fontFamily: 'var(--font-dm-sans), sans-serif' }}
          >
            ← Back
          </Link>
          <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 700, color: '#fff', fontSize: '1rem', letterSpacing: '-0.02em' }}>
            LX<span style={{ color: '#4ade80' }}>2</span>
          </span>
          {user ? (
            <Link
              href="/play"
              style={{ fontSize: '0.8125rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif', textDecoration: 'none' }}
            >
              My rounds
            </Link>
          ) : (
            <Link
              href={`/auth/login?redirect=/events/${id}`}
              style={{ fontSize: '0.8125rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif', textDecoration: 'none' }}
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <main style={{ background: '#F2F5F0', minHeight: 'calc(100dvh - 60px)', padding: '32px 32px max(100px, calc(80px + env(safe-area-inset-bottom)))' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Event card ── */}
          <div className="ep-card" style={{ background: '#fff', borderRadius: 16, border: '1px solid #E0EBE0', padding: '28px' }}>

            {/* Format badge */}
            <div style={{ marginBottom: 12 }}>
              <span
                className="ep-tag"
                style={{
                  background: `${FORMAT_COLOR[event.format] ?? '#0D631B'}18`,
                  color: FORMAT_COLOR[event.format] ?? '#0D631B',
                }}
              >
                {FORMAT_LABEL[event.format] ?? event.format} &middot; {allowancePct}%
              </span>
            </div>

            {/* Event name */}
            <h1 style={{
              fontFamily: 'var(--font-dm-serif), serif',
              fontWeight: 400,
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              color: '#1A2E1A',
              margin: '0 0 8px',
              letterSpacing: '-0.02em',
            }}>
              {event.name}
            </h1>

            {/* Meta rows */}
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

            {/* ── CTA section ── */}
            {isJoined && myScorecardId ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%', background: '#E8F5EE',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', color: '#0D631B', fontWeight: 700,
                  }}>
                    ✓
                  </span>
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
              // Joined but no scorecard yet (edge case — scorecard is created on join)
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
                userId={user?.id ?? null}
                defaultName={defaultName}
                defaultHandicap={defaultHandicap}
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

            {/* Leaderboard link — Stableford and Stroke Play only */}
            {event.format !== 'matchplay' && (
              <div style={{ marginTop: isOrganiser ? 8 : 16, textAlign: 'center' }}>
                <Link
                  href={`/events/${id}/leaderboard`}
                  style={{ fontSize: '0.875rem', color: '#0D631B', fontWeight: 500, fontFamily: 'var(--font-dm-sans), sans-serif', textDecoration: 'none' }}
                >
                  📊 Live Leaderboard →
                </Link>
              </div>
            )}
          </div>

          {/* ── Players card ── */}
          {playerCount > 0 && (
            <div className="ep-card" style={{ background: '#fff', borderRadius: 16, border: '1px solid #E0EBE0', padding: '20px 24px' }}>
              <div style={{
                fontSize: '0.8125rem', fontWeight: 600, color: '#6B8C6B',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12,
                fontFamily: 'var(--font-dm-sans), sans-serif',
              }}>
                Players confirmed ({playerCount}{event.max_players ? ` / ${event.max_players}` : ''})
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
                        <span style={{ marginLeft: 6, fontSize: '0.75rem', color: '#6B8C6B', fontWeight: 400 }}>
                          (org)
                        </span>
                      )}
                      {!p.user_id && (
                        <span style={{ marginLeft: 6, fontSize: '0.75rem', color: '#9ca3af', fontWeight: 400 }}>
                          guest
                        </span>
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

          {/* ── Sign-in nudge for anonymous visitors ── */}
          {!user && !isJoined && (
            <div className="ep-card" style={{
              background: '#fff', borderRadius: 14, border: '1px solid #E0EBE0',
              padding: '16px 20px', display: 'flex', alignItems: 'center',
              gap: 12, fontFamily: 'var(--font-dm-sans), sans-serif',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1A2E1A', marginBottom: 2 }}>
                  Have an LX2 account?
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#6B8C6B' }}>
                  Sign in to auto-fill your name and handicap.
                </div>
              </div>
              <Link
                href={`/auth/login?redirect=/events/${id}`}
                style={{
                  padding: '9px 16px', background: '#F2F5F0', border: '1.5px solid #E0EBE0',
                  borderRadius: 10, fontSize: '0.875rem', fontWeight: 600, color: '#1A2E1A',
                  textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                Sign in
              </Link>
            </div>
          )}

        </div>
      </main>

      {/* Subscribes to Supabase Realtime — triggers router.refresh() on player list changes */}
      <RealtimeRefresher eventId={id} />

      <BottomNav active="events" />
    </>
  )
}

// ── Error card ───────────────────────────────────────────────────────────────

function ErrorCard({ title, body, back }: { title: string; body: string; back: string }) {
  return (
    <div style={{
      minHeight: '100dvh', background: '#F2F5F0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: 'var(--font-dm-sans), sans-serif',
    }}>
      <div style={{ maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1A2E1A', marginBottom: 8 }}>
          {title}
        </div>
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
