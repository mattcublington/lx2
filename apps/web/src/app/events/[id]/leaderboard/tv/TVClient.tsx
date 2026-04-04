'use client'

import { useEffect, useRef, useState } from 'react'
import { useLeaderboard } from '@/components/leaderboard/useLeaderboard'
import { LiveIndicator } from '@/components/leaderboard/LiveIndicator'
import { ContestPanel } from '@/components/leaderboard/ContestPanel'
import type { PlayerData, ComputedRow } from '@lx2/leaderboard'
import type { HoleData } from '@lx2/scoring'

// ─── Auto-scroll threshold ─────────────────────────────────────────────────────
const SCROLL_THRESHOLD = 8       // start scrolling once list exceeds this many players
const SCROLL_PX_PER_TICK = 1     // pixels per tick
const SCROLL_TICK_MS = 40        // tick interval
const SCROLL_PAUSE_MS = 3000     // pause at bottom before resetting

interface Props {
  eventId: string
  eventName: string
  subtitle: string
  format: 'stableford' | 'strokeplay'
  roundType: '18' | '9'
  allowancePct: number
  holeData: HoleData[]
  initialPlayers: PlayerData[]
  ntpHoles: number[]
  ldHoles: number[]
  playerUrl: string
}

export default function TVClient({
  eventId,
  eventName,
  subtitle,
  format,
  roundType,
  allowancePct,
  holeData,
  initialPlayers,
  ntpHoles,
  ldHoles,
  playerUrl,
}: Props) {
  const { leaderboard, connected, flashId } = useLeaderboard({
    eventId,
    initialPlayers,
    holeData,
    config: { format, roundType, allowancePct },
  })

  const scrollRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(false)
  const [scrollActive, setScrollActive] = useState(false)

  // Auto-scroll logic
  useEffect(() => {
    if (leaderboard.length <= SCROLL_THRESHOLD) {
      setScrollActive(false)
      return
    }
    setScrollActive(true)

    let pausing = false
    const interval = setInterval(() => {
      const el = scrollRef.current
      if (!el || pausedRef.current) return

      if (pausing) return

      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4
      if (atBottom) {
        pausing = true
        setTimeout(() => {
          if (el) el.scrollTo({ top: 0, behavior: 'smooth' })
          pausing = false
        }, SCROLL_PAUSE_MS)
        return
      }

      el.scrollTop += SCROLL_PX_PER_TICK
    }, SCROLL_TICK_MS)

    return () => clearInterval(interval)
  }, [leaderboard.length])

  const hasContests = ntpHoles.length > 0 || ldHoles.length > 0

  return (
    <div style={{
      height: '100dvh',
      background: '#0a1f0a',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: 'var(--font-dm-sans), sans-serif',
    }}>
      <style>{`
        .tv-event-title {
          font-family: var(--font-dm-serif), serif;
          font-weight: 400;
          font-size: clamp(1.5rem, 2.5vw, 2rem);
          color: #fff;
          margin: 0;
          letter-spacing: -0.02em;
          line-height: 1.1;
        }
      `}</style>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        padding: '0 40px',
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.2)',
      }}>
        <div>
          <h1 className="tv-event-title">
            {eventName}
          </h1>
          <div style={{
            fontSize: '0.875rem',
            color: '#6B8C6B',
            marginTop: 4,
            letterSpacing: '0.01em',
          }}>
            {subtitle}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.35)' }}>
            {leaderboard.length} players
          </span>
          <LiveIndicator connected={connected} />
          <span style={{
            fontFamily: 'var(--font-dm-sans), sans-serif',
            fontWeight: 700, color: '#fff', fontSize: '1.25rem', letterSpacing: '-0.02em',
          }}>
            LX<span style={{ color: '#4ade80' }}>2</span>
          </span>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        gap: 0,
      }}>

        {/* Standings column */}
        <div
          ref={scrollRef}
          onMouseEnter={() => { pausedRef.current = true }}
          onMouseLeave={() => { pausedRef.current = false }}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '28px 32px 40px',
            scrollbarWidth: 'none',
          }}
        >
          {leaderboard.length === 0 ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', color: 'rgba(255,255,255,0.3)', fontSize: '1.25rem',
            }}>
              No confirmed players yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {leaderboard.map((row, i) => (
                <TVRow
                  key={row.player.eventPlayerId}
                  row={row}
                  format={format}
                  holeCount={holeData.length}
                  isFlashing={row.player.scorecardId === flashId}
                  animDelay={Math.min(i * 0.04, 0.3)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{
          width: 360,
          flexShrink: 0,
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          padding: '28px 28px 40px',
          gap: 16,
          overflowY: 'auto',
          scrollbarWidth: 'none',
        }}>

          {/* Contest panels */}
          {hasContests ? (
            <>
              {ntpHoles.length > 0 && (
                <ContestPanel type="ntp" holeNumbers={ntpHoles} players={initialPlayers} />
              )}
              {ldHoles.length > 0 && (
                <ContestPanel type="ld" holeNumbers={ldHoles} players={initialPlayers} />
              )}
            </>
          ) : (
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 16,
              padding: '20px',
              color: 'rgba(255,255,255,0.3)',
              fontSize: '0.875rem',
              textAlign: 'center',
            }}>
              No side contests for this event
            </div>
          )}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Player link */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: '16px 20px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.4)',
              marginBottom: 6,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}>
              Follow on your phone
            </div>
            <div style={{
              fontSize: '0.8125rem',
              color: '#4ade80',
              wordBreak: 'break-all',
              fontFamily: 'var(--font-dm-sans), sans-serif',
            }}>
              lx2.golf{playerUrl}
            </div>
          </div>

          {/* Scroll indicator */}
          {scrollActive && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              opacity: 0.4,
            }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#6B8C6B', display: 'inline-block' }} />
              <span style={{ fontSize: '0.6875rem', color: '#6B8C6B', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
                Auto-scrolling
              </span>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#6B8C6B', display: 'inline-block' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── TV standings row ─────────────────────────────────────────────────────────

interface TVRowProps {
  row: ComputedRow
  format: 'stableford' | 'strokeplay'
  holeCount: number
  isFlashing: boolean
  animDelay: number
}

function TVRow({ row, format, holeCount, isFlashing, animDelay }: TVRowProps) {
  const isFirst = row.isFirst
  const isDim = row.positionLabel === '–'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      padding: '20px 28px',
      borderRadius: 16,
      background: isFirst
        ? 'rgba(13,99,27,0.25)'
        : 'rgba(255,255,255,0.05)',
      border: isFirst
        ? '1px solid rgba(74,222,128,0.3)'
        : '1px solid rgba(255,255,255,0.07)',
      borderLeft: isFirst ? '4px solid #4ade80' : undefined,
      boxShadow: isFlashing ? '0 0 0 3px rgba(74,222,128,0.25)' : 'none',
      transition: 'box-shadow 0.5s ease',
      opacity: isDim ? 0.4 : 1,
      animation: 'tv-row-in 0.35s ease both',
      animationDelay: `${animDelay}s`,
    }}>

      {/* Position */}
      <div style={{
        minWidth: 72,
        fontFamily: 'var(--font-dm-serif), serif',
        fontSize: row.positionLabel.length > 2 ? '2.25rem' : '3.5rem',
        fontWeight: 400,
        color: isFirst ? '#4ade80' : isDim ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.85)',
        lineHeight: 1,
        flexShrink: 0,
      }}>
        {row.positionLabel}
      </div>

      {/* Name + sub-line */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'var(--font-dm-sans), sans-serif',
            fontWeight: 600,
            fontSize: 'clamp(1.125rem, 2vw, 1.5rem)',
            color: '#fff',
            lineHeight: 1.2,
          }}>
            {row.player.displayName}
          </span>
          {row.player.badges.map((b, idx) => (
            <span key={idx} style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '3px 9px',
              borderRadius: 6,
              background: b.type === 'ntp' ? 'rgba(254,243,199,0.15)' : 'rgba(219,234,254,0.15)',
              color: b.type === 'ntp' ? '#fcd34d' : '#93c5fd',
              fontFamily: 'var(--font-dm-sans), sans-serif',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}>
              {b.type === 'ntp' ? '🎯' : '🏌️'} H{b.holeNumber}
            </span>
          ))}
        </div>
        <div style={{
          fontSize: '0.875rem',
          color: 'rgba(255,255,255,0.35)',
          fontFamily: 'var(--font-dm-sans), sans-serif',
          marginTop: 5,
        }}>
          hcp {row.playingHandicap}&nbsp;&middot;&nbsp;
          {row.thru === 0
            ? 'not started'
            : row.thru === holeCount
              ? 'Finished'
              : `thru ${row.thru}`}
        </div>
      </div>

      {/* Score */}
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 80 }}>
        <div style={{
          fontFamily: 'var(--font-dm-sans), sans-serif',
          fontWeight: 700,
          fontSize: 'clamp(2rem, 3.5vw, 3rem)',
          color: isFirst ? '#4ade80' : 'rgba(255,255,255,0.9)',
          lineHeight: 1,
          letterSpacing: '-0.03em',
        }}>
          {row.nR ? 'NR' : row.thru === 0 ? '–' : row.score}
        </div>
        {row.thru > 0 && !row.nR && (
          <div style={{
            fontSize: '0.75rem',
            color: 'rgba(255,255,255,0.3)',
            fontFamily: 'var(--font-dm-sans), sans-serif',
            marginTop: 3,
          }}>
            {format === 'stableford' ? 'pts' : 'gross'}
          </div>
        )}
      </div>
    </div>
  )
}
