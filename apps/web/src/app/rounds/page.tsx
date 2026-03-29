import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/BottomNav'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const FORMAT_LABEL: Record<string, string> = {
  stableford: 'Stableford',
  strokeplay: 'Stroke Play',
  matchplay: 'Match Play',
}

export default async function RoundsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: rawRounds } = await supabase
    .from('scorecards')
    .select(`
      id,
      created_at,
      events!inner (
        name,
        date,
        format,
        courses ( name ),
        course_combinations ( name )
      ),
      event_players!inner ( user_id )
    `)
    .eq('event_players.user_id', user.id)
    .order('created_at', { ascending: false })

  type RoundRow = {
    id: string
    created_at: string
    events: {
      name: string
      date: string
      format: string
      courses: { name: string } | null
      course_combinations: { name: string } | null
    } | null
  }

  const rounds = (rawRounds ?? []) as unknown as RoundRow[]

  return (
    <>
      <style>{`
        .rp {
          min-height: 100dvh;
          background: #F0F4EC;
          font-family: var(--font-lexend), system-ui, sans-serif;
          color: #1A2E1A;
          padding-bottom: max(80px, calc(80px + env(safe-area-inset-bottom)));
        }
        .rp-hd {
          background: #F0F4EC;
          padding: 1rem 1.25rem;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .rp-main {
          padding: 1.5rem 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .rp-title {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 800;
          font-size: 1.75rem;
          color: #1A2E1A;
          margin-bottom: 1.25rem;
          letter-spacing: -0.02em;
        }
        .rp-list {
          background: #FFFFFF;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(26, 28, 28, 0.04);
        }
        .rp-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid rgba(26, 28, 28, 0.06);
          transition: background 0.2s ease-in-out;
          text-decoration: none;
          color: inherit;
        }
        .rp-row:last-child { border-bottom: none; }
        .rp-row:hover { background: rgba(240, 244, 236, 0.6); }
        .rp-info { flex: 1; min-width: 0; }
        .rp-course {
          font-weight: 500;
          font-size: 0.9375rem;
          color: #1A2E1A;
          margin-bottom: 0.2rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .rp-meta {
          font-size: 0.8125rem;
          color: #72786E;
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }
        .rp-format {
          font-size: 0.6875rem;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 6px;
          background: rgba(13, 99, 27, 0.08);
          color: #0D631B;
        }
        .rp-chev {
          color: #C8D4C8;
          font-size: 1.125rem;
          margin-left: 0.75rem;
          flex-shrink: 0;
          transition: transform 0.15s, color 0.15s;
        }
        .rp-row:hover .rp-chev { transform: translateX(2px); color: #0D631B; }
        .rp-empty {
          padding: 3rem 1.5rem;
          text-align: center;
          background: #FFFFFF;
          border-radius: 16px;
        }
        .rp-empty-h {
          font-family: var(--font-manrope), sans-serif;
          font-size: 1rem;
          font-weight: 600;
          color: #C0CFC0;
          margin-bottom: 0.5rem;
        }
        .rp-empty-p { font-size: 0.875rem; color: #72786E; line-height: 1.6; }
        .rp-cta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #0D631B 0%, #0a4f15 100%);
          color: #FFFFFF;
          border: none;
          border-radius: 14px;
          font-family: var(--font-manrope), sans-serif;
          font-weight: 700;
          font-size: 0.9375rem;
          cursor: pointer;
          text-decoration: none;
          margin-bottom: 1.25rem;
          letter-spacing: -0.01em;
          transition: transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 6px 20px rgba(13, 99, 27, 0.2);
        }
        .rp-cta:hover { transform: translateY(-1px); box-shadow: 0 10px 28px rgba(13, 99, 27, 0.28); }
        @media (min-width: 768px) {
          .rp-main { max-width: 560px; padding: 2rem; }
          .rp { padding-bottom: 0; }
        }
      `}</style>

      <div className="rp">
        <header className="rp-hd">
          <Image src="/lx2-logo.svg" alt="LX2" width={72} height={36} priority />
        </header>

        <main className="rp-main">
          <h1 className="rp-title">My Rounds</h1>

          <Link href="/play/new" className="rp-cta">
            + Start a new round
          </Link>

          {rounds.length === 0 ? (
            <div className="rp-empty">
              <div className="rp-empty-h">No rounds yet</div>
              <p className="rp-empty-p">Start your first round above and it will appear here.</p>
            </div>
          ) : (
            <div className="rp-list">
              {rounds.map(round => {
                const event = round.events
                const courseName = event?.courses?.name ?? event?.name ?? 'Golf course'
                const comboName = event?.course_combinations?.name
                const displayCourse = comboName ? `${courseName} · ${comboName}` : courseName
                const date = formatDate(event?.date ?? round.created_at)
                const format = event?.format ?? ''

                return (
                  <Link key={round.id} href={`/rounds/${round.id}`} className="rp-row">
                    <div className="rp-info">
                      <div className="rp-course">{displayCourse}</div>
                      <div className="rp-meta">
                        <span>{date}</span>
                        {FORMAT_LABEL[format] && (
                          <span className="rp-format">{FORMAT_LABEL[format]}</span>
                        )}
                      </div>
                    </div>
                    <div className="rp-chev">›</div>
                  </Link>
                )
              })}
            </div>
          )}
        </main>
      </div>

      <BottomNav active="rounds" />
    </>
  )
}
