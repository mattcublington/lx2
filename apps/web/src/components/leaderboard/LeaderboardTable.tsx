import type { ComputedRow } from '@lx2/leaderboard'
import type { HoleData } from '@lx2/scoring'
import { HoleDot } from './HoleDot'

interface LeaderboardTableProps {
  rows: ComputedRow[]
  format: 'stableford' | 'strokeplay'
  holeData: HoleData[]
  ntpHoles: number[]
  ldHoles: number[]
  flashId: string | null
}

export function LeaderboardTable({
  rows,
  format,
  holeData,
  ntpHoles,
  ldHoles,
  flashId,
}: LeaderboardTableProps) {
  if (rows.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '72px 24px',
        color: '#6B8C6B',
        fontFamily: 'var(--font-dm-sans), sans-serif',
        fontSize: '0.9375rem',
      }}>
        No confirmed players yet.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((row, i) => (
        <PlayerRow
          key={row.player.eventPlayerId}
          row={row}
          format={format}
          holeData={holeData}
          ntpHoles={ntpHoles}
          ldHoles={ldHoles}
          isFlashing={row.player.scorecardId === flashId}
          animDelay={Math.min(i * 0.045, 0.32)}
        />
      ))}
    </div>
  )
}

// ─── Player row ───────────────────────────────────────────────────────────────

interface PlayerRowProps {
  row: ComputedRow
  format: 'stableford' | 'strokeplay'
  holeData: HoleData[]
  ntpHoles: number[]
  ldHoles: number[]
  isFlashing: boolean
  animDelay: number
}

function PlayerRow({ row, format, holeData, ntpHoles, ldHoles, isFlashing, animDelay }: PlayerRowProps) {
  const isFirst = row.isFirst
  const isDim = row.positionLabel === '–'

  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      border: isFirst ? '1px solid #b6d9ba' : '1px solid #E0EBE0',
      borderLeft: isFirst ? '4px solid #0D631B' : '1px solid #E0EBE0',
      overflow: 'hidden',
      animation: 'lb-in 0.35s ease both',
      animationDelay: `${animDelay}s`,
      boxShadow: isFlashing ? '0 0 0 3px rgba(13,99,27,0.18)' : 'none',
      transition: 'box-shadow 0.5s ease',
      opacity: isDim ? 0.55 : 1,
    }}>

      {/* Main row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '18px 20px',
        gap: 14,
      }}>

        {/* Position */}
        <div style={{
          minWidth: 52,
          fontFamily: 'var(--font-dm-serif), serif',
          fontSize: row.positionLabel.length > 2 ? '1.75rem' : '2.75rem',
          fontWeight: 400,
          color: isFirst ? '#0D631B' : isDim ? '#b0c4b0' : '#1A2E1A',
          lineHeight: 1,
          flexShrink: 0,
        }}>
          {row.positionLabel}
        </div>

        {/* Name + sub-line */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--font-dm-sans), sans-serif',
              fontWeight: 600,
              fontSize: '1.0625rem',
              color: '#1A2E1A',
              lineHeight: 1.25,
              wordBreak: 'break-word',
            }}>
              {row.player.displayName}
            </span>
            {row.player.badges.map((b, idx) => (
              <span key={idx} style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 5,
                background: b.type === 'ntp' ? '#FEF3C7' : '#DBEAFE',
                color: b.type === 'ntp' ? '#92400E' : '#1E40AF',
                fontFamily: 'var(--font-dm-sans), sans-serif',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}>
                {b.type === 'ntp' ? '🎯' : '🏌️'} H{b.holeNumber}
              </span>
            ))}
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#6B8C6B',
            fontFamily: 'var(--font-dm-sans), sans-serif',
            marginTop: 4,
          }}>
            {`hcp ${row.playingHandicap}`}&nbsp;&middot;&nbsp;
            {row.thru === 0
              ? 'not started'
              : row.thru === holeData.length
                ? 'F'
                : `thru ${row.thru}`}
          </div>
        </div>

        {/* Score */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontFamily: 'var(--font-dm-sans), sans-serif',
            fontWeight: 700,
            fontSize: '2.5rem',
            color: isFirst ? '#0D631B' : '#1A2E1A',
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}>
            {row.nR ? 'NR' : row.thru === 0 ? '–' : row.score}
          </div>
          {row.thru > 0 && !row.nR && (
            <div style={{
              fontSize: '0.6875rem',
              color: '#6B8C6B',
              fontFamily: 'var(--font-dm-sans), sans-serif',
              marginTop: 2,
            }}>
              {format === 'stableford' ? 'pts' : 'gross'}
            </div>
          )}
        </div>
      </div>

      {/* Hole strip */}
      {row.thru > 0 && (
        <div style={{
          borderTop: '1px solid #F2F5F0',
          padding: '10px 20px 14px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          <div style={{ display: 'flex', gap: 4, minWidth: 'max-content' }}>
            {holeData.map((hole, idx) => (
              <HoleDot
                key={hole.holeNumber}
                holeNumber={hole.holeNumber}
                par={hole.par}
                grossStroke={row.grossStrokes[idx] ?? null}
                pointValue={format === 'stableford' ? row.perHole[idx] ?? 0 : null}
                format={format}
                isContest={ntpHoles.includes(hole.holeNumber) || ldHoles.includes(hole.holeNumber)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
