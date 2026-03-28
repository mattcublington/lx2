import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import ManageActions, { ConfirmPlayers, FinaliseButton, DeleteEventButton } from './ManageActions'
import GroupManager from './GroupManager'

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
      entry_fee_pence, created_by, finalised,
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
    .select('id, user_id, display_name, handicap_index, rsvp_status, flight_number, created_at')
    .eq('event_id', id)
    .order('created_at')

  // Groups for this event
  const { data: groups } = await supabase
    .from('event_groups')
    .select('id, flight_number, tee_time, start_hole, label')
    .eq('event_id', id)
    .order('flight_number')

  const confirmed   = players?.filter(p => p.rsvp_status === 'confirmed') ?? []
  const invited     = players?.filter(p => p.rsvp_status === 'invited') ?? []
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
        .mg { min-height: 100dvh; background: #F2F5F0; }

        /* ── Header ── */
        .mg-hd {
          background: #0a1f0a; padding: 0 24px; position: sticky; top: 0; z-index: 50;
        }
        .mg-hd-inner {
          max-width: 640px; margin: 0 auto; height: 56px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .mg-hd-back {
          text-decoration: none; color: #6B8C6B;
          font-size: 0.8125rem; font-family: var(--font-dm-sans), sans-serif;
          transition: color 0.15s;
        }
        .mg-hd-back:hover { color: #4ade80; }

        /* ── Body ── */
        .mg-body { padding: 24px 24px 80px; }
        .mg-inner {
          max-width: 640px; margin: 0 auto;
          display: flex; flex-direction: column; gap: 14px;
        }

        /* ── Page heading ── */
        .mg-eyebrow {
          font-size: 0.75rem; font-weight: 600; color: #6B8C6B;
          text-transform: uppercase; letter-spacing: 0.06em;
          font-family: var(--font-dm-sans), sans-serif; margin-bottom: 2px;
        }
        .mg-title {
          font-family: var(--font-dm-serif), serif; font-weight: 400;
          font-size: clamp(1.375rem, 4vw, 1.75rem); color: #1A2E1A;
          margin: 0; letter-spacing: -0.02em; line-height: 1.2;
        }

        /* ── Card ── */
        .mg-card {
          background: #fff; border-radius: 14px; border: 1px solid #E0EBE0;
          padding: 20px; box-shadow: 0 2px 8px rgba(26,28,28,0.03);
        }
        .mg-card-label {
          font-size: 0.6875rem; font-weight: 700; color: #6B8C6B;
          text-transform: uppercase; letter-spacing: 0.06em;
          font-family: var(--font-dm-sans), sans-serif; margin-bottom: 10px;
        }
        .mg-card-desc {
          margin: 0 0 14px; font-size: 0.8125rem; color: #6B8C6B;
          font-family: var(--font-dm-sans), sans-serif; line-height: 1.5;
        }

        /* ── Meta rows ── */
        .mg-meta-row {
          display: flex; justify-content: space-between; align-items: baseline;
          padding: 7px 0; border-bottom: 1px solid #f0f4f0;
          font-family: var(--font-dm-sans), sans-serif;
        }
        .mg-meta-row:last-child { border-bottom: none; }
        .mg-meta-key { font-size: 0.8125rem; color: #6B8C6B; }
        .mg-meta-val { font-size: 0.8125rem; font-weight: 500; color: #1A2E1A; }

        /* ── Player rows ── */
        .mg-player-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 9px 0; border-bottom: 1px solid #f0f4f0;
          font-family: var(--font-dm-sans), sans-serif;
        }
        .mg-player-row:last-child { border-bottom: none; }
        .mg-player-num {
          width: 26px; height: 26px; border-radius: 50%; background: #F2F5F0;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.6875rem; font-weight: 700; color: #6B8C6B; flex-shrink: 0;
        }
        .mg-player-name {
          font-size: 0.875rem; font-weight: 500; color: #1A2E1A;
        }
        .mg-player-tag {
          margin-left: 6px; font-size: 0.6875rem; color: #6B8C6B;
          font-weight: 400;
        }
        .mg-player-hcp {
          font-size: 0.8125rem; color: #6B8C6B; flex-shrink: 0;
        }

        /* ── Quick links ── */
        .mg-links {
          display: flex; gap: 8px; flex-wrap: wrap;
        }
        .mg-link {
          padding: 9px 18px; border: 1.5px solid #E0EBE0; border-radius: 10px;
          background: #fff; font-size: 0.8125rem; font-weight: 500;
          font-family: var(--font-dm-sans), sans-serif; color: #1A2E1A;
          text-decoration: none; transition: border-color 0.15s, background 0.15s;
        }
        .mg-link:hover { border-color: #0D631B; background: rgba(13,99,27,0.03); }
        .mg-link.primary {
          border: none; background: #0D631B; color: #fff; font-weight: 600;
        }
        .mg-link.primary:hover { background: #0a4f15; }

        /* ── Danger zone ── */
        .mg-danger {
          margin-top: 16px; padding-top: 16px;
          border-top: 1px solid #f0f4f0;
        }
        .mg-danger-label {
          font-size: 0.6875rem; font-weight: 700; color: #9ca3af;
          text-transform: uppercase; letter-spacing: 0.06em;
          font-family: var(--font-dm-sans), sans-serif; margin-bottom: 8px;
        }

        /* ── Animations ── */
        .mg-inner > * {
          animation: mg-rise 0.4s cubic-bezier(0.2, 0, 0, 1) both;
        }
        .mg-inner > :nth-child(1) { animation-delay: 0s; }
        .mg-inner > :nth-child(2) { animation-delay: 0.04s; }
        .mg-inner > :nth-child(3) { animation-delay: 0.08s; }
        .mg-inner > :nth-child(4) { animation-delay: 0.12s; }
        .mg-inner > :nth-child(5) { animation-delay: 0.16s; }
        .mg-inner > :nth-child(6) { animation-delay: 0.20s; }
        .mg-inner > :nth-child(7) { animation-delay: 0.24s; }
        .mg-inner > :nth-child(8) { animation-delay: 0.28s; }
        .mg-inner > :nth-child(9) { animation-delay: 0.32s; }
        .mg-inner > :nth-child(10) { animation-delay: 0.36s; }
        @keyframes mg-rise {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="mg">

        {/* ── Header ── */}
        <header className="mg-hd">
          <div className="mg-hd-inner">
            <Link href={`/events/${id}`} className="mg-hd-back">← Event page</Link>
            <Image src="/lx2-logo.svg" alt="LX2" width={60} height={30} priority />
            <span style={{ width: 72 }} />
          </div>
        </header>

        {/* ── Body ── */}
        <main className="mg-body">
          <div className="mg-inner">

            {/* Page heading */}
            <div>
              <div className="mg-eyebrow">Managing event</div>
              <h1 className="mg-title">{event.name}</h1>
            </div>

            {/* ── Share card ── */}
            <div className="mg-card">
              <div className="mg-card-label">Invite link</div>
              <p className="mg-card-desc">
                Share this link with your group. Players tap it to join and confirm their details.
              </p>
              <ManageActions eventUrl={eventUrl} eventName={event.name} />
            </div>

            {/* ── Event details ── */}
            <div className="mg-card">
              <div className="mg-card-label">Event details</div>
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
                <div key={k} className="mg-meta-row">
                  <span className="mg-meta-key">{k}</span>
                  <span className="mg-meta-val">{v}</span>
                </div>
              ))}
            </div>

            {/* ── Groups ── */}
            <GroupManager
              eventId={id}
              groups={(groups ?? []).map(g => ({
                id: g.id,
                flight_number: g.flight_number as number,
                tee_time: (g.tee_time as string | null) ?? null,
                start_hole: (g.start_hole as number) ?? 1,
                label: (g.label as string | null) ?? null,
              }))}
              players={confirmed.map(p => ({
                id: p.id,
                display_name: p.display_name,
                handicap_index: Number(p.handicap_index),
                flight_number: (p.flight_number as number | null) ?? null,
              }))}
              groupSize={event.group_size ?? 4}
            />

            {/* ── Players card ── */}
            <div className="mg-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div className="mg-card-label" style={{ marginBottom: 0 }}>Players</div>
                <span style={{ fontSize: '0.75rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                  {confirmed.length}{event.max_players ? ` / ${event.max_players}` : ''} confirmed
                </span>
              </div>

              {confirmed.length === 0 ? (
                <div style={{ fontSize: '0.8125rem', color: '#9ca3af', fontFamily: 'var(--font-dm-sans), sans-serif', padding: '6px 0' }}>
                  No players yet. Share the invite link above.
                </div>
              ) : (
                confirmed.map((p, i) => (
                  <div key={p.id} className="mg-player-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="mg-player-num">{i + 1}</span>
                      <div>
                        <span className="mg-player-name">{p.display_name}</span>
                        {p.user_id === event.created_by && (
                          <span className="mg-player-tag">organiser</span>
                        )}
                      </div>
                    </div>
                    <span className="mg-player-hcp">{Number(p.handicap_index).toFixed(1)} hcp</span>
                  </div>
                ))
              )}

              {waitlisted.length > 0 && (
                <>
                  <div style={{ marginTop: 14, marginBottom: 6, fontSize: '0.6875rem', fontWeight: 700, color: '#9ca3af', fontFamily: 'var(--font-dm-sans), sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Waitlist ({waitlisted.length})
                  </div>
                  {waitlisted.map(p => (
                    <div key={p.id} className="mg-player-row" style={{ opacity: 0.6 }}>
                      <span className="mg-player-name">{p.display_name}</span>
                      <span className="mg-player-hcp">{Number(p.handicap_index).toFixed(1)} hcp</span>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* ── Invited / awaiting confirmation ── */}
            {invited.length > 0 && (
              <ConfirmPlayers
                eventId={id}
                players={invited.map(p => ({
                  id: p.id,
                  displayName: p.display_name,
                  handicapIndex: Number(p.handicap_index),
                }))}
              />
            )}

            {/* ── Finalise ── */}
            <FinaliseButton eventId={id} finalised={!!event.finalised} />

            {/* ── Quick links ── */}
            <div className="mg-links">
              <Link href={`/events/${id}`} className="mg-link">← Event page</Link>
              <Link href={`/events/${id}/leaderboard`} className="mg-link primary">Leaderboard →</Link>
            </div>

            {/* ── Danger zone ── */}
            <div className="mg-danger">
              <div className="mg-danger-label">Danger zone</div>
              <DeleteEventButton eventId={id} eventName={event.name} />
            </div>

          </div>
        </main>

      </div>
    </>
  )
}
