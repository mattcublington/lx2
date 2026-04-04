'use client'

import { useState, useTransition } from 'react'
import { approveUpload, rejectUpload, updateUploadData } from '../actions'
import type { ExtractedCourseData, ExtractedTee } from '@/lib/scorecard-ocr'
import type { DuplicateCandidate } from '../actions'

interface Props {
  uploadId: string
  status: 'pending' | 'approved' | 'rejected'
  existingNotes: string | null
  reviewerName: string | null
  reviewedAt: string | null
  extractedData: ExtractedCourseData | null
  courseName: string | null
  duplicates: DuplicateCandidate[]
}

type Mode = 'idle' | 'approving' | 'rejecting' | 'editing'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function ReviewActions({
  uploadId, status, existingNotes, reviewerName, reviewedAt,
  extractedData, courseName, duplicates,
}: Props) {
  const [mode, setMode] = useState<Mode>('idle')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Edit state — mirrors extracted data fields admin can change
  const [editName, setEditName] = useState(extractedData?.courseName ?? courseName ?? '')
  const [editClub, setEditClub] = useState(extractedData?.clubName ?? '')
  const [editTees, setEditTees] = useState<ExtractedTee[]>(extractedData?.tees ?? [])

  function handleDecision(action: 'approve' | 'reject') {
    setError(null)
    startTransition(async () => {
      const result = action === 'approve'
        ? await approveUpload(uploadId, notes)
        : await rejectUpload(uploadId, notes)
      if (result.ok) {
        setMode('idle')
        setNotes('')
      } else {
        setError(result.error ?? 'An error occurred')
      }
    })
  }

  function handleSaveEdit() {
    setError(null)
    startTransition(async () => {
      const newExtracted: ExtractedCourseData = {
        ...(extractedData ?? { location: null, distanceUnit: 'metres' as const }),
        courseName: editName.trim(),
        clubName: editClub.trim(),
        tees: editTees,
      }
      const result = await updateUploadData(uploadId, {
        course_name: editName.trim(),
        extracted_data: newExtracted,
      })
      if (result.ok) {
        setMode('idle')
      } else {
        setError(result.error ?? 'Save failed')
      }
    })
  }

  function updateTeeCR(teeIndex: number, val: string) {
    setEditTees(prev => prev.map((t, i) =>
      i === teeIndex ? { ...t, courseRating: val === '' ? null : Number(val) } : t
    ))
  }
  function updateTeeSR(teeIndex: number, val: string) {
    setEditTees(prev => prev.map((t, i) =>
      i === teeIndex ? { ...t, slopeRating: val === '' ? null : Number(val) } : t
    ))
  }

  return (
    <>
      <style>{`
        .ra { display: flex; flex-direction: column; gap: 12px; font-family: var(--font-dm-sans), sans-serif; }

        /* ── Duplicate warning ── */
        .ra-dupes {
          padding: 12px 14px; border-radius: 10px;
          background: #fffbeb; border: 1.5px solid #fcd34d;
        }
        .ra-dupes-title {
          font-size: 0.75rem; font-weight: 700; color: #92400e;
          text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;
        }
        .ra-dupe-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 5px 0; border-bottom: 1px solid rgba(0,0,0,0.06); gap: 8px;
        }
        .ra-dupe-row:last-child { border-bottom: none; }
        .ra-dupe-name { font-size: 0.8125rem; font-weight: 600; color: #1A2E1A; }
        .ra-dupe-club { font-size: 0.75rem; color: #6B8C6B; }
        .ra-dupe-badge {
          font-size: 0.6875rem; font-weight: 700; padding: 2px 7px;
          border-radius: 999px; white-space: nowrap; flex-shrink: 0;
        }
        .ra-dupe-badge.verified { background: #dcfce7; color: #166534; }
        .ra-dupe-badge.unverified { background: #f3f4f6; color: #6B7280; }

        /* ── Already reviewed banner ── */
        .ra-done { padding: 12px 14px; border-radius: 12px; }
        .ra-done.approved { background: #dcfce7; border: 1.5px solid #bbf7d0; }
        .ra-done.rejected { background: #fee2e2; border: 1.5px solid #fecaca; }
        .ra-done-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
        .ra-done-status { font-size: 0.875rem; font-weight: 700; }
        .ra-done.approved .ra-done-status { color: #166534; }
        .ra-done.rejected .ra-done-status { color: #991b1b; }
        .ra-done-meta { font-size: 0.75rem; color: #6B8C6B; }
        .ra-done-notes { font-size: 0.8125rem; color: #1A2E1A; font-style: italic; }
        .ra-re-review {
          font-size: 0.8125rem; color: #6B8C6B; text-decoration: underline;
          background: none; border: none; cursor: pointer; padding: 0;
          font-family: var(--font-dm-sans), sans-serif;
        }
        .ra-re-review:hover { color: #1A2E1A; }

        /* ── Action buttons ── */
        .ra-buttons { display: flex; gap: 8px; }
        .ra-btn {
          flex: 1; padding: 11px 16px; border-radius: 10px;
          font-size: 0.875rem; font-weight: 600;
          font-family: var(--font-dm-sans), sans-serif;
          cursor: pointer; border: none; transition: opacity 0.15s, transform 0.15s;
        }
        .ra-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .ra-btn:not(:disabled):hover { transform: translateY(-1px); }
        .ra-btn.approve {
          background: linear-gradient(135deg, #0D631B 0%, #0a4f15 100%);
          color: #fff; box-shadow: 0 4px 12px rgba(13,99,27,0.25);
        }
        .ra-btn.approve:not(:disabled):hover { box-shadow: 0 6px 16px rgba(13,99,27,0.35); }
        .ra-btn.reject { background: #fff; color: #b43c3c; border: 1.5px solid #fca5a5; }
        .ra-btn.reject:not(:disabled):hover { background: #fee2e2; }
        .ra-btn.edit { flex: none; background: #F2F5F0; color: #1A2E1A; border: 1.5px solid #E0EBE0; }
        .ra-btn.edit:not(:disabled):hover { background: #e8eee6; }
        .ra-btn.cancel { flex: none; background: #F2F5F0; color: #6B8C6B; border: 1.5px solid #E0EBE0; }
        .ra-btn.save { background: linear-gradient(135deg, #0D631B 0%, #0a4f15 100%); color: #fff; }

        /* ── Forms ── */
        .ra-form { display: flex; flex-direction: column; gap: 8px; }
        .ra-form-label { font-size: 0.8125rem; font-weight: 600; color: #1A2E1A; }
        .ra-form-sub { font-size: 0.75rem; color: #6B8C6B; margin-top: 2px; }
        .ra-textarea {
          width: 100%; min-height: 80px; padding: 10px 12px;
          border: 1.5px solid #E0EBE0; border-radius: 10px;
          font-size: 0.875rem; color: #1A2E1A;
          font-family: var(--font-dm-sans), sans-serif;
          resize: vertical; outline: none; transition: border-color 0.15s;
          box-sizing: border-box;
        }
        .ra-textarea:focus { border-color: #0D631B; }
        .ra-textarea.reject-mode:focus { border-color: #b43c3c; }
        .ra-input {
          width: 100%; padding: 8px 10px;
          border: 1.5px solid #E0EBE0; border-radius: 8px;
          font-size: 0.875rem; color: #1A2E1A;
          font-family: var(--font-dm-sans), sans-serif;
          outline: none; transition: border-color 0.15s;
          box-sizing: border-box;
        }
        .ra-input:focus { border-color: #0D631B; }

        /* ── Edit tees ── */
        .ra-tee-grid { display: flex; flex-direction: column; gap: 6px; }
        .ra-tee-row {
          display: flex; align-items: center; gap: 8px; padding: 8px 10px;
          background: #F2F5F0; border-radius: 8px;
        }
        .ra-tee-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .ra-tee-label { font-size: 0.8125rem; font-weight: 600; color: #1A2E1A; flex: 1; }
        .ra-tee-field { display: flex; flex-direction: column; gap: 2px; }
        .ra-tee-field-lbl { font-size: 0.625rem; color: #6B8C6B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
        .ra-tee-input {
          width: 60px; padding: 5px 7px;
          border: 1.5px solid #E0EBE0; border-radius: 6px;
          font-size: 0.8125rem; color: #1A2E1A;
          font-family: var(--font-dm-sans), sans-serif;
          outline: none; transition: border-color 0.15s;
          box-sizing: border-box;
        }
        .ra-tee-input:focus { border-color: #0D631B; }

        /* ── Error ── */
        .ra-error { padding: 10px 12px; background: #fee2e2; border-radius: 8px; color: #991b1b; font-size: 0.8125rem; }

        /* ── Divider ── */
        .ra-divider { height: 1px; background: #E0EBE0; }
      `}</style>

      <div className="ra">

        {/* ── Duplicate warning ── */}
        {duplicates.length > 0 && (
          <div className="ra-dupes">
            <div className="ra-dupes-title">⚠ Possible duplicates in database</div>
            {duplicates.map(d => (
              <div key={d.id} className="ra-dupe-row">
                <div>
                  <div className="ra-dupe-name">{d.name}</div>
                  {d.club && <div className="ra-dupe-club">{d.club}</div>}
                </div>
                <span className={`ra-dupe-badge ${d.verified ? 'verified' : 'unverified'}`}>
                  {d.verified ? 'Verified' : d.source === 'ocr' ? 'OCR / unverified' : 'Unverified'}
                </span>
              </div>
            ))}
          </div>
        )}

        {error && <div className="ra-error">{error}</div>}

        {/* ── Already reviewed banner ── */}
        {(status === 'approved' || status === 'rejected') && mode === 'idle' && (
          <div className={`ra-done ${status}`}>
            <div className="ra-done-header">
              <span className="ra-done-status">
                {status === 'approved' ? '✓ Approved' : '✕ Rejected'}
              </span>
              <button className="ra-re-review" onClick={() => setMode(status === 'approved' ? 'rejecting' : 'approving')}>
                Re-review
              </button>
            </div>
            {reviewerName && reviewedAt && (
              <div className="ra-done-meta">by {reviewerName} · {formatDate(reviewedAt)}</div>
            )}
            {existingNotes && (
              <div className="ra-done-notes" style={{ marginTop: 6 }}>&ldquo;{existingNotes}&rdquo;</div>
            )}
          </div>
        )}

        {/* ── Main action row ── */}
        {mode === 'idle' && (
          <div className="ra-buttons">
            <button className="ra-btn approve" onClick={() => setMode('approving')} disabled={isPending}>
              Approve
            </button>
            <button className="ra-btn reject" onClick={() => setMode('rejecting')} disabled={isPending}>
              Reject
            </button>
            <button className="ra-btn edit" onClick={() => setMode('editing')} disabled={isPending} title="Edit extracted data">
              Edit
            </button>
          </div>
        )}

        {/* ── Approve form ── */}
        {mode === 'approving' && (
          <div className="ra-form">
            <div>
              <div className="ra-form-label">Approve this scorecard?</div>
              <div className="ra-form-sub">Optional — add a note for the record</div>
            </div>
            <textarea
              className="ra-textarea"
              placeholder="Notes (optional)…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={isPending}
            />
            <div className="ra-buttons">
              <button className="ra-btn approve" onClick={() => handleDecision('approve')} disabled={isPending}>
                {isPending ? 'Approving…' : 'Confirm Approve'}
              </button>
              <button className="ra-btn cancel" onClick={() => { setMode('idle'); setNotes(''); setError(null) }} disabled={isPending}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Reject form ── */}
        {mode === 'rejecting' && (
          <div className="ra-form">
            <div>
              <div className="ra-form-label">Reject this scorecard</div>
              <div className="ra-form-sub">Required — explain why (e.g. blurry image, wrong course)</div>
            </div>
            <textarea
              className="ra-textarea reject-mode"
              placeholder="Reason for rejection…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={isPending}
            />
            <div className="ra-buttons">
              <button className="ra-btn reject" onClick={() => handleDecision('reject')} disabled={isPending}>
                {isPending ? 'Rejecting…' : 'Confirm Reject'}
              </button>
              <button className="ra-btn cancel" onClick={() => { setMode('idle'); setNotes(''); setError(null) }} disabled={isPending}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Edit form ── */}
        {mode === 'editing' && (
          <div className="ra-form">
            <div>
              <div className="ra-form-label">Edit extracted data</div>
              <div className="ra-form-sub">Correct any errors before approving</div>
            </div>

            <div className="ra-divider" />

            <div>
              <div className="ra-form-sub" style={{ marginBottom: 4 }}>Course name</div>
              <input
                className="ra-input"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Course name"
                disabled={isPending}
              />
            </div>
            <div>
              <div className="ra-form-sub" style={{ marginBottom: 4 }}>Club name</div>
              <input
                className="ra-input"
                value={editClub}
                onChange={e => setEditClub(e.target.value)}
                placeholder="Club name"
                disabled={isPending}
              />
            </div>

            {editTees.length > 0 && (
              <div>
                <div className="ra-form-sub" style={{ marginBottom: 6 }}>Tee ratings</div>
                <div className="ra-tee-grid">
                  {editTees.map((tee, i) => (
                    <div key={i} className="ra-tee-row">
                      <span
                        className="ra-tee-dot"
                        style={{
                          background: TEE_COLOURS[tee.teeColour] ?? '#6B8C6B',
                          border: tee.teeColour === 'White' ? '1px solid #E0EBE0' : 'none',
                        }}
                      />
                      <span className="ra-tee-label">{tee.teeName}</span>
                      <div className="ra-tee-field">
                        <span className="ra-tee-field-lbl">CR</span>
                        <input
                          type="number"
                          step={0.1}
                          className="ra-tee-input"
                          value={tee.courseRating ?? ''}
                          onChange={e => updateTeeCR(i, e.target.value)}
                          placeholder="—"
                          disabled={isPending}
                        />
                      </div>
                      <div className="ra-tee-field">
                        <span className="ra-tee-field-lbl">Slope</span>
                        <input
                          type="number"
                          className="ra-tee-input"
                          value={tee.slopeRating ?? ''}
                          onChange={e => updateTeeSR(i, e.target.value)}
                          placeholder="—"
                          disabled={isPending}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="ra-buttons">
              <button className="ra-btn save" onClick={handleSaveEdit} disabled={isPending}>
                {isPending ? 'Saving…' : 'Save changes'}
              </button>
              <button className="ra-btn cancel" onClick={() => { setMode('idle'); setError(null) }} disabled={isPending}>
                Cancel
              </button>
            </div>
          </div>
        )}

      </div>
    </>
  )
}

const TEE_COLOURS: Record<string, string> = {
  Yellow: '#eab308',
  White:  '#ffffff',
  Red:    '#ef4444',
  Blue:   '#3b82f6',
  Green:  '#22c55e',
  Black:  '#1a1a1a',
  Orange: '#f97316',
  Purple: '#a855f7',
}
