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

        /* ── Hero banner (rounded card, matches dashboard) ── */
        .rp-banner-wrap {
          padding: 0.75rem 1rem 0;
        }
        .rp-banner {
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
        .rp-banner-img {
          position: absolute;
          inset: 0;
          object-fit: cover;
          width: 100%;
          height: 100%;
          filter: saturate(1.3) contrast(1.05);
        }
        .rp-banner-overlay {
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
        .rp-banner-topbar {
          position: relative;
          z-index: 3;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.875rem 1rem;
        }
        .rp-topbar-logo {
          display: flex;
          align-items: center;
          text-decoration: none;
        }
        .rp-hamburger {
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
        .rp-hamburger:hover { background: rgba(255, 255, 255, 0.2); border-color: rgba(255, 255, 255, 0.35); }

        /* ── Title card (inside banner, frosted glass) ── */
        .rp-title-card {
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
        .rp-title-left {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          flex: 1;
          min-width: 0;
        }
        .rp-title-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .rp-title-info { display: flex; flex-direction: column; gap: 0.15rem; }
        .rp-title {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 800;
          font-size: 1.1875rem;
          color: #fff;
          letter-spacing: -0.03em;
          line-height: 1.1;
          margin: 0;
        }
        .rp-subtitle {
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.6875rem;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.3;
          margin: 0;
          margin-top: 0.15rem;
        }

        /* ── Neon count badge (matches dashboard HCP style) ── */
        .rp-count-badge {
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
        .rp-count-badge::before {
          content: '';
          position: absolute;
          top: -1px;
          left: 12.5%;
          width: 75%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(120, 210, 130, 0.6), transparent);
          opacity: 0.6;
        }
        .rp-count-badge::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 12.5%;
          width: 75%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(120, 210, 130, 0.6), transparent);
          opacity: 0.6;
        }
        .rp-count-value {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 800;
          font-size: 1.125rem;
          color: #fff;
          letter-spacing: -0.02em;
        }
        .rp-count-label {
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.6875rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.65);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .rp-main {
          padding: 1.5rem 2rem;
          max-width: 1200px;
          margin: 0 auto;
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
          .rp-banner { min-height: 240px; }
          .rp-title-card { margin: 0 1rem 1rem; padding: 1.125rem 1.5rem; }
          .rp-main { max-width: 560px; padding: 2rem; }
          .rp { padding-bottom: 0; }
        }
      `}</style>

      <div className="rp">
        {/* ── Hero banner (matches dashboard structure) ── */}
        <div className="rp-banner-wrap">
          <div className="rp-banner">
            <Image src="/hero.jpg" alt="Golf course" fill className="rp-banner-img" priority sizes="100vw" quality={90} />
            <div className="rp-banner-overlay" />

            {/* ── Logo + hamburger ── */}
            <div className="rp-banner-topbar">
              <Link href="/play" className="rp-topbar-logo">
                <Image src="/lx2-logo.svg" alt="LX2" width={72} height={36} />
              </Link>
              <Link href="/play" className="rp-hamburger" aria-label="Menu">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </Link>
            </div>

            {/* ── Title card (inside banner, frosted glass) ── */}
            <div className="rp-title-card">
              <div className="rp-title-left">
                <div className="rp-title-info">
                  <h1 className="rp-title">My Rounds</h1>
                  <p className="rp-subtitle">Your scorecard history</p>
                </div>
              </div>
              {rounds.length > 0 && (
                <div className="rp-count-badge">
                  <span className="rp-count-value">{rounds.length}</span>
                  <span className="rp-count-label">played</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <main className="rp-main">

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
