import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/BottomNav'
import { computeMeritStandings } from '@/lib/merit/points'
import type { MeritEventResult, MeritPlayerStanding } from '@/lib/merit/points'

type PageProps = {
  params: Promise<{ id: string }>
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default async function MeritStandingsPage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch merit
  const { data: merit } = await supabase
    .from('order_of_merits')
    .select('id, name, season_year, status, best_of, participation_points, points_template, created_by')
    .eq('id', id)
    .single()

  if (!merit) notFound()

  const isOrganiser = merit.created_by === user.id

  // Fetch entries
  const { data: rawEntries } = await supabase
    .from('order_of_merit_entries')
    .select('id, event_id, tournament_id, points_multiplier')
    .eq('merit_id', id)

  const entries = rawEntries ?? []

  // For each entry, get event name and standings data
  type EntryInfo = {
    entryId: string
    label: string
    date: string
    multiplier: number
    standings: MeritPlayerStanding[]
  }

  const entryInfos: EntryInfo[] = []

  for (const entry of entries) {
    if (entry.event_id) {
      // Standalone event
      const { data: ev } = await supabase
        .from('events')
        .select('id, name, date')
        .eq('id', entry.event_id as string)
        .single()

      if (!ev) continue

      // Get finalised event standings via event_players
      const { data: players } = await supabase
        .from('event_players')
        .select('user_id, display_name, final_position')
        .eq('event_id', entry.event_id as string)
        .not('final_position', 'is', null)
        .order('final_position', { ascending: true })

      const standings: MeritPlayerStanding[] = (players ?? [])
        .filter(p => p.final_position != null)
        .map(p => ({
          userId: p.user_id as string,
          displayName: p.display_name as string,
          position: p.final_position as number,
        }))

      entryInfos.push({
        entryId: entry.id as string,
        label: ev.name as string,
        date: ev.date as string,
        multiplier: entry.points_multiplier as number,
        standings,
      })
    } else if (entry.tournament_id) {
      // Tournament overall standings
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('id, name')
        .eq('id', entry.tournament_id as string)
        .single()

      if (!tournament) continue

      // Tournament standings come from tournament_standings table if it exists,
      // otherwise fall back to a best-score approach from events
      const { data: tStandings } = await supabase
        .from('tournament_standings')
        .select('user_id, display_name, position')
        .eq('tournament_id', entry.tournament_id as string)
        .order('position', { ascending: true })

      const standings: MeritPlayerStanding[] = (tStandings ?? []).map(s => ({
        userId: s.user_id as string,
        displayName: s.display_name as string,
        position: s.position as number,
      }))

      entryInfos.push({
        entryId: entry.id as string,
        label: tournament.name as string,
        date: '',
        multiplier: entry.points_multiplier as number,
        standings,
      })
    }
  }

  // Build MeritEventResult array for computeMeritStandings
  const meritEvents: MeritEventResult[] = entryInfos.map(e => ({
    entryId: e.entryId,
    multiplier: e.multiplier,
    standings: e.standings,
  }))

  const pointsTemplate = (merit.points_template ?? {}) as Record<string, number>
  const bestOf = typeof merit.best_of === 'number' ? merit.best_of : null
  const participationPoints = typeof merit.participation_points === 'number' ? merit.participation_points : 0

  const standings = computeMeritStandings(meritEvents, {
    pointsTemplate,
    participationPoints,
    bestOf,
  })

  // For best-of highlighting: determine which entryIds count for each player
  // A player's counted entries are the top bestOf by points (sorted desc)
  const countedEntryIds = new Map<string, Set<string>>()
  if (bestOf && entryInfos.length > 0) {
    for (const standing of standings) {
      const pointsByEntry = entryInfos
        .map(e => ({
          entryId: e.entryId,
          pts: standing.eventPoints[e.entryId] ?? 0,
        }))
        .filter(e => e.pts > 0)
        .sort((a, b) => b.pts - a.pts)
        .slice(0, bestOf)

      countedEntryIds.set(standing.userId, new Set(pointsByEntry.map(e => e.entryId)))
    }
  }

  return (
    <>
      <style>{`
        .ms {
          min-height: 100dvh;
          background: #F2F5F0;
          font-family: var(--font-dm-sans), system-ui, sans-serif;
          color: #1A2E1A;
          padding-bottom: max(80px, calc(80px + env(safe-area-inset-bottom)));
        }
        .ms-hero {
          position: relative;
          width: 100%;
          padding: 3rem 2rem 2rem;
          overflow: hidden;
        }
        .ms-hero-img {
          position: absolute;
          inset: 0;
          object-fit: cover;
          width: 100%;
          height: 100%;
        }
        .ms-hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(10,31,10,0.6) 0%, rgba(10,31,10,0.45) 50%, rgba(10,31,10,0.35) 100%);
          z-index: 1;
        }
        .ms-hero-inner {
          max-width: 1200px;
          margin: 0 auto;
          position: relative;
          z-index: 2;
        }
        .ms-back {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: rgba(255,255,255,0.85);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          padding: 6px 10px;
          border-radius: 8px;
          transition: background 0.15s, color 0.15s;
          margin-bottom: 1rem;
        }
        .ms-back:hover { background: rgba(255,255,255,0.15); color: #fff; }
        .ms-title {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 800;
          font-size: 1.75rem;
          color: #fff;
          margin: 0;
          letter-spacing: -0.01em;
          text-shadow: 0 1px 4px rgba(0,0,0,0.3);
        }
        .ms-subtitle {
          font-size: 0.875rem;
          color: rgba(255,255,255,0.7);
          margin-top: 0.35rem;
        }
        .ms-main {
          padding: 1.5rem 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .ms-actions {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1.75rem;
          flex-wrap: wrap;
        }
        .ms-btn-manage {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1.1rem;
          background: #fff;
          color: #0D631B;
          border: 1.5px solid #0D631B;
          border-radius: 12px;
          font-family: var(--font-dm-sans), sans-serif;
          font-weight: 600;
          font-size: 0.875rem;
          text-decoration: none;
          transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
        }
        .ms-btn-manage:hover {
          transform: translateY(-1px);
          background: rgba(13,99,27,0.04);
          box-shadow: 0 4px 12px rgba(13,99,27,0.1);
        }
        .ms-badge {
          font-size: 0.6875rem;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 6px;
        }
        .ms-badge-active { background: rgba(13,99,27,0.1); color: #0D631B; }
        .ms-badge-completed { background: rgba(107,140,107,0.12); color: #4a6e4a; }
        .ms-badge-major { background: rgba(13,99,27,0.12); color: #0D631B; }
        .ms-section-title {
          font-family: var(--font-dm-sans), sans-serif;
          font-weight: 700;
          font-size: 0.8125rem;
          color: #6B8C6B;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 0.75rem;
        }

        /* ── Standings table ── */
        .ms-table-wrap {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #E0EBE0;
          overflow-x: auto;
          margin-bottom: 1.5rem;
          box-shadow: 0 2px 8px rgba(26,46,26,0.04);
        }
        .ms-table {
          width: 100%;
          border-collapse: collapse;
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.875rem;
          min-width: 480px;
        }
        .ms-table th {
          padding: 12px 14px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #6B8C6B;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          text-align: left;
          border-bottom: 1px solid #E0EBE0;
          white-space: nowrap;
        }
        .ms-table th.col-pts { text-align: right; }
        .ms-table td {
          padding: 12px 14px;
          border-bottom: 1px solid #F2F5F0;
          vertical-align: middle;
        }
        .ms-table tr:last-child td { border-bottom: none; }
        .ms-table td.col-pos {
          font-weight: 700;
          color: #1A2E1A;
          width: 40px;
        }
        .ms-table td.col-player {
          font-weight: 500;
          color: #1A2E1A;
        }
        .ms-table td.col-total {
          text-align: right;
          font-weight: 700;
          color: #0D631B;
        }
        .ms-table td.col-event {
          text-align: right;
          color: #1A2E1A;
        }
        .ms-table td.col-event.dropped {
          color: #C8D4C8;
        }
        .ms-empty {
          padding: 2rem 1.5rem;
          text-align: center;
          background: #fff;
          border-radius: 14px;
          font-size: 0.875rem;
          color: #6B8C6B;
          border: 1px solid #E0EBE0;
          margin-bottom: 1.5rem;
        }

        /* ── Entry list ── */
        .ms-entry-list {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #E0EBE0;
          overflow: hidden;
          margin-bottom: 1.5rem;
        }
        .ms-entry-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-bottom: 1px solid #F2F5F0;
        }
        .ms-entry-row:last-child { border-bottom: none; }
        .ms-entry-name {
          flex: 1;
          font-size: 0.9375rem;
          color: #1A2E1A;
          font-weight: 500;
        }
        .ms-entry-date {
          font-size: 0.8125rem;
          color: #6B8C6B;
        }
        @media (min-width: 768px) {
          .ms-hero { padding: 3rem 2rem 2.25rem; }
          .ms { padding-bottom: 0; }
        }
      `}</style>

      <div className="ms">
        <div className="ms-hero">
          <Image src="/hero.jpg" alt="" fill className="ms-hero-img" priority />
          <div className="ms-hero-overlay" />
          <div className="ms-hero-inner">
            <Link href="/merit" className="ms-back">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Order of Merit
            </Link>
            <h1 className="ms-title">{merit.name as string}</h1>
            <p className="ms-subtitle">{merit.season_year as number} Season</p>
          </div>
        </div>

        <main className="ms-main">

          {isOrganiser && (
            <div className="ms-actions">
              <Link href={`/merit/${id}/manage`} className="ms-btn-manage">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Manage
              </Link>
              <span className={`ms-badge ${merit.status === 'active' ? 'ms-badge-active' : 'ms-badge-completed'}`}>
                {merit.status === 'active' ? 'Active' : 'Completed'}
              </span>
              {bestOf && (
                <span style={{ fontSize: '0.8125rem', color: '#6B8C6B', alignSelf: 'center', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                  Best {bestOf} of {entryInfos.length} events
                </span>
              )}
            </div>
          )}

          {/* Standings */}
          <div className="ms-section-title">Standings</div>

          {standings.length === 0 ? (
            <div className="ms-empty">
              No standings yet &mdash; add events or wait for results to be finalised.
            </div>
          ) : (
            <div className="ms-table-wrap">
              <table className="ms-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Player</th>
                    {entryInfos.map(e => (
                      <th key={e.entryId} className="col-pts" title={e.label}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                          <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                            {e.label.split(' ').slice(0, 2).join(' ')}
                          </span>
                          {e.date && <span style={{ fontWeight: 400, color: '#6B8C6B', fontSize: '0.6875rem' }}>{formatDate(e.date)}</span>}
                          {e.multiplier !== 1 && (
                            <span className="ms-badge ms-badge-major">{e.multiplier}x</span>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="col-pts">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map(s => {
                    const counted = countedEntryIds.get(s.userId)
                    return (
                      <tr key={s.userId}>
                        <td className="col-pos">{s.position}</td>
                        <td className="col-player">{s.displayName}</td>
                        {entryInfos.map(e => {
                          const pts = s.eventPoints[e.entryId]
                          const isDropped = bestOf != null && counted != null && !counted.has(e.entryId) && pts != null && pts > 0
                          return (
                            <td key={e.entryId} className={`col-event${isDropped ? ' dropped' : ''}`}>
                              {pts != null ? pts : '—'}
                            </td>
                          )
                        })}
                        <td className="col-total">{s.total}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Included events */}
          {entryInfos.length > 0 && (
            <>
              <div className="ms-section-title" style={{ marginTop: 8 }}>Included Events</div>
              <div className="ms-entry-list">
                {entryInfos.map(e => (
                  <div key={e.entryId} className="ms-entry-row">
                    <div className="ms-entry-name">{e.label}</div>
                    {e.date && <div className="ms-entry-date">{formatDate(e.date)}</div>}
                    {e.multiplier !== 1 && (
                      <span className="ms-badge ms-badge-major">{e.multiplier}x</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

        </main>
      </div>

      <BottomNav active="events" />
    </>
  )
}
