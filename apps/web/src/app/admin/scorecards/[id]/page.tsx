import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getUploadDetail } from '../actions'
import { getSignedImageUrl } from '@/lib/scorecard-ocr'
import ReviewActions from './ReviewActions'
import type { ExtractedTee } from '@/lib/scorecard-ocr'

interface PageProps {
  params: Promise<{ id: string }>
}

const TEE_COLOURS: Record<string, string> = {
  Yellow:  '#eab308',
  White:   '#ffffff',
  Red:     '#ef4444',
  Blue:    '#3b82f6',
  Green:   '#22c55e',
  Black:   '#1a1a1a',
  Orange:  '#f97316',
  Purple:  '#a855f7',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function TeeTable({ tee }: { tee: ExtractedTee }) {
  const front = tee.holes.filter(h => h.hole <= 9)
  const back  = tee.holes.filter(h => h.hole > 9)
  const colour = TEE_COLOURS[tee.teeColour] ?? '#6B8C6B'
  const isDark = ['Black', 'Blue', 'Green', 'Purple', 'Red'].includes(tee.teeColour)

  return (
    <div className="ar-tee">
      <div className="ar-tee-header">
        <span
          className="ar-tee-dot"
          style={{ background: colour, border: tee.teeColour === 'White' ? '1.5px solid #E0EBE0' : 'none' }}
        />
        <span className="ar-tee-name">{tee.teeName}</span>
        {tee.courseRating != null && (
          <span className="ar-tee-meta">CR {tee.courseRating}</span>
        )}
        {tee.slopeRating != null && (
          <span className="ar-tee-meta">Slope {tee.slopeRating}</span>
        )}
        {tee.par != null && (
          <span className="ar-tee-meta">Par {tee.par}</span>
        )}
        <span className="ar-tee-meta">{tee.holes.length} holes</span>
      </div>
      {tee.holes.length > 0 && (
        <div className="ar-hole-grid">
          {[front, back].filter(g => g.length > 0).map((group, gi) => (
            <table key={gi} className="ar-hole-table">
              <thead>
                <tr>
                  <th>Hole</th>
                  {group.map(h => <th key={h.hole}>{h.hole}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="ar-row-label">Par</td>
                  {group.map(h => <td key={h.hole}>{h.par}</td>)}
                </tr>
                <tr>
                  <td className="ar-row-label">SI</td>
                  {group.map(h => <td key={h.hole}>{h.si}</td>)}
                </tr>
                <tr>
                  <td className="ar-row-label">Yds</td>
                  {group.map(h => <td key={h.hole}>{h.yards}</td>)}
                </tr>
              </tbody>
            </table>
          ))}
        </div>
      )}
    </div>
  )
}

export default async function ReviewPage({ params }: PageProps) {
  const { id } = await params
  const upload = await getUploadDetail(id)
  if (!upload) notFound()

  // Signed URL uses the storage path (image_url), not the upload row id
  const signedUrl = await getSignedImageUrl(upload.image_url).catch(() => null)

  const extracted = upload.extracted_data
  const displayName = extracted?.courseName ?? upload.course_name ?? 'Unknown course'

  const statusLabel = {
    pending:  'Pending review',
    approved: 'Approved',
    rejected: 'Rejected',
  }[upload.status]

  const statusCls = {
    pending:  'badge-pending',
    approved: 'badge-approved',
    rejected: 'badge-rejected',
  }[upload.status]

  return (
    <>
      <style>{`
        .ar { min-height: 100dvh; background: #F2F5F0; font-family: var(--font-dm-sans), system-ui, sans-serif; color: #1A2E1A; }

        /* ── Header ── */
        .ar-header {
          background: #0a1f0a;
          background-image: radial-gradient(ellipse at 20% 50%, rgba(13,99,27,0.35) 0%, transparent 60%);
          padding: 1.25rem 2rem;
        }
        .ar-header-inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .ar-back {
          display: inline-flex; align-items: center; gap: 6px;
          color: rgba(255,255,255,0.65); text-decoration: none;
          font-size: 0.8125rem; font-weight: 500;
          padding: 6px 10px; border-radius: 8px;
          transition: background 0.15s, color 0.15s;
        }
        .ar-back:hover { background: rgba(255,255,255,0.1); color: #fff; }
        .ar-header-title {
          font-family: var(--font-dm-serif), Georgia, serif;
          font-size: 1.125rem; color: #fff;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          flex: 1;
        }
        .badge {
          display: inline-block; padding: 4px 10px; border-radius: 999px;
          font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.03em;
          font-family: var(--font-dm-sans), sans-serif; white-space: nowrap;
          flex-shrink: 0;
        }
        .badge-pending  { background: #fef3c7; color: #92400e; }
        .badge-approved { background: #dcfce7; color: #166534; }
        .badge-rejected { background: #fee2e2; color: #991b1b; }

        /* ── Body ── */
        .ar-body { padding: 1.5rem 2rem; }
        .ar-inner {
          max-width: 1200px; margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 1.25rem;
          align-items: start;
        }

        /* ── Card ── */
        .ar-card {
          background: #fff; border-radius: 16px; border: 1px solid #E0EBE0;
          box-shadow: 0 4px 12px rgba(26,28,28,0.04);
          overflow: hidden;
        }
        .ar-card-head {
          padding: 14px 16px 12px;
          border-bottom: 1px solid #E0EBE0;
          display: flex; align-items: center; justify-content: space-between;
        }
        .ar-card-label {
          font-size: 0.6875rem; font-weight: 700; color: #6B8C6B;
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .ar-card-body { padding: 16px; display: flex; flex-direction: column; gap: 12px; }

        /* ── Scorecard image ── */
        .ar-image-wrap {
          position: relative; width: 100%; border-radius: 16px; overflow: hidden;
          background: #1A2E1A;
          min-height: 300px;
        }
        .ar-image { width: 100%; height: auto; display: block; }
        .ar-no-image {
          display: flex; align-items: center; justify-content: center;
          min-height: 300px; color: rgba(255,255,255,0.4);
          font-size: 0.875rem; font-family: var(--font-dm-sans), sans-serif;
        }

        /* ── Meta rows ── */
        .ar-meta { display: flex; flex-direction: column; }
        .ar-meta-row {
          display: flex; justify-content: space-between; align-items: baseline;
          gap: 12px; padding: 9px 0;
          border-bottom: 1px solid rgba(26,28,28,0.05);
          font-family: var(--font-dm-sans), sans-serif;
        }
        .ar-meta-row:last-child { border-bottom: none; }
        .ar-meta-key { font-size: 0.8125rem; color: #6B8C6B; flex-shrink: 0; }
        .ar-meta-val { font-size: 0.8125rem; font-weight: 500; color: #1A2E1A; text-align: right; }

        /* ── Tee section ── */
        .ar-tees { display: flex; flex-direction: column; gap: 12px; }
        .ar-tee {
          border: 1px solid #E0EBE0; border-radius: 12px; overflow: hidden;
        }
        .ar-tee-header {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 12px; background: #F2F5F0;
          font-family: var(--font-dm-sans), sans-serif;
          flex-wrap: wrap;
        }
        .ar-tee-dot {
          width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0;
        }
        .ar-tee-name { font-size: 0.875rem; font-weight: 700; color: #1A2E1A; }
        .ar-tee-meta {
          font-size: 0.75rem; color: #6B8C6B; font-weight: 500;
          background: #fff; padding: 2px 7px; border-radius: 6px;
          border: 1px solid #E0EBE0;
        }

        /* ── Hole table ── */
        .ar-hole-grid { overflow-x: auto; display: flex; flex-direction: column; gap: 0; }
        .ar-hole-table { width: 100%; border-collapse: collapse; }
        .ar-hole-table + .ar-hole-table { border-top: 1px solid #E0EBE0; }
        .ar-hole-table th {
          padding: 5px 7px; font-size: 0.6875rem; font-weight: 700;
          color: #6B8C6B; text-align: center;
          background: #F2F5F0; border-bottom: 1px solid #E0EBE0;
          font-family: var(--font-dm-sans), sans-serif;
          min-width: 32px;
        }
        .ar-hole-table th:first-child { text-align: left; min-width: 40px; }
        .ar-hole-table td {
          padding: 5px 7px; font-size: 0.75rem; color: #1A2E1A;
          text-align: center; border-bottom: 1px solid rgba(26,28,28,0.04);
          font-family: var(--font-dm-sans), sans-serif;
        }
        .ar-hole-table tr:last-child td { border-bottom: none; }
        .ar-row-label { text-align: left !important; font-weight: 600; color: #6B8C6B !important; }

        /* ── Divider ── */
        .ar-divider { height: 1px; background: #E0EBE0; margin: 0 -16px; }

        /* ── Animations ── */
        .ar-inner > * { animation: ar-rise 0.4s cubic-bezier(0.2, 0, 0, 1) both; }
        .ar-inner > :nth-child(1) { animation-delay: 0s; }
        .ar-inner > :nth-child(2) { animation-delay: 0.05s; }
        @keyframes ar-rise {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 900px) {
          .ar-inner { grid-template-columns: 1fr; }
          .ar-body { padding: 1rem; }
          .ar-header { padding: 1rem; }
        }
      `}</style>

      <div className="ar">

        {/* ── Header ── */}
        <div className="ar-header">
          <div className="ar-header-inner">
            <Link href="/admin/scorecards" className="ar-back">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Queue
            </Link>
            <span className="ar-header-title">{displayName}</span>
            <span className={`badge ${statusCls}`}>{statusLabel}</span>
          </div>
        </div>

        <main className="ar-body">
          <div className="ar-inner">

            {/* ── Left column: image + tee data ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Scorecard image */}
              <div className="ar-image-wrap">
                {signedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={signedUrl} alt="Scorecard photo" className="ar-image" />
                ) : (
                  <div className="ar-no-image">Image unavailable or expired</div>
                )}
              </div>

              {/* Tee data */}
              {extracted?.tees && extracted.tees.length > 0 && (
                <div className="ar-card">
                  <div className="ar-card-head">
                    <span className="ar-card-label">
                      Extracted tee data — {extracted.tees.length} tee{extracted.tees.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="ar-card-body">
                    <div className="ar-tees">
                      {extracted.tees.map((tee, i) => (
                        <TeeTable key={i} tee={tee} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* ── Right column: meta + review ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Course info */}
              <div className="ar-card">
                <div className="ar-card-head">
                  <span className="ar-card-label">Course info</span>
                </div>
                <div className="ar-card-body">
                  <div className="ar-meta">
                    {[
                      ['Course',   extracted?.courseName ?? '—'],
                      ['Club',     extracted?.clubName ?? '—'],
                      ['Location', extracted?.location ?? upload.country ?? '—'],
                      ['Country',  upload.country ?? '—'],
                    ].map(([k, v]) => (
                      <div key={k} className="ar-meta-row">
                        <span className="ar-meta-key">{k}</span>
                        <span className="ar-meta-val">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submission info */}
              <div className="ar-card">
                <div className="ar-card-head">
                  <span className="ar-card-label">Submission</span>
                </div>
                <div className="ar-card-body">
                  <div className="ar-meta">
                    {[
                      ['Uploaded by', upload.uploader_name ?? '—'],
                      ['Date',        formatDate(upload.created_at)],
                      ['Tees found',  extracted?.tees?.length ? String(extracted.tees.length) : '—'],
                      ['Hint name',   upload.course_name ?? '—'],
                    ].map(([k, v]) => (
                      <div key={k} className="ar-meta-row">
                        <span className="ar-meta-key">{k}</span>
                        <span className="ar-meta-val">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Review actions */}
              <div className="ar-card">
                <div className="ar-card-head">
                  <span className="ar-card-label">Review decision</span>
                </div>
                <div className="ar-card-body">
                  <ReviewActions
                    uploadId={upload.id}
                    status={upload.status}
                    existingNotes={upload.review_notes}
                    reviewerName={upload.reviewer_name}
                    reviewedAt={upload.reviewed_at}
                  />
                </div>
              </div>

            </div>

          </div>
        </main>

      </div>
    </>
  )
}
