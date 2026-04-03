'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteUpload, deleteAllRejected } from './actions'

// ── Delete a single upload row ────────────────────────────────────────────────

export function DeleteRowButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleDelete = () => {
    if (!confirm('Delete this rejected upload? This cannot be undone.')) return
    startTransition(async () => {
      const result = await deleteUpload(id)
      if (!result.ok) { setError(result.error ?? 'Delete failed'); return }
      router.refresh()
    })
  }

  return (
    <>
      <button
        onClick={e => { e.stopPropagation(); handleDelete() }}
        disabled={pending}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '5px 10px', borderRadius: 8,
          border: '1.5px solid #fca5a5', background: '#fff', color: '#991b1b',
          fontSize: '0.8125rem', fontWeight: 600,
          fontFamily: 'var(--font-dm-sans), sans-serif',
          cursor: pending ? 'not-allowed' : 'pointer',
          opacity: pending ? 0.6 : 1,
          transition: 'background 0.15s',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { if (!pending) e.currentTarget.style.background = '#fee2e2' }}
        onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
      >
        {pending ? '…' : 'Delete'}
      </button>
      {error && (
        <span style={{ fontSize: '0.75rem', color: '#991b1b', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
          {error}
        </span>
      )}
    </>
  )
}

// ── "Delete all rejected" button shown in the header ─────────────────────────

export function DeleteAllRejectedButton({ count }: { count: number }) {
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  if (count === 0) return null

  const handleDeleteAll = () => {
    if (!confirm(`Delete all ${count} rejected upload${count !== 1 ? 's' : ''}? This cannot be undone.`)) return
    startTransition(async () => {
      const result = await deleteAllRejected()
      if (!result.ok) { setError(result.error ?? 'Delete failed'); return }
      setDone(true)
      router.refresh()
    })
  }

  if (done) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <button
        onClick={handleDeleteAll}
        disabled={pending}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', borderRadius: 8,
          border: '1.5px solid #fca5a5', background: '#fff', color: '#991b1b',
          fontSize: '0.8125rem', fontWeight: 600,
          fontFamily: 'var(--font-dm-sans), sans-serif',
          cursor: pending ? 'not-allowed' : 'pointer',
          opacity: pending ? 0.6 : 1,
          transition: 'background 0.15s',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { if (!pending) e.currentTarget.style.background = '#fee2e2' }}
        onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M2 3.5h10M5.5 3.5V2.5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M11.5 3.5l-.6 7.2a1 1 0 0 1-1 .8H4.1a1 1 0 0 1-1-.8L2.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {pending ? 'Deleting…' : `Delete all ${count} rejected`}
      </button>
      {error && (
        <span style={{ fontSize: '0.75rem', color: '#991b1b', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
          {error}
        </span>
      )}
    </div>
  )
}
