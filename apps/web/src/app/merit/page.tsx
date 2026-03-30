import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/BottomNav'

type MeritRow = {
  id: string
  name: string
  season_year: number
  status: string
  created_at: string
}

export default async function MeritPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/merit')

  const { data: meritsRaw } = await supabase
    .from('order_of_merits')
    .select('id, name, season_year, status, created_at')
    .eq('created_by', user.id)
    .order('season_year', { ascending: false })

  const merits: MeritRow[] = (meritsRaw ?? []) as MeritRow[]

  const active = merits.filter(m => m.status === 'active')
  const completed = merits.filter(m => m.status !== 'active')

  return (
    <>
      <style>{`
        .om {
          min-height: 100dvh;
          background: #F2F5F0;
          font-family: var(--font-dm-sans), system-ui, sans-serif;
          color: #1A2E1A;
          padding-bottom: max(80px, calc(80px + env(safe-area-inset-bottom)));
        }
        .om-hero {
          position: relative;
          width: 100%;
          padding: 3rem 2rem 2rem;
          overflow: hidden;
        }
        .om-hero-img {
          position: absolute;
          inset: 0;
          object-fit: cover;
          width: 100%;
          height: 100%;
        }
        .om-hero-overlay {
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
        .om-hero-inner {
          max-width: 1200px;
          margin: 0 auto;
          position: relative;
          z-index: 2;
        }
        .om-title {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 800;
          font-size: 1.75rem;
          color: #FFFFFF;
          letter-spacing: -0.01em;
          margin: 0;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
        }
        .om-subtitle {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.7);
          margin-top: 0.35rem;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }
        .om-main {
          padding: 1.5rem 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .om-cta-row {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-bottom: 2rem;
        }
        .om-cta-primary {
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
        .om-cta-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 22px rgba(13, 99, 27, 0.25);
        }
        .om-cta-outline {
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
        .om-cta-outline:hover {
          transform: translateY(-1px);
          background: rgba(13, 99, 27, 0.04);
          box-shadow: 0 4px 12px rgba(13, 99, 27, 0.1);
        }
        .om-section {
          margin-bottom: 2.25rem;
        }
        .om-section-title {
          font-family: var(--font-dm-sans), sans-serif;
          font-weight: 700;
          font-size: 0.8125rem;
          color: #6B8C6B;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 0.75rem;
        }
        .om-empty {
          padding: 2rem 1.5rem;
          text-align: center;
          background: #FFFFFF;
          border-radius: 14px;
          font-size: 0.875rem;
          color: #6B8C6B;
          line-height: 1.6;
          border: 1px solid #E0EBE0;
        }
        .om-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          background: #FFFFFF;
          border: 1px solid #E0EBE0;
          border-radius: 14px;
          text-decoration: none;
          color: inherit;
          margin-bottom: 0.625rem;
          transition: transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 2px 8px rgba(26, 46, 26, 0.04);
        }
        .om-card:last-child { margin-bottom: 0; }
        .om-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(26, 46, 26, 0.1);
        }
        .om-card-info { flex: 1; min-width: 0; }
        .om-card-name {
          font-family: var(--font-dm-sans), sans-serif;
          font-weight: 600;
          font-size: 1rem;
          color: #1A2E1A;
          margin-bottom: 0.3rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .om-card-meta {
          font-size: 0.8125rem;
          color: #6B8C6B;
          display: flex;
          gap: 0.5rem;
          align-items: center;
          flex-wrap: wrap;
        }
        .om-badge {
          font-size: 0.6875rem;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 6px;
        }
        .om-badge-active {
          background: rgba(13, 99, 27, 0.1);
          color: #0D631B;
        }
        .om-badge-completed {
          background: rgba(107, 140, 107, 0.12);
          color: #4a6e4a;
        }
        .om-chev {
          color: #C8D4C8;
          font-size: 1.125rem;
          margin-left: 0.75rem;
          flex-shrink: 0;
          transition: transform 0.15s, color 0.15s;
        }
        .om-card:hover .om-chev {
          transform: translateX(2px);
          color: #0D631B;
        }
        @media (min-width: 768px) {
          .om-hero { padding: 3rem 2rem 2.25rem; }
          .om { padding-bottom: 0; }
        }
      `}</style>

      <div className="om">
        <div className="om-hero">
          <Image src="/hero.jpg" alt="" fill className="om-hero-img" priority />
          <div className="om-hero-overlay" />
          <div className="om-hero-inner">
            <h1 className="om-title">Order of Merit</h1>
            <p className="om-subtitle">Season-long points competitions</p>
          </div>
        </div>

        <main className="om-main">

          <div className="om-cta-row">
            <Link href="/merit/new" className="om-cta-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75"/>
                <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              </svg>
              New Order of Merit
            </Link>
            <Link href="/tournaments" className="om-cta-outline">
              Tournaments
            </Link>
          </div>

          <section className="om-section">
            <div className="om-section-title">Active</div>
            {active.length === 0 ? (
              <div className="om-empty">No active Order of Merit series. Create one to get started.</div>
            ) : (
              active.map(m => <MeritCard key={m.id} merit={m} />)
            )}
          </section>

          {completed.length > 0 && (
            <section className="om-section">
              <div className="om-section-title">Completed</div>
              {completed.map(m => <MeritCard key={m.id} merit={m} />)}
            </section>
          )}

        </main>
      </div>

      <BottomNav active="events" />
    </>
  )
}

function MeritCard({ merit: m }: { merit: MeritRow }) {
  const statusLabel = m.status === 'active' ? 'Active' : 'Completed'
  const statusClass = m.status === 'active' ? 'om-badge-active' : 'om-badge-completed'

  return (
    <Link href={`/merit/${m.id}`} className="om-card">
      <div className="om-card-info">
        <div className="om-card-name">{m.name}</div>
        <div className="om-card-meta">
          <span>{m.season_year} Season</span>
          <span className={`om-badge ${statusClass}`}>{statusLabel}</span>
        </div>
      </div>
      <div className="om-chev">›</div>
    </Link>
  )
}
