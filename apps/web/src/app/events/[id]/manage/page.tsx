import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ManageActions, { ConfirmPlayers, FinaliseButton, DeleteEventButton } from './ManageActions'
import GroupManager from './GroupManager'
import PredictionsToggle from './PredictionsToggle'
import BottomNav from '@/components/BottomNav'

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
      tournament_id, round_number,
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

  // Tournament context — if this event is part of a multi-round tournament
  let tournamentName = ''
  let tournamentId = ''
  let roundCount = 0
  if (event.tournament_id) {
    tournamentId = event.tournament_id as string
    const { data: tourn } = await supabase
      .from('tournaments')
      .select('name')
      .eq('id', tournamentId)
      .single()
    tournamentName = tourn?.name ?? ''

    const { count } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId)
    roundCount = count ?? 0
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

  // Predictions config
  const admin = createAdminClient()
  const { data: predConfig } = await admin
    .from('prediction_configs')
    .select('enabled, starting_credits')
    .eq('event_id', id)
    .single()

  const { count: marketsCount } = await admin
    .from('prediction_markets')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', id)

  // Build the shareable URL. The app URL is always lx2.golf in production.
  // process.env.NEXT_PUBLIC_APP_URL is set in CI and prod; fall back to a relative path label.
  const appUrl   = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://lx2.golf').replace(/\/$/, '')
  const eventUrl = `${appUrl}/events/${id}`

  return (
    <>
      <style>{`
        .mg {
          min-height: 100dvh; background: #F2F5F0;
          font-family: var(--font-dm-sans), system-ui, sans-serif;
          color: #1A2E1A;
          padding-bottom: max(80px, calc(80px + env(safe-area-inset-bottom)));
        }

        /* ── Hero ── */
        .mg-hero {
          position: relative; width: 100%; height: 160px; overflow: hidden;
        }
        .mg-hero-img { object-fit: cover; }
        .mg-hero-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to bottom, rgba(10,31,10,0.45) 0%, rgba(10,31,10,0.75) 100%);
          z-index: 1;
        }
        .mg-hero-inner {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 1.25rem 2rem; z-index: 2;
          max-width: 1200px; margin: 0 auto;
        }
        .mg-hero-back {
          display: inline-flex; align-items: center; gap: 6px;
          color: rgba(255,255,255,0.7); text-decoration: none;
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.875rem; font-weight: 500;
          padding: 6px 10px; border-radius: 8px;
          transition: background 0.15s, color 0.15s;
          margin-bottom: 8px;
        }
        .mg-hero-back:hover { background: rgba(255,255,255,0.15); color: #fff; }
        .mg-hero-eyebrow {
          font-size: 0.75rem; font-weight: 600; color: rgba(255,255,255,0.65);
          text-transform: uppercase; letter-spacing: 0.06em;
          font-family: var(--font-dm-sans), sans-serif; margin-bottom: 4px;
        }
        .mg-hero-title {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 800;
          font-size: clamp(1.4rem, 4vw, 2rem);
          color: #fff; margin: 0;
          letter-spacing: -0.02em;
          text-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .mg-hero-subtitle {
          font-size: 0.8125rem; color: rgba(255,255,255,0.6);
          font-family: var(--font-dm-sans), sans-serif;
          margin-top: 4px;
          text-shadow: 0 1px 4px rgba(0,0,0,0.2);
        }
        @media (min-width: 768px) { .mg-hero { height: 180px; } }

        /* ── Tournament context banner ── */
        .mg-tournament-ctx {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; padding: 14px 18px; border-radius: 14px;
          background: linear-gradient(135deg, rgba(13,99,27,0.06) 0%, rgba(13,99,27,0.02) 100%);
          border: 1.5px solid rgba(13,99,27,0.15);
        }
        .mg-tournament-ctx-info {
          display: flex; flex-direction: column; gap: 2px;
        }
        .mg-tournament-ctx-label {
          font-size: 0.6875rem; font-weight: 700; color: #6B8C6B;
          text-transform: uppercase; letter-spacing: 0.06em;
          font-family: var(--font-dm-sans), sans-serif;
        }
        .mg-tournament-ctx-name {
          font-family: var(--font-dm-serif), serif;
          font-size: 0.9375rem; color: #1A2E1A;
        }
        .mg-tournament-ctx-link {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 16px; border: 1.5px solid #0D631B; border-radius: 10px;
          background: #fff; color: #0D631B;
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.8125rem; font-weight: 600; text-decoration: none;
          white-space: nowrap;
          transition: background 0.15s, transform 0.15s;
        }
        .mg-tournament-ctx-link:hover {
          background: rgba(13,99,27,0.04);
          transform: translateY(-1px);
        }

        /* ── Body ── */
        .mg-body { padding: 1.5rem 2rem; }
        .mg-inner {
          max-width: 1200px; margin: 0 auto;
          display: flex; flex-direction: column; gap: 1rem;
        }

        /* ── Two-column grid ── */
        .mg-grid {
          display: grid; gap: 1rem;
          grid-template-columns: 1fr;
        }
        @media (min-width: 768px) {
          .mg-grid { grid-template-columns: 1fr 1fr; }
          .mg-grid-full { grid-column: 1 / -1; }
        }

        /* (Page heading is now in the hero) */

        /* ── Card ── */
        .mg-card {
          background: #fff; border-radius: 16px; border: 1px solid #E0EBE0;
          padding: 1.25rem; box-shadow: 0 4px 12px rgba(26,28,28,0.04);
          transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        }
        .mg-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(26,28,28,0.08);
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
          padding: 8px 0; border-bottom: 1px solid rgba(26,28,28,0.06);
          font-family: var(--font-dm-sans), sans-serif;
        }
        .mg-meta-row:last-child { border-bottom: none; }
        .mg-meta-key { font-size: 0.8125rem; color: #6B8C6B; }
        .mg-meta-val { font-size: 0.8125rem; font-weight: 500; color: #1A2E1A; }

        /* ── Player rows ── */
        .mg-player-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 9px 0; border-bottom: 1px solid rgba(26,28,28,0.06);
          font-family: var(--font-dm-sans), sans-serif;
        }
        .mg-player-row:last-child { border-bottom: none; }
        .mg-player-num {
          width: 28px; height: 28px; border-radius: 50%;
          background: linear-gradient(135deg, rgba(13,99,27,0.1) 0%, rgba(61,107,26,0.1) 100%);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.6875rem; font-weight: 700; color: #0D631B; flex-shrink: 0;
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
          display: flex; gap: 10px; flex-wrap: wrap;
        }
        .mg-link {
          padding: 0.75rem 1.25rem; border: 1.5px solid #E0EBE0; border-radius: 12px;
          background: #fff; font-size: 0.875rem; font-weight: 500;
          font-family: var(--font-dm-sans), sans-serif; color: #1A2E1A;
          text-decoration: none;
          box-shadow: 0 2px 6px rgba(26,28,28,0.03);
          transition: border-color 0.15s, background 0.15s, transform 0.15s, box-shadow 0.15s;
        }
        .mg-link:hover {
          border-color: #0D631B; background: rgba(13,99,27,0.03);
          transform: translateY(-1px); box-shadow: 0 4px 10px rgba(26,28,28,0.06);
        }
        .mg-link.primary {
          border: none; background: linear-gradient(135deg, #0D631B 0%, #0a4f15 100%);
          color: #fff; font-weight: 600;
          box-shadow: 0 4px 12px rgba(13,99,27,0.2);
        }
        .mg-link.primary:hover {
          background: linear-gradient(135deg, #0a4f15 0%, #083d10 100%);
          box-shadow: 0 6px 16px rgba(13,99,27,0.28);
        }

        /* ── Danger zone ── */
        .mg-danger {
          margin-top: 8px; padding-top: 16px;
          border-top: 1px solid rgba(26,28,28,0.06);
        }
        .mg-danger-label {
          font-size: 0.6875rem; font-weight: 700; color: #9ca3af;
          text-transform: uppercase; letter-spacing: 0.06em;
          font-family: var(--font-dm-sans), sans-serif; margin-bottom: 8px;
        }

        /* ── Animations ── */
        .mg-inner > * {
          animation: mg-rise 0.45s cubic-bezier(0.2, 0, 0, 1) both;
        }
        .mg-inner > :nth-child(1) { animation-delay: 0s; }
        .mg-inner > :nth-child(2) { animation-delay: 0.04s; }
        .mg-inner > :nth-child(3) { animation-delay: 0.06s; }
        .mg-inner > :nth-child(4) { animation-delay: 0.10s; }
        .mg-inner > :nth-child(5) { animation-delay: 0.14s; }
        .mg-inner > :nth-child(6) { animation-delay: 0.18s; }
        .mg-inner > :nth-child(7) { animation-delay: 0.22s; }
        .mg-inner > :nth-child(8) { animation-delay: 0.26s; }
        @keyframes mg-rise {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="mg">

        {/* ── Hero ── */}
        <div className="mg-hero">
          <Image src="/hero.jpg" alt="Golf course" fill priority className="mg-hero-img" sizes="100vw" quality={90} />
          <div className="mg-hero-overlay" />
          <div className="mg-hero-inner">
            <Link href={`/events/${id}`} className="mg-hero-back">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Tournament
            </Link>
            <div className="mg-hero-eyebrow">Managing tournament</div>
            <h1 className="mg-hero-title">{event.name}</h1>
            {event.tournament_id && (
              <div className="mg-hero-subtitle">
                Round {event.round_number} of {roundCount} &mdash; {tournamentName}
              </div>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <main className="mg-body">
          <div className="mg-inner">

            {/* Tournament context — link to multi-round management */}
            {event.tournament_id && (
              <div className="mg-tournament-ctx">
                <div className="mg-tournament-ctx-info">
                  <span className="mg-tournament-ctx-label">Part of multi-round tournament</span>
                  <span className="mg-tournament-ctx-name">{tournamentName}</span>
                </div>
                <Link href={`/tournaments/${tournamentId}/manage`} className="mg-tournament-ctx-link">
                  Manage Rounds &amp; Standings →
                </Link>
              </div>
            )}

            {/* ── Two-column grid ── */}
            <div className="mg-grid">

              {/* ── Share card ── */}
              <div className="mg-card">
                <div className="mg-card-label">Invite link</div>
                <p className="mg-card-desc">
                  Share this link with your group. Players tap it to join and confirm their details.
                </p>
                <ManageActions eventUrl={eventUrl} eventName={event.name} />
              </div>

              {/* ── Tournament details ── */}
              <div className="mg-card">
                <div className="mg-card-label">Tournament details</div>
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

            </div>

            {/* ── Groups (full-width) ── */}
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

            {/* ── Two-column: Players + Confirm/Finalise ── */}
            <div className="mg-grid">

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
                    <div style={{ marginTop: 14, marginBottom: 6, fontSize: '0.6875rem', fontWeight: 700, color: '#9ca3af', fontFamily: 'var(--font-dm-sans), sans-serif', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
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

              {/* ── Right column: Confirm + Finalise ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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

                {/* ── Predictions ── */}
                <PredictionsToggle
                  eventId={id}
                  enabled={!!predConfig?.enabled}
                  startingCredits={predConfig?.starting_credits ?? 1000}
                  marketsCount={marketsCount ?? 0}
                  playerCount={confirmed.length}
                  finalised={!!event.finalised}
                />

                {/* ── Finalise ── */}
                <FinaliseButton eventId={id} finalised={!!event.finalised} />

                {/* ── Quick links ── */}
                <div className="mg-links">
                  <Link href={`/events/${id}`} className="mg-link">← Tournament</Link>
                  <Link href={`/events/${id}/leaderboard`} className="mg-link primary">Leaderboard →</Link>
                  {event.tournament_id && (
                    <Link href={`/tournaments/${tournamentId}/manage`} className="mg-link">Manage Rounds →</Link>
                  )}
                </div>

                {/* ── Danger zone ── */}
                <div className="mg-danger">
                  <div className="mg-danger-label">Danger zone</div>
                  <DeleteEventButton eventId={id} eventName={event.name} finalised={!!event.finalised} />
                </div>
              </div>

            </div>

          </div>
        </main>

      </div>

      <BottomNav active="events" />
    </>
  )
}
