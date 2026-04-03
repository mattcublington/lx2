'use client'

import { useState, useTransition } from 'react'
import { approveUpload, rejectUpload } from '../actions'

interface Props {
  uploadId: string
  status: 'pending' | 'approved' | 'rejected'
  existingNotes: string | null
  reviewerName: string | null
  reviewedAt: string | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function ReviewActions({ uploadId, status, existingNotes, reviewerName, reviewedAt }: Props) {
  const [mode, setMode] = useState<'idle' | 'approving' | 'rejecting'>('idle')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit(action: 'approve' | 'reject') {
    setError(null)
    startTransition(async () => {
      try {
        if (action === 'approve') {
          await approveUpload(uploadId, notes)
        } else {
          await rejectUpload(uploadId, notes)
        }
        setMode('idle')
        setNotes('')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'An error occurred')
      }
    })
  }

  const isDone = status === 'approved' || status === 'rejected'

  return (
    <>
      <style>{`
        .ra { display: flex; flex-direction: column; gap: 12px; }

        /* ── Already reviewed banner ── */
        .ra-done {
          padding: 12px 14px; border-radius: 12px;
          font-family: var(--font-dm-sans), sans-serif;
        }
        .ra-done.approved { background: #dcfce7; border: 1.5px solid #bbf7d0; }
        .ra-done.rejected { background: #fee2e2; border: 1.5px solid #fecaca; }
        .ra-done-header {
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
          margin-bottom: 6px;
        }
        .ra-done-status { font-size: 0.875rem; font-weight: 700; }
        .ra-done.approved .ra-done-status { color: #166534; }
        .ra-done.rejected .ra-done-status { color: #991b1b; }
        .ra-done-meta { font-size: 0.75rem; color: #6B8C6B; }
        .ra-done-notes { font-size: 0.8125rem; color: #1A2E1A; font-style: italic; }

        /* ── Re-review link ── */
        .ra-re-review {
          font-size: 0.8125rem; color: #6B8C6B; text-decoration: underline;
          background: none; border: none; cursor: pointer; padding: 0;
          font-family: var(--font-dm-sans), sans-serif;
        }
        .ra-re-review:hover { color: #1A2E1A; }

        /* ── Action row ── */
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
          color: #fff;
          box-shadow: 0 4px 12px rgba(13,99,27,0.25);
        }
        .ra-btn.approve:not(:disabled):hover { box-shadow: 0 6px 16px rgba(13,99,27,0.35); }
        .ra-btn.reject {
          background: #fff; color: #b43c3c;
          border: 1.5px solid #fca5a5;
        }
        .ra-btn.reject:not(:disabled):hover { background: #fee2e2; }
        .ra-btn.cancel {
          flex: none; background: #F2F5F0; color: #6B8C6B; border: 1.5px solid #E0EBE0;
        }

        /* ── Expanded form ── */
        .ra-form { display: flex; flex-direction: column; gap: 8px; }
        .ra-form-label { font-size: 0.8125rem; font-weight: 600; color: #1A2E1A;
          font-family: var(--font-dm-sans), sans-serif; }
        .ra-form-sub { font-size: 0.75rem; color: #6B8C6B; margin-top: 2px; }
        .ra-textarea {
          width: 100%; min-height: 80px; padding: 10px 12px;
          border: 1.5px solid #E0EBE0; border-radius: 10px;
          font-size: 0.875rem; color: #1A2E1A;
          font-family: var(--font-dm-sans), sans-serif;
          resize: vertical; outline: none;
          transition: border-color 0.15s;
          box-sizing: border-box;
        }
        .ra-textarea:focus { border-color: #0D631B; }
        .ra-textarea.reject-focus:focus { border-color: #b43c3c; }

        /* ── Error ── */
        .ra-error {
          padding: 10px 12px; background: #fee2e2; border-radius: 8px;
          color: #991b1b; font-size: 0.8125rem;
          font-family: var(--font-dm-sans), sans-serif;
        }
      `}</style>

      <div className="ra">
        {error && <div className="ra-error">{error}</div>}

        {/* Already reviewed — show banner */}
        {isDone && mode === 'idle' && (
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

        {/* Pending — show action buttons */}
        {(status === 'pending' || isDone) && mode === 'idle' && (
          <div className="ra-buttons">
            <button
              className="ra-btn approve"
              onClick={() => setMode('approving')}
              disabled={isPending}
            >
              Approve
            </button>
            <button
              className="ra-btn reject"
              onClick={() => setMode('rejecting')}
              disabled={isPending}
            >
              Reject
            </button>
          </div>
        )}

        {/* Approve form */}
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
              <button className="ra-btn approve" onClick={() => submit('approve')} disabled={isPending}>
                {isPending ? 'Approving…' : 'Confirm Approve'}
              </button>
              <button className="ra-btn cancel" onClick={() => { setMode('idle'); setNotes(''); setError(null) }} disabled={isPending}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Reject form */}
        {mode === 'rejecting' && (
          <div className="ra-form">
            <div>
              <div className="ra-form-label">Reject this scorecard</div>
              <div className="ra-form-sub">Required — explain why (e.g. blurry image, wrong course)</div>
            </div>
            <textarea
              className="ra-textarea reject-focus"
              placeholder="Reason for rejection…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={isPending}
            />
            <div className="ra-buttons">
              <button className="ra-btn reject" onClick={() => submit('reject')} disabled={isPending}>
                {isPending ? 'Rejecting…' : 'Confirm Reject'}
              </button>
              <button className="ra-btn cancel" onClick={() => { setMode('idle'); setNotes(''); setError(null) }} disabled={isPending}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
