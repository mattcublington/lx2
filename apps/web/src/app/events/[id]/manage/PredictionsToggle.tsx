'use client'

import { useState, useTransition } from 'react'
import { enablePredictions, disablePredictions, refreshMarkets } from '../predictions/actions'

interface Props {
  eventId: string
  enabled: boolean
  startingCredits: number
  marketsCount: number
  playerCount: number
  finalised: boolean
}

export default function PredictionsToggle({
  eventId,
  enabled: initialEnabled,
  startingCredits,
  marketsCount: initialMarketsCount,
  playerCount,
  finalised,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [marketsCount, setMarketsCount] = useState(initialMarketsCount)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      if (enabled) {
        await disablePredictions(eventId)
        setEnabled(false)
      } else {
        await enablePredictions(eventId, { startingCredits })
        setEnabled(true)
      }
    })
  }

  function handleGenerateMarkets() {
    startTransition(async () => {
      await refreshMarkets(eventId)
      // Rough estimate of new markets count
      setMarketsCount(Math.max(playerCount * 2, 5))
    })
  }

  if (finalised) {
    return (
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid #E0EBE0', padding: '24px',
        boxShadow: '0 4px 12px rgba(26,28,28,0.04)',
      }}>
        <div style={{
          fontSize: '0.6875rem', fontWeight: 700, color: '#6B8C6B',
          textTransform: 'uppercase', letterSpacing: '0.06em',
          fontFamily: 'var(--font-dm-sans), sans-serif', marginBottom: 8,
        }}>
          Predictions
        </div>
        <div style={{
          fontSize: '0.8125rem', color: '#6B8C6B',
          fontFamily: 'var(--font-dm-sans), sans-serif', lineHeight: 1.5,
        }}>
          {enabled
            ? `Predictions were enabled for this event (${startingCredits} credits). Markets have been settled.`
            : 'Predictions were not enabled for this event.'}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1px solid #E0EBE0', padding: '24px',
      boxShadow: '0 4px 12px rgba(26,28,28,0.04)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{
          fontSize: '0.6875rem', fontWeight: 700, color: '#6B8C6B',
          textTransform: 'uppercase', letterSpacing: '0.06em',
          fontFamily: 'var(--font-dm-sans), sans-serif',
        }}>
          🎲 Predictions
        </div>
        <button
          onClick={handleToggle}
          disabled={isPending}
          style={{
            padding: '5px 14px', border: 'none', borderRadius: 8,
            background: enabled ? '#0D631B' : '#E0EBE0',
            color: enabled ? '#fff' : '#6B8C6B',
            fontSize: '0.75rem', fontWeight: 600,
            fontFamily: 'var(--font-dm-sans), sans-serif',
            cursor: isPending ? 'default' : 'pointer',
            opacity: isPending ? 0.6 : 1,
            transition: 'background 0.15s',
          }}
        >
          {isPending ? '…' : enabled ? 'On' : 'Off'}
        </button>
      </div>

      <p style={{
        margin: '0 0 14px', fontSize: '0.8125rem', color: '#6B8C6B',
        fontFamily: 'var(--font-dm-sans), sans-serif', lineHeight: 1.5,
      }}>
        {enabled
          ? `Virtual betting enabled (${startingCredits} credits per player). AI bookie generates live odds on the leaderboard.`
          : 'Enable virtual currency betting — AI bookie sets odds, players bet on outright winner, head-to-heads, and more.'}
      </p>

      {enabled && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={handleGenerateMarkets}
            disabled={isPending || playerCount < 2}
            style={{
              padding: '9px 18px', border: 'none', borderRadius: 10,
              background: isPending ? '#9ca3af' : '#0D631B',
              color: '#fff', fontSize: '0.8125rem', fontWeight: 600,
              fontFamily: 'var(--font-dm-sans), sans-serif',
              cursor: isPending || playerCount < 2 ? 'default' : 'pointer',
              opacity: isPending ? 0.6 : 1,
              transition: 'background 0.15s',
            }}
          >
            {isPending ? 'Generating…' : marketsCount > 0 ? 'Refresh odds' : 'Generate markets'}
          </button>
          {marketsCount > 0 && (
            <span style={{ fontSize: '0.75rem', color: '#6B8C6B', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
              {marketsCount} market{marketsCount !== 1 ? 's' : ''} live
            </span>
          )}
          {playerCount < 2 && (
            <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'var(--font-dm-sans), sans-serif' }}>
              Need at least 2 players
            </span>
          )}
        </div>
      )}
    </div>
  )
}
