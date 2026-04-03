import Link from 'next/link'
import { listUploads } from './actions'
import type { UploadRow } from './actions'

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
          background: #0a1f0a;
          background-image: radial-gradient(ellipse at 20% 50%, rgba(13,99,27,0.35) 0%, transparent 60%),
                            radial-gradient(ellipse at 80% 20%, rgba(61,107,26,0.2) 0%, transparent 50%);
          padding: 1.5rem 2rem 1.25rem;
        }
        .aq-header-inner { max-width: 1200px; margin: 0 auto; }
        .aq-back {
          display: inline-flex; align-items: center; gap: 6px;
          color: rgba(255,255,255,0.6); text-decoration: none;
          font-size: 0.8125rem; font-weight: 500;
          padding: 5px 9px; border-radius: 8px;
          transition: background 0.15s, color 0.15s;
          margin-bottom: 12px;
        }
        .aq-back:hover { background: rgba(255,255,255,0.1); color: #fff; }
        .aq-title {
          font-family: var(--font-dm-serif), Georgia, serif;
          font-size: clamp(1.5rem, 4vw, 2rem);
          color: #fff; margin: 0 0 4px;
          letter-spacing: -0.02em;
        }
        .aq-subtitle { font-size: 0.8125rem; color: rgba(255,255,255,0.5); }

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

        /* ── Review link ── */
        .aq-review-link {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 6px 12px; border-radius: 8px;
          border: 1.5px solid #0D631B; background: #fff; color: #0D631B;
          font-size: 0.8125rem; font-weight: 600; text-decoration: none;
          transition: background 0.15s, transform 0.15s;
          white-space: nowrap;
        }
        .aq-review-link:hover { background: rgba(13,99,27,0.04); transform: translateY(-1px); }

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
          .aq-table th:nth-child(3),
          .aq-table td:nth-child(3),
          .aq-table th:nth-child(4),
          .aq-table td:nth-child(4) { display: none; }
        }
      `}</style>

      <div className="aq">

        {/* ── Header ── */}
        <div className="aq-header">
          <div className="aq-header-inner">
            <Link href="/play" className="aq-back">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
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
                      <tr key={row.id}>
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
                          <Link href={`/admin/scorecards/${row.id}`} className="aq-review-link">
                            Review →
                          </Link>
                        </td>
                      </tr>
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
