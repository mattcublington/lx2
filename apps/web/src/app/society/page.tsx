import { redirect } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/BottomNav'

export default async function SocietyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <>
      <style>{`
        .sp {
          min-height: 100dvh;
          background: #F0F4EC;
          font-family: var(--font-lexend), system-ui, sans-serif;
          color: #1A1C1C;
          padding-bottom: max(80px, calc(80px + env(safe-area-inset-bottom)));
        }
        .sp-hd {
          background: #F0F4EC;
          padding: 1rem 1.25rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .sp-main {
          padding: 1.5rem 1.25rem;
          max-width: 480px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: calc(100dvh - 120px);
          text-align: center;
        }
        .sp-icon {
          width: 64px;
          height: 64px;
          border-radius: 20px;
          background: rgba(13, 99, 27, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
          color: #0D631B;
        }
        .sp-title {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 800;
          font-size: 1.5rem;
          color: #1A2E1A;
          margin-bottom: 0.75rem;
          letter-spacing: -0.02em;
        }
        .sp-body {
          font-size: 0.9375rem;
          color: #6B8C6B;
          line-height: 1.6;
          max-width: 280px;
        }
        @media (min-width: 768px) {
          .sp-main { max-width: 560px; padding: 2rem; }
          .sp { padding-bottom: 0; }
        }
      `}</style>

      <div className="sp">
        <header className="sp-hd">
          <Image src="/lx2-logo.svg" alt="LX2" width={72} height={36} priority />
        </header>

        <main className="sp-main">
          <div className="sp-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.75"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="sp-title">Society</h1>
          <p className="sp-body">
            Society features are coming soon — leaderboards, season standings, and member stats for your golf society.
          </p>
        </main>
      </div>

      <BottomNav active="society" />
    </>
  )
}
