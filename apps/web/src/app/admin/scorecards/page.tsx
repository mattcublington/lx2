import Link from 'next/link'
import Image from 'next/image'
import { listUploads } from './actions'
import type { UploadRow } from './actions'
import ClickableRow from './ClickableRow'
import { DeleteRowButton, DeleteAllRejectedButton, DeleteAllPendingButton } from './DeleteControls'

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

type StatusFilter = 'pending' | 'approved' | 'rejected' | undefined

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function StatusBadge({ status }: { status: UploadRow['status'] }) {
  const map = {
    pending:  { label: 'Pending',  cls: 'badge-pending'  },
    approved: { label: 'Approved', cls: 'badge-approved' },
    rejected: { label: 'Rejected', cls: 'badge-rejected' },
  }
  const { label, cls } = map[status]
  return <span className={`badge ${cls}`}>{label}</span>
}

export default async function AdminScorecardsPage({ searchParams }: PageProps) {
  const { status: rawStatus } = await searchParams
  const filter = (['pending', 'approved', 'rejected'].includes(rawStatus ?? '')
    ? rawStatus
    : undefined) as StatusFilter

  const [all, pending, approved, rejected] = await Promise.all([
    listUploads(),
    listUploads('pending'),
    listUploads('approved'),
    listUploads('rejected'),
  ])

  const rows = filter === 'pending' ? pending
    : filter === 'approved' ? approved
    : filter === 'rejected' ? rejected
    : all

  const tabs: { label: string; count: number; value?: string }[] = [
    { label: 'All',      count: all.length      },
    { label: 'Pending',  count: pending.length,  value: 'pending'  },
    { label: 'Approved', count: approved.length, value: 'approved' },
    { label: 'Rejected', count: rejected.length, value: 'rejected' },
  ]

  return (
    <>
      <style>{`
        .aq { min-height: 100dvh; background: #F2F5F0; font-family: var(--font-dm-sans), system-ui, sans-serif; color: #1A2E1A; }

        /* ── Header ── */
        .aq-header {
          position: relative; width: 100%; height: 160px; overflow: hidden;
        }
        .aq-hero-img { object-fit: cover; }
        .aq-hero-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to bottom, rgba(10,31,10,0.45) 0%, rgba(10,31,10,0.75) 100%);
          z-index: 1;
        }
        .aq-header-inner {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 1.25rem 2rem; z-index: 2;
          max-width: 1200px; margin: 0 auto;
        }
        .aq-back {
          display: inline-flex; align-items: center; gap: 6px;
          color: rgba(255,255,255,0.7); text-decoration: none;
          font-size: 0.875rem; font-weight: 500;
          padding: 6px 10px; border-radius: 8px;
          transition: background 0.15s, color 0.15s;
          margin-bottom: 8px;
        }
        .aq-back:hover { background: rgba(255,255,255,0.15); color: #fff; }
        .aq-title {
          font-family: var(--font-manrope), sans-serif;
          font-weight: 800;
          font-size: clamp(1.4rem, 4vw, 2rem);
          color: #fff; margin: 0 0 4px;
          letter-spacing: -0.02em;
          text-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .aq-subtitle { font-size: 0.8125rem; color: rgba(255,255,255,0.6); text-shadow: 0 1px 4px rgba(0,0,0,0.2); }
        @media (min-width: 768px) { .aq-header { height: 180px; } }

        /* ── Stats strip ── */
        .aq-stats {
          background: #fff; border-bottom: 1px solid #E0EBE0;
        }
        .aq-stats-inner {
          max-width: 1200px; margin: 0 auto; padding: 0 2rem;
          display: flex; gap: 0;
        }
        .aq-stat {
          padding: 1rem 1.5rem 1rem 0; margin-right: 1.5rem;
          border-right: 1px solid #E0EBE0;
          display: flex; flex-direction: column; gap: 2px;
        }
        .aq-stat:last-child { border-right: none; }
        .aq-stat-num {
          font-size: 1.5rem; font-weight: 700; color: #1A2E1A;
          font-family: var(--font-dm-sans), sans-serif;
          line-height: 1;
        }
        .aq-stat-num.pending { color: #b45309; }
        .aq-stat-num.approved { color: #0D631B; }
        .aq-stat-num.rejected { color: #b43c3c; }
        .aq-stat-label { font-size: 0.75rem; color: #6B8C6B; font-weight: 500; }

        /* ── Body ── */
        .aq-body { padding: 1.5rem 2rem; }
        .aq-inner { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 1rem; }

        /* ── Tabs ── */
        .aq-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
        .aq-tab {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 14px; border-radius: 999px;
          font-size: 0.8125rem; font-weight: 500;
          text-decoration: none; color: #6B8C6B;
          border: 1.5px solid #E0EBE0; background: #fff;
          transition: border-color 0.15s, color 0.15s, background 0.15s;
        }
        .aq-tab:hover { border-color: #0D631B; color: #0D631B; }
        .aq-tab.active { border-color: #0D631B; background: #0D631B; color: #fff; }
        .aq-tab-count {
          font-size: 0.6875rem; font-weight: 700;
          background: rgba(255,255,255,0.25); border-radius: 999px;
          padding: 1px 6px;
        }
        .aq-tab.active .aq-tab-count { background: rgba(255,255,255,0.25); }
        .aq-tab:not(.active) .aq-tab-count { background: #F2F5F0; color: #6B8C6B; }

        /* ── Table card ── */
        .aq-card {
          background: #fff; border-radius: 16px; border: 1px solid #E0EBE0;
          box-shadow: 0 4px 12px rgba(26,28,28,0.04);
          overflow: hidden;
        }
        .aq-table { width: 100%; border-collapse: collapse; }
        .aq-table th {
          text-align: left; padding: 11px 16px;
          font-size: 0.6875rem; font-weight: 700; color: #6B8C6B;
          text-transform: uppercase; letter-spacing: 0.06em;
          border-bottom: 1px solid #E0EBE0; background: #F2F5F0;
          font-family: var(--font-dm-sans), sans-serif;
          white-space: nowrap;
        }
        .aq-table td {
          padding: 13px 16px; font-size: 0.875rem; color: #1A2E1A;
          border-bottom: 1px solid rgba(26,28,28,0.05);
          font-family: var(--font-dm-sans), sans-serif;
          vertical-align: middle;
        }
        .aq-table tr:last-child td { border-bottom: none; }
        .aq-table tbody tr { transition: background 0.1s; }
        .aq-table tbody tr:hover { background: #F2F5F0; }
        .aq-course-name { font-weight: 600; color: #1A2E1A; }
        .aq-hint { font-size: 0.75rem; color: #6B8C6B; margin-top: 2px; }
        .aq-muted { color: #6B8C6B; }

        /* ── Badges ── */
        .badge {
          display: inline-block; padding: 3px 9px; border-radius: 999px;
          font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.03em;
          font-family: var(--font-dm-sans), sans-serif;
          white-space: nowrap;
        }
        .badge-pending  { background: #fef3c7; color: #92400e; }
        .badge-approved { background: #dcfce7; color: #166534; }
        .badge-rejected { background: #fee2e2; color: #991b1b; }

        /* ── Row hover ── */
        .aq-table tbody tr { cursor: pointer; }
        .aq-table tbody tr:hover td { background: #F2F5F0; }

        /* ── Empty state ── */
        .aq-empty {
          padding: 3rem 1.5rem; text-align: center;
          color: #6B8C6B; font-size: 0.9375rem;
          font-family: var(--font-dm-sans), sans-serif;
        }

        /* ── Animations ── */
        .aq-inner > * { animation: aq-rise 0.4s cubic-bezier(0.2, 0, 0, 1) both; }
        .aq-inner > :nth-child(1) { animation-delay: 0s; }
        .aq-inner > :nth-child(2) { animation-delay: 0.05s; }
        .aq-inner > :nth-child(3) { animation-delay: 0.10s; }
        @keyframes aq-rise {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 767px) {
          .aq-header { padding: 1.25rem 1rem 1rem; }
          .aq-body { padding: 1rem; }
          .aq-stats-inner { padding: 0 1rem; gap: 0; overflow-x: auto; }
          .aq-stat { padding: 0.75rem 1rem 0.75rem 0; margin-right: 1rem; }
          /* Hide Country, Tees, and delete column on mobile */
          .aq-table th:nth-child(3),
          .aq-table td:nth-child(3),
          .aq-table th:nth-child(4),
          .aq-table td:nth-child(4),
          .aq-table th:last-child,
          .aq-table td:last-child { display: none; }
        }
      `}</style>

      <div className="aq">

        {/* ── Header ── */}
        <div className="aq-header">
          <Image src="/hero.jpg" alt="Golf course" fill className="aq-hero-img" sizes="100vw" quality={90} />
          <div className="aq-hero-overlay" />
          <div className="aq-header-inner">
            <Link href="/play" className="aq-back">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Play
            </Link>
            <h1 className="aq-title">Scorecard Review Queue</h1>
            <p className="aq-subtitle">Review player-submitted scorecards and approve course data</p>
          </div>
        </div>

        {/* ── Stats strip ── */}
        <div className="aq-stats">
          <div className="aq-stats-inner">
            <div className="aq-stat">
              <span className={`aq-stat-num pending`}>{pending.length}</span>
              <span className="aq-stat-label">Awaiting review</span>
            </div>
            <div className="aq-stat">
              <span className={`aq-stat-num approved`}>{approved.length}</span>
              <span className="aq-stat-label">Approved</span>
            </div>
            <div className="aq-stat">
              <span className={`aq-stat-num rejected`}>{rejected.length}</span>
              <span className="aq-stat-label">Rejected</span>
            </div>
            <div className="aq-stat">
              <span className="aq-stat-num">{all.length}</span>
              <span className="aq-stat-label">Total submissions</span>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <main className="aq-body">
          <div className="aq-inner">

            {/* ── Filter tabs ── */}
            <nav className="aq-tabs" aria-label="Filter by status">
              {tabs.map(tab => {
                const href = tab.value ? `?status=${tab.value}` : '/admin/scorecards'
                const active = filter === tab.value
                return (
                  <Link key={tab.label} href={href} className={`aq-tab${active ? ' active' : ''}`}>
                    {tab.label}
                    <span className="aq-tab-count">{tab.count}</span>
                  </Link>
                )
              })}
            </nav>

            {/* ── Bulk delete — shown on pending or rejected tabs ── */}
            {filter === 'pending' && pending.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <DeleteAllPendingButton count={pending.length} />
              </div>
            )}
            {filter === 'rejected' && rejected.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <DeleteAllRejectedButton count={rejected.length} />
              </div>
            )}

            {/* ── Table ── */}
            <div className="aq-card">
              {rows.length === 0 ? (
                <div className="aq-empty">
                  {filter ? `No ${filter} submissions` : 'No submissions yet'}
                </div>
              ) : (
                <table className="aq-table">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Uploader</th>
                      <th>Country</th>
                      <th>Tees</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <ClickableRow key={row.id} href={`/admin/scorecards/${row.id}`}>
                        <td>
                          <div className="aq-course-name">
                            {row.extracted_course_name ?? row.course_name ?? 'Unknown course'}
                          </div>
                          {row.course_name && row.extracted_course_name && row.course_name !== row.extracted_course_name && (
                            <div className="aq-hint">hint: {row.course_name}</div>
                          )}
                        </td>
                        <td className="aq-muted">{row.uploader_name ?? '—'}</td>
                        <td className="aq-muted">{row.country ?? '—'}</td>
                        <td className="aq-muted">{row.tee_count > 0 ? `${row.tee_count} tee${row.tee_count !== 1 ? 's' : ''}` : '—'}</td>
                        <td className="aq-muted">{formatDate(row.created_at)}</td>
                        <td><StatusBadge status={row.status} /></td>
                        <td>
                          {(row.status === 'rejected' || row.status === 'pending') && (
                            <DeleteRowButton id={row.id} />
                          )}
                        </td>
                      </ClickableRow>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        </main>

      </div>
    </>
  )
}
