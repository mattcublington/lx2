import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/BottomNav'
import MeritManageClient from './MeritManageClient'
import type { MeritEntry, AvailableItem } from './MeritManageClient'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function MeritManagePage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: merit } = await supabase
    .from('order_of_merits')
    .select('id, name, season_year, status, created_by')
    .eq('id', id)
    .single()

  if (!merit) notFound()
  if (merit.created_by !== user.id) redirect(`/merit/${id}`)

  // Current entries
  const { data: rawEntries } = await supabase
    .from('order_of_merit_entries')
    .select('id, event_id, tournament_id, points_multiplier')
    .eq('merit_id', id)
    .order('created_at', { ascending: true })

  const entryRows = rawEntries ?? []

  // Resolve entry labels
  const entries: MeritEntry[] = []
  const includedEventIds = new Set<string>()
  const includedTournamentIds = new Set<string>()

  for (const row of entryRows) {
    if (row.event_id) {
      includedEventIds.add(row.event_id as string)
      const { data: ev } = await supabase
        .from('events')
        .select('name, date')
        .eq('id', row.event_id as string)
        .single()

      entries.push({
        id: row.id as string,
        label: ev?.name ?? 'Unknown event',
        date: ev?.date ?? null,
        type: 'event',
        refId: row.event_id as string,
        multiplier: row.points_multiplier as number,
      })
    } else if (row.tournament_id) {
      includedTournamentIds.add(row.tournament_id as string)
      const { data: t } = await supabase
        .from('tournaments')
        .select('name')
        .eq('id', row.tournament_id as string)
        .single()

      entries.push({
        id: row.id as string,
        label: t?.name ?? 'Unknown tournament',
        date: null,
        type: 'tournament',
        refId: row.tournament_id as string,
        multiplier: row.points_multiplier as number,
      })
    }
  }

  // Available events (organised by user, not already included)
  const { data: rawEvents } = await supabase
    .from('events')
    .select('id, name, date')
    .eq('created_by', user.id)
    .is('archived_at', null)
    .order('date', { ascending: false })

  // Available tournaments (organised by user, not already included)
  const { data: rawTournaments } = await supabase
    .from('tournaments')
    .select('id, name')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })

  const available: AvailableItem[] = [
    ...((rawEvents ?? [])
      .filter(e => !includedEventIds.has(e.id as string))
      .map(e => ({
        id: e.id as string,
        name: e.name as string,
        type: 'event' as const,
        date: e.date as string,
      }))),
    ...((rawTournaments ?? [])
      .filter(t => !includedTournamentIds.has(t.id as string))
      .map(t => ({
        id: t.id as string,
        name: t.name as string,
        type: 'tournament' as const,
      }))),
  ]

  return (
    <>
      <style>{`
        .mm-page {
          min-height: 100dvh;
          background: #F2F5F0;
          font-family: var(--font-dm-sans), system-ui, sans-serif;
          color: #1A2E1A;
          padding-bottom: max(80px, calc(80px + env(safe-area-inset-bottom)));
        }
        .mm-hero {
          position: relative;
          width: 100%;
          height: 160px;
          overflow: hidden;
        }
        .mm-hero-img {
          position: absolute;
          inset: 0;
          object-fit: cover;
          width: 100%;
          height: 100%;
        }
        .mm-hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(10,31,10,0.6) 0%, rgba(10,31,10,0.4) 60%, rgba(10,31,10,0.25) 100%);
          z-index: 1;
        }
        .mm-hero-content {
          position: absolute;
          inset: 0;
          z-index: 2;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 1rem 1.5rem;
        }
        .mm-back {
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
          align-self: flex-start;
        }
        .mm-back:hover { background: rgba(255,255,255,0.15); color: #fff; }
        .mm-hero-title {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 800;
          font-size: clamp(1.25rem, 3.5vw, 1.75rem);
          color: #fff;
          margin: 0;
          letter-spacing: -0.01em;
          text-shadow: 0 1px 4px rgba(0,0,0,0.3);
        }

        /* ── Main ── */
        .mm-main {
          padding: 1.5rem 2rem;
          max-width: 900px;
          margin: 0 auto;
        }

        /* ── Cards ── */
        .mm-card {
          background: #fff;
          border: 1px solid #E0EBE0;
          border-radius: 16px;
          padding: 20px 22px;
          margin-bottom: 1.25rem;
          box-shadow: 0 2px 8px rgba(26,46,26,0.04);
        }
        .mm-card-full { width: 100%; }
        .mm-card-label {
          font-family: var(--font-dm-sans), sans-serif;
          font-weight: 700;
          font-size: 0.8125rem;
          color: #6B8C6B;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .mm-card-desc {
          font-size: 0.875rem;
          color: #6B8C6B;
          margin: 0 0 14px;
          line-height: 1.5;
          font-family: var(--font-dm-sans), sans-serif;
        }
        .mm-empty {
          padding: 16px;
          text-align: center;
          font-size: 0.875rem;
          color: #6B8C6B;
          background: #F2F5F0;
          border-radius: 10px;
        }
        .mm-empty-available {
          font-size: 0.875rem;
          color: #6B8C6B;
          font-family: var(--font-dm-sans), sans-serif;
        }

        /* ── Entry list ── */
        .mm-entry-list { display: flex; flex-direction: column; gap: 0; }
        .mm-entry-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 0;
          border-bottom: 1px solid #F2F5F0;
        }
        .mm-entry-row:last-child { border-bottom: none; }
        .mm-entry-info { flex: 1; min-width: 0; }
        .mm-entry-name {
          font-size: 0.9375rem;
          font-weight: 500;
          color: #1A2E1A;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-family: var(--font-dm-sans), sans-serif;
        }
        .mm-entry-meta {
          font-size: 0.8125rem;
          color: #6B8C6B;
          margin-top: 2px;
          font-family: var(--font-dm-sans), sans-serif;
        }
        .mm-entry-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }
        .mm-badge {
          display: inline-block;
          font-size: 0.6875rem;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 6px;
          margin-top: 4px;
        }
        .mm-badge-event {
          background: rgba(13,99,27,0.08);
          color: #0D631B;
        }
        .mm-badge-tournament {
          background: rgba(107,140,107,0.12);
          color: #4a6e4a;
        }
        .mm-multiplier-input {
          width: 72px;
          padding: 6px 8px;
          border: 1.5px solid #E0EBE0;
          border-radius: 8px;
          font-size: 0.875rem;
          font-family: var(--font-dm-sans), sans-serif;
          text-align: center;
          outline: none;
          transition: border-color 0.15s;
          background: #fff;
        }
        .mm-multiplier-input:focus { border-color: #0D631B; }

        /* ── Buttons ── */
        .mm-btn-remove {
          padding: 6px 12px;
          border: 1.5px solid #fecaca;
          background: #fff;
          color: #dc2626;
          border-radius: 8px;
          font-size: 0.8125rem;
          font-family: var(--font-dm-sans), sans-serif;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }
        .mm-btn-remove:hover { background: #fef2f2; }
        .mm-btn-remove:disabled { opacity: 0.5; cursor: not-allowed; }

        .mm-btn-add {
          padding: 10px 20px;
          background: linear-gradient(135deg, #0D631B 0%, #0a4f15 100%);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-family: var(--font-dm-sans), sans-serif;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 4px 14px rgba(13,99,27,0.18);
          margin-top: 12px;
        }
        .mm-btn-add:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 22px rgba(13,99,27,0.25);
        }
        .mm-btn-add:disabled { opacity: 0.45; cursor: not-allowed; }

        .mm-btn-complete {
          padding: 10px 20px;
          background: linear-gradient(135deg, #0D631B 0%, #0a4f15 100%);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-family: var(--font-dm-sans), sans-serif;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 4px 14px rgba(13,99,27,0.18);
        }
        .mm-btn-complete:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 22px rgba(13,99,27,0.25);
        }
        .mm-btn-complete:disabled { opacity: 0.45; cursor: not-allowed; }

        .mm-btn-reopen {
          padding: 10px 20px;
          background: #fff;
          color: #1A2E1A;
          border: 1.5px solid #E0EBE0;
          border-radius: 12px;
          font-family: var(--font-dm-sans), sans-serif;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.15s;
        }
        .mm-btn-reopen:hover:not(:disabled) {
          background: #F2F5F0;
          border-color: #C8D4C8;
        }
        .mm-btn-reopen:disabled { opacity: 0.45; cursor: not-allowed; }

        /* ── Form ── */
        .mm-add-form { display: flex; flex-direction: column; }
        .mm-form-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .mm-form-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
          min-width: 160px;
        }
        .mm-form-label {
          font-size: 0.8125rem;
          font-weight: 500;
          color: #374151;
          font-family: var(--font-dm-sans), sans-serif;
        }
        .mm-form-input {
          padding: 10px 12px;
          border: 1.5px solid #E0EBE0;
          border-radius: 10px;
          font-size: 0.9375rem;
          font-family: var(--font-dm-sans), sans-serif;
          color: #1A2E1A;
          background: #fff;
          outline: none;
          transition: border-color 0.15s;
        }
        .mm-form-input:focus { border-color: #0D631B; }
        .mm-form-select {
          padding: 10px 12px;
          border: 1.5px solid #E0EBE0;
          border-radius: 10px;
          font-size: 0.875rem;
          font-family: var(--font-dm-sans), sans-serif;
          color: #1A2E1A;
          background: #fff;
          outline: none;
          transition: border-color 0.15s;
        }
        .mm-form-select:focus { border-color: #0D631B; }

        @media (min-width: 768px) {
          .mm-hero { height: 180px; }
          .mm-page { padding-bottom: 0; }
        }
      `}</style>

      <div className="mm-page">
        <div className="mm-hero">
          <Image src="/hero.jpg" alt="" fill className="mm-hero-img" priority />
          <div className="mm-hero-overlay" />
          <div className="mm-hero-content">
            <Link href={`/merit/${id}`} className="mm-back">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </Link>
            <h1 className="mm-hero-title">Manage: {merit.name as string}</h1>
          </div>
        </div>

        <main className="mm-main">
          <MeritManageClient
            meritId={id}
            meritName={merit.name as string}
            status={merit.status as string}
            entries={entries}
            available={available}
          />
        </main>
      </div>

      <BottomNav active="events" />
    </>
  )
}
