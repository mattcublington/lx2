import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ManageActions from './ManageActions'

interface PageProps {
  params: Promise<{ id: string }>
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

const FORMAT_LABEL: Record<string, string> = {
  stableford: 'Stableford',
  strokeplay:  'Stroke Play',
  matchplay:   'Match Play',
}

export default async function ManagePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?redirect=/events/${id}/manage`)

  // Fetch event — organiser can always read their own event
  const { data: event } = await supabase
    .from('events')
    .select(`
      id, name, date, format, handicap_allowance_pct,
      group_size, max_players, ntp_holes, ld_holes,
      entry_fee_pence, created_by,
      course_combinations(name)
    `)
    .eq('id', id)
    .single()

  if (!event) {
    return redirect('/play')
  }

  // Only the organiser can access the manage page
  if (event.created_by !== user.id) {
    return redirect(`/events/${id}`)
  }

  // Full player list — organiser can see all via event_players_select RLS
  const { data: players } = await supabase
    .from('event_players')
    .select('id, user_id, display_name, handicap_index, rsvp_status, created_at')
    .eq('event_id', id)
    .order('created_at')

  const confirmed   = players?.filter(p => p.rsvp_status === 'confirmed') ?? []
  const waitlisted  = players?.filter(p => p.rsvp_status === 'waitlisted') ?? []
  const comboName   = (event.course_combinations as unknown as { name: string } | null)?.name ?? null
  const allowancePct = Math.round(Number(event.handicap_allowance_pct) * 100)
  const ntpHoles    = (event.ntp_holes as number[] | null) ?? []
  const ldHoles     = (event.ld_holes  as number[] | null) ?? []
  const feeLabel    = event.entry_fee_pence ? `£${(event.entry_fee_pence / 100).toFixed(2)}` : 'Free'

  // Build the shareable URL. The app URL is always lx2.golf in production.
  // process.env.NEXT_PUBLIC_APP_URL is set in CI and prod; fall back to a relative path label.
  const appUrl   = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://lx2.golf').replace(/\/$/, '')
  const eventUrl = `${appUrl}/events/${id}`

  return (
    <>
      <style>{`
        .player-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 0; border-bottom: 1px solid #f0f4f0;
          font-family: var(--font-dm-sans), sans-serif;
        }
        .player-row:last-child { border-bottom: none; }
        .meta-row {
          display: flex; justify-content: space-between; align-items: baseline;
          padding: 8px 0; border-bottom: 1px solid #f0f4f0;
          font-family: var(--font-dm-sans), sans-serif;
        }
        .meta-row:last-child { border-bottom: none; }
      `}</style>

      {/* ── Header ── */}
      <header style={{ background: '#0a1f0a', padding: '0 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href={`/events/${id}`} style={{ textDecoration: 'none', color: '#6db56d', fontSize: '0.8125rem', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
            ← Event page
          </Link>
          <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 700, color: '#fff', fontSize: '1rem', letterSpacing: '-0.02em' }}>
            LX<span style={{ color: '#4ade80' }}>2</span>
          </span>
          <span style={{ width: 80 }} />
        </div>
      </header>

      {/* ── Body ── */}
      <main style={{ background: '#F2F5F0', minHeight: 'calc(100dvh - 60px)', padding: '32px 32px 80px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Page heading */}
          <div>
            <div style={{ fontSize: '0.8125rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif', marginBottom: 4 }}>
              Managing event
            </div>
            <h1 style={{ fontFamily: 'var(--font-dm-serif), serif', fontWeight: 400, fontSize: 'clamp(1.5rem, 4vw, 2rem)', color: '#1A2E1A', margin: 0, letterSpacing: '-0.02em' }}>
              {event.name}
            </h1>
          </div>

          {/* ── Share card ── */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E0EBE0', padding: '24px' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#6B8C6B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, fontFamily: 'var(--font-dm-sans), sans-serif' }}>
              Invite link
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '0.875rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif', lineHeight: 1.5 }}>
              Share this link with your group. Players tap it to join and confirm their details.
            </p>
            <ManageActions eventUrl={eventUrl} eventName={event.name} />
          </div>

          {/* ── Event details ── */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E0EBE0', padding: '24px' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#6B8C6B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, fontFamily: 'var(--font-dm-sans), sans-serif' }}>
              Event details
            </div>
            {[
              ['Date',        formatDate(event.date)],
              ['Course',      comboName ?? '—'],
              ['Format',      `${FORMAT_LABEL[event.format] ?? event.format} · ${allowancePct}%`],
              ['Group size',  `${event.group_size}-ball`],
              ['Max players', event.max_players ? String(event.max_players) : 'No limit'],
              ['NTP holes',   ntpHoles.length ? ntpHoles.map(h => `H${h}`).join(', ') : 'None'],
              ['LD holes',    ldHoles.length  ? ldHoles.map(h  => `H${h}`).join(', ') : 'None'],
              ['Entry fee',   feeLabel],
            ].map(([k, v]) => (
              <div key={k} className="meta-row">
                <span style={{ fontSize: '0.875rem', color: '#6B8C6B' }}>{k}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1A2E1A' }}>{v}</span>
              </div>
            ))}
          </div>

          {/* ── Players card ── */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E0EBE0', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#6B8C6B', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                Players
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                {confirmed.length}{event.max_players ? ` / ${event.max_players}` : ''} confirmed
              </div>
            </div>

            {confirmed.length === 0 ? (
              <div style={{ fontSize: '0.875rem', color: '#9ca3af', fontFamily: 'var(--font-dm-sans), sans-serif', padding: '8px 0' }}>
                No players yet. Share the invite link above.
              </div>
            ) : (
              confirmed.map((p, i) => (
                <div key={p.id} className="player-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: '50%', background: '#F2F5F0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 700, color: '#6B8C6B',
                    }}>
                      {i + 1}
                    </span>
                    <div>
                      <span style={{ fontSize: '0.9375rem', fontWeight: 500, color: '#1A2E1A' }}>
                        {p.display_name}
                      </span>
                      {p.user_id === event.created_by && (
                        <span style={{ marginLeft: 6, fontSize: '0.75rem', color: '#6B8C6B' }}>organiser</span>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.875rem', color: '#6B8C6B' }}>
                    {Number(p.handicap_index).toFixed(1)} hcp
                  </span>
                </div>
              ))
            )}

            {waitlisted.length > 0 && (
              <>
                <div style={{ marginTop: 16, marginBottom: 8, fontSize: '0.8125rem', fontWeight: 600, color: '#9ca3af', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                  Waitlist ({waitlisted.length})
                </div>
                {waitlisted.map(p => (
                  <div key={p.id} className="player-row" style={{ opacity: 0.6 }}>
                    <span style={{ fontSize: '0.9375rem', color: '#6B8C6B' }}>{p.display_name}</span>
                    <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>{Number(p.handicap_index).toFixed(1)} hcp</span>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* ── Quick links ── */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href={`/events/${id}`} style={{
              padding: '10px 20px', border: '1.5px solid #E0EBE0', borderRadius: 10,
              background: '#fff', fontSize: '0.875rem', fontWeight: 500,
              fontFamily: 'var(--font-dm-sans), sans-serif', color: '#1A2E1A', textDecoration: 'none',
            }}>
              ← Event page
            </Link>
            <Link href={`/events/${id}/score`} style={{
              padding: '10px 20px', border: 'none', borderRadius: 10,
              background: '#0D631B', fontSize: '0.875rem', fontWeight: 600,
              fontFamily: 'var(--font-dm-sans), sans-serif', color: '#fff', textDecoration: 'none',
            }}>
              Start scoring →
            </Link>
          </div>

        </div>
      </main>
    </>
  )
}
