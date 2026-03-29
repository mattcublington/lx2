'use client'
import { useState, useTransition } from 'react'
import { deleteRound } from '@/app/play/round-actions'

export default function DeleteRoundButton({ scorecardId }: { scorecardId: string }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function handleDelete() {
    setErrorMsg(null)
    startTransition(async () => {
      const result = await deleteRound(scorecardId)
      if (result?.error) {
        setErrorMsg(result.error)
      }
      // If no error, deleteRound redirects to /play via redirect()
    })
  }

  if (!showConfirm) {
    return (
      <button className="rs-delete-btn" onClick={() => setShowConfirm(true)}>
        Delete round
      </button>
    )
  }

  return (
    <div className="rs-delete-confirm">
      {errorMsg ? (
        <p className="rs-delete-confirm-text" style={{ color: '#DC2626' }}>{errorMsg}</p>
      ) : (
        <p className="rs-delete-confirm-text">Delete this round? This cannot be undone.</p>
      )}
      <div className="rs-delete-confirm-btns">
        <button className="rs-delete-cancel" onClick={() => { setShowConfirm(false); setErrorMsg(null) }} disabled={isPending}>
          Cancel
        </button>
        {!errorMsg && (
          <button className="rs-delete-confirm-btn" onClick={handleDelete} disabled={isPending}>
            {isPending ? 'Deleting…' : 'Yes, delete'}
          </button>
        )}
      </div>
    </div>
  )
}
