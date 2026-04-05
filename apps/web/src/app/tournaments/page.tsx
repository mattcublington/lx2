import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/BottomNav'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

const FORMAT_LABEL: Record<string, string> = {
  stableford: 'Stableford',
  strokeplay: 'Stroke Play',
  matchplay: 'Match Play',
}

type TournamentRow = {
  id: string
  name: string
  format: string
  status: string
  finalised: boolean
  created_at: string
  events: {
    id: string
    date: string
    name: string
    finalised: boolean
    courses: { name: string } | null
  }[]
}

type MeritRow = {
  id: string
  name: string
  season_year: number
  status: string
}

type StandaloneEvent = {
  event_id: string
  name: string
  date: string
  format: string
  courseName: string | null
}

export default async function TournamentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Tournaments created by this user
  const { data: tournamentsRaw } = await supabase
    .from('tournaments')
    .select(`
      id, name, format, status, finalised, created_at,
      events ( id, date, name, finalised, courses ( name ) )
    `)
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })

  // Standalone events — player rows (no tournament_id)
  const { data: playerRows } = await supabase
    .from('event_players')
    .select(`
      event_id,
      events!inner (
        id, name, date, format, tournament_id,
        courses ( name ), course_combinations ( name )
      )
    `)
    .eq('user_id', user.id)
    .eq('rsvp_status', 'confirmed')
    .is('events.archived_at', null)
    .is('events.tournament_id', null)

  // Standalone events — organised by this user (no tournament_id)
  const { data: organisedRows } = await supabase
    .from('events')
    .select('id, name, date, format, courses ( name ), course_combinations ( name )')
    .eq('created_by', user.id)
    .is('archived_at', null)
    .is('tournament_id', null)
    .order('date', { ascending: false })

  // Order of merits
  const { data: meritsRaw } = await supabase
    .from('order_of_merits')
    .select('id, name, season_year, status')
    .eq('created_by', user.id)
    .order('season_year', { ascending: false })

  // --- Type coercions ---
  type RawTournamentEvent = {
    id: string
    date: string
    name: string
    finalised: boolean
    courses: { name: string } | null
  }

  type RawTournament = {
    id: string
    name: string
    format: string
    status: string
    finalised: boolean
    created_at: string
    events: RawTournamentEvent[] | null
  }

  type RawPlayerRow = {
    event_id: string
    events: {
      id: string
      name: string
      date: string
      format: string
      tournament_id: string | null
      courses: { name: string } | null
      course_combinations: { name: string } | null
    } | null
  }

  type RawOrganised = {
    id: string
    name: string
    date: string
    format: string
    courses: { name: string } | null
    course_combinations: { name: string } | null
  }

  const tournaments: TournamentRow[] = ((tournamentsRaw ?? []) as unknown as RawTournament[])
    .map(t => ({
      ...t,
      events: (t.events ?? []),
    }))

  const merits: MeritRow[] = (meritsRaw ?? []) as MeritRow[]

  const seenIds = new Set<string>()

  const playerEvents: StandaloneEvent[] = ((playerRows ?? []) as unknown as RawPlayerRow[])
    .filter(p => p.events != null)
    .map(p => {
      const ev = p.events!
      seenIds.add(ev.id)
      return {
        event_id: ev.id,
        name: ev.name,
        date: ev.date,
        format: ev.format,
        courseName: ev.course_combinations?.name ?? ev.courses?.name ?? null,
      }
    })

  const organisedEvents: StandaloneEvent[] = ((organisedRows ?? []) as unknown as RawOrganised[])
    .filter(o => !seenIds.has(o.id))
    .map(o => ({
      event_id: o.id,
      name: o.name,
      date: o.date,
      format: o.format,
      courseName: o.course_combinations?.name ?? o.courses?.name ?? null,
    }))

  const standaloneEvents: StandaloneEvent[] = [...playerEvents, ...organisedEvents]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const activeTournaments = tournaments.filter(t => !t.finalised)
  const finalisedTournaments = tournaments.filter(t => t.finalised)

  const totalCount = tournaments.length + merits.length + standaloneEvents.length

  return (
    <>
      <style>{`
        .th {
          min-height: 100dvh;
          background: #F2F5F0;
          font-family: var(--font-dm-sans), system-ui, sans-serif;
          color: #1A2E1A;
          padding-bottom: max(80px, calc(80px + env(safe-area-inset-bottom)));
        }
        /* ── Hero banner (rounded card, matches dashboard) ── */
        .th-banner-wrap {
          padding: 0.75rem 1rem 0;
        }
        .th-banner {
          position: relative;
          width: 100%;
          min-height: 220px;
          overflow: hidden;
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(10, 31, 10, 0.22);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .th-banner-img {
          position: absolute;
          inset: 0;
          object-fit: cover;
          width: 100%;
          height: 100%;
          filter: saturate(1.3) contrast(1.05);
        }
        .th-banner-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(10, 31, 10, 0.25) 0%,
            rgba(10, 31, 10, 0.05) 30%,
            rgba(10, 31, 10, 0.15) 60%,
            rgba(10, 31, 10, 0.5) 100%
          );
          z-index: 1;
        }
        .th-banner-topbar {
          position: relative;
          z-index: 3;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.875rem 1rem;
        }
        .th-topbar-logo {
          display: flex;
          align-items: center;
          text-decoration: none;
        }
        .th-hamburger {
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #3a3a3a;
          transition: background 0.15s, border-color 0.15s;
          flex-shrink: 0;
          text-decoration: none;
        }
        .th-hamburger:hover { background: rgba(255, 255, 255, 0.2); border-color: rgba(255, 255, 255, 0.35); }

        /* ── Title card (inside banner, frosted glass) ── */
        .th-title-card {
          position: relative;
          z-index: 3;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1rem 1.25rem;
          margin: 0 0.75rem 0.75rem;
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 14px;
        }
        .th-title-left {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          flex: 1;
          min-width: 0;
        }
        .th-title-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .th-title-info { display: flex; flex-direction: column; gap: 0.15rem; }
        .th-title {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 800;
          font-size: 1.1875rem;
          color: #fff;
          letter-spacing: -0.03em;
          line-height: 1.1;
          margin: 0;
        }
        .th-subtitle {
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.6875rem;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.3;
          margin: 0;
          margin-top: 0.15rem;
        }

        /* ── Neon count badge ── */
        .th-count-badge {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          border: 1px solid rgba(90, 180, 100, 0.25);
          background: rgba(90, 180, 100, 0.08);
          flex-shrink: 0;
          overflow: hidden;
        }
        .th-count-badge::before {
          content: '';
          position: absolute;
          top: -1px;
          left: 12.5%;
          width: 75%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(120, 210, 130, 0.6), transparent);
          opacity: 0.6;
        }
        .th-count-badge::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 12.5%;
          width: 75%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(120, 210, 130, 0.6), transparent);
          opacity: 0.6;
        }
        .th-count-value {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 800;
          font-size: 1.125rem;
          color: #fff;
          letter-spacing: -0.02em;
        }
        .th-count-label {
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.6875rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.65);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .th-main {
          padding: 1.5rem 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .th-cta-row {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-bottom: 2rem;
        }
        .th-cta-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: linear-gradient(135deg, #0D631B 0%, #0a4f15 100%);
          color: #FFFFFF;
          border-radius: 12px;
          font-family: var(--font-dm-sans), sans-serif;
          font-weight: 600;
          font-size: 0.875rem;
          text-decoration: none;
          box-shadow: 0 4px 14px rgba(13, 99, 27, 0.18);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .th-cta-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 22px rgba(13, 99, 27, 0.25);
        }
        .th-cta-outline {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: #FFFFFF;
          color: #0D631B;
          border: 1.5px solid #0D631B;
          border-radius: 12px;
          font-family: var(--font-dm-sans), sans-serif;
          font-weight: 600;
          font-size: 0.875rem;
          text-decoration: none;
          transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
        }
        .th-cta-outline:hover {
          transform: translateY(-1px);
          background: rgba(13, 99, 27, 0.04);
          box-shadow: 0 4px 12px rgba(13, 99, 27, 0.1);
        }
        .th-section {
          margin-bottom: 2.25rem;
        }
        .th-section-title {
          font-family: var(--font-dm-sans), sans-serif;
          font-weight: 700;
          font-size: 0.8125rem;
          color: #6B8C6B;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 0.75rem;
        }
        .th-empty {
          padding: 2rem 1.5rem;
          text-align: center;
          background: #FFFFFF;
          border-radius: 14px;
          font-size: 0.875rem;
          color: #6B8C6B;
          line-height: 1.6;
          border: 1px solid #E0EBE0;
        }
        /* Card link wrapper */
        .th-card-link {
          display: block;
          text-decoration: none;
          color: inherit;
          margin-bottom: 0.625rem;
        }
        .th-card-link:last-child { margin-bottom: 0; }
        /* Hover lift applied to shadcn Card inside the link */
        .th-card-link:hover .th-card-inner {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(26, 46, 26, 0.1);
        }
        .th-card-inner {
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .th-card-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem !important;
        }
        .th-card-info { flex: 1; min-width: 0; }
        .th-card-name {
          font-family: var(--font-dm-sans), sans-serif;
          font-weight: 600;
          font-size: 1rem;
          color: #1A2E1A;
          margin-bottom: 0.3rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .th-card-meta {
          font-size: 0.8125rem;
          color: #6B8C6B;
          display: flex;
          gap: 0.5rem;
          align-items: center;
          flex-wrap: wrap;
        }
        /* Badge overrides — brand colours on shadcn Badge base */
        .th-badge-format {
          background: rgba(13, 99, 27, 0.08) !important;
          color: #0D631B !important;
          border-color: rgba(13, 99, 27, 0.15) !important;
          font-size: 0.6875rem !important;
        }
        .th-badge-active, .th-badge-upcoming {
          background: rgba(13, 99, 27, 0.1) !important;
          color: #0D631B !important;
          border-color: rgba(13, 99, 27, 0.2) !important;
          font-size: 0.6875rem !important;
        }
        .th-badge-in-progress {
          background: rgba(230, 130, 0, 0.1) !important;
          color: #a05800 !important;
          border-color: rgba(230, 130, 0, 0.2) !important;
          font-size: 0.6875rem !important;
        }
        .th-badge-completed {
          background: rgba(107, 140, 107, 0.12) !important;
          color: #4a6e4a !important;
          border-color: rgba(107, 140, 107, 0.2) !important;
          font-size: 0.6875rem !important;
        }
        .th-chev {
          color: #C8D4C8;
          font-size: 1.125rem;
          margin-left: 0.75rem;
          flex-shrink: 0;
          transition: transform 0.15s, color 0.15s;
        }
        .th-card-link:hover .th-chev {
          transform: translateX(2px);
          color: #0D631B;
        }
        @media (min-width: 768px) {
          .th-banner { min-height: 240px; }
          .th-title-card { margin: 0 1rem 1rem; padding: 1.125rem 1.5rem; }
          .th { padding-bottom: 0; }
        }
      `}</style>

      <div className="th">
        {/* ── Hero banner ── */}
        <div className="th-banner-wrap">
          <div className="th-banner">
            <Image src="/hero.jpg" alt="Golf course" fill className="th-banner-img" priority sizes="100vw" quality={90} />
            <div className="th-banner-overlay" />

            <div className="th-banner-topbar">
              <Link href="/play" className="th-topbar-logo">
                <Image src="/lx2-logo.svg" alt="LX2" width={72} height={36} />
              </Link>
              <Link href="/play" className="th-hamburger" aria-label="Menu">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </Link>
            </div>

            <div className="th-title-card">
              <div className="th-title-left">
                <div className="th-title-info">
                  <h1 className="th-title">Tournaments</h1>
                  <p className="th-subtitle">Competitions &amp; series</p>
                </div>
              </div>
              {totalCount > 0 && (
                <div className="th-count-badge">
                  <span className="th-count-value">{totalCount}</span>
                  <span className="th-count-label">events</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <main className="th-main">

          <div className="th-cta-row">
            <Link href="/events/new" className="th-cta-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75"/>
                <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              </svg>
              New Single-Round Tournament
            </Link>
            <Link href="/tournaments/new" className="th-cta-outline">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75"/>
                <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              </svg>
              New Multi-Round Tournament
            </Link>
            <Link href="/merit/new" className="th-cta-outline">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75"/>
                <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              </svg>
              New Order of Merit
            </Link>
          </div>

          {/* Multi-Round Tournaments */}
          <section className="th-section">
            <div className="th-section-title">Multi-Round Tournaments</div>
            {activeTournaments.length === 0 ? (
              <div className="th-empty">No multi-round tournaments yet. Create one to get started.</div>
            ) : (
              activeTournaments.map(t => (
                <TournamentCard key={t.id} tournament={t} />
              ))
            )}
          </section>

          {/* Completed Multi-Round Tournaments */}
          {finalisedTournaments.length > 0 && (
            <section className="th-section">
              <div className="th-section-title">Past Multi-Round Tournaments</div>
              {finalisedTournaments.map(t => (
                <TournamentCard key={t.id} tournament={t} />
              ))}
            </section>
          )}

          {/* Order of Merit */}
          <section className="th-section">
            <div className="th-section-title">Order of Merit</div>
            {merits.length === 0 ? (
              <div className="th-empty">No order of merit series yet.</div>
            ) : (
              merits.map(m => (
                <MeritCard key={m.id} merit={m} />
              ))
            )}
          </section>

          {/* Single-Round Tournaments (formerly Standalone Events) */}
          <section className="th-section">
            <div className="th-section-title">Single-Round Tournaments</div>
            {standaloneEvents.length === 0 ? (
              <div className="th-empty">No single-round tournaments found.</div>
            ) : (
              standaloneEvents.map(ev => (
                <StandaloneEventCard key={ev.event_id} ev={ev} />
              ))
            )}
          </section>

        </main>
      </div>

      <BottomNav active="events" />
    </>
  )
}

function TournamentCard({ tournament: t }: { tournament: TournamentRow }) {
  const today = new Date().toISOString().slice(0, 10)
  const upcomingRounds = t.events
    .filter(e => e.date >= today && !e.finalised)
    .sort((a, b) => a.date.localeCompare(b.date))
  const nextRound = upcomingRounds[0] ?? null
  const roundCount = t.events.length

  const statusLabel =
    t.status === 'in_progress' ? 'In Progress' :
    t.status === 'upcoming' ? 'Upcoming' :
    t.finalised ? 'Completed' : t.status

  const statusCssKey =
    t.status === 'in_progress' ? 'in-progress' :
    t.status === 'upcoming' ? 'upcoming' :
    t.finalised ? 'completed' : 'upcoming'

  return (
    <Link href={`/tournaments/${t.id}`} className="th-card-link">
      <Card className="th-card-inner">
        <CardContent className="th-card-content">
          <div className="th-card-info">
            <div className="th-card-name">{t.name}</div>
            <div className="th-card-meta">
              {FORMAT_LABEL[t.format] && (
                <Badge className="th-badge-format">{FORMAT_LABEL[t.format]}</Badge>
              )}
              <Badge className={`th-badge-${statusCssKey}`}>{statusLabel}</Badge>
              <span>{roundCount} {roundCount === 1 ? 'round' : 'rounds'}</span>
              {nextRound && <span>Next: {formatDate(nextRound.date)}</span>}
            </div>
          </div>
          <div className="th-chev">›</div>
        </CardContent>
      </Card>
    </Link>
  )
}

function MeritCard({ merit: m }: { merit: MeritRow }) {
  const statusLabel = m.status === 'active' ? 'Active' : m.status === 'completed' ? 'Completed' : m.status
  const statusCssKey = m.status === 'active' ? 'active' : 'completed'

  return (
    <Link href={`/merit/${m.id}`} className="th-card-link">
      <Card className="th-card-inner">
        <CardContent className="th-card-content">
          <div className="th-card-info">
            <div className="th-card-name">{m.name}</div>
            <div className="th-card-meta">
              <span>{m.season_year} Season</span>
              <Badge className={`th-badge-${statusCssKey}`}>{statusLabel}</Badge>
            </div>
          </div>
          <div className="th-chev">›</div>
        </CardContent>
      </Card>
    </Link>
  )
}

function StandaloneEventCard({ ev }: { ev: StandaloneEvent }) {
  return (
    <Link href={`/events/${ev.event_id}`} className="th-card-link">
      <Card className="th-card-inner">
        <CardContent className="th-card-content">
          <div className="th-card-info">
            <div className="th-card-name">{ev.name}</div>
            <div className="th-card-meta">
              <span>{formatDate(ev.date)}</span>
              {ev.courseName && <span>{ev.courseName}</span>}
              {FORMAT_LABEL[ev.format] && (
                <Badge className="th-badge-format">{FORMAT_LABEL[ev.format]}</Badge>
              )}
            </div>
          </div>
          <div className="th-chev">›</div>
        </CardContent>
      </Card>
    </Link>
  )
}
