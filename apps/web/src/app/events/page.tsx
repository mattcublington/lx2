import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/BottomNav'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

const FORMAT_LABEL: Record<string, string> = {
  stableford: 'Stableford',
  strokeplay: 'Stroke Play',
  matchplay: 'Match Play',
}

type EventRow = {
  event_id: string
  scorecard_id: string | null
  name: string
  date: string
  format: string
  courseName: string | null
}

export default async function EventsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Events where user is a confirmed player
  const { data: playerRows } = await supabase
    .from('event_players')
    .select(`
      event_id,
      scorecards ( id ),
      events!inner (
        id,
        name,
        date,
        format,
        courses ( name ),
        course_combinations ( name )
      )
    `)
    .eq('user_id', user.id)
    .eq('rsvp_status', 'confirmed')
    .is('events.archived_at', null)

  // Events where user is the organiser (may not be in event_players)
  const { data: organisedRows } = await supabase
    .from('events')
    .select(`
      id,
      name,
      date,
      format,
      courses ( name ),
      course_combinations ( name )
    `)
    .eq('created_by', user.id)
    .is('archived_at', null)

  type RawPlayer = {
    event_id: string
    scorecards: { id: string }[] | null
    events: {
      id: string
      name: string
      date: string
      format: string
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

  const seenIds = new Set<string>()

  const playerEvents: EventRow[] = ((playerRows ?? []) as unknown as RawPlayer[])
    .filter(p => p.events != null)
    .map(p => {
      const ev = p.events!
      seenIds.add(ev.id)
      const courseName = ev.course_combinations?.name ?? ev.courses?.name ?? null
      const scs = p.scorecards as unknown as { id: string }[] | null
      return {
        event_id: ev.id,
        scorecard_id: (scs ?? [])[0]?.id ?? null,
        name: ev.name,
        date: ev.date,
        format: ev.format,
        courseName,
      }
    })

  const organisedEvents: EventRow[] = ((organisedRows ?? []) as unknown as RawOrganised[])
    .filter(o => !seenIds.has(o.id))
    .map(o => ({
      event_id: o.id,
      scorecard_id: null,
      name: o.name,
      date: o.date,
      format: o.format,
      courseName: o.course_combinations?.name ?? o.courses?.name ?? null,
    }))

  const events: EventRow[] = [...playerEvents, ...organisedEvents]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = events.filter(e => e.date >= today)
  const past = events.filter(e => e.date < today)

  return (
    <>
      <style>{`
        .ep {
          min-height: 100dvh;
          background: #F0F4EC;
          font-family: var(--font-lexend), system-ui, sans-serif;
          color: #1A2E1A;
          padding-bottom: max(80px, calc(80px + env(safe-area-inset-bottom)));
        }
        .ep-hero {
          position: relative;
          width: 100%;
          padding: 3rem 2rem 2rem;
          overflow: hidden;
        }
        .ep-hero-img {
          position: absolute;
          inset: 0;
          object-fit: cover;
          width: 100%;
          height: 100%;
        }
        .ep-hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(10, 31, 10, 0.6) 0%,
            rgba(10, 31, 10, 0.45) 50%,
            rgba(10, 31, 10, 0.35) 100%
          );
          z-index: 1;
        }
        .ep-hero-inner {
          max-width: 1200px;
          margin: 0 auto;
          position: relative;
          z-index: 2;
        }
        .ep-title {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 800;
          font-size: 1.75rem;
          color: #FFFFFF;
          letter-spacing: -0.01em;
          margin: 0;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
        }
        .ep-subtitle {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.7);
          margin-top: 0.35rem;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }
        .ep-main {
          padding: 1.5rem 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .ep-section-hd {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 700;
          font-size: 0.8125rem;
          color: #72786E;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 0.75rem;
        }
        .ep-section { margin-bottom: 2rem; }
        .ep-list {
          background: #FFFFFF;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(26, 28, 28, 0.04);
        }
        .ep-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid rgba(26, 28, 28, 0.06);
          transition: background 0.2s ease-in-out;
          text-decoration: none;
          color: inherit;
        }
        .ep-row:last-child { border-bottom: none; }
        .ep-row:hover { background: rgba(240, 244, 236, 0.6); }
        .ep-info { flex: 1; min-width: 0; }
        .ep-name {
          font-weight: 500;
          font-size: 0.9375rem;
          color: #1A2E1A;
          margin-bottom: 0.2rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ep-meta {
          font-size: 0.8125rem;
          color: #72786E;
          display: flex;
          gap: 0.5rem;
          align-items: center;
          flex-wrap: wrap;
        }
        .ep-format {
          font-size: 0.6875rem;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 6px;
          background: rgba(13, 99, 27, 0.08);
          color: #0D631B;
        }
        .ep-chev {
          color: #C8D4C8;
          font-size: 1.125rem;
          margin-left: 0.75rem;
          flex-shrink: 0;
          transition: transform 0.15s, color 0.15s;
        }
        .ep-row:hover .ep-chev { transform: translateX(2px); color: #0D631B; }
        .ep-create {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #0D631B 0%, #0a4f15 100%);
          color: #FFFFFF;
          border: none;
          border-radius: 14px;
          font-family: var(--font-dm-sans), sans-serif;
          font-weight: 600;
          font-size: 0.9375rem;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(13, 99, 27, 0.18);
          transition: transform 0.15s, box-shadow 0.15s;
          margin-bottom: 1.75rem;
          text-decoration: none;
          letter-spacing: -0.01em;
        }
        .ep-create:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 28px rgba(13, 99, 27, 0.25);
        }
        .ep-empty {
          padding: 2.5rem 1.5rem;
          text-align: center;
          background: #FFFFFF;
          border-radius: 16px;
          font-size: 0.875rem;
          color: #72786E;
          line-height: 1.6;
        }
        .ep-empty-cta {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          margin-top: 1.25rem;
          padding: 0.75rem 1.5rem;
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
        .ep-empty-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 22px rgba(13, 99, 27, 0.25);
        }
        @media (min-width: 768px) {
          .ep-hero { padding: 3rem 2rem 2.25rem; }
          .ep-main { max-width: 560px; padding: 2rem; }
          .ep { padding-bottom: 0; }
        }
      `}</style>

      <div className="ep">
        <div className="ep-hero">
          <Image src="/hero.jpg" alt="" fill className="ep-hero-img" priority />
          <div className="ep-hero-overlay" />
          <div className="ep-hero-inner">
            <h1 className="ep-title">Events</h1>
            <p className="ep-subtitle">Tournaments &amp; competitions</p>
          </div>
        </div>

        <main className="ep-main">

          <Link href="/events/new" className="ep-create">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75"/>
              <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
            Create Tournament
          </Link>

          {events.length === 0 ? (
            <div className="ep-empty">
              You haven&apos;t joined any events yet.<br />
              Create a tournament or ask your organiser for a link to join.
            </div>
          ) : (
            <>
              {upcoming.length > 0 && (
                <section className="ep-section">
                  <div className="ep-section-hd">Upcoming</div>
                  <div className="ep-list">
                    {upcoming.map(ev => (
                      <EventRow key={ev.event_id} ev={ev} />
                    ))}
                  </div>
                </section>
              )}

              {past.length > 0 && (
                <section className="ep-section">
                  <div className="ep-section-hd">Past</div>
                  <div className="ep-list">
                    {past.map(ev => (
                      <EventRow key={ev.event_id} ev={ev} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>

      <BottomNav active="events" />
    </>
  )
}

function EventRow({ ev }: { ev: EventRow }) {
  const href = ev.scorecard_id
    ? `/rounds/${ev.scorecard_id}/score`
    : `/events/${ev.event_id}`

  return (
    <Link href={href} className="ep-row">
      <div className="ep-info">
        <div className="ep-name">{ev.name}</div>
        <div className="ep-meta">
          <span>{formatDate(ev.date)}</span>
          {ev.courseName && <span>{ev.courseName}</span>}
          {FORMAT_LABEL[ev.format] && (
            <span className="ep-format">{FORMAT_LABEL[ev.format]}</span>
          )}
        </div>
      </div>
      <div className="ep-chev">›</div>
    </Link>
  )
}
