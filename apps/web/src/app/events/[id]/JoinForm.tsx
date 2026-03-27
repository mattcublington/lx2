'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { joinEvent, joinEventAnon } from '@/app/events/event-actions'

interface Props {
  eventId:        string
  /** null = unauthenticated visitor (anonymous join path) */
  userId:         string | null
  defaultName:    string
  defaultHandicap: number | null
}

export default function JoinForm({ eventId, userId, defaultName, defaultHandicap }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open,     setOpen]     = useState(false)
  const [name,     setName]     = useState(defaultName)
  const [handicap, setHandicap] = useState(defaultHandicap !== null ? String(defaultHandicap) : '')
  const [error,    setError]    = useState('')

  const handleJoin = () => {
    if (!name.trim()) { setError('Please enter your name'); return }
    const hcp = parseFloat(handicap)
    if (isNaN(hcp) || hcp < 0 || hcp > 54) {
      setError('Enter a valid handicap index (0–54)')
      return
    }
    setError('')

    startTransition(async () => {
      try {
        if (userId) {
          // Authenticated path — user_id is stored on the event_player row
          await joinEvent(eventId, name.trim(), hcp)
        } else {
          // Anonymous path — join_token cookie is set by the server action
          await joinEventAnon(eventId, name.trim(), hcp)
        }
        // Re-render the server component so the CTA switches to "Go to scorecard"
        router.refresh()
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to join'
        if (msg === 'MAX_PLAYERS_REACHED') {
          setError('This event is full. You have been added to the waiting list.')
        } else {
          setError(msg)
        }
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          width: '100%', padding: '14px 0', background: '#0D631B', color: '#fff',
          border: 'none', borderRadius: 12, fontSize: '1rem', fontWeight: 600,
          fontFamily: 'var(--font-dm-sans), sans-serif', cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#0a4f15')}
        onMouseLeave={e => (e.currentTarget.style.background = '#0D631B')}
      >
        Join this event
      </button>
    )
  }

  return (
    <div style={{ background: '#F2F5F0', borderRadius: 12, padding: '20px', border: '1px solid #E0EBE0' }}>
      <div style={{
        fontSize: '0.9375rem', fontWeight: 600, color: '#1A2E1A', marginBottom: 16,
        fontFamily: 'var(--font-dm-sans), sans-serif',
      }}>
        Confirm your details
      </div>

      {/* Name */}
      <div style={{ marginBottom: 14 }}>
        <label style={{
          display: 'block', fontSize: '0.8125rem', fontWeight: 500,
          color: '#374151', marginBottom: 6, fontFamily: 'var(--font-dm-sans), sans-serif',
        }}>
          Your name
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{
            width: '100%', padding: '11px 14px', border: '1.5px solid #d1d5db',
            borderRadius: 10, fontSize: '0.9375rem', fontFamily: 'var(--font-dm-sans), sans-serif',
            color: '#1A2E1A', outline: 'none', boxSizing: 'border-box',
          }}
          onFocus={e  => (e.currentTarget.style.borderColor = '#0D631B')}
          onBlur={e   => (e.currentTarget.style.borderColor = '#d1d5db')}
        />
      </div>

      {/* Handicap */}
      <div style={{ marginBottom: 20 }}>
        <label style={{
          display: 'block', fontSize: '0.8125rem', fontWeight: 500,
          color: '#374151', marginBottom: 6, fontFamily: 'var(--font-dm-sans), sans-serif',
        }}>
          Handicap index
        </label>
        <input
          type="number"
          min={0} max={54} step={0.1}
          value={handicap}
          onChange={e => setHandicap(e.target.value)}
          placeholder="e.g. 14.2"
          style={{
            width: 140, padding: '11px 14px', border: '1.5px solid #d1d5db',
            borderRadius: 10, fontSize: '0.9375rem', fontFamily: 'var(--font-dm-sans), sans-serif',
            color: '#1A2E1A', outline: 'none', boxSizing: 'border-box',
          }}
          onFocus={e  => (e.currentTarget.style.borderColor = '#0D631B')}
          onBlur={e   => (e.currentTarget.style.borderColor = '#d1d5db')}
        />
      </div>

      {/* Error */}
      {error && (
        <div style={{
          marginBottom: 14, padding: '10px 14px',
          background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 8, fontSize: '0.875rem', color: '#dc2626',
          fontFamily: 'var(--font-dm-sans), sans-serif',
        }}>
          {error}
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => { setOpen(false); setError('') }}
          style={{
            flex: 1, padding: '12px 0', border: '1.5px solid #E0EBE0',
            borderRadius: 12, background: '#fff', fontSize: '0.9375rem',
            fontWeight: 500, fontFamily: 'var(--font-dm-sans), sans-serif',
            color: '#1A2E1A', cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleJoin}
          disabled={isPending}
          style={{
            flex: 2, padding: '12px 0',
            background: isPending ? '#9ca3af' : '#0D631B',
            border: 'none', borderRadius: 12, fontSize: '0.9375rem',
            fontWeight: 600, fontFamily: 'var(--font-dm-sans), sans-serif',
            color: '#fff', cursor: isPending ? 'default' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {isPending ? 'Joining…' : 'Confirm & join'}
        </button>
      </div>
    </div>
  )
}
