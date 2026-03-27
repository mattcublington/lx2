'use client'
import { useState, useTransition } from 'react'
import { deleteRound } from './actions'

export default function DeleteRoundButton({ scorecardId }: { scorecardId: string }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      await deleteRound(scorecardId)
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
      <p className="rs-delete-confirm-text">Delete this round? This cannot be undone.</p>
      <div className="rs-delete-confirm-btns">
        <button className="rs-delete-cancel" onClick={() => setShowConfirm(false)} disabled={isPending}>
          Cancel
        </button>
        <button className="rs-delete-confirm-btn" onClick={handleDelete} disabled={isPending}>
          {isPending ? 'Deleting…' : 'Yes, delete'}
        </button>
      </div>
    </div>
  )
}
