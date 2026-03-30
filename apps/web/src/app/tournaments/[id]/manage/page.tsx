import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/BottomNav'
import TournamentManageClient from './TournamentManageClient'
import type { Round, CourseCombination } from './TournamentManageClient'

interface PageProps {
  params: Promise<{ id: string }>
}

const FORMAT_LABEL: Record<string, string> = {
  stableford: 'Stableford',
  strokeplay: 'Stroke Play',
  matchplay: 'Match Play',
}

export default async function TournamentManagePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?redirect=/tournaments/${id}/manage`)

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, format, dns_policy, finalised, status, created_by, handicap_allowance_pct')
    .eq('id', id)
    .single()

  if (!tournament) redirect('/tournaments')
  if (tournament.created_by !== user.id) redirect(`/tournaments/${id}`)

  // Fetch rounds for this tournament
  const { data: rawRounds } = await supabase
    .from('events')
    .select('id, name, date, finalised, round_number, course_combinations(id, name)')
    .eq('tournament_id', id)
    .order('round_number', { ascending: true })

  const rounds: Round[] = (rawRounds ?? []).map(r => {
    const combo = r.course_combinations as unknown as { id: string; name: string } | null
    return {
      id: r.id,
      name: r.name,
      date: r.date,
      finalised: !!r.finalised,
      round_number: (r.round_number as number) ?? 1,
      courseName: combo?.name ?? null,
    }
  })

  // Fetch all course combinations for the add-round form
  const { data: rawCombos } = await supabase
    .from('course_combinations')
    .select('id, name')
    .order('name')

  const combinations: CourseCombination[] = (rawCombos ?? []).map(c => ({
    id: c.id,
    name: c.name,
  }))

  const allowancePct = Math.round(Number(tournament.handicap_allowance_pct ?? 1) * 100)
  const formatLabel = FORMAT_LABEL[tournament.format as string] ?? (tournament.format as string)

  return (
    <>
      <style>{`
        .mg {
          min-height: 100dvh;
          background: #F2F5F0;
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
        @media (min-width: 768px) { .mg-hero { height: 180px; } }

        /* ── Body ── */
        .mg-body { padding: 1.5rem 2rem; }
        .mg-inner {
          max-width: 1200px; margin: 0 auto;
          display: flex; flex-direction: column; gap: 1rem;
        }

        /* ── Card ── */
        .mg-card {
          background: #fff; border-radius: 16px; border: 1px solid #E0EBE0;
          padding: 1.25rem;
          box-shadow: 0 4px 12px rgba(26,46,26,0.04);
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
          padding: 8px 0; border-bottom: 1px solid rgba(26,46,26,0.06);
          font-family: var(--font-dm-sans), sans-serif;
        }
        .mg-meta-row:last-child { border-bottom: none; }
        .mg-meta-key { font-size: 0.8125rem; color: #6B8C6B; }
        .mg-meta-val { font-size: 0.8125rem; font-weight: 500; color: #1A2E1A; }

        /* ── Round list ── */
        .mg-round-list { display: flex; flex-direction: column; gap: 10px; }
        .mg-round-row {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 12px; padding: 12px 14px; border-radius: 12px;
          background: #F2F5F0; border: 1px solid #E0EBE0;
        }
        .mg-round-info { flex: 1; min-width: 0; }
        .mg-round-label {
          font-size: 0.6875rem; font-weight: 700; color: #6B8C6B;
          text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;
        }
        .mg-round-name {
          font-family: var(--font-dm-sans), sans-serif;
          font-weight: 600;
          font-size: 0.9375rem; color: #1A2E1A; margin-bottom: 4px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .mg-round-meta {
          font-size: 0.8125rem; color: #6B8C6B;
          margin-bottom: 6px; line-height: 1.4;
        }
        .mg-round-right {
          display: flex; flex-direction: column; align-items: flex-end; gap: 8px;
          flex-shrink: 0;
        }
        .mg-round-actions {
          display: flex; align-items: center; gap: 6px;
        }

        /* ── Badges ── */
        .mg-badge {
          display: inline-flex; align-items: center;
          padding: 3px 8px; border-radius: 9999px;
          font-size: 0.6875rem; font-weight: 600;
          font-family: var(--font-dm-sans), sans-serif;
        }
        .mg-badge-finalised { background: rgba(13,99,27,0.1); color: #0D631B; }
        .mg-badge-past      { background: rgba(180,100,0,0.1); color: #a05800; }
        .mg-badge-upcoming  { background: rgba(107,140,107,0.12); color: #4a6e4a; }

        /* ── Buttons ── */
        .mg-btn-event-manage {
          display: inline-flex; align-items: center;
          padding: 6px 12px; border: 1.5px solid #0D631B; border-radius: 8px;
          background: #fff; color: #0D631B;
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.8125rem; font-weight: 600; text-decoration: none;
          transition: background 0.15s, transform 0.15s;
          white-space: nowrap;
        }
        .mg-btn-event-manage:hover {
          background: rgba(13,99,27,0.04);
          transform: translateY(-1px);
        }
        .mg-btn-icon {
          width: 30px; height: 30px; border-radius: 8px;
          border: 1px solid #E0EBE0; background: #fff;
          font-size: 0.875rem; color: #1A2E1A; cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center;
          transition: background 0.15s, border-color 0.15s;
          font-family: var(--font-dm-sans), sans-serif;
        }
        .mg-btn-icon:hover:not(:disabled) { background: #F2F5F0; border-color: #6B8C6B; }
        .mg-btn-icon:disabled { opacity: 0.35; cursor: not-allowed; }
        .mg-btn-remove {
          padding: 5px 10px; border-radius: 8px;
          border: 1.5px solid #dc2626; background: #fff; color: #dc2626;
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.75rem; font-weight: 600; cursor: pointer;
          transition: background 0.15s;
        }
        .mg-btn-remove:hover:not(:disabled) { background: rgba(220,38,38,0.06); }
        .mg-btn-remove:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Add round form ── */
        .mg-add-form { display: flex; flex-direction: column; gap: 12px; }
        .mg-form-row {
          display: grid; gap: 10px;
          grid-template-columns: 1fr;
        }
        @media (min-width: 768px) {
          .mg-form-row { grid-template-columns: 2fr 1fr 2fr; }
        }
        .mg-form-field { display: flex; flex-direction: column; gap: 4px; }
        .mg-form-label {
          font-size: 0.75rem; font-weight: 600; color: #6B8C6B;
          font-family: var(--font-dm-sans), sans-serif;
        }
        .mg-form-input,
        .mg-form-select {
          padding: 9px 12px; border: 1.5px solid #E0EBE0; border-radius: 10px;
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.875rem; color: #1A2E1A; background: #fff;
          transition: border-color 0.15s;
          appearance: auto;
        }
        .mg-form-input:focus,
        .mg-form-select:focus {
          outline: none; border-color: #0D631B;
        }
        .mg-btn-add {
          align-self: flex-start;
          padding: 10px 20px; border-radius: 12px;
          border: none; background: linear-gradient(135deg, #0D631B 0%, #0a4f15 100%);
          color: #fff; font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.875rem; font-weight: 600; cursor: pointer;
          transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 4px 12px rgba(13,99,27,0.2);
        }
        .mg-btn-add:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(13,99,27,0.28);
        }
        .mg-btn-add:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Finalise / Reopen ── */
        .mg-btn-finalise {
          width: 100%; padding: 13px;
          border-radius: 12px; border: none;
          background: linear-gradient(135deg, #0D631B 0%, #0a4f15 100%);
          color: #fff; font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.9375rem; font-weight: 600; cursor: pointer;
          box-shadow: 0 4px 12px rgba(13,99,27,0.2);
          transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;
        }
        .mg-btn-finalise:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(13,99,27,0.3);
        }
        .mg-btn-finalise:disabled { opacity: 0.6; cursor: not-allowed; }
        .mg-btn-reopen {
          width: 100%; padding: 13px;
          border-radius: 12px;
          border: 2px solid #d97706; background: #fff;
          color: #d97706; font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.9375rem; font-weight: 600; cursor: pointer;
          transition: background 0.15s, transform 0.15s;
        }
        .mg-btn-reopen:hover:not(:disabled) {
          background: rgba(217,119,6,0.06);
          transform: translateY(-1px);
        }
        .mg-btn-reopen:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ── Empty state ── */
        .mg-empty {
          padding: 16px; font-size: 0.875rem; color: #6B8C6B;
          font-family: var(--font-dm-sans), sans-serif; text-align: center;
        }

        /* ── Animations ── */
        .mg-inner > * {
          animation: mg-rise 0.45s cubic-bezier(0.2, 0, 0, 1) both;
        }
        .mg-inner > :nth-child(1) { animation-delay: 0s; }
        .mg-inner > :nth-child(2) { animation-delay: 0.04s; }
        .mg-inner > :nth-child(3) { animation-delay: 0.08s; }
        .mg-inner > :nth-child(4) { animation-delay: 0.12s; }
        .mg-inner > :nth-child(5) { animation-delay: 0.16s; }
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
            <Link href={`/tournaments/${id}`} className="mg-hero-back">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Tournament
            </Link>
            <div className="mg-hero-eyebrow">Managing tournament</div>
            <h1 className="mg-hero-title">{tournament.name}</h1>
          </div>
        </div>

        {/* ── Body ── */}
        <main className="mg-body">
          <div className="mg-inner">

            {/* Quick links */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
              <Link
                href={`/tournaments/${id}`}
                style={{
                  padding: '8px 16px', border: '1.5px solid #E0EBE0', borderRadius: 12,
                  background: '#fff', fontSize: '0.875rem', fontWeight: 500,
                  fontFamily: 'var(--font-dm-sans), sans-serif', color: '#1A2E1A',
                  textDecoration: 'none',
                }}
              >
                ← Overview
              </Link>
              <span style={{
                padding: '8px 16px', borderRadius: 12,
                background: tournament.finalised ? 'rgba(217,119,6,0.1)' : 'rgba(13,99,27,0.1)',
                fontSize: '0.875rem', fontWeight: 600,
                fontFamily: 'var(--font-dm-sans), sans-serif',
                color: tournament.finalised ? '#d97706' : '#0D631B',
              }}>
                {tournament.finalised ? 'Finalised' :
                  tournament.status === 'in_progress' ? 'In Progress' : 'Upcoming'}
              </span>
            </div>

            {/* Client-rendered interactive sections */}
            <TournamentManageClient
              tournamentId={id}
              rounds={rounds}
              combinations={combinations}
              finalised={!!tournament.finalised}
              format={formatLabel}
              handicapAllowancePct={allowancePct}
            />

          </div>
        </main>

      </div>

      <BottomNav active="events" />
    </>
  )
}
