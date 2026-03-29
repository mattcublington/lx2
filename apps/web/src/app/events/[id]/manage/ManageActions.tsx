'use client'
import { useState, useTransition } from 'react'
import { confirmPlayer } from '@/app/events/manage-actions'
import { useRouter } from 'next/navigation'
import { finaliseEvent, unfinaliseEvent, deleteEvent } from './actions'

interface Props {
  eventUrl: string
  eventName: string
}

// ─── Confirm invited players ──────────────────────────────────────────────────

interface InvitedPlayer {
  id: string
  displayName: string
  handicapIndex: number
}

interface ConfirmPlayersProps {
  eventId: string
  players: InvitedPlayer[]
}

export function ConfirmPlayers({ eventId, players }: ConfirmPlayersProps) {
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set())
  const [pending, startTransition] = useTransition()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const remaining = players.filter(p => !confirmed.has(p.id))

  if (remaining.length === 0) return null

  function handleConfirm(playerId: string) {
    setConfirmingId(playerId)
    startTransition(async () => {
      await confirmPlayer(eventId, playerId)
      setConfirmed(prev => new Set([...prev, playerId]))
      setConfirmingId(null)
    })
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E0EBE0', padding: '24px' }}>
      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#6B8C6B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, fontFamily: 'var(--font-dm-sans), sans-serif' }}>
        Awaiting confirmation
      </div>
      <p style={{ margin: '0 0 14px', fontSize: '0.8125rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif', lineHeight: 1.5 }}>
        These players have been added but need confirming before they appear on the leaderboard.
      </p>
      {remaining.map(p => (
        <div
          key={p.id}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 0', borderBottom: '1px solid #f0f4f0',
            fontFamily: 'var(--font-dm-sans), sans-serif',
          }}
        >
          <div>
            <span style={{ fontSize: '0.9375rem', fontWeight: 500, color: '#1A2E1A' }}>{p.displayName}</span>
            <span style={{ marginLeft: 8, fontSize: '0.8125rem', color: '#6B8C6B' }}>{Number(p.handicapIndex).toFixed(1)} hcp</span>
          </div>
          <button
            onClick={() => handleConfirm(p.id)}
            disabled={pending && confirmingId === p.id}
            style={{
              padding: '7px 16px', border: 'none', borderRadius: 8,
              background: confirmingId === p.id ? '#6B8C6B' : '#0D631B',
              color: '#fff', fontSize: '0.8125rem', fontWeight: 600,
              fontFamily: 'var(--font-dm-sans), sans-serif',
              cursor: confirmingId === p.id ? 'default' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {confirmingId === p.id ? 'Confirming…' : 'Confirm'}
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Finalise / unfinalise event ──────────────────────────────────────────────

export function FinaliseButton({ eventId, finalised }: { eventId: string; finalised: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)

  function handleFinalise() {
    startTransition(async () => {
      await finaliseEvent(eventId)
      setShowConfirm(false)
    })
  }

  function handleUnfinalise() {
    startTransition(async () => {
      await unfinaliseEvent(eventId)
    })
  }

  if (finalised) {
    return (
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid #E0EBE0', padding: '24px',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '1rem', fontWeight: 600, color: '#0D631B',
          fontFamily: 'var(--font-dm-sans), sans-serif', marginBottom: 4,
        }}>
          Event finalised
        </div>
        <div style={{
          fontSize: '0.8125rem', color: '#6B8C6B',
          fontFamily: 'var(--font-dm-sans), sans-serif', marginBottom: 16,
        }}>
          Results are locked. Share the leaderboard link with your group.
        </div>
        <button
          onClick={handleUnfinalise}
          disabled={isPending}
          style={{
            padding: '8px 18px', border: '1.5px solid #E0EBE0', borderRadius: 10,
            background: '#fff', color: '#6B8C6B', fontSize: '0.8125rem', fontWeight: 500,
            fontFamily: 'var(--font-dm-sans), sans-serif', cursor: 'pointer',
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? 'Reopening…' : 'Reopen event'}
        </button>
      </div>
    )
  }

  if (showConfirm) {
    return (
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid #E0EBE0', padding: '24px',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '0.9375rem', fontWeight: 500, color: '#1A2E1A',
          fontFamily: 'var(--font-dm-sans), sans-serif', marginBottom: 16,
        }}>
          Finalise this event? This locks all scores.
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button
            onClick={() => setShowConfirm(false)}
            disabled={isPending}
            style={{
              padding: '9px 20px', border: '1.5px solid #E0EBE0', borderRadius: 10,
              background: '#fff', color: '#1A2E1A', fontSize: '0.875rem', fontWeight: 500,
              fontFamily: 'var(--font-dm-sans), sans-serif', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleFinalise}
            disabled={isPending}
            style={{
              padding: '9px 20px', border: 'none', borderRadius: 10,
              background: '#0D631B', color: '#fff', fontSize: '0.875rem', fontWeight: 600,
              fontFamily: 'var(--font-dm-sans), sans-serif', cursor: 'pointer',
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? 'Finalising…' : 'Finalise'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      style={{
        width: '100%', padding: '12px', border: '1.5px solid #E0EBE0', borderRadius: 12,
        background: '#fff', color: '#1A2E1A', fontSize: '0.9375rem', fontWeight: 600,
        fontFamily: 'var(--font-dm-sans), sans-serif', cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      Finalise event
    </button>
  )
}

export default function ManageActions({ eventUrl, eventName }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select the input text
      const input = document.getElementById('invite-url') as HTMLInputElement | null
      input?.select()
    }
  }

  const whatsappText = encodeURIComponent(`Join our golf event "${eventName}" — sign up here: ${eventUrl}`)
  const whatsappUrl  = `https://wa.me/?text=${whatsappText}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* URL display + copy */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          id="invite-url"
          readOnly
          value={eventUrl}
          style={{
            flex: 1, padding: '11px 14px', border: '1.5px solid #E0EBE0',
            borderRadius: 10, fontSize: '0.875rem', fontFamily: 'var(--font-dm-sans), sans-serif',
            color: '#1A2E1A', background: '#F2F5F0', outline: 'none',
            minWidth: 0, cursor: 'text',
          }}
          onFocus={e => e.currentTarget.select()}
        />
        <button
          onClick={handleCopy}
          style={{
            padding: '11px 18px', border: 'none', borderRadius: 10,
            background: copied ? '#15803d' : '#0D631B', color: '#fff',
            fontSize: '0.875rem', fontWeight: 600, fontFamily: 'var(--font-dm-sans), sans-serif',
            cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.15s', flexShrink: 0,
          }}
        >
          {copied ? '✓ Copied' : 'Copy link'}
        </button>
      </div>

      {/* WhatsApp share */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '12px 0', border: '1.5px solid #25d366', borderRadius: 10,
          color: '#128c3f', fontSize: '0.9375rem', fontWeight: 600,
          fontFamily: 'var(--font-dm-sans), sans-serif', textDecoration: 'none',
          background: '#f0fdf4', transition: 'background 0.15s',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#25d366">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        Share on WhatsApp
      </a>
    </div>
  )
}

// ─── Delete event ─────────────────────────────────────────────────────────────

export function DeleteEventButton({ eventId, eventName, finalised }: { eventId: string; eventName: string; finalised: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function handleDelete() {
    setErrorMsg(null)
    startTransition(async () => {
      const result = await deleteEvent(eventId)
      if (result?.error) {
        setErrorMsg(result.error)
        return
      }
      router.push('/play')
    })
  }

  // Finalised events: show disabled state with explanation
  if (finalised) {
    return (
      <div style={{
        padding: '9px 18px', border: '1.5px solid #E0EBE0', borderRadius: 10,
        background: '#F2F5F0', color: '#6B8C6B', fontSize: '0.8125rem', fontWeight: 500,
        fontFamily: 'var(--font-dm-sans), sans-serif', textAlign: 'center', lineHeight: 1.4,
      }}>
        Finalised tournaments cannot be deleted. Reopen the event first.
      </div>
    )
  }

  if (showConfirm) {
    return (
      <div style={{
        background: '#fff8f8', borderRadius: 12, border: '1px solid #fecaca',
        padding: '16px 20px', textAlign: 'center',
      }}>
        <div style={{
          fontSize: '0.875rem', fontWeight: 500, color: '#991b1b',
          fontFamily: 'var(--font-dm-sans), sans-serif', marginBottom: 4,
        }}>
          Delete &ldquo;{eventName}&rdquo;?
        </div>
        <div style={{
          fontSize: '0.8125rem', color: '#6B8C6B',
          fontFamily: 'var(--font-dm-sans), sans-serif', marginBottom: 14, lineHeight: 1.4,
        }}>
          {errorMsg
            ? <span style={{ color: '#DC2626' }}>{errorMsg}</span>
            : 'This removes the event from all lists. If scores have been submitted, the data is archived (not permanently deleted).'}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button
            onClick={() => setShowConfirm(false)}
            disabled={isPending}
            style={{
              padding: '8px 18px', border: '1.5px solid #E0EBE0', borderRadius: 10,
              background: '#fff', color: '#1A2E1A', fontSize: '0.8125rem', fontWeight: 500,
              fontFamily: 'var(--font-dm-sans), sans-serif', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            style={{
              padding: '8px 18px', border: 'none', borderRadius: 10,
              background: '#DC2626', color: '#fff', fontSize: '0.8125rem', fontWeight: 600,
              fontFamily: 'var(--font-dm-sans), sans-serif', cursor: 'pointer',
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      style={{
        padding: '9px 18px', border: '1.5px solid #fecaca', borderRadius: 10,
        background: '#fff', color: '#DC2626', fontSize: '0.8125rem', fontWeight: 500,
        fontFamily: 'var(--font-dm-sans), sans-serif', cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      Delete event
    </button>
  )
}
